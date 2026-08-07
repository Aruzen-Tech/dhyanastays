import { Module } from '@nestjs/common';
import { ExperienceModule } from '../experience/experience.module';
import { ListingModule } from '../listing/listing.module';
import { PricingModule } from '../pricing/pricing.module';
import { ItineraryController } from './itinerary.controller';
import { ItineraryGroundingService } from './itinerary-grounding.service';
import { ItineraryService } from './itinerary.service';

@Module({
  imports: [ListingModule, PricingModule, ExperienceModule],
  controllers: [ItineraryController],
  providers: [ItineraryService, ItineraryGroundingService],
  exports: [ItineraryService],
})
export class ItineraryModule {}
