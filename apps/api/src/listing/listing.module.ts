import { Module } from '@nestjs/common';
import { AdminListingController } from './admin-listing.controller';
import { HostListingController } from './host-listing.controller';
import { ListingService } from './listing.service';
import { PublicListingController } from './public-listing.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  providers: [ListingService],
  controllers: [
    HostListingController,
    AdminListingController,
    PublicListingController,
  ],
})
export class ListingModule {}
