"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building, Info, IndianRupee, PieChart, ShieldCheck, Download, Calculator, MapPin, FileText } from "lucide-react";
import { properties } from "@/lib/mock-data";

export default function InvestmentCalculatorPage({ params }: { params: { id: string } }) {
  const [investmentAmount, setInvestmentAmount] = useState(500000);

  // Mock calculations
  const expectedYieldPa = 14.5;
  const projectedAppreciation = 8.0;

  const yearlyYield = (investmentAmount * expectedYieldPa) / 100;
  const monthlyYield = yearlyYield / 12;
  const fiveYearValue = investmentAmount * Math.pow(1 + (projectedAppreciation/100), 5);

  return (
    <div className="space-y-8 pb-12 max-w-[1000px] mx-auto">
      <Link href="/investor/projects" className="inline-flex items-center gap-2 text-xs text-muted hover:text-foreground transition-colors">
        <ArrowLeft size={14} /> Back to Projects
      </Link>

      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="h-64 md:h-80 relative">
          <img src="https://images.unsplash.com/photo-1510798831971-661eb04b3739?q=80&w=1200&auto=format&fit=crop" alt="" className="w-full h-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent"></div>
          <div className="absolute bottom-6 left-6 right-6">
            <span className="px-3 py-1 bg-background/80 backdrop-blur-md text-primary text-[10px] uppercase tracking-wider rounded-full border border-primary/30 font-semibold mb-3 inline-block">
              Pre-Launch
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">The Malabar Eco Retreat</h1>
            <p className="text-muted flex items-center gap-2">
              <MapPin size={16} /> Wayanad, Kerala
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left Column - Investment Calculator */}
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <Calculator size={20} className="text-primary" /> Investment Calculator
            </h2>

            <div className="space-y-8">
              <div>
                <div className="flex justify-between mb-4">
                  <label className="text-sm font-medium text-muted">Your Investment</label>
                  <span className="text-lg font-bold text-foreground">₹{(investmentAmount / 100000).toFixed(1)}L</span>
                </div>
                <input
                  type="range"
                  min="500000"
                  max="10000000"
                  step="100000"
                  value={investmentAmount}
                  onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                  className="w-full accent-primary h-2 bg-surface-hover rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-subtle mt-2">
                  <span>Min: ₹5L</span>
                  <span>Max: ₹1Cr</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
                <div className="bg-surface-hover p-4 rounded-xl border border-border">
                  <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Monthly Yield</div>
                  <div className="text-xl font-bold text-sage">₹{monthlyYield.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                </div>
                <div className="bg-surface-hover p-4 rounded-xl border border-border">
                  <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Annual Yield</div>
                  <div className="text-xl font-bold text-sage">₹{yearlyYield.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                </div>
                <div className="col-span-2 bg-gradient-to-r from-surface-hover to-surface p-4 rounded-xl border border-primary/30">
                  <div className="text-[10px] uppercase tracking-wider text-primary mb-1 font-semibold">Value after 5 Years (Projected)</div>
                  <div className="text-2xl font-bold text-foreground">₹{fiveYearValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                  <div className="text-xs text-muted mt-1 flex items-center gap-1">
                    <Info size={12} /> Assumes {projectedAppreciation}% annual capital appreciation
                  </div>
                </div>
              </div>

              <button className="w-full py-4 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-semibold text-sm rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all">
                Invest Now
              </button>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Investment Documents</h3>
            <div className="space-y-3">
              {['Project Brochure', 'Financial Projections (Detailed)', 'Term Sheet'].map((doc, i) => (
                <div key={i} className="flex justify-between items-center p-3 border border-border rounded-xl hover:bg-surface-hover transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-border rounded text-muted"><FileText size={16} /></div>
                    <span className="text-sm text-foreground">{doc}</span>
                  </div>
                  <Download size={16} className="text-primary" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Project Details */}
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-6 md:p-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Project Overview</h3>
            <p className="text-sm text-muted leading-relaxed mb-6">
              The Malabar Eco Retreat is a 12-key luxury eco-resort nestled in the hills of Wayanad. Designed by award-winning sustainable architects, the property features zero-carbon footprint villas, a farm-to-table restaurant, and an ayurvedic spa.
            </p>

            <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Financial Highlights</h3>
            <div className="space-y-3 text-sm border-b border-border pb-6 mb-6">
              <div className="flex justify-between">
                <span className="text-subtle">Total Project Cost</span>
                <span className="font-medium text-foreground">₹5.0 Cr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-subtle">Targeted IRR</span>
                <span className="font-medium text-sage">18.5%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-subtle">Holding Period</span>
                <span className="font-medium text-foreground">5 Years</span>
              </div>
              <div className="flex justify-between">
                <span className="text-subtle">Revenue Share</span>
                <span className="font-medium text-foreground">80% to Investors</span>
              </div>
            </div>

            <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Ownership Structure</h3>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full border-8 border-surface-hover relative flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-8 border-primary" style={{ clipPath: 'polygon(50% 50%, 100% 0, 100% 100%, 0 100%, 0 0, 50% 0)' }}></div>
                <div className="absolute inset-0 rounded-full border-8 border-border" style={{ clipPath: 'polygon(50% 50%, 50% 0, 100% 0)' }}></div>
                <PieChart className="text-subtle" size={24} />
              </div>
              <div className="flex-1 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-primary"></div>
                  <span className="text-muted">80% Investors</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-border"></div>
                  <span className="text-muted">20% Dhyana Stays</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
