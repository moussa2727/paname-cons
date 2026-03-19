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
  Logger,
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import {
  CreateContactDto,
  RespondContactDto,
  ContactResponseDto,
  ContactQueryDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser as CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { CurrentUser } from '../interfaces/current-user.interface';

@ApiTags('contacts')
@Controller('')
export class ContactsController {
  private readonly logger = new Logger(ContactsController.name);

  constructor(private readonly contactsService: ContactsService) {}

  @Public()
  @Post('contacts')
  @ApiOperation({ summary: 'Envoyer un message de contact (public)' })
  @ApiResponse({
    status: 201,
    description: 'Message envoyé avec succès',
    type: ContactResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async create(
    @Body() createContactDto: CreateContactDto,
  ): Promise<ContactResponseDto> {
    const startTime = Date.now();
    try {
      const contact = await this.contactsService.create(createContactDto);
      const duration = Date.now() - startTime;
      this.logger.log(`POST /contacts -> 201 (${duration}ms)`);
      return contact;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`POST /contacts -> 500 (${duration}ms)`);
      throw error;
    }
  }

  @Get('admin/contacts/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste tous les messages (Admin seulement)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  @ApiQuery({ name: 'email', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Liste des messages' })
  async findAll(@Query() query: ContactQueryDto) {
    const startTime = Date.now();
    try {
      const result = await this.contactsService.findAll(query);
      const duration = Date.now() - startTime;
      this.logger.log(`GET /admin/contacts/all -> 200 (${duration}ms)`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`GET /admin/contacts/all -> 500 (${duration}ms)`);
      throw error;
    }
  }

  @Get('admin/contacts/statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Statistiques des messages (Admin seulement)' })
  @ApiResponse({ status: 200, description: 'Statistiques' })
  async getStatistics() {
    const startTime = Date.now();
    try {
      const result = await this.contactsService.getStatistics();
      const duration = Date.now() - startTime;
      this.logger.log(`GET /admin/contacts/statistics -> 200 (${duration}ms)`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `GET /admin/contacts/statistics -> 500 (${duration}ms)`,
      );
      throw error;
    }
  }

  @Get('admin/contacts/unread-count')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Nombre de messages non lus (Admin seulement)' })
  @ApiResponse({ status: 200, description: 'Nombre de messages non lus' })
  async getUnreadCount() {
    const startTime = Date.now();
    try {
      const result = await this.contactsService.getUnreadCount();
      const duration = Date.now() - startTime;
      this.logger.log(
        `GET /admin/contacts/unread-count -> 200 (${duration}ms)`,
      );
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `GET /admin/contacts/unread-count -> 500 (${duration}ms)`,
      );
      throw error;
    }
  }

  @Get('admin/contacts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Détails d'un message (Admin seulement)" })
  @ApiResponse({
    status: 200,
    description: 'Message trouvé',
    type: ContactResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Message non trouvé' })
  async findOne(@Param('id') id: string): Promise<ContactResponseDto> {
    const startTime = Date.now();
    try {
      const result = await this.contactsService.findById(id);
      const duration = Date.now() - startTime;
      this.logger.log(`GET /admin/contacts/:id -> 200 (${duration}ms)`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.warn(`GET /admin/contacts/:id -> 404 (${duration}ms)`);
      throw error;
    }
  }

  @Patch('admin/contacts/:id/respond')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Répondre à un message (Admin seulement)' })
  @ApiResponse({
    status: 200,
    description: 'Réponse envoyée',
    type: ContactResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Réponse déjà existante' })
  @ApiResponse({ status: 404, description: 'Message non trouvé' })
  async respond(
    @Param('id') id: string,
    @Body() respondContactDto: RespondContactDto,
  ): Promise<ContactResponseDto> {
    const startTime = Date.now();
    try {
      const result = await this.contactsService.respond(id, respondContactDto);
      const duration = Date.now() - startTime;
      this.logger.log(
        `PATCH /admin/contacts/:id/respond -> 200 (${duration}ms)`,
      );
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.warn(
        `PATCH /admin/contacts/:id/respond -> 400 (${duration}ms)`,
      );
      throw error;
    }
  }

  @Patch('admin/contacts/:id/read')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marquer un message comme lu (Admin seulement)' })
  @ApiResponse({
    status: 200,
    description: 'Message marqué',
    type: ContactResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Message non trouvé' })
  async markAsRead(
    @Param('id') id: string,
    @Body('isRead') isRead: boolean,
  ): Promise<ContactResponseDto> {
    const startTime = Date.now();
    try {
      const result = await this.contactsService.markAsRead(id, isRead);
      const duration = Date.now() - startTime;
      this.logger.log(`PATCH /admin/contacts/:id/read -> 200 (${duration}ms)`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.warn(`PATCH /admin/contacts/:id/read -> 404 (${duration}ms)`);
      throw error;
    }
  }

  @Post('admin/contacts/mark-all-read')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Marquer tous les messages comme lus (Admin seulement)',
  })
  @ApiResponse({ status: 200, description: 'Messages marqués' })
  async markAllAsRead(): Promise<{ count: number }> {
    const startTime = Date.now();
    try {
      const result = await this.contactsService.markAllAsRead();
      const duration = Date.now() - startTime;
      this.logger.log(
        `POST /admin/contacts/mark-all-read -> 200 (${duration}ms)`,
      );
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `POST /admin/contacts/mark-all-read -> 500 (${duration}ms)`,
      );
      throw error;
    }
  }

  @Delete('admin/contacts/:id/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un message (Admin seulement)' })
  @ApiQuery({
    name: 'permanent',
    required: false,
    type: Boolean,
    description: 'Suppression permanente (true) ou soft delete (false)',
  })
  @ApiResponse({ status: 204, description: 'Message supprimé' })
  @ApiResponse({ status: 404, description: 'Message non trouvé' })
  async remove(
    @Param('id') id: string,
    @CurrentUserDecorator() user: CurrentUser,
    @Query('permanent') permanent = false,
  ): Promise<void> {
    const startTime = Date.now();
    try {
      await this.contactsService.remove(id, user, permanent);
      const duration = Date.now() - startTime;
      this.logger.log(
        `DELETE /admin/contacts/:id/delete -> 204 (${duration}ms)`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `DELETE /admin/contacts/:id/delete -> 500 (${duration}ms)`,
      );
      throw error;
    }
  }
}
