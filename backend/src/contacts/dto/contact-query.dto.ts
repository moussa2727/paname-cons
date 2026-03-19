import {
  IsOptional,
  IsBoolean,
  IsString,
  IsInt,
  Min,
  IsEmail,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ContactQueryDto {
  @ApiProperty({ required: false, type: Number, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ required: false, type: Number, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({ required: false, type: Boolean })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isRead?: boolean;

  @ApiProperty({ required: false, type: String })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, type: String })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, type: String })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false, type: String })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ required: false, type: String, default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({ required: false, enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiProperty({ required: false, type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  showDeleted?: boolean = false;

  @ApiProperty({ required: false, type: Boolean })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isReplied?: boolean;
}
