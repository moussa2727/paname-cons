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
  constructor(private readonly usersService: UsersService) {}

  // === ENDPOINTS ADMIN ===
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createUserDto: RegisterDto) {
    // CORRECTION : Vérifier correctement l'existence d'un admin
    if (createUserDto.role === UserRole.ADMIN) {
      const existingAdmin = await this.usersService.findByRole(UserRole.ADMIN);
      if (existingAdmin) {
        throw new BadRequestException(
          "Il ne peut y avoir qu'un seul administrateur",
        );
      }
    }

    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get("stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getStats() {
    return this.usersService.getStats();
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string) {
    return this.usersService.delete(id);
  }

  @Patch(":id/toggle-status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  toggleStatus(@Param("id") id: string) {
    return this.usersService.toggleStatus(id);
  }

  @Get("maintenance-status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getMaintenanceStatus() {
    return this.usersService.getMaintenanceStatus();
  }

  @Post("maintenance-mode")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async setMaintenanceMode(@Body() body: { enabled: boolean }) {
    await this.usersService.setMaintenanceMode(body.enabled);
    return {
      message: `Mode maintenance ${body.enabled ? "activé" : "désactivé"}`,
    };
  }

  @Get("check-access/:userId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async checkUserAccess(@Param("userId") userId: string) {
    const hasAccess = await this.usersService.checkUserAccess(userId);
    return { hasAccess };
  }

  // === ENDPOINTS PUBLIC (Pour l'utilisateur connecté) ===
  @Patch("profile/me")
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Request() req: RequestWithUser,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    console.log("📝 Mise à jour profil pour:", req.user.userId);

    // Validation améliorée
    if (
      updateUserDto.email === undefined &&
      updateUserDto.telephone === undefined
    ) {
      throw new BadRequestException(
        "Au moins un champ (email ou téléphone) doit être fourni",
      );
    }

    // Validation de l'email si fourni
    if (updateUserDto.email !== undefined) {
      if (updateUserDto.email.trim() === "") {
        throw new BadRequestException("L'email ne peut pas être vide");
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateUserDto.email)) {
        throw new BadRequestException("Format d'email invalide");
      }
    }

    // Validation du téléphone si fourni
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

    console.log("✅ Données autorisées pour mise à jour:", allowedUpdate);

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

  @Post(":id/admin-reset-password")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminResetPassword(
    @Param("id") userId: string,
    @Body() body: { newPassword: string; confirmNewPassword: string },
  ) {
    // Implémentez la logique de réinitialisation par l'admin
    await this.usersService.resetPassword(userId, body.newPassword);
    return { message: "Mot de passe réinitialisé avec succès" };
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateUser(
    @Param("id") userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
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

  @Get("profile/me")
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Request() req: RequestWithUser) {
    const userId = req.user.sub || req.user.userId;
    if (!userId) {
      throw new BadRequestException("ID utilisateur manquant");
    }
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
