import { Controller, Get, Param, Query } from '@nestjs/common';
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
  @Get('search')
  search(@Query('q') q: string = '') {
    return this.listingService.searchListings(q);
  }

  @Public()
  @Get('map')
  getByBounds(
    @Query('swLat') swLat: string,
    @Query('swLng') swLng: string,
    @Query('neLat') neLat: string,
    @Query('neLng') neLng: string,
  ) {
    return this.listingService.getListingsByBounds(
      parseFloat(swLat),
      parseFloat(swLng),
      parseFloat(neLat),
      parseFloat(neLng),
    );
  }

  @Public()
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.listingService.getPublicListingById(id);
  }

  @Public()
  @Get('meta/tags')
  getAllTags() {
    return this.listingService.getAllTags();
  }
}
