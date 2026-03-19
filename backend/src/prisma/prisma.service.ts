import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, ProcedureStatus, StepName } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString:
          configService.get<string>('DATABASE_URL') || process.env.DATABASE_URL,
      }),
      log:
        process.env.NODE_ENV === 'development'
          ? ['warn', 'error'] // Moins de logs en développement
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Middleware pour la gestion des dates
  enableShutdownHooks() {
    process.on('beforeExit', () => {
      void this.$disconnect();
    });
  }

  // Méthodes utilitaires pour les procédures
  async updateProcedureGlobalStatus(procedureId: string) {
    const procedure = await this.procedure.findUnique({
      where: { id: procedureId },
      include: { steps: true },
    });

    if (!procedure) return procedure;

    const steps = procedure.steps;
    if (!steps || steps.length === 0) {
      return this.procedure.update({
        where: { id: procedureId },
        data: { statut: 'IN_PROGRESS' },
      });
    }

    const allCompleted = steps.every((step) => step.statut === 'COMPLETED');
    const anyRejected = steps.some((step) => step.statut === 'REJECTED');
    const anyCancelled = steps.some((step) => step.statut === 'CANCELLED');

    // Règle stricte pour DEMANDE_ADMISSION
    const admissionStep = steps.find(
      (step) => step.nom === 'DEMANDE_ADMISSION',
    );

    if (
      admissionStep &&
      (admissionStep.statut === 'REJECTED' ||
        admissionStep.statut === 'CANCELLED')
    ) {
      // Mettre à jour toutes les autres étapes
      await this.step.updateMany({
        where: {
          procedureId,
          nom: { not: 'DEMANDE_ADMISSION' },
        },
        data: {
          statut: admissionStep.statut,
          raisonRefus: admissionStep.raisonRefus,
          dateMaj: new Date(),
        },
      });

      // Mettre à jour la procédure
      return this.procedure.update({
        where: { id: procedureId },
        data: {
          statut:
            admissionStep.statut === 'REJECTED' ? 'REJECTED' : 'CANCELLED',
          raisonRejet: admissionStep.raisonRefus,
          dateCompletion: new Date(),
        },
      });
    }

    let newStatus: ProcedureStatus = 'IN_PROGRESS';
    let raisonRejet: string | null | undefined;

    if (anyRejected) {
      newStatus = 'REJECTED';
      const rejectedStep = steps.find((step) => step.statut === 'REJECTED');
      raisonRejet = rejectedStep?.raisonRefus;
    } else if (anyCancelled) {
      newStatus = 'CANCELLED';
    } else if (allCompleted) {
      newStatus = 'COMPLETED';
    }

    return this.procedure.update({
      where: { id: procedureId },
      data: {
        statut: newStatus,
        raisonRejet,
        dateCompletion: newStatus === 'COMPLETED' ? new Date() : undefined,
      },
    });
  }

  async ensureRequiredSteps(procedureId: string) {
    const requiredSteps: StepName[] = [
      'DEMANDE_ADMISSION',
      'DEMANDE_VISA',
      'PREPARATIF_VOYAGE',
    ];
    const procedure = await this.procedure.findUnique({
      where: { id: procedureId },
      include: { steps: true },
    });

    if (!procedure) return;

    const existingStepNames = procedure.steps.map((s) => s.nom);

    for (const stepName of requiredSteps) {
      if (!existingStepNames.includes(stepName)) {
        await this.step.create({
          data: {
            procedureId,
            nom: stepName,
            statut:
              stepName === 'DEMANDE_ADMISSION' ? 'IN_PROGRESS' : 'PENDING',
            dateCreation: new Date(),
            dateMaj: new Date(),
          },
        });
      }
    }

    await this.updateProcedureGlobalStatus(procedureId);
  }
}
