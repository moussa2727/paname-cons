import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResetToken } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ResetTokenRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Crée un nouveau token de réinitialisation
   */
  async create(data: { userId: string; expiresIn?: number }) {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + (data.expiresIn || 60 * 60 * 1000));

    await this.invalidateAllForUser(data.userId);
    return this.prisma.resetToken.create({
      data: { token, userId: data.userId, expiresAt },
    });
  }

  /**
   * Trouve un token valide
   */
  async findValidToken(token: string): Promise<ResetToken | null> {
    return this.prisma.resetToken.findFirst({
      where: {
        token,
        used: false,
        expiresAt: { gt: new Date() },
        status: 'PENDING',
      },
    });
  }

  /**
   * Trouve un token par sa valeur
   */
  async findByToken(token: string): Promise<ResetToken | null> {
    return this.prisma.resetToken.findUnique({
      where: { token },
    });
  }

  /**
   * Marque un token comme utilisé
   */
  async markAsUsed(id: string): Promise<ResetToken> {
    return this.prisma.resetToken.update({
      where: { id },
      data: {
        used: true,
        status: 'USED',
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Invalide tous les tokens d'un utilisateur
   */
  async invalidateAllForUser(userId: string): Promise<number> {
    const result = await this.prisma.resetToken.updateMany({
      where: {
        userId,
        used: false,
        expiresAt: { gt: new Date() },
      },
      data: {
        used: true,
        status: 'EXPIRED',
        updatedAt: new Date(),
      },
    });
    return result.count;
  }

  /**
   * Nettoie les tokens expirés
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.resetToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { used: true }],
      },
    });
    return result.count;
  }

  /**
   * Vérifie si un token est valide
   */
  async isValid(token: string): Promise<boolean> {
    const count = await this.prisma.resetToken.count({
      where: {
        token,
        used: false,
        expiresAt: { gt: new Date() },
        status: 'PENDING',
      },
    });
    return count > 0;
  }

  /**
   * Récupère l'utilisateur associé à un token
   */
  async getUserByToken(token: string): Promise<string | null> {
    const resetToken = await this.prisma.resetToken.findUnique({
      where: { token },
      select: { userId: true },
    });
    return resetToken?.userId || null;
  }
}
