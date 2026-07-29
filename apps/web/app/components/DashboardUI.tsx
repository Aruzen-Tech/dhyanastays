import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

// ============================================
// Shared UI primitives for dashboard sub-pages
// ============================================

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: { label: string; href: string; icon?: LucideIcon };
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <h1 className="heading-display text-3xl text-foreground mb-2">{title}</h1>
        <p className="text-sm text-muted max-w-xl">{subtitle}</p>
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-semibold text-sm rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all self-start sm:self-auto whitespace-nowrap"
        >
          {action.icon && <action.icon size={16} />}
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function StatGrid({
  stats,
}: {
  stats: { label: string; value: string; delta?: string; icon?: LucideIcon }[];
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">{s.label}</p>
            {s.icon && <s.icon size={15} className="text-primary" />}
          </div>
          <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{s.value}</p>
          {s.delta && <p className="text-[11px] text-sage mt-1">{s.delta}</p>}
        </div>
      ))}
    </div>
  );
}

export function SectionCard({
  title,
  icon: Icon,
  action,
  children,
  className = "",
}: {
  title: string;
  icon?: LucideIcon;
  action?: { label: string; href: string };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-surface border border-border rounded-2xl overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-hover">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon size={16} />
            </span>
          )}
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        {action && (
          <Link href={action.href} className="text-xs text-primary flex items-center gap-1 hover:underline">
            {action.label} <ArrowUpRight size={12} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

type Tone = "sage" | "primary" | "terracotta" | "muted";
const tones: Record<Tone, string> = {
  sage: "bg-sage/15 text-sage",
  primary: "bg-primary/15 text-primary",
  terracotta: "bg-terracotta/15 text-terracotta",
  muted: "bg-surface-hover text-muted",
};

export function StatusPill({ tone = "muted", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Display-only switch for settings mocks. */
export function Toggle({ on = false }: { on?: boolean }) {
  return (
    <span
      className={`relative inline-flex w-10 h-[22px] rounded-full transition-colors shrink-0 ${
        on ? "bg-sage" : "bg-surface-hover border border-border"
      }`}
    >
      <span
        className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-all ${
          on ? "left-[21px]" : "left-[3px]"
        }`}
      />
    </span>
  );
}

export function SettingRow({
  icon: Icon,
  title,
  sub,
  right,
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  right: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-9 h-9 rounded-lg bg-surface-hover text-muted flex items-center justify-center shrink-0">
          <Icon size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted truncate">{sub}</p>
        </div>
      </div>
      {right}
    </div>
  );
}
