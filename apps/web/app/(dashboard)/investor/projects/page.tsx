"use client";

import Link from "next/link";
import { MapPin, TrendingUp, Users, Info, Building, ArrowRight, ShieldCheck } from "lucide-react";

export default function SplitInvestmentProjectsPage() {
  const projects = [
    {
      id: "PRJ-01",
      name: "The Malabar Eco Retreat",
      location: "Wayanad, Kerala",
      stage: "Pre-Launch",
      fundTarget: 50000000,
      fundRaised: 32000000,
      minInvestment: 500000,
      projYield: "14.5%",
      completion: "Q4 2027",
      investors: 42,
      image: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?q=80&w=800&auto=format&fit=crop"
    },
    {
      id: "PRJ-02",
      name: "Himalayan Glass Cabins",
      location: "Manali, Himachal",
      stage: "Active Funding",
      fundTarget: 30000000,
      fundRaised: 8000000,
      minInvestment: 250000,
      projYield: "12.8%",
      completion: "Q2 2027",
      investors: 18,
      image: "https://images.unsplash.com/photo-1542718610-a1d656d1884c?q=80&w=800&auto=format&fit=crop"
    }
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="heading-display text-3xl text-foreground mb-2">
            Split Investment Opportunities
          </h1>
          <p className="text-sm text-muted">
            Co-own premium hospitality assets. Earn monthly rental yields and long-term capital appreciation.
          </p>
        </div>
      </div>

      {/* Trust Banner */}
      <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
          <ShieldCheck size={32} className="text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1">Dhyana Assured Assets</h3>
          <p className="text-sm text-muted">
            Every project listed here is fully vetted, architecturally designed, and managed entirely by Dhyana Stays. You receive passive income without operational headaches.
          </p>
        </div>
        <button className="px-6 py-2.5 bg-surface-hover border border-border rounded-xl text-sm font-medium text-foreground hover:bg-surface-hover transition-colors whitespace-nowrap">
          Read the Thesis
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {projects.map((proj) => {
          const progressPercentage = (proj.fundRaised / proj.fundTarget) * 100;

          return (
            <div key={proj.id} className="bg-surface border border-border rounded-2xl overflow-hidden hover:border-primary/50 transition-colors group flex flex-col">
              <div className="h-64 bg-surface-hover relative overflow-hidden">
                {/* Due to next/image issues with external URLs sometimes in mock environments, using standard img tag for mock */}
                <img src={proj.image} alt={proj.name} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-3 py-1 bg-background/80 backdrop-blur-md text-primary text-[10px] uppercase tracking-wider rounded-full border border-primary/30 font-semibold">
                    {proj.stage}
                  </span>
                </div>
              </div>

              <div className="p-6 md:p-8 flex-1 flex flex-col">
                <h2 className="text-2xl font-semibold text-foreground mb-2">{proj.name}</h2>
                <div className="flex items-center gap-1 text-sm text-muted mb-6">
                  <MapPin size={14} className="text-primary" /> {proj.location}
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-subtle mb-1 flex items-center gap-1">
                      Projected Yield <Info size={10} />
                    </div>
                    <div className="text-xl font-bold text-sage flex items-center gap-1">
                      <TrendingUp size={16} /> {proj.projYield} <span className="text-xs font-normal text-muted">p.a.</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-subtle mb-1">Min. Investment</div>
                    <div className="text-xl font-bold text-foreground">
                      ₹{(proj.minInvestment / 100000).toFixed(1)}L
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between text-xs text-muted mb-2">
                    <span>Funding Progress</span>
                    <span className="font-medium text-foreground">{progressPercentage.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary-hover rounded-full"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-subtle mt-2">
                    <span>₹{(proj.fundRaised / 10000000).toFixed(1)}Cr raised</span>
                    <span>Target: ₹{(proj.fundTarget / 10000000).toFixed(1)}Cr</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-surface-hover mt-auto">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Users size={14} /> {proj.investors} Co-owners
                  </div>
                  <Link href={`/investor/projects/${proj.id}`} className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                    View Details & Calculator <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
