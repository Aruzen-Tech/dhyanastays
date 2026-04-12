import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_DEAD_LETTER } from '../../jobs/jobs.constants';
import { DlqService } from './dlq.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_DEAD_LETTER })],
  providers: [DlqService],
})
export class DlqModule {}
