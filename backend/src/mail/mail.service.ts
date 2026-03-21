import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Attachment } from 'nodemailer/lib/mailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { RendezvousEntity } from '../rendezvous/entities/rendezvous.entity';
import { ProcedureEntity } from '../procedures/entities/procedure.entity';
import { ProcedureStatus, StepStatus } from '@prisma/client';
import { RendezvousStatus, AdminOpinion, CancelledBy } from '@prisma/client';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly fromEmail: string;
  private readonly fromName: string = 'Paname Consulting';
  private readonly logger = new Logger(MailService.name);
  private readonly appName: string = 'Paname Consulting';
  private readonly frontendUrl: string;

  constructor(private configService: ConfigService) {
    const emailUser =
      this.configService.get<string>('EMAIL_USER') || process.env.EMAIL_USER;
    const emailPass =
      this.configService.get<string>('EMAIL_PASS') || process.env.EMAIL_PASS;
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';

    if (!emailUser || !emailPass) {
      this.logger.warn('Configuration email manquante');
    }
    // mail.service.ts — constructeur
    const transportConfig: SMTPTransport.Options = {
      host: 'smtp.gmail.com', // laisser nodemailer résoudre en IPv4
      port: 587, // ← 587 au lieu de 465
      secure: false, // ← false pour STARTTLS
      requireTLS: true, // ← force TLS via STARTTLS
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      connectionTimeout: 30000,
      greetingTimeout: 15000,
      socketTimeout: 45000,
      tls: {
        rejectUnauthorized: true, // remettre à true en production
      },
    };

    // Forcer IPv4 en utilisant une approche alternative
    // Créer le transport avec des options modifiées pour IPv4
    this.transporter = nodemailer.createTransport({
      ...transportConfig,
    });
    this.fromEmail = emailUser || '';
  }

  // ==================== CORE ====================

  async sendEmail(options: {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
    fromName?: string;
    replyTo?: string;
    cc?: string | string[];
    bcc?: string | string[];
    attachments?: Attachment[];
  }): Promise<{ success: boolean; error?: string }> {
    if (!this.transporter) {
      return { success: false, error: 'Service GMAIL non configuré' };
    }

    try {
      const fromEmail = options.from || this.fromEmail;
      const fromName = options.fromName || this.fromName;

      await this.transporter.sendMail({
        from: `${fromName} <${fromEmail}>`,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        replyTo: options.replyTo,
        cc: options.cc
          ? Array.isArray(options.cc)
            ? options.cc
            : [options.cc]
          : undefined,
        bcc: options.bcc
          ? Array.isArray(options.bcc)
            ? options.bcc
            : [options.bcc]
          : undefined,
        attachments: options.attachments || [],
      });

      this.logger.log('Email envoyé avec succès');
      return { success: true };
    } catch (error) {
      this.logger.error('Echec d envoi d email', (error as Error).message);

      // En cas d'erreur de connexion, logger plus de détails
      if (
        (error as Error).message.includes('ENETUNREACH') ||
        (error as Error).message.includes('Délai de connexion dépassé')
      ) {
        this.logger.error(
          'Problème de connexion SMTP - vérifier la configuration réseau et les identifiants Gmail',
        );
      }

      return { success: false, error: (error as Error).message };
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.transporter.verify();
      return { success: true, message: 'Connexion GMAIL réussie' };
    } catch (error) {
      return {
        success: false,
        message: `Échec de connexion: ${(error as Error).message}`,
      };
    }
  }

  getStatus(): { available: boolean; message: string } {
    return {
      available: !!this.transporter,
      message: this.transporter
        ? 'Service GMAIL configuré et prêt'
        : 'Service GMAIL non configuré',
    };
  }

  // ==================== TEMPLATE DE BASE ====================

  private getBaseTemplate(
    header: string,
    content: string,
    firstName: string,
  ): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.appName} - ${header}</title>
</head>
<body style="font-family:Arial,sans-serif;line-height:1.5;color:#333;max-width:600px;margin:0 auto;padding:20px;background-color:#ffffff;">
  <div style="background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(14,165,233,0.1);border:1px solid #e0f2fe;">
    <div style="background:#0ea5e9;color:white;padding:30px 20px;text-align:center;">
      <h1 style="margin:0;font-size:24px;font-weight:600;">${this.appName}</h1>
      <p style="margin:5px 0 0 0;font-size:14px;">${header}</p>
    </div>
    <div style="padding:30px 20px;background:white;">
      <p style="font-size:14px;margin-bottom:20px;">Bonjour <strong>${firstName}</strong>,</p>
      ${content}
      <div style="text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid #e0f2fe;color:#666;font-size:12px;">
        <p style="margin:0;">Cordialement,<br><strong>${this.appName}</strong></p>
        <p style="margin-top:10px;">
          <a href="${this.frontendUrl}" style="color:#0ea5e9;text-decoration:none;">
            ${this.frontendUrl.replace('https://', '').replace('http://', '')}
          </a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  // ==================== CONTACTS ====================

  /**
   * Notification admin - expéditeur dynamique = email du formulaire
   */
  buildContactNotificationHtml(data: {
    firstName: string;
    lastName: string;
    email: string;
    message: string;
    id: string;
    receivedAt: string;
  }): string {
    const content = `
      <div style="margin:20px 0;line-height:1.5;">
        <p>Nouveau message de contact reçu.</p>
        <div style="border-left:4px solid #0284c7;margin:15px 0;padding-left:15px;">
          <p style="margin:0 0 5px 0;"><strong>Nom :</strong> ${data.firstName} ${data.lastName}</p>
          <p style="margin:0 0 5px 0;"><strong>Email :</strong> ${data.email}</p>
          <p style="margin:0 0 5px 0;"><strong>Date :</strong> ${data.receivedAt}</p>
        </div>
        <div style="border-left:4px solid #64748b;margin:15px 0;padding-left:15px;">
          <p style="margin:0 0 5px 0;"><strong>Message :</strong></p>
          <p style="margin:0;white-space:pre-line;color:#666;">${data.message}</p>
        </div>
        <p style="font-size:11px;color:#666;text-align:center;">Date : ${data.receivedAt}</p>
      </div>`;
    return this.getBaseTemplate('Nouveau Message Contact', content, 'Équipe');
  }

  /**
   * Confirmation utilisateur - expéditeur = email officiel
   */
  buildContactConfirmationHtml(data: {
    firstName: string;
    lastName: string;
    message: string;
    id: string;
    receivedAt: string;
  }): string {
    const content = `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Nous avons bien reçu votre message et nous vous en remercions sincèrement.</p>
        <p>Notre équipe va l'examiner et vous répondra dans les plus brefs délais.</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
          <p style="margin:0;"><span style="font-weight:600;color:#374151;">Délai de réponse :</span> 48 heures ouvrables maximum</p>
        </div>
        <div style="background:#f0f9ff;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #0284c7;">
          <h4 style="margin-top:0;color:#0284c7;">Votre message :</h4>
          <div style="white-space:pre-line;line-height:1.7;">${data.message}</div>
        </div>
        <p style="font-size:12px;color:#6b7280;text-align:center;">Date : ${data.receivedAt}</p>
      </div>`;
    return this.getBaseTemplate(
      'Message Reçu avec Succès',
      content,
      data.firstName || 'Cher client',
    );
  }

  /**
   * Réponse admin à l'utilisateur
   */
  buildContactReplyHtml(data: {
    firstName: string;
    lastName: string;
    message: string;
    adminResponse: string;
    id: string;
    respondedAt: string;
  }): string {
    const content = `
      <div style="margin:20px 0;line-height:1.5;">
        <p>Nous avons bien reçu votre message et nous vous remercions.</p>
        <div style="border-left:4px solid #64748b;margin:15px 0;padding-left:15px;">
          <p style="margin:0 0 5px 0;"><strong>Votre message :</strong></p>
          <p style="margin:0;white-space:pre-line;color:#666;">${data.message}</p>
        </div>
        <div style="border-left:4px solid #0284c7;margin:15px 0;padding-left:15px;">
          <p style="margin:0 0 5px 0;"><strong>Notre réponse :</strong></p>
          <p style="margin:0;white-space:pre-line;">${data.adminResponse}</p>
        </div>
        <p style="font-size:11px;color:#666;text-align:center;">Réponse du ${data.respondedAt}</p>
      </div>`;
    return this.getBaseTemplate(
      'Réponse à Votre Message',
      content,
      data.firstName || 'Cher client',
    );
  }

  async sendProcedureStatusUpdatedEmail(
    email: string,
    firstName: string,
    html: string,
  ): Promise<boolean> {
    const result = await this.sendEmail({
      to: email,
      subject: 'Mise à jour de votre procédure - Paname Consulting',
      html: this.getBaseTemplate('Mise à jour Procédure', html, firstName),
    });
    return result.success;
  }

  async sendProcedureDeletedEmail(
    email: string,
    firstName: string,
    html: string,
  ): Promise<boolean> {
    const result = await this.sendEmail({
      to: email,
      subject: 'Suppression de votre procédure - Paname Consulting',
      html: this.getBaseTemplate('Procédure Supprimée', html, firstName),
    });
    return result.success;
  }

  // ==================== CONTACTS ====================

  async sendContactNotificationEmail(
    email: string,
    _firstName: string,
    html: string,
    subject: string,
  ): Promise<boolean> {
    const result = await this.sendEmail({
      to: email,
      subject,
      html: this.getBaseTemplate('Nouveau Message Contact', html, 'Équipe'),
    });
    return result.success;
  }

  async sendContactConfirmationEmail(
    email: string,
    firstName: string,
    html: string,
  ): Promise<boolean> {
    const result = await this.sendEmail({
      to: email,
      subject: 'Confirmation de réception de votre message - Paname Consulting',
      html: this.getBaseTemplate('Message Reçu', html, firstName),
    });
    return result.success;
  }

  async sendContactReplyEmail(
    email: string,
    firstName: string,
    html: string,
  ): Promise<boolean> {
    const result = await this.sendEmail({
      to: email,
      subject: 'Réponse à Votre Message - Paname Consulting',
      html: this.getBaseTemplate('Réponse à Votre Message', html, firstName),
    });
    return result.success;
  }

  // ==================== RENDEZ-VOUS ====================

  async sendRendezvousReminderEmail(
    email: string,
    firstName: string,
    html: string,
  ): Promise<boolean> {
    const result = await this.sendEmail({
      to: email,
      subject: 'Rappel de Rendez-vous - Paname Consulting',
      html: this.getBaseTemplate('Rappel de Rendez-vous', html, firstName),
    });
    return result.success;
  }

  async sendRendezvousCancelledEmail(
    email: string,
    firstName: string,
    html: string,
  ): Promise<boolean> {
    const result = await this.sendEmail({
      to: email,
      subject: 'Rendez-vous Annulé - Paname Consulting',
      html: this.getBaseTemplate('Rendez-vous Annulé', html, firstName),
    });
    return result.success;
  }

  async sendProcedureCreatedEmail(
    email: string,
    firstName: string,
    html: string,
  ): Promise<boolean> {
    const result = await this.sendEmail({
      to: email,
      subject: 'Votre procédure a été créée - Paname Consulting',
      html: this.getBaseTemplate('Procédure Créée', html, firstName),
    });
    return result.success;
  }

  async sendConfirmation(rendezvous: RendezvousEntity): Promise<boolean> {
    const dateFormatted = new Date(rendezvous.date).toLocaleDateString(
      'fr-FR',
      {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      },
    );

    const content = `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Votre rendez-vous a été confirmé avec succès.</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0ea5e9;margin:25px 0;">
          <h3 style="margin-top:0;color:#0ea5e9;">Détails du rendez-vous</h3>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Date :</span> ${dateFormatted}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Heure :</span> ${rendezvous.time}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Lieu :</span> ${this.appName} - Kalaban Coura</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Statut :</span> <span style="color:#10b981;font-weight:600;">Confirmé</span></div>
        </div>
        <p>Nous vous attendons avec impatience.</p>
      </div>`;

    const result = await this.sendEmail({
      to: rendezvous.email,
      subject: 'Confirmation de votre rendez-vous - Paname Consulting',
      html: this.getBaseTemplate(
        'Rendez-vous Confirmé',
        content,
        rendezvous.firstName,
      ),
    });
    return result.success;
  }

  async sendReminder(rendezvous: RendezvousEntity): Promise<boolean> {
    const content = `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Rappel : Vous avez un rendez-vous aujourd'hui.</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
          <h3 style="margin-top:0;color:#0284c7;">Votre rendez-vous aujourd'hui</h3>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Heure :</span> ${rendezvous.time}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Lieu :</span> ${this.appName} - Kalaban Coura</div>
        </div>
        <p>Nous sommes impatients de vous rencontrer.</p>
      </div>`;

    const result = await this.sendEmail({
      to: rendezvous.email,
      subject: "Rappel - Rendez-vous aujourd'hui - Paname Consulting",
      html: this.getBaseTemplate(
        'Rappel de Rendez-vous',
        content,
        rendezvous.firstName,
      ),
    });
    return result.success;
  }

  async sendNextDayReminder(rendezvous: RendezvousEntity): Promise<boolean> {
    const content = `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Rappel : Vous avez un rendez-vous demain.</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
          <h3 style="margin-top:0;color:#0284c7;">Rendez-vous de demain</h3>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Date :</span> ${new Date(rendezvous.date).toLocaleDateString('fr-FR')}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Heure :</span> ${rendezvous.time}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Lieu :</span> ${this.appName} - Kalaban Coura</div>
        </div>
        <p>Pensez à préparer vos documents.</p>
      </div>`;

    const result = await this.sendEmail({
      to: rendezvous.email,
      subject: 'Rappel - Rendez-vous demain - Paname Consulting',
      html: this.getBaseTemplate(
        'Rappel de Rendez-vous',
        content,
        rendezvous.firstName,
      ),
    });
    return result.success;
  }

  async sendTwoHourReminder(rendezvous: RendezvousEntity): Promise<boolean> {
    const content = `
      <div style="margin:25px 0;line-height:1.8;">
        <p><strong>RAPPELEZ-VOUS : Votre rendez-vous dans 2 heures !</strong></p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
          <h3 style="margin-top:0;color:#0284c7;">Rendez-vous imminent</h3>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Heure :</span> ${rendezvous.time}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Lieu :</span> ${this.appName} - Kalaban Coura</div>
        </div>
        <p>Nous vous attendons dans 2 heures !</p>
      </div>`;

    const result = await this.sendEmail({
      to: rendezvous.email,
      subject: 'RAPPEL - Rendez-vous dans 2h - Paname Consulting',
      html: this.getBaseTemplate(
        'Rappel Urgent',
        content,
        rendezvous.firstName,
      ),
    });
    return result.success;
  }

  async sendStatusUpdate(rendezvous: RendezvousEntity): Promise<boolean> {
    let content = '';
    let subject = '';
    let header = 'Mise à jour de Rendez-vous';

    switch (rendezvous.status) {
      case RendezvousStatus.CONFIRMED:
        subject = 'Rendez-vous Confirmé - Paname Consulting';
        content = `
          <div style="margin:25px 0;line-height:1.8;">
            <p>Votre rendez-vous a été confirmé.</p>
            <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
              <h3 style="margin-top:0;color:#0284c7;">Rendez-vous confirmé</h3>
              <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Date :</span> ${new Date(rendezvous.date).toLocaleDateString('fr-FR')}</div>
              <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Heure :</span> ${rendezvous.time}</div>
            </div>
          </div>`;
        break;

      case RendezvousStatus.CANCELLED: {
        subject = 'Rendez-vous Annulé - Paname Consulting';
        header = 'Rendez-vous Annulé';
        const cancelledBy =
          rendezvous.cancelledBy === CancelledBy.ADMIN
            ? 'par notre équipe'
            : 'à votre demande';
        content = `
          <div style="margin:25px 0;line-height:1.8;">
            <p>Votre rendez-vous a été annulé ${cancelledBy}.</p>
            <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
              <h3 style="margin-top:0;color:#0284c7;">Rendez-vous annulé</h3>
              <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Date prévue :</span> ${new Date(rendezvous.date).toLocaleDateString('fr-FR')}</div>
              <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Heure prévue :</span> ${rendezvous.time}</div>
              ${
                rendezvous.cancellationReason
                  ? `<div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Raison :</span> ${rendezvous.cancellationReason}</div>`
                  : ''
              }
            </div>
            <div style="text-align:center;margin-top:30px;">
              <a href="${this.frontendUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0284c7,#0ea5e9);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Reprogrammer un rendez-vous</a>
            </div>
          </div>`;
        break;
      }

      case RendezvousStatus.COMPLETED:
        header = 'Rendez-vous Terminé';
        if (rendezvous.avisAdmin === AdminOpinion.FAVORABLE) {
          subject = 'Rendez-vous Terminé - Avis Favorable - Paname Consulting';
          content = `
            <div style="margin:25px 0;line-height:1.8;">
              <p>Votre rendez-vous s'est déroulé avec succès.</p>
              <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
                <h3 style="margin-top:0;color:#0284c7;">Avis favorable</h3>
                <p style="margin:0;">Votre dossier a reçu un avis favorable. Votre procédure d'admission a été lancée.</p>
              </div>
              <p>Félicitations pour cette première étape réussie.</p>
            </div>`;
        } else if (rendezvous.avisAdmin === AdminOpinion.UNFAVORABLE) {
          subject = 'Rendez-vous Terminé - Paname Consulting';
          content = `
            <div style="margin:25px 0;line-height:1.8;">
              <p>Votre rendez-vous est maintenant terminé.</p>
              <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
                <h3 style="margin-top:0;color:#0284c7;">Compte rendu</h3>
                <p style="margin:0;">Votre dossier n'a pas reçu un avis favorable pour le programme envisagé.</p>
              </div>
              <p>Notre équipe reste à votre disposition pour étudier d'autres alternatives.</p>
            </div>`;
        }
        break;

      case RendezvousStatus.PENDING:
        subject = 'Statut Modifié - En Attente - Paname Consulting';
        header = 'Rendez-vous en Attente';
        content = `
          <div style="margin:25px 0;line-height:1.8;">
            <p>Votre demande de rendez-vous est en attente de confirmation.</p>
            <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
              <h3 style="margin-top:0;color:#0284c7;">En attente de confirmation</h3>
              <p style="margin:0;">Nous traiterons votre demande dans les meilleurs délais.</p>
            </div>
          </div>`;
        break;
    }

    if (!content || !subject) return false;

    const result = await this.sendEmail({
      to: rendezvous.email,
      subject,
      html: this.getBaseTemplate(header, content, rendezvous.firstName),
    });
    return result.success;
  }

  // ==================== PROCÉDURES ====================

  async sendProcedureUpdate(procedure: ProcedureEntity): Promise<boolean> {
    const completedSteps =
      procedure.steps?.filter((s) => s.statut === StepStatus.COMPLETED)
        .length || 0;
    const totalSteps = procedure.steps?.length || 0;
    const progress =
      totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    const currentStep = procedure.steps?.find(
      (s) => s.statut === StepStatus.IN_PROGRESS,
    );

    let content = '';
    let header = 'Mise à jour de Procédure';
    let subject = 'Mise à jour de votre procédure - Paname Consulting';

    if (procedure.statut === ProcedureStatus.COMPLETED) {
      subject = 'Procédure Terminée - Paname Consulting';
      header = 'Procédure Finalisée';
      content = `
        <div style="margin:25px 0;line-height:1.8;">
          <p>Votre procédure d'admission est maintenant terminée avec succès.</p>
          <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
            <h3 style="margin-top:0;color:#0284c7;">Procédure finalisée</h3>
            <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Statut :</span> <span style="color:#0284c7;font-weight:600;">${procedure.statut}</span></div>
            <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Destination :</span> ${procedure.destination}</div>
            <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Filière :</span> ${procedure.filiere}</div>
          </div>
          <p>Félicitations ! Vous avez franchi toutes les étapes nécessaires.</p>
        </div>`;
    } else if (procedure.statut === ProcedureStatus.REJECTED) {
      subject = 'Procédure Rejetée - Paname Consulting';
      header = 'Procédure Rejetée';
      content = `
        <div style="margin:25px 0;line-height:1.8;">
          <p>Votre procédure d'admission a été rejetée.</p>
          <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
            <h3 style="margin-top:0;color:#0284c7;">Décision</h3>
            <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Statut :</span> <span style="color:#0284c7;font-weight:600;">${procedure.statut}</span></div>
            <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Destination :</span> ${procedure.destination}</div>
            ${
              procedure.raisonRejet
                ? `<div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Raison :</span> ${procedure.raisonRejet}</div>`
                : ''
            }
          </div>
          <p>Notre équipe reste à votre disposition pour discuter des alternatives.</p>
        </div>`;
    } else if (currentStep) {
      content = `
        <div style="margin:25px 0;line-height:1.8;">
          <p>Votre procédure d'admission avance.</p>
          <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
            <h3 style="margin-top:0;color:#0284c7;">Avancement</h3>
            <div style="margin-bottom:10px;">
              <span style="font-weight:600;color:#374151;">Progression :</span>
              <div style="background:#e0f2fe;height:8px;border-radius:4px;margin:6px 0;overflow:hidden;">
                <div style="background:linear-gradient(90deg,#0284c7,#0ea5e9);height:100%;width:${progress}%;"></div>
              </div>
              <span style="font-weight:600;color:#0284c7;">${progress}%</span>
            </div>
            <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Étape en cours :</span> ${currentStep.nom}</div>
            <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Statut :</span> ${procedure.statut}</div>
            <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Destination :</span> ${procedure.destination}</div>
          </div>
          <p>Notre équipe travaille activement sur votre dossier.</p>
        </div>`;
    }

    if (!content) return false;

    const result = await this.sendEmail({
      to: procedure.email,
      subject,
      html: this.getBaseTemplate(header, content, procedure.prenom),
    });
    return result.success;
  }

  async sendProcedureCreation(
    procedure: ProcedureEntity,
    rendezvous: RendezvousEntity,
  ): Promise<boolean> {
    const content = `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Suite à l'avis favorable de votre rendez-vous, votre procédure d'admission a été lancée.</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
          <h3 style="margin-top:0;color:#0284c7;">Votre procédure est lancée</h3>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Destination :</span> ${procedure.destination}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Filière :</span> ${procedure.filiere}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Date du rendez-vous :</span> ${new Date(rendezvous.date).toLocaleDateString('fr-FR')}</div>
        </div>
        <p>Notre équipe va désormais vous accompagner pas à pas.</p>
      </div>`;

    const result = await this.sendEmail({
      to: procedure.email,
      subject: 'Votre procédure est lancée - Paname Consulting',
      html: this.getBaseTemplate('Procédure Créée', content, procedure.prenom),
    });
    return result.success;
  }

  async sendCancellationNotification(
    procedure: ProcedureEntity,
  ): Promise<boolean> {
    const content = `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Votre procédure d'admission a été annulée.</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
          <h3 style="margin-top:0;color:#0284c7;">Annulation</h3>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Destination :</span> ${procedure.destination}</div>
          ${
            procedure.deletionReason
              ? `<div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Raison :</span> ${procedure.deletionReason}</div>`
              : ''
          }
        </div>
        <p>Notre équipe reste à votre disposition pour toute question.</p>
      </div>`;

    const result = await this.sendEmail({
      to: procedure.email,
      subject: 'Annulation de votre procédure - Paname Consulting',
      html: this.getBaseTemplate(
        'Procédure Annulée',
        content,
        procedure.prenom,
      ),
    });
    return result.success;
  }

  // ==================== SYSTÈME ====================

  async sendPasswordReset(
    email: string,
    resetUrl: string,
    firstName: string = '',
  ): Promise<boolean> {
    const content = `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour procéder :</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0284c7,#0ea5e9);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Réinitialiser mon mot de passe</a>
        </div>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
          <p style="margin:0;color:#374151;font-size:14px;"><strong>Informations importantes :</strong></p>
          <ul style="margin:10px 0 0 0;padding-left:20px;font-size:14px;">
            <li>Ce lien est valable pendant <strong>1 heure</strong></li>
            <li>Ne partagez jamais ce lien avec personne</li>
            <li>Si vous n'avez pas fait cette demande, ignorez cet email</li>
          </ul>
        </div>
        <p style="color:#6b7280;font-size:14px;text-align:center;">
          Si le bouton ne fonctionne pas, copiez-collez ce lien :<br>
          <code style="background:#f0f9ff;padding:5px 10px;border-radius:4px;font-size:12px;word-break:break-all;">${resetUrl}</code>
        </p>
      </div>`;

    const result = await this.sendEmail({
      to: email,
      subject: `Réinitialisation de votre mot de passe - ${this.appName}`,
      html: this.getBaseTemplate(
        'Réinitialisation de mot de passe',
        content,
        firstName || 'Cher client',
      ),
    });
    return result.success;
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
    const content = `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Nous sommes ravis de vous accueillir dans la communauté <strong>${this.appName}</strong> !</p>
        <div style="background:linear-gradient(135deg,#f0f9ff,#e0f2fe);padding:30px;border-radius:8px;margin:25px 0;text-align:center;border:1px solid #bae6fd;">
          <p style="margin:0 0 15px 0;font-size:18px;font-weight:600;color:#0284c7;">Votre compte a été créé avec succès</p>
          <p style="margin:0;font-size:15px;">Vous pouvez maintenant accéder à toutes les fonctionnalités de votre espace personnel.</p>
        </div>
        <div style="margin:30px 0;line-height:2;">
          <div style="margin-bottom:10px;"><strong>Prendre rendez-vous</strong> avec nos conseillers experts</div>
          <div style="margin-bottom:10px;"><strong>Suivre votre procédure</strong> étape par étape</div>
          <div style="margin-bottom:10px;"><strong>Recevoir des notifications</strong> sur l'avancement de votre dossier</div>
        </div>
        <div style="text-align:center;margin:30px 0;">
          <a href="${this.frontendUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Accéder à mon espace personnel</a>
        </div>
      </div>`;

    const result = await this.sendEmail({
      to: email,
      subject: `Bienvenue chez ${this.appName}`,
      html: this.getBaseTemplate('Bienvenue !', content, firstName),
    });
    return result.success;
  }

  async sendVerificationEmail(
    email: string,
    verificationToken: string,
    firstName: string,
  ): Promise<boolean> {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${verificationToken}`;

    const content = `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Pour finaliser votre inscription, veuillez vérifier votre adresse email :</p>
        <div style="background:#f0f9ff;padding:30px;border-radius:8px;margin:25px 0;text-align:center;border:1px solid #bae6fd;">
          <p style="margin:0 0 20px 0;font-size:16px;font-weight:600;color:#0284c7;">Cliquez sur le bouton ci-dessous pour vérifier votre email</p>
          <a href="${verifyUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Vérifier mon adresse email</a>
        </div>
        <p style="color:#9ca3af;font-size:14px;text-align:center;">
          Si le bouton ne fonctionne pas, copiez-collez ce lien :<br>
          <code style="background:#f0f9ff;padding:5px 10px;border-radius:4px;font-size:12px;word-break:break-all;">${verifyUrl}</code>
        </p>
      </div>`;

    const result = await this.sendEmail({
      to: email,
      subject: `Vérification de votre adresse email - ${this.appName}`,
      html: this.getBaseTemplate(
        'Vérification de votre adresse email',
        content,
        firstName,
      ),
    });
    return result.success;
  }

  async sendAdminAlert(
    subject: string,
    message: string,
    level: 'info' | 'warning' | 'error' = 'error',
  ): Promise<boolean> {
    const adminEmail = this.configService.get<string>('EMAIL_USER');
    if (!adminEmail) {
      this.logger.warn('Configuration admin manquante');
      return false;
    }

    const borderColor =
      level === 'error'
        ? '#ef4444'
        : level === 'warning'
          ? '#f59e0b'
          : '#0ea5e9';

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;line-height:1.5;color:#333;max-width:600px;margin:0 auto;padding:20px;background-color:#ffffff;">
  <div style="background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(14,165,233,0.1);border:1px solid #e0f2fe;">
    <div style="background:${borderColor};color:white;padding:30px 20px;text-align:center;">
      <h2 style="margin:0;font-size:18px;font-weight:600;">Alerte Administration</h2>
    </div>
    <div style="padding:30px 20px;background:white;">
      <div style="border-left:4px solid ${borderColor};margin:20px 0;padding-left:15px;">
        <p style="margin:0 0 15px 0;font-weight:600;color:${borderColor};">Une alerte nécessite votre attention</p>
        <div style="background:#f8fafc;border:1px solid #e0f2fe;border-radius:4px;padding:15px;margin:15px 0;">
          <p style="margin:0 0 8px 0;"><strong>Sujet :</strong> ${subject}</p>
          <p style="margin:0 0 8px 0;"><strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
          <p style="margin:0;"><strong>Niveau :</strong> <span style="color:${borderColor};font-weight:600;">${level.toUpperCase()}</span></p>
        </div>
        <div style="background:#f8fafc;border:1px solid #e0f2fe;border-radius:4px;padding:15px;margin:15px 0;">
          <p style="margin:0;white-space:pre-line;font-family:monospace;font-size:12px;line-height:1.4;">${message}</p>
        </div>
      </div>
      <div style="text-align:center;margin-top:20px;padding-top:15px;border-top:1px solid #e0f2fe;color:#666;font-size:11px;">
        <p style="margin:0;">Alerte générée par ${this.appName}</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const result = await this.sendEmail({
      to: adminEmail,
      subject: `[ALERTE] ${subject}`,
      html,
    });
    return result.success;
  }
}
