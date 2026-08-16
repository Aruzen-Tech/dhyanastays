'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useFeatures } from '../../context/FeatureContext';
import { buildNavItems } from '../../lib/navigation';
import { searchNav, toCatalog } from '../../lib/assistantCatalog';
import { assistantApi, type AssistantSuggestion } from '../../lib/api';
import { useScrollLock } from '../../hooks/useScrollLock';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
  suggestions?: AssistantSuggestion[];
}

const ROLE_PROMPTS: Record<string, string[]> = {
  GUEST: ['How do I get a refund?', 'Where is my Stay Pass?', 'Plan a trip itinerary'],
  HOST: ['Add a new listing', 'Where are my payouts?', 'Block dates on my calendar'],
  ADMIN: ['Approve a pending listing', 'Process a refund', 'Open the CRM'],
  INVESTOR: ['View my portfolio', 'See distributions'],
};

export default function AssistantPanel({ open, onClose }: Props) {
  const { user } = useAuth();
  const { isEnabled } = useFeatures();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [asking, setAsking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useScrollLock(open);

  const navItems = useMemo(
    () => buildNavItems({ role: user?.role, kind: user?.kind, isEnabled }),
    [user?.role, user?.kind, isEnabled],
  );

  const matches = useMemo(() => searchNav(query, navItems).slice(0, 6), [query, navItems]);

  useEffect(() => setSel(0), [query]);

  // Focus the input + Escape-to-close while open.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, asking]);

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router],
  );

  const ask = useCallback(
    async (q: string) => {
      const message = q.trim();
      if (!message || asking) return;
      setMessages((m) => [...m, { role: 'user', text: message }]);
      setQuery('');
      setAsking(true);
      try {
        const reply = await assistantApi.ask({
          message,
          path: pathname,
          items: toCatalog(navItems),
        });
        setMessages((m) => [
          ...m,
          { role: 'assistant', text: reply.answer, suggestions: reply.suggestions },
        ]);
      } catch (e) {
        setMessages((m) => [
          ...m,
          { role: 'assistant', text: e instanceof Error ? e.message : 'Something went wrong.' },
        ]);
      } finally {
        setAsking(false);
      }
    },
    [asking, navItems, pathname],
  );

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (matches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSel((s) => Math.min(s + 1, matches.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSel((s) => Math.max(s - 1, 0));
        return;
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (matches.length > 0) go(matches[sel]?.href ?? matches[0].href);
      else void ask(query);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[70] ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Assistant"
        className={`glass absolute inset-y-0 right-0 w-[420px] max-w-[92vw] flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-gray-200/60 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <span className="font-semibold text-gray-900">Assistant</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close assistant"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-brand-700 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Thread */}
        <div ref={threadRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-sm text-muted">
              <p className="mb-3">Ask me where to find something, or search a feature.</p>
              <div className="flex flex-wrap gap-2">
                {(ROLE_PROMPTS[user?.role ?? 'GUEST'] ?? ROLE_PROMPTS.GUEST).map((p) => (
                  <button
                    key={p}
                    onClick={() => void ask(p)}
                    className="badge bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                <div
                  className={`inline-block max-w-[85%] text-sm px-3 py-2 rounded-2xl ${
                    m.role === 'user'
                      ? 'bg-brand-700 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {m.text}
                </div>
                {m.suggestions && m.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-col items-start gap-1.5">
                    {m.suggestions.map((s) => (
                      <button
                        key={s.href}
                        onClick={() => go(s.href)}
                        className="card-hover px-3 py-2 text-left text-sm w-full"
                        title={s.why}
                      >
                        <span className="font-medium text-brand-700">{s.label}</span>
                        {s.why && <span className="block text-xs text-muted">{s.why}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
          {asking && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <span className="spinner text-brand-700 w-4 h-4" /> Thinking…
            </div>
          )}
        </div>

        {/* Instant matches */}
        {matches.length > 0 && (
          <div className="border-t border-gray-200/60 px-2 py-2 max-h-52 overflow-y-auto">
            <p className="px-2 pb-1 text-xs text-muted uppercase tracking-wide">Jump to</p>
            {matches.map((it, i) => (
              <button
                key={it.id}
                onMouseEnter={() => setSel(i)}
                onClick={() => go(it.href)}
                className={`block w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  i === sel ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {it.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-200/60 p-3 shrink-0">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="Search features or ask a question…"
              className="input"
            />
            <button
              onClick={() => void ask(query)}
              disabled={!query.trim() || asking}
              className="btn-primary shrink-0"
            >
              Ask
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-muted">
            {matches.length > 0 ? '↑↓ to pick · ↵ to jump' : '↵ to ask'} · Esc to close
          </p>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
