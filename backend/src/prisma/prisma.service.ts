import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient, ProcedureStatus, StepName } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const adapter = new PrismaPg({
      connectionString: databaseUrl,
    });

    super({
      adapter,
      log: ['info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    try {
      this.logger.log('Connecting to database...');

      // First, try to create the database if it doesn't exist
      await this.createDatabaseIfNotExists();

      await this.$connect();
      this.logger.log('Database connected successfully');

      // Test connection with a simple query
      await this.$queryRaw`SELECT 1`;
      this.logger.log('Database connection test passed');
    } catch (error) {
      this.logger.error('Failed to connect to database:', error);

      // If database doesn't exist, log helpful info
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Type-safe way to access error code
      let errorCode: string | undefined;
      if (
        error &&
        typeof error === 'object' &&
        error !== null &&
        'code' in error
      ) {
        const errorObj = error as Record<string, unknown>;
        const codeValue = errorObj.code;

        // Ensure we get a proper string representation
        if (typeof codeValue === 'string') {
          errorCode = codeValue;
        } else if (typeof codeValue === 'number') {
          errorCode = codeValue.toString();
        } else if (codeValue != null) {
          // Use JSON.stringify for complex objects to avoid [object Object]
          errorCode = JSON.stringify(codeValue);
        }
      }

      if (errorCode === 'P2010' || errorMessage.includes('does not exist')) {
        this.logger.error(
          '❌ Database does not exist. Please run database initialization first.',
        );
        this.logger.error('💡 Run: pnpm prisma db push --force-reset');
        this.logger.error('💡 Or check your DATABASE_URL environment variable');
      }

      throw error;
    }
  }

  private async createDatabaseIfNotExists(): Promise<void> {
    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is not set');
      }

      // Parse DATABASE_URL to extract connection info
      const url = new URL(databaseUrl);
      const dbName = url.pathname.slice(1); // Remove leading slash

      if (!dbName) {
        this.logger.warn('No database name found in DATABASE_URL');
        return;
      }

      // Create a connection URL to postgres database (default database)
      const postgresUrl = databaseUrl.replace(`/${dbName}`, '/postgres');

      // Temporarily override DATABASE_URL for postgres connection
      const originalUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = postgresUrl;

      // Connect to postgres database to create our target database
      const postgresClient = new PrismaClient({
        adapter: new PrismaPg({
          connectionString: postgresUrl,
        }),
      });

      try {
        // Check if database exists
        const result = await postgresClient.$queryRaw`
          SELECT 1 FROM pg_database WHERE datname = ${dbName}
          LIMIT 1
        `;

        if (Array.isArray(result) && result.length === 0) {
          this.logger.log(`🗄️ Creating database: ${dbName}`);
          await postgresClient.$queryRaw`CREATE DATABASE ${dbName}`;
          this.logger.log(`✅ Database ${dbName} created successfully`);
        } else {
          this.logger.log(`📋 Database ${dbName} already exists`);
        }
      } finally {
        await postgresClient.$disconnect();
        // Restore original DATABASE_URL
        process.env.DATABASE_URL = originalUrl;
      }
    } catch (error) {
      this.logger.warn('Could not create database automatically:', error);
      // Don't throw here, let the main connection attempt handle the error
    }
  }

  async onModuleDestroy() {
    try {
      this.logger.log('Disconnecting from database...');
      await this.$disconnect();
      this.logger.log('Database disconnected successfully');
    } catch (error) {
      this.logger.error('Error disconnecting from database:', error);
    }
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
