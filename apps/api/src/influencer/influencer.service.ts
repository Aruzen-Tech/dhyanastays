import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  InfluencerCampaignApplicationStatus,
  InfluencerCampaignStatus,
  InfluencerCommissionRuleType,
  InfluencerCommissionStatus,
  InfluencerContentStatus,
  InfluencerPayoutStatus,
  InfluencerVerificationStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyInfluencerProfileDto } from './dto/apply-influencer-profile.dto';
import { UpdateInfluencerProfileDto } from './dto/update-influencer-profile.dto';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignStatusDto } from './dto/update-campaign-status.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { CreateContentDto } from './dto/create-content.dto';
import { ReviewContentDto } from './dto/review-content.dto';
import { CreateTrackingLinkDto } from './dto/create-tracking-link.dto';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { CreateCommissionRuleDto } from './dto/create-commission-rule.dto';
import { AttributeBookingDto } from './dto/attribute-booking.dto';
import { ReviewPayoutDto } from './dto/review-payout.dto';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRandomCode(length: number): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

/** Reads a numeric field out of Booking.priceSnapshot (frozen JSON), same
 * defensive pattern used by admin.service.ts — priceSnapshot has no fixed
 * Prisma type, so this never assumes a field exists. */
function readSnapshotNumber(snapshot: unknown, key: string): number {
  if (snapshot && typeof snapshot === 'object' && key in (snapshot as Record<string, unknown>)) {
    const v = (snapshot as Record<string, unknown>)[key];
    if (typeof v === 'number') return v;
  }
  return 0;
}

type TierConfig = { minBookings: number; maxBookings?: number; percentageBps: number }[];

@Injectable()
export class InfluencerService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Ownership helper — every self-service method starts here ──────────────
  // Never accepts an influencerId from the caller: always resolves from the
  // authenticated userId, so one influencer can never address another's data.

  private async getOwnedProfile(userId: string) {
    const profile = await this.prisma.influencerProfile.findUnique({ where: { userId } });
    if (!profile) throw new ForbiddenException('Influencer profile not found');
    return profile;
  }

  private assertActive(profile: { verificationStatus: InfluencerVerificationStatus }) {
    if (profile.verificationStatus !== InfluencerVerificationStatus.ACTIVE) {
      throw new ForbiddenException('Influencer account is not yet active');
    }
  }

  // ── Profile & Verification ─────────────────────────────────────────────────

  async applyAsInfluencer(userId: string, dto: ApplyInfluencerProfileDto) {
    const existing = await this.prisma.influencerProfile.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('Influencer profile already exists');
    return this.prisma.influencerProfile.create({
      data: {
        userId,
        creatorName: dto.creatorName,
        bio: dto.bio,
        socialLinks: (dto.socialLinks ?? {}) as Prisma.InputJsonValue,
        location: dto.location,
        contentCategories: dto.contentCategories ?? [],
        languages: dto.languages ?? [],
        audienceLocation: dto.audienceLocation as Prisma.InputJsonValue | undefined,
        audienceSize: dto.audienceSize,
        payoutAccountRef: dto.payoutAccountRef,
        verificationStatus: InfluencerVerificationStatus.APPLIED,
      },
    });
  }

  async getMyProfile(userId: string) {
    return this.getOwnedProfile(userId);
  }

  async updateMyProfile(userId: string, dto: UpdateInfluencerProfileDto) {
    const profile = await this.getOwnedProfile(userId);
    return this.prisma.influencerProfile.update({
      where: { id: profile.id },
      data: {
        ...(dto.creatorName !== undefined && { creatorName: dto.creatorName }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.socialLinks !== undefined && {
          socialLinks: dto.socialLinks as Prisma.InputJsonValue,
        }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.contentCategories !== undefined && { contentCategories: dto.contentCategories }),
        ...(dto.languages !== undefined && { languages: dto.languages }),
        ...(dto.audienceLocation !== undefined && {
          audienceLocation: dto.audienceLocation as Prisma.InputJsonValue,
        }),
        ...(dto.audienceSize !== undefined && { audienceSize: dto.audienceSize }),
        ...(dto.payoutAccountRef !== undefined && { payoutAccountRef: dto.payoutAccountRef }),
        // verificationStatus / adminComments are never accepted here.
      },
    });
  }

  async adminListProfiles(status?: InfluencerVerificationStatus) {
    return this.prisma.influencerProfile.findMany({
      where: status ? { verificationStatus: status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async adminReviewVerification(id: string, dto: ReviewVerificationDto) {
    const profile = await this.prisma.influencerProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException('Influencer profile not found');

    const updated = await this.prisma.influencerProfile.update({
      where: { id },
      data: {
        verificationStatus: dto.status,
        adminComments: dto.adminComments ?? profile.adminComments,
      },
    });

    // "Every approved influencer receives a unique promotional code" (docx §4)
    // — issued once, the first time an influencer crosses into APPROVED.
    if (
      dto.status === InfluencerVerificationStatus.APPROVED &&
      profile.verificationStatus !== InfluencerVerificationStatus.APPROVED
    ) {
      const hasGeneralCode = await this.prisma.influencerPromoCode.findFirst({
        where: { influencerId: id, campaignId: null },
      });
      if (!hasGeneralCode) {
        await this.createPromoCodeInternal(id, null);
      }
    }

    return updated;
  }

  // ── Campaigns ───────────────────────────────────────────────────────────────

  async adminCreateCampaign(actorId: string, dto: CreateCampaignDto) {
    return this.prisma.influencerCampaign.create({
      data: {
        title: dto.title,
        brief: dto.brief,
        destination: dto.destination,
        targetListingId: dto.targetListingId,
        targetExperienceId: dto.targetExperienceId,
        promotionalOffer: dto.promotionalOffer as Prisma.InputJsonValue | undefined,
        requiredContentTypes: dto.requiredContentTypes ?? [],
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        status: InfluencerCampaignStatus.DRAFT,
        createdById: actorId,
      },
    });
  }

  async adminUpdateCampaignStatus(id: string, dto: UpdateCampaignStatusDto) {
    const campaign = await this.prisma.influencerCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return this.prisma.influencerCampaign.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  /** Campaigns an influencer can browse: AVAILABLE/ACTIVE, plus any they've
   * already been invited to or applied for regardless of campaign status. */
  async listCampaignsForInfluencer(userId: string) {
    const profile = await this.getOwnedProfile(userId);
    const campaigns = await this.prisma.influencerCampaign.findMany({
      where: {
        OR: [
          { status: { in: [InfluencerCampaignStatus.AVAILABLE, InfluencerCampaignStatus.ACTIVE] } },
          { applications: { some: { influencerId: profile.id } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        applications: { where: { influencerId: profile.id }, select: { status: true } },
      },
    });
    return campaigns.map(({ applications, ...c }) => ({
      ...c,
      myApplicationStatus: applications[0]?.status ?? null,
    }));
  }

  async getCampaignForInfluencer(userId: string, campaignId: string) {
    await this.getOwnedProfile(userId);
    const campaign = await this.prisma.influencerCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async applyToCampaign(userId: string, campaignId: string) {
    const profile = await this.getOwnedProfile(userId);
    this.assertActive(profile);

    const campaign = await this.prisma.influencerCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (
      campaign.status !== InfluencerCampaignStatus.AVAILABLE &&
      campaign.status !== InfluencerCampaignStatus.ACTIVE
    ) {
      throw new BadRequestException('Campaign is not currently accepting applications');
    }

    const existing = await this.prisma.influencerCampaignApplication.findUnique({
      where: { campaignId_influencerId: { campaignId, influencerId: profile.id } },
    });
    if (existing) {
      if (existing.status === InfluencerCampaignApplicationStatus.INVITED) {
        return this.prisma.influencerCampaignApplication.update({
          where: { id: existing.id },
          data: { status: InfluencerCampaignApplicationStatus.APPLIED },
        });
      }
      throw new ConflictException('Already applied to this campaign');
    }

    return this.prisma.influencerCampaignApplication.create({
      data: {
        campaignId,
        influencerId: profile.id,
        status: InfluencerCampaignApplicationStatus.APPLIED,
      },
    });
  }

  async listMyApplications(userId: string) {
    const profile = await this.getOwnedProfile(userId);
    return this.prisma.influencerCampaignApplication.findMany({
      where: { influencerId: profile.id },
      orderBy: { createdAt: 'desc' },
      include: { campaign: true },
    });
  }

  private static readonly VALID_APPLICATION_TRANSITIONS: Record<
    InfluencerCampaignApplicationStatus,
    InfluencerCampaignApplicationStatus[]
  > = {
    INVITED: [InfluencerCampaignApplicationStatus.APPLIED, InfluencerCampaignApplicationStatus.REJECTED],
    APPLIED: [InfluencerCampaignApplicationStatus.APPROVED, InfluencerCampaignApplicationStatus.REJECTED],
    APPROVED: [InfluencerCampaignApplicationStatus.ASSIGNED],
    ASSIGNED: [InfluencerCampaignApplicationStatus.COMPLETED],
    REJECTED: [],
    COMPLETED: [],
  };

  async adminReviewApplication(applicationId: string, actorId: string, dto: ReviewApplicationDto) {
    const application = await this.prisma.influencerCampaignApplication.findUnique({
      where: { id: applicationId },
    });
    if (!application) throw new NotFoundException('Application not found');

    const allowed = InfluencerService.VALID_APPLICATION_TRANSITIONS[application.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot move application from ${application.status} to ${dto.status}`,
      );
    }

    return this.prisma.influencerCampaignApplication.update({
      where: { id: applicationId },
      data: {
        status: dto.status,
        reviewNotes: dto.reviewNotes ?? application.reviewNotes,
        reviewedAt: new Date(),
        reviewedBy: actorId,
      },
    });
  }

  // ── Content ─────────────────────────────────────────────────────────────────

  async createContent(userId: string, dto: CreateContentDto) {
    const profile = await this.getOwnedProfile(userId);
    this.assertActive(profile);
    return this.prisma.influencerContent.create({
      data: {
        influencerId: profile.id,
        campaignId: dto.campaignId,
        type: dto.type,
        url: dto.url,
        caption: dto.caption,
        status: InfluencerContentStatus.DRAFT,
      },
    });
  }

  async submitContent(userId: string, contentId: string) {
    const profile = await this.getOwnedProfile(userId);
    const content = await this.prisma.influencerContent.findUnique({ where: { id: contentId } });
    if (!content || content.influencerId !== profile.id) {
      throw new NotFoundException('Content not found');
    }
    if (content.status !== InfluencerContentStatus.DRAFT) {
      throw new BadRequestException('Only draft content can be submitted');
    }
    return this.prisma.influencerContent.update({
      where: { id: contentId },
      data: { status: InfluencerContentStatus.SUBMITTED, submittedAt: new Date() },
    });
  }

  async listMyContent(userId: string) {
    const profile = await this.getOwnedProfile(userId);
    return this.prisma.influencerContent.findMany({
      where: { influencerId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  private static readonly VALID_CONTENT_TRANSITIONS: Record<
    InfluencerContentStatus,
    InfluencerContentStatus[]
  > = {
    DRAFT: [],
    SUBMITTED: [InfluencerContentStatus.REVIEW],
    REVIEW: [InfluencerContentStatus.APPROVED, InfluencerContentStatus.DRAFT], // DRAFT = revision requested
    APPROVED: [InfluencerContentStatus.PUBLISHED],
    PUBLISHED: [],
  };

  /** Admin-only — an influencer can never move their own content past
   * SUBMITTED (no self-approval, docx permission boundary). */
  async adminReviewContent(actorId: string, contentId: string, dto: ReviewContentDto) {
    const content = await this.prisma.influencerContent.findUnique({ where: { id: contentId } });
    if (!content) throw new NotFoundException('Content not found');

    const allowed = InfluencerService.VALID_CONTENT_TRANSITIONS[content.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(`Cannot move content from ${content.status} to ${dto.status}`);
    }

    return this.prisma.influencerContent.update({
      where: { id: contentId },
      data: {
        status: dto.status,
        revisionNotes: dto.revisionNotes ?? null,
        reviewedAt: new Date(),
        reviewedBy: actorId,
        publishedAt: dto.status === InfluencerContentStatus.PUBLISHED ? new Date() : content.publishedAt,
      },
    });
  }

  // ── Promo codes ─────────────────────────────────────────────────────────────
  // No influencer-facing create method exists anywhere in this service —
  // codes are only ever system- or admin-generated (docx §4 security rule).

  private async createPromoCodeInternal(influencerId: string, campaignId: string | null) {
    let code: string;
    let attempts = 0;
    do {
      code = generateRandomCode(10);
      const existing = await this.prisma.influencerPromoCode.findUnique({ where: { code } });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    return this.prisma.influencerPromoCode.create({
      data: { code: code!, influencerId, campaignId },
    });
  }

  async adminCreatePromoCode(dto: CreatePromoCodeDto) {
    const profile = await this.prisma.influencerProfile.findUnique({ where: { id: dto.influencerId } });
    if (!profile) throw new NotFoundException('Influencer profile not found');
    let code: string;
    let attempts = 0;
    do {
      code = generateRandomCode(10);
      const existing = await this.prisma.influencerPromoCode.findUnique({ where: { code } });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    return this.prisma.influencerPromoCode.create({
      data: {
        code: code!,
        influencerId: dto.influencerId,
        campaignId: dto.campaignId,
        discountBps: dto.discountBps,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      },
    });
  }

  async listMyPromoCodes(userId: string) {
    const profile = await this.getOwnedProfile(userId);
    return this.prisma.influencerPromoCode.findMany({
      where: { influencerId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Tracking links ──────────────────────────────────────────────────────────

  async createTrackingLink(userId: string, dto: CreateTrackingLinkDto) {
    const profile = await this.getOwnedProfile(userId);
    this.assertActive(profile);

    // Read-only existence checks against Listing/Experience — no writes, no
    // imports of those modules' services, so neither module is touched.
    if (dto.targetListingId) {
      const listing = await this.prisma.listing.findUnique({ where: { id: dto.targetListingId } });
      if (!listing) throw new BadRequestException('targetListingId does not exist');
    }
    if (dto.targetExperienceId) {
      const experience = await this.prisma.experience.findUnique({
        where: { id: dto.targetExperienceId },
      });
      if (!experience) throw new BadRequestException('targetExperienceId does not exist');
    }

    let slug: string;
    let attempts = 0;
    do {
      slug = generateRandomCode(8).toLowerCase();
      const existing = await this.prisma.influencerTrackingLink.findUnique({ where: { slug } });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    return this.prisma.influencerTrackingLink.create({
      data: {
        slug: slug!,
        influencerId: profile.id,
        type: dto.type,
        targetListingId: dto.targetListingId,
        targetExperienceId: dto.targetExperienceId,
        destination: dto.destination,
        campaignId: dto.campaignId,
      },
    });
  }

  async listMyTrackingLinks(userId: string) {
    const profile = await this.getOwnedProfile(userId);
    return this.prisma.influencerTrackingLink.findMany({
      where: { influencerId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Public — invoked by the redirect route, no auth. Records a click and
   * returns where to send the visitor. */
  async recordClickAndResolve(slug: string, meta: { ipHash?: string; userAgent?: string }) {
    const link = await this.prisma.influencerTrackingLink.findUnique({ where: { slug } });
    if (!link) throw new NotFoundException('Tracking link not found');

    await this.prisma.$transaction([
      this.prisma.influencerLinkClick.create({
        data: { trackingLinkId: link.id, ipHash: meta.ipHash, userAgent: meta.userAgent },
      }),
      this.prisma.influencerTrackingLink.update({
        where: { id: link.id },
        data: { clickCount: { increment: 1 } },
      }),
    ]);

    if (link.destination) return link.destination;
    if (link.targetListingId) return `/stays/${link.targetListingId}`;
    if (link.targetExperienceId) return `/experiences/${link.targetExperienceId}`;
    return '/';
  }

  // ── Commission rules ────────────────────────────────────────────────────────

  async adminCreateCommissionRule(actorId: string, dto: CreateCommissionRuleDto) {
    if (dto.type === InfluencerCommissionRuleType.PERCENTAGE && dto.percentageBps == null) {
      throw new BadRequestException('percentageBps is required for PERCENTAGE rules');
    }
    if (dto.type === InfluencerCommissionRuleType.FIXED_AMOUNT && dto.fixedAmountMinor == null) {
      throw new BadRequestException('fixedAmountMinor is required for FIXED_AMOUNT rules');
    }
    if (dto.type === InfluencerCommissionRuleType.CAMPAIGN_BASED) {
      if (dto.percentageBps == null) {
        throw new BadRequestException('percentageBps is required for CAMPAIGN_BASED rules');
      }
      if (!dto.campaignId) {
        throw new BadRequestException('campaignId is required for CAMPAIGN_BASED rules');
      }
    }
    if (dto.type === InfluencerCommissionRuleType.PERFORMANCE_TIER && !dto.tierConfig?.length) {
      throw new BadRequestException('tierConfig is required for PERFORMANCE_TIER rules');
    }

    return this.prisma.influencerCommissionRule.create({
      data: {
        type: dto.type,
        percentageBps: dto.percentageBps,
        fixedAmountMinor: dto.fixedAmountMinor,
        tierConfig: dto.tierConfig as unknown as Prisma.InputJsonValue | undefined,
        campaignId: dto.campaignId,
        createdById: actorId,
      },
    });
  }

  /** Read-only for influencers — the applicable rule(s), never editable. */
  async listCommissionRulesForInfluencer(userId: string) {
    await this.getOwnedProfile(userId);
    return this.prisma.influencerCommissionRule.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private computeCommissionMinor(
    rule: {
      type: InfluencerCommissionRuleType;
      percentageBps: number | null;
      fixedAmountMinor: number | null;
      tierConfig: unknown;
    },
    bookingValueMinor: number,
    priorConfirmedBookingsCount: number,
  ): number {
    switch (rule.type) {
      case InfluencerCommissionRuleType.PERCENTAGE:
      case InfluencerCommissionRuleType.CAMPAIGN_BASED:
        return Math.round((bookingValueMinor * (rule.percentageBps ?? 0)) / 10_000);
      case InfluencerCommissionRuleType.FIXED_AMOUNT:
        return rule.fixedAmountMinor ?? 0;
      case InfluencerCommissionRuleType.PERFORMANCE_TIER: {
        const tiers = (rule.tierConfig as TierConfig | null) ?? [];
        const tier = tiers.find(
          (t) =>
            priorConfirmedBookingsCount >= t.minBookings &&
            (t.maxBookings == null || priorConfirmedBookingsCount <= t.maxBookings),
        );
        return Math.round((bookingValueMinor * (tier?.percentageBps ?? 0)) / 10_000);
      }
    }
  }

  private async resolveApplicableRule(campaignId: string | null) {
    if (campaignId) {
      const campaignRule = await this.prisma.influencerCommissionRule.findFirst({
        where: { campaignId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      if (campaignRule) return campaignRule;
    }
    return this.prisma.influencerCommissionRule.findFirst({
      where: { campaignId: null, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Booking attribution ─────────────────────────────────────────────────────
  // Deliberately does not modify booking.service.ts (see AttributeBookingDto
  // doc comment) — this is the integration point a future booking-creation
  // hook can call once it has a promo code / tracking link at checkout.

  async attributeBooking(dto: AttributeBookingDto) {
    if (!dto.promoCode && !dto.trackingLinkSlug) {
      throw new BadRequestException('promoCode or trackingLinkSlug is required');
    }

    const existing = await this.prisma.influencerBookingAttribution.findUnique({
      where: { bookingId: dto.bookingId },
    });
    if (existing) throw new ConflictException('Booking is already attributed');

    // Read-only — the Booking model and booking module are never modified.
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      select: { id: true, listingId: true, startsAt: true, endsAt: true, priceSnapshot: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    let promoCode = null as Awaited<ReturnType<typeof this.prisma.influencerPromoCode.findUnique>>;
    let trackingLink = null as Awaited<
      ReturnType<typeof this.prisma.influencerTrackingLink.findUnique>
    >;
    let influencerId: string;
    let campaignId: string | null = null;

    if (dto.promoCode) {
      promoCode = await this.prisma.influencerPromoCode.findUnique({ where: { code: dto.promoCode } });
      if (!promoCode || !promoCode.isActive) throw new BadRequestException('Invalid promo code');
      if (promoCode.validUntil && promoCode.validUntil.getTime() < Date.now()) {
        throw new BadRequestException('Promo code has expired');
      }
      influencerId = promoCode.influencerId;
      campaignId = promoCode.campaignId;
    } else {
      trackingLink = await this.prisma.influencerTrackingLink.findUnique({
        where: { slug: dto.trackingLinkSlug },
      });
      if (!trackingLink) throw new BadRequestException('Invalid tracking link');
      influencerId = trackingLink.influencerId;
      campaignId = trackingLink.campaignId;
    }

    const bookingValueMinor = readSnapshotNumber(booking.priceSnapshot, 'total');

    const attribution = await this.prisma.influencerBookingAttribution.create({
      data: {
        bookingId: booking.id,
        listingId: booking.listingId,
        influencerId,
        promoCodeId: promoCode?.id,
        trackingLinkId: trackingLink?.id,
        bookingValueMinor,
        travelStartsAt: booking.startsAt,
        travelEndsAt: booking.endsAt,
      },
    });

    const rule = await this.resolveApplicableRule(campaignId);
    if (!rule) return attribution; // no active rule configured yet — no commission created

    const priorConfirmed = await this.prisma.influencerBookingAttribution.count({
      where: { influencerId },
    });
    const amountMinor = this.computeCommissionMinor(rule, bookingValueMinor, priorConfirmed);

    await this.prisma.influencerCommission.create({
      data: {
        influencerId,
        bookingAttributionId: attribution.id,
        ruleId: rule.id,
        amountMinor,
        status: InfluencerCommissionStatus.PENDING,
      },
    });

    return attribution;
  }

  async listMyBookings(userId: string) {
    const profile = await this.getOwnedProfile(userId);
    // Every field returned is either snapshotted locally or a bare booking
    // id/status — no guest name/email/phone is ever selected or joined in,
    // so traveller PII cannot leak through this path even by mistake.
    const attributions = await this.prisma.influencerBookingAttribution.findMany({
      where: { influencerId: profile.id },
      orderBy: { attributedAt: 'desc' },
      include: { commission: true, promoCode: { select: { code: true } } },
    });

    const bookingIds = attributions.map((a) => a.bookingId);
    const bookings = await this.prisma.booking.findMany({
      where: { id: { in: bookingIds } },
      select: { id: true, status: true, listingId: true },
    });
    const statusById = new Map(bookings.map((b) => [b.id, b.status]));

    return attributions.map((a) => ({
      bookingId: a.bookingId,
      listingId: a.listingId,
      bookingDate: a.attributedAt,
      travelStartsAt: a.travelStartsAt,
      travelEndsAt: a.travelEndsAt,
      bookingValueMinor: a.bookingValueMinor,
      promoCode: a.promoCode?.code ?? null,
      bookingStatus: statusById.get(a.bookingId) ?? null,
      commission: a.commission
        ? { amountMinor: a.commission.amountMinor, status: a.commission.status }
        : null,
    }));
  }

  // ── Commission lifecycle ────────────────────────────────────────────────────

  async listMyCommissions(userId: string, status?: InfluencerCommissionStatus) {
    const profile = await this.getOwnedProfile(userId);
    return this.prisma.influencerCommission.findMany({
      where: { influencerId: profile.id, ...(status && { status }) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminApproveCommission(commissionId: string) {
    const commission = await this.prisma.influencerCommission.findUnique({
      where: { id: commissionId },
      include: { bookingAttribution: true },
    });
    if (!commission) throw new NotFoundException('Commission not found');
    if (commission.status !== InfluencerCommissionStatus.PENDING) {
      throw new BadRequestException('Only pending commission can be approved');
    }

    // Re-check the live booking status (read-only) before approving —
    // commission only becomes payable after cancellation validation (docx §12).
    const booking = await this.prisma.booking.findUnique({
      where: { id: commission.bookingAttribution.bookingId },
      select: { status: true },
    });
    if (booking?.status === BookingStatus.CANCELLED || booking?.status === BookingStatus.REFUNDED) {
      throw new BadRequestException('Underlying booking was cancelled/refunded — cannot approve');
    }

    return this.prisma.influencerCommission.update({
      where: { id: commissionId },
      data: { status: InfluencerCommissionStatus.APPROVED, approvedAt: new Date() },
    });
  }

  async adminCancelCommission(commissionId: string, reason: string) {
    const commission = await this.prisma.influencerCommission.findUnique({ where: { id: commissionId } });
    if (!commission) throw new NotFoundException('Commission not found');
    if (commission.status === InfluencerCommissionStatus.PAID) {
      throw new BadRequestException('Cannot cancel a paid commission');
    }
    return this.prisma.influencerCommission.update({
      where: { id: commissionId },
      data: { status: InfluencerCommissionStatus.CANCELLED, cancelledReason: reason },
    });
  }

  // ── Earnings & Payouts ───────────────────────────────────────────────────────

  async requestPayout(userId: string) {
    const profile = await this.getOwnedProfile(userId);
    this.assertActive(profile);

    const approved = await this.prisma.influencerCommission.findMany({
      where: { influencerId: profile.id, status: InfluencerCommissionStatus.APPROVED, payoutId: null },
    });
    const amountMinor = approved.reduce((sum, c) => sum + c.amountMinor, 0);

    if (amountMinor < profile.minPayoutThresholdMinor) {
      throw new BadRequestException(
        `Approved balance (${amountMinor}) is below the minimum payout threshold (${profile.minPayoutThresholdMinor})`,
      );
    }
    if (approved.length === 0) {
      throw new BadRequestException('No approved commission available for payout');
    }

    return this.prisma.$transaction(async (tx) => {
      const payout = await tx.influencerPayout.create({
        data: {
          influencerId: profile.id,
          amountMinor,
          status: InfluencerPayoutStatus.PENDING,
          payoutAccountRef: profile.payoutAccountRef,
        },
      });
      await tx.influencerCommission.updateMany({
        where: { id: { in: approved.map((c) => c.id) } },
        data: { payoutId: payout.id },
      });
      return payout;
    });
  }

  async listMyPayouts(userId: string) {
    const profile = await this.getOwnedProfile(userId);
    return this.prisma.influencerPayout.findMany({
      where: { influencerId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  private static readonly VALID_PAYOUT_TRANSITIONS: Record<
    InfluencerPayoutStatus,
    InfluencerPayoutStatus[]
  > = {
    PENDING: [InfluencerPayoutStatus.APPROVED, InfluencerPayoutStatus.FAILED],
    APPROVED: [InfluencerPayoutStatus.PROCESSING, InfluencerPayoutStatus.FAILED],
    PROCESSING: [InfluencerPayoutStatus.PAID, InfluencerPayoutStatus.FAILED],
    PAID: [],
    FAILED: [InfluencerPayoutStatus.PENDING],
  };

  async adminReviewPayout(payoutId: string, dto: ReviewPayoutDto) {
    const payout = await this.prisma.influencerPayout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Payout not found');

    const allowed = InfluencerService.VALID_PAYOUT_TRANSITIONS[payout.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(`Cannot move payout from ${payout.status} to ${dto.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.influencerPayout.update({
        where: { id: payoutId },
        data: {
          status: dto.status,
          approvedAt: dto.status === InfluencerPayoutStatus.APPROVED ? new Date() : payout.approvedAt,
          processedAt:
            dto.status === InfluencerPayoutStatus.PROCESSING ? new Date() : payout.processedAt,
          paidAt: dto.status === InfluencerPayoutStatus.PAID ? new Date() : payout.paidAt,
          failureReason: dto.status === InfluencerPayoutStatus.FAILED ? dto.failureReason : null,
        },
      });

      if (dto.status === InfluencerPayoutStatus.PAID) {
        await tx.influencerCommission.updateMany({
          where: { payoutId },
          data: { status: InfluencerCommissionStatus.PAID, paidAt: new Date() },
        });
      }
      if (dto.status === InfluencerPayoutStatus.FAILED) {
        // Free the linked commissions so they can be re-batched into a new payout.
        await tx.influencerCommission.updateMany({
          where: { payoutId },
          data: { payoutId: null },
        });
      }

      return updated;
    });
  }

  // ── Dashboard & Analytics ────────────────────────────────────────────────────
  // Every number here is computed from stored rows — no hardcoded/fake values.
  // Zero activity returns zero, never a placeholder number (Sprint 2 rule).

  async getDashboard(userId: string) {
    const profile = await this.getOwnedProfile(userId);
    const influencerId = profile.id;

    const [
      totalCampaigns,
      clickCountAgg,
      promoCodeUses,
      attributions,
      commissionByStatus,
      payoutByStatus,
    ] = await Promise.all([
      this.prisma.influencerCampaignApplication.count({
        where: {
          influencerId,
          status: {
            in: [
              InfluencerCampaignApplicationStatus.ASSIGNED,
              InfluencerCampaignApplicationStatus.COMPLETED,
            ],
          },
        },
      }),
      this.prisma.influencerTrackingLink.aggregate({
        where: { influencerId },
        _sum: { clickCount: true },
      }),
      this.prisma.influencerBookingAttribution.count({
        where: { influencerId, promoCodeId: { not: null } },
      }),
      this.prisma.influencerBookingAttribution.findMany({
        where: { influencerId },
        select: { bookingId: true, bookingValueMinor: true },
      }),
      this.prisma.influencerCommission.groupBy({
        by: ['status'],
        where: { influencerId },
        _sum: { amountMinor: true },
      }),
      this.prisma.influencerPayout.groupBy({
        by: ['status'],
        where: { influencerId },
        _sum: { amountMinor: true },
      }),
    ]);

    const bookings = await this.prisma.booking.findMany({
      where: { id: { in: attributions.map((a) => a.bookingId) } },
      select: { id: true, status: true },
    });
    const statusById = new Map(bookings.map((b) => [b.id, b.status]));
    const confirmedBookings = attributions.filter((a) => {
      const s = statusById.get(a.bookingId);
      return (
        s === BookingStatus.CONFIRMED_PAID ||
        s === BookingStatus.CONFIRMED_DEPOSIT ||
        s === BookingStatus.CHECKED_IN ||
        s === BookingStatus.COMPLETED
      );
    }).length;
    const cancelledBookings = attributions.filter((a) => {
      const s = statusById.get(a.bookingId);
      return s === BookingStatus.CANCELLED || s === BookingStatus.REFUNDED;
    }).length;
    const revenueGeneratedMinor = attributions.reduce((sum, a) => sum + a.bookingValueMinor, 0);

    const sumByStatus = (rows: { status: string; _sum: { amountMinor: number | null } }[], status: string) =>
      rows.find((r) => r.status === status)?._sum.amountMinor ?? 0;

    const totalClicks = clickCountAgg._sum.clickCount ?? 0;

    return {
      totalCampaigns,
      audienceReach: profile.audienceSize ?? 0,
      clicks: totalClicks,
      leads: totalClicks, // approximation until a distinct lead/signup event exists
      promoCodeUses,
      confirmedBookings,
      cancelledBookings,
      revenueGeneratedMinor,
      commissionEarnedMinor:
        sumByStatus(commissionByStatus, 'PENDING') +
        sumByStatus(commissionByStatus, 'APPROVED') +
        sumByStatus(commissionByStatus, 'PAID'),
      pendingCommissionMinor: sumByStatus(commissionByStatus, 'PENDING'),
      approvedCommissionMinor: sumByStatus(commissionByStatus, 'APPROVED'),
      paidCommissionMinor: sumByStatus(commissionByStatus, 'PAID'),
      conversionRate: totalClicks > 0 ? confirmedBookings / totalClicks : 0,
      pendingPayoutMinor:
        sumByStatus(payoutByStatus, 'PENDING') +
        sumByStatus(payoutByStatus, 'APPROVED') +
        sumByStatus(payoutByStatus, 'PROCESSING'),
      paidPayoutMinor: sumByStatus(payoutByStatus, 'PAID'),
    };
  }

  /** Top-performing properties by attributed bookings/revenue — no external
   * analytics integration, computed entirely from stored attribution rows. */
  async getTopProperties(userId: string) {
    const profile = await this.getOwnedProfile(userId);
    const rows = await this.prisma.influencerBookingAttribution.groupBy({
      by: ['listingId'],
      where: { influencerId: profile.id, listingId: { not: null } },
      _count: { _all: true },
      _sum: { bookingValueMinor: true },
      orderBy: { _sum: { bookingValueMinor: 'desc' } },
      take: 20,
    });
    return rows.map((r) => ({
      listingId: r.listingId,
      bookings: r._count._all,
      revenueMinor: r._sum.bookingValueMinor ?? 0,
    }));
  }

  /** Daily/weekly/monthly performance buckets from attribution rows. Bucketed
   * in application code rather than raw SQL date_trunc to stay portable —
   * acceptable at current data volume; revisit if this needs to scale. */
  async getPerformance(userId: string, granularity: 'daily' | 'weekly' | 'monthly') {
    const profile = await this.getOwnedProfile(userId);
    const attributions = await this.prisma.influencerBookingAttribution.findMany({
      where: { influencerId: profile.id },
      select: { attributedAt: true, bookingValueMinor: true },
      orderBy: { attributedAt: 'asc' },
    });

    const bucketKey = (d: Date) => {
      if (granularity === 'daily') return d.toISOString().slice(0, 10);
      if (granularity === 'monthly') return d.toISOString().slice(0, 7);
      const dayMs = 24 * 60 * 60 * 1000;
      const weekStart = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * dayMs);
      return weekStart.toISOString().slice(0, 10);
    };

    const buckets = new Map<string, { bookings: number; revenueMinor: number }>();
    for (const a of attributions) {
      const key = bucketKey(a.attributedAt);
      const bucket = buckets.get(key) ?? { bookings: 0, revenueMinor: 0 };
      bucket.bookings += 1;
      bucket.revenueMinor += a.bookingValueMinor;
      buckets.set(key, bucket);
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, v]) => ({ period, ...v }));
  }
}
