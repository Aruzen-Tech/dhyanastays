'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

function getInitials(email: string, fullName?: string): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1 && parts[0].length > 0) return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

/**
 * Avatar trigger + a compact account dropdown — replaces the header's old
 * standalone truncated-email link and standalone theme-toggle icon; both
 * now live inside this one popover. No profile-image field exists on
 * AuthUser (confirmed: `{ sub, email, role, kind?, fullName? }`), so the
 * avatar falls back to initials derived from fullName (or the email if
 * fullName isn't set) — not a new backend field, purely a display fallback.
 *
 * The theme control here calls the exact same useTheme()/toggleTheme() the
 * old standalone ThemeToggle used — same state, same persistence, just a
 * different control surface (a switch row instead of a spinning icon
 * button), per "reuse the existing theme implementation."
 */
export default function AccountMenu() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!user) return null;

  const initials = getInitials(user.email, user.fullName);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Account menu"
        className="w-9 h-9 rounded-full bg-brand-700 text-white text-xs font-semibold flex items-center justify-center hover:bg-brand-800 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30 focus-visible:ring-offset-2"
      >
        {initials}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 w-64 z-50 bg-white border border-gray-100 shadow-glass rounded-2xl p-2 animate-scale-in"
          >
            <div className="px-3 py-2.5">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user.fullName || 'Account'}
              </p>
              <p className="text-xs text-gray-500 truncate" title={user.email}>
                {user.email}
              </p>
            </div>

            <div className="my-1 border-t border-gray-100" />

            <div className="px-1 py-2">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400 mb-2">
                Appearance
              </p>
              <div className="flex items-center justify-between px-2 py-1.5 rounded-xl">
                <span className="flex items-center gap-2 text-sm text-gray-700">
                  {theme === 'light' ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                  )}
                  Dark mode
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={theme === 'dark'}
                  aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                  onClick={toggleTheme}
                  className={`relative w-9 h-5 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30 focus-visible:ring-offset-2 ${
                    theme === 'dark' ? 'bg-brand-700' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                      theme === 'dark' ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
