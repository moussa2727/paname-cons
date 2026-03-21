import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, UserRole, User } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.user.findMany({
      skip,
      take,
      cursor,
      where: {
        ...where,
        isDeleted: false,
      },
      orderBy,
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });
  }

  async findByIdWithPassword(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });
  }

  async findByRole(role: UserRole): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        role,
        isDeleted: false,
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    console.log('[UsersRepository.findByEmail] Recherche email:', {
      searchEmail: email,
    });

    const result = await this.prisma.user.findFirst({
      where: {
        email,
        isDeleted: false,
        isActive: true, // <-- IMPORTANT : Ignorer les utilisateurs désactivés
      },
    });

    console.log('[UsersRepository.findByEmail] Résultat:', {
      found: !!result,
      resultUser: result
        ? {
            id: result.id,
            email: result.email,
            telephone: result.telephone,
            isActive: result.isActive,
            isDeleted: result.isDeleted,
          }
        : null,
    });

    return result;
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        isDeleted: false,
      },
    });
  }

  async findByPhone(telephone: string): Promise<User | null> {
    // Normalisation IDENTIQUE au service users pour éviter les conflits
    const normalizePhone = (phone: string): string => {
      if (!phone) return '';

      // Normalisation IDENTIQUE au service et frontend : supprimer espaces, points, tirets
      let cleaned = phone.replace(/[\s.-]/g, '');

      // Si le numéro commence par 0 (format français), ajouter +33
      if (cleaned.startsWith('0') && cleaned.length >= 9) {
        cleaned = '+33' + cleaned.substring(1);
      }
      // Si le numéro n'a pas de + et commence par un autre chiffre, ajouter +
      else if (!cleaned.startsWith('+') && cleaned.length > 0) {
        cleaned = '+' + cleaned;
      }

      return cleaned;
    };

    const normalizedPhone = normalizePhone(telephone);

    // Logging pour diagnostiquer les conflits
    const searchVariations = [
      normalizedPhone,
      telephone,
      normalizedPhone.startsWith('+') ? normalizedPhone.substring(1) : null,
    ].filter((term) => term !== null);

    console.log('[UsersRepository.findByPhone] Recherche téléphone:', {
      inputPhone: telephone,
      normalizedPhone,
      searchVariations,
    });

    // Rechercher avec toutes les variations
    const users = await this.prisma.user.findMany({
      where: {
        telephone: { in: searchVariations },
        isDeleted: false,
        isActive: true, // <-- IMPORTANT : Ignorer les utilisateurs désactivés
      },
      take: 1,
    });

    const result = users.length > 0 ? users[0] : null;
    return result;
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async softDelete(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  async hardDelete(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async count(where?: Prisma.UserWhereInput): Promise<number> {
    return this.prisma.user.count({
      where: {
        ...where,
        isDeleted: false,
      },
    });
  }

  async incrementLoginCount(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        loginCount: { increment: 1 },
      },
    });
  }

  async decrementLoginCount(id: string): Promise<void> {
    // Récupérer l'utilisateur actuel pour vérifier le loginCount
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { loginCount: true },
    });

    if (!user) {
      throw new Error(`Utilisateur avec l'ID ${id} non trouvé`);
    }

    // Ne pas décrémenter si le compteur est déjà à 0
    if (user.loginCount > 0) {
      await this.prisma.user.update({
        where: { id },
        data: {
          loginCount: {
            decrement: 1,
          },
        },
      });
    }
  }

  async incrementLogoutCount(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        logoutCount: { increment: 1 },
      },
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        lastLogin: new Date(),
      },
    });
  }

  async updateLastLogout(id: string, reason?: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        lastLogout: new Date(),
        logoutReason: reason,
        logoutTransaction: `logout_${Date.now()}`,
      },
    });
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });
  }

  async countNewUsersSince(date: Date): Promise<number> {
    return this.prisma.user.count({
      where: {
        createdAt: { gte: date },
        isDeleted: false,
      },
    });
  }

  async findAdmins(): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        role: UserRole.ADMIN,
        isDeleted: false,
      },
    });
  }

  async findActiveSessionsCount(userId: string): Promise<number> {
    return this.prisma.session.count({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async bulkUpdateStatus(
    userIds: string[],
    isActive: boolean,
  ): Promise<number> {
    const result = await this.prisma.user.updateMany({
      where: {
        id: { in: userIds },
        isDeleted: false,
      },
      data: {
        isActive,
        updatedAt: new Date(),
      },
    });
    return result.count;
  }

  async search(query: string, limit: number = 10): Promise<User[]> {
    // Normalisation IDENTIQUE au service pour la recherche de téléphone
    const normalizePhone = (phone: string): string => {
      if (!phone) return '';

      // Normalisation IDENTIQUE au service et frontend : supprimer espaces, points, tirets
      let cleaned = phone.replace(/[\s.-]/g, '');

      // Si le numéro commence par 0 (format français), ajouter +33
      if (cleaned.startsWith('0') && cleaned.length >= 9) {
        cleaned = '+33' + cleaned.substring(1);
      }
      // Si le numéro n'a pas de + et commence par un autre chiffre, ajouter +
      else if (!cleaned.startsWith('+') && cleaned.length > 0) {
        cleaned = '+' + cleaned;
      }

      return cleaned;
    };

    const normalizedQuery = normalizePhone(query);

    return this.prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { telephone: { contains: normalizedQuery } },
          { telephone: { contains: query } },
        ],
        isDeleted: false,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}
