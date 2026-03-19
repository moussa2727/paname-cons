import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class CreateDestinationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  country: string; //  Correspond à country String @unique

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  text: string; // Correspond à text String

  @IsOptional()
  @IsString()
  imagePath?: string; //  Correspond à imagePath String
}
