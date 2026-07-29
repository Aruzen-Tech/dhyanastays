"use client";

import Link from "next/link";
import { ArrowRight, Calendar, MapPin, Sparkles, Star, TrendingUp } from "lucide-react";
import { properties } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";

export default function TravellerDashboardOverview() {
  const { user } = useAuth();
  const firstName = user?.fullName.split(/\s+/)[0] || "Traveller";

  const upcomingTrip = properties[0];
  const wishlistItems = properties.slice(1, 3);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="heading-display text-3xl text-foreground mb-2">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-muted">
          Manage your bookings, explore curated recommendations, and plan your next escape.
        </p>
      </div>

      {/* AI Trip Planner Prompt */}
      <div className="bg-gradient-to-r from-surface to-surface-hover border border-border rounded-2xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Sparkles size={120} className="text-primary" />
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 text-primary mb-4">
            <Sparkles size={18} />
            <span className="text-xs font-semibold uppercase tracking-wider">AI Trip Planner</span>
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Where do you want to escape?
          </h2>
          <p className="text-muted mb-6 text-sm leading-relaxed">
            Describe your ideal trip — e.g., "A quiet mountain retreat for two with fast wifi and vegan food options." Our AI will curate the perfect itinerary from our exclusive portfolio.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Tell us what you're looking for..."
              className="flex-1 px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary"
            />
            <Link
              href="/traveller/ai-planner"
              className="px-6 py-3 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-semibold text-sm rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center whitespace-nowrap"
            >
              Generate Trip
            </Link>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Upcoming Trip */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-end">
            <h2 className="text-xl font-semibold text-foreground">Upcoming Trip</h2>
            <Link href="/traveller/bookings" className="text-sm text-primary hover:underline">
              View all bookings
            </Link>
          </div>

          <div className="bg-surface border border-border rounded-2xl overflow-hidden flex flex-col md:flex-row">
            <div className="md:w-2/5 h-48 md:h-auto bg-surface-hover relative">
              <img src={upcomingTrip.images[0]} alt="" className="w-full h-full object-cover opacity-80" />
            </div>
            <div className="p-6 md:p-8 md:w-3/5 flex flex-col justify-center">
              <div className="flex justify-between items-start mb-2">
                <span className="px-3 py-1 text-[10px] uppercase tracking-wider bg-primary/10 text-primary rounded-full border border-primary/20 font-semibold">
                  Confirmed
                </span>
                <span className="text-xs text-subtle">ID: DHY-847291</span>
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">
                {upcomingTrip.name}
              </h3>
              <p className="text-sm text-muted flex items-center gap-1 mb-6">
                <MapPin size={14} /> {upcomingTrip.location.city}, {upcomingTrip.location.state}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6 pt-6 border-t border-surface-hover">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-subtle mb-1">Check-in</div>
                  <div className="text-sm font-medium text-foreground">Oct 15, 2026</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-subtle mb-1">Check-out</div>
                  <div className="text-sm font-medium text-foreground">Oct 18, 2026</div>
                </div>
              </div>

              <div className="flex gap-3 mt-auto">
                <button className="flex-1 py-2.5 bg-surface-hover border border-border text-foreground text-sm font-medium rounded-xl hover:bg-surface-hover transition-colors">
                  Contact Host
                </button>
                <button className="flex-1 py-2.5 border border-primary text-primary text-sm font-medium rounded-xl hover:bg-primary/10 transition-colors">
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Wishlist */}
        <div className="space-y-6">
          <div className="flex justify-between items-end">
            <h2 className="text-xl font-semibold text-foreground">Wishlist</h2>
            <Link href="/traveller/wishlist" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-4">
            {wishlistItems.map((item) => (
              <Link key={item.id} href={`/stays/${item.slug}`} className="group flex gap-4 p-3 bg-surface border border-border rounded-2xl hover:border-primary/50 transition-colors">
                <div className="w-24 h-24 rounded-xl bg-surface-hover overflow-hidden shrink-0">
                  <img src={item.images[0]} alt="" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                    {item.name}
                  </h3>
                  <div className="text-xs text-muted flex items-center gap-1 mb-2">
                    <Star size={10} className="text-primary fill-primary" /> {item.rating}
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    ₹{item.price.toLocaleString()} <span className="text-[10px] font-normal text-subtle">/night</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="bg-surface border border-border rounded-2xl p-6 mt-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Travel Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted">Past Stays</span>
                <span className="text-sm font-medium text-foreground">4</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted">Reviews Written</span>
                <span className="text-sm font-medium text-foreground">3</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted">Rewards Points</span>
                <span className="text-sm font-medium text-primary">1,250</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
