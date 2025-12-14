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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { RegisterDto } from "../auth/dto/register.dto";
import { UpdateUserDto } from "../auth/dto/update-user.dto";
import { UserRole } from "../schemas/user.schema";
import { Roles } from "../shared/decorators/roles.decorator";
import { JwtAuthGuard } from "../shared/guards/jwt-auth.guard";
import { RolesGuard } from "../shared/guards/roles.guard";
import { UsersService } from "./users.service";
import { AuthenticatedRequest } from "../shared/interfaces/authenticated-user.interface";

@ApiTags("Users")
@Controller("users")
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}
  
  // === ENDPOINTS ADMIN ===
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Créer un utilisateur (Admin uniquement)" })
  @ApiResponse({ status: 201, description: "Utilisateur créé avec succès" })
  @ApiResponse({ status: 400, description: "Données invalides" })
  @ApiResponse({ status: 401, description: "Non autorisé" })
  @ApiResponse({ status: 403, description: "Interdit" })
  @ApiBearerAuth()
  async create(@Body() createUserDto: RegisterDto) {
    this.logger.log('Création d\'utilisateur par admin');

    // Empêcher la création d'autres admins via l'API
    if (createUserDto.role === UserRole.ADMIN) {
      const existingAdmin = await this.usersService.findByRole(UserRole.ADMIN);
      if (existingAdmin) {
        this.logger.warn('Tentative de création d\'un deuxième admin');
        throw new BadRequestException(
          "Il ne peut y avoir qu'un seul administrateur",
        );
      }
    }

    // Empêcher la création d'un utilisateur avec l'email admin spécifique
    const adminEmail = process.env.EMAIL_USER;
    if (createUserDto.email === adminEmail) {
      this.logger.warn('Tentative d\'utilisation de l\'email admin réservé');
      throw new BadRequestException(
        "Cet email est réservé à l'administrateur principal",
      );
    }

    try {
      const user = await this.usersService.create(createUserDto);
      this.logger.log('Utilisateur créé avec succès');
      return {
        id: user._id?.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        telephone: user.telephone,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      this.logger.error('Erreur création utilisateur', error.stack);
      throw error;
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Récupérer tous les utilisateurs (Admin uniquement)" })
  @ApiResponse({ status: 200, description: "Liste des utilisateurs" })
  @ApiResponse({ status: 401, description: "Non autorisé" })
  @ApiResponse({ status: 403, description: "Interdit" })
  @ApiBearerAuth()
  async findAll() {
    this.logger.log('Liste des utilisateurs demandée par admin');
    
    try {
      const users = await this.usersService.findAll();
      this.logger.log(`${users.length} utilisateurs récupérés`);
      
      return users.map(user => ({
        id: user._id?.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        telephone: user.telephone,
        isActive: user.isActive,
        logoutUntil: user.logoutUntil,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount,
        lastLogout: user.lastLogout,
        logoutCount: user.logoutCount,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));
    } catch (error) {
      this.logger.error('Erreur récupération utilisateurs', error.stack);
      throw error;
    }
  }

  @Get("stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Récupérer les statistiques utilisateurs (Admin uniquement)" })
  @ApiResponse({ status: 200, description: "Statistiques utilisateurs" })
  @ApiResponse({ status: 401, description: "Non autorisé" })
  @ApiResponse({ status: 403, description: "Interdit" })
  @ApiBearerAuth()
  async getStats() {
    this.logger.log('Statistiques utilisateurs demandées');
    
    try {
      const stats = await this.usersService.getStats();
      this.logger.log(`Statistiques générées - Total: ${stats.totalUsers}`);
      return stats;
    } catch (error) {
      this.logger.error('Erreur génération stats', error.stack);
      throw error;
    }
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Supprimer un utilisateur (Admin uniquement)" })
  @ApiResponse({ status: 204, description: "Utilisateur supprimé" })
  @ApiResponse({ status: 400, description: "Impossible de supprimer l'admin principal" })
  @ApiResponse({ status: 401, description: "Non autorisé" })
  @ApiResponse({ status: 403, description: "Interdit" })
  @ApiResponse({ status: 404, description: "Utilisateur non trouvé" })
  @ApiBearerAuth()
  async remove(@Param("id") id: string) {
    this.logger.log(`Suppression utilisateur demandée: ${id}`);
    
    try {
      await this.usersService.delete(id);
      this.logger.log(`Utilisateur ${id} supprimé`);
    } catch (error) {
      this.logger.error(`Erreur suppression utilisateur ${id}`, error.stack);
      throw error;
    }
  }

  @Patch(":id/toggle-status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Activer/Désactiver un utilisateur (Admin uniquement)" })
  @ApiResponse({ status: 200, description: "Statut utilisateur modifié" })
  @ApiResponse({ status: 401, description: "Non autorisé" })
  @ApiResponse({ status: 403, description: "Interdit" })
  @ApiResponse({ status: 404, description: "Utilisateur non trouvé" })
  @ApiBearerAuth()
  async toggleStatus(@Param("id") id: string) {
    this.logger.log(`Changement statut utilisateur: ${id}`);
    
    try {
      const user = await this.usersService.toggleStatus(id);
      this.logger.log(`Statut utilisateur modifié - Actif: ${user.isActive}`);
      
      return {
        id: user._id?.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        telephone: user.telephone,
        isActive: user.isActive,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Erreur changement statut ${id}`, error.stack);
      throw error;
    }
  }

  @Get("maintenance-status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Récupérer le statut maintenance (Admin uniquement)" })
  @ApiResponse({ status: 200, description: "Statut maintenance" })
  @ApiResponse({ status: 401, description: "Non autorisé" })
  @ApiResponse({ status: 403, description: "Interdit" })
  @ApiBearerAuth()
  async getMaintenanceStatus() {
    this.logger.log('Statut maintenance demandé');
    
    const status = await this.usersService.getMaintenanceStatus();
    
    return {
      isActive: status.isActive,
      enabledAt: status.enabledAt,
      message: status.message,
    };
  }

  @Post("maintenance-mode")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Activer/Désactiver le mode maintenance (Admin uniquement)" })
  @ApiResponse({ status: 200, description: "Mode maintenance modifié" })
  @ApiResponse({ status: 401, description: "Non autorisé" })
  @ApiResponse({ status: 403, description: "Interdit" })
  @ApiBearerAuth()
  async setMaintenanceMode(@Body() body: { enabled: boolean }) {
    this.logger.log(`Changement mode maintenance - Activé: ${body.enabled}`);
    
    await this.usersService.setMaintenanceMode(body.enabled);
    this.logger.log(`Mode maintenance ${body.enabled ? "activé" : "désactivé"}`);
    
    return {
      message: `Mode maintenance ${body.enabled ? "activé" : "désactivé"}`,
      enabled: body.enabled,
      timestamp: new Date().toISOString(),
    };
  }

  @Get("check-access/:userId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Vérifier l'accès d'un utilisateur (Admin uniquement)" })
  @ApiResponse({ status: 200, description: "Vérification accès" })
  @ApiResponse({ status: 401, description: "Non autorisé" })
  @ApiResponse({ status: 403, description: "Interdit" })
  @ApiResponse({ status: 404, description: "Utilisateur non trouvé" })
  @ApiBearerAuth()
  async checkUserAccess(@Param("userId") userId: string) {
    this.logger.log(`Vérification accès utilisateur: ${userId}`);
    
    const accessCheck = await this.usersService.checkUserAccess(userId);
    this.logger.log(`Accès utilisateur: ${accessCheck.canAccess}`);
    
    return {
      canAccess: accessCheck.canAccess,
      reason: accessCheck.reason,
      user: accessCheck.user,
      details: accessCheck.details,
      timestamp: new Date().toISOString(),
    };
  }

  // === ENDPOINTS PUBLIC (Pour l'utilisateur connecté) ===
  @Patch("profile/me")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Mettre à jour son propre profil" })
  @ApiResponse({ status: 200, description: "Profil mis à jour" })
  @ApiResponse({ status: 400, description: "Données invalides" })
  @ApiResponse({ status: 401, description: "Non autorisé" })
  @ApiBearerAuth()
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const userId = req.user.id;
    
    this.logger.log(`Mise à jour profil utilisateur: ${userId}`);

    // Validation améliorée - MISE À JOUR INDÉPENDANTE email/téléphone
    if (
      updateUserDto.email === undefined &&
      updateUserDto.telephone === undefined
    ) {
      this.logger.warn('Aucun champ fourni pour mise à jour');
      throw new BadRequestException(
        "Au moins un champ (email ou téléphone) doit être fourni",
      );
    }

    // Validation de l'email si fourni
    if (updateUserDto.email !== undefined) {
      if (updateUserDto.email.trim() === "") {
        this.logger.warn('Email vide fourni');
        throw new BadRequestException("L'email ne peut pas être vide");
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateUserDto.email)) {
        this.logger.warn('Format email invalide');
        throw new BadRequestException("Format d'email invalide");
      }
    }

    // 🔥 VALIDATION TÉLÉPHONE - MISE À JOUR INDÉPENDANTE
    // IMPORTANT: Accepter chaîne vide pour suppression, mais si rempli → minimum 5 caractères
    if (updateUserDto.telephone !== undefined) {
      const trimmedPhone = updateUserDto.telephone.trim();
      
      // Si téléphone n'est pas vide, vérifier la longueur minimum
      if (trimmedPhone !== "" && trimmedPhone.length < 5) {
        this.logger.warn('Téléphone trop court');
        throw new BadRequestException(
          "Le téléphone doit contenir au moins 5 caractères",
        );
      }
    }

    const allowedUpdate: any = {};

    // Email - seulement si fourni et non vide
    if (
      updateUserDto.email !== undefined &&
      updateUserDto.email.trim() !== ""
    ) {
      allowedUpdate.email = updateUserDto.email.trim().toLowerCase();
      this.logger.log(`Email à mettre à jour: ${allowedUpdate.email}`);
    }

    // Téléphone - accepter chaîne vide pour suppression
    if (updateUserDto.telephone !== undefined) {
      allowedUpdate.telephone = updateUserDto.telephone.trim();
      this.logger.log(`Téléphone à mettre à jour: ${allowedUpdate.telephone || '(vide pour suppression)'}`);
    }

    if (Object.keys(allowedUpdate).length === 0) {
      this.logger.warn('Aucune donnée valide après validation');
      throw new BadRequestException("Aucune donnée valide à mettre à jour");
    }

    this.logger.log(`Données validées pour mise à jour - Champs: ${Object.keys(allowedUpdate).join(', ')}`);

    try {
      const updatedUser = await this.usersService.update(
        userId,
        allowedUpdate,
      );

      this.logger.log('Profil mis à jour avec succès');

      return {
        id: updatedUser._id?.toString(),
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        telephone: updatedUser.telephone,
        isActive: updatedUser.isActive,
        isAdmin: updatedUser.role === UserRole.ADMIN,
        logoutUntil: updatedUser.logoutUntil,
        lastLogin: updatedUser.lastLogin,
        loginCount: updatedUser.loginCount,
        lastLogout: updatedUser.lastLogout,
        logoutCount: updatedUser.logoutCount,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      };
    } catch (error) {
      this.logger.error('Erreur mise à jour profil', error.stack);
      throw error;
    }
  }

  @Patch(":id/admin-reset-password")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Réinitialiser le mot de passe d'un utilisateur (Admin uniquement)" })
  @ApiResponse({ status: 200, description: "Mot de passe réinitialisé" })
  @ApiResponse({ status: 400, description: "Mots de passe ne correspondent pas" })
  @ApiResponse({ status: 401, description: "Non autorisé" })
  @ApiResponse({ status: 403, description: "Interdit" })
  @ApiResponse({ status: 404, description: "Utilisateur non trouvé" })
  @ApiBearerAuth()
  async adminResetPassword(
    @Param("id") userId: string,
    @Body() body: { newPassword: string; confirmNewPassword: string },
  ) {
    this.logger.log(`Réinitialisation mot de passe admin pour: ${userId}`);
    
    // Validation
    if (body.newPassword !== body.confirmNewPassword) {
      throw new BadRequestException("Les mots de passe ne correspondent pas");
    }
    
    if (body.newPassword.length < 8) {
      throw new BadRequestException("Le mot de passe doit contenir au moins 8 caractères");
    }
    
    // Validation de complexité
    const hasLowerCase = /[a-z]/.test(body.newPassword);
    const hasUpperCase = /[A-Z]/.test(body.newPassword);
    const hasNumber = /[0-9]/.test(body.newPassword);

    if (!hasLowerCase || !hasUpperCase || !hasNumber) {
      throw new BadRequestException(
        "Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre",
      );
    }
    
    await this.usersService.resetPassword(userId, body.newPassword);
    
    this.logger.log('Mot de passe réinitialisé par admin');
    return { 
      message: "Mot de passe réinitialisé avec succès",
      userId: userId,
      timestamp: new Date().toISOString()
    };
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Mettre à jour un utilisateur (Admin uniquement)" })
  @ApiResponse({ status: 200, description: "Utilisateur mis à jour" })
  @ApiResponse({ status: 400, description: "Données invalides" })
  @ApiResponse({ status: 401, description: "Non autorisé" })
  @ApiResponse({ status: 403, description: "Interdit" })
  @ApiResponse({ status: 404, description: "Utilisateur non trouvé" })
  @ApiBearerAuth()
  async updateUser(
    @Param("id") userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    this.logger.log(`Mise à jour utilisateur par admin: ${userId}`);

    try {
      const updatedUser = await this.usersService.update(userId, updateUserDto);
      this.logger.log('Utilisateur mis à jour par admin');

      return {
        id: updatedUser._id?.toString(),
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        telephone: updatedUser.telephone,
        isActive: updatedUser.isActive,
        logoutUntil: updatedUser.logoutUntil,
        lastLogin: updatedUser.lastLogin,
        loginCount: updatedUser.loginCount,
        lastLogout: updatedUser.lastLogout,
        logoutCount: updatedUser.logoutCount,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      };
    } catch (error) {
      this.logger.error('Erreur mise à jour utilisateur par admin', error.stack);
      throw error;
    }
  }

  @Get("profile/me")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Récupérer son propre profil" })
  @ApiResponse({ status: 200, description: "Profil utilisateur" })
  @ApiResponse({ status: 401, description: "Non autorisé" })
  @ApiBearerAuth()
  async getMyProfile(@Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    
    if (!userId) {
      this.logger.warn('ID utilisateur manquant dans la requête');
      throw new BadRequestException("ID utilisateur manquant");
    }

    this.logger.log(`Récupération profil utilisateur: ${userId}`);

    try {
      const user = await this.usersService.findById(userId);
      this.logger.log('Profil récupéré avec succès');

      return {
        id: user._id?.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        telephone: user.telephone,
        isActive: user.isActive,
        isAdmin: user.role === UserRole.ADMIN,
        logoutUntil: user.logoutUntil,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount,
        lastLogout: user.lastLogout,
        logoutCount: user.logoutCount,
        logoutReason: user.logoutReason,
        logoutTransactionId: user.logoutTransactionId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      this.logger.error('Erreur récupération profil', error.stack);
      throw error;
    }
  }

  // === ENDPOINTS UTILITAIRE ===
  @Get("health")
  @ApiOperation({ summary: "Vérifier la santé du service utilisateurs" })
  @ApiResponse({ status: 200, description: "Service opérationnel" })
  async healthCheck() {
    this.logger.log('Health check demandé');
    
    const isDbConnected = await this.usersService.checkDatabaseConnection();
    
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      database: isDbConnected ? "connected" : "disconnected",
      service: "users",
      version: "1.0.0",
    };
  }

  @Get("cache/clear")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Vider le cache utilisateurs (Admin uniquement)" })
  @ApiResponse({ status: 200, description: "Cache vidé" })
  @ApiResponse({ status: 401, description: "Non autorisé" })
  @ApiResponse({ status: 403, description: "Interdit" })
  @ApiBearerAuth()
  async clearCache() {
    this.logger.log('Vidage cache demandé');
    
    await this.usersService.clearAllCache();
    
    return {
      message: "Cache utilisateurs vidé avec succès",
      timestamp: new Date().toISOString(),
    };
  }
}