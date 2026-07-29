import {
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Pencil,
  Languages,
  Heart,
  PhoneCall,
} from "lucide-react";
import { PageHeader, SectionCard, StatusPill } from "@/app/components/DashboardUI";

const personal = [
  { label: "Full Name", value: "Ananya Rao" },
  { label: "Email", value: "ananya.rao@gmail.com" },
  { label: "Phone", value: "+91 98407 22110" },
  { label: "Date of Birth", value: "14 Mar 1994" },
  { label: "City", value: "Chennai, Tamil Nadu" },
  { label: "Member Since", value: "August 2023" },
];

const emergency = [
  { name: "Rohit Rao", relation: "Brother", phone: "+91 98407 55621" },
  { name: "Lakshmi Rao", relation: "Mother", phone: "+91 94441 08733" },
];

const stayTypes = ["Tiny Houses", "Farm Stays", "Wellness Retreats", "Eco Stays"];
const destinations = ["Auroville", "Kodaikanal", "Wayanad", "Gokarna", "Spiti Valley"];
const languages = ["English", "Tamil", "Hindi"];

export default function TravellerProfilePage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="My Profile"
        subtitle="Your personal information, travel preferences and emergency contacts."
        action={{ label: "Edit Profile", href: "/traveller/profile", icon: Pencil }}
      />

      {/* Identity card */}
      <div className="bg-gradient-to-r from-surface to-surface-hover border border-border rounded-2xl p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://i.pravatar.cc/150?img=32"
          alt="Ananya Rao"
          className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/40"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold text-foreground">Ananya Rao</h2>
            <StatusPill tone="sage">
              <ShieldCheck size={11} /> KYC Verified
            </StatusPill>
            <StatusPill tone="primary">Gold Member</StatusPill>
          </div>
          <p className="text-sm text-muted mt-1">
            12 trips completed · 4 states explored · 2,450 reward points
          </p>
        </div>
        <button className="px-4 py-2 text-xs font-medium border border-border rounded-full text-muted hover:text-foreground hover:border-border-light transition-colors">
          Change photo
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Personal Information" icon={User} action={{ label: "Edit", href: "/traveller/profile" }}>
          <div className="grid sm:grid-cols-2 gap-x-6 px-5 py-2 divide-y sm:divide-y-0 divide-surface-hover">
            {personal.map((f) => (
              <div key={f.label} className="py-3">
                <p className="text-xs text-subtle">{f.label}</p>
                <p className="text-sm text-foreground mt-0.5">{f.value}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Emergency Contacts" icon={PhoneCall} action={{ label: "Add contact", href: "/traveller/profile" }}>
          <ul className="divide-y divide-surface-hover">
            {emergency.map((c) => (
              <li key={c.name} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted">{c.relation}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted tabular-nums">{c.phone}</span>
                  <span className="w-8 h-8 rounded-full bg-sage/15 text-sage flex items-center justify-center">
                    <Phone size={13} />
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p className="px-5 pb-4 text-[11px] text-subtle">
            Shared with your host and Dhyana SOS support during active trips.
          </p>
        </SectionCard>

        <SectionCard title="Travel Preferences" icon={Heart}>
          <div className="px-5 py-4 space-y-4">
            <div>
              <p className="text-xs text-subtle mb-2">Preferred stay types</p>
              <div className="flex flex-wrap gap-1.5">
                {stayTypes.map((t) => (
                  <span key={t} className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-subtle mb-2">Favourite destinations</p>
              <div className="flex flex-wrap gap-1.5">
                {destinations.map((d) => (
                  <span key={d} className="flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-surface-hover text-muted">
                    <MapPin size={10} /> {d}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-subtle">
              These power your AI Trip Planner suggestions and homepage recommendations.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="Languages & Communication" icon={Languages}>
          <div className="px-5 py-4 space-y-4">
            <div>
              <p className="text-xs text-subtle mb-2">Languages you speak</p>
              <div className="flex flex-wrap gap-1.5">
                {languages.map((l) => (
                  <span key={l} className="text-xs px-3 py-1 rounded-full bg-surface-hover text-muted">
                    {l}
                  </span>
                ))}
              </div>
            </div>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2.5 text-sm text-muted">
                <Mail size={14} className="text-subtle" /> Booking updates on email — on
              </li>
              <li className="flex items-center gap-2.5 text-sm text-muted">
                <Phone size={14} className="text-subtle" /> WhatsApp trip alerts — on
              </li>
            </ul>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
