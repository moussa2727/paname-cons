import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Session, RevocationReason } from '@prisma/client';
import { AuthConstants } from '../common/constants/auth.constants';

@Injectable()
export class SessionRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    userId: string;
    token: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<Session> {
    return this.prisma.session.create({
      data: {
        userId: data.userId,
        token: data.token,
        expiresAt: data.expiresAt,
        isActive: true,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        lastActivity: new Date(),
      },
    });
  }

  async findActiveSession(token: string): Promise<Session | null> {
    return this.prisma.session.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async findByUserId(userId: string): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivity: 'desc' },
    });
  }

  async deactivate(id: string, reason?: RevocationReason): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        revocationReason: reason,
      },
    });
  }

  async deactivateAllForUser(
    userId: string,
    reason?: RevocationReason,
  ): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        revocationReason: reason,
      },
    });
    return result.count;
  }

  async updateLastActivity(id: string): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: {
        lastActivity: new Date(),
      },
    });
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        isActive: true,
      },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        revocationReason: AuthConstants.REVOCATION_REASONS
          .SESSION_EXPIRED as RevocationReason,
      },
    });
    return result.count;
  }

  async cleanupInactiveSessions(inactivityLimit: Date): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: {
        lastActivity: { lt: inactivityLimit },
        isActive: true,
      },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        revocationReason: AuthConstants.REVOCATION_REASONS
          .INACTIVITY as RevocationReason,
      },
    });
    return result.count;
  }

  async countActiveForUser(userId: string): Promise<number> {
    return this.prisma.session.count({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
  }
}
