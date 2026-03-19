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
  ParseEnumPipe,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ProceduresService } from './procedures.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../interfaces/current-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '../enums/user-role.enum';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { ProcedureQueryDto } from './dto/procedure-query.dto';
import {
  ProcedureResponseDto,
  PaginatedProcedureResponseDto,
} from './dto/procedure-response.dto';
import { ProcedureStatus, StepName } from '@prisma/client';

@ApiTags('procedures')
@Controller('')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProceduresController {
  constructor(private readonly proceduresService: ProceduresService) {}

  @Post('admin/procedures/create')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Créer une procédure depuis un rendez-vous éligible',
  })
  @ApiResponse({
    status: 201,
    description: 'Procédure créée',
    type: ProcedureResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Rendez-vous non éligible' })
  async createFromRendezvous(
    @Body() createDto: CreateProcedureDto,
    @CurrentUser() user: { id: string },
  ): Promise<ProcedureResponseDto> {
    return this.proceduresService.create(createDto, user.id);
  }

  @Get('admin/procedures/all')
  @ApiOperation({ summary: 'Liste toutes les procédures' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ProcedureStatus })
  @ApiQuery({ name: 'email', required: false, type: String })
  @ApiQuery({ name: 'destination', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Liste paginée des procédures',
    type: PaginatedProcedureResponseDto,
  })
  async findAll(
    @Query() query: ProcedureQueryDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<PaginatedProcedureResponseDto> {
    return this.proceduresService.findAll(query, currentUser);
  }

  @Get('procedures/by-email/:email')
  @ApiOperation({ summary: 'Trouver les procédures par email' })
  @ApiResponse({ status: 200, description: 'Procédures trouvées' })
  async findByUserEmail(
    @Param('email') email: string,
    @CurrentUser() currentUser: CurrentUserType,
  ) {
    return this.proceduresService.findByUserEmail(email, currentUser);
  }

  @Get('procedures/by-rendezvous/:rendezVousId')
  @ApiOperation({ summary: 'Trouver une procédure par ID de rendez-vous' })
  @ApiResponse({ status: 200, description: 'Procédure trouvée' })
  @ApiResponse({ status: 404, description: 'Procédure non trouvée' })
  async findByRendezvousId(
    @Param('rendezVousId') rendezVousId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ) {
    return this.proceduresService.findByRendezvousId(rendezVousId, currentUser);
  }

  @Get('admin/procedures/statistics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Statistiques des procédures (Admin seulement)' })
  @ApiResponse({ status: 200, description: 'Statistiques' })
  async getStatistics(
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<any> {
    if (!currentUser) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }
    return this.proceduresService.getStatistics(currentUser);
  }

  @Get('procedures/:id/details')
  @ApiOperation({ summary: "Détails d'une procédure" })
  @ApiResponse({
    status: 200,
    description: 'Procédure trouvée',
    type: ProcedureResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Procédure non trouvée' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<ProcedureResponseDto> {
    return this.proceduresService.findById(id, currentUser);
  }

  @Patch('procedures/:id/update')
  @ApiOperation({ summary: 'Mettre à jour une procédure' })
  @ApiResponse({
    status: 200,
    description: 'Procédure mise à jour',
    type: ProcedureResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Procédure non trouvée' })
  async update(
    @Param('id') id: string,
    @Body() updateProcedureDto: UpdateProcedureDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<ProcedureResponseDto> {
    return this.proceduresService.update(id, updateProcedureDto, user);
  }

  @Patch('admin/procedures/:id/steps/:stepName')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mettre à jour une étape (Admin seulement)' })
  @ApiResponse({
    status: 200,
    description: 'Étape mise à jour',
    type: ProcedureResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Procédure ou étape non trouvée' })
  async updateStep(
    @Param('id') id: string,
    @Param('stepName', new ParseEnumPipe(StepName)) stepName: StepName,
    @Body() updateStepDto: UpdateStepDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<ProcedureResponseDto> {
    return this.proceduresService.updateStep(id, stepName, updateStepDto, user);
  }

  @Post('admin/procedures/:id/steps/:stepName')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Ajouter une étape (Admin seulement)' })
  @ApiResponse({
    status: 200,
    description: 'Étape ajoutée',
    type: ProcedureResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Étape déjà existante' })
  async addStep(
    @Param('id') id: string,
    @Param('stepName', new ParseEnumPipe(StepName)) stepName: StepName,
    @CurrentUser() user: CurrentUserType,
  ): Promise<ProcedureResponseDto> {
    return this.proceduresService.addStep(id, stepName, user);
  }

  @Delete('admin/procedures/:id/delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Supprimer une procédure (soft delete)' })
  @ApiResponse({ status: 204, description: 'Procédure supprimée' })
  @ApiResponse({ status: 404, description: 'Procédure non trouvée' })
  async remove(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: CurrentUserType,
  ): Promise<void> {
    await this.proceduresService.softDelete(
      id,
      reason || 'Suppression manuelle',
      user,
    );
  }

  @Patch('procedures/:id/cancel')
  @ApiOperation({ summary: 'Annuler une procédure (utilisateur connecté)' })
  @ApiResponse({ status: 200, description: 'Procédure annulée' })
  @ApiResponse({ status: 404, description: 'Procédure non trouvée' })
  @ApiResponse({
    status: 400,
    description: "Impossible d'annuler cette procédure",
  })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
    @Body('reason') reason?: string,
  ): Promise<ProcedureResponseDto> {
    return await this.proceduresService.cancel(
      id,
      reason || "Annulation par l'utilisateur",
      user,
    );
  }

  /**
   * GET /admin/procedures/export
   * Export des procédures au format CSV, Excel ou PDF
   */
  @Get('admin/procedures/export')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Exporter les procédures (CSV, Excel, PDF)' })
  @ApiQuery({
    name: 'format',
    required: true,
    enum: ['csv', 'excel', 'pdf'],
    description: "Format d'export",
  })
  @ApiQuery({ name: 'status', required: false, enum: ProcedureStatus })
  @ApiQuery({ name: 'email', required: false, type: String })
  @ApiQuery({ name: 'destination', required: false, type: String })
  @ApiQuery({ name: 'filiere', required: false, type: String })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Fichier exporté avec succès' })
  @ApiResponse({ status: 403, description: 'Accès non autorisé' })
  async exportProcedures(
    @Query('format') format: 'csv' | 'excel' | 'pdf',
    @Query() query: ProcedureQueryDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res() res: Response,
  ): Promise<void> {
    return this.proceduresService.exportProcedures(
      format,
      query,
      currentUser,
      res,
    );
  }
}
