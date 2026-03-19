import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Destination, DestinationEnum, Prisma } from '@prisma/client';

@Injectable()
export class DestinationsRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.DestinationCreateInput): Promise<Destination> {
    return this.prisma.destination.create({
      data,
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.DestinationWhereUniqueInput;
    where?: Prisma.DestinationWhereInput;
    orderBy?: Prisma.DestinationOrderByWithRelationInput;
    select?: Prisma.DestinationSelect;
  }): Promise<Destination[]> {
    const { skip, take, cursor, where, orderBy, select } = params;
    return this.prisma.destination.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      select,
    });
  }

  async findById(id: string): Promise<Destination | null> {
    return this.prisma.destination.findUnique({
      where: { id },
    });
  }

  async findByCountry(country: string): Promise<Destination | null> {
    return this.prisma.destination.findUnique({
      where: { country },
    });
  }

  async update(
    id: string,
    data: Prisma.DestinationUpdateInput,
  ): Promise<Destination> {
    return this.prisma.destination.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string): Promise<Destination> {
    return this.prisma.destination.delete({
      where: { id },
    });
  }

  async count(where?: Prisma.DestinationWhereInput): Promise<number> {
    return this.prisma.destination.count({
      where,
    });
  }

  async search(query: string): Promise<Destination[]> {
    return this.prisma.destination.findMany({
      where: {
        OR: [
          { country: { contains: query, mode: 'insensitive' } },
          { text: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { country: 'asc' },
      take: 10,
    });
  }

  async checkUsage(destinationId: string): Promise<number> {
    const destination = await this.prisma.destination.findUnique({
      where: { id: destinationId },
      select: { country: true },
    });

    if (!destination) return 0;

    const [rendezvousCount, proceduresCount] = await Promise.all([
      this.prisma.rendezvous.count({
        where: {
          OR: [
            { destination: destination.country as DestinationEnum },
            { destinationAutre: destination.country },
          ],
        },
      }),
      this.prisma.procedure.count({
        where: {
          OR: [
            { destination: destination.country as DestinationEnum },
            { destinationAutre: destination.country },
          ],
        },
      }),
    ]);

    return rendezvousCount + proceduresCount;
  }

  async countWithRendezvous(): Promise<number> {
    const destinations = await this.prisma.destination.findMany({
      select: { country: true },
    });

    let count = 0;
    for (const dest of destinations) {
      const usage = await this.prisma.rendezvous.count({
        where: {
          OR: [
            { destination: dest.country as DestinationEnum },
            { destinationAutre: dest.country },
          ],
        },
      });
      if (usage > 0) count++;
    }

    return count;
  }

  async countWithProcedures(): Promise<number> {
    const destinations = await this.prisma.destination.findMany({
      select: { country: true },
    });

    let count = 0;
    for (const dest of destinations) {
      const usage = await this.prisma.procedure.count({
        where: {
          OR: [
            { destination: dest.country as DestinationEnum },
            { destinationAutre: dest.country },
          ],
        },
      });
      if (usage > 0) count++;
    }

    return count;
  }

  async getMostPopular(limit: number = 5): Promise<any[]> {
    const rendezvousStats = await this.prisma.rendezvous.groupBy({
      by: ['destination'],
      _count: {
        destination: true,
      },
      orderBy: {
        _count: {
          destination: 'desc',
        },
      },
      take: limit,
    });

    const procedureStats = await this.prisma.procedure.groupBy({
      by: ['destination'],
      _count: {
        destination: true,
      },
      orderBy: {
        _count: {
          destination: 'desc',
        },
      },
      take: limit,
    });

    // Combiner les statistiques
    const combined: Record<
      string,
      {
        destination: string;
        rendezvous: number;
        procedures: number;
        total: number;
      }
    > = {};

    rendezvousStats.forEach((item) => {
      combined[item.destination] = {
        destination: item.destination,
        rendezvous: item._count.destination,
        procedures: 0,
        total: item._count.destination,
      };
    });

    procedureStats.forEach((item) => {
      const destinationName = item.destination;
      if (combined[destinationName]) {
        combined[destinationName].procedures = item._count.destination;
        combined[destinationName].total += item._count.destination;
      } else {
        combined[item.destination] = {
          destination: item.destination,
          rendezvous: 0,
          procedures: item._count.destination,
          total: item._count.destination,
        };
      }
    });

    return Object.values(combined)
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }
}
