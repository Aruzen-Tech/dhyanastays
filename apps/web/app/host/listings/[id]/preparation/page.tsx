'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import { listingsApi } from '../../../../../lib/api';
import type { PreparationGuide } from '../../../../../lib/types';

export default function HostPreparationPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState<PreparationGuide>({
    packingList: [],
    whatToExpect: '',
    dailySchedule: '',
    dietaryInfo: '',
    arrivalInstructions: '',
    additionalNotes: '',
  });

  // New packing item input
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'HOST') router.push('/dashboard');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || user.role !== 'HOST') return;
    listingsApi
      .getPreparation(id)
      .then((data) => {
        if (data.preparationGuide) {
          setForm({
            packingList: data.preparationGuide.packingList ?? [],
            whatToExpect: data.preparationGuide.whatToExpect ?? '',
            dailySchedule: data.preparationGuide.dailySchedule ?? '',
            dietaryInfo: data.preparationGuide.dietaryInfo ?? '',
            arrivalInstructions: data.preparationGuide.arrivalInstructions ?? '',
            additionalNotes: data.preparationGuide.additionalNotes ?? '',
          });
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, user]);

  const handleAddItem = () => {
    const item = newItem.trim();
    if (!item) return;
    setForm((prev) => ({ ...prev, packingList: [...(prev.packingList ?? []), item] }));
    setNewItem('');
  };

  const handleRemoveItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      packingList: (prev.packingList ?? []).filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await listingsApi.updatePreparation(id, {
        packingList: form.packingList,
        whatToExpect: form.whatToExpect || undefined,
        dailySchedule: form.dailySchedule || undefined,
        dietaryInfo: form.dietaryInfo || undefined,
        arrivalInstructions: form.arrivalInstructions || undefined,
        additionalNotes: form.additionalNotes || undefined,
      });
      setSuccess('Preparation guide saved successfully.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save preparation guide');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container-page py-10 max-w-2xl mx-auto">
      <div className="mb-8">
        <button onClick={() => router.push(`/host/listings/${id}/edit`)} className="btn-ghost text-sm mb-4">
          ← Back to listing
        </button>
        <h1 className="page-title">Retreat Preparation Guide</h1>
        <p className="text-gray-500 text-sm mt-1">
          Help guests prepare for their stay. This guide is shown to guests after their booking is confirmed.
        </p>
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm mb-6">{success}</div>}

      <div className="space-y-6">
        {/* Packing list */}
        <div className="card p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900">Packing list</h2>
            <p className="text-xs text-gray-500 mt-0.5">What should guests bring? Add items one at a time.</p>
          </div>

          {(form.packingList ?? []).length > 0 && (
            <ul className="space-y-2">
              {(form.packingList ?? []).map((item, i) => (
                <li key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-brand-600">•</span>
                    {item}
                  </span>
                  <button onClick={() => handleRemoveItem(i)} className="text-red-400 hover:text-red-600 text-xs">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); } }}
              placeholder="e.g. Comfortable yoga clothes"
              className="input text-sm flex-1"
              maxLength={200}
            />
            <button type="button" onClick={handleAddItem} className="btn-secondary px-4 text-sm whitespace-nowrap">
              + Add
            </button>
          </div>
        </div>

        {/* What to expect */}
        <div className="card p-6 space-y-3">
          <div>
            <h2 className="font-semibold text-gray-900">What to expect</h2>
            <p className="text-xs text-gray-500 mt-0.5">Give guests a brief overview of the retreat experience.</p>
          </div>
          <textarea
            value={form.whatToExpect}
            onChange={(e) => setForm((p) => ({ ...p, whatToExpect: e.target.value }))}
            className="input min-h-[100px] resize-y text-sm"
            rows={4}
            maxLength={3000}
            placeholder="Describe the atmosphere, activities, and what guests can look forward to..."
          />
        </div>

        {/* Daily schedule */}
        <div className="card p-6 space-y-3">
          <div>
            <h2 className="font-semibold text-gray-900">Daily schedule</h2>
            <p className="text-xs text-gray-500 mt-0.5">Share a typical day at your retreat.</p>
          </div>
          <textarea
            value={form.dailySchedule}
            onChange={(e) => setForm((p) => ({ ...p, dailySchedule: e.target.value }))}
            className="input min-h-[100px] resize-y text-sm"
            rows={4}
            maxLength={3000}
            placeholder="6:00 AM — Morning yoga&#10;7:30 AM — Breakfast&#10;9:00 AM — Meditation session&#10;..."
          />
        </div>

        {/* Dietary info */}
        <div className="card p-6 space-y-3">
          <div>
            <h2 className="font-semibold text-gray-900">Dietary information</h2>
            <p className="text-xs text-gray-500 mt-0.5">Describe meal options and dietary accommodations.</p>
          </div>
          <textarea
            value={form.dietaryInfo}
            onChange={(e) => setForm((p) => ({ ...p, dietaryInfo: e.target.value }))}
            className="input min-h-[80px] resize-y text-sm"
            rows={3}
            maxLength={2000}
            placeholder="We serve sattvic vegetarian meals. Vegan and gluten-free options available on request..."
          />
        </div>

        {/* Arrival instructions */}
        <div className="card p-6 space-y-3">
          <div>
            <h2 className="font-semibold text-gray-900">Arrival instructions</h2>
            <p className="text-xs text-gray-500 mt-0.5">How should guests reach your property? Check-in process?</p>
          </div>
          <textarea
            value={form.arrivalInstructions}
            onChange={(e) => setForm((p) => ({ ...p, arrivalInstructions: e.target.value }))}
            className="input min-h-[80px] resize-y text-sm"
            rows={3}
            maxLength={2000}
            placeholder="Nearest airport: Jolly Grant (DED), 25 km. We can arrange pickup for ₹800. Check-in from 2 PM..."
          />
        </div>

        {/* Additional notes */}
        <div className="card p-6 space-y-3">
          <div>
            <h2 className="font-semibold text-gray-900">Additional notes</h2>
            <p className="text-xs text-gray-500 mt-0.5">Anything else guests should know before arriving.</p>
          </div>
          <textarea
            value={form.additionalNotes}
            onChange={(e) => setForm((p) => ({ ...p, additionalNotes: e.target.value }))}
            className="input min-h-[80px] resize-y text-sm"
            rows={3}
            maxLength={2000}
            placeholder="Mobile network is limited. We have WiFi in common areas. Silence is observed after 9 PM..."
          />
        </div>

        {/* Save */}
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-3">
            {saving ? <><span className="spinner" /> Saving…</> : 'Save preparation guide'}
          </button>
          <button onClick={() => router.push(`/host/listings/${id}/edit`)} className="btn-secondary px-6">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
