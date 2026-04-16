import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RendezvousStatus } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const Holidays = require('date-holidays');

export const RENDEZVOUS_CONSTANTS = {
  LUNCH_BREAK: {
    START: '12:00',
    END: '14:00',
    EXCLUDED_SLOTS: ['12:30', '13:00', '13:30'],
    START_HOUR: 12,
    START_MINUTE: 30,
    END_HOUR: 14,
    END_MINUTE: 0,
  },

  TIME_SLOTS: {
    MORNING: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00'],
    AFTERNOON: ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30'],
    ALL: [
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '12:00',
      '14:00',
      '14:30',
      '15:00',
      '15:30',
      '16:00',
      '16:30',
    ],
  },

  VALIDATION_MESSAGES: {
    LUNCH_BREAK:
      "Ce créneau est pendant la pause déjeuner (12:00-14:00). Veuillez choisir un créneau le matin (09:00-12:00) ou l'après-midi (14:00-16:30).",
    INVALID_TIME:
      'Créneau horaire non disponible. Veuillez choisir parmi les créneaux suivants : matin (09:00-12:00) ou après-midi (14:00-16:30).',
  },
} as const;

interface HolidayItem {
  date: string;
  name: string;
  type: string;
}

interface HolidaysInstance {
  getHolidays(year: number): HolidayItem[];
}

type HolidaysConstructor = new (country?: string) => HolidaysInstance;

export interface TimeSlot {
  time: string;
  available: boolean;
  isPast?: boolean;
  isLunchBreak?: boolean;
  isHoliday?: boolean;
  isWeekend?: boolean;
}

export interface HolidayInfo {
  date: string;
  name: string;
  type: string;
}

@Injectable()
export class HolidaysService {
  private readonly logger = new Logger(HolidaysService.name);
  private holidays: HolidaysInstance | null;
  private cachedHolidays = new Map<string, HolidayInfo[]>();

  private readonly MAX_SLOTS_PER_DAY = 24;

  private readonly FIXED_HOLIDAYS = [
    { date: '01-01', name: 'Nouvel An' },
    { date: '01-20', name: "Fête de l'Armée" },
    { date: '03-26', name: 'Journée des Martyrs' },
    { date: '05-01', name: 'Fête du Travail' },
    { date: '05-25', name: "Journée de l'Afrique" },
    { date: '09-22', name: "Fête de l'Indépendance" },
    { date: '12-25', name: 'Noël' },
  ];

  constructor(
    @Inject(forwardRef(() => PrismaService))
    private prisma: PrismaService,
  ) {
    this.initializeHolidays();
  }

  private initializeHolidays(): void {
    try {
      this.holidays = new (Holidays as HolidaysConstructor)('ML');
      this.holidays.getHolidays(new Date().getFullYear());
    } catch (error: unknown) {
      this.logger.error(
        error as Error,
        "Erreur d'initialisation de date-holidays",
      );
      this.holidays = null;
    }
  }

  public getHolidaysForYear(year: number): HolidayInfo[] {
    const cacheKey = year.toString();

    if (this.cachedHolidays.has(cacheKey)) {
      return this.cachedHolidays.get(cacheKey);
    }

    const holidays: HolidayInfo[] = [];

    try {
      if (this.holidays) {
        const holidaysList = this.holidays.getHolidays(year);

        if (holidaysList && Array.isArray(holidaysList)) {
          holidays.push(
            ...holidaysList
              .filter((holiday) => holiday.type === 'public')
              .map((holiday) => {
                const date = new Date(holiday.date);
                return {
                  date: date.toISOString().split('T')[0],
                  name: holiday.name,
                  type: 'mobile',
                };
              }),
          );
        }
      }

      this.FIXED_HOLIDAYS.forEach((fixed) => {
        const dateStr = `${year}-${fixed.date}`;
        if (!holidays.some((h) => h.date === dateStr)) {
          holidays.push({
            date: dateStr,
            name: fixed.name,
            type: 'fixed',
          });
        }
      });

      holidays.sort((a, b) => a.date.localeCompare(b.date));
      this.cachedHolidays.set(cacheKey, holidays);

      return holidays;
    } catch (error: unknown) {
      this.logger.error(
        error as Error,
        `Erreur lors de la récupération des jours fériés pour ${year}`,
      );

      const fallbackHolidays = this.FIXED_HOLIDAYS.map((fixed) => ({
        date: `${year}-${fixed.date}`,
        name: fixed.name,
        type: 'fixed',
      }));

      this.cachedHolidays.set(cacheKey, fallbackHolidays);
      return fallbackHolidays;
    }
  }

  public isHoliday(dateStr: string): boolean {
    try {
      const year = new Date(dateStr).getFullYear();
      const holidays = this.getHolidaysForYear(year);
      return holidays.some((h) => h.date === dateStr);
    } catch {
      return false;
    }
  }

  public getHolidayName(dateStr: string): string | null {
    try {
      const year = new Date(dateStr).getFullYear();
      const holidays = this.getHolidaysForYear(year);
      const holiday = holidays.find((h) => h.date === dateStr);
      return holiday?.name || null;
    } catch {
      return null;
    }
  }

  public isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  public isToday(dateStr: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  }

  public isPastTimeSlot(dateStr: string, timeStr: string): boolean {
    const slotDateTime = new Date(`${dateStr}T${timeStr}:00`);
    return slotDateTime < new Date();
  }

  public isDateAvailable(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const dateStr = dateObj.toISOString().split('T')[0];
    return !this.isWeekend(dateObj) && !this.isHoliday(dateStr);
  }

  public generateAllTimeSlots(): string[] {
    const slots: string[] = [];

    for (let hour = 9; hour <= 12; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);

      if (hour < 12) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }

    for (let hour = 14; hour <= 16; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }

    return slots;
  }

  public async getOccupiedSlotsFromDB(
    dateStr: string,
    excludeId?: string,
  ): Promise<string[]> {
    const rendezvous = await this.prisma.rendezvous.findMany({
      where: {
        date: dateStr,
        status: {
          not: RendezvousStatus.CANCELLED,
        },
        NOT: excludeId ? { id: excludeId } : undefined,
      },
      select: { time: true },
    });

    return rendezvous.map((rdv) => rdv.time as string);
  }

  public async getAvailableTimeSlotsWithMetadata(
    date: Date,
    excludeId?: string,
  ): Promise<TimeSlot[]> {
    if (!this.isDateAvailable(date)) {
      return [];
    }

    const dateStr = date.toISOString().split('T')[0];
    const allSlots = this.generateAllTimeSlots();
    const occupiedSlots = await this.getOccupiedSlotsFromDB(dateStr, excludeId);
    const isToday = this.isToday(dateStr);

    return allSlots.map((time) => {
      const isPast = isToday && this.isPastTimeSlot(dateStr, time);
      const isLunchBreak = this.isLunchBreakTime(time);

      return {
        time,
        available: !occupiedSlots.includes(time) && !isPast && !isLunchBreak,
        isPast,
        isLunchBreak,
      };
    });
  }

  public async getAvailableTimeSlots(
    date: Date,
    existingRendezvous?: { time: string }[],
  ): Promise<string[]> {
    if (!this.isDateAvailable(date)) {
      return [];
    }

    const dateStr = date.toISOString().split('T')[0];
    const allSlots = this.generateAllTimeSlots();
    const validSlots = allSlots.filter((slot) => this.isValidTimeSlot(slot));

    if (!existingRendezvous) {
      const slotsWithMetadata =
        await this.getAvailableTimeSlotsWithMetadata(date);
      return slotsWithMetadata
        .filter((slot) => slot.available)
        .map((slot) => slot.time);
    }

    const takenTimeSlots = existingRendezvous.map((rdv) => rdv.time);
    const isToday = this.isToday(dateStr);

    return validSlots.filter((slot) => {
      const isTaken = takenTimeSlots.includes(slot);
      const isPast = isToday && this.isPastTimeSlot(dateStr, slot);
      return !isTaken && !isPast;
    });
  }

  private isLunchBreakTime(time: string): boolean {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours === 12 && minutes >= 30) || hours === 13;
  }

  public isValidTimeSlot(time: string): boolean {
    return !this.isLunchBreakTime(time);
  }

  public async getAvailableDates(
    startDate: Date,
    endDate: Date,
  ): Promise<string[]> {
    const availableDates: string[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];

      if (this.isDateAvailable(currentDate)) {
        const count = await this.prisma.rendezvous.count({
          where: {
            date: dateStr,
            status: {
              not: RendezvousStatus.CANCELLED,
            },
          },
        });

        if (count < this.MAX_SLOTS_PER_DAY) {
          availableDates.push(dateStr);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return availableDates;
  }

  public getCurrentYearHolidays(): HolidayInfo[] {
    return this.getHolidaysForYear(new Date().getFullYear());
  }

  public canBeCancelled(rendezvousDate: Date, rendezvousTime: string): boolean {
    const rendezvousDateTime = new Date(
      `${this.formatDate(rendezvousDate)}T${rendezvousTime}:00`,
    );
    const hoursDifference =
      (rendezvousDateTime.getTime() - new Date().getTime()) / (1000 * 60 * 60);

    return hoursDifference > 2;
  }

  public formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  public parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  public getDayOfWeek(date: Date): string {
    const days = [
      'dimanche',
      'lundi',
      'mardi',
      'mercredi',
      'jeudi',
      'vendredi',
      'samedi',
    ];
    return days[date.getDay()];
  }
}
