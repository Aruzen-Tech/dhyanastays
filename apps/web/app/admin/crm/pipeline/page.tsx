'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { crmApi, type CrmBoard, type CrmStageKind } from '../../../../lib/api';
import CrmTabs from '../../../../components/crm/CrmTabs';

const KINDS: CrmStageKind[] = ['GUEST', 'HOST', 'LEAD'];

export default function CrmPipelinePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [kind, setKind] = useState<CrmStageKind>('GUEST');
  const [board, setBoard] = useState<CrmBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newStage, setNewStage] = useState('');
  const [dragOver, setDragOver] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setBoard(await crmApi.getBoard(kind));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  const onDrop = async (stageId: string, userId: string) => {
    setDragOver(null);
    if (!userId) return;
    try {
      await crmApi.moveContactStage(userId, stageId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not move contact');
    }
  };

  const addStage = async () => {
    if (!newStage.trim()) return;
    try {
      await crmApi.createStage({ name: newStage.trim(), kind });
      setNewStage('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add stage');
    }
  };

  const removeStage = async (id: string) => {
    try {
      await crmApi.deleteStage(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete stage');
    }
  };

  if (isLoading || (!user && !error)) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <p className="eyebrow text-brand-700">Relationship management</p>
      <h1 className="page-title mb-4">CRM · Pipeline</h1>
      <CrmTabs />

      {error && <div className="alert-error mb-4">{error}</div>}

      {/* Kind selector + add stage */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2">
          {KINDS.map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`badge ${kind === k ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {k.charAt(0) + k.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="input !w-auto !py-1.5 text-sm"
            placeholder="New stage name"
            value={newStage}
            onChange={(e) => setNewStage(e.target.value)}
          />
          <button className="btn-secondary text-sm py-1.5" onClick={addStage} disabled={!newStage.trim()}>
            + Stage
          </button>
        </div>
      </div>

      <p className="text-xs text-muted mb-4">Drag a contact card to move it between stages.</p>

      {loading || !board ? (
        <div className="py-16 text-center">
          <span className="spinner text-brand-700" />
        </div>
      ) : board.stages.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          No stages for {kind.toLowerCase()} yet. Add one above.
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {board.stages.map((stage) => {
            const cards = board.cards[stage.id] ?? [];
            return (
              <div
                key={stage.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(stage.id);
                }}
                onDragLeave={() => setDragOver((s) => (s === stage.id ? null : s))}
                onDrop={(e) => onDrop(stage.id, e.dataTransfer.getData('text/plain'))}
                className={`w-[280px] shrink-0 rounded-2xl border p-3 transition-colors ${
                  dragOver === stage.id ? 'border-brand-400 bg-brand-50/60' : 'border-gray-200 bg-gray-50/40'
                }`}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="font-semibold text-gray-900 text-sm">{stage.name}</span>
                    <span className="text-xs text-muted">{cards.length}</span>
                  </div>
                  <button
                    onClick={() => removeStage(stage.id)}
                    className="text-muted hover:text-red-600 text-xs"
                    title="Delete stage"
                    aria-label={`Delete ${stage.name}`}
                  >
                    ×
                  </button>
                </div>

                <div className="flex flex-col gap-2 min-h-[60px]">
                  {cards.map((c) => (
                    <div
                      key={c.userId}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', c.userId)}
                      className="card p-3 cursor-grab active:cursor-grabbing"
                    >
                      <Link
                        href={`/admin/crm/${c.userId}`}
                        className="font-medium text-gray-900 hover:text-brand-700 text-sm"
                      >
                        {c.fullName}
                      </Link>
                      <div className="text-xs text-muted truncate">{c.email}</div>
                      <span className="badge bg-gray-100 text-gray-500 mt-1">
                        {c.role === 'HOST' ? 'Host' : 'Guest'}
                      </span>
                    </div>
                  ))}
                  {cards.length === 0 && (
                    <p className="text-xs text-muted text-center py-4">Drop contacts here</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
