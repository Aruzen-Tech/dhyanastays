import { Video, Plus, Eye, Pencil, ChefHat, Play } from "lucide-react";
import { PageHeader, SectionCard, StatGrid, StatusPill } from "@/app/components/DashboardUI";

// ============================================
// FOOD PARTNER — Stories
// Chef stories & local cuisine stories
// ============================================

const chefStories = [
  { title: "Meena Akka's wood-fire mornings", image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=75", kind: "Video · 2:40", views: "4.2k", status: "Published", tone: "sage" as const },
  { title: "Raju Anna: the dum biryani ritual", image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=75", kind: "Video · 3:15", views: "6.8k", status: "Published", tone: "sage" as const },
  { title: "Marc's sourdough from Auroville flour", image: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=75", kind: "Photo essay", views: "1.9k", status: "Draft", tone: "muted" as const },
];

const cuisineStories = [
  { title: "Why Chettinad pepper is different", image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=75", kind: "Article · 4 min", views: "3.1k", status: "Published", tone: "sage" as const },
  { title: "Banana leaf: the original plate", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=75", kind: "Article · 3 min", views: "2.4k", status: "Published", tone: "sage" as const },
];

const cooks = [
  { name: "Meena Akka", specialty: "Chettinad", avatar: "https://i.pravatar.cc/150?img=47", stories: 4 },
  { name: "Raju Anna", specialty: "Dum biryani · village style", avatar: "https://i.pravatar.cc/150?img=59", stories: 3 },
  { name: "Marc D", specialty: "Sourdough & bakes", avatar: "https://i.pravatar.cc/150?img=13", stories: 2 },
];

function StoryGrid({ stories }: { stories: typeof chefStories }) {
  return (
    <div className="grid sm:grid-cols-3 gap-5 p-5">
      {stories.map((s) => (
        <div key={s.title} className="rounded-xl overflow-hidden bg-background border border-border card-hover">
          <div className="relative h-32">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" src={s.image} alt={s.title} className="w-full h-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center">
                <Play size={14} />
              </span>
            </span>
            <span className="absolute top-2.5 right-2.5">
              <StatusPill tone={s.tone}>{s.status}</StatusPill>
            </span>
          </div>
          <div className="p-3.5">
            <p className="text-sm font-medium text-foreground leading-snug">{s.title}</p>
            <div className="flex items-center justify-between mt-2 text-[11px] text-subtle">
              <span>{s.kind}</span>
              <span className="flex items-center gap-1"><Eye size={10} /> {s.views}</span>
            </div>
            <div className="flex gap-2 mt-3 pt-2.5 border-t border-surface-hover">
              <button className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium border border-border rounded-full text-muted hover:text-foreground transition-colors">
                <Pencil size={10} /> Edit
              </button>
              <button className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium border border-border rounded-full text-muted hover:text-foreground transition-colors">
                <Eye size={10} /> View
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FoodPartnerStoriesPage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <PageHeader
        title="Stories"
        subtitle="Chef stories and local cuisine stories — they appear on your dishes and the Curated Food pages."
        action={{ label: "New Story", href: "/food-partner/stories", icon: Plus }}
      />

      <StatGrid
        stats={[
          { label: "Published Stories", value: "4", delta: "1 draft", icon: Video },
          { label: "Total Views", value: "18.4k", delta: "+2.1k this week", icon: Eye },
          { label: "Best Performer", value: "Dum biryani ritual", delta: "6.8k views" },
          { label: "Conversion Lift", value: "+23%", delta: "dishes with stories sell more" },
        ]}
      />

      <SectionCard title="Chef Stories" icon={ChefHat}>
        <StoryGrid stories={chefStories} />
      </SectionCard>

      <SectionCard title="Local Cuisine Stories" icon={Video}>
        <StoryGrid stories={cuisineStories} />
      </SectionCard>

      {/* Cooks */}
      <SectionCard title="Your Cooks" icon={ChefHat} action={{ label: "Add cook", href: "/food-partner/stories" }}>
        <ul className="divide-y divide-surface-hover">
          {cooks.map((c) => (
            <li key={c.name} className="flex items-center gap-3 px-5 py-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" src={c.avatar} alt={c.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted">{c.specialty}</p>
              </div>
              <span className="text-[11px] text-subtle">{c.stories} stories</span>
            </li>
          ))}
        </ul>
        <p className="px-5 pb-4 text-[11px] text-subtle">
          Guests choose their cook when pre-booking — profiles with stories get picked 3× more.
        </p>
      </SectionCard>
    </div>
  );
}
