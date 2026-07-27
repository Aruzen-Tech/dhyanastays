import { BadRequestException } from '@nestjs/common';
import { ExperienceService } from '../experience/experience.service';
import { AvailabilityService } from '../listing/availability.service';
import { ListingService } from '../listing/listing.service';
import { PricingService } from '../pricing/pricing.service';
import { GenerateItineraryDto } from './dto/generate-itinerary.dto';
import { ItineraryGroundingService } from './itinerary-grounding.service';

describe('ItineraryGroundingService', () => {
  const getPublicListingById = jest.fn();
  const getDiscoveryListings = jest.fn();
  const getAvailability = jest.fn();
  const quote = jest.fn();
  const listPublicExperiences = jest.fn();
  const getPublicExperience = jest.fn();

  let service: ItineraryGroundingService;

  const dto: GenerateItineraryDto = {
    destination: 'Bengaluru, Karnataka',
    startsAt: '2026-08-10T00:00:00.000Z',
    endsAt: '2026-08-12T00:00:00.000Z',
    travelers: 2,
    interests: ['food', 'culture'],
    budgetMinor: 500000,
  };

  const listing = {
    id: 'listing-1',
    title: 'Bengaluru Nature Stay',
    city: 'Bengaluru',
    state: 'Karnataka',
    propertyType: 'RETREAT',
    latitude: 12.9716,
    longitude: 77.5946,
    experienceTags: ['nature'],
    dietaryOptions: ['vegetarian'],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    getDiscoveryListings.mockResolvedValue([]);
    listPublicExperiences.mockResolvedValue([]);

    service = new ItineraryGroundingService(
      {
        getPublicListingById,
        getDiscoveryListings,
      } as unknown as ListingService,
      {
        getAvailability,
      } as unknown as AvailabilityService,
      {
        quote,
      } as unknown as PricingService,
      {
        listPublicExperiences,
        getPublicExperience,
      } as unknown as ExperienceService,
    );
  });

  it('returns verified available stays and matching experiences', async () => {
    getDiscoveryListings.mockResolvedValue([listing]);

    getAvailability.mockResolvedValue({
      listingId: listing.id,
      from: '2026-08-10',
      to: '2026-08-12',
      days: [
        {
          date: '2026-08-10',
          state: 'AVAILABLE',
          priceMinor: 10000,
          isSeasonal: false,
          isTurnover: false,
          minNights: 1,
        },
        {
          date: '2026-08-11',
          state: 'AVAILABLE',
          priceMinor: 12000,
          isSeasonal: true,
          isTurnover: false,
          minNights: 1,
        },
      ],
    });

    quote.mockResolvedValue({
      currency: 'INR',
      nights: 2,
      total: 25000,
      nightlyBreakdown: [
        { date: '2026-08-10', rate: 10000 },
        { date: '2026-08-11', rate: 12000 },
      ],
    });

    listPublicExperiences.mockResolvedValue([
      {
        id: 'experience-1',
        title: 'Bengaluru Food Walk',
        city: 'Bengaluru',
        state: 'Karnataka',
        startsAt: new Date('2026-08-10T10:00:00.000Z'),
        endsAt: new Date('2026-08-10T12:00:00.000Z'),
      },
    ]);

    getPublicExperience.mockResolvedValue({
      id: 'experience-1',
      listingId: listing.id,
      title: 'Bengaluru Food Walk',
      description: 'Guided local food experience.',
      category: 'FOOD',
      city: 'Bengaluru',
      state: 'Karnataka',
      latitude: 12.97,
      longitude: 77.59,
      startsAt: new Date('2026-08-10T10:00:00.000Z'),
      endsAt: new Date('2026-08-10T12:00:00.000Z'),
      priceMinor: 1500,
      currency: 'INR',
      seatsAvailable: 4,
    });

    const result = await service.buildContext('user-1', dto);

    expect(result.stays).toHaveLength(1);
    expect(result.stays[0]).toMatchObject({
      listingId: 'listing-1',
      title: 'Bengaluru Nature Stay',
      price: {
        currency: 'INR',
        nights: 2,
        totalMinor: 25000,
      },
    });

    expect(result.experiences).toHaveLength(1);
    expect(result.experiences[0]).toMatchObject({
      experienceId: 'experience-1',
      seatsAvailable: 4,
    });

    expect(quote).toHaveBeenCalledWith({
      listingId: 'listing-1',
      checkIn: dto.startsAt,
      checkOut: dto.endsAt,
      guests: 2,
      userId: 'user-1',
    });
  });

  it('rejects a selected listing that is unavailable', async () => {
    getPublicListingById.mockResolvedValue(listing);

    getAvailability.mockResolvedValue({
      listingId: listing.id,
      from: '2026-08-10',
      to: '2026-08-12',
      days: [
        {
          date: '2026-08-10',
          state: 'BOOKED',
          priceMinor: 10000,
          isSeasonal: false,
          isTurnover: false,
          minNights: 1,
        },
      ],
    });

    await expect(
      service.buildContext('user-1', {
        ...dto,
        listingId: listing.id,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(quote).not.toHaveBeenCalled();
  });

  it('does not match experiences with missing location data', async () => {
    listPublicExperiences.mockResolvedValue([
      {
        id: 'experience-without-location',
        city: null,
        state: null,
        startsAt: new Date('2026-08-10T10:00:00.000Z'),
        endsAt: new Date('2026-08-10T12:00:00.000Z'),
      },
    ]);

    const result = await service.buildContext('user-1', dto);

    expect(result.experiences).toEqual([]);
    expect(getPublicExperience).not.toHaveBeenCalled();
  });
});
