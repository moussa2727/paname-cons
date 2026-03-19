import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RevokedToken } from '@prisma/client';

@Injectable()
export class RevokedTokenRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Ajoute un token à la liste de révocation
   */
  async revoke(data: {
    token: string;
    userId: string;
    expiresAt: Date;
    reason?: string;
  }): Promise<RevokedToken> {
    return this.prisma.revokedToken.create({
      data: {
        token: data.token,
        userId: data.userId,
        expiresAt: data.expiresAt,
        reason: data.reason,
      },
    });
  }

  /**
   * Vérifie si un token est révoqué
   */
  async isRevoked(token: string): Promise<boolean> {
    const count = await this.prisma.revokedToken.count({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
    });
    return count > 0;
  }

  /**
   * Trouve un token révoqué
   */
  async findByToken(token: string): Promise<RevokedToken | null> {
    return this.prisma.revokedToken.findUnique({
      where: { token },
    });
  }

  /**
   * Supprime un token de la liste de révocation (soft delete)
   */
  async remove(token: string): Promise<RevokedToken | null> {
    try {
      return await this.prisma.revokedToken.delete({
        where: { token },
      });
    } catch {
      return null;
    }
  }

  /**
   * Nettoie les tokens expirés
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.revokedToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }

  /**
   * Récupère tous les tokens révoqués d'un utilisateur
   */
  async findAllForUser(userId: string): Promise<RevokedToken[]> {
    return this.prisma.revokedToken.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Compte le nombre de tokens révoqués pour un utilisateur
   */
  async countForUser(userId: string): Promise<number> {
    return this.prisma.revokedToken.count({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
    });
  }

  /**
   * Supprime tous les tokens expirés d'un utilisateur
   */
  async cleanupExpiredForUser(userId: string): Promise<number> {
    const result = await this.prisma.revokedToken.deleteMany({
      where: {
        userId,
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }

  /**
   * Révoke tous les tokens d'un utilisateur
   */
  async revokeAllForUser(
    userId: string,
    tokens: string[],
    expiresAt: Date,
    reason?: string,
  ): Promise<number> {
    const data = tokens.map((token) => ({
      token,
      userId,
      expiresAt,
      reason,
    }));

    const result = await this.prisma.revokedToken.createMany({
      data,
      skipDuplicates: true,
    });
    return result.count;
  }
}
