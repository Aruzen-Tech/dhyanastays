import Link from "next/link";
import { Star, TrendingUp, MapPin, Heart } from "lucide-react";
import type { Property } from "@/lib/types";

export default function PropertyCard({ property }: { property: Property }) {
  return (
    <Link
      href={`/stays/${property.slug}`}
      className="group rounded-2xl sm:rounded-[28px] overflow-hidden bg-surface card-hover"
    >
      {/* Image */}
      <div className="relative h-40 sm:h-64 overflow-hidden bg-surface-hover">
        <img loading="lazy"
          src={property.images[0]}
          alt={property.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Scrim for legible overlay text on any photo */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/10" />

        {/* Category overlay */}
        <div className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 flex gap-1.5 sm:gap-2">
          <span className="px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-medium uppercase tracking-wider bg-white/85 backdrop-blur-sm text-sage rounded-full">
            {property.category}
          </span>
          {property.isTrending && (
            <span className="px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-medium uppercase tracking-wider bg-primary/20 backdrop-blur-sm text-primary rounded-full flex items-center gap-1">
              <TrendingUp size={10} /> Trending
            </span>
          )}
        </div>

        {/* Rating pill + Wishlist */}
        <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 flex items-center gap-1.5 sm:gap-2">
          <span className="flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-background/70 backdrop-blur-sm text-[10px] sm:text-xs font-medium text-white">
            <Star size={11} className="text-primary fill-primary" />
            {property.rating}
          </span>
          <button className="p-1.5 sm:p-2 rounded-full bg-background/50 backdrop-blur-sm text-white/80 hover:text-red-400 transition-colors">
            <Heart size={16} />
          </button>
        </div>

        {/* Price overlay */}
        <div className="absolute bottom-2.5 right-2.5 sm:bottom-4 sm:right-4 text-right">
          <div className="text-sm sm:text-lg font-bold text-white">
            ₹{property.price.toLocaleString()}
            <span className="text-[10px] sm:text-xs font-normal text-white/70"> /night</span>
          </div>
          {property.originalPrice && (
            <div className="text-[10px] sm:text-xs text-white/60 line-through">
              ₹{property.originalPrice.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-5">
        <div className="flex items-start justify-between gap-2 mb-1 sm:mb-2">
          <h3 className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {property.name}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <Star size={13} className="text-primary fill-primary" />
            <span className="text-sm font-medium text-foreground">
              {property.rating}
            </span>
            <span className="text-xs text-subtle">
              ({property.reviewCount})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted mb-1.5 sm:mb-3">
          <MapPin size={12} />
          <span>
            {property.location.city}, {property.location.state}
          </span>
        </div>

        <p className="text-xs text-subtle line-clamp-2 mb-2 sm:mb-4">
          {property.tagline}
        </p>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {property.badges.slice(0, 3).map((badge) => (
            <span
              key={badge}
              className="px-2 py-0.5 text-[10px] font-medium text-sage bg-sage/10 rounded-full border border-sage/20"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
