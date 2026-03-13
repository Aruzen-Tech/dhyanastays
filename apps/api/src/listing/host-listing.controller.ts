import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingService } from './listing.service';

@Roles(UserRole.HOST)
@Controller()
export class HostListingController {
  constructor(private readonly listingService: ListingService) {}

  /** GET /api/host/profile — returns the authenticated host's profile + verification status */
  @Get('host/profile')
  getProfile(@CurrentUser() user: RequestUser) {
    return this.listingService.getHostProfile(user.sub);
  }

  /** GET /api/host/listings — returns all listings owned by the authenticated host */
  @Get('host/listings')
  getMyListings(@CurrentUser() user: RequestUser) {
    return this.listingService.getHostListings(user.sub);
  }

  /** POST /api/host/listings — create a new listing (host must be APPROVED) */
  @Post('host/listings')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateListingDto) {
    return this.listingService.createHostListing(user.sub, dto);
  }

  /** PATCH /api/host/listings/:id — update a listing */
  @Patch('host/listings/:id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.listingService.updateHostListing(user.sub, id, dto);
  }
}
