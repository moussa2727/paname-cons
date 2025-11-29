import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { RegisterDto } from "../auth/dto/register.dto";
import { UpdateUserDto } from "../auth/dto/update-user.dto";
import { UserRole } from "../schemas/user.schema";
import { Roles } from "../shared/decorators/roles.decorator";
import { JwtAuthGuard } from "../shared/guards/jwt-auth.guard";
import { RolesGuard } from "../shared/guards/roles.guard";
import { UsersService } from "./users.service";

interface RequestWithUser extends Request {
  user: {
    userId: string;
    sub?: string;
    email: string;
    role: string;
    telephone?: string;
  };
}

@Controller("users")
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  // === ENDPOINTS ADMIN ===
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createUserDto: RegisterDto) {
    this.logger.log(
      `📝 Création utilisateur par admin: ${createUserDto.email}`,
    );

    const userData = { ...createUserDto };

    if (userData.role === UserRole.ADMIN) {
      const existingAdmin = await this.usersService.findByRole(UserRole.ADMIN);
      if (existingAdmin) {
        throw new BadRequestException(
          "Il ne peut y avoir qu'un seul administrateur",
        );
      }
    }

    return this.usersService.create(userData);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll() {
    this.logger.log("📋 Récupération de tous les utilisateurs");
    return this.usersService.findAll();
  }

  @Get("stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getStats() {
    this.logger.log("📊 Récupération des statistiques utilisateurs");
    return this.usersService.getStats();
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateUser(
    @Param("id") userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    this.logger.log(`✏️ Mise à jour utilisateur par admin: ${userId}`);

    const updatedUser = await this.usersService.update(userId, updateUserDto);

    return {
      id: updatedUser._id?.toString(),
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role,
      telephone: updatedUser.telephone,
      isActive: updatedUser.isActive,
    };
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string) {
    this.logger.log(`🗑️ Suppression utilisateur: ${id}`);
    return this.usersService.delete(id);
  }

  @Patch(":id/toggle-status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  toggleStatus(@Param("id") id: string) {
    this.logger.log(`🔄 Changement statut utilisateur: ${id}`);
    return this.usersService.toggleStatus(id);
  }

  @Get("maintenance-status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getMaintenanceStatus() {
    this.logger.log("🔧 Récupération statut maintenance");
    return this.usersService.getMaintenanceStatus();
  }

  @Post("maintenance-mode")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async setMaintenanceMode(@Body() body: { enabled: boolean }) {
    this.logger.log(`⚙️ Changement mode maintenance: ${body.enabled}`);
    await this.usersService.setMaintenanceMode(body.enabled);
    return {
      message: `Mode maintenance ${body.enabled ? "activé" : "désactivé"}`,
    };
  }

  @Get("check-access/:userId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async checkUserAccess(@Param("userId") userId: string) {
    this.logger.log(`🔐 Vérification accès utilisateur: ${userId}`);
    const hasAccess = await this.usersService.checkUserAccess(userId);
    return { hasAccess };
  }

  @Post(":id/admin-reset-password")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminResetPassword(
    @Param("id") userId: string,
    @Body() body: { newPassword: string; confirmNewPassword: string },
  ) {
    this.logger.log(`🔑 Réinitialisation mot de passe par admin: ${userId}`);

    if (body.newPassword !== body.confirmNewPassword) {
      throw new BadRequestException("Les mots de passe ne correspondent pas");
    }

    await this.usersService.resetPassword(userId, body.newPassword);
    return { message: "Mot de passe réinitialisé avec succès" };
  }

  // === ENDPOINTS UTILISATEUR ===
  @Patch("profile/me")
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Request() req: RequestWithUser,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    this.logger.log(`✏️ Mise à jour profil utilisateur: ${req.user.userId}`);

    if (
      updateUserDto.email === undefined &&
      updateUserDto.telephone === undefined
    ) {
      throw new BadRequestException(
        "Au moins un champ (email ou téléphone) doit être fourni",
      );
    }

    if (updateUserDto.email !== undefined) {
      if (updateUserDto.email.trim() === "") {
        throw new BadRequestException("L'email ne peut pas être vide");
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateUserDto.email)) {
        throw new BadRequestException("Format d'email invalide");
      }
    }

    if (updateUserDto.telephone !== undefined) {
      if (updateUserDto.telephone.trim().length < 5) {
        throw new BadRequestException(
          "Le téléphone doit contenir au moins 5 caractères",
        );
      }
    }

    const allowedUpdate: any = {};

    if (
      updateUserDto.email !== undefined &&
      updateUserDto.email.trim() !== ""
    ) {
      allowedUpdate.email = updateUserDto.email.trim().toLowerCase();
    }

    if (
      updateUserDto.telephone !== undefined &&
      updateUserDto.telephone.trim() !== ""
    ) {
      allowedUpdate.telephone = updateUserDto.telephone.trim();
    }

    if (Object.keys(allowedUpdate).length === 0) {
      throw new BadRequestException("Aucune donnée valide à mettre à jour");
    }

    const updatedUser = await this.usersService.update(
      req.user.userId,
      allowedUpdate,
    );

    return {
      id: updatedUser._id?.toString(),
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role,
      telephone: updatedUser.telephone,
      isActive: updatedUser.isActive,
      isAdmin: updatedUser.role === UserRole.ADMIN,
    };
  }

  @Get("profile/me")
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Request() req: RequestWithUser) {
    this.logger.log(`📋 Récupération profil utilisateur: ${req.user.userId}`);
    const user = await this.usersService.findById(req.user.userId);

    return {
      id: user._id?.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      telephone: user.telephone,
      isActive: user.isActive,
      isAdmin: user.role === UserRole.ADMIN,
    };
  }
}
