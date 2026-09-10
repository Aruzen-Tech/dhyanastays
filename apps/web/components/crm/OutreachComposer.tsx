'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  crmApi,
  type CrmMessageTemplate,
  type CrmOutreachResult,
} from '../../lib/api';

type Target =
  | { kind: 'contact'; userId: string; label?: string }
  | { kind: 'selection'; userIds: string[] }
  | { kind: 'segment'; segmentId: string; label?: string };

interface Props {
  target: Target;
  onClose: () => void;
  onSent?: (result: CrmOutreachResult) => void;
}

type Channel = 'EMAIL' | 'SMS';

/**
 * Compose + send CRM outreach (email / SMS) to a single contact, a set of
 * selected contacts, or a saved segment. Portaled modal so it escapes any
 * transformed ancestor. Loads reusable templates and can save the current
 * draft as one. The backend enforces do-not-contact and reports skips.
 */
export default function OutreachComposer({ target, onClose, onSent }: Props) {
  const [channels, setChannels] = useState<Channel[]>(['EMAIL']);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [templates, setTemplates] = useState<CrmMessageTemplate[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CrmOutreachResult | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    crmApi.listTemplates().then(setTemplates).catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggleChannel = (c: Channel) =>
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const applyTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    if (t.subject) setSubject(t.subject);
    setBody(t.body);
  };

  const saveAsTemplate = async () => {
    const name = window.prompt('Name this template:');
    if (!name?.trim()) return;
    try {
      const t = await crmApi.saveTemplate({
        name: name.trim(),
        subject: subject.trim() || undefined,
        body,
      });
      setTemplates((prev) => [...prev, t].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save template');
    }
  };

  const send = async () => {
    if (!body.trim() || channels.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const payload: Parameters<typeof crmApi.sendOutreach>[0] = {
        channels,
        subject: subject.trim() || undefined,
        body,
      };
      if (target.kind === 'contact') payload.userId = target.userId;
      else if (target.kind === 'selection') payload.userIds = target.userIds;
      else payload.segmentId = target.segmentId;

      const res = await crmApi.sendOutreach(payload);
      setResult(res);
      onSent?.(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setBusy(false);
    }
  };

  const audienceLabel =
    target.kind === 'contact'
      ? target.label ?? 'this contact'
      : target.kind === 'selection'
        ? `${target.userIds.length} selected contact${target.userIds.length === 1 ? '' : 's'}`
        : target.label ?? 'segment';

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {result ? (
          <div>
            <h2 className="text-lg font-semibold">Outreach sent</h2>
            <p className="mt-2 text-sm">
              Queued for <strong>{result.sent}</strong> of {result.total} contact
              {result.total === 1 ? '' : 's'}.
            </p>
            {(result.skipped.doNotContact ||
              result.skipped.noEmail ||
              result.skipped.noPhone) > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-muted">
                {result.skipped.doNotContact > 0 && (
                  <li>{result.skipped.doNotContact} skipped — do-not-contact</li>
                )}
                {result.skipped.noEmail > 0 && (
                  <li>{result.skipped.noEmail} skipped — no email on file</li>
                )}
                {result.skipped.noPhone > 0 && (
                  <li>{result.skipped.noPhone} skipped — no phone on file</li>
                )}
              </ul>
            )}
            <div className="mt-5 flex justify-end">
              <button className="btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">Send outreach</h2>
                <p className="text-sm text-muted">To {audienceLabel}</p>
              </div>
              <button className="btn-ghost -mr-2 -mt-1 text-xl leading-none" onClick={onClose} aria-label="Close">
                ×
              </button>
            </div>

            {error && <div className="alert-error mb-3">{error}</div>}

            {/* Channels */}
            <div className="mb-3 flex gap-4 text-sm">
              {(['EMAIL', 'SMS'] as Channel[]).map((c) => (
                <label key={c} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={channels.includes(c)}
                    onChange={() => toggleChannel(c)}
                  />
                  {c === 'EMAIL' ? 'Email' : 'SMS'}
                </label>
              ))}
            </div>

            {/* Template picker */}
            {templates.length > 0 && (
              <select
                className="input mb-3 text-sm"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) applyTemplate(e.target.value);
                  e.target.value = '';
                }}
              >
                <option value="">Insert a template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}

            {channels.includes('EMAIL') && (
              <input
                className="input mb-3"
                placeholder="Email subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
              />
            )}

            <textarea
              className="input min-h-[160px] w-full"
              placeholder="Write your message…  Use {{firstName}} or {{name}} to personalise."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={5000}
            />
            <p className="mt-1 text-xs text-muted">
              Placeholders: <code>{'{{firstName}}'}</code> · <code>{'{{name}}'}</code>. SMS ignores
              the subject.
            </p>

            <div className="mt-5 flex items-center justify-between gap-2">
              <button
                type="button"
                className="text-xs text-brand-700 hover:underline"
                disabled={!body.trim()}
                onClick={saveAsTemplate}
              >
                Save as template
              </button>
              <div className="flex gap-2">
                <button className="btn-ghost" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  disabled={busy || !body.trim() || channels.length === 0}
                  onClick={send}
                >
                  {busy ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
