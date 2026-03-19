import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../enums/user-role.enum';
import { QueueService, QueueStatistics } from './queue.service';

@ApiTags('Queue Management')
@Controller('admin/queues')
@Roles(UserRole.ADMIN)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  @ApiOperation({ summary: 'Obtenir les statistiques de toutes les queues' })
  @ApiResponse({
    status: 200,
    description: 'Statistiques des queues récupérées avec succès',
  })
  async getQueues(): Promise<QueueStatistics[]> {
    return await this.queueService.getAllQueues();
  }

  @Get(':name')
  @ApiOperation({ summary: "Obtenir les statistiques d'une queue spécifique" })
  @ApiResponse({
    status: 200,
    description: 'Statistiques de la queue récupérées avec succès',
  })
  async getQueue(@Param('name') name: string): Promise<QueueStatistics> {
    const stats = await this.queueService.getQueueByName(name);
    if (!stats) {
      throw new Error(`Queue ${name} not found`);
    }
    return stats;
  }

  @Post(':name/pause')
  @ApiOperation({ summary: 'Mettre en pause une queue' })
  @ApiResponse({ status: 200, description: 'Queue mise en pause avec succès' })
  async pauseQueue(@Param('name') name: string) {
    await this.queueService.pauseQueue(name);
    return { message: `Queue ${name} paused` };
  }

  @Post(':name/resume')
  @ApiOperation({ summary: 'Reprendre une queue' })
  @ApiResponse({ status: 200, description: 'Queue reprise avec succès' })
  async resumeQueue(@Param('name') name: string) {
    await this.queueService.resumeQueue(name);
    return { message: `Queue ${name} resumed` };
  }

  @Delete(':name/clean')
  @ApiOperation({ summary: 'Nettoyer une queue' })
  @ApiResponse({ status: 200, description: 'Queue nettoyée avec succès' })
  async cleanQueue(@Param('name') name: string) {
    const cleaned = await this.queueService.cleanQueue(name, 'completed');
    await this.queueService.cleanQueue(name, 'failed');
    return { message: `Queue ${name} cleaned`, cleaned };
  }
}
