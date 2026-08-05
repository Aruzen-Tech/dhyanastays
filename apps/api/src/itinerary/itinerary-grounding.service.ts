import { BadRequestException, Injectable } from '@nestjs/common';
import { ExperienceService } from '../experience/experience.service';
import { AvailabilityService } from '../listing/availability.service';
import { ListingService } from '../listing/listing.service';
import { PricingService } from '../pricing/pricing.service';
import { GenerateItineraryDto } from './dto/generate-itinerary.dto';

const MAX_STAYS_TO_VERIFY = 12;
const MAX_EXPERIENCES_TO_VERIFY = 12;

export interface GroundedStayCandidate {
  listingId: string;
  title: string;
  location: string;
  propertyType: string;
  latitude: number | null;
  longitude: number | null;
  experienceTags: string[];
  dietaryOptions: string[];
  price: {
    currency: string;
    nights: number;
    totalMinor: number;
    nightlyBreakdown: Array<{
      date: string;
      rateMinor: number;
    }>;
  };
}

export interface GroundedExperienceCandidate {
  experienceId: string;
  listingId: string | null;
  title: string;
  description: string;
  category: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  startsAt: string;
  endsAt: string;
  priceMinor: number;
  currency: string;
  seatsAvailable: number;
}

export interface ItineraryGroundingContext {
  stays: GroundedStayCandidate[];
  experiences: GroundedExperienceCandidate[];
}

@Injectable()
export class ItineraryGroundingService {
  constructor(
    private readonly listingService: ListingService,
    private readonly availabilityService: AvailabilityService,
    private readonly pricingService: PricingService,
    private readonly experienceService: ExperienceService,
  ) {}

  async buildContext(
    userId: string,
    dto: GenerateItineraryDto,
  ): Promise<ItineraryGroundingContext> {
    const [stays, experiences] = await Promise.all([
      this.buildStayCandidates(userId, dto),
      this.buildExperienceCandidates(dto),
    ]);

    return { stays, experiences };
  }

  private async buildStayCandidates(
    userId: string,
    dto: GenerateItineraryDto,
  ): Promise<GroundedStayCandidate[]> {
    const listings = dto.listingId
      ? [await this.listingService.getPublicListingById(dto.listingId)]
      : await this.listingService.getDiscoveryListings({
          q: dto.destination,
        });

    const checkIn = dto.startsAt.slice(0, 10);
    const checkOut = dto.endsAt.slice(0, 10);

    const results = await Promise.allSettled(
      listings.slice(0, MAX_STAYS_TO_VERIFY).map(async (listing) => {
        const availability = await this.availabilityService.getAvailability(
          listing.id,
          checkIn,
          checkOut,
        );

        const availableForWholeStay =
          availability.days.length > 0 &&
          availability.days.every((day) => day.state === 'AVAILABLE');

        if (!availableForWholeStay) return null;

        const quote = await this.pricingService.quote({
          listingId: listing.id,
          checkIn: dto.startsAt,
          checkOut: dto.endsAt,
          guests: dto.travelers,
          userId,
        });

        return {
          listingId: listing.id,
          title: listing.title,
          location: [listing.city, listing.state].filter(Boolean).join(', '),
          propertyType: String(listing.propertyType ?? ''),
          latitude:
            listing.latitude == null ? null : Number(listing.latitude),
          longitude:
            listing.longitude == null ? null : Number(listing.longitude),
          experienceTags: listing.experienceTags ?? [],
          dietaryOptions: listing.dietaryOptions ?? [],
          price: {
            currency: quote.currency,
            nights: quote.nights,
            totalMinor: quote.total,
            nightlyBreakdown: quote.nightlyBreakdown.map((night) => ({
              date: night.date,
              rateMinor: night.rate,
            })),
          },
        } satisfies GroundedStayCandidate;
      }),
    );

    const candidates = results.flatMap((result) =>
      result.status === 'fulfilled' && result.value ? [result.value] : [],
    );

    if (dto.listingId && candidates.length === 0) {
      throw new BadRequestException(
        'The selected listing is unavailable for these dates or travelers',
      );
    }

    return candidates
      .sort((a, b) => this.scoreStay(b, dto) - this.scoreStay(a, dto))
      .slice(0, 8);
  }

  private scoreStay(
    stay: GroundedStayCandidate,
    dto: GenerateItineraryDto,
  ): number {
    let score = 0;

    if (
      dto.budgetMinor !== undefined &&
      stay.price.totalMinor <= dto.budgetMinor * dto.travelers
    ) {
      score += 30;
    }

    if (dto.interests?.length) {
      const matches = dto.interests.filter((interest) =>
        stay.experienceTags.some((tag) =>
          tag.toLowerCase().includes(interest.toLowerCase()),
        ),
      );

      score += matches.length * 10;
    }

    if (
      dto.dietaryRequirements?.length &&
      dto.dietaryRequirements.every((diet) =>
        stay.dietaryOptions.includes(diet),
      )
    ) {
      score += 20;
    }

    if (
      dto.accommodationPreference &&
      dto.accommodationPreference !== 'no-preference' &&
      stay.propertyType
        .toLowerCase()
        .includes(dto.accommodationPreference.toLowerCase())
    ) {
      score += 15;
    }

    return score;
  }

  private async buildExperienceCandidates(
    dto: GenerateItineraryDto,
  ): Promise<GroundedExperienceCandidate[]> {
    const tripStart = new Date(dto.startsAt);
    const tripEnd = new Date(dto.endsAt);
    const destination = dto.destination.trim().toLowerCase();

    const publicExperiences =
      await this.experienceService.listPublicExperiences({
        upcoming: true,
      });

    const matching = publicExperiences
      .filter((experience) => {
        const startsAt = new Date(experience.startsAt);
        const endsAt = new Date(experience.endsAt);

        const city = String(experience.city ?? '')
          .trim()
          .toLowerCase();

        const state = String(experience.state ?? '')
          .trim()
          .toLowerCase();

        const locationParts = [city, state].filter(Boolean);

        const matchesDestination =
          destination.length > 0 &&
          locationParts.some((part) =>
            destination.includes(part) || part.includes(destination),
          );

        return (
          matchesDestination &&
          startsAt >= tripStart &&
          endsAt <= tripEnd
        );
      })
      .slice(0, MAX_EXPERIENCES_TO_VERIFY);

    const results = await Promise.allSettled(
      matching.map((experience) =>
        this.experienceService.getPublicExperience(experience.id),
      ),
    );

    return results
      .flatMap((result) => {
        if (result.status !== 'fulfilled') return [];

        const experience = result.value;
        if (experience.seatsAvailable < dto.travelers) return [];

        return [
          {
            experienceId: experience.id,
            listingId: experience.listingId ?? null,
            title: experience.title,
            description: String(experience.description ?? '').slice(0, 600),
            category: experience.category,
            location: [experience.city, experience.state]
              .filter(Boolean)
              .join(', '),
            latitude:
              experience.latitude == null
                ? null
                : Number(experience.latitude),
            longitude:
              experience.longitude == null
                ? null
                : Number(experience.longitude),
            startsAt: experience.startsAt.toISOString(),
            endsAt: experience.endsAt.toISOString(),
            priceMinor: experience.priceMinor,
            currency: experience.currency,
            seatsAvailable: experience.seatsAvailable,
          },
        ];
      })
      .sort(
        (a, b) =>
          this.scoreExperience(b, dto) - this.scoreExperience(a, dto),
      )
      .slice(0, 8);
  }

  private scoreExperience(
    experience: GroundedExperienceCandidate,
    dto: GenerateItineraryDto,
  ): number {
    let score = 0;

    if (dto.interests?.length) {
      const category = experience.category.toLowerCase();
      const title = experience.title.toLowerCase();
      const description = experience.description.toLowerCase();

      const matches = dto.interests.filter((interest) => {
        const normalizedInterest = interest.toLowerCase();

        return (
          category.includes(normalizedInterest) ||
          title.includes(normalizedInterest) ||
          description.includes(normalizedInterest)
        );
      });

      score += matches.length * 15;
    }

    if (
      dto.budgetMinor !== undefined &&
      experience.priceMinor <= dto.budgetMinor
    ) {
      score += 20;
    }

    if (experience.seatsAvailable >= dto.travelers) {
      score += 20;
    }

    return score;
  }
}
