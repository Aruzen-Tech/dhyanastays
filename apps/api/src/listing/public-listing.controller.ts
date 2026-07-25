import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { ListingService } from './listing.service';
import { AvailabilityService } from './availability.service';
import {
  DIETARY_OPTIONS,
  EXPERIENCE_TAGS,
  PROPERTY_TYPES,
} from './dto/update-listing.dto';

/** YYYY-MM-DD for `n` days from now (UTC). */
function isoDay(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}

@Controller('listings')
export class PublicListingController {
  constructor(
    private readonly listingService: ListingService,
    private readonly availability: AvailabilityService,
  ) {}

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

  /**
   * Per-day availability for a listing's booking calendar.
   * PII-free: states + prices only (no guest names or booking ids).
   * Defaults to a 60-day window from today when from/to are omitted.
   */
  @Public()
  @Get(':id/availability')
  getAvailability(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.availability.getAvailability(
      id,
      from ?? isoDay(0),
      to ?? isoDay(60),
    );
  }

  /**
   * Outbound iCal busy feed (bookings + host blocks as opaque all-day events).
   * PII-free. Import into external channels to mirror our availability.
   */
  @Public()
  @Get(':id/calendar.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'inline; filename="dhyana-availability.ics"')
  getIcsFeed(@Param('id') id: string) {
    return this.availability.buildIcsFeed(id);
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
