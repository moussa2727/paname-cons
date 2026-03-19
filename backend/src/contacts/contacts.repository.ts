import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Contact, Prisma } from '@prisma/client';

@Injectable()
export class ContactsRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.ContactCreateInput): Promise<Contact> {
    return this.prisma.contact.create({
      data,
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ContactWhereUniqueInput;
    where?: Prisma.ContactWhereInput;
    orderBy?: Prisma.ContactOrderByWithRelationInput;
    includeDeleted?: boolean;
  }): Promise<Contact[]> {
    const {
      skip,
      take,
      cursor,
      where,
      orderBy,
      includeDeleted = false,
    } = params;
    return this.prisma.contact.findMany({
      skip,
      take,
      cursor,
      where: {
        ...where,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy,
    });
  }

  async findById(id: string, includeDeleted = false): Promise<Contact | null> {
    return this.prisma.contact.findFirst({
      where: {
        id,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
    });
  }

  async update(id: string, data: Prisma.ContactUpdateInput): Promise<Contact> {
    return this.prisma.contact.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async respond(
    id: string,
    data: {
      adminResponse: string;
      respondedBy: string;
      respondedAt: Date;
      isRead: boolean;
    },
  ): Promise<Contact> {
    return this.prisma.contact.update({
      where: { id },
      data: {
        adminResponse: data.adminResponse,
        respondedBy: data.respondedBy,
        respondedAt: data.respondedAt,
        isRead: data.isRead,
        updatedAt: new Date(),
      },
    });
  }

  async markAsRead(id: string): Promise<Contact> {
    return this.prisma.contact.update({
      where: { id },
      data: {
        isRead: true,
        updatedAt: new Date(),
      },
    });
  }

  async markAllAsRead(): Promise<number> {
    const result = await this.prisma.contact.updateMany({
      where: {
        isRead: false,
        deletedAt: null,
      },
      data: {
        isRead: true,
        updatedAt: new Date(),
      },
    });
    return result.count;
  }

  async softDelete(id: string): Promise<Contact> {
    return this.prisma.contact.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async hardDelete(id: string): Promise<Contact> {
    return this.prisma.contact.delete({
      where: { id },
    });
  }

  async count(
    where?: Prisma.ContactWhereInput,
    includeDeleted = false,
  ): Promise<number> {
    return this.prisma.contact.count({
      where: {
        ...where,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
    });
  }

  async countCreatedSince(date: Date): Promise<number> {
    return this.prisma.contact.count({
      where: {
        createdAt: { gte: date },
        deletedAt: null,
      },
    });
  }

  async findUnread(): Promise<Contact[]> {
    return this.prisma.contact.findMany({
      where: {
        isRead: false,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
