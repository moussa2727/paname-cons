/**
 * Utilitaire pour masquer les données sensibles dans les logs
 */

export class LoggerSanitizer {
  /**
   * Masque une adresse email
   */
  static maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;

    const [localPart, domain] = email.split('@');
    if (!domain) return email;

    // Garder les 3 premiers caractères du local-part
    const visibleChars = Math.min(3, localPart.length);
    const maskedLocal = localPart.substring(0, visibleChars) + '***';

    return `${maskedLocal}@${domain}`;
  }
  /**
   * Masque un nom ou prénom
   */
  static maskName(name: string): string {
    if (!name) return 'inconnu';
    if (name.length <= 2) return name[0] + '*';

    return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
  }

  /**
   * Masque un ID (garder les 4 premiers et 2 derniers caractères)
   */
  static maskId(id: string): string {
    if (!id) return 'id_inconnu';
    if (id.length <= 6) return id.substring(0, 2) + '*'.repeat(id.length - 2);

    return (
      id.substring(0, 4) +
      '*'.repeat(id.length - 6) +
      id.substring(id.length - 2)
    );
  }

  /**
   * Masque un message (garder les 10 premiers et 10 derniers caractères)
   */
  static maskMessage(message: string): string {
    if (!message) return 'message_vide';
    if (message.length <= 20)
      return message.substring(0, 5) + '*'.repeat(message.length - 5);

    return (
      message.substring(0, 10) + '...' + message.substring(message.length - 10)
    );
  }

  /**
   * Masque un numéro de téléphone
   */
  static maskPhone(phone: string): string {
    if (!phone) return 'telephone_inconnu';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length <= 4)
      return cleaned.substring(0, 2) + '*'.repeat(cleaned.length - 2);

    return (
      cleaned.substring(0, 2) +
      '*'.repeat(cleaned.length - 4) +
      cleaned.substring(cleaned.length - 2)
    );
  }

  /**
   * Masque les données sensibles dans un objet
   */
  static sanitizeObject(
    obj: Record<string, unknown>,
    sensitiveFields: string[] = [],
  ): Record<string, unknown> {
    if (!obj || typeof obj !== 'object') return obj;

    const sensitive = [
      'email',
      'firstName',
      'lastName',
      'prenom',
      'nom',
      'name',
      'message',
      'password',
      'token',
      'access_token',
      'refresh_token',
      'reset_token',
      'id',
      'userId',
      'contactId',
      'procedureId',
      'rendezvousId',
      'phone',
      'telephone',
      ...sensitiveFields,
    ];

    const sanitized: Record<string, unknown> = { ...obj };

    for (const field of sensitive) {
      if (sanitized[field]) {
        switch (field) {
          case 'email':
            sanitized[field] = this.maskEmail(sanitized[field] as string);
            break;
          case 'firstName':
          case 'lastName':
          case 'prenom':
          case 'nom':
          case 'name':
            sanitized[field] = this.maskName(sanitized[field] as string);
            break;
          case 'message':
            sanitized[field] = this.maskMessage(sanitized[field] as string);
            break;
          case 'phone':
          case 'telephone':
            sanitized[field] = this.maskPhone(sanitized[field] as string);
            break;
          case 'id':
          case 'userId':
          case 'contactId':
          case 'procedureId':
          case 'rendezvousId':
            sanitized[field] = this.maskId(sanitized[field] as string);
            break;
          default:
            // Pour les tokens, passwords, etc.
            sanitized[field] = '***';
            break;
        }
      }
    }

    return sanitized;
  }

  /**
   * Crée un log sécurisé pour les données d'email
   */
  static sanitizeEmailLog(data: Record<string, unknown>): string {
    const sanitized = this.sanitizeObject(data);
    const recipientCount = Array.isArray(data.to)
      ? (data.to as unknown[]).length
      : 1;
    const recipientDomain = Array.isArray(data.to)
      ? ((data.to as unknown[])[0] as string)?.split('@')[1]
      : (data.to as string)?.split('@')[1];

    return `Email: ${sanitized.subject as string} -> ${recipientCount} destinataire(s) (domaine: ${recipientDomain || 'inconnu'})`;
  }

  /**
   * Crée un log sécurisé pour les données de contact
   */
  static sanitizeContactLog(data: Record<string, unknown>): string {
    const sanitized = this.sanitizeObject(data);
    const displayName =
      `${(sanitized.firstName as string) || ''} ${(sanitized.lastName as string) || ''}`.trim() ||
      'Anonyme';
    const emailDomain = (data.email as string)?.split('@')[1] || 'domain.com';
    const messageLength = (data.message as string)?.length || 0;

    return `Contact: ${displayName} (${emailDomain}) - Message: ${messageLength} caractères`;
  }
}
