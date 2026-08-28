'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

const EMBED_SCRIPT = 'https://www.instagram.com/embed.js';
let scriptPromise: Promise<void> | null = null;

/** Load Instagram's embed.js once; it converts the blockquote into the real,
 *  auto-sized post card (avatar, username, media, like/comment/share, caption). */
function loadEmbedScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.instgrm) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${EMBED_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const s = document.createElement('script');
    s.src = EMBED_SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.body.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Renders an Instagram post/reel as its native embedded card. `permalink` is
 * the clean post URL (e.g. https://www.instagram.com/reel/<code>/). embed.js
 * sizes the card to its own content, so it can't be clipped.
 */
export default function InstagramEmbed({ permalink }: { permalink: string }) {
  const ref = useRef<HTMLQuoteElement>(null);

  useEffect(() => {
    let alive = true;
    void loadEmbedScript().then(() => {
      if (alive) window.instgrm?.Embeds.process();
    });
    return () => {
      alive = false;
    };
  }, [permalink]);

  return (
    <blockquote
      ref={ref}
      className="instagram-media"
      data-instgrm-permalink={permalink}
      data-instgrm-version="14"
      style={{ margin: 0, width: '100%', minWidth: 'auto', maxWidth: '100%', background: '#fff' }}
    />
  );
}
