import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_DEAD_LETTER } from '../../jobs/jobs.constants';

/**
 * Dead Letter Queue processor.
 *
 * Jobs that exhaust all retries are moved here. Each arrival creates
 * an AdminNotification so ops can investigate.
 */
@Processor(QUEUE_DEAD_LETTER)
export class DlqService extends WorkerHost {
  private readonly logger = new Logger(DlqService.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.error(
      `Dead-letter job received: ${job.name} from queue ${job.data?.sourceQueue ?? 'unknown'}`,
      { jobId: job.id, data: job.data },
    );

    await this.prisma.adminNotification.create({
      data: {
        type: 'JOB_FAILED',
        title: `Job permanently failed: ${job.data?.sourceQueue ?? 'unknown'}/${job.name}`,
        message: `Job ${job.id} exhausted all retries. Error: ${job.data?.failedReason ?? 'Unknown error'}`,
        metadata: {
          jobId: job.id,
          jobName: job.name,
          sourceQueue: job.data?.sourceQueue,
          failedReason: job.data?.failedReason,
          attemptsMade: job.data?.attemptsMade,
        },
      },
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`DLQ processing itself failed for job ${job.id}: ${error.message}`);
  }
}
