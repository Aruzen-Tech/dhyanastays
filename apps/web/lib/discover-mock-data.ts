// Static content for the lower Discover-page sections (Destinations,
// Testimonials, Seed Ball Mission, Journal, CTA). UI-only for now, per
// explicit instruction — these are not backed by any API yet. Reconstructed
// from the ReferenceUI design mockup; will be swapped for real data when
// those sections get their backend integration pass.

export interface DiscoverDestination {
  name: string;
  state: string;
  properties: number;
  image: string;
}

export const destinations: DiscoverDestination[] = [
  {
    name: 'Auroville',
    state: 'Tamil Nadu',
    properties: 12,
    image:
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=800&auto=format&fit=crop',
  },
  {
    name: 'Pondicherry',
    state: 'Puducherry',
    properties: 14,
    image:
      'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?q=80&w=800&auto=format&fit=crop',
  },
  {
    name: 'Ooty',
    state: 'Tamil Nadu',
    properties: 8,
    image:
      'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?q=80&w=800&auto=format&fit=crop',
  },
];

export interface DiscoverCategory {
  slug: string;
  name: string;
  icon: string;
  count: number;
}

// Icon keys map to Microsoft's Fluent 3D emoji set in DiscoverCategories.tsx.
export const categories: DiscoverCategory[] = [
  { slug: 'tiny-houses', name: 'Tiny Houses', icon: 'Home', count: 24 },
  { slug: 'farm-stays', name: 'Farm Stays', icon: 'Sprout', count: 38 },
  { slug: 'wellness-retreats', name: 'Wellness Retreats', icon: 'Heart', count: 15 },
  { slug: 'luxury-villas', name: 'Luxury Villas', icon: 'Crown', count: 12 },
  { slug: 'eco-stays', name: 'Eco Stays', icon: 'Leaf', count: 20 },
  { slug: 'heritage-homes', name: 'Heritage Homes', icon: 'Landmark', count: 18 },
  { slug: 'workations', name: 'Workations', icon: 'Laptop', count: 21 },
  { slug: 'couple-escapes', name: 'Couple Escapes', icon: 'HeartHandshake', count: 27 },
  { slug: 'family-holidays', name: 'Family Holidays', icon: 'Users', count: 33 },
  { slug: 'pet-friendly', name: 'Pet Friendly', icon: 'PawPrint', count: 16 },
  { slug: 'adventure-camps', name: 'Adventure Camps', icon: 'Mountain', count: 11 },
  { slug: 'boutique-resorts', name: 'Boutique Resorts', icon: 'Castle', count: 8 },
];

export type TestimonialCategory = 'guest-stays' | 'experiences' | 'investors';

export interface Testimonial {
  id: string;
  name: string;
  location: string;
  avatar: string;
  rating: number;
  comment: string;
  category: TestimonialCategory;
  stayName: string;
  propertySlug?: string;
  experienceId?: string;
  helpfulCount?: number;
}

export const testimonials: Testimonial[] = [
  {
    id: 't1',
    name: 'Priya Nair',
    location: 'Kochi',
    avatar: 'https://i.pravatar.cc/100?img=47',
    rating: 5,
    comment:
      "Nila Wellness Retreat was exactly the reset I needed. The staff remembered my name by day two, the food was incredible, and the silence at night was the best part of the whole trip.",
    category: 'guest-stays',
    stayName: 'Nila Wellness Retreat',
    helpfulCount: 17,
  },
  {
    id: 't2',
    name: 'Farhan Sheikh',
    location: 'Hyderabad',
    avatar: 'https://i.pravatar.cc/100?img=12',
    rating: 5,
    comment:
      "Joined the Joint Investment Model on a new property last year and the quarterly reports have been detailed and on time, every time. This is the first hospitality investment that's actually felt transparent.",
    category: 'investors',
    stayName: 'the Joint Investment Program',
    helpfulCount: 9,
  },
  {
    id: 't3',
    name: 'Ananya Iyer',
    location: 'Chennai',
    avatar: 'https://i.pravatar.cc/100?img=32',
    rating: 5,
    comment:
      "The farm-to-table cooking class at Stone Valley is worth booking on its own, even without staying the night. Chef Elena walked us through the kitchen garden before we cooked a single dish.",
    category: 'experiences',
    stayName: 'Farm-to-Table Cooking Class',
    helpfulCount: 21,
  },
  {
    id: 't4',
    name: 'Rohan Mehta',
    location: 'Pune',
    avatar: 'https://i.pravatar.cc/100?img=68',
    rating: 4,
    comment:
      'Misty Hills Cottage in Ooty was cozy and quiet, exactly what the listing promised. Host was quick to respond about the drive up.',
    category: 'guest-stays',
    stayName: 'Misty Hills Cottage',
    helpfulCount: 6,
  },
  {
    id: 't5',
    name: 'Sneha Reddy',
    location: 'Bengaluru',
    avatar: 'https://i.pravatar.cc/100?img=25',
    rating: 5,
    comment:
      'The sunrise yoga session by the backwaters was worth waking up at 5am for. Small group, patient instructor, beautiful setting.',
    category: 'experiences',
    stayName: 'Sunrise Yoga by the Backwaters',
    helpfulCount: 11,
  },
  {
    id: 't6',
    name: 'Vikram Sharma',
    location: 'Delhi',
    avatar: 'https://i.pravatar.cc/100?img=51',
    rating: 5,
    comment:
      'Fractional ownership through Dhyana has been the most hands-off real estate investment I own — payouts land on schedule every month.',
    category: 'investors',
    stayName: 'Serenity Beachside Retreat',
    helpfulCount: 14,
  },
];

export const totalGuestStoryCount = 128;

export interface BlogPost {
  id: string;
  slug: string;
  image: string;
  category: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
}

export const blogPosts: BlogPost[] = [
  {
    id: 'b1',
    slug: 'why-tiny-houses-are-the-future-of-sustainable-travel',
    image:
      'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?q=80&w=800&auto=format&fit=crop',
    category: 'Architecture',
    title: 'Why Tiny Houses Are the Future of Sustainable Travel',
    excerpt:
      'Discover how minimalist architecture is revolutionizing the hospitality industry and why travellers are falling for less.',
    date: '2026-06-28',
    readTime: '6 min',
  },
  {
    id: 'b2',
    slug: 'art-of-farm-to-table-south-indian-kitchens',
    image:
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=800&auto=format&fit=crop',
    category: 'Food & Culture',
    title: 'The Art of Farm-to-Table: A Journey Through South Indian Kitchens',
    excerpt:
      "From tamarind groves to coconut toddy, explore how India's farm stays are redefining culinary tourism.",
    date: '2026-06-15',
    readTime: '8 min',
  },
  {
    id: 'b3',
    slug: 'designing-for-peace-architecture-that-heals',
    image:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop',
    category: 'Wellness',
    title: 'Designing for Peace: Architecture That Heals',
    excerpt:
      'How spatial design, natural materials, and biophilic principles create environments that calm the nervous system.',
    date: '2026-05-30',
    readTime: '7 min',
  },
  {
    id: 'b4',
    slug: 'investing-in-curated-stays-a-new-asset-class',
    image:
      'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=800&auto=format&fit=crop',
    category: 'Investment',
    title: 'Investing in Curated Stays: A New Asset Class',
    excerpt:
      'Why fractional hospitality investment is becoming the smartest alternative investment for a new generation.',
    date: '2026-05-15',
    readTime: '10 min',
  },
];

export const seedBallMission = {
  distributed: 12_847_320,
  goal: 100_000_000,
  created: 14_286_400,
  treesEstimated: 3_211_830,
  co2OffsetTons: 96_355,
  volunteers: 8_640,
  donationsCollected: 18_420_000, // paise-free rupee figure, displayed as ₹184.2L
  monthlyTarget: 850_000,
  statesCovered: 21,
};

export const topStatesCovered = [
  { state: 'Tamil Nadu', seedBalls: 2_140_000 },
  { state: 'Karnataka', seedBalls: 1_880_000 },
  { state: 'Himachal Pradesh', seedBalls: 1_420_000 },
  { state: 'Kerala', seedBalls: 1_210_000 },
  { state: 'Rajasthan', seedBalls: 980_000 },
];

export const volunteerStories = [
  {
    name: 'Aarya K.',
    role: 'Volunteer since 2025',
    quote:
      'We dispersed 4,000 seed balls across the Nilgiris in a single weekend — seeing the first saplings this year was unreal.',
    avatar: 'https://i.pravatar.cc/100?img=15',
  },
  {
    name: 'Karthik M.',
    role: 'Regional Coordinator, Tamil Nadu',
    quote:
      'What started as a college project turned into 40 plantation drives across three districts.',
    avatar: 'https://i.pravatar.cc/100?img=33',
  },
  {
    name: 'Divya K.',
    role: 'Corporate CSR Volunteer',
    quote:
      "Our whole team flew in for a weekend seed ball drive with Dhyana Stays — it's now an annual tradition.",
    avatar: 'https://i.pravatar.cc/100?img=44',
  },
];

export const campaignPhotos = [
  'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500534623283-312aade485b7?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1533662622107-a8e547b4d861?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=400&auto=format&fit=crop',
];
