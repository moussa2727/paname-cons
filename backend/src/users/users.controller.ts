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
  UpdateUserStatusDto,
  UserResponseDto,
  UpdateProfileDto,
  AdminUpdateUserDto,
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

@Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requêtes par minute
@ApiTags('users')
@Controller('')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('admin/users/create')
  @ApiOperation({ summary: 'Créer un nouvel utilisateur (Admin seulement)' })
  @ApiResponse({
    status: 201,
    description: 'Utilisateur créé',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 403, description: 'Non autorisé' })
  @Roles(UserRole.ADMIN)
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

  @Get('user/profile')
  async getProfile(
    @CurrentUser() user: { id: string; role: UserRole },
  ): Promise<UserResponseDto> {
    const foundUser = await this.usersService.findById(user.id);

    if (!foundUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const responseDto = this.usersService.toResponseDto(foundUser);

    return responseDto;
  }

  @Patch('admin/profile')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Mettre à jour son propre profil (Admin uniquement - email protégé)',
  })
  @ApiResponse({
    status: 200,
    description: 'Profil admin mis à jour',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async updateAdminProfile(
    @CurrentUser() user: { id: string; role: UserRole },
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    // L'admin peut uniquement modifier son propre profil (sans email)
    return this.usersService.updateAdminProfile(user.id, updateProfileDto);
  }

  @Patch('user/profile')
  @ApiOperation({ summary: 'Mettre à jour son propre profil' })
  @ApiResponse({
    status: 200,
    description: 'Profil mis à jour',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async updateProfile(
    @CurrentUser() user: { id: string; role: UserRole },
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(user.id, updateProfileDto);
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
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }
    return this.usersService.toResponseDto(user);
  }

  @Patch('admin/user/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mettre à jour un utilisateur (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur mis à jour',
    type: UserResponseDto,
  })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: AdminUpdateUserDto, // Utiliser AdminUpdateUserDto pour l'admin
  ): Promise<UserResponseDto> {
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
    // Empêcher l'admin de supprimer son propre compte
    if (id === user.id) {
      throw new ForbiddenException(
        'Vous ne pouvez pas supprimer votre propre compte',
      );
    }
    await this.usersService.remove(id, user.role);
  }
}
