import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { GuestMessagingController } from './guest-messaging.controller';
import { HostMessagingController } from './host-messaging.controller';
import { AdminMessagingController } from './admin-messaging.controller';
import { GuestConciergeController } from './guest-concierge.controller';
import { HostConciergeController } from './host-concierge.controller';
import { AdminConciergeController } from './admin-concierge.controller';
import { HostQuickReplyController } from './host-quick-reply.controller';
import { HostQuickReplyService } from './host-quick-reply.service';
import { NotificationModule } from '../notification/notification.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [NotificationModule, AdminModule],
  controllers: [
    GuestMessagingController,
    HostMessagingController,
    AdminMessagingController,
    GuestConciergeController,
    HostConciergeController,
    AdminConciergeController,
    HostQuickReplyController,
  ],
  providers: [MessagingService, HostQuickReplyService],
  exports: [MessagingService],
})
export class MessagingModule {}
