import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminReviewDto } from './dto/admin-review.dto';
import { ListingService } from './listing.service';

@Roles(UserRole.ADMIN)
@Controller()
export class AdminListingController {
  constructor(private readonly listingService: ListingService) {}

  // ─── Listing approvals ────────────────────────────────────────────────────

  @Get('admin/listings/pending')
  listPending() {
    return this.listingService.getPendingListings();
  }

  @Post('admin/listings/:id/approve')
  approve(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AdminReviewDto,
  ) {
    return this.listingService.reviewListing(user.sub, id, 'approve', dto.note);
  }

  @Post('admin/listings/:id/reject')
  reject(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AdminReviewDto,
  ) {
    return this.listingService.reviewListing(user.sub, id, 'reject', dto.note);
  }

  @Post('admin/listings/:id/request-changes')
  requestChanges(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AdminReviewDto,
  ) {
    return this.listingService.reviewListing(user.sub, id, 'request_changes', dto.note);
  }

  // ─── Host approvals ───────────────────────────────────────────────────────

  /** GET /api/admin/hosts/pending — list hosts awaiting verification */
  @Get('admin/hosts/pending')
  listPendingHosts() {
    return this.listingService.getPendingHosts();
  }

  /** POST /api/admin/hosts/:id/approve — approve a host profile */
  @Post('admin/hosts/:id/approve')
  approveHost(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.listingService.reviewHost(user.sub, id, 'approve');
  }

  /** POST /api/admin/hosts/:id/reject — reject a host profile */
  @Post('admin/hosts/:id/reject')
  rejectHost(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.listingService.reviewHost(user.sub, id, 'reject');
  }
}
