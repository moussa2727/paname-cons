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
        case 'create': {
          const htmlCreated = `
            <div style="margin:25px 0;line-height:1.8;">
              <p>Nous avons le plaisir de vous informer que votre procédure d'admission a été créée avec succès.</p>
              <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
                <h3 style="margin-top:0;color:#0284c7;">Détails de votre procédure</h3>
                <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Destination :</span> ${procedure.destination}</div>
                <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Statut :</span> Créée</div>
              </div>
              <p>Notre équipe va désormais vous accompagner pas à pas dans votre projet d'études.</p>
            </div>`;
          await this.mailService.sendProcedureCreatedEmail(
            procedure.email,
            procedure.prenom,
            htmlCreated,
          );
          break;
        }

        case 'status_change': {
          const htmlUpdated = `
            <div style="margin:20px 0;line-height:1.5;">
              <p>Votre procédure d'admission a été mise à jour.</p>
              <div style="border-left:4px solid #0284c7;margin:15px 0;padding-left:15px;">
                <p style="margin:0 0 5px 0;"><strong>Statut :</strong> ${data.newStatus || 'Inconnu'}</p>
                <p style="margin:0 0 5px 0;"><strong>Destination :</strong> ${procedure.destination}</p>
              </div>
              <p>Suivez votre dossier depuis votre espace personnel.</p>
            </div>`;
          await this.mailService.sendProcedureStatusUpdatedEmail(
            procedure.email,
            procedure.prenom,
            htmlUpdated,
          );
          break;
        }

        case 'delete': {
          const htmlDeleted = `
            <div style="margin:25px 0;line-height:1.8;">
              <p>Votre procédure d'admission a été supprimée.</p>
              <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
                <h3 style="margin-top:0;color:#0284c7;">Procédure supprimée</h3>
                <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Identifiant :</span> ${procedure.id}</div>
                <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Destination :</span> ${procedure.destination}</div>
                <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Raison :</span> Procédure supprimée</div>
              </div>
              <p>Nous restons à votre disposition pour toute question ou pour créer une nouvelle procédure.</p>
            </div>`;
          await this.mailService.sendProcedureDeletedEmail(
            procedure.email,
            procedure.prenom,
            htmlDeleted,
          );
          this.logger.log('Procédure supprimée');
          break;
        }
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
