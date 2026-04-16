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
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { RendezvousService } from './rendezvous.service';
import { Rendezvous } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateRendezvousDto,
  UpdateRendezvousDto,
  CancelRendezvousDto,
  RendezvousResponseDto,
  RendezvousQueryDto,
  CompleteRendezvousDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import * as currentUserInterface from '../interfaces/current-user.interface';
import { QueueService } from '../queue/queue.service';
import { UserRole, RendezvousStatus } from '@prisma/client';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { RENDEZVOUS_CONSTANTS } from '../holidays/holidays.service';

@ApiTags('rendezvous')
@Controller('')
export class RendezvousController {
  private readonly logger = new Logger(RendezvousController.name);

  constructor(
    private readonly rendezvousService: RendezvousService,
    private readonly queueService: QueueService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('rendezvous/available-slots/:date')
  @Public()
  @ApiOperation({
    summary: 'Obtenir les créneaux disponibles pour une date (PUBLIC)',
  })
  @ApiQuery({
    name: 'date',
    required: true,
    description: 'Date au format YYYY-MM-DD',
  })
  @ApiResponse({
    status: 200,
    description: 'Créneaux disponibles pour la date spécifiée',
  })
  async getAvailableSlots(@Param('date') date: string) {
    try {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        throw new BadRequestException(
          'Format de date invalide. Utilisez YYYY-MM-DD',
        );
      }

      const availableSlots =
        await this.rendezvousService.getAvailableSlots(date);
      return availableSlots;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Erreur lors de la récupération des créneaux disponibles',
      );
    }
  }

  @Get('rendezvous/available-dates')
  @Public()
  @ApiOperation({
    summary: 'Obtenir les dates disponibles pour une période (PUBLIC)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Date de début (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Date de fin (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Dates disponibles avec leurs créneaux',
  })
  async getAvailableDates(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

      if (startDate && !dateRegex.test(startDate)) {
        throw new BadRequestException(
          'Format de startDate invalide. Utilisez YYYY-MM-DD',
        );
      }

      if (endDate && !dateRegex.test(endDate)) {
        throw new BadRequestException(
          'Format de endDate invalide. Utilisez YYYY-MM-DD',
        );
      }

      const start = startDate ? new Date(startDate) : new Date();
      const end = endDate
        ? new Date(endDate)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const availableDates = await this.rendezvousService.getAvailableDates(
        start,
        end,
      );

      return availableDates;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Erreur lors de la récupération des dates disponibles',
      );
    }
  }

  @Get('rendezvous/check-availability')
  @Public()
  @ApiOperation({ summary: "Vérifier la disponibilité d'un créneau (PUBLIC)" })
  @ApiQuery({
    name: 'date',
    required: true,
    description: 'Date au format YYYY-MM-DD',
  })
  @ApiQuery({
    name: 'time',
    required: true,
    description: 'Heure au format HH:MM',
  })
  @ApiResponse({
    status: 200,
    description: 'Disponibilité du créneau',
  })
  async checkAvailability(
    @Query('date') date: string,
    @Query('time') time: string,
  ) {
    try {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        throw new BadRequestException(
          'Format de date invalide. Utilisez YYYY-MM-DD',
        );
      }

      const timeRegex = /^\d{2}:\d{2}$/;
      if (!timeRegex.test(time)) {
        throw new BadRequestException(
          "Format d'heure invalide. Utilisez HH:MM",
        );
      }

      const availability = await this.rendezvousService.checkAvailability(
        date,
        time,
      );

      return availability;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Erreur lors de la vérification de disponibilité',
      );
    }
  }

  @Post('/rendezvous')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un nouveau rendez-vous' })
  @ApiResponse({
    status: 201,
    description: 'Rendez-vous créé avec succès',
    type: RendezvousResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 409, description: 'Créneau non disponible' })
  async create(
    @Body() createRendezvousDto: CreateRendezvousDto,
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ): Promise<any> {
    if (!user) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    try {
      const rendezvous = await this.rendezvousService.create(
        createRendezvousDto,
        user,
      );

      try {
        const htmlContent = this.generateConfirmationContent(rendezvous);

        await this.queueService.addEmailJob({
          to: rendezvous.email,
          subject: 'Confirmation de votre rendez-vous - Paname Consulting',
          html: htmlContent,
          priority: 'high',
        });
      } catch (emailError) {
        const errorMessage =
          emailError instanceof Error ? emailError.message : 'Unknown error';
        this.logger.error(`Erreur envoi email: ${errorMessage}`);
      }

      return rendezvous;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Erreur lors de la création du rendez-vous',
      );
    }
  }

  @Get('admin/rendezvous/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste tous les rendez-vous (Admin seulement)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: RendezvousStatus })
  @ApiQuery({ name: 'date', required: false, type: String })
  @ApiQuery({ name: 'email', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Liste des rendez-vous' })
  async findAll(
    @Query() query: RendezvousQueryDto,
    @CurrentUser() user: currentUserInterface.CurrentUser | null,
  ) {
    if (!user) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    try {
      const result = await this.rendezvousService.findAll(user, {
        page: query.page,
        limit: query.limit,
        status: query.status,
        date: query.date ? new Date(query.date) : undefined,
        email: query.email,
        destination: query.destination,
        filiere: query.filiere,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        search: query.search,
        hasAvis: query.hasAvis,
        hasProcedure: query.hasProcedure,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Erreur liste rendez-vous: ${errorMessage}`);
      throw error;
    }
  }

  @Get('admin/rendezvous/statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Statistiques des rendez-vous (Admin seulement)' })
  @ApiResponse({ status: 200, description: 'Statistiques' })
  async getStatistics(
    @CurrentUser() user: currentUserInterface.CurrentUser | null,
  ): Promise<any> {
    if (!user) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    try {
      const statistics = await this.rendezvousService.getStatistics(user);
      return statistics;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Erreur statistiques: ${errorMessage}`);
      throw error;
    }
  }

  @Get('rendezvous/by-email/:email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trouver les rendez-vous par email' })
  @ApiResponse({ status: 200, description: 'Rendez-vous trouvés' })
  async findByEmail(
    @Param('email') email: string,
    @CurrentUser() user: currentUserInterface.CurrentUser | null,
  ) {
    if (!user) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    if (user.role !== UserRole.ADMIN && user.email !== email) {
      throw new UnauthorizedException(
        'Vous ne pouvez voir que vos propres rendez-vous',
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException("Format d'email invalide");
    }

    try {
      const rawRendezvous = await this.prisma.rendezvous.findMany({
        where: {
          email: email,
        },
        orderBy: {
          date: 'desc',
        },
      });

      const rendezvous = rawRendezvous.map((rdv) => {
        const now = new Date();
        const timeString = String(rdv.time);
        const rendezvousDateTime = new Date(`${rdv.date}T${timeString}`);
        const hoursDifference =
          (rendezvousDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        const minutesDifference =
          (rendezvousDateTime.getTime() - now.getTime()) / (1000 * 60);

        const [hours, minutes] = timeString.split(':').map(Number);
        const isLunchBreak = (hours === 12 && minutes >= 30) || hours === 13;

        return {
          ...rdv,
          fullName: `${rdv.firstName} ${rdv.lastName}`,
          effectiveDestination: rdv.destinationAutre || rdv.destination,
          effectiveNiveauEtude: rdv.niveauEtudeAutre || rdv.niveauEtude,
          effectiveFiliere: rdv.filiereAutre || rdv.filiere,
          dateTime: rendezvousDateTime,
          canCancel: rdv.status === 'PENDING' || rdv.status === 'CONFIRMED',
          canModify: rdv.status === 'CONFIRMED' && hoursDifference > 24,
          isPast: rendezvousDateTime < now,
          isToday: rendezvousDateTime.toDateString() === now.toDateString(),
          minutesUntilRendezvous: Math.floor(minutesDifference),
          lunchBreakInfo: {
            lunchBreakStart: RENDEZVOUS_CONSTANTS.LUNCH_BREAK.START,
            lunchBreakEnd: RENDEZVOUS_CONSTANTS.LUNCH_BREAK.END,
            isLunchBreak: isLunchBreak,
          },
        };
      });

      return rendezvous;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Erreur recherche par email: ${errorMessage}`);
      throw new BadRequestException(
        'Erreur lors de la recherche des rendez-vous par email',
      );
    }
  }

  @Get('rendezvous/by-date/:date')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Trouver les rendez-vous par date (Admin seulement)',
  })
  @ApiResponse({ status: 200, description: 'Rendez-vous trouvés' })
  async findByDate(
    @Param('date') date: string,
    @CurrentUser() user: currentUserInterface.CurrentUser | null,
  ) {
    if (!user) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Accès réservé aux administrateurs');
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new BadRequestException(
        'Format de date invalide. Utilisez YYYY-MM-DD',
      );
    }

    try {
      // Utiliser le service pour appliquer la logique par défaut (PENDING + CONFIRMED)
      const result = await this.rendezvousService.findAll(user, {
        date: new Date(date),
      });

      // Enrichir les résultats avec les champs effective*
      const enrichedRendezvous = result.data.map((rdv) =>
        this.rendezvousService.addEffectiveFields(rdv as Rendezvous),
      );

      return enrichedRendezvous;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Erreur recherche par date: ${errorMessage}`);
      throw new BadRequestException(
        'Erreur lors de la recherche des rendez-vous par date',
      );
    }
  }

  @Get('/rendezvous/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Détails d'un rendez-vous" })
  @ApiResponse({
    status: 200,
    description: 'Rendez-vous trouvé',
    type: RendezvousResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Rendez-vous non trouvé' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: currentUserInterface.CurrentUser | null,
  ): Promise<any> {
    if (!user) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    try {
      const rendezvous = await this.rendezvousService.findById(id, user);
      return rendezvous;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      } else if (error instanceof ForbiddenException) {
        throw error;
      } else {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Erreur recherche rendez-vous: ${errorMessage}`);
        throw error;
      }
    }
  }

  @Patch('admin/rendezvous/:id/patch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier un rendez-vous (Admin seulement)' })
  @ApiResponse({ status: 200, description: 'Rendez-vous modifié' })
  @ApiResponse({ status: 404, description: 'Rendez-vous non trouvé' })
  @ApiResponse({ status: 403, description: 'Admin uniquement' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async update(
    @Param('id') id: string,
    @Body() updateRendezvousDto: UpdateRendezvousDto,
    @CurrentUser() user: currentUserInterface.CurrentUser | null,
  ): Promise<any> {
    if (!user) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    try {
      const updated = await this.rendezvousService.update(
        id,
        updateRendezvousDto,
        user,
      );
      return updated;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Erreur mise à jour: ${errorMessage}`);
      throw new BadRequestException(
        'Erreur lors de la mise à jour du rendez-vous',
      );
    }
  }

  @Patch('rendezvous/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Annuler un rendez-vous' })
  @ApiResponse({
    status: 200,
    description: 'Rendez-vous annulé',
    type: RendezvousResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Annulation impossible' })
  @ApiResponse({ status: 404, description: 'Rendez-vous non trouvé' })
  async cancel(
    @Param('id') id: string,
    @Body() cancelRendezvousDto: CancelRendezvousDto,
    @CurrentUser() user: currentUserInterface.CurrentUser | null,
  ): Promise<any> {
    if (!user) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    try {
      const cancelled = await this.rendezvousService.cancel(id, user);
      return cancelled;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Erreur annulation: ${errorMessage}`);
      throw new BadRequestException(
        "Erreur lors de l'annulation du rendez-vous",
      );
    }
  }

  @Patch('admin/rendezvous/:id/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Compléter un rendez-vous (Admin seulement)' })
  @ApiResponse({
    status: 200,
    description: 'Rendez-vous complété',
    type: RendezvousResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Complétion impossible' })
  @ApiResponse({ status: 404, description: 'Rendez-vous non trouvé' })
  async complete(
    @Param('id') id: string,
    @Body() completeRendezvousDto: CompleteRendezvousDto,
    @CurrentUser() user: currentUserInterface.CurrentUser | null,
  ): Promise<any> {
    if (!user) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    try {
      const completed = await this.rendezvousService.complete(
        id,
        completeRendezvousDto,
        user,
      );
      return completed;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Erreur complétion: ${errorMessage}`);
      throw new BadRequestException(
        'Erreur lors de la complétion du rendez-vous',
      );
    }
  }

  @Delete('admin/rendezvous/:id/delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un rendez-vous (Admin seulement)' })
  @ApiResponse({ status: 204, description: 'Rendez-vous supprimé' })
  @ApiResponse({ status: 404, description: 'Rendez-vous non trouvé' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: currentUserInterface.CurrentUser | null,
  ) {
    if (!user) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Accès réservé aux administrateurs');
    }

    try {
      const rendezvous = await this.rendezvousService.findById(id, user);
      if (!rendezvous) {
        throw new NotFoundException('Rendez-vous non trouvé');
      }

      await this.prisma.rendezvous.update({
        where: { id },
        data: {
          status: RendezvousStatus.CANCELLED,
          updatedAt: new Date(),
        },
      });

      return;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Erreur suppression: ${errorMessage}`);
      throw new BadRequestException(
        'Erreur lors de la suppression du rendez-vous',
      );
    }
  }

  private generateConfirmationContent(rendezvous: {
    date: string | Date;
    time: string;
    firstName: string;
  }): string {
    const dateFormatted = new Date(rendezvous.date).toLocaleDateString(
      'fr-FR',
      {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      },
    );

    return `
      <div>
        <p>Votre rendez-vous a été confirmé avec succès.</p>
        <div>
          <h3>Détails du rendez-vous</h3>
          <div>Date : ${dateFormatted}</div>
          <div>Heure : ${rendezvous.time}</div>
          <div>Lieu : Paname Consulting - Kalaban Coura</div>
          <div>Statut : Confirmé</div>
        </div>
        <p>Nous vous attendons avec impatience.</p>
      </div>`;
  }
}
