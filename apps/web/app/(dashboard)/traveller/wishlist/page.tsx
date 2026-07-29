import { Heart, MapPin, Sparkles, Plane } from "lucide-react";
import { PageHeader, SectionCard } from "@/app/components/DashboardUI";
import PropertyCard from "@/app/components/PropertyCard";
import { properties } from "@/lib/mock-data";

const bucketList = [
  { place: "Spiti Valley", note: "Cold desert homestay, next summer", img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=70" },
  { place: "Majuli Island", note: "River island monastery stay", img: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=400&q=70" },
  { place: "Gokarna", note: "Beach cottage, long weekend", img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=70" },
];

const dreams = [
  "Sleep in a treehouse",
  "Vipassana retreat",
  "Harvest my own dinner",
  "Himalayan workation month",
  "Houseboat new year",
];

export default function TravellerWishlistPage() {
  const saved = properties.slice(0, 3);

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Wishlist & Bucket List"
        subtitle="Stays you've saved, places you dream about, and plans for the future."
      />

      {/* Saved stays */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Heart size={15} className="text-terracotta" /> Favourite Properties
            <span className="text-xs text-subtle font-normal">({saved.length})</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          {saved.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Bucket List Destinations" icon={MapPin} action={{ label: "Add place", href: "/stays" }}>
          <ul className="divide-y divide-surface-hover">
            {bucketList.map((b) => (
              <li key={b.place} className="flex items-center gap-4 px-5 py-3.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.img} alt={b.place} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{b.place}</p>
                  <p className="text-xs text-muted truncate">{b.note}</p>
                </div>
                <Plane size={15} className="text-subtle shrink-0" />
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Dream Experiences" icon={Sparkles} action={{ label: "Explore", href: "/experiences" }}>
          <div className="px-5 py-5 flex flex-wrap gap-2">
            {dreams.map((d) => (
              <span
                key={d}
                className="text-sm px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20"
              >
                {d}
              </span>
            ))}
          </div>
          <p className="px-5 pb-5 text-[11px] text-subtle">
            The AI Trip Planner uses these to surface matching stays and local events.
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
