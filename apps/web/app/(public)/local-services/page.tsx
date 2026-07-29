import Link from "next/link";
import { Search, MapPin, Stethoscope, Car, Camera, Scissors, ShieldAlert, ArrowRight } from "lucide-react";

export default function LocalServicesPage() {
  const services = [
    { id: 1, title: "On-Call Doctor", icon: Stethoscope, category: "Medical", desc: "Vetted English-speaking doctors available for property visits within 60 mins." },
    { id: 2, title: "Airport Transfers", icon: Car, category: "Transport", desc: "Premium SUV and Sedan transfers with verified chauffeurs." },
    { id: 3, title: "Local Photographer", icon: Camera, category: "Creative", desc: "Hire a local professional to document your retreat or hike." },
    { id: 4, title: "In-Villa Spa & Grooming", icon: Scissors, category: "Wellness", desc: "Massage therapists and grooming experts delivered to your door." },
  ];

  return (
    <div className="pb-24">
      {/* Hero */}
      <section className="bg-background py-20 border-b border-border">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 text-center">
          <span className="text-xs uppercase tracking-wider text-primary font-bold mb-4 block">Concierge</span>
          <h1 className="heading-display text-4xl md:text-5xl text-foreground mb-6 max-w-3xl mx-auto">
            Everything you need, right where you are.
          </h1>
          <p className="text-muted max-w-2xl mx-auto mb-10">
            Dhyana verified local service providers available on demand. From emergency medical assistance to premium airport transfers.
          </p>

          <div className="max-w-xl mx-auto bg-surface border border-border rounded-2xl p-2 flex">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-subtle" />
              <input type="text" placeholder="What do you need?" className="w-full pl-12 pr-4 py-3 bg-transparent text-foreground focus:outline-none placeholder-subtle" />
            </div>
            <button className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-hover transition-colors">
              Find
            </button>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-20 max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((svc) => (
            <div key={svc.id} className="bg-surface border border-border rounded-2xl p-8 hover:border-primary/50 transition-colors group cursor-pointer flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-surface-hover flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                <svc.icon size={24} />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-subtle font-semibold mb-2">{svc.category}</span>
              <h3 className="text-lg font-semibold text-foreground mb-3">{svc.title}</h3>
              <p className="text-sm text-muted leading-relaxed mb-6 flex-1">{svc.desc}</p>
              <div className="flex items-center gap-2 text-sm text-primary font-medium group-hover:underline">
                Book now <ArrowRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SOS Banner */}
      <section className="max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="bg-gradient-to-r from-red-950/40 to-surface border border-red-500/20 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 text-red-400 font-semibold mb-4">
              <ShieldAlert size={20} /> Emegency Assistance
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Dhyana SOS Network</h2>
            <p className="text-muted max-w-xl">
              In case of a medical, security, or logistical emergency, our 24/7 SOS dashboard provides instant access to local authorities, pre-vetted medical facilities, and your property host.
            </p>
          </div>
          <Link href="/sos" className="px-8 py-4 bg-red-500/10 border border-red-500/30 text-red-400 font-semibold rounded-xl hover:bg-red-500/20 transition-colors whitespace-nowrap flex items-center gap-2">
            Open SOS Dashboard <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
