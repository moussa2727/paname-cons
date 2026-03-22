#!/usr/bin/env ts-node

/**
 * Script pour nettoyer manuellement la queue d'emails
 * Usage: npx ts-node scripts/clean-email-queue.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Logger } from '@nestjs/common';

async function cleanEmailQueue() {
  const logger = new Logger('CleanEmailQueue');
  
  let app;
  try {
    // Créer l'application NestJS
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // Récupérer la queue email
    const emailQueue = app.get('BULL_QUEUE_email') as Queue;

    // Statistiques actuelles
    const waiting = await emailQueue.getWaiting();
    const active = await emailQueue.getActive();
    const completed = await emailQueue.getCompleted();
    const failed = await emailQueue.getFailed();

    logger.log(`=== Statistiques de la queue email ===`);
    logger.log(`En attente: ${waiting.length}`);
    logger.log(`Actifs: ${active.length}`);
    logger.log(`Complétés: ${completed.length}`);
    logger.log(`Échoués: ${failed.length}`);

    // Nettoyer les jobs échoués de plus de 24h
    const oldFailedJobs = failed.filter(job => {
      const jobAge = Date.now() - job.timestamp;
      return jobAge > 24 * 60 * 60 * 1000; // 24 heures
    });

    if (oldFailedJobs.length > 0) {
      logger.log(`Nettoyage de ${oldFailedJobs.length} jobs échoués de plus de 24h...`);
      
      for (const job of oldFailedJobs) {
        await job.remove();
        logger.log(`Job ${job.id} supprimé`);
      }
    }

    // Afficher les jobs actifs (potentiellement bloqués)
    if (active.length > 0) {
      logger.warn(`Jobs actifs (potentiellement bloqués):`);
      active.forEach(job => {
        const jobAge = Date.now() - job.timestamp;
        logger.warn(`  - Job ${job.id} (${job.data.to}) - Âge: ${Math.round(jobAge / 1000)}s`);
      });
    }

    // Optionnel: Vider complètement les jobs en attente si nécessaire
    if (process.argv.includes('--clear-waiting') && waiting.length > 0) {
      logger.log(`Suppression de ${waiting.length} jobs en attente...`);
      for (const job of waiting) {
        await job.remove();
      }
      logger.log('Jobs en attente supprimés');
    }

    // Optionnel: Vider les jobs échoués
    if (process.argv.includes('--clear-failed') && failed.length > 0) {
      logger.log(`Suppression de ${failed.length} jobs échoués...`);
      await emailQueue.clean(0, 'failed');
      logger.log('Jobs échoués supprimés');
    }

    logger.log('=== Nettoyage terminé ===');

  } catch (error) {
    logger.error('Erreur lors du nettoyage', error);
  } finally {
    if (app) {
      await app.close();
    }
  }
}

// Afficher l'aide
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: npx ts-node scripts/clean-email-queue.ts [options]

Options:
  --help, -h          Afficher cette aide
  --clear-waiting     Supprimer tous les jobs en attente
  --clear-failed      Supprimer tous les jobs échoués

Exemples:
  npx ts-node scripts/clean-email-queue.ts                    # Nettoyer uniquement les vieux jobs échoués
  npx ts-node scripts/clean-email-queue.ts --clear-waiting   # Nettoyer et supprimer les jobs en attente
  npx ts-node scripts/clean-email-queue.ts --clear-failed     # Nettoyer et supprimer tous les jobs échoués
  `);
  process.exit(0);
}

cleanEmailQueue();
