import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Rendezvous, RendezvousStatus } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import type { Attachment } from 'nodemailer/lib/mailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly fromEmail: string;
  private readonly fromName: string = 'Paname Consulting';
  private readonly logger = new Logger(MailService.name);
  private readonly appName: string = 'Paname Consulting';
  private readonly frontendUrl: string;

  constructor(private configService: ConfigService) {
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPass = this.configService.get<string>('EMAIL_PASS');
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';

    if (!emailUser || !emailPass) {
      this.logger.warn('Configuration email manquante');
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser || process.env.EMAIL_USER,
        pass: emailPass || process.env.EMAIL_PASS,
      },
      tls: { rejectUnauthorized: false },
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
      this.logger.error('Echec d envoi d email');
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

  // ==================== PROCÉDURE CONTENT GENERATORS ====================

  generateProcedureCreatedContent(procedure: {
    id: string;
    prenom: string;
    destination: string;
    filiere: string;
    statut: string;
  }): string {
    return `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Nous avons le plaisir de vous informer que votre procédure d'admission a été créée avec succès.</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #10b981;margin:25px 0;">
          <h3 style="margin-top:0;color:#10b981;">Détails de votre procédure</h3>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">ID Procédure :</span> ${procedure.id}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Destination :</span> ${procedure.destination}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Filière :</span> ${procedure.filiere}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Statut :</span> <span style="color:#10b981;font-weight:600;">${procedure.statut}</span></div>
        </div>
        <p>Notre équipe va désormais vous accompagner pas à pas dans votre projet d'études.</p>
        <div style="text-align:center;margin-top:30px;">
          <a href="${this.frontendUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Suivre ma procédure</a>
        </div>
      </div>`;
  }

  generateProcedureStatusUpdatedContent(procedure: {
    id: string;
    prenom: string;
    destination: string;
    statut: string;
  }): string {
    return `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Votre procédure d'admission a été mise à jour.</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0ea5e9;margin:25px 0;">
          <h3 style="margin-top:0;color:#0ea5e9;">Mise à jour de procédure</h3>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">ID Procédure :</span> ${procedure.id}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Destination :</span> ${procedure.destination}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Nouveau statut :</span> <span style="color:#0ea5e9;font-weight:600;">${procedure.statut}</span></div>
        </div>
        <p>Suivez votre dossier depuis votre espace personnel.</p>
        <div style="text-align:center;margin-top:30px;">
          <a href="${this.frontendUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Voir ma procédure</a>
        </div>
      </div>`;
  }

  generateProcedureDeletedContent(
    procedure: {
      id: string;
      prenom: string;
      destination: string;
    },
    reason: string,
  ): string {
    return `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Votre procédure d'admission a été supprimée.</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #ef4444;margin:25px 0;">
          <h3 style="margin-top:0;color:#ef4444;">Procédure supprimée</h3>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">ID Procédure :</span> ${procedure.id}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Destination :</span> ${procedure.destination}</div>
          ${reason ? `<div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Raison :</span> ${reason}</div>` : ''}
        </div>
        <p>Nous restons à votre disposition pour toute question ou pour créer une nouvelle procédure.</p>
        <div style="text-align:center;margin-top:30px;">
          <a href="${this.frontendUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#ef4444,#dc2626);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Nous contacter</a>
        </div>
      </div>`;
  }

  // ==================== RENDEZ-VOUS CONTENT GENERATORS ====================

  generateRendezvousCompletedContent(
    rendezvous: Rendezvous,
    isFavorable: boolean,
  ): string {
    return `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Votre rendez-vous a été terminé.</p>
        <div style="background:#f0fdf4;padding:25px;border-radius:8px;border-left:4px solid #10b981;margin:25px 0;">
          <h3 style="margin-top:0;color:#10b981;">Rendez-vous terminé</h3>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Avis administrateur :</span> <span style="color:${isFavorable ? '#10b981' : '#ef4444'};font-weight:600;">${isFavorable ? 'Favorable' : 'Défavorable'}</span></div>
          ${isFavorable ? '<div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Une procédure d\'admission va être créée automatiquement.</span></div>' : ''}
        </div>
        <p>Merci de votre confiance. Notre équipe reste à votre disposition.</p>
        <div style="text-align:center;margin-top:30px;">
          <a href="${this.frontendUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#10b981,#059669);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Voir mon espace</a>
        </div>
      </div>`;
  }

  generateRendezvousCancelledContent(
    rendezvous: Rendezvous,
    cancelledBy: string,
  ): string {
    return `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Votre rendez-vous a été annulé.</p>
        <div style="background:#fef3c7;padding:25px;border-radius:8px;border-left:4px solid #f59e0b;margin:25px 0;">
          <h3 style="margin-top:0;color:#d97706;">Rendez-vous annulé</h3>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Date :</span> ${new Date(rendezvous.date).toLocaleDateString('fr-FR')}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Annulé par :</span> ${cancelledBy === 'ADMIN' ? 'Administrateur' : 'Utilisateur'}</div>
        </div>
        <p>Nous restons à votre disposition pour prendre un nouveau rendez-vous.</p>
        <div style="text-align:center;margin-top:30px;">
          <a href="${this.frontendUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#ef4444,#dc2626);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Prendre un nouveau rendez-vous</a>
        </div>
      </div>`;
  }

  generateRendezvousConfirmationContent(rendezvous: {
    id: string;
    date: Date;
    time: string;
    destination?: string;
    destinationAutre?: string;
  }): string {
    return `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Nous avons le plaisir de vous confirmer votre rendez-vous.</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
          <h3 style="margin-top:0;color:#0284c7;">Votre rendez-vous</h3>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Date :</span> ${new Date(rendezvous.date).toLocaleDateString('fr-FR')}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Heure :</span> ${rendezvous.time}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Lieu :</span> ${rendezvous.destination || rendezvous.destinationAutre || 'Non spécifié'}</div>
        </div>
        <p>Nous sommes impatients de vous rencontrer à notre bureau.</p>
        <div style="text-align:center;margin-top:30px;">
          <a href="${this.frontendUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0284c7,#0ea5e9);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Voir mon rendez-vous</a>
        </div>
      </div>`;
  }

  generateRendezvousReminderContent(rendezvous: {
    date: Date;
    time: string;
  }): string {
    return `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Rappel : Vous avez un rendez-vous.</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
          <h3 style="margin-top:0;color:#0284c7;">Votre rendez-vous</h3>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Date :</span> ${new Date(rendezvous.date).toLocaleDateString('fr-FR')}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Heure :</span> ${rendezvous.time}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Lieu :</span> Paname Consulting - Kalaban Coura</div>
        </div>
        <p>Nous sommes impatients de vous rencontrer.</p>
      </div>`;
  }

  // Add this method to MailService class
  async sendRendezvousStatusUpdatedEmail(
    email: string,
    firstName: string,
    rendezvous: {
      id: string;
      date: Date;
      time: string;
      destination?: string;
      destinationAutre?: string;
    },
    oldStatus: RendezvousStatus,
    newStatus: RendezvousStatus,
  ): Promise<boolean> {
    const content = this.generateRendezvousStatusUpdatedContent(
      rendezvous,
      oldStatus,
      newStatus,
    );
    const result = await this.sendEmail({
      to: email,
      subject: 'Mise à jour de votre rendez-vous - Paname Consulting',
      html: this.getBaseTemplate(
        'Mise à jour de Rendez-vous',
        content,
        firstName,
      ),
    });
    return result.success;
  }

  // Add this method to generate the content
  generateRendezvousStatusUpdatedContent(
    rendezvous: {
      id: string;
      date: Date;
      time: string;
      destination?: string;
      destinationAutre?: string;
    },
    oldStatus: RendezvousStatus,
    newStatus: RendezvousStatus,
  ): string {
    const statusLabels: Record<RendezvousStatus, string> = {
      [RendezvousStatus.PENDING]: 'En attente',
      [RendezvousStatus.CONFIRMED]: 'Confirmé',
      [RendezvousStatus.COMPLETED]: 'Terminé',
      [RendezvousStatus.CANCELLED]: 'Annulé',
    };

    return `
    <div style="margin:25px 0;line-height:1.8;">
      <p>Votre rendez-vous a été mis à jour.</p>
      <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0ea5e9;margin:25px 0;">
        <h3 style="margin-top:0;color:#0ea5e9;">Mise à jour de rendez-vous</h3>
        <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">ID Rendez-vous :</span> ${rendezvous.id}</div>
        <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Date :</span> ${new Date(rendezvous.date).toLocaleDateString('fr-FR')}</div>
        <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Heure :</span> ${rendezvous.time}</div>
        <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Ancien statut :</span> ${statusLabels[oldStatus]}</div>
        <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Nouveau statut :</span> <span style="color:#0ea5e9;font-weight:600;">${statusLabels[newStatus]}</span></div>
      </div>
      <p>Suivez votre rendez-vous depuis votre espace personnel.</p>
      <div style="text-align:center;margin-top:30px;">
        <a href="${this.frontendUrl}/user/mes-rendezvous²" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Voir mes rendez-vous</a>
      </div>
    </div>`;
  }

  generateAutoCancelContent(rendezvous: { date: Date; time: string }): string {
    return `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Votre rendez-vous a été annulé.</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #ef4444;margin:25px 0;">
          <h3 style="margin-top:0;color:#ef4444;">Rendez-vous annulé</h3>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Date prévue :</span> ${new Date(rendezvous.date).toLocaleDateString('fr-FR')}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Heure prévue :</span> ${rendezvous.time}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Raison :</span> Annulation automatique: non confirmé dans les 5 heures</div>
        </div>
        <div style="text-align:center;margin-top:30px;">
          <a href="${this.frontendUrl}/user/mes-rendezvous" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Reprogrammer un rendez-vous</a>
        </div>
      </div>`;
  }

  // ==================== USER CONTENT GENERATORS ====================

  generateProfileUpdatedContent(user: {
    firstName: string;
    email: string;
  }): string {
    return `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Bonjour <strong>${user.firstName}</strong>,</p>
        <p>Votre profil a été mis à jour avec succès.</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #10b981;margin:25px 0;">
          <h3 style="margin-top:0;color:#10b981;">Mise à jour réussie</h3>
          <p style="margin:0;">Les modifications de votre profil ont été enregistrées.</p>
        </div>
        <p>Si vous n'êtes pas à l'origine de cette modification, veuillez nous contacter immédiatement.</p>
        <div style="text-align:center;margin-top:30px;">
          <a href="${this.frontendUrl}/user/mon-profil" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Voir mon profil</a>
        </div>
        <p style="margin-top:30px;">Cordialement,<br><strong>${this.appName}</strong></p>
      </div>`;
  }

  generateForgotPasswordContent(
    user: { firstName: string; email: string },
    token: string,
  ): string {
    const resetLink = `${this.frontendUrl}/reinitialiser-mot-de-passe?token=${token}`;

    return `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Bonjour <strong>${user.firstName}</strong>,</p>
        <p>Nous avons reçu une demande de réinitialisation de votre mot de passe.</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
          <h3 style="margin-top:0;color:#0284c7;">Instructions de réinitialisation</h3>
          <p style="margin:0;">Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
          <div style="text-align:center;margin:20px 0;">
            <a href="${resetLink}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0284c7,#0ea5e9);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Réinitialiser mon mot de passe</a>
          </div>
          <p style="margin:10px 0 0 0;font-size:12px;color:#666;">Ou copiez-collez ce lien : <br>${resetLink}</p>
        </div>
        <div style="background:#fef3c7;padding:20px;border-radius:8px;border-left:4px solid #f59e0b;margin:25px 0;">
          <h4 style="margin-top:0;color:#d97706;">⚠️ Important</h4>
          <ul style="margin:10px 0;padding-left:20px;color:#666;">
            <li>Ce lien expire dans <strong>2 heures</strong></li>
            <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
            <li>Ne partagez jamais ce lien avec personne</li>
          </ul>
        </div>
        <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        <p style="margin-top:30px;">Cordialement,<br><strong>Paname Consulting</strong></p>
      </div>`;
  }

  generateWelcomeContent(user: { firstName: string; email: string }): string {
    return `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Bienvenue <strong>${user.firstName}</strong> !</p>
        <p>Nous sommes ravis de vous accueillir au sein de Paname Consulting.</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
          <h3 style="margin-top:0;color:#0284c7;">Votre compte a été créé</h3>
          <p style="margin:0;">Vous pouvez maintenant accéder à votre espace personnel et commencer votre parcours avec nous.</p>
        </div>
        <div style="text-align:center;margin:30px 0;">
          <a href="${this.frontendUrl}/connexion" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0284c7,#0ea5e9);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Me connecter</a>
        </div>
        <p>N'hésitez pas à nous contacter si vous avez des questions.</p>
        <p style="margin-top:30px;">Cordialement,<br><strong>L'équipe Paname Consulting</strong></p>
      </div>`;
  }

  // ==================== CONTACT CONTENT GENERATORS ====================

  generateContactConfirmationContent(contact: {
    firstName: string;
    lastName: string;
    message: string;
  }): string {
    return `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Bonjour <strong>${contact.firstName} ${contact.lastName}</strong>,</p>
        <p>Nous avons bien reçu votre message et vous en remercions. Nous vous répondrons dans les plus brefs délais.</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #10b981;margin:25px 0;">
          <h3 style="margin-top:0;color:#10b981;">Votre message</h3>
          <div style="background:#f8fafc;padding:15px;border-radius:6px;font-style:italic;color:#374151;">
            ${contact.message}
          </div>
        </div>
        <p>N'hésitez pas à nous contacter si vous avez d'autres questions.</p>
        <p style="margin-top:30px;">Cordialement,<br><strong>Paname Consulting</strong></p>
      </div>`;
  }

  generateContactNotificationContent(contact: {
    firstName: string;
    lastName: string;
    email: string;
    message: string;
    createdAt: Date;
  }): string {
    return `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Nouveau message de contact reçu :</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0ea5e9;margin:25px 0;">
          <h3 style="margin-top:0;color:#0ea5e9;">Informations du contact</h3>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Nom :</span> ${contact.firstName} ${contact.lastName}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Email :</span> ${contact.email}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Date :</span> ${new Date(contact.createdAt).toLocaleDateString('fr-FR')}</div>
        </div>
        <div style="background:#f8fafc;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #7c3aed;">
          <h4 style="margin-top:0;color:#7c3aed;">Message</h4>
          <div style="font-style:italic;color:#374151;">${contact.message}</div>
        </div>
        <div style="text-align:center;margin-top:30px;">
          <a href="${this.frontendUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Voir le message</a>
        </div>
      </div>`;
  }

  generateContactReplyContent(
    contact: {
      firstName: string;
      lastName: string;
    },
    response: string,
  ): string {
    return `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Bonjour <strong>${contact.firstName} ${contact.lastName}</strong>,</p>
        <p>Nous avons une réponse pour votre message.</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0ea5e9;margin:25px 0;">
          <h3 style="margin-top:0;color:#0ea5e9;">Notre réponse</h3>
          <div style="background:#f8fafc;padding:15px;border-radius:6px;color:#374151;">
            ${response}
          </div>
        </div>
        <p>N'hésitez pas à nous contacter si vous avez d'autres questions.</p>
        <p style="margin-top:30px;">Cordialement,<br><strong>Paname Consulting</strong></p>
      </div>`;
  }

  // ==================== SEND METHODS USING GENERATORS ====================

  async sendProcedureCreatedEmail(
    email: string,
    firstName: string,
    procedure: {
      id: string;
      destination: string;
      filiere: string;
      statut: string;
    },
  ): Promise<boolean> {
    const content = this.generateProcedureCreatedContent({
      id: procedure.id,
      prenom: firstName,
      destination: procedure.destination,
      filiere: procedure.filiere,
      statut: procedure.statut,
    });
    const result = await this.sendEmail({
      to: email,
      subject: 'Votre procédure a été créée - Paname Consulting',
      html: this.getBaseTemplate('Procédure Créée', content, firstName),
    });
    return result.success;
  }

  async sendProcedureStatusUpdatedEmail(
    email: string,
    firstName: string,
    procedure: { id: string; destination: string; statut: string },
  ): Promise<boolean> {
    const content = this.generateProcedureStatusUpdatedContent({
      id: procedure.id,
      prenom: firstName,
      destination: procedure.destination,
      statut: procedure.statut,
    });
    const result = await this.sendEmail({
      to: email,
      subject: 'Mise à jour de votre procédure - Paname Consulting',
      html: this.getBaseTemplate('Mise à jour Procédure', content, firstName),
    });
    return result.success;
  }

  async sendProcedureDeletedEmail(
    email: string,
    firstName: string,
    procedure: { id: string; destination: string },
    reason: string,
  ): Promise<boolean> {
    const content = this.generateProcedureDeletedContent(
      {
        id: procedure.id,
        prenom: firstName,
        destination: procedure.destination,
      },
      reason,
    );
    const result = await this.sendEmail({
      to: email,
      subject: 'Suppression de votre procédure - Paname Consulting',
      html: this.getBaseTemplate('Procédure Supprimée', content, firstName),
    });
    return result.success;
  }

  async sendRendezvousConfirmationEmail(
    email: string,
    firstName: string,
    rendezvous: {
      id: string;
      date: Date;
      time: string;
      destination?: string;
      destinationAutre?: string;
    },
  ): Promise<boolean> {
    const content = this.generateRendezvousConfirmationContent(rendezvous);
    const result = await this.sendEmail({
      to: email,
      subject: 'Confirmation de votre rendez-vous - Paname Consulting',
      html: this.getBaseTemplate('Rendez-vous Confirmé', content, firstName),
    });
    return result.success;
  }

  async sendRendezvousReminderEmail(
    email: string,
    firstName: string,
    rendezvous: { date: Date; time: string },
  ): Promise<boolean> {
    const content = this.generateRendezvousReminderContent(rendezvous);
    const result = await this.sendEmail({
      to: email,
      subject: 'Rappel de Rendez-vous - Paname Consulting',
      html: this.getBaseTemplate('Rappel de Rendez-vous', content, firstName),
    });
    return result.success;
  }

  async sendRendezvousCancelledEmail(
    email: string,
    firstName: string,
    rendezvous: { id: string; date: Date; time: string },
    cancelledBy: string,
  ): Promise<boolean> {
    const content = this.generateRendezvousCancelledContent(
      rendezvous as unknown as Rendezvous,
      cancelledBy,
    );
    const result = await this.sendEmail({
      to: email,
      subject: 'Rendez-vous Annulé - Paname Consulting',
      html: this.getBaseTemplate('Rendez-vous Annulé', content, firstName),
    });
    return result.success;
  }

  async sendAutoCancelEmail(
    email: string,
    firstName: string,
    rendezvous: { date: Date; time: string },
  ): Promise<boolean> {
    const content = this.generateAutoCancelContent(rendezvous);
    const result = await this.sendEmail({
      to: email,
      subject: 'Rendez-vous Annulé - Paname Consulting',
      html: this.getBaseTemplate('Rendez-vous Annulé', content, firstName),
    });
    return result.success;
  }

  async sendRendezvousCompletedEmail(
    email: string,
    firstName: string,
    rendezvous: Rendezvous,
    isFavorable: boolean,
  ): Promise<boolean> {
    const content = this.generateRendezvousCompletedContent(
      rendezvous,
      isFavorable,
    );
    const result = await this.sendEmail({
      to: email,
      subject: 'Rendez-vous Terminé - Paname Consulting',
      html: this.getBaseTemplate('Rendez-vous Terminé', content, firstName),
    });
    return result.success;
  }

  async sendProfileUpdatedEmail(
    email: string,
    firstName: string,
  ): Promise<boolean> {
    const content = this.generateProfileUpdatedContent({ firstName, email });
    const result = await this.sendEmail({
      to: email,
      subject: 'Votre profil a été mis à jour - Paname Consulting',
      html: this.getBaseTemplate('Profil Mis à Jour', content, firstName),
    });
    return result.success;
  }

  async sendPasswordReset(
    email: string,
    token: string,
    firstName: string = '',
  ): Promise<boolean> {
    const content = this.generateForgotPasswordContent(
      { firstName, email },
      token,
    );
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
    const content = this.generateWelcomeContent({ firstName, email });
    const result = await this.sendEmail({
      to: email,
      subject: `Bienvenue chez ${this.appName}`,
      html: this.getBaseTemplate('Bienvenue !', content, firstName),
    });
    return result.success;
  }

  async sendContactConfirmationEmail(
    email: string,
    firstName: string,
    lastName: string,
    message: string,
  ): Promise<boolean> {
    const content = this.generateContactConfirmationContent({
      firstName,
      lastName,
      message,
    });
    const result = await this.sendEmail({
      to: email,
      subject: 'Confirmation de réception de votre message - Paname Consulting',
      html: this.getBaseTemplate('Message Reçu', content, firstName),
    });
    return result.success;
  }

  async sendContactNotificationEmail(
    email: string,
    contact: {
      firstName: string;
      lastName: string;
      email: string;
      message: string;
      createdAt: Date;
    },
  ): Promise<boolean> {
    const content = this.generateContactNotificationContent(contact);
    const result = await this.sendEmail({
      to: email,
      subject: 'Nouveau message de contact - Paname Consulting',
      html: this.getBaseTemplate('Nouveau Message Contact', content, 'Équipe'),
    });
    return result.success;
  }

  async sendContactReplyEmail(
    email: string,
    firstName: string,
    lastName: string,
    response: string,
  ): Promise<boolean> {
    const content = this.generateContactReplyContent(
      { firstName, lastName },
      response,
    );
    const result = await this.sendEmail({
      to: email,
      subject: 'Réponse à Votre Message - Paname Consulting',
      html: this.getBaseTemplate('Réponse à Votre Message', content, firstName),
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
