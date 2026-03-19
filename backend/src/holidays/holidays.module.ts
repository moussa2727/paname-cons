import { Module, Global } from '@nestjs/common';
import { HolidaysService } from './holidays.service';

@Global()
@Module({
  providers: [HolidaysService],
  exports: [HolidaysService],
})
export class HolidaysModule {}
