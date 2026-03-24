import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
  HttpCode,
  ForbiddenException,
  ParseIntPipe,
  DefaultValuePipe,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserStatusDto,
  UserResponseDto,
  UpdateProfileDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { limit: 30, ttl: 60000 } })
@ApiTags('users')
@Controller('')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==================== ADMIN ====================

  @Post('admin/users/create')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Créer un nouvel utilisateur (Admin seulement)' })
  @ApiResponse({
    status: 201,
    description: 'Utilisateur créé',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 403, description: 'Non autorisé' })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(createUserDto);
    return this.usersService.toResponseDto(user);
  }

  @Get('admin/users/all')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Liste tous les utilisateurs (Admin seulement)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.usersService.findAll(page, limit);
  }

  @Get('admin/users/statistics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Statistiques des utilisateurs (Admin seulement)' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées' })
  getStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    adminUsers: number;
    userUsers: number;
    recentlyCreated: number;
    recentlyActive: number;
  }> {
    return this.usersService.getStatistics();
  }

  @Get('admin/user/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Récupérer un utilisateur par ID (Admin seulement)',
  })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur trouvé',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }
    return this.usersService.toResponseDto(user);
  }

  /**
   * PATCH /admin/profile
   * Mise à jour du profil de l'admin connecté.
   * ✅ Autorisé  : firstName, lastName, password
   * ❌ Interdit  : email, telephone (protégés au niveau DTO et service)
   */
  @Patch('admin/profile')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Mettre à jour son propre profil admin (firstName, lastName, password uniquement — email protégé)',
  })
  @ApiResponse({
    status: 200,
    description: 'Profil admin mis à jour',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Tentative de modification de l'email ou du téléphone",
  })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async updateAdminProfile(
    @CurrentUser() user: { id: string; role: UserRole },
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateAdminProfile(user.id, updateProfileDto);
  }

  @Patch('admin/user/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mettre à jour un utilisateur (Admin seulement)' })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur mis à jour',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 403, description: 'Non autorisé' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() caller: { id: string; role: UserRole },
  ): Promise<UserResponseDto> {
    // Un admin qui modifie un autre utilisateur passe UpdateUserDto complet
    // mais on lui interdit de modifier son propre profil via cette route
    if (id === caller.id) {
      throw new ForbiddenException(
        'Utilisez PATCH /admin/profile pour modifier votre propre profil.',
      );
    }
    // L'admin modifie un USER — on passe les données sans rôle supplémentaire
    // pour autoriser tous les champs (email inclus) sur le compte cible
    return this.usersService.update(id, updateUserDto);
  }

  @Patch('admin/user/:id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Activer/désactiver un utilisateur' })
  @ApiResponse({
    status: 200,
    description: 'Statut utilisateur mis à jour',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 403, description: 'Non autorisé' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateUserStatusDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateStatus(id, updateStatusDto);
  }

  @Delete('admin/user/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Supprimer un utilisateur (Admin seulement)' })
  @ApiResponse({ status: 204, description: 'Utilisateur supprimé' })
  @ApiResponse({ status: 403, description: 'Non autorisé' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ): Promise<void> {
    if (id === user.id) {
      throw new ForbiddenException(
        'Vous ne pouvez pas supprimer votre propre compte',
      );
    }
    await this.usersService.remove(id, user.role);
  }

  // ==================== USER ====================

  @Get('user/profile')
  @ApiOperation({ summary: 'Récupérer son propre profil' })
  @ApiResponse({
    status: 200,
    description: 'Profil récupéré',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async getProfile(
    @CurrentUser() user: { id: string; role: UserRole },
  ): Promise<UserResponseDto> {
    const foundUser = await this.usersService.findById(user.id);
    if (!foundUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    return this.usersService.toResponseDto(foundUser);
  }

  /**
   * PATCH /user/profile
   * Mise à jour du profil de l'utilisateur connecté (rôle USER).
   * ✅ Autorisé  : firstName, lastName, email, telephone, password
   *
   * Un ADMIN qui tenterait d'appeler cette route recevra une 403 —
   * la vérification est faite dans UsersService.update() via callerRole.
   */
  @Patch('user/profile')
  @ApiOperation({
    summary:
      'Mettre à jour son propre profil (USER : tous les champs — ADMIN : interdit, utiliser /admin/profile)',
  })
  @ApiResponse({
    status: 200,
    description: 'Profil mis à jour',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 403, description: 'Interdit aux admins' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async updateProfile(
    @CurrentUser() user: { id: string; role: UserRole },
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    // On passe le rôle réel du caller — le service refusera si c'est ADMIN
    return this.usersService.update(user.id, updateUserDto);
  }
}
