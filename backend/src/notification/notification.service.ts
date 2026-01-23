import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmtpService } from '../config/smtp.service';
import { Rendezvous } from '../schemas/rendezvous.schema';
import { Procedure, ProcedureStatus, StepStatus } from '../schemas/procedure.schema';
import { Contact } from '../schemas/contact.schema';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly appName: string = 'Paname Consulting';
  private readonly frontendUrl: string;

  constructor(
    private readonly smtpService: SmtpService,
    private readonly configService: ConfigService
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL');
  }


  private async sendEmail(
    to: string, 
    subject: string, 
    html: string, 
    context: string
  ): Promise<boolean> {
    if (!this.smtpService.getStatus()) {
      this.logger.warn(`"${context}" ignorée - service indisponible`);
      return false;
    }

    try {
      const result = await this.smtpService.sendEmail({
        to,
        subject,
        html
      });
      
      if (result.success) {
        this.logger.log(`Notification envoyée (${context})`);
      } else {
        this.logger.error(`Échec envoi notification (${context}): ${result.error || 'Erreur inconnue'}`);
      }
      
      return result.success;
    } catch (error: any) {
      this.logger.error(`Erreur "${context}": ${error.message}`);
      return false;
    }
  }

  private getBaseTemplate(header: string, content: string, firstName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${this.appName} - ${header}</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background-color: #f9fafb;
          }
          .container {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            border: 1px solid #e5e7eb;
          }
          .header { 
            background: linear-gradient(135deg, #0ea5e9, #0284c7); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
          }
          .header p {
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.95;
          }
          .content { 
            padding: 40px 30px; 
          }
          .footer { 
            text-align: center; 
            margin-top: 40px; 
            padding-top: 25px; 
            border-top: 1px solid #e5e7eb; 
            color: #6b7280; 
            font-size: 13px; 
          }
          .info-box { 
            background: #f8fafc; 
            padding: 25px; 
            border-radius: 8px; 
            border-left: 4px solid #0ea5e9; 
            margin: 25px 0; 
          }
          .button { 
            display: inline-block; 
            padding: 14px 28px; 
            background: linear-gradient(135deg, #0ea5e9, #0284c7);
            color: white; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: 600;
            font-size: 15px;
            transition: all 0.2s ease;
          }
          .website-link { 
            color: #0284c7; 
            text-decoration: none; 
            font-weight: 500;
          }
          .greeting {
            font-size: 16px;
            margin-bottom: 25px;
          }
          .details {
            margin: 25px 0;
            line-height: 1.8;
          }
          .detail-item {
            margin-bottom: 10px;
          }
          .detail-label {
            font-weight: 600;
            color: #374151;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${this.appName}</h1>
            <p>${header}</p>
          </div>
          <div class="content">
            <p class="greeting">Bonjour <strong>${firstName}</strong>,</p>
            ${content}
            <div class="footer">
              <p>Cordialement,<br><strong>L'équipe ${this.appName}</strong></p>
              <p style="margin-top: 15px;">
                <a href="${this.frontendUrl}" class="website-link">${this.frontendUrl.replace('https://', '')}</a>
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // ==================== RENDEZ-VOUS NOTIFICATIONS ====================

  async sendConfirmation(rendezvous: Rendezvous): Promise<boolean> {
    const dateFormatted = new Date(rendezvous.date).toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const content = `
      <div class="details">
        <p>Votre rendez-vous a été confirmé avec succès.</p>
        
        <div class="info-box">
          <h3 style="margin-top: 0; color: #0ea5e9;">Détails du rendez-vous</h3>
          <div class="detail-item">
            <span class="detail-label">Date :</span> ${dateFormatted}
          </div>
          <div class="detail-item">
            <span class="detail-label">Heure :</span> ${rendezvous.time}
          </div>
          <div class="detail-item">
            <span class="detail-label">Lieu :</span> ${this.appName} - Kalaban Coura
          </div>
          <div class="detail-item">
            <span class="detail-label">Statut :</span> <span style="color: #10b981; font-weight: 600;">Confirmé</span>
          </div>
        </div>
        
        <p>Nous vous attendons avec impatience.</p>
      </div>
    `;

    return await this.sendEmail(
      rendezvous.email,
      "Confirmation de votre rendez-vous - Paname Consulting",
      this.getBaseTemplate("Rendez-vous Confirmé", content, rendezvous.firstName),
      "confirmation-rendezvous"
    );
  }

  async sendReminder(rendezvous: Rendezvous): Promise<boolean> {
    const content = `
      <div class="details">
        <p>Rappel : Vous avez un rendez-vous aujourd'hui.</p>
        
        <div class="info-box">
          <h3 style="margin-top: 0; color: #0ea5e9;">Votre rendez-vous aujourd'hui</h3>
          <div class="detail-item">
            <span class="detail-label">Heure :</span> ${rendezvous.time}
          </div>
          <div class="detail-item">
            <span class="detail-label">Lieu :</span> ${this.appName} - Kalaban Coura
          </div>
        </div>
        
        <p>Nous sommes impatients de vous rencontrer.</p>
      </div>
    `;

    return await this.sendEmail(
      rendezvous.email,
      "Rappel - Rendez-vous aujourd'hui - Paname Consulting",
      this.getBaseTemplate("Rappel de Rendez-vous", content, rendezvous.firstName),
      "rappel-rendezvous"
    );
  }

  async sendStatusUpdate(rendezvous: Rendezvous): Promise<boolean> {
    let content = "";
    let subject = "";
    let header = "Mise à jour de Rendez-vous";

    switch (rendezvous.status) {
      case "Confirmé":
        subject = "Rendez-vous Confirmé - Paname Consulting";
        content = `
          <div class="details">
            <p>Votre rendez-vous a été confirmé.</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #0ea5e9;">Rendez-vous confirmé</h3>
              <div class="detail-item">
                <span class="detail-label">Date :</span> ${new Date(rendezvous.date).toLocaleDateString("fr-FR")}
              </div>
              <div class="detail-item">
                <span class="detail-label">Heure :</span> ${rendezvous.time}
              </div>
            </div>
          </div>
        `;
        break;

      case "Annulé":
        subject = "Rendez-vous Annulé - Paname Consulting";
        header = "Rendez-vous Annulé";
        const cancelledBy = rendezvous.cancelledBy === 'admin' ? 'par notre équipe' : 'à votre demande';
        content = `
          <div class="details">
            <p>Votre rendez-vous a été annulé ${cancelledBy}.</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #0ea5e9;">Rendez-vous annulé</h3>
              <div class="detail-item">
                <span class="detail-label">Date prévue :</span> ${new Date(rendezvous.date).toLocaleDateString("fr-FR")}
              </div>
              <div class="detail-item">
                <span class="detail-label">Heure prévue :</span> ${rendezvous.time}
              </div>
              ${rendezvous.cancellationReason ? `
                <div class="detail-item">
                  <span class="detail-label">Raison :</span> ${rendezvous.cancellationReason}
                </div>
              ` : ""}
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${this.frontendUrl}" class="button">Reprogrammer un rendez-vous</a>
            </div>
          </div>
        `;
        break;

      case "Terminé":
        header = "Rendez-vous Terminé";
        if (rendezvous.avisAdmin === "Favorable") {
          subject = "Rendez-vous Terminé - Avis Favorable - Paname Consulting";
          content = `
            <div class="details">
              <p>Votre rendez-vous s'est déroulé avec succès.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #10b981;">Avis favorable</h3>
                <p>Votre dossier a reçu un avis favorable.</p>
                <p>Votre procédure d'admission a été lancée.</p>
              </div>
              
              <p>Félicitations pour cette première étape réussie.</p>
            </div>
          `;
        } else if (rendezvous.avisAdmin === "Défavorable") {
          subject = "Rendez-vous Terminé - Paname Consulting";
          content = `
            <div class="details">
              <p>Votre rendez-vous est maintenant terminé.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #ef4444;">Compte rendu</h3>
                <p>Votre dossier n'a pas reçu un avis favorable pour le programme envisagé.</p>
              </div>
              
              <p>Notre équipe reste à votre disposition pour étudier d'autres alternatives.</p>
            </div>
          `;
        }
        break;

      case "En attente":
        subject = "Statut Modifié - En Attente - Paname Consulting";
        header = "Rendez-vous en Attente";
        content = `
          <div class="details">
            <p>Votre demande de rendez-vous est en attente de confirmation.</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #f59e0b;">En attente de confirmation</h3>
              <p>Nous traiterons votre demande dans les meilleurs délais.</p>
            </div>
          </div>
        `;
        break;
    }

    if (content && subject) {
      return await this.sendEmail(
        rendezvous.email,
        subject,
        this.getBaseTemplate(header, content, rendezvous.firstName),
        `mise-à-jour-statut:${rendezvous.status}`
      );
    }

    return false;
  }

  // ==================== PROCEDURE NOTIFICATIONS ====================

  async sendProcedureUpdate(procedure: Procedure): Promise<boolean> {
    const currentStep = procedure.steps.find(s => s.statut === StepStatus.IN_PROGRESS);
    const completedSteps = procedure.steps.filter(s => s.statut === StepStatus.COMPLETED).length;
    const totalSteps = procedure.steps.length;
    const progress = Math.round((completedSteps / totalSteps) * 100);

    let content = "";
    let header = "Mise à jour de Procédure";
    let subject = "Mise à jour de votre procédure - Paname Consulting";

    if (currentStep) {
      content = `
        <div class="details">
          <p>Votre procédure d'admission avance.</p>
          
          <div class="info-box">
            <h3 style="margin-top: 0; color: #0ea5e9;">Avancement</h3>
            <div class="detail-item">
              <span class="detail-label">Progression :</span> 
              <div style="background: #e5e7eb; height: 8px; border-radius: 4px; margin: 5px 0; width: 100%; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #0ea5e9, #0284c7); height: 100%; width: ${progress}%;"></div>
              </div>
              <span style="font-weight: 600;">${progress}%</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Étape en cours :</span> ${currentStep.nom}
            </div>
            <div class="detail-item">
              <span class="detail-label">Statut :</span> ${procedure.statut}
            </div>
            <div class="detail-item">
              <span class="detail-label">Destination :</span> ${procedure.destination}
            </div>
          </div>
          
          <p>Notre équipe travaille activement sur votre dossier.</p>
        </div>
      `;
    } else if (procedure.statut === ProcedureStatus.COMPLETED) {
      subject = "Procédure Terminée - Paname Consulting";
      header = "Procédure Finalisée";
      content = `
        <div class="details">
          <p>Votre procédure d'admission est maintenant terminée avec succès.</p>
          
          <div class="info-box">
            <h3 style="margin-top: 0; color: #10b981;">Procédure finalisée</h3>
            <div class="detail-item">
              <span class="detail-label">Statut :</span> <span style="color: #10b981; font-weight: 600;">${procedure.statut}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Destination :</span> ${procedure.destination}
            </div>
            <div class="detail-item">
              <span class="detail-label">Filière :</span> ${procedure.filiere}
            </div>
          </div>
          
          <p>Félicitations ! Vous avez franchi toutes les étapes nécessaires.</p>
        </div>
      `;
    } else if (procedure.statut === ProcedureStatus.REJECTED) {
      subject = "Procédure Rejetée - Paname Consulting";
      header = "Procédure Rejetée";
      content = `
        <div class="details">
          <p>Votre procédure d'admission a été rejetée.</p>
          
          <div class="info-box">
            <h3 style="margin-top: 0; color: #ef4444;">Décision</h3>
            <div class="detail-item">
              <span class="detail-label">Statut :</span> <span style="color: #ef4444; font-weight: 600;">${procedure.statut}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Destination :</span> ${procedure.destination}
            </div>
            ${procedure.raisonRejet ? `
              <div class="detail-item">
                <span class="detail-label">Raison :</span> ${procedure.raisonRejet}
              </div>
            ` : ""}
          </div>
          
          <p>Notre équipe reste à votre disposition pour discuter des alternatives.</p>
        </div>
      `;
    }

    if (content) {
      return await this.sendEmail(
        procedure.email,
        subject,
        this.getBaseTemplate(header, content, procedure.prenom),
        `mise-à-jour-procedure:${procedure.statut}`
      );
    }

    return false;
  }

  async sendProcedureCreation(
    procedure: Procedure,
    rendezvous: Rendezvous
  ): Promise<boolean> {
    const content = `
      <div class="details">
        <p>Suite à l'avis favorable de votre rendez-vous, votre procédure d'admission a été lancée.</p>
        
        <div class="info-box">
          <h3 style="margin-top: 0; color: #10b981;">Votre procédure est lancée</h3>
          <div class="detail-item">
            <span class="detail-label">Destination :</span> ${procedure.destination}
          </div>
          <div class="detail-item">
            <span class="detail-label">Filière :</span> ${procedure.filiere}
          </div>
          <div class="detail-item">
            <span class="detail-label">Date du rendez-vous :</span> ${new Date(rendezvous.date).toLocaleDateString("fr-FR")}
          </div>
        </div>
        
        <p>Notre équipe va désormais vous accompagner pas à pas.</p>
      </div>
    `;

    return await this.sendEmail(
      procedure.email,
      "Votre procédure est lancée - Paname Consulting",
      this.getBaseTemplate("Procédure Créée", content, procedure.prenom),
      "création-procédure"
    );
  }

  async sendCancellationNotification(procedure: Procedure): Promise<boolean> {
    const content = `
      <div class="details">
        <p>Votre procédure d'admission a été annulée.</p>
        
        <div class="info-box">
          <h3 style="margin-top: 0; color: #ef4444;">Annulation</h3>
          <div class="detail-item">
            <span class="detail-label">Destination :</span> ${procedure.destination}
          </div>
          ${procedure.deletionReason ? `
            <div class="detail-item">
              <span class="detail-label">Raison :</span> ${procedure.deletionReason}
            </div>
          ` : ""}
        </div>
        
        <p>Notre équipe reste à votre disposition pour toute question.</p>
      </div>
    `;

    return await this.sendEmail(
      procedure.email,
      "Annulation de votre procédure - Paname Consulting",
      this.getBaseTemplate("Procédure Annulée", content, procedure.prenom),
      "annulation-procédure"
    );
  }

  // ==================== CONTACT NOTIFICATIONS ====================

  async sendContactReply(contact: Contact, reply: string): Promise<boolean> {
    const content = `
      <div class="details">
        <p>Nous vous répondons à votre message :</p>
        
        <div class="info-box">
          <div style="white-space: pre-line; line-height: 1.7;">${reply}</div>
        </div>
        
        <p>Nous espérons que cette réponse correspond à vos attentes.</p>
      </div>
    `;

    return await this.sendEmail(
      contact.email,
      "Réponse à votre message - Paname Consulting",
      this.getBaseTemplate("Réponse de notre équipe", content, contact.firstName || "Cher client"),
      "réponse-contact"
    );
  }

  async sendContactNotification(contact: Contact): Promise<boolean> {
    const adminEmail = this.configService.get<string>('EMAIL_USER');
    if (!adminEmail) {
      this.logger.warn("Email admin non configuré");
      return false;
    }

    const content = `
      <div class="details">
        <p>Nouveau message de contact reçu :</p>
        
        <div class="info-box">
          <h3 style="margin-top: 0; color: #0ea5e9;">Informations</h3>
          <div class="detail-item">
            <span class="detail-label">Nom :</span> ${contact.firstName} ${contact.lastName}
          </div>
          <div class="detail-item">
            <span class="detail-label">Email :</span> ${contact.email}
          </div>
          <div class="detail-item">
            <span class="detail-label">Date :</span> ${new Date().toLocaleString("fr-FR")}
          </div>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
          <h4 style="margin-top: 0; color: #8b5cf6;">Message :</h4>
          <div style="white-space: pre-line; line-height: 1.7;">${contact.message}</div>
        </div>
        
        <p>Pour répondre : Répondre directement à cet email.</p>
      </div>
    `;

    // Envoyer à l'admin avec le from dynamique de l'utilisateur
    const result = await this.smtpService.sendEmail({
      to: adminEmail, // Toujours envoyer à EMAIL_USER
      subject: 'Nouveau message de contact - Paname Consulting',
      html: this.getBaseTemplate("Nouveau Message Contact", content, "Équipe"),
      replyTo: contact.email, // Pour répondre à l'utilisateur
    });
    
    return result.success;
  }

  async sendContactConfirmation(contact: Contact): Promise<boolean> {
    const content = `
      <div class="details">
        <p>Nous accusons réception de votre message.</p>
        
        <div class="info-box">
          <p>Votre demande a bien été enregistrée et sera traitée dans les plus brefs délais.</p>
          <div class="detail-item">
            <span class="detail-label">Délai de réponse :</span> 48 heures ouvrables maximum
          </div>
        </div>
        
        <p>Un membre de notre équipe vous contactera rapidement.</p>
      </div>
    `;

    return await this.sendEmail(
      contact.email,
      'Confirmation de votre message - Paname Consulting',
      this.getBaseTemplate("Confirmation de Réception", content, contact.firstName || "Cher client"),
      'confirmation-contact'
    );
  }

  // ==================== UTILITY METHODS ====================

  getEmailStatus(): { available: boolean; message: string } {
    return this.smtpService.getStatus();
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    return await this.smtpService.testConnection();
  }
}