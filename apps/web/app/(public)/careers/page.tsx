import Link from "next/link";
import { ArrowRight, MapPin, Users, Zap, Compass } from "lucide-react";

export default function CareersPage() {
  const jobs = [
    { title: "Senior Architect (Hospitality)", dept: "Design", location: "Bangalore", type: "Full-time" },
    { title: "Quality Assurance Inspector", dept: "Operations", location: "Remote / Travel", type: "Full-time" },
    { title: "Host Success Manager", dept: "Community", location: "Mumbai", type: "Full-time" },
    { title: "Product Designer (UI/UX)", dept: "Product", location: "Bangalore / Remote", type: "Full-time" },
  ];

  return (
    <div className="bg-background min-h-screen pb-24">
      {/* Header */}
      <div className="py-24 text-center px-6 border-b border-surface-hover">
        <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-4 block">
          Join the Team
        </span>
        <h1 className="heading-display text-4xl lg:text-6xl text-foreground mb-6">
          Build the Future of Hospitality
        </h1>
        <p className="text-muted max-w-2xl mx-auto">
          We are architects, technologists, and hospitality purists on a mission to curate the world's most beautiful stays.
        </p>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-16">
        {/* Culture */}
        <div className="grid md:grid-cols-3 gap-8 mb-24">
          <div className="p-8 bg-surface border border-surface-hover rounded-2xl">
            <Users size={24} className="text-primary mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Small & Autonomous</h3>
            <p className="text-sm text-muted">We operate in small, highly capable teams. Minimal bureaucracy, maximum ownership.</p>
          </div>
          <div className="p-8 bg-surface border border-surface-hover rounded-2xl">
            <Zap size={24} className="text-primary mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Design Obsessed</h3>
            <p className="text-sm text-muted">Whether it's a digital interface or a physical space, we believe design solves everything.</p>
          </div>
          <div className="p-8 bg-surface border border-surface-hover rounded-2xl">
            <Compass size={24} className="text-primary mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Travel Encouraged</h3>
            <p className="text-sm text-muted">We want you to experience our properties. Generous annual travel credits are part of the deal.</p>
          </div>
        </div>

        {/* Open Roles */}
        <div>
          <h2 className="heading-display text-3xl text-foreground mb-8">Open Positions</h2>

          <div className="space-y-4">
            {jobs.map((job, i) => (
              <div key={i} className="group p-6 bg-surface border border-surface-hover rounded-2xl hover:border-border transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer">
                <div>
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
                    {job.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-subtle">
                    <span className="uppercase tracking-wider">{job.dept}</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="flex items-center gap-1"><MapPin size={12} /> {job.location}</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span>{job.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  Apply Now <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-8 bg-gradient-to-r from-surface to-surface-hover border border-border rounded-2xl text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">Don't see a fit?</h3>
            <p className="text-sm text-muted mb-6">We're always looking for exceptional talent. Send us your resume anyway.</p>
            <a href="mailto:careers@dhyanastays.com" className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground text-sm font-medium rounded-full hover:bg-border transition-colors">
              careers@dhyanastays.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
