import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { GuestMessagingController } from './guest-messaging.controller';
import { HostMessagingController } from './host-messaging.controller';
import { AdminMessagingController } from './admin-messaging.controller';

@Module({
  controllers: [
    GuestMessagingController,
    HostMessagingController,
    AdminMessagingController,
  ],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
