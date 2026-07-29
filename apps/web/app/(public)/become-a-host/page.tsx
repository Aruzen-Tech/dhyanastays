"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import HostOnboardingFlow from "@/app/components/HostOnboardingFlow";

export default function BecomeAHostPage() {
  return (
    <div className="bg-background min-h-screen px-6 lg:px-8 pt-8 pb-10">
      <div className="max-w-[840px] mx-auto mb-6">
        <Link
          href="/business"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft size={12} /> Back to Business Hub
        </Link>
      </div>
      <HostOnboardingFlow returnHref="/business" returnLabel="Back to Business Hub" />
    </div>
  );
}
