import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueService } from '../queue/queue.service';
import { RendezvousStatus, ProcedureStatus } from '@prisma/client';

// Import all templates
import {
  welcomeTemplate,
  resetPasswordTemplate,
  passwordChangedTemplate,
} from './templates/auth';

import {
  rendezvousConfirmationTemplate,
  rendezvousCancelledTemplate,
  rendezvousStatusUpdatedTemplate,
  rendezvousReminderTemplate,
} from './templates/rendezvous';

import {
  procedureCreatedTemplate,
  procedureStatusUpdatedTemplate,
  procedureCompletedTemplate,
  procedureDeletedTemplate,
  procedureCancelledTemplate,
} from './templates/procedure';

import {
  contactConfirmationTemplate,
  contactNotificationTemplate,
  contactReplyTemplate,
} from './templates/contact';

import { profileUpdatedTemplate } from './templates/user';

import { EmailData } from '../interfaces';
import { SendEmailResult } from 'src/interfaces/queue.interface';
import { adminAlertTemplate } from './templates/admin/alert.template';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly frontendUrl: string;
  private readonly adminUrl: string;

  constructor(
    private configService: ConfigService,
    private queueService: QueueService,
  ) {
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'https://panameconsulting.com';
    this.adminUrl = `${this.frontendUrl}/gestionnaire/messages`;
  }

  public async sendEmail(data: EmailData): Promise<void> {
    await this.queueService.addEmailJob({
      to: data.to,
      subject: data.subject,
      html: data.html,
      priority: data.priority || 'normal',
    });
  }

  // ==================== AUTH EMAILS ====================

  async sendWelcomeEmail(to: string, firstName: string): Promise<void> {
    const html = welcomeTemplate({
      firstName,
      dashboardUrl: `${this.frontendUrl}`,
    });

    await this.sendEmail({
      to,
      subject: 'Bienvenue chez Paname Consulting',
      html,
      priority: 'high',
    });
  }

  async sendResetPasswordEmail(
    to: string,
    firstName: string,
    resetLink: string,
  ): Promise<void> {
    const html = resetPasswordTemplate({
      firstName,
      resetLink,
    });

    await this.sendEmail({
      to,
      subject: 'Réinitialisation de votre mot de passe - Paname Consulting',
      html,
      priority: 'high',
    });
  }

  async sendPasswordChangedEmail(to: string, firstName: string): Promise<void> {
    const html = passwordChangedTemplate({ firstName });

    await this.sendEmail({
      to,
      subject: 'Votre mot de passe a été modifié - Paname Consulting',
      html,
      priority: 'normal',
    });
  }

  // ==================== RENDEZVOUS EMAILS ====================

  async sendRendezvousConfirmationEmail(
    to: string,
    firstName: string,
    data: {
      id: string;
      date: Date;
      time: string;
      destination?: string;
      destinationAutre?: string | null;
    },
  ): Promise<void> {
    const destination =
      data.destinationAutre || data.destination || 'Non spécifiée';
    const html = rendezvousConfirmationTemplate({
      firstName,
      date: data.date.toLocaleDateString('fr-FR'),
      time: data.time,
      destination,
      rendezvousId: data.id,
      rendezvousUrl: `${this.frontendUrl}/user/mes-rendezvous`,
    });

    await this.sendEmail({
      to,
      subject: 'Confirmation de votre rendez-vous - Paname Consulting',
      html,
      priority: 'high',
    });
  }

  async sendRendezvousCancelledEmail(
    to: string,
    firstName: string,
    data: {
      id: string;
      date: Date;
      time: string;
      destination?: string;
      destinationAutre?: string | null;
    },
    cancelledBy: 'USER' | 'ADMIN',
  ): Promise<void> {
    const html = rendezvousCancelledTemplate({
      firstName,
      date: data.date.toLocaleDateString('fr-FR'),
      time: data.time,
      cancelledBy,
      newRendezvousUrl: `${this.frontendUrl}/rendez-vous`,
    });

    await this.sendEmail({
      to,
      subject: 'Annulation de votre rendez-vous - Paname Consulting',
      html,
      priority: 'high',
    });
  }

  async sendRendezvousStatusUpdatedEmail(
    to: string,
    firstName: string,
    data: {
      id: string;
      date: Date;
      time: string;
      destination?: string;
      destinationAutre?: string | null;
    },
    oldStatus: RendezvousStatus,
    newStatus: RendezvousStatus,
  ): Promise<void> {
    const html = rendezvousStatusUpdatedTemplate({
      firstName,
      date: data.date.toLocaleDateString('fr-FR'),
      time: data.time,
      oldStatus,
      newStatus,
      rendezvousUrl: `${this.frontendUrl}/user/mes-rendezvous`,
    });

    await this.sendEmail({
      to,
      subject: 'Mise à jour de votre rendez-vous - Paname Consulting',
      html,
      priority: 'normal',
    });
  }

  async sendRendezvousReminderEmail(
    to: string,
    firstName: string,
    data: {
      id: string;
      date: Date;
      time: string;
      destination?: string;
      destinationAutre?: string | null;
    },
  ): Promise<void> {
    const destination =
      data.destinationAutre || data.destination || 'Non spécifiée';
    const html = rendezvousReminderTemplate({
      firstName,
      date: data.date.toLocaleDateString('fr-FR'),
      time: data.time,
      destination,
      rendezvousUrl: `${this.frontendUrl}/user/mes-rendezvous`,
    });

    await this.sendEmail({
      to,
      subject: 'Rappel : Votre rendez-vous approche - Paname Consulting',
      html,
      priority: 'normal',
    });
  }

  // ==================== PROCEDURE EMAILS ====================

  async sendProcedureCreatedEmail(
    to: string,
    firstName: string,
    data: {
      id: string;
      destination: string;
      filiere: string;
      statut: ProcedureStatus;
    },
  ): Promise<void> {
    const html = procedureCreatedTemplate({
      firstName,
      destination: data.destination,
      filiere: data.filiere,
      procedureId: data.id,
      procedureUrl: `${this.frontendUrl}/user/mes-procedures`,
    });

    await this.sendEmail({
      to,
      subject: 'Confirmation de votre procédure - Paname Consulting',
      html,
      priority: 'high',
    });
  }

  async sendProcedureStatusUpdatedEmail(
    to: string,
    firstName: string,
    data: {
      id: string;
      destination: string;
      filiere: string;
      statut: ProcedureStatus;
    },
    oldStatus: ProcedureStatus,
    newStatus: ProcedureStatus,
  ): Promise<void> {
    const html = procedureStatusUpdatedTemplate({
      firstName,
      destination: data.destination,
      filiere: data.filiere,
      oldStatus,
      newStatus,
      procedureId: data.id,
      procedureUrl: `${this.frontendUrl}/user/mes-procedures`,
    });

    await this.sendEmail({
      to,
      subject: 'Mise à jour de votre procédure - Paname Consulting',
      html,
      priority: 'normal',
    });
  }

  async sendProcedureCompletedEmail(
    to: string,
    firstName: string,
    data: {
      id: string;
      destination: string;
      filiere: string;
    },
  ): Promise<void> {
    const html = procedureCompletedTemplate({
      firstName,
      destination: data.destination,
      filiere: data.filiere,
      procedureId: data.id,
      procedureUrl: `${this.frontendUrl}/user/mes-procedures`,
    });

    await this.sendEmail({
      to,
      subject:
        'Félicitations ! Votre procédure est terminée - Paname Consulting',
      html,
      priority: 'high',
    });
  }

  async sendProcedureDeletedEmail(
    to: string,
    firstName: string,
    data: {
      destination: string;
    },
    reason: string,
  ): Promise<void> {
    const html = procedureDeletedTemplate({
      firstName,
      destination: data.destination,
      reason,
    });

    await this.sendEmail({
      to,
      subject: 'Suppression de votre procédure - Paname Consulting',
      html,
      priority: 'high',
    });
  }

  async sendProcedureCancelledEmail(
    to: string,
    firstName: string,
    data: {
      destination: string;
    },
    reason: string,
  ): Promise<void> {
    const html = procedureCancelledTemplate({
      firstName,
      destination: data.destination,
      reason,
    });

    await this.sendEmail({
      to,
      subject: 'Annulation de votre procédure - Paname Consulting',
      html,
      priority: 'normal',
    });
  }

  // ==================== CONTACT EMAILS ====================

  async sendContactConfirmationEmail(
    to: string,
    firstName: string,
    lastName: string,
    message: string,
  ): Promise<void> {
    const html = contactConfirmationTemplate({
      firstName,
      lastName,
      message,
    });

    await this.sendEmail({
      to,
      subject: 'Confirmation de réception de votre message - Paname Consulting',
      html,
      priority: 'normal',
    });
  }

  async sendContactNotificationEmail(
    to: string,
    contact: {
      firstName: string;
      lastName: string;
      email: string;
      message: string;
      createdAt: Date;
    },
  ): Promise<void> {
    const html = contactNotificationTemplate({
      ...contact,
      adminUrl: `${this.adminUrl}/gestionnaire/messages`,
    });

    await this.sendEmail({
      to,
      from: contact.email, // Email dynamique de l'expéditeur
      fromName: `${contact.firstName} ${contact.lastName}`,
      subject: `Nouveau message de contact : ${contact.firstName} ${contact.lastName}`,
      html,
      priority: 'high',
    });
  }

  async sendContactReplyEmail(
    to: string,
    firstName: string,
    lastName: string,
    response: string,
  ): Promise<void> {
    const html = contactReplyTemplate({
      firstName,
      lastName,
      response,
    });

    await this.sendEmail({
      to,
      subject: 'Réponse à votre message - Paname Consulting',
      html,
      priority: 'normal',
    });
  }

  // ==================== USER EMAILS ====================

  async sendProfileUpdatedEmail(to: string, firstName: string): Promise<void> {
    const html = profileUpdatedTemplate({
      firstName,
      dashboardUrl: `${this.frontendUrl}`,
    });

    await this.sendEmail({
      to,
      subject: 'Votre profil a été mis à jour - Paname Consulting',
      html,
      priority: 'normal',
    });
  }

  async sendAdminAlert(
    title: string,
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    metadata?: Record<string, unknown>,
    fromEmail?: string, // Email dynamique optionnel
    fromName?: string, // Nom dynamique optionnel
  ): Promise<SendEmailResult> {
    if (!process.env.EMAIL_USER) {
      this.logger.warn('EMAIL_USER not configured, cannot send admin alert');
      return { success: false, error: 'EMAIL_USER not configured' };
    }

    const html = adminAlertTemplate({
      title,
      message,
      level,
      timestamp: new Date(),
      source: 'Paname Consulting Backend',
      metadata,
    });

    await this.sendEmail({
      to: process.env.EMAIL_USER,
      from: fromEmail || process.env.EMAIL_USER, // Email dynamique ou défaut
      fromName: fromName || 'Système Paname Consulting', // Nom dynamique ou défaut
      subject: `[Paname Consulting] ${title}`,
      html,
      priority: 'high',
    });
  }
}
