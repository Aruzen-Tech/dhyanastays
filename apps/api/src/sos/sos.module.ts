import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { NotificationModule } from '../notification/notification.module';
import { QUEUE_SOS_BROADCAST } from '../jobs/jobs.constants';
import { SosController } from './sos.controller';
import { AdminSosController } from './admin-sos.controller';
import { SosService } from './sos.service';
import { SosBroadcastService } from './sos-broadcast.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_SOS_BROADCAST }),
    AdminModule,
    NotificationModule,
  ],
  providers: [SosService, SosBroadcastService],
  controllers: [SosController, AdminSosController],
  exports: [SosService, SosBroadcastService],
})
export class SosModule {}
