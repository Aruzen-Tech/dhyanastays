import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { OutboxService } from './outbox.service';
import { OutboxDispatcher } from './outbox-dispatcher.service';
import { NotificationPreferenceController } from './notification-preference.controller';

@Module({
  providers: [NotificationService, OutboxService, OutboxDispatcher],
  controllers: [NotificationPreferenceController],
  exports: [NotificationService, OutboxService, OutboxDispatcher],
})
export class NotificationModule {}
