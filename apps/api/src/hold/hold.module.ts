import { Module } from '@nestjs/common';
import { HoldController } from './hold.controller';
import { HoldService } from './hold.service';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [PricingModule],
  providers: [HoldService],
  controllers: [HoldController],
  exports: [HoldService],
})
export class HoldModule {}
