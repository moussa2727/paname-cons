import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ContactsRepository } from './contacts.repository';
import {
  CreateContactDto,
  RespondContactDto,
  ContactResponseDto,
  ContactQueryDto,
} from './dto';
import { Contact, Prisma } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CurrentUser as CurrentUserType } from '../interfaces/current-user.interface';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private contactsRepository: ContactsRepository,
    private mailService: MailService,
    @InjectQueue('email') private emailQueue: Queue,
    private configService: ConfigService,
  ) {}

  /**
   * Créer un nouveau message de contact (public)
   * FROM: l'utilisateur qui envoie le message (dynamique)
   * TO: admin (EMAIL_USER)
   */
  async create(
    createContactDto: CreateContactDto,
  ): Promise<ContactResponseDto> {
    try {
      if (createContactDto.firstName && createContactDto.firstName.length < 2) {
        throw new BadRequestException({
          message: 'Erreur de validation',
          errors: [
            {
              field: 'firstName',
              message: 'Le prénom doit contenir au moins 2 caractères',
              value: createContactDto.firstName,
            },
          ],
        });
      }

      if (createContactDto.lastName && createContactDto.lastName.length < 2) {
        throw new BadRequestException({
          message: 'Erreur de validation',
          errors: [
            {
              field: 'lastName',
              message: 'Le nom doit contenir au moins 2 caractères',
              value: createContactDto.lastName,
            },
          ],
        });
      }

      if (
        createContactDto.firstName &&
        createContactDto.firstName.length > 50
      ) {
        throw new BadRequestException(
          'Le prénom ne peut pas dépasser 50 caractères',
        );
      }

      if (createContactDto.lastName && createContactDto.lastName.length > 50) {
        throw new BadRequestException(
          'Le nom ne peut pas dépasser 50 caractères',
        );
      }

      if (!createContactDto.email)
        throw new BadRequestException("L'email est requis");
      if (!createContactDto.message)
        throw new BadRequestException('Le message est requis');
      if (createContactDto.message.length < 10)
        throw new BadRequestException(
          'Le message doit contenir au moins 10 caractères',
        );
      if (createContactDto.message.length > 2000)
        throw new BadRequestException(
          'Le message ne peut pas dépasser 2000 caractères',
        );

      const contact = await this.contactsRepository.create({
        firstName: createContactDto.firstName || '',
        lastName: createContactDto.lastName || '',
        email: createContactDto.email.toLowerCase(),
        message: createContactDto.message,
        isRead: false,
      });

      // Envoyer un email de confirmation à l'utilisateur
      await this.emailQueue.add('send-email', {
        to: contact.email,
        subject: 'Confirmation de réception de votre message',
        html: this.mailService.generateContactConfirmationContent({
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          message: contact.message,
        }),
        priority: 'normal',
      });

      // Envoyer une notification à l'admin
      await this.emailQueue.add('send-email', {
        to: this.configService.get<string>('EMAIL_USER'),
        subject: `Nouveau message de contact: ${contact.firstName} ${contact.lastName}`,
        html: this.mailService.generateContactNotificationContent({
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          email: contact.email,
          message: contact.message,
          createdAt: contact.createdAt,
        }),
        priority: 'high',
      });

      this.logger.log(`Message de contact créé`);

      return this.toResponseDto(contact);
    } catch (error: unknown) {
      const validationError = error as { name?: string; errors?: any[] };
      if (validationError.name === 'ValidationError') {
        throw new BadRequestException({
          message: 'Erreur de validation',
          errors: validationError.errors,
        });
      }

      this.logger.error(`Erreur lors de la création du contact`);

      throw new BadRequestException({
        message: 'Erreur lors de la création du message de contact',
        errors: [
          {
            field: 'general',
            message: 'Une erreur est survenue, veuillez réessayer',
          },
        ],
      });
    }
  }

  /**
   * Répondre à un message de contact (Admin seulement)
   */
  async respond(
    id: string,
    respondContactDto: RespondContactDto,
  ): Promise<ContactResponseDto> {
    const contact = await this.contactsRepository.findById(id);

    if (!contact) {
      this.logger.warn(`Tentative de réponse à un contact inexistant`);
      throw new NotFoundException('Message de contact non trouvé');
    }

    if (contact.adminResponse) {
      throw new BadRequestException('Ce message a déjà reçu une réponse');
    }

    const updatedContact = await this.contactsRepository.update(id, {
      adminResponse: respondContactDto.response,
      respondedAt: new Date(),
      isRead: true,
    });

    const updatedContactDto = this.toResponseDto(updatedContact);

    // Envoyer un email de réponse à l'utilisateur
    await this.emailQueue.add('send-email', {
      to: contact.email,
      subject: 'Réponse à votre message de contact',
      html: this.mailService.generateContactReplyContent(
        {
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
        },
        respondContactDto.response,
      ),
      priority: 'normal',
    });

    this.logger.log(`Réponse envoyée pour le contact`);

    return updatedContactDto;
  }

  /**
   * Marquer un message comme lu (Admin seulement)
   */
  async markAsRead(id: string, isRead: boolean): Promise<ContactResponseDto> {
    const contact = await this.contactsRepository.findById(id, true);

    if (!contact) {
      this.logger.warn(`Tentative de marquage d'un contact inexistant`);
      throw new NotFoundException('Message de contact non trouvé');
    }

    // Soft delete permissif - autoriser la modification même si supprimé
    if (contact.deletedAt) {
      const updatedContact = await this.contactsRepository.update(id, {
        isRead,
      });
      this.logger.log(`Message marqué comme ${isRead ? 'lu' : 'non lu'}`);
      const responseDto = this.toResponseDto(updatedContact);
      return responseDto as ContactResponseDto & { warning?: string };
    }

    const updatedContact = await this.contactsRepository.update(id, { isRead });

    this.logger.log(`Message marqué comme ${isRead ? 'lu' : 'non lu'}`);

    return this.toResponseDto(updatedContact);
  }

  /**
   * Marquer tous les messages comme lus (Admin seulement)
   */
  async markAllAsRead(): Promise<{ count: number }> {
    const count = await this.contactsRepository.markAllAsRead();

    this.logger.log(`Tous les messages marqués comme lus`);

    return { count };
  }

  /**
   * Supprimer un message de contact (Admin seulement)
   */
  async remove(
    id: string,
    _currentUser: CurrentUserType,
    permanent = false,
  ): Promise<void> {
    // Pour la suppression définitive, on doit chercher même les messages supprimés
    const contact = await this.contactsRepository.findById(id, true);

    if (!contact) {
      this.logger.warn(`Tentative de suppression d'un contact inexistant`);
      throw new NotFoundException('Message de contact non trouvé');
    }

    if (permanent) {
      await this.contactsRepository.hardDelete(id);
      this.logger.log(`Message de contact supprimé`);
    } else {
      await this.contactsRepository.softDelete(id);
      this.logger.log(`Message de contact supprimé`);
    }
  }

  /**
   * Obtenir tous les messages (Admin seulement)
   */
  async findAll(query: ContactQueryDto): Promise<{
    data: ContactResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount: number;
  }> {
    const {
      page = 1,
      limit = 10,
      isRead,
      email,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      showDeleted = false,
      isReplied,
    } = query;

    const skip = (page - 1) * limit;
    const where: Prisma.ContactWhereInput = {};

    if (isRead !== undefined) where.isRead = isRead;
    if (email) where.email = { contains: email, mode: 'insensitive' };
    if (isReplied !== undefined) {
      where.adminResponse = isReplied ? { not: null } : null;
    }

    // Gestion du filtre showDeleted
    if (!showDeleted) {
      where.deletedAt = null;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const contacts = await this.contactsRepository.findAll({
      skip,
      take: limit,
      where,
      orderBy: { [sortBy]: sortOrder },
      includeDeleted: showDeleted,
    });

    const total = await this.contactsRepository.count(where, showDeleted);
    const unreadContacts = await this.contactsRepository.findUnread();
    const totalPages = Math.ceil(total / limit);

    return {
      data: contacts.map((contact) => this.toResponseDto(contact)),
      total,
      page,
      limit,
      totalPages,
      unreadCount: unreadContacts.length,
    };
  }

  /**
   * Obtenir un message par son ID (Admin seulement)
   */
  async findById(id: string): Promise<ContactResponseDto> {
    const contact = await this.contactsRepository.findById(id);

    if (!contact) {
      this.logger.warn(`Tentative d'accès à un contact inexistant`);
      throw new NotFoundException('Message de contact non trouvé');
    }

    return this.toResponseDto(contact);
  }

  /**
   * Statistiques des messages (Admin seulement)
   */
  async getStatistics(): Promise<{
    total: number;
    unread: number;
    responded: number;
    pending: number;
    responseRate: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  }> {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, unread, responded, today, thisWeek, thisMonth] =
      await Promise.all([
        this.contactsRepository.count(),
        this.contactsRepository.count({ isRead: false }),
        this.contactsRepository.count({ adminResponse: { not: null } }),
        this.contactsRepository.countCreatedSince(startOfDay),
        this.contactsRepository.countCreatedSince(startOfWeek),
        this.contactsRepository.countCreatedSince(startOfMonth),
      ]);

    const pending = total - responded;
    const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;

    return {
      total,
      unread,
      responded,
      pending,
      responseRate,
      today,
      thisWeek,
      thisMonth,
    };
  }

  /**
   * Nombre de messages non lus (Admin seulement)
   */
  async getUnreadCount(): Promise<{ count: number }> {
    const unreadContacts = await this.contactsRepository.findUnread();
    return { count: unreadContacts.length };
  }

  // ==================== PRIVÉ ====================

  private toResponseDto(contact: Contact): ContactResponseDto {
    return {
      id: contact.id,
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      fullName:
        `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
        'Anonyme',
      email: contact.email, // ← Email en clair pour les admins
      message: contact.message,
      isRead: contact.isRead,
      adminResponse: contact.adminResponse,
      respondedAt: contact.respondedAt,
      respondedBy: contact.respondedBy,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      userId: null,
    };
  }
}
