import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ArrowUpRight, Settings } from "lucide-react";
import { getRole } from "@/lib/dashboards";

// ============================================
// GENERIC ROLE DASHBOARD
// Renders any registry role that doesn't have a
// hand-built page (regional-host, sos-manager,
// marketing, finance, super-admin, …).
// Sidebar items anchor-link to the sections here.
// ============================================

// Deterministic status chip per row (no Math.random — SSR safe)
const chips = [
  { label: "Active", cls: "bg-sage/15 text-sage" },
  { label: "3 new", cls: "bg-primary/15 text-primary" },
  { label: "Updated", cls: "bg-surface-hover text-muted" },
  { label: "Review", cls: "bg-terracotta/15 text-terracotta" },
] as const;

export default async function RoleDashboardPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role: slug } = await params;
  const role = getRole(slug);

  // Roles with hand-built pages have their own static routes;
  // unknown slugs (e.g. /careers) fall through to 404.
  if (!role || role.nav) notFound();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-subtle uppercase tracking-widest mb-1.5">
            <role.icon size={13} className="text-primary" />
            {role.group}
          </div>
          <h1 className="heading-display text-3xl lg:text-4xl text-foreground">
            {role.title}
          </h1>
          <p className="text-sm text-muted mt-1.5">
            Welcome back, {role.persona} · Everything for the{" "}
            {role.badge.toLowerCase()} role in one place.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/25 px-3 py-1.5 rounded-full self-start md:self-auto">
          {role.badge}
        </span>
      </div>

      {/* Stats */}
      {role.stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {role.stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl bg-surface border border-surface-hover p-5"
            >
              <p className="text-xs text-muted">{s.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">
                {s.value}
              </p>
              {s.delta && (
                <p className="text-[11px] text-sage mt-1">{s.delta}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sections (anchor targets for the sidebar) */}
      <div className="grid lg:grid-cols-2 gap-6">
        {(role.sections ?? []).map((section, si) => (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-24 rounded-2xl bg-surface border border-surface-hover overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-hover">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <section.icon size={16} />
                </span>
                <h2 className="text-sm font-semibold text-foreground">
                  {section.title}
                </h2>
              </div>
              <button className="text-xs text-primary flex items-center gap-1 hover:underline">
                Manage <ArrowUpRight size={12} />
              </button>
            </div>
            <ul className="divide-y divide-surface-hover">
              {section.bullets.map((b, i) => {
                const chip = chips[(b.length + i + si) % chips.length];
                return (
                  <li key={b}>
                    <button className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-surface-hover transition-colors group">
                      <span className="text-sm text-muted group-hover:text-foreground transition-colors">
                        {b}
                      </span>
                      <span className="flex items-center gap-3">
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${chip.cls}`}
                        >
                          {chip.label}
                        </span>
                        <ChevronRight
                          size={14}
                          className="text-subtle group-hover:text-foreground transition-colors"
                        />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {/* Settings anchor */}
        <section
          id="settings"
          className="scroll-mt-24 rounded-2xl bg-surface border border-surface-hover p-5 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Settings size={16} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Role Settings
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Notifications, payout details, team access & preferences
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="text-xs font-medium text-primary-foreground bg-primary px-3.5 py-2 rounded-full hover:bg-primary-hover transition-colors shrink-0"
          >
            Open settings
          </Link>
        </section>
      </div>
    </div>
  );
}
