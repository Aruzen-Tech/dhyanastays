import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { UpdatePreparationDto } from './dto/update-preparation.dto';
import { UpdateDirectionsDto } from '../guest-assistance/dto/update-directions.dto';
import { UpdateManualDto } from '../guest-assistance/dto/update-manual.dto';
import { AddMediaDto } from './dto/add-media.dto';
import { AddSeasonalRateDto } from './dto/add-seasonal-rate.dto';
import { AddAvailabilityBlockDto } from './dto/add-availability-block.dto';
import { ListingService } from './listing.service';

@Roles(UserRole.HOST)
@Controller()
export class HostListingController {
  constructor(private readonly listingService: ListingService) {}

  @Get('host/profile')
  getProfile(@CurrentUser() user: RequestUser) {
    return this.listingService.getHostProfile(user.sub);
  }

  @Get('host/listings')
  getMyListings(@CurrentUser() user: RequestUser) {
    return this.listingService.getHostListings(user.sub);
  }

  @Post('host/listings')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateListingDto) {
    return this.listingService.createHostListing(user.sub, dto);
  }

  @Patch('host/listings/:id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.listingService.updateHostListing(user.sub, id, dto);
  }

  // ── Preparation guide ────────────────────────────────────────────────────────

  @Get('host/listings/:id/preparation')
  getPreparation(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.listingService.getPreparationGuide(user.sub, id);
  }

  @Patch('host/listings/:id/preparation')
  updatePreparation(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdatePreparationDto,
  ) {
    return this.listingService.updatePreparationGuide(user.sub, id, dto);
  }

  // ── Directions ───────────────────────────────────────────────────────────────

  @Get('host/listings/:id/directions')
  getDirections(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.listingService.getDirections(user.sub, id);
  }

  @Patch('host/listings/:id/directions')
  updateDirections(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateDirectionsDto,
  ) {
    return this.listingService.updateDirections(user.sub, id, dto);
  }

  // ── Manual ──────────────────────────────────────────────────────────────────

  @Get('host/listings/:id/manual')
  getManual(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.listingService.getManual(user.sub, id);
  }

  @Patch('host/listings/:id/manual')
  updateManual(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateManualDto,
  ) {
    return this.listingService.updateManual(user.sub, id, dto);
  }

  // ── Media ────────────────────────────────────────────────────────────────────

  @Post('host/listings/:id/media')
  addMedia(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AddMediaDto,
  ) {
    return this.listingService.addMedia(user.sub, id, dto);
  }

  @Delete('host/listings/:id/media/:mediaId')
  deleteMedia(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.listingService.deleteMedia(user.sub, id, mediaId);
  }

  // ── Tags / Amenities ─────────────────────────────────────────────────────────

  @Get('host/tags')
  getAllTags() {
    return this.listingService.getAllTags();
  }

  @Get('host/listings/:id/tags')
  getListingTags(@Param('id') id: string) {
    return this.listingService.getListingTags(id);
  }

  @Post('host/listings/:id/tags')
  setListingTags(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { tagIds: string[] },
  ) {
    return this.listingService.setListingTags(user.sub, id, body.tagIds ?? []);
  }

  // ── Seasonal rates ────────────────────────────────────────────────────────────

  @Post('host/listings/:id/seasonal-rates')
  addSeasonalRate(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AddSeasonalRateDto,
  ) {
    return this.listingService.addSeasonalRate(user.sub, id, dto);
  }

  @Get('host/listings/:id/seasonal-rates')
  getSeasonalRates(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.listingService.getSeasonalRates(user.sub, id);
  }

  @Delete('host/listings/:id/seasonal-rates/:rateId')
  deleteSeasonalRate(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('rateId') rateId: string,
  ) {
    return this.listingService.deleteSeasonalRate(user.sub, id, rateId);
  }

  // ── Availability blocks ───────────────────────────────────────────────────────

  @Post('host/listings/:id/availability-blocks')
  addAvailabilityBlock(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AddAvailabilityBlockDto,
  ) {
    return this.listingService.addAvailabilityBlock(user.sub, id, dto);
  }

  @Get('host/listings/:id/availability-blocks')
  getAvailabilityBlocks(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.listingService.getAvailabilityBlocks(user.sub, id);
  }

  @Delete('host/listings/:id/availability-blocks/:blockId')
  deleteAvailabilityBlock(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('blockId') blockId: string,
  ) {
    return this.listingService.deleteAvailabilityBlock(user.sub, id, blockId);
  }
}
