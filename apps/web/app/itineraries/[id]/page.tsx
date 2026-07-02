'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { itinerariesApi, formatINR } from '../../../lib/api';
import type { Itinerary, ItineraryMessage } from '../../../lib/types';

const CATEGORY_EMOJI: Record<string, string> = {
  yoga: '🧘',
  meditation: '🕉️',
  meal: '🍽️',
  activity: '🚶',
  rest: '🌿',
  cultural: '🏛️',
};

const SUGGESTED_PROMPTS = [
  'Make day 2 less intense',
  'Add a cooking class somewhere',
  'Swap one yoga session for a sound bath',
  "I'd like more free time in the afternoons",
];

export default function ItineraryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [finalizing, setFinalizing] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ItineraryMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!id || !user) return;
    Promise.all([
      itinerariesApi.getById(id),
      itinerariesApi.listMessages(id).catch(() => [] as ItineraryMessage[]),
    ])
      .then(([it, msgs]) => {
        setItinerary(it);
        setMessages(msgs);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, user]);

  // Scroll chat to bottom on new message.
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      const updated = await itinerariesApi.finalize(id);
      setItinerary(updated);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Finalize failed');
    } finally {
      setFinalizing(false);
    }
  };

  const handleSend = async (text?: string) => {
    const content = (text ?? chatInput).trim();
    if (!content || sending) return;
    setChatError('');
    setSending(true);
    // Optimistic user-message append so the chat feels instant.
    const optimistic: ItineraryMessage = {
      id: `optimistic-${Date.now()}`,
      itineraryId: id,
      role: 'user',
      content,
      appliedPatch: null,
      tokensInput: 0,
      tokensOutput: 0,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setChatInput('');
    try {
      const result = await itinerariesApi.sendMessage(id, content);
      // Replace optimistic + append assistant. Server-returned IDs / timestamps win.
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        result.userMessage,
        result.assistantMessage,
      ]);
      if (result.updated) {
        setItinerary((prev) =>
          prev
            ? {
                ...prev,
                summary: result.updated.summary,
                days: result.updated.days,
                tokensInput: result.updated.tokensInput,
                tokensOutput: result.updated.tokensOutput,
                updatedAt: result.updated.updatedAt,
              }
            : prev,
        );
      }
    } catch (e: unknown) {
      // Remove optimistic on failure.
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setChatError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-red-500">{error || 'Itinerary not found.'}</p>
        <Link href="/itineraries" className="btn-ghost mt-4 inline-block">
          ← Back
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10 max-w-3xl mx-auto">
      <Link href="/itineraries" className="btn-ghost text-sm mb-4 inline-block">
        ← Back
      </Link>

      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="page-title">{itinerary.destination}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(itinerary.startsAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            })}{' '}
            –{' '}
            {new Date(itinerary.endsAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}{' '}
            · {itinerary.travelers} traveler{itinerary.travelers === 1 ? '' : 's'}
          </p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${
            itinerary.status === 'FINALIZED'
              ? 'bg-green-100 text-green-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {itinerary.status}
        </span>
      </div>

      {itinerary.budgetMinor != null && (
        <p className="text-xs text-gray-500 mb-4">
          Budget: {formatINR(itinerary.budgetMinor)} per person
        </p>
      )}

      {itinerary.interests.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {itinerary.interests.map((i) => (
            <span
              key={i}
              className="text-xs px-2 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200"
            >
              {i}
            </span>
          ))}
        </div>
      )}

      {itinerary.summary && (
        <div className="card p-5 mb-6 bg-brand-50/50 border-brand-100">
          <h2 className="font-semibold text-gray-900 mb-2">Overview</h2>
          <p className="text-sm text-gray-700">{itinerary.summary}</p>
        </div>
      )}

      {itinerary.days?.map((day) => (
        <div key={day.day} className="card p-5 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-brand-700 text-white flex items-center justify-center font-semibold text-sm">
              {day.day}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{day.title}</h3>
              <p className="text-xs text-gray-500">
                {new Date(day.date).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
            </div>
          </div>

          <div className="space-y-2 border-l-2 border-gray-100 ml-5 pl-4">
            {day.sessions.map((s, idx) => (
              <div key={idx} className="relative">
                <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-brand-200 border-2 border-brand-700" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono">{s.time}</span>
                  <span className="text-xs">{CATEGORY_EMOJI[s.category] ?? '•'}</span>
                  <span className="text-sm font-medium text-gray-900">{s.title}</span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ── Chat refinement panel ─────────────────────────────────────────── */}
      {itinerary.status !== 'FINALIZED' && (
        <div className="card p-5 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Refine with chat</h2>
            <span className="text-xs text-gray-400">
              {messages.length} message{messages.length === 1 ? '' : 's'}
            </span>
          </div>

          <p className="text-xs text-gray-500 mb-4">
            Ask the planner to tweak the itinerary in plain English. Changes apply to the
            plan above automatically.
          </p>

          {messages.length === 0 ? (
            <div className="space-y-2 mb-4">
              <p className="text-xs text-gray-500">Try one of these:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleSend(p)}
                    disabled={sending}
                    className="text-xs px-3 py-1.5 rounded-full border border-gray-200 hover:border-brand-700 text-gray-700 hover:text-brand-700"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 mb-4 max-h-96 overflow-y-auto pr-1">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      m.role === 'user'
                        ? 'bg-brand-700 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.appliedPatch && (
                      <p
                        className={`text-[10px] mt-1 ${
                          m.role === 'user' ? 'text-brand-100' : 'text-brand-700'
                        }`}
                      >
                        ✓ Updated the plan above
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-500 text-xs rounded-2xl rounded-bl-sm px-4 py-2 inline-flex items-center gap-2">
                    <span className="spinner" /> Planner is thinking…
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask the planner anything…"
              maxLength={2000}
              disabled={sending}
              className="input flex-1"
            />
            <button
              type="submit"
              disabled={sending || !chatInput.trim()}
              className="btn-primary"
            >
              Send
            </button>
          </form>
          {chatError && <p className="text-red-500 text-xs mt-2">{chatError}</p>}
        </div>
      )}

      {itinerary.status !== 'FINALIZED' && (
        <button
          type="button"
          onClick={handleFinalize}
          disabled={finalizing}
          className="btn-primary w-full mt-4"
        >
          {finalizing ? <span className="spinner" /> : 'Finalize itinerary'}
        </button>
      )}

      {itinerary.model && (
        <p className="text-xs text-gray-400 mt-4 text-center">
          Generated by {itinerary.model}
        </p>
      )}
    </div>
  );
}
