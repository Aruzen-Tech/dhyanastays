"use client";

import Link from "next/link";
import { ArrowLeft, Phone, MapPin, ShieldAlert, HeartPulse, Shield, TriangleAlert, BellRing } from "lucide-react";
import { useState } from "react";

export default function SOSDashboardPage() {
  const [sosActive, setSosActive] = useState(false);

  const handleSOS = () => {
    setSosActive(true);
    // In a real app, this would trigger geolocation, push notifications to host/admin, and SMS to emergency contacts.
    setTimeout(() => {
      alert("Emergency beacon activated. Local authorities and your host have been notified of your location.");
    }, 500);
  };

  return (
    <div className="bg-background min-h-screen pb-24 pt-20">
      <div className="max-w-[800px] mx-auto px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-xs text-muted hover:text-foreground mb-8 transition-colors">
          <ArrowLeft size={14} /> Back to main site
        </Link>

        {/* SOS Button Area */}
        <div className="text-center mb-16">
          <h1 className="text-2xl font-semibold text-foreground mb-2 flex items-center justify-center gap-2">
            <ShieldAlert className="text-red-500" /> Dhyana SOS Network
          </h1>
          <p className="text-muted mb-10 text-sm">
            Press and hold in case of an immediate medical, security, or fire emergency.
          </p>

          <button
            onClick={handleSOS}
            className={`w-48 h-48 rounded-full border-[8px] flex flex-col items-center justify-center mx-auto transition-all duration-300 shadow-2xl relative ${
              sosActive
                ? "bg-red-600 border-red-500/50 shadow-[0_0_100px_rgba(220,38,38,0.6)] animate-pulse"
                : "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20 hover:scale-105"
            }`}
          >
            {sosActive && (
              <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-75" />
            )}
            <BellRing size={48} className={sosActive ? "text-white mb-2" : "mb-2"} />
            <span className={`font-bold tracking-widest ${sosActive ? "text-white" : ""}`}>
              {sosActive ? "ACTIVATED" : "SOS"}
            </span>
          </button>
        </div>

        {/* Emergency Contacts */}
        <div className="space-y-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">
            Local Emergency Services
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-surface border border-border rounded-2xl p-6 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Shield size={24} />
                </div>
                <div>
                  <div className="font-semibold text-foreground">Police</div>
                  <div className="text-xs text-muted">National Helpline</div>
                </div>
              </div>
              <a href="tel:100" className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-foreground group-hover:bg-blue-500 transition-colors">
                <Phone size={16} />
              </a>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-6 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                  <HeartPulse size={24} />
                </div>
                <div>
                  <div className="font-semibold text-foreground">Ambulance</div>
                  <div className="text-xs text-muted">Medical Emergency</div>
                </div>
              </div>
              <a href="tel:108" className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-foreground group-hover:bg-red-500 transition-colors">
                <Phone size={16} />
              </a>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-6 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                  <TriangleAlert size={24} />
                </div>
                <div>
                  <div className="font-semibold text-foreground">Fire Brigade</div>
                  <div className="text-xs text-muted">Fire Emergency</div>
                </div>
              </div>
              <a href="tel:101" className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-foreground group-hover:bg-orange-500 transition-colors">
                <Phone size={16} />
              </a>
            </div>

            <div className="bg-surface border border-primary/30 rounded-2xl p-6 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Phone size={24} />
                </div>
                <div>
                  <div className="font-semibold text-foreground">Property Host</div>
                  <div className="text-xs text-primary">Primary Contact</div>
                </div>
              </div>
              <button className="w-10 h-10 rounded-full bg-surface-hover border border-primary/30 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Phone size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Current Location Data */}
        <div className="mt-12 p-6 bg-surface border border-border rounded-2xl flex items-start gap-4">
          <MapPin size={24} className="text-subtle shrink-0 mt-1" />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Your Broadcast Location</h3>
            <p className="text-sm text-muted mb-3">
              If you trigger the SOS beacon, this location will be sent to the host and local authorities.
            </p>
            <div className="bg-background p-3 rounded-xl font-mono text-xs text-subtle border border-border">
              Lat: 31.1471° N, Lng: 77.1610° E<br/>
              Accuracy: ± 5 meters
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
