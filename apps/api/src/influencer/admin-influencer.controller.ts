import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { InfluencerVerificationStatus, UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { InfluencerService } from './influencer.service';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignStatusDto } from './dto/update-campaign-status.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { ReviewContentDto } from './dto/review-content.dto';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { CreateCommissionRuleDto } from './dto/create-commission-rule.dto';
import { AttributeBookingDto } from './dto/attribute-booking.dto';
import { ReviewPayoutDto } from './dto/review-payout.dto';

/**
 * Admin/marketing-team surface — every mutation the docx explicitly forbids
 * an influencer from performing (approve content, set commission rules,
 * approve/pay payouts, moderate campaigns) lives only here, never on
 * InfluencerSelfController.
 */
@Roles(UserRole.ADMIN)
@Controller('admin/influencer')
export class AdminInfluencerController {
  constructor(private readonly service: InfluencerService) {}

  // ── Verification ────────────────────────────────────────────────────────
  @Get('profiles')
  listProfiles(@Query('status') status?: InfluencerVerificationStatus) {
    return this.service.adminListProfiles(status);
  }

  @Patch('profiles/:id/verification')
  reviewVerification(@Param('id') id: string, @Body() dto: ReviewVerificationDto) {
    return this.service.adminReviewVerification(id, dto);
  }

  // ── Campaigns ───────────────────────────────────────────────────────────
  @Post('campaigns')
  createCampaign(@CurrentUser() user: RequestUser, @Body() dto: CreateCampaignDto) {
    return this.service.adminCreateCampaign(user.sub, dto);
  }

  @Patch('campaigns/:id/status')
  updateCampaignStatus(@Param('id') id: string, @Body() dto: UpdateCampaignStatusDto) {
    return this.service.adminUpdateCampaignStatus(id, dto);
  }

  @Patch('applications/:id')
  reviewApplication(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ReviewApplicationDto,
  ) {
    return this.service.adminReviewApplication(id, user.sub, dto);
  }

  // ── Content ─────────────────────────────────────────────────────────────
  @Patch('content/:id/review')
  reviewContent(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ReviewContentDto,
  ) {
    return this.service.adminReviewContent(user.sub, id, dto);
  }

  // ── Promo codes ─────────────────────────────────────────────────────────
  @Post('promo-codes')
  createPromoCode(@Body() dto: CreatePromoCodeDto) {
    return this.service.adminCreatePromoCode(dto);
  }

  // ── Commission ──────────────────────────────────────────────────────────
  @Post('commission-rules')
  createCommissionRule(@CurrentUser() user: RequestUser, @Body() dto: CreateCommissionRuleDto) {
    return this.service.adminCreateCommissionRule(user.sub, dto);
  }

  @Patch('commissions/:id/approve')
  approveCommission(@Param('id') id: string) {
    return this.service.adminApproveCommission(id);
  }

  @Patch('commissions/:id/cancel')
  cancelCommission(@Param('id') id: string, @Body('reason') reason: string) {
    return this.service.adminCancelCommission(id, reason);
  }

  // ── Booking attribution ─────────────────────────────────────────────────
  // Documented integration point for a future booking-creation hook — see
  // AttributeBookingDto. Admin-callable today; not wired into the live
  // booking flow (that would touch the booking module).
  @Post('bookings/attribute')
  attributeBooking(@Body() dto: AttributeBookingDto) {
    return this.service.attributeBooking(dto);
  }

  // ── Payouts ──────────────────────────────────────────────────────────────
  @Patch('payouts/:id')
  reviewPayout(@Param('id') id: string, @Body() dto: ReviewPayoutDto) {
    return this.service.adminReviewPayout(id, dto);
  }
}
