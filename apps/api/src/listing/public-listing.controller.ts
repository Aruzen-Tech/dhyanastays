import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { ListingService } from './listing.service';

@Controller('listings')
export class PublicListingController {
  constructor(private readonly listingService: ListingService) {}

  @Public()
  @Get()
  getFeed() {
    return this.listingService.getPublicListings();
  }

  @Public()
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.listingService.getPublicListingById(id);
  }
}
