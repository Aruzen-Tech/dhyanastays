'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { guestApi } from '../../../lib/api';
import type { GuestPreference } from '../../../lib/types';

const DIETARY_OPTIONS = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten-free', label: 'Gluten-free' },
  { value: 'ayurvedic', label: 'Ayurvedic' },
  { value: 'jain', label: 'Jain' },
  { value: 'raw', label: 'Raw food' },
  { value: 'no-preference', label: 'No preference' },
];

const WELLNESS_OPTIONS = [
  { value: 'yoga', label: 'Yoga' },
  { value: 'meditation', label: 'Meditation' },
  { value: 'ayurveda', label: 'Ayurveda' },
  { value: 'detox', label: 'Detox' },
  { value: 'sound-healing', label: 'Sound Healing' },
  { value: 'breathwork', label: 'Breathwork' },
  { value: 'nature-therapy', label: 'Nature Therapy' },
  { value: 'spa', label: 'Spa & Wellness' },
];

const ROOM_OPTIONS = [
  { value: 'ground-floor', label: 'Ground floor' },
  { value: 'quiet-corner', label: 'Quiet corner' },
  { value: 'garden-view', label: 'Garden view' },
  { value: 'no-preference', label: 'No preference' },
];

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner', desc: 'New to wellness retreats' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Some retreat experience' },
  { value: 'advanced', label: 'Advanced', desc: 'Regular practitioner' },
];

const ARRIVAL_OPTIONS = [
  { value: 'early-morning', label: 'Early morning (6-10 AM)' },
  { value: 'afternoon', label: 'Afternoon (12-4 PM)' },
  { value: 'evening', label: 'Evening (4-8 PM)' },
];

export default function GuestPreferencesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  // Form state
  const [dietaryNeeds, setDietaryNeeds] = useState<string[]>([]);
  const [wellnessInterests, setWellnessInterests] = useState<string[]>([]);
  const [accessibility, setAccessibility] = useState('');
  const [roomPreference, setRoomPreference] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [arrivalPreference, setArrivalPreference] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    guestApi
      .getPreferences()
      .then((pref) => {
        if (pref) {
          setDietaryNeeds(pref.dietaryNeeds ?? []);
          setWellnessInterests(pref.wellnessInterests ?? []);
          setAccessibility(pref.accessibility ?? '');
          setRoomPreference(pref.roomPreference ?? '');
          setExperienceLevel(pref.experienceLevel ?? '');
          setArrivalPreference(pref.arrivalPreference ?? '');
          if (pref.emergencyContact) {
            setEmergencyName(pref.emergencyContact.name ?? '');
            setEmergencyPhone(pref.emergencyContact.phone ?? '');
            setEmergencyRelation(pref.emergencyContact.relation ?? '');
          }
          setNotes(pref.notes ?? '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const toggleOption = (list: string[], value: string, setter: (v: string[]) => void) => {
    setter(
      list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value],
    );
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      await guestApi.updatePreferences({
        dietaryNeeds,
        wellnessInterests,
        accessibility: accessibility || undefined,
        roomPreference: roomPreference || undefined,
        experienceLevel: experienceLevel || undefined,
        arrivalPreference: arrivalPreference || undefined,
        emergencyContact:
          emergencyName && emergencyPhone
            ? { name: emergencyName, phone: emergencyPhone, relation: emergencyRelation }
            : undefined,
        notes: notes || undefined,
      });
      setToast('Preferences saved!');
      setTimeout(() => setToast(''), 3500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
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
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-8">
        <button onClick={() => router.push('/dashboard')} className="btn-ghost text-sm mb-4">
          ← Back to dashboard
        </button>
        <h1 className="page-title">Wellness Preferences</h1>
        <p className="text-gray-500 text-sm mt-1">
          Help us personalise your retreat experience. Hosts can see these preferences to prepare for your stay.
        </p>
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      {/* Dietary needs */}
      <section className="card p-6 mb-4">
        <h2 className="font-semibold text-gray-900 mb-1">Dietary Needs</h2>
        <p className="text-xs text-gray-400 mb-4">Select all that apply</p>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => toggleOption(dietaryNeeds, opt.value, setDietaryNeeds)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                dietaryNeeds.includes(opt.value)
                  ? 'bg-brand-50 border-brand-300 text-brand-700 font-medium'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Wellness interests */}
      <section className="card p-6 mb-4">
        <h2 className="font-semibold text-gray-900 mb-1">Wellness Interests</h2>
        <p className="text-xs text-gray-400 mb-4">What are you looking for in a retreat?</p>
        <div className="flex flex-wrap gap-2">
          {WELLNESS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => toggleOption(wellnessInterests, opt.value, setWellnessInterests)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                wellnessInterests.includes(opt.value)
                  ? 'bg-brand-50 border-brand-300 text-brand-700 font-medium'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Experience level */}
      <section className="card p-6 mb-4">
        <h2 className="font-semibold text-gray-900 mb-4">Experience Level</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {EXPERIENCE_LEVELS.map((lvl) => (
            <button
              key={lvl.value}
              onClick={() => setExperienceLevel(lvl.value)}
              className={`p-4 rounded-xl border text-left transition-colors ${
                experienceLevel === lvl.value
                  ? 'bg-brand-50 border-brand-300'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className={`font-medium text-sm ${experienceLevel === lvl.value ? 'text-brand-700' : 'text-gray-900'}`}>
                {lvl.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{lvl.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Room preference */}
      <section className="card p-6 mb-4">
        <h2 className="font-semibold text-gray-900 mb-4">Room Preference</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ROOM_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRoomPreference(opt.value)}
              className={`p-3 rounded-xl border text-sm text-center transition-colors ${
                roomPreference === opt.value
                  ? 'bg-brand-50 border-brand-300 text-brand-700 font-medium'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Arrival preference */}
      <section className="card p-6 mb-4">
        <h2 className="font-semibold text-gray-900 mb-4">Preferred Arrival Time</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ARRIVAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setArrivalPreference(opt.value)}
              className={`p-3 rounded-xl border text-sm text-center transition-colors ${
                arrivalPreference === opt.value
                  ? 'bg-brand-50 border-brand-300 text-brand-700 font-medium'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Accessibility */}
      <section className="card p-6 mb-4">
        <h2 className="font-semibold text-gray-900 mb-1">Accessibility Requirements</h2>
        <p className="text-xs text-gray-400 mb-3">Any mobility, dietary, or other needs we should know about</p>
        <textarea
          value={accessibility}
          onChange={(e) => setAccessibility(e.target.value)}
          placeholder="e.g., wheelchair access needed, allergies..."
          rows={2}
          className="input resize-none"
          maxLength={500}
        />
      </section>

      {/* Emergency contact */}
      <section className="card p-6 mb-4">
        <h2 className="font-semibold text-gray-900 mb-1">Emergency Contact</h2>
        <p className="text-xs text-gray-400 mb-4">Optional — recommended for longer retreats</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Full name</label>
            <input
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              className="input"
              placeholder="Name"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Phone</label>
            <input
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              className="input"
              placeholder="+91..."
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Relation</label>
            <input
              value={emergencyRelation}
              onChange={(e) => setEmergencyRelation(e.target.value)}
              className="input"
              placeholder="e.g., Spouse"
            />
          </div>
        </div>
      </section>

      {/* Additional notes */}
      <section className="card p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-1">Additional Notes</h2>
        <p className="text-xs text-gray-400 mb-3">Anything else hosts should know about you</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., I practice Ashtanga yoga daily..."
          rows={3}
          className="input resize-none"
          maxLength={1000}
        />
      </section>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full py-3"
      >
        {saving ? <><span className="spinner" /> Saving...</> : 'Save Preferences'}
      </button>
    </div>
  );
}
