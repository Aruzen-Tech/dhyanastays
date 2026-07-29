"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, MapPin, Download, Filter } from "lucide-react";
import { properties } from "@/lib/mock-data";

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState("upcoming");

  return (
    <div className="pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="heading-display text-3xl text-foreground mb-2">My Bookings</h1>
          <p className="text-sm text-muted">Manage your upcoming stays and review past trips.</p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="text"
              placeholder="Search bookings..."
              className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <button className="p-2 bg-surface border border-border rounded-xl text-muted hover:text-foreground transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="flex gap-6 border-b border-border mb-8">
        {["upcoming", "past", "cancelled"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium capitalize transition-colors relative ${
              activeTab === tab ? "text-foreground" : "text-subtle hover:text-muted"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === "upcoming" && (
          <div className="bg-surface border border-primary/30 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-[0_0_30px_rgba(16,185,129,0.05)]">
            <div className="md:w-64 h-48 md:h-auto bg-surface-hover relative">
              <img src={properties[0].images[0]} alt="" className="w-full h-full object-cover opacity-90" />
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <span className="px-3 py-1 text-[10px] uppercase tracking-wider bg-primary/10 text-primary rounded-full border border-primary/20 font-semibold">
                  Confirmed
                </span>
                <span className="text-xs text-subtle">ID: DHY-847291</span>
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-2">{properties[0].name}</h3>
              <p className="text-sm text-muted flex items-center gap-1 mb-6">
                <MapPin size={14} /> {properties[0].location.city}, {properties[0].location.state}
              </p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-subtle mb-1">Check-in</div>
                  <div className="text-sm font-medium text-foreground">Oct 15, 2026</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-subtle mb-1">Check-out</div>
                  <div className="text-sm font-medium text-foreground">Oct 18, 2026</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-subtle mb-1">Guests</div>
                  <div className="text-sm font-medium text-foreground">2 Adults</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-auto">
                <button className="px-5 py-2 bg-surface-hover border border-border text-foreground text-sm font-medium rounded-xl hover:bg-surface-hover transition-colors">
                  Contact Host
                </button>
                <button className="px-5 py-2 border border-primary text-primary text-sm font-medium rounded-xl hover:bg-primary/10 transition-colors">
                  Manage Booking
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "past" && (
          <div className="bg-surface border border-border rounded-2xl overflow-hidden flex flex-col md:flex-row opacity-80 hover:opacity-100 transition-opacity">
            <div className="md:w-64 h-48 md:h-auto bg-surface-hover relative">
              <img src={properties[1].images[0]} alt="" className="w-full h-full object-cover opacity-60 grayscale hover:grayscale-0 transition-all duration-500" />
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <span className="px-3 py-1 text-[10px] uppercase tracking-wider bg-border text-muted rounded-full font-semibold">
                  Completed
                </span>
                <span className="text-xs text-subtle">ID: DHY-102938</span>
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-2">{properties[1].name}</h3>
              <p className="text-sm text-muted flex items-center gap-1 mb-6">
                <MapPin size={14} /> {properties[1].location.city}, {properties[1].location.state}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-subtle mb-1">Dates</div>
                  <div className="text-sm font-medium text-foreground">May 10 - May 14, 2026</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-auto">
                <Link href={`/stays/${properties[1].slug}`} className="px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors">
                  Book Again
                </Link>
                <button className="px-5 py-2 flex items-center gap-2 bg-surface-hover border border-border text-foreground text-sm font-medium rounded-xl hover:bg-surface-hover transition-colors">
                  <Download size={14} /> Invoice
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "cancelled" && (
          <div className="text-center py-12 border border-border border-dashed rounded-2xl">
            <p className="text-muted">You have no cancelled bookings.</p>
          </div>
        )}
      </div>
    </div>
  );
}
