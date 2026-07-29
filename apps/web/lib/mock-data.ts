// ============================================
// DHYANA STAYS — Mock Data
// Complete mock dataset for all Phase 1 screens
// ============================================

export interface Property {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  story: string;
  category: string;
  location: {
    city: string;
    state: string;
    country: string;
    coordinates: { lat: number; lng: number };
  };
  images: string[];
  /** Extended photo set shown in the gallery modal — always 6–8 images, distinct per stay. */
  galleryImages: string[];
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  area: string;
  amenities: string[];
  highlights: string[];
  host: {
    name: string;
    avatar: string;
    since: string;
    responseRate: string;
    responseTime: string;
    bio: string;
    verified: boolean;
    languages: string[];
  };
  houseRules: string[];
  cancellationPolicy: string;
  badges: string[];
  isFeatured: boolean;
  isTrending: boolean;
  sustainability: string[];
}

export interface Review {
  id: string;
  propertyId: string;
  userName: string;
  avatar: string;
  rating: number;
  date: string;
  comment: string;
  travelType: string;
  images?: string[];
  hostReply?: string;
}

export interface Experience {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  duration: string;
  rating: number;
  reviewCount: number;
  image: string;
  location: string;
  gallery?: string[];
  video?: string;
  host?: { name: string; role: string; avatar: string };
  included?: string[];
  groupSize?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
  slug: string;
}

export interface Testimonial {
  id: string;
  name: string;
  avatar: string;
  location: string;
  rating: number;
  comment: string;
  stayName: string;
  category: "guest-stays" | "experiences" | "investors";
  propertySlug?: string;
  experienceId?: string;
  helpfulCount?: number;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

// ============================================
// PROPERTIES
// ============================================

export const properties: Property[] = [
  {
    id: "1",
    name: "The Canopy Tiny House",
    slug: "canopy-tiny-house",
    tagline: "Where the forest floor becomes your living room",
    description: "Perched among ancient mango trees, The Canopy is a minimalist tiny house designed for those who crave silence, stars, and the gentle rustling of leaves. Every corner of this 280 sq ft retreat is thoughtfully crafted to maximize natural light and airflow.",
    story: "Built by a retired architect who believed that the most profound luxury is simplicity, The Canopy was designed over three years using locally sourced teak and recycled steel. The structure sits on stilts to preserve the forest floor beneath, allowing wildlife to pass freely underneath.",
    category: "Tiny House",
    location: { city: "Auroville", state: "Tamil Nadu", country: "India", coordinates: { lat: 12.0059, lng: 79.8105 } },
    images: [
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1518602164578-cd0074062767?q=80&w=1200&auto=format&fit=crop",
    ],
    galleryImages: [
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1518602164578-cd0074062767?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1521401830884-6c03c1c87ebb?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1681295692638-97ace05f56b4?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1465101162946-4377e57745c3?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1701432936092-c854d7bc0f43?q=80&w=1200&auto=format&fit=crop",
    ],
    price: 4500,
    originalPrice: 5500,
    rating: 4.9,
    reviewCount: 128,
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    area: "280 sq ft",
    amenities: ["Wi-Fi", "Kitchen", "Outdoor Shower", "Campfire", "Organic Farm", "Yoga Deck", "Cycling", "Bird Watching"],
    highlights: ["Architect-designed", "Forest immersion", "Zero waste", "Organic breakfast"],
    host: { name: "Arjun Menon", avatar: "https://i.pravatar.cc/150?img=12", since: "2022", responseRate: "98%", responseTime: "< 1 hour", bio: "Architect and nature lover. I believe great stays are born from respecting the land.", verified: true, languages: ["English", "Tamil", "Hindi"] },
    houseRules: ["Check-in: 2:00 PM", "Check-out: 11:00 AM", "No smoking indoors", "Quiet hours: 10 PM – 7 AM", "Pets welcome with notice"],
    cancellationPolicy: "Free cancellation up to 7 days before check-in. 50% refund for cancellations 3-7 days before. No refund within 3 days.",
    badges: ["Curated Stay", "Eco Certified", "Design Excellence"],
    isFeatured: true,
    isTrending: true,
    sustainability: ["Solar powered", "Rainwater harvesting", "Organic farm", "Zero single-use plastic"],
  },
  {
    id: "2",
    name: "Stone Valley Farm Stay",
    slug: "stone-valley-farm-stay",
    tagline: "Where agriculture meets architecture",
    description: "A stunning farm stay nestled between granite boulders and cashew plantations. Stone Valley offers an authentic farming experience wrapped in contemporary design — think exposed stone walls, floor-to-ceiling glass, and a farm-to-table kitchen.",
    story: "What started as a family cashew farm three generations ago has been reimagined into a hospitality destination that celebrates agriculture. The original stone walls have been preserved and integrated into the new architecture.",
    category: "Farm Stay",
    location: { city: "Kodaikanal", state: "Tamil Nadu", country: "India", coordinates: { lat: 10.2381, lng: 77.4892 } },
    images: [
      "https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1523217582562-09d0def993a6?q=80&w=1200&auto=format&fit=crop",
    ],
    galleryImages: [
      "https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1523217582562-09d0def993a6?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1670494264392-8bfb0200a775?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1761839257961-4dce65b72d99?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1758272960816-6126b6607596?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1699548891120-06abb3217cde?q=80&w=1200&auto=format&fit=crop",
    ],
    price: 6800,
    rating: 4.8,
    reviewCount: 94,
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 2,
    area: "1,200 sq ft",
    amenities: ["Wi-Fi", "Kitchen", "Swimming Pool", "BBQ", "Organic Farm", "Campfire", "Parking", "Pet Friendly"],
    highlights: ["Heritage stone walls", "Farm-to-table dining", "Swimming pool", "Family friendly"],
    host: { name: "Priya Shankar", avatar: "https://i.pravatar.cc/150?img=25", since: "2021", responseRate: "95%", responseTime: "< 2 hours", bio: "Third-generation farmer turning our family land into unforgettable experiences.", verified: true, languages: ["English", "Tamil"] },
    houseRules: ["Check-in: 3:00 PM", "Check-out: 11:00 AM", "No smoking", "Quiet hours: 10 PM – 6 AM"],
    cancellationPolicy: "Free cancellation up to 14 days before check-in.",
    badges: ["Curated Stay", "Family Friendly"],
    isFeatured: true,
    isTrending: false,
    sustainability: ["Organic farming", "Solar water heater", "Composting"],
  },
  {
    id: "3",
    name: "Nila Wellness Retreat",
    slug: "nila-wellness-retreat",
    tagline: "Heal. Breathe. Transform.",
    description: "An Ayurvedic wellness retreat set on the banks of the Nila river. This sustainably built bamboo-and-laterite complex offers yoga halls, meditation gardens, Ayurvedic treatment rooms, and riverside villas designed for deep healing.",
    story: "Founded by a couple who left corporate careers to pursue their passion for traditional healing, Nila was built entirely using local materials — bamboo, laterite, and palm thatch — following ancient Vastu principles.",
    category: "Wellness Retreat",
    location: { city: "Palakkad", state: "Kerala", country: "India", coordinates: { lat: 10.7867, lng: 76.6548 } },
    images: [
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=1200&auto=format&fit=crop",
    ],
    galleryImages: [
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1521401830884-6c03c1c87ebb?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1742626157111-59f3f1019a8a?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1465101162946-4377e57745c3?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1701432936092-c854d7bc0f43?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1200&auto=format&fit=crop",
    ],
    price: 8500,
    rating: 4.95,
    reviewCount: 67,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 2,
    area: "900 sq ft",
    amenities: ["Yoga Hall", "Meditation Garden", "Ayurvedic Spa", "Organic Kitchen", "River Access", "Library", "Wi-Fi"],
    highlights: ["Ayurvedic treatments", "Riverside location", "Yoga sessions", "Digital detox"],
    host: { name: "Dr. Lakshmi Nair", avatar: "https://i.pravatar.cc/150?img=26", since: "2020", responseRate: "99%", responseTime: "< 30 min", bio: "Ayurvedic physician & wellness architect. Every stay here is a journey inward.", verified: true, languages: ["English", "Malayalam", "Hindi"] },
    houseRules: ["Check-in: 2:00 PM", "Check-out: 10:00 AM", "No alcohol", "No smoking", "Silence zone after 9 PM"],
    cancellationPolicy: "Free cancellation up to 10 days before check-in.",
    badges: ["Curated Stay", "Wellness Certified", "Eco Certified", "Signature Stay"],
    isFeatured: true,
    isTrending: true,
    sustainability: ["Bamboo construction", "Solar energy", "Rainwater harvesting", "Zero waste kitchen", "Native landscaping"],
  },
  {
    id: "4",
    name: "The Glass Pavilion",
    slug: "glass-pavilion",
    tagline: "Luxury framed by the Western Ghats",
    description: "A stunning glass-walled villa offering 270° views of the Western Ghats. Designed by an award-winning architect, this luxurious 3-bedroom retreat features an infinity pool, private chef service, and floor-to-ceiling windows that blur the line between indoors and nature.",
    story: "The Glass Pavilion was conceived as an experiment in transparent architecture — the idea that a building should frame the landscape rather than obstruct it.",
    category: "Luxury Villa",
    location: { city: "Wayanad", state: "Kerala", country: "India", coordinates: { lat: 11.6854, lng: 76.1320 } },
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1483683804023-6ccdb62f86ef?q=80&w=1200&auto=format&fit=crop",
    ],
    galleryImages: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1483683804023-6ccdb62f86ef?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1638884896143-f1b2501e9a61?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1661773031258-9bd959928118?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1649511125503-3b23dc239c96?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1491497895121-1334fc14d8c9?q=80&w=1200&auto=format&fit=crop",
    ],
    price: 18500,
    originalPrice: 22000,
    rating: 4.85,
    reviewCount: 42,
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 3,
    area: "2,400 sq ft",
    amenities: ["Infinity Pool", "Private Pool", "Bathtub", "Private Chef", "Wi-Fi", "AC", "Home Theatre", "BBQ", "Wine Cellar", "Parking", "Gym"],
    highlights: ["270° mountain views", "Infinity pool", "Private chef", "Award-winning design"],
    host: { name: "Rahul & Meera Kapoor", avatar: "https://i.pravatar.cc/150?img=13", since: "2023", responseRate: "100%", responseTime: "< 1 hour", bio: "We design luxury that respects nature. Every stay should be a masterpiece.", verified: true, languages: ["English", "Hindi", "Malayalam"] },
    houseRules: ["Check-in: 3:00 PM", "Check-out: 12:00 PM", "No parties", "Pool rules apply"],
    cancellationPolicy: "Free cancellation up to 21 days before check-in. 50% refund for 7-21 days.",
    badges: ["Curated Stay", "Signature Stay", "Luxury Collection"],
    isFeatured: true,
    isTrending: true,
    sustainability: ["Solar panels", "Natural ventilation"],
  },
  {
    id: "5",
    name: "Bamboo Nest Eco Stay",
    slug: "bamboo-nest-eco-stay",
    tagline: "Live like nature intended",
    description: "A cluster of elevated bamboo cabins connected by wooden walkways through a dense spice plantation. Each cabin is designed to be completely off-grid while offering surprising comfort — handwoven mattresses, solar-heated showers, and stargazing decks.",
    story: "Bamboo Nest was built by a community of local artisans using traditional construction techniques. No machine-cut wood was used — every joint is hand-carved.",
    category: "Eco Stay",
    location: { city: "Munnar", state: "Kerala", country: "India", coordinates: { lat: 10.0889, lng: 77.0595 } },
    images: [
      "https://images.unsplash.com/photo-1571055107559-3e67626fa8be?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop",
    ],
    galleryImages: [
      "https://images.unsplash.com/photo-1571055107559-3e67626fa8be?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1444464666168-49d633b86797?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1742626157111-59f3f1019a8a?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1465101162946-4377e57745c3?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1593693411515-c20261bcad6e?q=80&w=1200&auto=format&fit=crop",
    ],
    price: 3200,
    rating: 4.7,
    reviewCount: 156,
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    area: "200 sq ft",
    amenities: ["Stargazing Deck", "Organic Meals", "Spice Garden", "Guided Trek", "Campfire", "Bird Watching"],
    highlights: ["100% off-grid", "Handcrafted bamboo", "Spice plantation", "Stargazing"],
    host: { name: "Thomas Kurien", avatar: "https://i.pravatar.cc/150?img=14", since: "2019", responseRate: "92%", responseTime: "< 3 hours", bio: "Conservationist and storyteller. My stays are built by the community, for the community.", verified: true, languages: ["English", "Malayalam"] },
    houseRules: ["Check-in: 2:00 PM", "Check-out: 11:00 AM", "No plastic allowed", "Respect wildlife"],
    cancellationPolicy: "Free cancellation up to 5 days before check-in.",
    badges: ["Curated Stay", "Eco Certified", "Community Built"],
    isFeatured: false,
    isTrending: true,
    sustainability: ["100% off-grid", "Bamboo construction", "No plastic", "Community built", "Native landscaping"],
  },
  {
    id: "6",
    name: "Heritage Courtyard Villa",
    slug: "heritage-courtyard-villa",
    tagline: "A 200-year-old story, retold for today",
    description: "A meticulously restored 200-year-old Chettinad mansion with original hand-painted tiles, carved wooden columns, and a central courtyard. Modern comforts have been seamlessly integrated while preserving every historical detail.",
    story: "This villa was almost demolished before an architect-conservationist stepped in to save it. Three years and 400 artisans later, it stands as a testament to Chettinad heritage.",
    category: "Heritage Home",
    location: { city: "Karaikudi", state: "Tamil Nadu", country: "India", coordinates: { lat: 10.0735, lng: 78.7811 } },
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1200&auto=format&fit=crop",
    ],
    galleryImages: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1596797038530-2c107229654b?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1688820661462-a44e4b2770e8?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1758272960816-6126b6607596?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1650847821830-2c24e212213f?q=80&w=1200&auto=format&fit=crop",
    ],
    price: 7200,
    rating: 4.9,
    reviewCount: 83,
    maxGuests: 8,
    bedrooms: 4,
    bathrooms: 3,
    area: "3,500 sq ft",
    amenities: ["Courtyard", "Heritage Kitchen", "Library", "Wi-Fi", "AC", "Garden", "Cooking Class", "Heritage Walk"],
    highlights: ["200-year-old mansion", "Original tile work", "Chettinad cooking class", "Heritage architecture"],
    host: { name: "Vijay Raghavan", avatar: "https://i.pravatar.cc/150?img=15", since: "2021", responseRate: "96%", responseTime: "< 1 hour", bio: "Architecture conservationist. I believe old buildings have stories worth saving.", verified: true, languages: ["English", "Tamil", "Hindi"] },
    houseRules: ["Check-in: 2:00 PM", "Check-out: 11:00 AM", "No smoking", "Photography welcome"],
    cancellationPolicy: "Free cancellation up to 14 days before check-in.",
    badges: ["Curated Stay", "Heritage Certified", "Signature Stay"],
    isFeatured: true,
    isTrending: false,
    sustainability: ["Restored heritage", "Natural ventilation", "Rainwater harvesting"],
  },
  {
    id: "7",
    name: "Sunset Shore Beach House",
    slug: "sunset-shore-beach-house",
    tagline: "Where the tide meets your doorstep",
    description: "A thatched-roof beach house steps from the Arabian Sea, built for slow mornings on the sand and long, unhurried sunsets. Open-plan living spills onto a private veranda facing the water.",
    story: "Once a fisherman's cottage, Sunset Shore was rebuilt plank by plank using reclaimed wood and local laterite, keeping the original footprint so the dunes around it were never disturbed.",
    category: "Beach House",
    location: { city: "Goa", state: "Goa", country: "India", coordinates: { lat: 15.2993, lng: 74.1240 } },
    images: [
      "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1520454974749-611b7248ffdb?q=80&w=1200&auto=format&fit=crop",
    ],
    galleryImages: [
      "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1520454974749-611b7248ffdb?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1455279145601-37efa82b5c95?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1593693411515-c20261bcad6e?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1650847821830-2c24e212213f?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1701432936092-c854d7bc0f43?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1491497895121-1334fc14d8c9?q=80&w=1200&auto=format&fit=crop",
    ],
    price: 9500,
    originalPrice: 11000,
    rating: 4.75,
    reviewCount: 71,
    maxGuests: 5,
    bedrooms: 2,
    bathrooms: 2,
    area: "1,400 sq ft",
    amenities: ["Wi-Fi", "Public Pool", "Bathtub", "AC", "Beach Access", "BBQ", "Parking", "Home Theatre"],
    highlights: ["Beachfront location", "Private veranda", "Sunset views", "5-minute walk to the shacks"],
    host: { name: "Ines D'Souza", avatar: "https://i.pravatar.cc/150?img=32", since: "2022", responseRate: "97%", responseTime: "< 2 hours", bio: "Goan by birth, host by heart. I want every guest to slow down the way this coast taught me to.", verified: true, languages: ["English", "Konkani", "Hindi"] },
    houseRules: ["Check-in: 3:00 PM", "Check-out: 11:00 AM", "No loud music after 10 PM", "No outside guests at the pool"],
    cancellationPolicy: "Free cancellation up to 7 days before check-in.",
    badges: ["Curated Stay", "Beachfront"],
    isFeatured: false,
    isTrending: true,
    sustainability: ["Reclaimed wood construction", "Solar water heater", "Dune conservation"],
  },
  {
    id: "8",
    name: "Whispering Pines Adventure Camp",
    slug: "whispering-pines-adventure-camp",
    tagline: "Pitch a tent, chase a sunrise",
    description: "A cluster of walk-in safari tents set in a pine and coffee estate above Coorg, built for trekkers and campfire people. Days start with guided treks and end with everyone around the same fire.",
    story: "Started by two trekking guides who got tired of guests having nowhere to stay after a trek, Whispering Pines keeps things deliberately simple — canvas, firewood, and good trails.",
    category: "Adventure Camp",
    location: { city: "Coorg", state: "Karnataka", country: "India", coordinates: { lat: 12.4244, lng: 75.7382 } },
    images: [
      "https://images.unsplash.com/photo-1445308394109-4ec2920981b1?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?q=80&w=1200&auto=format&fit=crop",
    ],
    galleryImages: [
      "https://images.unsplash.com/photo-1445308394109-4ec2920981b1?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1758272960816-6126b6607596?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1611095973763-414019e72400?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1444464666168-49d633b86797?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1742626157111-59f3f1019a8a?q=80&w=1200&auto=format&fit=crop",
    ],
    price: 2200,
    rating: 4.6,
    reviewCount: 103,
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    area: "120 sq ft",
    amenities: ["Wi-Fi", "Bonfire", "Guided Trek", "Common Bathrooms", "Parking"],
    highlights: ["Guided sunrise treks", "Nightly bonfire", "Coffee estate setting", "Budget-friendly"],
    host: { name: "Kiran & Deepak", avatar: "https://i.pravatar.cc/150?img=51", since: "2021", responseRate: "94%", responseTime: "< 3 hours", bio: "Trekking guides first, hosts second. We'll get you up for the sunrise if it kills us.", verified: true, languages: ["English", "Kannada", "Hindi"] },
    houseRules: ["Check-in: 12:00 PM", "Check-out: 10:00 AM", "No AC — pack for the hills", "Lights out at the campfire by 11 PM"],
    cancellationPolicy: "Free cancellation up to 3 days before check-in.",
    badges: ["Curated Stay", "Budget Friendly"],
    isFeatured: false,
    isTrending: false,
    sustainability: ["Solar lighting", "No single-use plastic", "Local guide employment"],
  },
];

// ============================================
// CATEGORIES
// ============================================

export const categories = [
  { name: "Tiny Houses", icon: "Home", count: 24, slug: "tiny-houses", description: "Minimalist living, maximum experience" },
  { name: "Farm Stays", icon: "Sprout", count: 38, slug: "farm-stays", description: "Connect with the land" },
  { name: "Wellness Retreats", icon: "Heart", count: 15, slug: "wellness-retreats", description: "Heal body and soul" },
  { name: "Luxury Villas", icon: "Crown", count: 12, slug: "luxury-villas", description: "Uncompromising elegance" },
  { name: "Eco Stays", icon: "Leaf", count: 29, slug: "eco-stays", description: "Sustainable luxury" },
  { name: "Heritage Homes", icon: "Landmark", count: 18, slug: "heritage-homes", description: "Stories in stone" },
  { name: "Workations", icon: "Laptop", count: 21, slug: "workations", description: "Work from paradise" },
  { name: "Couple Escapes", icon: "HeartHandshake", count: 27, slug: "couple-escapes", description: "Romance redefined" },
  { name: "Family Holidays", icon: "Users", count: 33, slug: "family-holidays", description: "Memories for generations" },
  { name: "Pet Friendly", icon: "PawPrint", count: 16, slug: "pet-friendly", description: "Bring your fur baby" },
  { name: "Adventure Camps", icon: "Mountain", count: 11, slug: "adventure-camps", description: "Thrill seekers welcome" },
  { name: "Boutique Resorts", icon: "Castle", count: 8, slug: "boutique-resorts", description: "Intimate grandeur" },
];

// ============================================
// DESTINATIONS
// ============================================

export const destinations = [
  { name: "Auroville", state: "Tamil Nadu", image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=1200&auto=format&fit=crop", properties: 12 },
  { name: "Pondicherry", state: "Pondicherry", image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?q=80&w=1200&auto=format&fit=crop", properties: 14 },
];

// ============================================
// REVIEWS
// ============================================

export const reviews: Review[] = [
  { id: "r1", propertyId: "1", userName: "Ananya Sharma", avatar: "https://i.pravatar.cc/150?img=32", rating: 5, date: "2026-06-15", comment: "The Canopy is everything the photos promise and more. Waking up to birdsong and coffee brewed on a wood stove — this is the real luxury. Arjun's attention to detail is extraordinary.", travelType: "Couple", images: ["https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=800&auto=format&fit=crop"] },
  { id: "r2", propertyId: "1", userName: "Rohan Desai", avatar: "https://i.pravatar.cc/150?img=16", rating: 5, date: "2026-05-28", comment: "I came here to disconnect and I succeeded completely. The zero-waste approach is genuine — not performative. Best decision of 2026.", travelType: "Solo", hostReply: "Thank you, Rohan! Your respect for our ecosystem made you the perfect guest." },
  { id: "r3", propertyId: "2", userName: "Deepika Menon", avatar: "https://i.pravatar.cc/150?img=33", rating: 5, date: "2026-06-01", comment: "Our kids loved the farm experience! Milking cows, picking cashews, and swimming in the natural pool. Priya made us feel like family.", travelType: "Family" },
  { id: "r4", propertyId: "3", userName: "Kavitha Reddy", avatar: "https://i.pravatar.cc/150?img=34", rating: 5, date: "2026-05-10", comment: "I've been to wellness retreats across the world — Bali, Thailand, Sedona. Nila rivals them all at a fraction of the cost. The Ayurvedic treatments were life-changing.", travelType: "Solo" },
  { id: "r5", propertyId: "4", userName: "Amit & Neha Joshi", avatar: "https://i.pravatar.cc/150?img=17", rating: 5, date: "2026-04-22", comment: "The infinity pool overlooking the Ghats at sunrise is a memory we'll carry forever. Worth every rupee.", travelType: "Couple" },
];

// ============================================
// EXPERIENCES
// ============================================

export const experiences: Experience[] = [
  {
    id: "e1",
    name: "Sunrise Yoga at Auroville",
    category: "Wellness",
    description: "Begin your day with a guided yoga session overlooking the Matrimandir at golden hour. We move through a slow, breath-led vinyasa sequence as the sun comes up over the amphitheatre, then close with 15 minutes of silent meditation. No experience needed — mats, blocks and water are provided.",
    price: 800,
    duration: "1.5 hours",
    rating: 4.9,
    reviewCount: 45,
    image: "https://images.unsplash.com/photo-1521401830884-6c03c1c87ebb?q=80&w=800&auto=format&fit=crop",
    location: "Auroville",
    gallery: [
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=800&auto=format&fit=crop",
    ],
    video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    host: { name: "Kavitha Ram", role: "Certified Hatha & Vinyasa instructor · 8 years", avatar: "https://i.pravatar.cc/150?img=45" },
    included: ["Guided vinyasa sequence", "Yoga mat & props", "Herbal tea after class", "Meditation cushion"],
    groupSize: "Up to 12 people",
  },
  {
    id: "e2",
    name: "Farm-to-Table Cooking Class",
    category: "Food",
    description: "Harvest ingredients from an organic farm and cook a traditional South Indian meal with a master chef. You'll pick vegetables straight off the vine, learn to grind a fresh masala on a stone grinder, and plate a full meal you'll then sit down and eat together.",
    price: 1500,
    duration: "3 hours",
    rating: 4.8,
    reviewCount: 32,
    image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?q=80&w=800&auto=format&fit=crop",
    location: "Kodaikanal",
    gallery: [
      "https://images.unsplash.com/photo-1607301405390-d831c242f59b?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1552083375-1447ce886485?q=80&w=800&auto=format&fit=crop",
    ],
    video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4",
    host: { name: "Chef Elena", role: "Farm cuisine specialist · Stone Valley kitchen", avatar: "https://i.pravatar.cc/150?img=44" },
    included: ["Farm harvest walk", "Hands-on cooking session", "Full meal & recipe card", "Apron to keep"],
    groupSize: "Up to 8 people",
  },
  {
    id: "e3",
    name: "Western Ghats Trek",
    category: "Adventure",
    description: "A guided trek through pristine shola forests with a naturalist who knows every bird and butterfly. The trail climbs gently through montane grassland before dropping into a cloud forest — expect waterfalls, wild elephant tracks, and views across three states on a clear day.",
    price: 1200,
    duration: "5 hours",
    rating: 4.7,
    reviewCount: 28,
    image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=800&auto=format&fit=crop",
    location: "Munnar",
    gallery: [
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?q=80&w=800&auto=format&fit=crop",
    ],
    video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    host: { name: "Joseph Varghese", role: "Naturalist & trek guide · 12 years", avatar: "https://i.pravatar.cc/150?img=52" },
    included: ["Naturalist-led trek", "Packed trail lunch", "First-aid & safety gear", "Binoculars for the group"],
    groupSize: "Up to 10 people",
  },
  {
    id: "e4",
    name: "Pottery Workshop",
    category: "Culture",
    description: "Shape clay on a traditional wheel with a fourth-generation potter in a riverside studio. You'll learn to centre the clay, pull a basic form, and glaze a piece to take home once it's fired — no prior experience necessary, just a willingness to get your hands messy.",
    price: 600,
    duration: "2 hours",
    rating: 4.6,
    reviewCount: 19,
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=800&auto=format&fit=crop",
    location: "Auroville",
    gallery: [
      "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=800&auto=format&fit=crop",
    ],
    video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4",
    host: { name: "Murugan K.", role: "Fourth-generation potter · Auroville studio", avatar: "https://i.pravatar.cc/150?img=53" },
    included: ["Wheel-throwing session", "Clay & glazing materials", "Firing & pickup (7 days)", "Apron provided"],
    groupSize: "Up to 6 people",
  },
  {
    id: "e5",
    name: "Spice Plantation Tour",
    category: "Nature",
    description: "Walk through a working spice plantation learning about pepper, cardamom, and vanilla cultivation. Your guide will show you how each spice grows, let you taste it fresh off the vine, and explain the harvest calendar that's shaped this region's economy for centuries.",
    price: 500,
    duration: "2 hours",
    rating: 4.8,
    reviewCount: 56,
    image: "https://images.unsplash.com/photo-1465101162946-4377e57745c3?q=80&w=800&auto=format&fit=crop",
    location: "Wayanad",
    gallery: [
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop",
    ],
    video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    host: { name: "Beena Thomas", role: "Plantation owner · 3rd generation", avatar: "https://i.pravatar.cc/150?img=49" },
    included: ["Guided plantation walk", "Fresh spice tastings", "Take-home spice sampler", "Filter coffee"],
    groupSize: "Up to 15 people",
  },
  {
    id: "e6",
    name: "Night Photography Safari",
    category: "Photography",
    description: "Capture the Milky Way and nocturnal wildlife with a professional astrophotographer. We head to a dark-sky spot away from any light pollution, set up tripods, and shoot long-exposure star trails while listening for owls and civets in the coffee estate around us.",
    price: 2000,
    duration: "4 hours",
    rating: 4.9,
    reviewCount: 14,
    image: "https://images.unsplash.com/photo-1611095973763-414019e72400?q=80&w=800&auto=format&fit=crop",
    location: "Coorg",
    gallery: [
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=800&auto=format&fit=crop",
    ],
    video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4",
    host: { name: "Arjun Iyer", role: "Astrophotographer & guide", avatar: "https://i.pravatar.cc/150?img=68" },
    included: ["Tripod & camera settings guidance", "Dark-sky location transport", "Hot coffee & snacks", "RAW editing tips"],
    groupSize: "Up to 6 people",
  },
  {
    id: "e7",
    name: "Ayurvedic Massage & Herbal Bath Ritual",
    category: "Wellness",
    description: "A traditional Kerala Ayurvedic therapy session tailored to your dosha, followed by a warm herbal steam bath. The house physician reviews your constitution first, then two therapists work in synchronised strokes with medicated oils pressed from herbs grown on the property.",
    price: 1800,
    duration: "2 hours",
    rating: 4.9,
    reviewCount: 37,
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=800&auto=format&fit=crop",
    location: "Palakkad",
    gallery: [
      "https://images.unsplash.com/photo-1600334129128-685c5582fd35?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?q=80&w=800&auto=format&fit=crop",
    ],
    video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    host: { name: "Dr. Lakshmi Nair", role: "Ayurvedic physician · Nila Wellness", avatar: "https://i.pravatar.cc/150?img=47" },
    included: ["Dosha consultation", "Synchronised Abhyanga massage", "Herbal steam bath", "Post-therapy herbal tea"],
    groupSize: "1 person",
  },
  {
    id: "e8",
    name: "Chettinad Spice Trail & Feast",
    category: "Food",
    description: "Explore a centuries-old spice trading town and cook a fiery Chettinad meal from scratch. You'll visit a family-run spice grinder, learn to roast and blend a Chettinad masala, and finish with a banana-leaf feast shared with the family that hosts you.",
    price: 1400,
    duration: "3.5 hours",
    rating: 4.7,
    reviewCount: 24,
    image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?q=80&w=800&auto=format&fit=crop",
    location: "Pondicherry",
    gallery: [
      "https://images.unsplash.com/photo-1585937421612-70a008356fbe?q=80&w=800&auto=format&fit=crop",
    ],
    video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4",
    host: { name: "Meena Akka", role: "Home cook · Chettinad kitchen, 4th generation", avatar: "https://i.pravatar.cc/150?img=29" },
    included: ["Spice market walk", "Hands-on masala grinding", "Banana-leaf feast", "Recipe booklet"],
    groupSize: "Up to 10 people",
  },
  {
    id: "e9",
    name: "Backwater Kayaking at Dawn",
    category: "Adventure",
    description: "Paddle a two-person kayak through narrow backwater canals as the mist lifts off the water. Your guide threads you past coconut groves, toddy tappers heading out for the morning harvest, and villages that only wake once the sun's fully up.",
    price: 900,
    duration: "2.5 hours",
    rating: 4.8,
    reviewCount: 41,
    image: "https://images.unsplash.com/photo-1593693411515-c20261bcad6e?q=80&w=800&auto=format&fit=crop",
    location: "Alleppey",
    gallery: [
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?q=80&w=800&auto=format&fit=crop",
    ],
    video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    host: { name: "Vinod P.", role: "Backwater kayak guide · 9 years", avatar: "https://i.pravatar.cc/150?img=59" },
    included: ["Two-person kayak & gear", "Life jacket & dry bag", "Guided canal route", "Fresh coconut water stop"],
    groupSize: "Up to 8 people (pairs)",
  },
  {
    id: "e10",
    name: "Bharatanatyam Dance Immersion",
    category: "Culture",
    description: "Learn the foundational adavus of Bharatanatyam from a trained classical dancer, then watch a short recital set to live nagaswaram music. The session closes with a short lesson in the mudras (hand gestures) used to tell stories through the form.",
    price: 750,
    duration: "2 hours",
    rating: 4.6,
    reviewCount: 22,
    image: "https://images.unsplash.com/photo-1688820661462-a44e4b2770e8?q=80&w=800&auto=format&fit=crop",
    location: "Pondicherry",
    gallery: [
      "https://images.unsplash.com/photo-1630663129615-a2331ed88ab6?q=80&w=800&auto=format&fit=crop",
    ],
    video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4",
    host: { name: "Revathi Krishnan", role: "Bharatanatyam dancer & teacher · 15 years", avatar: "https://i.pravatar.cc/150?img=38" },
    included: ["Basic adavu lesson", "Live recital", "Mudra storytelling session", "Traditional refreshments"],
    groupSize: "Up to 12 people",
  },
  {
    id: "e11",
    name: "Birdwatching Trail in the Western Ghats",
    category: "Nature",
    description: "A slow, early-morning walk through shola forest edge and coffee estate with a birder who can call in a Malabar trogon from fifty metres. Bring your own binoculars or borrow ours — expect hornbills, flycatchers, and if you're lucky, a Nilgiri wood-pigeon.",
    price: 700,
    duration: "3 hours",
    rating: 4.8,
    reviewCount: 33,
    image: "https://images.unsplash.com/photo-1444464666168-49d633b86797?q=80&w=800&auto=format&fit=crop",
    location: "Coorg",
    gallery: [
      "https://images.unsplash.com/photo-1660294534711-75a9474fecb0?q=80&w=800&auto=format&fit=crop",
    ],
    video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    host: { name: "Suresh Kumar", role: "Birding guide · Western Ghats specialist", avatar: "https://i.pravatar.cc/150?img=61" },
    included: ["Early-morning guided walk", "Binoculars (if needed)", "Bird checklist for the region", "Filter coffee at the estate"],
    groupSize: "Up to 8 people",
  },
  {
    id: "e12",
    name: "Golden Hour Tea Estate Shoot",
    category: "Photography",
    description: "Photograph rolling tea estates at first light with a local photographer who knows exactly which ridge catches the best mist. We shoot from three vantage points as pickers start their day, then review compositions together over breakfast.",
    price: 1300,
    duration: "3 hours",
    rating: 4.9,
    reviewCount: 18,
    image: "https://images.unsplash.com/photo-1491497895121-1334fc14d8c9?q=80&w=800&auto=format&fit=crop",
    location: "Munnar",
    gallery: [
      "https://images.unsplash.com/photo-1522747776116-64ee03be1dad?q=80&w=800&auto=format&fit=crop",
    ],
    video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4",
    host: { name: "Nikhil Varma", role: "Landscape photographer · Munnar estates", avatar: "https://i.pravatar.cc/150?img=65" },
    included: ["Three-location shoot route", "Composition & light guidance", "Breakfast review session", "Estate access permit"],
    groupSize: "Up to 5 people",
  },
];

// ============================================
// BLOG POSTS
// ============================================

export const blogPosts: BlogPost[] = [
  { id: "b1", title: "Why Tiny Houses Are the Future of Sustainable Travel", excerpt: "Discover how minimalist architecture is revolutionizing the hospitality industry and why travellers are choosing less over more.", category: "Architecture", author: "Dhyana Editorial", date: "2026-06-28", readTime: "6 min", image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop", slug: "tiny-houses-future" },
  { id: "b2", title: "The Art of Farm-to-Table: A Journey Through South Indian Kitchens", excerpt: "From tamarind groves to coconut toddy, explore how India's farm stays are redefining culinary tourism.", category: "Food & Culture", author: "Priya Shankar", date: "2026-06-15", readTime: "8 min", image: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=1200&auto=format&fit=crop", slug: "farm-to-table-south-india" },
  { id: "b3", title: "Designing for Peace: Architecture That Heals", excerpt: "How spatial design, natural materials, and biophilic principles create environments that actively promote wellness.", category: "Wellness", author: "Dr. Lakshmi Nair", date: "2026-05-30", readTime: "7 min", image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1200&auto=format&fit=crop", slug: "architecture-that-heals" },
  { id: "b4", title: "Investing in Curated Stays: A New Asset Class", excerpt: "Why fractional hospitality investment is becoming the smartest alternative investment for millennials.", category: "Investment", author: "Dhyana Investment Team", date: "2026-05-15", readTime: "10 min", image: "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?q=80&w=1200&auto=format&fit=crop", slug: "investing-curated-stays" },
];

// ============================================
// TESTIMONIALS
// ============================================

export const testimonials: Testimonial[] = [
  { id: "t1", name: "Meera Krishnan", avatar: "https://i.pravatar.cc/150?img=35", location: "Mumbai", rating: 5, comment: "Dhyana Stays has completely changed how my family travels. Every property feels handpicked, authentic, and deeply connected to its surroundings. We've booked four stays in the last year.", stayName: "Stone Valley Farm Stay", category: "guest-stays", propertySlug: "stone-valley-farm-stay", helpfulCount: 24 },
  { id: "t2", name: "Aditya Rao", avatar: "https://i.pravatar.cc/150?img=18", location: "Bangalore", rating: 5, comment: "As an architect, I'm extremely particular about design. Dhyana's curated collection genuinely maintains a standard I rarely see on other platforms. The inspection process makes a real difference.", stayName: "The Glass Pavilion", category: "guest-stays", propertySlug: "glass-pavilion", helpfulCount: 19 },
  { id: "t3", name: "Sunita & Raj Malhotra", avatar: "https://i.pravatar.cc/150?img=36", location: "Delhi", rating: 5, comment: "We invested in a Dhyana property through their split investment model. The transparency in reporting and the quality of the operations team gives us complete confidence in our investment.", stayName: "the Split Investment Program", category: "investors", helpfulCount: 15 },
  { id: "t4", name: "Kabir Malhotra", avatar: "https://i.pravatar.cc/150?img=12", location: "Pune", rating: 5, comment: "The sunrise yoga session at Auroville was unlike anything I'd done before — quiet, unhurried, and led by someone who actually knew what she was doing. I've booked two more sessions since.", stayName: "Sunrise Yoga at Auroville", category: "experiences", experienceId: "e1", helpfulCount: 11 },
  { id: "t5", name: "Priya Nair", avatar: "https://i.pravatar.cc/150?img=47", location: "Kochi", rating: 4, comment: "Nila Wellness Retreat was exactly the reset I needed. The staff remembered my name by day two, the food was incredible, and the silence at night was the best part of the whole trip.", stayName: "Nila Wellness Retreat", category: "guest-stays", propertySlug: "nila-wellness-retreat", helpfulCount: 17 },
  { id: "t6", name: "Farhan Sheikh", avatar: "https://i.pravatar.cc/150?img=52", location: "Hyderabad", rating: 5, comment: "Joined the Joint Investment model on a new property last year and the quarterly reports have been detailed and on time, every time. This is the first hospitality investment I've made that felt genuinely transparent.", stayName: "the Joint Investment Program", category: "investors", helpfulCount: 9 },
  { id: "t7", name: "Ananya Iyer", avatar: "https://i.pravatar.cc/150?img=41", location: "Chennai", rating: 5, comment: "The farm-to-table cooking class at Stone Valley is worth booking on its own, even without staying the night. Chef Elena walked us through the kitchen garden before we cooked, so every ingredient had a story.", stayName: "Farm-to-Table Cooking Class", category: "experiences", experienceId: "e2", helpfulCount: 21 },
  { id: "t8", name: "Rohan & Divya Shah", avatar: "https://i.pravatar.cc/150?img=15", location: "Ahmedabad", rating: 5, comment: "Bamboo Nest completely won over our kids — treehouse living, real trails, zero screens. We're already planning our next trip back for the monsoon season.", stayName: "Bamboo Nest Eco Stay", category: "guest-stays", propertySlug: "bamboo-nest-eco-stay", helpfulCount: 13 },
  { id: "t9", name: "Devika Menon", avatar: "https://i.pravatar.cc/150?img=29", location: "Coimbatore", rating: 4, comment: "Heritage Courtyard Villa was full of small, thoughtful touches — handwritten welcome notes, local snacks, a host who actually sat down and told us the property's history over chai.", stayName: "Heritage Courtyard Villa", category: "guest-stays", propertySlug: "heritage-courtyard-villa", helpfulCount: 8 },
];

// Total guest stories/reviews collected across the platform — used by the
// testimonials carousel's trailing "N more guest stories" CTA card.
export const totalGuestStoryCount = 21;

// ============================================
// FAQ
// ============================================

export const faqItems: FAQItem[] = [
  { question: "What makes Dhyana Stays different from other booking platforms?", answer: "Every property on Dhyana Stays is personally inspected and scored across architecture, hospitality, sustainability, safety, and guest experience. We don't list every stay — we curate unforgettable experiences. Each property must pass a comprehensive quality inspection before being published.", category: "General" },
  { question: "How does the curated inspection process work?", answer: "Our expert inspectors evaluate every property across 7 categories: Architecture, Interior Design, Hospitality, Cleanliness, Sustainability, Safety, and Guest Experience. Properties scoring below 70/100 are not approved. Approved stays receive quality badges based on their scores.", category: "General" },
  { question: "What is the cancellation policy?", answer: "Cancellation policies vary by property. Most stays offer free cancellation up to 7-14 days before check-in. Each property's specific policy is clearly displayed on its listing page and during the booking process.", category: "Bookings" },
  { question: "How does the Split Investment model work?", answer: "Each curated hospitality project is divided into investment units. Investors purchase one or more units and receive proportional revenue share from bookings. Dhyana Stays handles all operations including design, construction, marketing, and guest management.", category: "Investment" },
  { question: "Can I list my property on Dhyana Stays?", answer: "Yes! Apply as a host through our platform. You'll need to complete KYC verification, submit property details and photos, and pass our Curated Stay Inspection. Only properties meeting our quality standards are published.", category: "Hosting" },
  { question: "What payment methods are accepted?", answer: "We accept UPI (GPay, PhonePe, Paytm), Credit/Debit Cards (Visa, MasterCard, RuPay), Net Banking, and Wallets. All payments are processed securely through Razorpay.", category: "Payments" },
  { question: "Do you offer experiences beyond accommodation?", answer: "Absolutely! Dhyana Stays offers curated local experiences including yoga sessions, cooking classes, farm tours, adventure activities, cycling tours, and more. You can add these during booking or book separately.", category: "Experiences" },
  { question: "Is there a loyalty program?", answer: "Yes! Our rewards program lets you earn points for bookings, reviews, referrals, and completing your profile. Points can be redeemed for discounts on future bookings. Premium membership offers additional benefits.", category: "Rewards" },
];

// ============================================
// STATS
// ============================================

export const platformStats = {
  totalStays: 312,
  totalGuests: 28400,
  totalDestinations: 45,
  averageRating: 4.82,
  sustainableStays: 187,
  countries: 1,
};

// ============================================
// NAVIGATION
// ============================================

export const navLinks = [
  { label: "Home", href: "/" },
  { label: "Explore Stays", href: "/stays" },
  { label: "Experiences", href: "/experiences" },
  { label: "Business", href: "/business" },
  { label: "About Us", href: "/about" },
];

// ============================================
// HOMEPAGE SERVICES HUB (tabbed section)
// ============================================

export interface FoodItem {
  id: string;
  name: string;
  image: string;
  cuisine: string;
  veg: boolean;
  pricePerPlate: number;
  serves: string;
  cooks: { name: string; avatar: string; specialty: string }[];
  story?: string;
}

export const foodMenu: FoodItem[] = [
  {
    id: "f1",
    name: "Chettinad Home Thali",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80",
    cuisine: "South Indian",
    veg: true,
    pricePerPlate: 350,
    serves: "1 person",
    cooks: [
      { name: "Meena Akka", avatar: "https://i.pravatar.cc/150?img=47", specialty: "Chettinad" },
      { name: "Raju Anna", avatar: "https://i.pravatar.cc/150?img=59", specialty: "Village style" },
    ],
    story: "A recipe passed down four generations in Meena Akka's family — the same stone-ground spice mix her grandmother used in a Karaikudi kitchen.",
  },
  {
    id: "f2",
    name: "Farm Harvest Bowl",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
    cuisine: "Organic · Farm to Table",
    veg: true,
    pricePerPlate: 420,
    serves: "1 person",
    cooks: [
      { name: "Chef Elena", avatar: "https://i.pravatar.cc/150?img=44", specialty: "Continental" },
      { name: "Priya Shankar", avatar: "https://i.pravatar.cc/150?img=25", specialty: "Farm cuisine" },
    ],
    story: "Whatever's ready in the Stone Valley kitchen garden that morning goes in the bowl — the menu genuinely changes with the harvest.",
  },
  {
    id: "f3",
    name: "Auroville Breakfast Basket",
    image: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80",
    cuisine: "Continental · Bakes",
    veg: true,
    pricePerPlate: 280,
    serves: "1 person",
    cooks: [
      { name: "Marc D", avatar: "https://i.pravatar.cc/150?img=13", specialty: "Sourdough & bakes" },
      { name: "Meena Akka", avatar: "https://i.pravatar.cc/150?img=47", specialty: "Filter coffee" },
    ],
    story: "Marc's sourdough starter has been alive since 2019 — baked fresh every morning in a wood-fired oven he built himself.",
  },
  {
    id: "f4",
    name: "Dum Biryani Pot (Family)",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80",
    cuisine: "Hyderabadi",
    veg: false,
    pricePerPlate: 950,
    serves: "3–4 persons",
    cooks: [
      { name: "Raju Anna", avatar: "https://i.pravatar.cc/150?img=59", specialty: "Dum biryani" },
      { name: "Chef Imran", avatar: "https://i.pravatar.cc/150?img=68", specialty: "Nizami dishes" },
    ],
    story: "Sealed with dough and slow-cooked over embers for 40 minutes — Chef Imran trained under a Nizami kitchen in old Hyderabad.",
  },
  {
    id: "f5",
    name: "Kerala Sadya (Banana Leaf)",
    image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&q=80",
    cuisine: "Kerala · Traditional",
    veg: true,
    pricePerPlate: 380,
    serves: "1 person",
    cooks: [
      { name: "Lakshmi Warrier", avatar: "https://i.pravatar.cc/150?img=32", specialty: "Kerala sadya" },
      { name: "Chef Sudhakaran", avatar: "https://i.pravatar.cc/150?img=51", specialty: "Onam specials" },
    ],
    story: "A 12-dish feast served on a fresh banana leaf, the way Lakshmi's mother made it for every Onam back home in Palakkad.",
  },
  {
    id: "f6",
    name: "Goan Fish Curry & Rice",
    image: "https://images.unsplash.com/photo-1600335895229-6e75511892c8?w=800&q=80",
    cuisine: "Goan · Coastal",
    veg: false,
    pricePerPlate: 480,
    serves: "1 person",
    cooks: [
      { name: "Fernando D'Souza", avatar: "https://i.pravatar.cc/150?img=15", specialty: "Goan seafood" },
    ],
    story: "Fernando buys the catch himself at the Malim jetty before sunrise — the curry never sees a freezer.",
  },
  {
    id: "f7",
    name: "Coorg Pandi Curry",
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&q=80",
    cuisine: "Coorg · Kodava",
    veg: false,
    pricePerPlate: 520,
    serves: "1 person",
    cooks: [
      { name: "Appachu Kalappa", avatar: "https://i.pravatar.cc/150?img=53", specialty: "Kodava cuisine" },
    ],
    story: "Made with kachampuli, the sour-smoked vinegar unique to Coorg — a Kodava wedding-feast recipe from Appachu's family.",
  },
  {
    id: "f8",
    name: "Ayurvedic Wellness Thali",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80",
    cuisine: "Sattvic · Ayurvedic",
    veg: true,
    pricePerPlate: 340,
    serves: "1 person",
    cooks: [
      { name: "Dr. Anjali Menon", avatar: "https://i.pravatar.cc/150?img=48", specialty: "Ayurvedic diet planning" },
    ],
    story: "Balanced by an Ayurvedic doctor for your dosha, not just your taste buds — no onion, no garlic, cooked in cold-pressed coconut oil.",
  },
];

export interface EventPlanner {
  id: string;
  name: string;
  type: string;
  image: string;
  rating: number;
  eventsDone: number;
  startingPrice: number;
  tags: string[];
  description?: string;
  gallery?: string[];
  packages?: { name: string; price: number; guests: string; includes: string[] }[];
  brochures?: { title: string; note: string }[];
  testimonials?: { name: string; location: string; avatar: string; comment: string; eventType: string }[];
}

export const eventPlanners: EventPlanner[] = [
  {
    id: "ep1",
    name: "Saffron Knots",
    type: "Wedding Planners",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
    rating: 4.9,
    eventsDone: 140,
    startingPrice: 150000,
    tags: ["Destination weddings", "Farm venues", "Decor & rituals"],
    description: "Saffron Knots has planned 140+ weddings across Dhyana's curated farm stays and heritage properties — from intimate courtyard ceremonies to four-day destination celebrations. Every plan covers venue styling, vendor coordination, and rituals, handled by a team that lives on-site through the whole event.",
    gallery: [
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80",
      "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80",
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80",
    ],
    packages: [
      { name: "Intimate Ceremony", price: 150000, guests: "Up to 50 guests", includes: ["Venue styling & decor", "Day-of coordination", "Rituals setup"] },
      { name: "Classic Wedding", price: 350000, guests: "Up to 200 guests", includes: ["Full planning & vendor management", "Catering coordination", "Photography tie-up", "3-day decor build"] },
      { name: "Grand Destination", price: 750000, guests: "Up to 400 guests", includes: ["Multi-day itinerary", "Venue sourcing across regions", "Full vendor & guest logistics", "Dedicated on-site team"] },
    ],
    brochures: [
      { title: "Saffron Knots — Wedding Packages 2026", note: "Pricing, inclusions & timelines" },
      { title: "Saffron Knots — Portfolio Lookbook", note: "40 past weddings, styled by season" },
    ],
    testimonials: [
      { name: "Ritu & Karthik", location: "Chennai", avatar: "https://i.pravatar.cc/150?img=20", comment: "They handled everything — we just showed up. The farm venue styling looked exactly like the moodboard we'd sent, down to the flowers.", eventType: "Classic Wedding" },
      { name: "Meera Iyer", location: "Bangalore", avatar: "https://i.pravatar.cc/150?img=23", comment: "Our families are spread across three cities and Saffron Knots coordinated all the travel and stays too, not just the wedding day.", eventType: "Grand Destination" },
    ],
  },
  {
    id: "ep2",
    name: "Hushh Surprises",
    type: "Surprise Events",
    image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80",
    rating: 4.8,
    eventsDone: 320,
    startingPrice: 4500,
    tags: ["Proposals", "Birthdays", "Candlelight setups"],
    description: "320+ surprises pulled off without a single leak. Hushh Surprises specialises in proposal setups, surprise birthdays and candlelight dinners at Dhyana properties — booked secretly, built while you're both at dinner, ready by the time you walk back to the room.",
    gallery: [
      "https://images.unsplash.com/photo-1530023367847-a683933f4172?w=800&q=80",
      "https://images.unsplash.com/photo-1478146059778-26028b07395a?w=800&q=80",
      "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&q=80",
    ],
    packages: [
      { name: "Candlelight Proposal", price: 4500, guests: "For 2", includes: ["Private candlelight setup", "Photo of the moment", "1-hour hold on the space"] },
      { name: "Surprise Birthday", price: 12000, guests: "Up to 20 guests", includes: ["Decor & balloon styling", "Cake coordination", "Music & lighting"] },
      { name: "Full Celebration Takeover", price: 28000, guests: "Up to 50 guests", includes: ["Venue booking within the property", "Decor, catering & entertainment", "Dedicated event runner on the day"] },
    ],
    brochures: [
      { title: "Hushh Surprises — Setup Styles Guide", note: "12 themes, pricing per guest count" },
    ],
    testimonials: [
      { name: "Arjun Nair", location: "Kochi", avatar: "https://i.pravatar.cc/150?img=15", comment: "I was terrified she'd figure it out but the team snuck the whole setup in during our sunset walk. Perfect timing, zero stress.", eventType: "Candlelight Proposal" },
      { name: "Divya Sharma", location: "Pune", avatar: "https://i.pravatar.cc/150?img=29", comment: "Booked a surprise birthday for my dad's 60th — they matched the decor to his favourite football club colours without me even asking twice.", eventType: "Surprise Birthday" },
    ],
  },
  {
    id: "ep3",
    name: "Gather & Grow",
    type: "Retreat & Corporate",
    image: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80",
    rating: 4.7,
    eventsDone: 95,
    startingPrice: 35000,
    tags: ["Team offsites", "Wellness retreats", "Workshops"],
    description: "Gather & Grow runs team offsites and wellness retreats at farm and heritage properties — half-day workshops to multi-day corporate retreats, with facilitation, catering and logistics handled end to end so HR teams don't have to chase five vendors.",
    gallery: [
      "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&q=80",
      "https://images.unsplash.com/photo-1556125574-d7f27ec36a06?w=800&q=80",
      "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&q=80",
    ],
    packages: [
      { name: "Half-Day Offsite", price: 35000, guests: "Up to 20 people", includes: ["Workshop facilitation", "Meeting space setup", "Working lunch"] },
      { name: "Full Wellness Retreat", price: 85000, guests: "Up to 30 people", includes: ["2-day itinerary", "Yoga & mindfulness sessions", "All meals included", "Evening activities"] },
      { name: "Multi-Day Corporate Retreat", price: 180000, guests: "Up to 60 people", includes: ["3-day full logistics", "Facilitation & team activities", "Accommodation coordination", "Dedicated retreat manager"] },
    ],
    brochures: [
      { title: "Gather & Grow — Corporate Retreat Guide", note: "Formats, pricing & sample agendas" },
    ],
    testimonials: [
      { name: "Sandeep Rao", location: "HR Lead, Chennai", avatar: "https://i.pravatar.cc/150?img=33", comment: "First offsite where I didn't have to manage five different vendors myself. Gather & Grow ran the whole two days and the team feedback was the best we've had.", eventType: "Full Wellness Retreat" },
    ],
  },
];

export interface LocalEvent {
  id: string;
  title: string;
  image: string;
  date: string;
  venue: string;
  price: number;
  spotsLeft: number;
  kind: string;
}

export const localEvents: LocalEvent[] = [
  {
    id: "le1",
    title: "Terracotta Pottery Workshop",
    image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80",
    date: "Sat, Jul 25",
    venue: "Auroville · 2.1 km",
    price: 850,
    spotsLeft: 6,
    kind: "Workshop",
  },
  {
    id: "le2",
    title: "Sunrise Beach Yoga Circle",
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80",
    date: "Sun, Jul 26",
    venue: "Serenity Beach · 4 km",
    price: 300,
    spotsLeft: 12,
    kind: "Wellness",
  },
  {
    id: "le3",
    title: "Full Moon Folk Concert",
    image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80",
    date: "Fri, Jul 31",
    venue: "Adishakti Theatre · 3.5 km",
    price: 600,
    spotsLeft: 30,
    kind: "Music",
  },
  {
    id: "le4",
    title: "Chettinad Cooking Class",
    image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80",
    date: "Wed, Jul 29",
    venue: "Stone Valley Farm · 1 km",
    price: 1200,
    spotsLeft: 4,
    kind: "Workshop",
  },
];

export interface RentalVehicle {
  id: string;
  name: string;
  type: string;
  image: string;
  pricePerDay: number;
  features: string[];
}

export const rentalVehicles: RentalVehicle[] = [
  {
    id: "rv1",
    name: "Vespa ZX 125",
    type: "Scooter",
    image: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&q=80",
    pricePerDay: 450,
    features: ["2 helmets", "Unlimited km", "Doorstep delivery"],
  },
  {
    id: "rv2",
    name: "Royal Enfield Classic 350",
    type: "Motorcycle",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    pricePerDay: 900,
    features: ["Touring ready", "Full tank", "24×7 assist"],
  },
  {
    id: "rv3",
    name: "Mahindra Thar 4×4",
    type: "SUV",
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80",
    pricePerDay: 3200,
    features: ["Self-drive", "Insurance incl.", "Hill ready"],
  },
  {
    id: "rv4",
    name: "City Trail Bicycle",
    type: "Bicycle",
    image: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80",
    pricePerDay: 150,
    features: ["Helmet", "Lock & lights", "Free map"],
  },
];

export interface Hostel {
  id: string;
  name: string;
  location: string;
  image: string;
  bedPrice: number;
  rating: number;
  perks: string[];
}

export const hostels: Hostel[] = [
  {
    id: "h1",
    name: "Wander Nest Auroville",
    location: "Auroville, Tamil Nadu",
    image: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80",
    bedPrice: 499,
    rating: 4.6,
    perks: ["Female dorm", "Lockers", "Free Wi-Fi"],
  },
  {
    id: "h2",
    name: "Backpacker's Barn",
    location: "Kodaikanal, Tamil Nadu",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
    bedPrice: 449,
    rating: 4.5,
    perks: ["Bonfire nights", "Café", "Trek desk"],
  },
  {
    id: "h3",
    name: "The Common Room",
    location: "Pondicherry",
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80",
    bedPrice: 599,
    rating: 4.7,
    perks: ["Co-work space", "AC dorms", "Breakfast"],
  },
];
