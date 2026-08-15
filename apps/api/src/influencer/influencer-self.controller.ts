import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { InfluencerCommissionStatus, UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { FeatureGate } from '../common/decorators/feature-gate.decorator';
import { InfluencerService } from './influencer.service';
import { ApplyInfluencerProfileDto } from './dto/apply-influencer-profile.dto';
import { UpdateInfluencerProfileDto } from './dto/update-influencer-profile.dto';
import { CreateContentDto } from './dto/create-content.dto';
import { CreateTrackingLinkDto } from './dto/create-tracking-link.dto';

/**
 * Self-service surface for the authenticated influencer. Every method on
 * InfluencerService called from here resolves the influencer's own profile
 * from the JWT subject (CurrentUser().sub) — no route here accepts an
 * influencerId from the client, so one influencer can never address
 * another's data (docx §Permission Boundary).
 */
@Roles(UserRole.INFLUENCER)
@FeatureGate('influencer_dashboard')
@Controller('influencer')
export class InfluencerSelfController {
  constructor(private readonly service: InfluencerService) {}

  // ── Profile ─────────────────────────────────────────────────────────────
  @Post('profile/apply')
  apply(@CurrentUser() user: RequestUser, @Body() dto: ApplyInfluencerProfileDto) {
    return this.service.applyAsInfluencer(user.sub, dto);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: RequestUser) {
    return this.service.getMyProfile(user.sub);
  }

  @Post('profile')
  updateProfile(@CurrentUser() user: RequestUser, @Body() dto: UpdateInfluencerProfileDto) {
    return this.service.updateMyProfile(user.sub, dto);
  }

  // ── Dashboard & Analytics ───────────────────────────────────────────────
  @Get('dashboard')
  dashboard(@CurrentUser() user: RequestUser) {
    return this.service.getDashboard(user.sub);
  }

  @Get('analytics/top-properties')
  topProperties(@CurrentUser() user: RequestUser) {
    return this.service.getTopProperties(user.sub);
  }

  @Get('analytics/performance')
  performance(
    @CurrentUser() user: RequestUser,
    @Query('granularity') granularity: 'daily' | 'weekly' | 'monthly' = 'daily',
  ) {
    return this.service.getPerformance(user.sub, granularity);
  }

  // ── Campaigns ───────────────────────────────────────────────────────────
  @Get('campaigns')
  listCampaigns(@CurrentUser() user: RequestUser) {
    return this.service.listCampaignsForInfluencer(user.sub);
  }

  @Get('campaigns/:id')
  getCampaign(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.getCampaignForInfluencer(user.sub, id);
  }

  @Post('campaigns/:id/apply')
  applyToCampaign(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.applyToCampaign(user.sub, id);
  }

  @Get('applications')
  listApplications(@CurrentUser() user: RequestUser) {
    return this.service.listMyApplications(user.sub);
  }

  // ── Content ─────────────────────────────────────────────────────────────
  @Get('content')
  listContent(@CurrentUser() user: RequestUser) {
    return this.service.listMyContent(user.sub);
  }

  @Post('content')
  createContent(@CurrentUser() user: RequestUser, @Body() dto: CreateContentDto) {
    return this.service.createContent(user.sub, dto);
  }

  @Post('content/:id/submit')
  submitContent(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.submitContent(user.sub, id);
  }

  // ── Promo codes (read-only — no create route exists here by design) ────
  @Get('promo-codes')
  listPromoCodes(@CurrentUser() user: RequestUser) {
    return this.service.listMyPromoCodes(user.sub);
  }

  // ── Tracking links ──────────────────────────────────────────────────────
  @Get('tracking-links')
  listTrackingLinks(@CurrentUser() user: RequestUser) {
    return this.service.listMyTrackingLinks(user.sub);
  }

  @Post('tracking-links')
  createTrackingLink(@CurrentUser() user: RequestUser, @Body() dto: CreateTrackingLinkDto) {
    return this.service.createTrackingLink(user.sub, dto);
  }

  // ── Bookings (PII-safe — see InfluencerService.listMyBookings) ─────────
  @Get('bookings')
  listBookings(@CurrentUser() user: RequestUser) {
    return this.service.listMyBookings(user.sub);
  }

  // ── Commission (read-only) ──────────────────────────────────────────────
  @Get('commission-rules')
  listCommissionRules(@CurrentUser() user: RequestUser) {
    return this.service.listCommissionRulesForInfluencer(user.sub);
  }

  @Get('commissions')
  listCommissions(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: InfluencerCommissionStatus,
  ) {
    return this.service.listMyCommissions(user.sub, status);
  }

  // ── Payouts ──────────────────────────────────────────────────────────────
  @Get('payouts')
  listPayouts(@CurrentUser() user: RequestUser) {
    return this.service.listMyPayouts(user.sub);
  }

  @Post('payouts/request')
  requestPayout(@CurrentUser() user: RequestUser) {
    return this.service.requestPayout(user.sub);
  }
}
