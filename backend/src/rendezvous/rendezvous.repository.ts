import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Rendezvous,
  User,
  Procedure,
  Prisma,
  RendezvousStatus,
  AdminOpinion,
  CancelledBy,
  TimeSlot,
} from '@prisma/client';
import { HolidaysService } from '../holidays/holidays.service';

@Injectable()
export class RendezvousRepository {
  constructor(
    private prisma: PrismaService,
    private holidaysService: HolidaysService,
  ) {}

  async create(data: Prisma.RendezvousCreateInput): Promise<Rendezvous> {
    return this.prisma.rendezvous.create({
      data,
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.RendezvousWhereUniqueInput;
    where?: Prisma.RendezvousWhereInput;
    orderBy?: Prisma.RendezvousOrderByWithRelationInput;
    include?: Prisma.RendezvousInclude;
  }): Promise<Rendezvous[]> {
    const { skip, take, cursor, where, orderBy, include } = params;
    return this.prisma.rendezvous.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include,
    });
  }

  async findById(
    id: string,
    include?: Prisma.RendezvousInclude,
  ): Promise<(Rendezvous & { user?: User; procedure?: Procedure }) | null> {
    return this.prisma.rendezvous.findUnique({
      where: { id },
      include,
    });
  }

  async findByEmail(email: string): Promise<Rendezvous[]> {
    return this.prisma.rendezvous.findMany({
      where: { email },
      orderBy: { date: 'desc' },
    });
  }

  async findByDate(date: string): Promise<Rendezvous[]> {
    return this.prisma.rendezvous.findMany({
      where: { date },
      orderBy: { time: 'asc' },
    });
  }

  async update(
    id: string,
    data: Prisma.RendezvousUpdateInput,
  ): Promise<Rendezvous> {
    return this.prisma.rendezvous.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async cancel(
    id: string,
    reason: string,
    cancelledBy: CancelledBy,
  ): Promise<Rendezvous> {
    return this.prisma.rendezvous.update({
      where: { id },
      data: {
        status: RendezvousStatus.CANCELLED,
        cancellationReason: reason,
        cancelledBy: cancelledBy,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async complete(id: string, avisAdmin: AdminOpinion): Promise<Rendezvous> {
    return this.prisma.rendezvous.update({
      where: { id },
      data: {
        status: RendezvousStatus.COMPLETED,
        avisAdmin,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string): Promise<Rendezvous> {
    return this.prisma.rendezvous.delete({
      where: { id },
    });
  }

  async count(where?: Prisma.RendezvousWhereInput): Promise<number> {
    return this.prisma.rendezvous.count({
      where,
    });
  }

  async countDateRange(startDate: string, endDate: string): Promise<number> {
    return this.prisma.rendezvous.count({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
  }

  async checkAvailability(
    date: string,
    time: TimeSlot,
    excludeId?: string,
  ): Promise<boolean> {
    const existing = await this.prisma.rendezvous.findFirst({
      where: {
        date,
        time,
        status: {
          notIn: [RendezvousStatus.CANCELLED],
        },
        NOT: excludeId ? { id: excludeId } : undefined,
      },
    });

    if (existing) {
      return false;
    }

    const timeStr = String(time);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const isLunchBreak = (hours === 12 && minutes >= 30) || hours === 13;

    if (isLunchBreak) {
      return false;
    }

    const dateObj = new Date(date);
    const isWeekend = this.holidaysService.isWeekend(dateObj);
    const isHoliday = this.holidaysService.isHoliday(date);

    return !isWeekend && !isHoliday;
  }

  async findBookedSlots(date: string): Promise<TimeSlot[]> {
    const bookings = await this.prisma.rendezvous.findMany({
      where: {
        date,
        status: {
          notIn: [RendezvousStatus.CANCELLED],
        },
      },
      select: { time: true },
    });
    return bookings.map((b) => b.time);
  }

  async getTopDestinations(limit: number = 5): Promise<any[]> {
    const results = await this.prisma.rendezvous.groupBy({
      by: ['destination'],
      _count: {
        destination: true,
      },
      where: {
        status: {
          notIn: [RendezvousStatus.CANCELLED],
        },
      },
      orderBy: {
        _count: {
          destination: 'desc',
        },
      },
      take: limit,
    });

    return results.map((r) => ({
      destination: r.destination,
      count: r._count.destination,
    }));
  }

  async findUpcomingReminders(hoursBefore: number = 24): Promise<Rendezvous[]> {
    const targetDate = new Date(Date.now() + hoursBefore * 60 * 60 * 1000);
    const targetDateStr = targetDate.toISOString().split('T')[0];
    const targetTimeStr = targetDate
      .toTimeString()
      .split(' ')[0]
      .substring(0, 5);

    return this.prisma.rendezvous.findMany({
      where: {
        date: targetDateStr,
        time: targetTimeStr as TimeSlot,
        status: RendezvousStatus.CONFIRMED,
      },
    });
  }
}
