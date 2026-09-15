import { Module } from '@nestjs/common';
import { AdminListingController } from './admin-listing.controller';
import { HostListingController } from './host-listing.controller';
import { ListingService } from './listing.service';
import { HostProfileService } from './host-profile.service';
import { AvailabilityService } from './availability.service';
import { PublicListingController } from './public-listing.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  providers: [ListingService, AvailabilityService, HostProfileService],
  controllers: [
    HostListingController,
    AdminListingController,
    PublicListingController,
  ],
  exports: [ListingService, AvailabilityService, HostProfileService],
})
export class ListingModule {}
