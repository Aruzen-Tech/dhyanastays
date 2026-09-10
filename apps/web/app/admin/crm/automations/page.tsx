'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import {
  crmApi,
  type CrmAutomationAction,
  type CrmAutomationConfig,
  type CrmAutomationRule,
  type CrmAutomationTrigger,
  type CrmLifecycleStage,
  type CrmTag,
} from '../../../../lib/api';
import CrmTabs from '../../../../components/crm/CrmTabs';

const TRIGGER_LABEL: Record<CrmAutomationTrigger, string> = {
  STAGE_CHANGED: 'moved into a stage',
  TAG_ADDED: 'tagged',
};
const ACTION_LABEL: Record<CrmAutomationAction, string> = {
  CREATE_TASK: 'Create a task',
  SEND_OUTREACH: 'Send outreach',
  ADD_TAG: 'Add a tag',
  ASSIGN_OWNER: 'Assign an owner',
};

export default function CrmAutomationsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [rules, setRules] = useState<CrmAutomationRule[]>([]);
  const [tags, setTags] = useState<CrmTag[]>([]);
  const [stages, setStages] = useState<CrmLifecycleStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Builder state
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<CrmAutomationTrigger>('STAGE_CHANGED');
  const [stageId, setStageId] = useState('');
  const [filterTagId, setFilterTagId] = useState('');
  const [action, setAction] = useState<CrmAutomationAction>('CREATE_TASK');
  const [cfg, setCfg] = useState<CrmAutomationConfig>({ priority: 'MEDIUM' });

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, t, s] = await Promise.all([
        crmApi.listAutomations(),
        crmApi.listTags(),
        crmApi.listStages(),
      ]);
      setRules(r);
      setTags(t);
      setStages(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load automations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setCfgField = (patch: Partial<CrmAutomationConfig>) => setCfg((c) => ({ ...c, ...patch }));

  const toggleChannel = (ch: 'EMAIL' | 'SMS') =>
    setCfg((c) => {
      const cur = c.channels ?? [];
      return { ...c, channels: cur.includes(ch) ? cur.filter((x) => x !== ch) : [...cur, ch] };
    });

  const resetBuilder = () => {
    setName('');
    setStageId('');
    setFilterTagId('');
    setAction('CREATE_TASK');
    setCfg({ priority: 'MEDIUM' });
  };

  const create = async () => {
    setError('');
    // Build the action config from the fields relevant to the chosen action.
    const config: CrmAutomationConfig = {};
    if (action === 'CREATE_TASK') {
      config.title = cfg.title;
      config.priority = cfg.priority ?? 'MEDIUM';
      if (cfg.dueInDays !== undefined && !Number.isNaN(cfg.dueInDays)) config.dueInDays = cfg.dueInDays;
    } else if (action === 'SEND_OUTREACH') {
      config.channels = cfg.channels;
      config.subject = cfg.subject;
      config.body = cfg.body;
    } else if (action === 'ADD_TAG') {
      config.tagId = cfg.tagId;
    } else if (action === 'ASSIGN_OWNER') {
      config.ownerId = user?.sub;
    }

    setBusy(true);
    try {
      await crmApi.createAutomation({
        name: name.trim(),
        trigger,
        stageId: trigger === 'STAGE_CHANGED' && stageId ? stageId : undefined,
        tagId: trigger === 'TAG_ADDED' && filterTagId ? filterTagId : undefined,
        action,
        config,
      });
      resetBuilder();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create rule');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (r: CrmAutomationRule) => {
    await crmApi.updateAutomation(r.id, { enabled: !r.enabled }).catch(() => {});
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this automation rule?')) return;
    await crmApi.deleteAutomation(id).catch(() => {});
    await load();
  };

  const describe = (r: CrmAutomationRule): string => {
    const stage = stages.find((s) => s.id === r.stageId)?.name;
    const filterTag = tags.find((t) => t.id === r.tagId)?.name;
    const when =
      r.trigger === 'STAGE_CHANGED'
        ? `moved into ${stage ? `“${stage}”` : 'any stage'}`
        : `tagged ${filterTag ? `“${filterTag}”` : '(any tag)'}`;
    let then = ACTION_LABEL[r.action];
    if (r.action === 'CREATE_TASK' && r.config.title) then = `create task “${r.config.title}”`;
    if (r.action === 'SEND_OUTREACH')
      then = `send ${(r.config.channels ?? []).join('/').toLowerCase() || 'outreach'}`;
    if (r.action === 'ADD_TAG') {
      const t = tags.find((x) => x.id === r.config.tagId)?.name;
      then = `add tag ${t ? `“${t}”` : ''}`;
    }
    return `When a contact is ${when} → ${then}`;
  };

  const canSave =
    name.trim().length > 0 &&
    (action !== 'CREATE_TASK' || !!cfg.title?.trim()) &&
    (action !== 'SEND_OUTREACH' || (!!cfg.channels?.length && !!cfg.body?.trim())) &&
    (action !== 'ADD_TAG' || !!cfg.tagId);

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <p className="eyebrow text-brand-700">Relationship management</p>
      <h1 className="page-title mb-6">CRM · Automations</h1>
      <CrmTabs />

      {error && <div className="alert-error mb-4">{error}</div>}

      {/* Builder */}
      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">New rule</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* WHEN */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted mb-2">When…</p>
            <div className="space-y-2">
              <select
                className="input text-sm"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value as CrmAutomationTrigger)}
              >
                <option value="STAGE_CHANGED">A contact is moved into a stage</option>
                <option value="TAG_ADDED">A contact is tagged</option>
              </select>
              {trigger === 'STAGE_CHANGED' ? (
                <select
                  className="input text-sm"
                  value={stageId}
                  onChange={(e) => setStageId(e.target.value)}
                >
                  <option value="">Any stage</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.kind.toLowerCase()})
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  className="input text-sm"
                  value={filterTagId}
                  onChange={(e) => setFilterTagId(e.target.value)}
                >
                  <option value="">Any tag</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* THEN */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted mb-2">Then…</p>
            <select
              className="input text-sm mb-2"
              value={action}
              onChange={(e) => setAction(e.target.value as CrmAutomationAction)}
            >
              {(Object.keys(ACTION_LABEL) as CrmAutomationAction[]).map((a) => (
                <option key={a} value={a}>
                  {ACTION_LABEL[a]}
                </option>
              ))}
            </select>

            {action === 'CREATE_TASK' && (
              <div className="space-y-2">
                <input
                  className="input text-sm"
                  placeholder="Task title (e.g. Welcome call)"
                  value={cfg.title ?? ''}
                  onChange={(e) => setCfgField({ title: e.target.value })}
                  maxLength={200}
                />
                <div className="flex gap-2">
                  <select
                    className="input text-sm"
                    value={cfg.priority ?? 'MEDIUM'}
                    onChange={(e) => setCfgField({ priority: e.target.value as CrmAutomationConfig['priority'] })}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    className="input text-sm"
                    placeholder="Due in N days"
                    value={cfg.dueInDays ?? ''}
                    onChange={(e) =>
                      setCfgField({ dueInDays: e.target.value === '' ? undefined : Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            )}

            {action === 'SEND_OUTREACH' && (
              <div className="space-y-2">
                <div className="flex gap-4 text-sm">
                  {(['EMAIL', 'SMS'] as const).map((ch) => (
                    <label key={ch} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={cfg.channels?.includes(ch) ?? false}
                        onChange={() => toggleChannel(ch)}
                      />
                      {ch === 'EMAIL' ? 'Email' : 'SMS'}
                    </label>
                  ))}
                </div>
                <input
                  className="input text-sm"
                  placeholder="Email subject (optional)"
                  value={cfg.subject ?? ''}
                  onChange={(e) => setCfgField({ subject: e.target.value })}
                  maxLength={200}
                />
                <textarea
                  className="input text-sm min-h-[90px]"
                  placeholder="Message… supports {{firstName}} / {{name}}"
                  value={cfg.body ?? ''}
                  onChange={(e) => setCfgField({ body: e.target.value })}
                  maxLength={5000}
                />
              </div>
            )}

            {action === 'ADD_TAG' && (
              <select
                className="input text-sm"
                value={cfg.tagId ?? ''}
                onChange={(e) => setCfgField({ tagId: e.target.value })}
              >
                <option value="">Select a tag…</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}

            {action === 'ASSIGN_OWNER' && (
              <p className="text-sm text-muted">
                Assigns matching contacts to <strong>you</strong> as the owner.
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <input
            className="input text-sm max-w-xs"
            placeholder="Rule name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
          />
          <button className="btn-primary" disabled={!canSave || busy} onClick={create}>
            {busy ? 'Saving…' : 'Create rule'}
          </button>
        </div>
        <p className="text-xs text-muted mt-3">
          Rules fire on single-contact actions (contact detail &amp; pipeline board). Bulk actions
          intentionally don&apos;t trigger automations. Outreach rules respect do-not-contact.
        </p>
      </div>

      {/* Existing rules */}
      {rules.length === 0 ? (
        <p className="text-sm text-muted">No automation rules yet.</p>
      ) : (
        <ul className="space-y-3">
          {rules.map((r) => (
            <li key={r.id} className="card p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">{r.name}</span>
                  {!r.enabled && <span className="badge bg-gray-100 text-gray-500">Paused</span>}
                  <span className="badge bg-brand-50 text-brand-700">{TRIGGER_LABEL[r.trigger]}</span>
                </div>
                <p className="text-sm text-gray-700 mt-1">{describe(r)}</p>
                <p className="text-xs text-muted mt-1">
                  Fired {r.timesFired}×
                  {r.lastFiredAt ? ` · last ${new Date(r.lastFiredAt).toLocaleDateString('en-IN')}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button className="btn-ghost text-sm py-1" onClick={() => toggle(r)}>
                  {r.enabled ? 'Pause' : 'Resume'}
                </button>
                <button className="text-red-600 hover:underline text-sm" onClick={() => remove(r.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
