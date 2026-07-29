"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, ChevronDown, Check } from "lucide-react";
import {
  dashboardRoles,
  dashboardGroups,
  getRoleNav,
} from "@/lib/dashboards";
import { LogoMark } from "@/app/components/Logo";
import { AuthProvider, useAuth } from "@/lib/auth-context";

function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { user, loading, signOut } = useAuth();

  // Resolve role from the first URL segment via the registry
  const firstSegment = pathname.split("/")[1] ?? "";
  const role =
    dashboardRoles.find((r) => r.slug === firstSegment) ?? dashboardRoles[0];
  const navItems = getRoleNav(role);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const displayName = user.fullName;
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U";

  const accountBadge =
    user.role === "GUEST"
      ? "Traveller"
      : user.role === "HOST"
        ? "Host"
        : "Administrator";

  return (
    <div className="bg-background min-h-screen flex flex-col md:flex-row">
      {/* Mobile Topbar */}
      <div className="md:hidden bg-surface border-b border-border p-4 flex items-center justify-between sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark size={30} />
          <span className="text-lg font-semibold text-foreground">
            Dashboard
          </span>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-foreground"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-[72px] md:top-0 h-[calc(100vh-72px)] md:h-screen w-full md:w-64 bg-surface border-r border-border z-40 transition-transform duration-300 md:translate-x-0 overflow-y-auto flex flex-col ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Persona + role switcher */}
        <div className="relative border-b border-border">
          <button
            onClick={() => {
              if (user.role === "ADMIN") {
                setSwitcherOpen(!switcherOpen);
              }
            }}
            className={`w-full p-5 flex items-center gap-3 text-left transition-colors ${
              user.role === "ADMIN"
                ? "hover:bg-surface-hover"
                : "cursor-default"
            }`}
            aria-expanded={user.role === "ADMIN" && switcherOpen}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center font-bold text-primary-foreground shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-foreground font-semibold text-sm line-clamp-1">
                {displayName}
              </h2>
              <p className="text-xs text-primary font-medium line-clamp-1">
                {accountBadge}
              </p>
            </div>
            {user.role === "ADMIN" && (
              <ChevronDown
                size={16}
                className={`text-muted transition-transform ${
                  switcherOpen ? "rotate-180" : ""
                }`}
              />
            )}
          </button>

          {/* Switcher dropdown — users with multiple permissions */}
          {user.role === "ADMIN" && switcherOpen && (
            <div className="absolute left-3 right-3 top-full -mt-1 z-50 rounded-xl border border-border bg-background shadow-2xl max-h-[420px] overflow-y-auto animate-fade-in">
              <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-subtle">
                Switch dashboard
              </p>
              {dashboardGroups.map((group) => (
                <div key={group} className="pb-1">
                  <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-primary/80">
                    {group}
                  </p>
                  {dashboardRoles
                    .filter((r) => r.group === group)
                    .map((r) => (
                      <Link
                        key={r.slug}
                        href={`/${r.slug}`}
                        onClick={() => {
                          setSwitcherOpen(false);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                          r.slug === role.slug
                            ? "text-primary bg-primary/10"
                            : "text-muted hover:text-foreground hover:bg-surface-hover"
                        }`}
                      >
                        <r.icon size={15} className="shrink-0" />
                        <span className="flex-1">{r.title}</span>
                        {r.slug === role.slug && <Check size={14} />}
                      </Link>
                    ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <nav className="p-4 flex-1 space-y-1">
          {navItems.map((item) => {
            const base = item.href.split("#")[0];
            const isActive =
              !item.href.includes("#") &&
              (pathname === base || pathname.startsWith(base + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                <item.icon
                  size={18}
                  className={isActive ? "text-primary" : "text-subtle"}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-muted hover:bg-surface-hover hover:text-foreground transition-colors mb-1"
          >
            <LogoMark size={18} />
            Back to main site
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-muted hover:bg-surface-hover hover:text-red-400 transition-colors"
          >
            <LogOut size={18} className="text-subtle" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full relative">
        <div className="hidden md:flex h-16 bg-background/95 backdrop-blur-md border-b border-surface-hover sticky top-0 z-30 items-center justify-between px-8">
          <p className="text-sm text-muted">
            <span className="text-foreground font-medium">{role.title}</span>
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-primary hover:underline"
            >
              Back to main site
            </Link>
            <div className="w-px h-4 bg-border" />
            <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-sm font-semibold text-foreground">
              {initials}
            </div>
          </div>
        </div>
        <div className="p-6 md:p-8 lg:p-10 max-w-[1200px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
