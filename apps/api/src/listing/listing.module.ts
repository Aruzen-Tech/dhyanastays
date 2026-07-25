import { Module } from '@nestjs/common';
import { AdminListingController } from './admin-listing.controller';
import { HostListingController } from './host-listing.controller';
import { ListingService } from './listing.service';
import { AvailabilityService } from './availability.service';
import { PublicListingController } from './public-listing.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  providers: [ListingService, AvailabilityService],
  controllers: [
    HostListingController,
    AdminListingController,
    PublicListingController,
  ],
  exports: [ListingService, AvailabilityService],
})
export class ListingModule {}
