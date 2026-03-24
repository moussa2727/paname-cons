import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue, Job, JobStatusClean } from 'bull';
import {
  EmailJobData,
  NotificationJobData,
  ProcedureJobData,
} from '../interfaces/queue.interface';

export interface QueueJobStats {
  id: string | number;
  name?: string;
  data: Record<string, unknown>;
  opts?: unknown;
  progress?: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
}

export interface QueueStatistics {
  name: string;
  counts: any;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  jobs: QueueJobStats[];
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('notification') private notificationQueue: Queue,
    @InjectQueue('procedure') private procedureQueue: Queue,
    @InjectQueue('backup') private backupQueue: Queue,
    @InjectQueue('report') private reportQueue: Queue,
    @InjectQueue('rendezvous') private rendezvousQueue: Queue,
  ) {}

  // ==================== EMAIL QUEUE ====================

  async addEmailJob(data: EmailJobData, delay?: number): Promise<string> {
    try {
      // Déduplication via jobId stable stocké dans Redis — survit aux redémarrages
      // et fonctionne en multi-instance contrairement au Map en mémoire
      const jobId = this.generateEmailJobId(data);

      const existing = await this.emailQueue.getJob(jobId);
      if (existing) {
        const state = await existing.getState();
        if (state === 'waiting' || state === 'active') {
          this.logger.log('Email job déjà en queue, ignoré');
          return existing.id.toString();
        }
      }

      const job = await this.emailQueue.add('send-email', data, {
        jobId,
        delay,
        priority:
          data.priority === 'high' ? 1 : data.priority === 'normal' ? 2 : 3,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      });

      this.logger.log('Email job ajouté');
      return job.id.toString();
    } catch (error: unknown) {
      this.logger.error('Erreur ajout email job');
      throw error;
    }
  }

  async forceAddEmailJob(data: EmailJobData, delay?: number): Promise<string> {
    try {
      const job = await this.emailQueue.add('send-email', data, {
        delay,
        priority:
          data.priority === 'high' ? 1 : data.priority === 'normal' ? 2 : 3,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      });

      this.logger.log('Email job forcé ajouté');
      return job.id.toString();
    } catch (error: unknown) {
      this.logger.error('Erreur ajout email job forcé');
      throw error;
    }
  }

  private generateEmailJobId(data: EmailJobData): string {
    const to = Array.isArray(data.to) ? data.to.join(',') : data.to;
    // Clé stable basée sur destinataire + sujet + heure arrondie à la minute
    // Évite les doublons sur retry rapide sans bloquer les envois légitimes
    const minuteSlot = Math.floor(Date.now() / 60_000);
    const raw = `${to}-${data.subject}-${minuteSlot}`;
    return `email-${raw.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 128)}`;
  }

  async addBulkEmailJobs(jobs: EmailJobData[]): Promise<void> {
    const bulkJobs = jobs.map((job) => ({
      name: 'send-email',
      data: job,
      opts: {
        priority: job.priority === 'high' ? 1 : 2,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    }));

    await this.emailQueue.addBulk(bulkJobs);
    this.logger.log(`${jobs.length} emails bulk ajoutés`);
  }

  // ==================== NOTIFICATION QUEUE ====================

  async addNotificationJob(data: NotificationJobData): Promise<string> {
    const job = await this.notificationQueue.add('send-notification', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    this.logger.log('Notification job ajouté');
    return job.id.toString();
  }

  // ==================== PROCEDURE QUEUE ====================

  async addProcedureJob(
    data: ProcedureJobData,
    delay?: number,
  ): Promise<string> {
    const job = await this.procedureQueue.add('process-procedure', data, {
      delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    this.logger.log('Procedure job ajouté');
    return job.id.toString();
  }

  // ==================== BACKUP QUEUE ====================

  async scheduleBackup(type: 'full' | 'incremental'): Promise<string> {
    const job = await this.backupQueue.add(
      'run-backup',
      { type },
      {
        delay: 1000 * 60 * 60,
        attempts: 5,
        backoff: { type: 'exponential', delay: 60000 },
      },
    );

    this.logger.log(`Backup ${type} programmé`);
    return job.id.toString();
  }

  // ==================== REPORT QUEUE ====================

  async generateReport(reportType: string, params: any): Promise<string> {
    const job = await this.reportQueue.add(
      'generate-report',
      {
        type: reportType,
        params: params as Record<string, unknown>,
        generatedAt: new Date(),
      },
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    this.logger.log(`Report job ajouté - ${reportType}`);
    return job.id.toString();
  }

  // ==================== QUEUE STATISTICS ====================

  async getAllQueues(): Promise<QueueStatistics[]> {
    const queues: QueueStatistics[] = [];
    const queueNames = [
      'email',
      'notification',
      'procedure',
      'backup',
      'report',
      'rendezvous',
    ];

    for (const queueName of queueNames) {
      const queue = this.getQueue(queueName);
      if (queue) {
        const stats = await this.getQueueStats(queue, queueName);
        if (stats) {
          queues.push(stats);
        }
      }
    }

    return queues;
  }

  async getQueueByName(queueName: string) {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    return this.getQueueStats(queue, queueName);
  }

  private async getQueueStats(
    queue: Queue,
    name: string,
  ): Promise<QueueStatistics | null> {
    if (!queue) return null;

    try {
      const [counts, waiting, active, completed, failed] = await Promise.all([
        queue.getJobCounts(),
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
      ]);

      const transformJob = (job: Job<any>): QueueJobStats => {
        let progressValue: number | undefined;
        try {
          const progress = job.progress() as unknown;
          progressValue =
            typeof progress === 'number'
              ? progress
              : typeof progress === 'object' &&
                  progress !== null &&
                  'value' in progress &&
                  typeof (progress as { value?: unknown }).value === 'number'
                ? (progress as { value: number }).value
                : undefined;
          progressValue = typeof progress === 'number' ? progress : undefined;
        } catch {
          progressValue = undefined;
        }

        return {
          id: job.id,
          name: job.name,
          data: job.data as Record<string, unknown>,
          opts: job.opts as unknown,
          progress: progressValue,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          failedReason: job.failedReason,
        };
      };

      return {
        name,
        counts,
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        jobs: [
          ...waiting.slice(0, 10).map(transformJob),
          ...active.map(transformJob),
          ...completed.slice(-10).map(transformJob),
          ...failed.slice(-10).map(transformJob),
        ],
      };
    } catch (error) {
      this.logger.error(`Error getting stats for queue ${name}:`, error);
      return null;
    }
  }

  // ==================== UTILS ====================

  async getJobStatus(
    queueName: string,
    jobId: string,
  ): Promise<{
    id: string | number;
    state: string;
    progress: number;
    data: Record<string, unknown>;
    attempts: number;
    timestamp: number;
    finishedOn?: number;
    failedReason?: string;
    processedOn?: number;
  } | null> {
    const queue = this.getQueue(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);

    const jobData = (await queue.getJob(jobId)) as Job<
      Record<string, unknown>
    > | null;
    if (!jobData) return null;

    const state = await jobData.getState();
    const progress = jobData.progress() as number;

    let jobDataRecord: Record<string, unknown>;
    if (typeof jobData.data === 'object' && jobData.data !== null) {
      jobDataRecord = jobData.data;
    } else {
      jobDataRecord = {};
    }

    return {
      id: jobData.id,
      state,
      progress,
      data: jobDataRecord,
      attempts: jobData.attemptsMade,
      timestamp: jobData.timestamp,
      finishedOn: jobData.finishedOn,
      failedReason: jobData.failedReason,
    };
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
    this.logger.log(`Queue ${queueName} mise en pause`);
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
    this.logger.log(`Queue ${queueName} reprise`);
  }

  async cleanQueue(
    queueName: string,
    status: 'completed' | 'failed' | 'delayed',
  ): Promise<number> {
    const queue = this.getQueue(queueName);
    const jobs = await queue.clean(0, status as JobStatusClean);
    const count = Array.isArray(jobs) ? jobs.length : 0;
    this.logger.log(`${count} jobs ${status} nettoyés de ${queueName}`);
    return count;
  }

  private getQueue(name: string): Queue {
    const queues: Record<string, Queue> = {
      email: this.emailQueue,
      notification: this.notificationQueue,
      procedure: this.procedureQueue,
      backup: this.backupQueue,
      report: this.reportQueue,
      rendezvous: this.rendezvousQueue,
    };
    return queues[name];
  }
}
