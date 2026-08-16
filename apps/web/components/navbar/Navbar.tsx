'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import BrandMark from '../BrandMark';
import { useAuth } from '../../context/AuthContext';
import { useFeatures } from '../../context/FeatureContext';
import { buildNavItems, isItemActive, type NavItem } from '../../lib/navigation';
import SidebarDrawer from './SidebarDrawer';
import UserMenu from './UserMenu';

/**
 * Compact top bar: a ⋯ button that reveals the full off-canvas SidebarDrawer,
 * the logo, a set of large, centered quick links (Explore + guest shortcuts),
 * and the right-side user cluster. The drawer still holds the complete nav;
 * the quick links just save common destinations a click.
 */
export default function Navbar() {
  const { user } = useAuth();
  const { isEnabled } = useFeatures();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const items = useMemo(
    () => buildNavItems({ role: user?.role, kind: user?.kind, isEnabled }),
    [user?.role, user?.kind, isEnabled],
  );

  // Centered header shortcuts. Explore for everyone; SOS + AI Itinerary for
  // guests (flag-gated) so they never need to open the drawer for these.
  const quickLinks = useMemo<NavItem[]>(() => {
    const links: NavItem[] = [{ id: 'q-explore', href: '/', label: 'Explore', activeMatch: 'exact' }];
    if (user?.role === 'GUEST') {
      if (isEnabled('ai_itinerary')) {
        links.push({ id: 'q-itinerary', href: '/itineraries', label: 'AI Itinerary', activeMatch: 'prefix' });
      }
      if (isEnabled('sos')) {
        links.push({
          id: 'q-sos',
          href: '/sos',
          label: '🆘 SOS',
          activeMatch: 'exact',
          emphasis: 'danger',
          title: 'Emergency SOS',
        });
      }
    }
    return links;
  }, [user?.role, isEnabled]);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 glass-nav">
      <div className="container-page">
        <nav className="flex items-center h-16 gap-3">
          {/* Left: menu + logo */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30"
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              aria-haspopup="dialog"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>

            <Link
              href="/"
              className="flex items-center gap-2.5 group shrink-0"
              onClick={() => setDrawerOpen(false)}
            >
              <BrandMark size={34} />
              <span className="font-bold text-brand-700 text-lg tracking-tight group-hover:opacity-80 transition-opacity hidden sm:inline">
                Dhyana Stays
              </span>
            </Link>
          </div>

          {/* Center: large quick links (fills the space between logo and user cluster) */}
          <div className="flex-1 flex items-center justify-center min-w-0">
            <div className="hidden md:flex items-center gap-2 lg:gap-4">
              {quickLinks.map((item) => {
                const active = isItemActive(item, pathname);
                const danger = item.emphasis === 'danger';
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    title={item.title}
                    className={`px-5 py-2.5 rounded-full text-base font-semibold whitespace-nowrap transition-all active:scale-[0.97] ${
                      danger
                        ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
                        : active
                          ? 'text-brand-700 bg-brand-50 shadow-sm'
                          : 'text-gray-600 hover:text-brand-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: user cluster */}
          <div className="flex items-center gap-2 shrink-0">
            <UserMenu />
          </div>
        </nav>
      </div>

      <SidebarDrawer
        items={items}
        pathname={pathname}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </header>
  );
}
