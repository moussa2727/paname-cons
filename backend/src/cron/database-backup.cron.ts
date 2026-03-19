import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class DatabaseBackupCron {
  private readonly logger = new Logger(DatabaseBackupCron.name);
  private readonly backupPath = '/app/backend/backups';

  constructor(private configService: ConfigService) {
    // Créer le dossier backups s'il n'existe pas
    if (!fs.existsSync(this.backupPath)) {
      fs.mkdirSync(this.backupPath, { recursive: true });
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async backupDatabase() {
    this.logger.log('💾 Début de la sauvegarde de la base de données...');

    try {
      const date = new Date();
      const filename = `backup-${date.toISOString().split('T')[0]}.sql`;
      const filepath = path.join(this.backupPath, filename);

      // Récupérer l'URL de la base de données
      const dbUrl = this.configService.get<string>('DATABASE_URL');

      if (!dbUrl) {
        throw new Error('DATABASE_URL non configuré');
      }

      // Extraire les infos de connexion
      const matches = dbUrl.match(
        /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/,
      );
      if (!matches) {
        throw new Error('Format DATABASE_URL invalide');
      }

      const [, user, password, host, port, database] = matches;

      // Commande pg_dump avec mot de passe masqué dans les logs
      // Syntaxe Windows pour les variables d'environnement
      const command =
        process.platform === 'win32'
          ? `set PGPASSWORD=${password}&& pg_dump -U ${user} -h ${host} -p ${port} ${database} > ${filepath}`
          : `PGPASSWORD="${password}" pg_dump -U ${user} -h ${host} -p ${port} ${database} > ${filepath}`;

      // Logger sans exposer le mot de passe
      this.logger.log(`Exécution de la sauvegarde`);
      await execAsync(command);

      this.logger.log(`Sauvegarde réussie: ${filename}`);

      // Nettoyer les vieilles sauvegardes (garder 7 jours)
      this.cleanupOldBackups();
    } catch (error) {
      this.logger.error(`Erreur sauvegarde: ${(error as Error).message}`);
    }
  }

  private cleanupOldBackups() {
    try {
      const files = fs.readdirSync(this.backupPath);
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filepath = path.join(this.backupPath, file);
        const stats = fs.statSync(filepath);

        // Supprimer les fichiers plus vieux que 7 jours
        if (now - stats.mtimeMs > sevenDays) {
          fs.unlinkSync(filepath);
          this.logger.log(`Ancien backup supprimé: ${file}`);
        }
      }
    } catch (error) {
      this.logger.error(
        `Erreur nettoyage backups: ${(error as Error).message}`,
      );
    }
  }
}
