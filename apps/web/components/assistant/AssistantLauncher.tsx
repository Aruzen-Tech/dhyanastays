'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFeature } from '../../context/FeatureContext';
import AssistantPanel from './AssistantPanel';

/**
 * Floating launcher for the in-app assistant (bottom-right; SOS FAB sits
 * bottom-left). Shown to any authenticated user when `in_app_assistant` is on.
 * Keyboard shortcut is Ctrl/Cmd+J — Cmd+K is already owned by the admin
 * data-search overlay, so the two don't collide.
 */
export default function AssistantLauncher() {
  const { user } = useAuth();
  const enabled = useFeature('in_app_assistant');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (!user || !enabled) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open assistant (Ctrl or Cmd + J)"
        title="Assistant · Ctrl/Cmd + J"
        className="no-print fixed bottom-5 right-5 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-brand-700 text-white shadow-lg hover:bg-brand-800 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/40 focus-visible:ring-offset-2 animate-glow"
      >
        <span className="text-xl" aria-hidden="true">
          ✨
        </span>
      </button>
      <AssistantPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
