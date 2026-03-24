import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { ProcedureJobData } from '../../interfaces/queue.interface';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('procedure')
export class ProcedureProcessor {
  private readonly logger = new Logger(ProcedureProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  @Process('process-procedure')
  async handleProcessProcedure(job: Job<ProcedureJobData>) {
    const { data } = job;
    this.logger.log('Traitement procédure');

    try {
      const procedure = await this.prisma.procedure.findUnique({
        where: { id: data.procedureId },
      });

      if (!procedure) {
        throw new Error(
          `Procedure ${data.procedureId?.substring(0, 8)}*** not found`,
        );
      }

      switch (data.action) {
        case 'create':
          await this.mailService.sendProcedureCreatedEmail(
            procedure.email,
            procedure.prenom,
            {
              id: procedure.id,
              destination:
                procedure.destination ||
                procedure.destinationAutre ||
                'indéfinie',
              filiere:
                procedure.filiere || procedure.filiereAutre || 'indéfinie',
              statut: procedure.statut,
            },
          );
          break;

        case 'status_change':
          await this.mailService.sendProcedureStatusUpdatedEmail(
            procedure.email,
            procedure.prenom,
            {
              id: procedure.id,
              destination:
                procedure.destination ||
                procedure.destinationAutre ||
                'indéfinie',
              filiere:
                procedure.filiere || procedure.filiereAutre || 'indéfinie',
              statut: procedure.statut,
            },
            data.newStatus || procedure.statut,
            procedure.statut,
          );
          break;

        case 'delete':
          await this.mailService.sendProcedureDeletedEmail(
            procedure.email,
            procedure.prenom,
            {
              destination:
                procedure.destination ||
                procedure.destinationAutre ||
                'indéfinie',
            },
            'Procédure supprimée',
          );
          this.logger.log('Procédure supprimée');
          break;
      }

      this.logger.log('Procédure traitée avec succès');
      return { success: true, procedureId: data.procedureId };
    } catch (error) {
      this.logger.error(`Erreur procédure: ${(error as Error).message}`);
      throw error;
    }
  }

  @Process('generate-procedure-report')
  async handleGenerateReport(job: Job<{ procedureId: string; type: string }>) {
    const { procedureId, type } = job.data;
    this.logger.log(
      `Generation rapport ${type} pour procedure ${procedureId?.substring(0, 8)}***`,
    );

    await new Promise((resolve) => setTimeout(resolve, 5000));

    this.logger.log(
      `Rapport genere pour procedure ${procedureId?.substring(0, 8)}***`,
    );

    return { success: true, procedureId, reportType: type };
  }
}
