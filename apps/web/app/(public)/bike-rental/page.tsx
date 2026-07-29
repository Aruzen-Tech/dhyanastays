import Link from "next/link";
import { Search, MapPin, ShieldCheck, Zap, Cog, Calendar, ArrowRight } from "lucide-react";

export default function BikeRentalPage() {
  const bikes = [
    {
      id: 1,
      name: "Royal Enfield Himalayan",
      type: "Adventure Tourer",
      engine: "411cc",
      price: 1500,
      image: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=800&auto=format&fit=crop",
      location: "Manali Hub"
    },
    {
      id: 2,
      name: "Ather 450X",
      type: "Premium EV Scooter",
      engine: "Electric",
      price: 800,
      image: "https://images.unsplash.com/photo-1621021487843-0972b22ec004?q=80&w=800&auto=format&fit=crop",
      location: "Goa Hub"
    },
    {
      id: 3,
      name: "Trek Marlin 7",
      type: "Mountain Bike (MTB)",
      engine: "Pedal",
      price: 500,
      image: "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?q=80&w=800&auto=format&fit=crop",
      location: "Wayanad Hub"
    }
  ];

  return (
    <div className="pb-24">
      {/* Hero Section */}
      <section className="bg-background py-20 border-b border-border">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <span className="text-[10px] uppercase tracking-wider text-primary font-bold mb-4 block">Dhyana Wheels</span>
            <h1 className="heading-display text-4xl md:text-6xl text-foreground mb-6">
              Explore at your own pace.
            </h1>
            <p className="text-lg text-muted mb-10 leading-relaxed">
              Rent meticulously maintained motorcycles, premium EV scooters, and mountain bikes directly from Dhyana hubs or get them delivered to your stay.
            </p>

            <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-[10px] uppercase tracking-wider text-subtle font-bold mb-1 ml-2">Pickup Location</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground" />
                  <select className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground appearance-none focus:outline-none focus:border-primary">
                    <option>Deliver to my Dhyana Stay</option>
                    <option>Manali Hub</option>
                    <option>Goa Hub</option>
                  </select>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-[10px] uppercase tracking-wider text-subtle font-bold mb-1 ml-2">Dates</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground" />
                  <input type="text" placeholder="Oct 15 - Oct 18" className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div className="flex items-end">
                <button className="w-full sm:w-auto px-8 py-2.5 h-[42px] bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-hover transition-colors whitespace-nowrap">
                  Find Wheels
                </button>
              </div>
            </div>
          </div>
          <div className="w-full md:w-1/2 h-[400px] relative">
            <div className="absolute inset-0 bg-gradient-to-r from-background to-transparent z-10 md:hidden" />
            <img src="https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=800&auto=format&fit=crop" alt="Motorcycle" className="w-full h-full object-cover rounded-3xl opacity-80" />
          </div>
        </div>
      </section>

      {/* Dhyana Guarantee */}
      <section className="py-16 max-w-[1200px] mx-auto px-6 lg:px-8 border-b border-border">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0">
              <ShieldCheck size={24} className="text-primary" />
            </div>
            <div>
              <h3 className="text-foreground font-medium mb-1">Fully Insured</h3>
              <p className="text-sm text-muted">Zero liability comprehensive insurance included on all motorized vehicles.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0">
              <Cog size={24} className="text-primary" />
            </div>
            <div>
              <h3 className="text-foreground font-medium mb-1">Dealer Serviced</h3>
              <p className="text-sm text-muted">Bikes are serviced at authorized centers after every single rental.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0">
              <Zap size={24} className="text-primary" />
            </div>
            <div>
              <h3 className="text-foreground font-medium mb-1">EV Charging Network</h3>
              <p className="text-sm text-muted">Free charging at all Dhyana Stays properties for our EV fleet.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Fleet */}
      <section className="py-16 max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-2xl font-semibold text-foreground">Available Fleet</h2>
          <div className="flex gap-2">
            <button className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">All</button>
            <button className="px-4 py-1.5 rounded-lg bg-surface border border-border text-muted text-sm hover:border-subtle">Motorcycles</button>
            <button className="px-4 py-1.5 rounded-lg bg-surface border border-border text-muted text-sm hover:border-subtle">EVs</button>
            <button className="px-4 py-1.5 rounded-lg bg-surface border border-border text-muted text-sm hover:border-subtle">Bicycles</button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {bikes.map((bike) => (
            <div key={bike.id} className="bg-surface border border-border rounded-2xl overflow-hidden group">
              <div className="h-48 relative bg-background">
                <img src={bike.image} alt={bike.name} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 right-3 px-2.5 py-1 bg-background/80 backdrop-blur-md rounded border border-border text-xs font-medium text-foreground">
                  {bike.engine}
                </div>
              </div>
              <div className="p-5">
                <div className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1">{bike.type}</div>
                <h3 className="text-lg font-semibold text-foreground mb-4">{bike.name}</h3>

                <div className="flex items-center gap-1 text-xs text-muted mb-4 pb-4 border-b border-border">
                  <MapPin size={12} /> Available at {bike.location}
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-lg font-bold text-foreground">₹{bike.price}</span>
                    <span className="text-xs text-subtle"> / day</span>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-surface-hover border border-border flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all">
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
