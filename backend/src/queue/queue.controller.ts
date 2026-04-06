import { Controller, Get, Post, Param, Delete, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../enums/user-role.enum';
import { QueueService, QueueStatistics } from './queue.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UseGuards } from '@nestjs/common';

@ApiTags('Queue Management')
@Controller('admin/queues')
@Roles(UserRole.ADMIN)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('/all')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtenir les statistiques de toutes les queues' })
  @ApiResponse({
    status: 200,
    description: 'Statistiques des queues récupérées avec succès',
  })
  async getQueues(): Promise<QueueStatistics[]> {
    return await this.queueService.getAllQueues();
  }

  @Get(':name')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mettre en pause une queue' })
  @ApiResponse({ status: 200, description: 'Queue mise en pause avec succès' })
  async pauseQueue(@Param('name') name: string) {
    await this.queueService.pauseQueue(name);
    return { message: `Queue ${name} paused` };
  }

  @Post(':name/resume')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reprendre une queue' })
  @ApiResponse({ status: 200, description: 'Queue reprise avec succès' })
  async resumeQueue(@Param('name') name: string) {
    await this.queueService.resumeQueue(name);
    return { message: `Queue ${name} resumed` };
  }

  @Delete(':name/clean')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Nettoyer une queue' })
  @ApiResponse({ status: 200, description: 'Queue nettoyée avec succès' })
  async cleanQueue(@Param('name') name: string) {
    const cleaned = await this.queueService.cleanQueue(name, 'completed');
    await this.queueService.cleanQueue(name, 'failed');
    return { message: `Queue ${name} cleaned`, cleaned };
  }
}
