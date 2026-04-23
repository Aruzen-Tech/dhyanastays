import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { ListingService } from './listing.service';
import {
  DIETARY_OPTIONS,
  EXPERIENCE_TAGS,
  PROPERTY_TYPES,
} from './dto/update-listing.dto';

@Controller('listings')
export class PublicListingController {
  constructor(private readonly listingService: ListingService) {}

  @Public()
  @Get()
  getFeed(
    @Query('q') q?: string,
    @Query('city') city?: string,
    @Query('experienceTags') experienceTags?: string,
    @Query('propertyType') propertyType?: string,
    @Query('dietaryOptions') dietaryOptions?: string,
    @Query('sort') sort?: 'newest' | 'price-asc' | 'price-desc',
  ) {
    const hasFacets =
      q || city || experienceTags || propertyType || dietaryOptions || sort;
    if (!hasFacets) {
      return this.listingService.getPublicListings();
    }
    const parseCsv = (v?: string) =>
      v ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    return this.listingService.getDiscoveryListings({
      q,
      city,
      experienceTags: parseCsv(experienceTags),
      propertyType,
      dietaryOptions: parseCsv(dietaryOptions),
      sort,
    });
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

  @Public()
  @Get('meta/facets')
  getFacetVocabulary() {
    return {
      experienceTags: EXPERIENCE_TAGS,
      propertyTypes: PROPERTY_TYPES,
      dietaryOptions: DIETARY_OPTIONS,
    };
  }
}
