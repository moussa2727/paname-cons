import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadController } from './upload.controller';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';

@Module({
  imports: [ConfigModule, CloudinaryModule],
  controllers: [UploadController],
})
export class UploadModule {}
