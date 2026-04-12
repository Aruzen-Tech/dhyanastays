import { Module } from '@nestjs/common';
import { GuestController, ListingReviewsController } from './guest.controller';
import { GuestService } from './guest.service';

@Module({
  controllers: [GuestController, ListingReviewsController],
  providers: [GuestService],
  exports: [GuestService],
})
export class GuestModule {}
