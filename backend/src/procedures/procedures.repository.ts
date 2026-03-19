import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Procedure,
  Step,
  Rendezvous,
  User,
  Prisma,
  StepStatus,
  ProcedureStatus,
} from '@prisma/client';

@Injectable()
export class ProceduresRepository {
  constructor(private prisma: PrismaService) {}

  async create(
    data: Prisma.ProcedureCreateInput & {
      steps?: Prisma.StepCreateWithoutProcedureInput[];
    },
  ): Promise<Procedure & { steps: Step[] }> {
    return this.prisma.procedure.create({
      data: {
        ...data,
        steps: data.steps
          ? {
              create: data.steps,
            }
          : undefined,
      },
      include: {
        steps: true,
      },
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ProcedureWhereUniqueInput;
    where?: Prisma.ProcedureWhereInput;
    orderBy?: Prisma.ProcedureOrderByWithRelationInput;
    include?: Prisma.ProcedureInclude;
  }): Promise<Procedure[]> {
    const { skip, take, cursor, where, orderBy, include } = params;
    return this.prisma.procedure.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: include || {
        steps: true,
      },
    });
  }

  async findById(
    id: string,
    include?: Prisma.ProcedureInclude,
    includeDeleted: boolean = false,
  ): Promise<
    | (Procedure & {
        steps?: Step[];
        rendezVous?: Rendezvous | null;
        user?: User | null;
      })
    | null
  > {
    const where: Prisma.ProcedureWhereInput = { id };
    if (!includeDeleted) {
      where.isDeleted = false;
    }

    return this.prisma.procedure.findFirst({
      where: where,
      include: include || {
        steps: true,
      },
    });
  }

  async findByRendezvousId(
    rendezVousId: string,
    include?: Prisma.ProcedureInclude,
  ): Promise<
    (Procedure & { steps?: Step[]; rendezVous?: Rendezvous | null }) | null
  > {
    return this.prisma.procedure.findFirst({
      where: { rendezVousId },
      include: include || {
        steps: true,
      },
    });
  }

  async findByUserEmail(
    email: string,
    include?: Prisma.ProcedureInclude,
  ): Promise<Procedure[]> {
    return this.prisma.procedure.findMany({
      where: {
        email,
        isDeleted: false,
      },
      include: include || {
        steps: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    id: string,
    data: Prisma.ProcedureUpdateInput,
  ): Promise<Procedure> {
    return this.prisma.procedure.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async updateStep(id: string, data: Prisma.StepUpdateInput): Promise<Step> {
    return this.prisma.step.update({
      where: { id },
      data,
    });
  }

  async addStep(
    procedureId: string,
    data: Prisma.StepCreateInput,
  ): Promise<Step> {
    return this.prisma.step.create({
      data: {
        ...data,
        procedure: {
          connect: { id: procedureId },
        },
      },
    });
  }

  async softDelete(id: string, reason?: string): Promise<Procedure> {
    return this.prisma.procedure.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletionReason: reason,
        updatedAt: new Date(),
      },
    });
  }

  async findDeleted(): Promise<Procedure[]> {
    return this.prisma.procedure.findMany({
      where: {
        isDeleted: true,
      },
      include: {
        steps: true,
      },
    });
  }

  async count(where?: Prisma.ProcedureWhereInput): Promise<number> {
    return this.prisma.procedure.count({
      where: {
        ...where,
      },
    });
  }

  async countCreatedSince(date: Date): Promise<number> {
    return this.prisma.procedure.count({
      where: {
        createdAt: { gte: date },
        isDeleted: false,
      },
    });
  }

  async getTopDestinations(limit: number = 5): Promise<any[]> {
    const results = await this.prisma.procedure.groupBy({
      by: ['destination'],
      _count: {
        destination: true,
      },
      where: {
        isDeleted: false,
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

  async updateGlobalStatus(
    procedureId: string,
  ): Promise<Procedure & { steps: Step[] }> {
    const procedure = await this.prisma.procedure.findUnique({
      where: { id: procedureId },
      include: { steps: true },
    });

    if (!procedure) {
      throw new Error('Procedure not found');
    }

    const steps = procedure.steps;
    if (!steps || steps.length === 0) {
      return this.prisma.procedure.update({
        where: { id: procedureId },
        data: { statut: ProcedureStatus.IN_PROGRESS },
        include: { steps: true },
      });
    }

    const allCompleted = steps.every(
      (step) => step.statut === StepStatus.COMPLETED,
    );
    const anyRejected = steps.some(
      (step) => step.statut === StepStatus.REJECTED,
    );
    const anyCancelled = steps.some(
      (step) => step.statut === StepStatus.CANCELLED,
    );

    // Règle stricte pour DEMANDE_ADMISSION
    const admissionStep = steps.find(
      (step) => step.nom === 'DEMANDE_ADMISSION',
    );

    if (
      admissionStep &&
      (admissionStep.statut === StepStatus.REJECTED ||
        admissionStep.statut === StepStatus.CANCELLED)
    ) {
      // Mettre à jour toutes les autres étapes
      await this.prisma.step.updateMany({
        where: {
          procedureId,
          nom: { not: 'DEMANDE_ADMISSION' },
        },
        data: {
          statut: admissionStep.statut,
          raisonRefus: admissionStep.raisonRefus,
          dateMaj: new Date(),
        },
      });

      // Mettre à jour la procédure
      return this.prisma.procedure.update({
        where: { id: procedureId },
        data: {
          statut:
            admissionStep.statut === StepStatus.REJECTED
              ? ProcedureStatus.REJECTED
              : ProcedureStatus.CANCELLED,
          raisonRejet: admissionStep.raisonRefus,
          dateCompletion: new Date(),
          dateDerniereModification: new Date(),
        },
        include: { steps: true },
      });
    }

    let newStatus: ProcedureStatus = ProcedureStatus.IN_PROGRESS;
    let raisonRejet: string | undefined;

    if (anyRejected) {
      newStatus = ProcedureStatus.REJECTED;
      const rejectedStep = steps.find(
        (step) => step.statut === StepStatus.REJECTED,
      );
      raisonRejet = rejectedStep?.raisonRefus || undefined;
    } else if (anyCancelled) {
      newStatus = ProcedureStatus.CANCELLED;
    } else if (allCompleted) {
      newStatus = ProcedureStatus.COMPLETED;
    }

    return this.prisma.procedure.update({
      where: { id: procedureId },
      data: {
        statut: newStatus,
        raisonRejet,
        dateCompletion:
          newStatus === ProcedureStatus.COMPLETED ? new Date() : undefined,
        dateDerniereModification: new Date(),
      },
      include: { steps: true },
    });
  }
}
