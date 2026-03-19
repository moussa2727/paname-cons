import { Module } from '@nestjs/common';
import { DestinationController } from './destinations.controller';
import { DestinationService } from './destinations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';
import { DestinationsRepository } from './destinations.repository';

@Module({
  imports: [PrismaModule, UploadModule, CloudinaryModule],
  controllers: [DestinationController],
  providers: [DestinationService, DestinationsRepository],
  exports: [DestinationService, DestinationsRepository],
})
export class DestinationsModule {}
