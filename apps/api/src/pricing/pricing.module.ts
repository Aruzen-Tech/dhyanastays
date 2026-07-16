import { Module } from '@nestjs/common';
import { AddOnModule } from '../add-on/add-on.module';
import { MembershipModule } from '../membership/membership.module';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';

@Module({
  imports: [AddOnModule, MembershipModule],
  providers: [PricingService],
  controllers: [PricingController],
  exports: [PricingService],
})
export class PricingModule {}
