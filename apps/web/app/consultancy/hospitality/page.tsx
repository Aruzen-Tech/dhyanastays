import Link from "next/link";
import { ArrowRight, BarChart3, Target, ChefHat, HeartHandshake, CheckCircle2 } from "lucide-react";

export default function HospitalityConsultancyPage() {
  return (
    <div className="pb-24">
      {/* Hero Section */}
      <section className="relative h-[70vh] flex items-center">
        <img src="https://images.unsplash.com/photo-1542314831-c53cd3816002?q=80&w=2000&auto=format&fit=crop" alt="Hospitality" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8 w-full">
          <span className="text-xs uppercase tracking-wider text-primary font-bold mb-4 block">Dhyana Consultancy</span>
          <h1 className="heading-display text-4xl md:text-6xl text-foreground mb-6 max-w-2xl leading-tight">
            Elevate your guest experience.
          </h1>
          <p className="text-lg text-muted max-w-xl mb-10 leading-relaxed">
            Turn your property into a high-yielding, 5-star brand. Our hospitality experts provide operational playbooks, staff training, and revenue management strategies.
          </p>
          <div className="flex gap-4">
            <button className="px-8 py-4 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:bg-primary-hover transition-colors">
              Book a Strategy Call
            </button>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-24 max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">Operational Excellence</h2>
          <p className="text-muted max-w-2xl mx-auto">We don't just advise; we provide the exact frameworks we use to run the most successful properties on the Dhyana Stays platform.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { icon: BarChart3, title: "Revenue Management", desc: "Dynamic pricing strategies, yield optimization, and channel distribution management." },
            { icon: Target, title: "Brand Identity", desc: "Creating a unique narrative, visual identity, and marketing playbook for your stay." },
            { icon: ChefHat, title: "F&B Curation", desc: "Menu engineering, local sourcing strategies, and dining experience design." },
            { icon: HeartHandshake, title: "Service Training", desc: "SOP development, staff hiring profiles, and Dhyana-standard service training." },
          ].map((service, i) => (
            <div key={i} className="p-8 border border-border rounded-2xl bg-surface hover:border-primary/50 transition-colors group">
              <service.icon size={32} className="text-subtle group-hover:text-primary transition-colors mb-6" />
              <h3 className="text-xl font-semibold text-foreground mb-3">{service.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{service.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Case Study Snippet */}
      <section className="py-24 bg-surface border-y border-border">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 flex flex-col md:flex-row-reverse gap-16 items-center">
          <div className="md:w-1/2">
            <span className="text-[10px] uppercase tracking-wider text-primary font-bold mb-4 block">Case Study</span>
            <h2 className="text-3xl font-bold text-foreground mb-6">Heritage Courtyard turnaround</h2>
            <p className="text-muted leading-relaxed mb-8">
              By implementing our dynamic pricing model and redesigning their farm-to-table breakfast experience, Heritage Courtyard saw a massive shift in their business metrics within 90 days.
            </p>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="border-l-2 border-primary pl-4">
                <div className="text-3xl font-bold text-foreground mb-1">+45%</div>
                <div className="text-sm text-muted">Increase in RevPAR</div>
              </div>
              <div className="border-l-2 border-sage pl-4">
                <div className="text-3xl font-bold text-foreground mb-1">4.92</div>
                <div className="text-sm text-muted">Average Guest Rating (up from 4.2)</div>
              </div>
            </div>

            <Link href="#" className="text-primary text-sm font-medium hover:underline flex items-center gap-2">
              Read full case study <ArrowRight size={16} />
            </Link>
          </div>
          <div className="md:w-1/2 h-[500px] relative rounded-2xl overflow-hidden border border-border">
             <img src="https://images.unsplash.com/photo-1551882547-ff40c0d5b5df?q=80&w=800&auto=format&fit=crop" alt="Hospitality Success" className="w-full h-full object-cover opacity-80" />
          </div>
        </div>
      </section>
    </div>
  );
}
