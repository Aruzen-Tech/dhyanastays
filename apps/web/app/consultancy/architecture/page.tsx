import Link from "next/link";
import { ArrowRight, Compass, Ruler, Lightbulb, Users, CheckCircle2 } from "lucide-react";

export default function ArchitectureConsultancyPage() {
  return (
    <div className="pb-24">
      {/* Hero Section */}
      <section className="relative h-[70vh] flex items-center">
        <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000&auto=format&fit=crop" alt="Architecture" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8 w-full">
          <span className="text-xs uppercase tracking-wider text-primary font-bold mb-4 block">Dhyana Consultancy</span>
          <h1 className="heading-display text-4xl md:text-6xl text-foreground mb-6 max-w-2xl leading-tight">
            Design spaces that<br />breathe life.
          </h1>
          <p className="text-lg text-muted max-w-xl mb-10 leading-relaxed">
            Our award-winning architectural team helps you design eco-resorts, boutique homestays, and luxury villas that harmonize with nature and maximize guest experience.
          </p>
          <div className="flex gap-4">
            <button className="px-8 py-4 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:bg-primary-hover transition-colors">
              Book a Consultation
            </button>
            <button className="px-8 py-4 border border-primary text-primary font-semibold text-sm rounded-xl hover:bg-primary/10 transition-colors">
              View Our Projects
            </button>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-24 max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">Our Expertise</h2>
          <p className="text-muted max-w-2xl mx-auto">From conceptual master planning to meticulous interior detailing, we offer end-to-end architectural services for the hospitality sector.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { icon: Compass, title: "Master Planning", desc: "Site analysis, zoning, and spatial flow design for large-scale resorts." },
            { icon: Ruler, title: "Architectural Design", desc: "Biophilic and sustainable structural design for standalone villas or clusters." },
            { icon: Lightbulb, title: "Interior Aesthetics", desc: "Curated furniture, lighting, and material palettes that evoke luxury." },
            { icon: Users, title: "Project Management", desc: "End-to-end execution, contractor liaison, and quality control." },
          ].map((service, i) => (
            <div key={i} className="p-8 border border-border rounded-2xl bg-surface hover:border-primary/50 transition-colors group">
              <service.icon size={32} className="text-subtle group-hover:text-primary transition-colors mb-6" />
              <h3 className="text-xl font-semibold text-foreground mb-3">{service.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{service.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The Dhyana Standard */}
      <section className="py-24 bg-surface border-y border-border">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 flex flex-col md:flex-row gap-16 items-center">
          <div className="md:w-1/2">
            <h2 className="text-3xl font-bold text-foreground mb-6">The Dhyana Standard</h2>
            <p className="text-muted leading-relaxed mb-8">
              Properties designed by our consultancy team are guaranteed direct entry into the Dhyana Stays exclusive rental portfolio, bypassing the standard vetting queue.
            </p>
            <ul className="space-y-4">
              {[
                "Sustainable material sourcing",
                "Passive cooling & heating integration",
                "Optimized housekeeping flows",
                "Instagram-worthy focal points"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-foreground">
                  <CheckCircle2 size={18} className="text-primary" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="md:w-1/2 h-[500px] relative rounded-2xl overflow-hidden border border-border">
             <img src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=800&auto=format&fit=crop" alt="Interior Details" className="w-full h-full object-cover opacity-80" />
          </div>
        </div>
      </section>
    </div>
  );
}
