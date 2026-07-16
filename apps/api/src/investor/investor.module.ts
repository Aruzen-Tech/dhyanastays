import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { InvestorService } from './investor.service';
import { InvestorController } from './investor.controller';
import { AdminInvestorController } from './admin-investor.controller';

@Module({
  imports: [NotificationModule],
  controllers: [InvestorController, AdminInvestorController],
  providers: [InvestorService],
  exports: [InvestorService],
})
export class InvestorModule {}
