import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { UpdateUserDto, UpdateProfileDto } from './dto/update-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersRepository } from './users.repository';
import { QueueService } from '../queue/queue.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/logger/audit.service';
import { AuditAction, Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  // Add this method to UsersService
  public toResponseDto(user: User): UserResponseDto {
    const responseDto = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      telephone: user.telephone, // ← Le téléphone est bien inclus
      role: user.role,
      isActive: user.isActive,
      canLogin:
        user.isActive && (!user.logoutUntil || new Date() >= user.logoutUntil),
      isTemporarilyLoggedOut: user.logoutUntil
        ? new Date() < user.logoutUntil
        : false,
      logoutUntil: user.logoutUntil,
      lastLogout: user.lastLogout,
      lastLogin: user.lastLogin,
      loginCount: user.loginCount,
      logoutCount: user.logoutCount,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return responseDto;
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.usersRepository.create(data);
  }
  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.usersRepository.findAll({ skip, take: limit }),
      this.usersRepository.count(),
    ]);

    return {
      data: users.map((user) => this.toResponseDto(user)),
      total,
      page,
      limit,
    };
  }

  async getStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    adminUsers: number;
    userUsers: number;
    recentlyCreated: number;
    recentlyActive: number;
  }> {
    // Implémentation des statistiques
    const allUsers = await this.usersRepository.findAll({ take: 1000 });
    const totalUsers = allUsers.length;

    const activeUsers = allUsers.filter((u) => u.isActive).length;
    const inactiveUsers = allUsers.filter((u) => !u.isActive).length;
    const adminUsers = allUsers.filter((u) => u.role === UserRole.ADMIN).length;
    const userUsers = allUsers.filter((u) => u.role === UserRole.USER).length;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentlyCreated = allUsers.filter(
      (u) => u.createdAt >= thirtyDaysAgo,
    ).length;
    const recentlyActive = allUsers.filter(
      (u) => u.updatedAt >= thirtyDaysAgo,
    ).length;

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      adminUsers,
      userUsers,
      recentlyCreated,
      recentlyActive,
    };
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findByIdWithPassword(
    userId: string,
    hashedPassword: string,
  ): Promise<void> {
    await this.usersRepository.updatePassword(userId, hashedPassword);
  }

  async findByTelephone(telephone: string): Promise<User | null> {
    return this.usersRepository.findByPhone(telephone);
  }

  // Dans users.service.ts - Amélioration de la méthode update
  async update(
    id: string,
    updateUserDto: UpdateUserDto | AdminUpdateUserDto | UpdateProfileDto,
  ): Promise<UserResponseDto> {
    // Vérifier si l'utilisateur existe
    const existingUser = await this.usersRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }

    // Vérifier les conflits d'email
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailConflict = await this.usersRepository.findByEmail(
        updateUserDto.email,
      );
      if (emailConflict && emailConflict.id !== existingUser.id) {
        throw new ConflictException(
          'Un utilisateur avec cet email existe déjà',
        );
      }
    }

    // Vérifier les conflits de téléphone avec une meilleure normalisation
    if (
      updateUserDto.telephone &&
      updateUserDto.telephone !== existingUser.telephone
    ) {
      // Normaliser le téléphone en supprimant tous les caractères non numériques sauf le +
      const normalizePhone = (phone: string) => {
        return phone.replace(/[^\d+]/g, '');
      };

      const normalizedNewPhone = normalizePhone(updateUserDto.telephone);
      const normalizedExistingPhone = existingUser.telephone
        ? normalizePhone(existingUser.telephone)
        : '';

      // Si le numéro normalisé est différent, vérifier les conflits
      if (normalizedNewPhone !== normalizedExistingPhone) {
        // Vérifier si ce numéro existe déjà pour un autre utilisateur
        const phoneConflict = await this.usersRepository.findByPhone(
          updateUserDto.telephone,
        );
        if (phoneConflict && phoneConflict.id !== existingUser.id) {
          throw new ConflictException(
            'Un utilisateur avec ce numéro de téléphone existe déjà',
          );
        }
      }
    }

    // EMPÊCHER LA MODIFICATION DE L'EMAIL ADMIN
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    if (
      existingUser.email === adminEmail &&
      updateUserDto.email &&
      updateUserDto.email !== adminEmail
    ) {
      throw new ForbiddenException(
        "L'email du compte administrateur principal ne peut pas être modifié",
      );
    }

    // Préparer les données de mise à jour
    const updateData: Record<string, any> = { ...updateUserDto };

    // Hasher le mot de passe si fourni
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(
        updateUserDto.password,
        parseInt(this.configService.get<string>('BCRYPT_ROUNDS') || '12'),
      );
    }

    // Nettoyer les champs undefined pour ne pas écraser avec des valeurs vides
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updatedUser = await this.usersRepository.update(id, updateData);

    // Si l'email a été changé, synchroniser les rendez-vous
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      await this.prisma.rendezvous.updateMany({
        where: { userId: id },
        data: { email: updateUserDto.email },
      });
    }

    // Envoyer un email de notification de mise à jour
    await this.queueService.addEmailJob({
      to: updatedUser.email,
      subject: 'Votre profil a été mis à jour',
      html: this.generateProfileUpdatedContent(updatedUser),
      priority: 'normal',
    });

    // Logger l'audit
    await this.auditService.logUserAction(id, AuditAction.UPDATE, {
      email: updatedUser.email,
      updatedFields: Object.keys(updateData),
    });

    return this.toResponseDto(updatedUser);
  }

  // Méthode spécifique pour le profil admin (utilisé par /admin/profile)
  async updateAdminProfile(
    id: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    // Convertir UpdateProfileDto vers UpdateUserDto
    const updateUserDto: UpdateUserDto = {
      firstName: updateProfileDto.firstName,
      lastName: updateProfileDto.lastName,
      telephone: updateProfileDto.telephone,
    };

    // Vérifier si l'utilisateur existe
    const existingUser = await this.usersRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }

    // Vérifier les conflits de téléphone (même logique que update normal)
    if (
      updateUserDto.telephone &&
      updateUserDto.telephone !== existingUser.telephone
    ) {
      // Normaliser le téléphone (supprimer espaces, points, tirets)
      const normalizedPhone = updateUserDto.telephone.replace(/[\s.-]/g, '');
      const normalizedExistingPhone =
        existingUser.telephone?.replace(/[\s.-]/g, '') || '';

      // Si le numéro normalisé est différent, vérifier les conflits
      if (normalizedPhone !== normalizedExistingPhone) {
        // Utiliser la méthode existante qui fait déjà la recherche flexible
        const phoneConflict =
          await this.usersRepository.findByPhone(normalizedPhone);
        if (phoneConflict && phoneConflict.id !== existingUser.id) {
          throw new ConflictException(
            'Un utilisateur avec ce numéro de téléphone existe déjà',
          );
        }
      }
    }

    // Hasher le mot de passe si fourni
    const updateData = { ...updateUserDto };
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(
        updateUserDto.password,
        parseInt(this.configService.get<string>('BCRYPT_ROUNDS') || '12'),
      );
    }

    const updatedUser = await this.usersRepository.update(id, updateData);

    // Envoyer un email de notification de mise à jour
    await this.queueService.addEmailJob({
      to: updatedUser.email,
      subject: 'Votre profil a été mis à jour',
      html: this.generateProfileUpdatedContent(updatedUser),
      priority: 'normal',
    });

    // Logger l'audit
    await this.auditService.logUserAction(id, AuditAction.UPDATE, {
      email: updatedUser.email,
    });

    return this.toResponseDto(updatedUser);
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(
      newPassword,
      parseInt(this.configService.get<string>('BCRYPT_ROUNDS') || '12'),
    );

    await this.usersRepository.update(userId, { password: hashedPassword });

    // Logger l'audit
    await this.auditService.logUserAction(userId, AuditAction.UPDATE, {
      action: 'PASSWORD_CHANGED',
    });
  }

  async remove(id: string, currentUserRole: UserRole): Promise<void> {
    // Vérifier si l'utilisateur existe
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }

    // Seul un admin peut supprimer un utilisateur
    if (currentUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Seul un administrateur peut supprimer un utilisateur',
      );
    }

    // Nettoyer les refresh tokens associés à l'utilisateur avant la suppression
    await this.prisma.refreshToken.deleteMany({
      where: { userId: id },
    });

    // Nettoyer les autres relations si nécessaire
    await this.prisma.session.deleteMany({
      where: { userId: id },
    });

    await this.prisma.resetToken.deleteMany({
      where: { userId: id },
    });

    await this.prisma.revokedToken.deleteMany({
      where: { userId: id },
    });

    await this.usersRepository.softDelete(id);

    // Logger l'audit
    await this.auditService.logUserAction(id, AuditAction.DELETE, {
      email: user.email,
    });
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateUserStatusDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Interdire de désactiver le compte admin principal
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    if (updateStatusDto.isActive === false && user.email === adminEmail) {
      throw new ForbiddenException(
        'Impossible de désactiver le compte administrateur principal',
      );
    }

    // Interdire de désactiver son propre compte
    if (updateStatusDto.isActive === false && user.isDeleted) {
      throw new ForbiddenException(
        'Impossible de désactiver un compte supprimé',
      );
    }

    const updatedUser = await this.usersRepository.update(id, {
      isActive: updateStatusDto.isActive,
      logoutUntil: updateStatusDto.logoutUntil
        ? new Date(updateStatusDto.logoutUntil)
        : null,
    });

    // Logger l'audit
    await this.auditService.logUserAction(id, AuditAction.UPDATE, {
      email: updatedUser.email,
      action: updateStatusDto.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      reason: updateStatusDto.reason,
    });

    return this.toResponseDto(updatedUser);
  }

  // ==================== UTILITAIRES ====================

  private generateProfileUpdatedContent(user: {
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
          <a href="https://panameconsulting.com/dashboard" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Voir mon profil</a>
        </div>
        <p style="margin-top:30px;">Cordialement,<br><strong>Paname Consulting</strong></p>
      </div>`;
  }
}
