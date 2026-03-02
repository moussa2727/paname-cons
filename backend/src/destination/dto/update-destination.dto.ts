// update-destination.dto.ts (corrigé)
import { PartialType } from '@nestjs/swagger';
import { CreateDestinationDto } from './create-destination.dto';

// Étendre le DTO pour inclure imagePath optionnel
export class UpdateDestinationDto extends PartialType(CreateDestinationDto) {
  imagePath?: string;
  
}