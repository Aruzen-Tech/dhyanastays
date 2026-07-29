import Link from "next/link";
import {
  Megaphone,
  Image as ImageIcon,
  Map,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Video,
  FileText,
  MapPin,
} from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// MARKETING DASHBOARD — Aditya Sharma
// Post content into the app, run campaigns in
// placements, feed everything region-wise.
// ============================================

const liveSlots = [
  { slot: "Homepage Spotlight", content: "Monsoon Wellness Week · Nila Retreat", region: "All India", tone: "sage" as const, status: "Live" },
  { slot: "Stays Top Banner", content: "Weekend Escapes · 15% off", region: "Tamil Nadu", tone: "sage" as const, status: "Live" },
  { slot: "Food Hub Tile", content: "Pre-book Chettinad Feast (video)", region: "Pondicherry", tone: "sage" as const, status: "Live" },
  { slot: "Blog Feature", content: "Tiny House Philosophy — new post", region: "All India", tone: "primary" as const, status: "Scheduled Jul 20" },
  { slot: "App Push Slot", content: "— empty · AI suggestions shown —", region: "Kerala", tone: "muted" as const, status: "Fallback" },
];

const regions = [
  { name: "Tamil Nadu", campaigns: 3, content: 9 },
  { name: "Pondicherry", campaigns: 2, content: 6 },
  { name: "Kerala", campaigns: 1, content: 5 },
  { name: "Karnataka", campaigns: 1, content: 3 },
  { name: "Goa", campaigns: 0, content: 1 },
];

export default function MarketingDashboardPage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Marketing Dashboard"
        subtitle="Welcome back, Aditya — 4 placements are live across 5 regions, and one slot in Kerala is running on AI fallback."
        action={{ label: "Post Content", href: "/marketing/content", icon: ImageIcon }}
      />

      <StatGrid
        stats={[
          { label: "Active Campaigns", value: "6", delta: "2 seasonal", icon: Megaphone },
          { label: "Content Live in App", value: "24", delta: "posters · videos · blogs", icon: ImageIcon },
          { label: "Regions Covered", value: "5", delta: "TN leads with 3 campaigns", icon: Map },
          { label: "Leads This Month", value: "1,240", delta: "+22% MoM", icon: TrendingUp },
        ]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Live placements */}
        <SectionCard title="What's Live in the App Right Now" icon={Sparkles} className="lg:col-span-2" action={{ label: "Manage placements", href: "/marketing/placements" }}>
          <ul className="divide-y divide-surface-hover">
            {liveSlots.map((s) => (
              <li key={s.slot} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-40 shrink-0">
                  <p className="text-xs font-semibold text-foreground">{s.slot}</p>
                  <p className="text-[10px] text-subtle flex items-center gap-1 mt-0.5">
                    <MapPin size={9} /> {s.region}
                  </p>
                </div>
                <p className="flex-1 text-xs text-muted truncate">{s.content}</p>
                <StatusPill tone={s.tone}>{s.status}</StatusPill>
              </li>
            ))}
          </ul>
          <p className="px-5 pb-4 text-[11px] text-subtle">
            Empty slots automatically fall back to AI suggestions until you feed them.
          </p>
        </SectionCard>

        {/* Region coverage */}
        <SectionCard title="Region-wise Feed" icon={Map} action={{ label: "Open regions", href: "/marketing/placements" }}>
          <ul className="divide-y divide-surface-hover">
            {regions.map((r) => (
              <li key={r.name} className="flex items-center justify-between px-5 py-3">
                <p className="text-sm text-foreground">{r.name}</p>
                <p className="text-[11px] text-muted tabular-nums">
                  {r.campaigns} campaigns · {r.content} content
                </p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* Quick create */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { icon: ImageIcon, label: "Post a poster", sub: "Banners & tiles for any placement", href: "/marketing/content" },
          { icon: Video, label: "Post a video", sub: "Reels for food, stays & events", href: "/marketing/content" },
          { icon: FileText, label: "Write a blog", sub: "Publishes to the Journal section", href: "/marketing/content" },
        ].map((q) => (
          <Link
            key={q.label}
            href={q.href}
            className="bg-surface border border-border rounded-2xl p-5 flex items-start gap-3 hover:border-primary/40 transition-colors group"
          >
            <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <q.icon size={18} />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{q.label}</p>
              <p className="text-xs text-muted mt-0.5">{q.sub}</p>
            </div>
            <ArrowRight size={14} className="text-subtle group-hover:text-primary transition-colors mt-1" />
          </Link>
        ))}
      </div>
    </div>
  );
}
