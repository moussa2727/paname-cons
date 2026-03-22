import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { User, UserRole, AuditAction, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateProfileDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersRepository } from './users.repository';
import { QueueService } from '../queue/queue.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/logger/audit.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  // ==================== HASHAGE (point unique) ====================

  /**
   * Seule méthode de hashage de l'application.
   * Appelée par createWithHashedPassword(), update(), updateAdminProfile(), updatePassword().
   */
  private async hashPassword(plainPassword: string): Promise<string> {
    const rounds = parseInt(
      this.configService.get<string>('BCRYPT_ROUNDS') ?? '12',
      10,
    );
    return bcrypt.hash(plainPassword, rounds);
  }

  // ==================== MAPPING ====================

  public toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      telephone: user.telephone,
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
  }

  // ==================== CRÉATION ====================

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.usersRepository.create(data);
  }

  /**
   * Crée un utilisateur en hashant son mot de passe ici.
   * Appelé par AuthService.register() et UsersController (création admin).
   * Le mot de passe brut arrive depuis le DTO — le hash est produit dans cette méthode.
   */
  async createWithHashedPassword(
    data: Omit<Prisma.UserCreateInput, 'password'> & { password: string },
  ): Promise<User> {
    const hashedPassword = await this.hashPassword(data.password);
    return this.usersRepository.create({ ...data, password: hashedPassword });
  }

  // ==================== LECTURE ====================

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

  async findByTelephone(telephone: string): Promise<User | null> {
    return this.usersRepository.findByPhone(telephone);
  }

  // ==================== MISE À JOUR ====================

  /**
   * Met à jour le profil d'un utilisateur avec rôle USER.
   *
   * ✅ Champs autorisés : firstName, lastName, email, telephone, password.
   * ❌ Interdit aux ADMIN — ils doivent utiliser updateAdminProfile().
   *
   * @param id         ID de l'utilisateur à mettre à jour
   * @param dto        Données envoyées par le client (UpdateUserDto)
   * @param callerRole Rôle de l'utilisateur effectuant la requête
   */
  async update(
    id: string,
    dto: UpdateUserDto,
    callerRole: UserRole,
  ): Promise<UserResponseDto> {
    // Un ADMIN ne passe jamais par ici — il a sa propre route/méthode
    if (callerRole === UserRole.ADMIN) {
      throw new ForbiddenException(
        'Un administrateur doit utiliser PATCH /admin/profile. ' +
          "L'email et le téléphone d'un administrateur ne peuvent pas être modifiés.",
      );
    }

    const existingUser = await this.usersRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }

    // Conflit email
    if (dto.email && dto.email !== existingUser.email) {
      const emailConflict = await this.usersRepository.findByEmail(dto.email);
      if (emailConflict && emailConflict.id !== existingUser.id) {
        throw new ConflictException(
          'Un utilisateur avec cet email existe déjà',
        );
      }
    }

    // Conflit téléphone
    if (dto.telephone && dto.telephone !== existingUser.telephone) {
      const phoneConflict = await this.usersRepository.findByPhone(
        dto.telephone,
      );
      if (phoneConflict && phoneConflict.id !== existingUser.id) {
        throw new ConflictException(
          'Un utilisateur avec ce numéro de téléphone existe déjà',
        );
      }
    }

    // Hashage centralisé — le repository ne reçoit jamais de mot de passe brut
    const updateData: UpdateUserDto = { ...dto };
    if (dto.password) {
      updateData.password = await this.hashPassword(dto.password);
    }

    const updatedUser = await this.usersRepository.update(id, updateData);

    // Synchroniser l'email dans les rendez-vous si changé
    if (dto.email && dto.email !== existingUser.email) {
      await this.prisma.rendezvous.updateMany({
        where: { userId: id },
        data: { email: dto.email },
      });
    }

    await this.mailService.sendProfileUpdatedEmail(
      updatedUser.email,
      updatedUser.firstName,
    );

    await this.auditService.logUserAction(id, AuditAction.UPDATE, {
      email: updatedUser.email,
    });

    return this.toResponseDto(updatedUser);
  }

  /**
   * Met à jour le profil d'un utilisateur avec rôle ADMIN.
   * La vérification est double :
   *  1. Le DTO UpdateProfileDto ne contient pas les champs email/telephone (niveau typage)
   *  2. Une vérification défensive au runtime rejette toute tentative de contournement
   */
  async updateAdminProfile(
    id: string,
    dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const existingUser = await this.usersRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }

    // Vérification défensive runtime : rejette si email ou telephone glissent
    // malgré tout dans le payload (ex: contournement de validation côté transport)
    const rawDto = dto as Record<string, unknown>;
    if (rawDto['email'] !== undefined || rawDto['telephone'] !== undefined) {
      throw new BadRequestException(
        'Un administrateur ne peut pas modifier son email ou son téléphone.',
      );
    }

    // Construire explicitement l'objet de mise à jour avec les seuls champs autorisés —
    // on n'utilise pas spread pour éviter qu'un champ inattendu passe en base.
    const updateData: {
      firstName?: string;
      lastName?: string;
      password?: string;
    } = {};

    if (dto.firstName !== undefined) {
      updateData.firstName = dto.firstName;
    }
    if (dto.lastName !== undefined) {
      updateData.lastName = dto.lastName;
    }
    if (dto.password) {
      updateData.password = await this.hashPassword(dto.password);
    }

    const updatedUser = await this.usersRepository.update(id, updateData);

    await this.mailService.sendProfileUpdatedEmail(
      updatedUser.email,
      updatedUser.firstName,
    );

    await this.auditService.logUserAction(id, AuditAction.UPDATE, {
      email: updatedUser.email,
      action: 'ADMIN_PROFILE_UPDATED',
    });

    return this.toResponseDto(updatedUser);
  }

  /**
   * Met à jour le mot de passe d'un utilisateur.
   *
   * ✅ Point unique de hashage pour les changements de mot de passe.
   *    Appelé par : AuthService.resetPassword(), AuthService.changePassword().
   *    `newPassword` est toujours un mot de passe BRUT — hashé ici avant le repository.
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await this.hashPassword(newPassword);
    await this.usersRepository.updatePassword(userId, hashedPassword);

    await this.auditService.logUserAction(userId, AuditAction.UPDATE, {
      action: 'PASSWORD_CHANGED',
    });
  }

  // ==================== SUPPRESSION ====================

  async remove(id: string, currentUserRole: UserRole): Promise<void> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }

    if (currentUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Seul un administrateur peut supprimer un utilisateur',
      );
    }

    await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    await this.prisma.session.deleteMany({ where: { userId: id } });
    await this.prisma.resetToken.deleteMany({ where: { userId: id } });
    await this.prisma.revokedToken.deleteMany({ where: { userId: id } });

    await this.usersRepository.softDelete(id);

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

    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    if (updateStatusDto.isActive === false && user.email === adminEmail) {
      throw new ForbiddenException(
        'Impossible de désactiver le compte administrateur principal',
      );
    }

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

    await this.auditService.logUserAction(id, AuditAction.UPDATE, {
      email: updatedUser.email,
      action: updateStatusDto.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      reason: updateStatusDto.reason,
    });

    return this.toResponseDto(updatedUser);
  }
}
