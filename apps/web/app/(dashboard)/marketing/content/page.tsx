"use client";

import { useState } from "react";
import {
  Image as ImageIcon,
  Video,
  FileText,
  Upload,
  MapPin,
  Eye,
  Check,
  Sparkles,
} from "lucide-react";
import { PageHeader, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// MARKETING — Content Studio
// Post posters, videos & blogs into the app,
// targeted region-wise. Publish feeds the app.
// ============================================

const types = [
  { key: "poster", label: "Posters", icon: ImageIcon },
  { key: "video", label: "Videos", icon: Video },
  { key: "blog", label: "Blogs", icon: FileText },
] as const;
type CType = (typeof types)[number]["key"];

const allRegions = ["All India", "Tamil Nadu", "Pondicherry", "Kerala", "Karnataka"];
const placements: Record<CType, string[]> = {
  poster: ["Homepage Spotlight", "Stays Top Banner", "Food Hub Tile", "Events Banner"],
  video: ["Food Hub Tile", "Experience Cards", "Homepage Spotlight"],
  blog: ["Journal / Blog Section", "Homepage Blog Row"],
};

interface ContentItem {
  id: number;
  type: CType;
  title: string;
  region: string;
  placement: string;
  status: "Published" | "Draft" | "Scheduled";
  views: string;
  when: string;
}

const initialLibrary: ContentItem[] = [
  { id: 1, type: "poster", title: "Monsoon Wellness Week — hero poster", region: "All India", placement: "Homepage Spotlight", status: "Published", views: "84.2k", when: "Jul 12" },
  { id: 2, type: "poster", title: "Weekend Escapes 15% — banner", region: "Tamil Nadu", placement: "Stays Top Banner", status: "Published", views: "52.6k", when: "Jul 01" },
  { id: 3, type: "video", title: "Chettinad Feast — 40s reel", region: "Pondicherry", placement: "Food Hub Tile", status: "Published", views: "21.9k", when: "Jul 10" },
  { id: 4, type: "video", title: "Sunrise Yoga at Auroville — teaser", region: "All India", placement: "Experience Cards", status: "Draft", views: "—", when: "—" },
  { id: 5, type: "blog", title: "The Tiny House Philosophy", region: "All India", placement: "Journal / Blog Section", status: "Scheduled", views: "goes live Jul 20", when: "Jul 20" },
  { id: 6, type: "blog", title: "Monsoon Trails of the Western Ghats", region: "Kerala", placement: "Journal / Blog Section", status: "Published", views: "6.8k reads", when: "Jul 08" },
];

export default function ContentStudioPage() {
  const [type, setType] = useState<CType>("poster");
  const [title, setTitle] = useState("");
  const [region, setRegion] = useState("All India");
  const [placement, setPlacement] = useState(placements.poster[0]);
  const [library, setLibrary] = useState(initialLibrary);
  const [justPublished, setJustPublished] = useState(false);

  const switchType = (t: CType) => {
    setType(t);
    setPlacement(placements[t][0]);
  };

  const publish = () => {
    if (!title.trim()) return;
    setLibrary((prev) => [
      { id: Date.now(), type, title: title.trim(), region, placement, status: "Published", views: "just now", when: "Now" },
      ...prev,
    ]);
    setTitle("");
    setJustPublished(true);
    setTimeout(() => setJustPublished(false), 2500);
  };

  const visible = library.filter((c) => c.type === type);
  const TypeIcon = types.find((t) => t.key === type)!.icon;

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Content Studio"
        subtitle="Post posters, videos and blogs straight into the web app — pick the region, pick the placement, publish."
      />

      {/* Type tabs */}
      <div className="flex gap-2">
        {types.map((t) => (
          <button
            key={t.key}
            onClick={() => switchType(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-colors ${
              type === t.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-surface border-border text-muted hover:text-foreground"
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Composer */}
        <div className="bg-gradient-to-br from-primary/10 via-surface to-surface border border-primary/25 rounded-2xl p-6 space-y-5">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TypeIcon size={15} className="text-primary" />
            New {type}
          </p>

          <div>
            <label className="text-xs text-subtle block mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === "blog" ? "e.g. “Slow mornings in Kodaikanal”" : "e.g. “Independence Day long weekend”"}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder-subtle focus:outline-none focus:border-primary"
            />
          </div>

          {/* Region — the region-wise feed */}
          <div>
            <label className="text-xs text-subtle mb-1.5 flex items-center gap-1">
              <MapPin size={11} /> Target region
            </label>
            <div className="flex flex-wrap gap-1.5">
              {allRegions.map((r) => (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    region === r
                      ? "bg-sage text-white border-sage"
                      : "bg-background border-border text-muted hover:text-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-subtle block mb-1.5">Placement in app</label>
            <div className="flex flex-wrap gap-1.5">
              {placements[type].map((p) => (
                <button
                  key={p}
                  onClick={() => setPlacement(p)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    placement === p
                      ? "bg-primary/15 text-primary border-primary/40"
                      : "bg-background border-border text-muted hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
            <Upload size={18} className="mx-auto text-subtle" />
            <p className="text-xs text-muted mt-2">
              {type === "poster" ? "Drop poster · JPG/PNG · 1920×1080" : type === "video" ? "Drop video · MP4 · up to 60s" : "Paste or write in the editor after publish"}
            </p>
          </div>

          <button
            onClick={publish}
            className="w-full py-3 text-sm font-semibold bg-gradient-to-r from-primary to-primary-hover text-primary-foreground rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all"
          >
            Publish to app · {region}
          </button>
          {justPublished && (
            <p className="text-xs text-sage flex items-center gap-1.5 animate-fade-in">
              <Check size={13} /> Published — now feeding the {placement} for {region}.
            </p>
          )}
        </div>

        {/* Library */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-surface-hover flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground capitalize">{type} library</p>
            <span className="text-[10px] text-subtle">{visible.length} items</span>
          </div>
          <ul className="divide-y divide-surface-hover">
            {visible.map((c) => (
              <li key={c.id} className="flex items-center gap-4 px-5 py-4">
                <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <TypeIcon size={15} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                  <p className="text-xs text-muted mt-0.5 flex items-center gap-1 flex-wrap">
                    <MapPin size={10} /> {c.region} · {c.placement}
                  </p>
                </div>
                <span className="text-[11px] text-subtle flex items-center gap-1 shrink-0">
                  <Eye size={10} /> {c.views}
                </span>
                <StatusPill tone={c.status === "Published" ? "sage" : c.status === "Scheduled" ? "primary" : "muted"}>
                  {c.status}
                </StatusPill>
              </li>
            ))}
          </ul>
          <p className="px-5 py-3 text-[11px] text-subtle border-t border-surface-hover flex items-center gap-1.5">
            <Sparkles size={11} className="text-sage" />
            Published items feed their placement instantly for the chosen region — no deploy needed.
          </p>
        </div>
      </div>
    </div>
  );
}
