import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  private maskSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const masked = { ...data } as Record<string, any>;
    const sensitiveFields = [
      'email',
      'password',
      'firstName',
      'lastName',
      'prenom',
      'nom',
      'telephone',
    ];

    sensitiveFields.forEach((field) => {
      if (masked[field]) {
        const value = String(masked[field]);
        if (field === 'email') {
          // Masquer email: user***@domain.com
          const [local, domain] = value.split('@');
          masked[field] = `${local.substring(0, 3)}***@${domain}`;
        } else if (field === 'password') {
          // Masquer mot de passe complètement
          masked[field] = '***MASKED***';
        } else if (field === 'telephone') {
          // Masquer téléphone: +33 *** ** ** **
          masked[field] = value.replace(
            /(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
            '$1 *** ** ** **',
          );
        } else {
          // Masquer noms/prénoms: pre*** nom***
          masked[field] = value.substring(0, 3) + '***';
        }
      }
    });

    return masked;
  }

  async logUserAction(
    userId: string,
    action: AuditAction,
    metadata: Record<string, any>,
  ) {
    const maskedMetadata = this.maskSensitiveData(
      metadata as Record<string, unknown>,
    ) as Record<string, any>;

    return this.prisma.auditLog.create({
      data: {
        user: {
          connect: { id: userId },
        },
        action,
        entity: 'USER',
        metadata: maskedMetadata,
      },
    });
  }
}
