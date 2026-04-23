'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import { listingsApi, storageApi, formatDate, formatINR } from '../../../../../lib/api';
import type { AvailabilityBlock, Listing, ListingMedia, SeasonalRate, Tag } from '../../../../../lib/types';
import {
  DIETARY_OPTIONS,
  EXPERIENCE_TAGS,
  PROPERTY_TYPES,
} from '../../../../../lib/types';

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loadingListing, setLoadingListing] = useState(true);
  const [form, setForm] = useState({
    title: '',
    description: '',
    city: '',
    state: '',
    country: '',
    baseNightlyRate: '',
    maxGuests: '',
    minNights: '',
    cleaningFee: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Discovery facets (§5.18)
  const [facetExperience, setFacetExperience] = useState<string[]>([]);
  const [facetPropertyType, setFacetPropertyType] = useState('');
  const [facetDietary, setFacetDietary] = useState<string[]>([]);
  const [savingFacets, setSavingFacets] = useState(false);
  const [facetsSuccess, setFacetsSuccess] = useState('');
  const [facetsError, setFacetsError] = useState('');

  // Media state
  const [media, setMedia] = useState<ListingMedia[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seasonal rates state
  const [seasonalRates, setSeasonalRates] = useState<SeasonalRate[]>([]);
  const [seasonalForm, setSeasonalForm] = useState({ startsAt: '', endsAt: '', nightlyRate: '' });
  const [addingRate, setAddingRate] = useState(false);
  const [rateError, setRateError] = useState('');

  // Availability blocks state
  const [availBlocks, setAvailBlocks] = useState<AvailabilityBlock[]>([]);

  // Tags state
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [savingTags, setSavingTags] = useState(false);
  const [tagsSuccess, setTagsSuccess] = useState('');

  const [blockForm, setBlockForm] = useState({ startsAt: '', endsAt: '', reason: '' });
  const [addingBlock, setAddingBlock] = useState(false);
  const [blockError, setBlockError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'HOST') router.push('/dashboard');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || user.role !== 'HOST') return;
    listingsApi
      .getHostListings()
      .then((listings) => {
        const found = listings.find((l) => l.id === id);
        if (!found) { setError('Listing not found or you do not own it'); return; }
        setListing(found);
        setMedia(found.media ?? []);
        const rr = found.rateRules?.[0];
        setForm({
          title: found.title,
          description: found.description,
          city: found.city,
          state: found.state,
          country: found.country,
          baseNightlyRate: rr ? String(rr.baseNightlyRate / 100) : '',
          maxGuests: rr ? String(rr.maxGuests) : '',
          minNights: rr ? String(rr.minNights) : '',
          cleaningFee: rr ? String(rr.cleaningFee / 100) : '',
        });
        setFacetExperience(found.experienceTags ?? []);
        setFacetPropertyType(found.propertyType ?? '');
        setFacetDietary(found.dietaryOptions ?? []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoadingListing(false));
  }, [id, user]);

  // Load seasonal rates & availability blocks
  useEffect(() => {
    if (!user || user.role !== 'HOST' || !id) return;
    listingsApi.getSeasonalRates(id).then(setSeasonalRates).catch(() => {});
    listingsApi.getAvailabilityBlocks(id).then(setAvailBlocks).catch(() => {});
    // Load all available tags + current listing tags
    Promise.all([
      listingsApi.getAllTags().catch(() => [] as Tag[]),
      listingsApi.getListingTags(id).catch(() => []),
    ]).then(([tags, listingTags]) => {
      setAllTags(tags);
      setSelectedTagIds(listingTags.map((lt) => lt.tagId));
    });
  }, [id, user]);

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await listingsApi.update(id, {
        title: form.title,
        description: form.description,
        city: form.city,
        state: form.state,
        country: form.country || undefined,
        ...(form.baseNightlyRate && { baseNightlyRate: Math.round(Number(form.baseNightlyRate) * 100) }),
        ...(form.maxGuests && { maxGuests: Number(form.maxGuests) }),
        ...(form.minNights && { minNights: Number(form.minNights) }),
        ...(form.cleaningFee !== '' && { cleaningFee: Math.round(Number(form.cleaningFee) * 100) }),
      });
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update listing');
    } finally {
      setSaving(false);
    }
  };

  const toggleFacet = (
    value: string,
    list: string[],
    setter: (v: string[]) => void,
  ) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const handleSaveFacets = async () => {
    setFacetsError('');
    setFacetsSuccess('');
    setSavingFacets(true);
    try {
      await listingsApi.update(id, {
        experienceTags: facetExperience,
        propertyType: facetPropertyType || null,
        dietaryOptions: facetDietary,
      });
      setFacetsSuccess('Discovery facets saved');
      setTimeout(() => setFacetsSuccess(''), 2500);
    } catch (e: unknown) {
      setFacetsError(e instanceof Error ? e.message : 'Failed to save facets');
    } finally {
      setSavingFacets(false);
    }
  };

  // ── Photo upload ──────────────────────────────────────────────────────────

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      // 1. Get presigned PUT URL from API
      const { uploadUrl, publicUrl } = await storageApi.getPresignedUrl(
        `listings/${id}`,
        file.name,
        file.type || 'image/jpeg',
      );

      // 2. PUT file directly to S3/R2
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Upload failed');

      // 3. Save media record to DB
      const newMedia = await listingsApi.addMedia(id, {
        url: publicUrl,
        mediaType: file.type || 'image/jpeg',
        sortOrder: media.length,
      });
      setMedia((prev) => [...prev, newMedia]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!confirm('Remove this photo?')) return;
    try {
      await listingsApi.deleteMedia(id, mediaId);
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete photo');
    }
  };

  // ── Seasonal rates ────────────────────────────────────────────────────────

  const handleAddSeasonalRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setRateError('');
    setAddingRate(true);
    try {
      const rate = await listingsApi.addSeasonalRate(id, {
        startsAt: seasonalForm.startsAt,
        endsAt: seasonalForm.endsAt,
        nightlyRate: Math.round(Number(seasonalForm.nightlyRate) * 100),
      });
      setSeasonalRates((prev) => [...prev, rate]);
      setSeasonalForm({ startsAt: '', endsAt: '', nightlyRate: '' });
    } catch (err) {
      setRateError(err instanceof Error ? err.message : 'Failed to add rate');
    } finally {
      setAddingRate(false);
    }
  };

  const handleDeleteSeasonalRate = async (rateId: string) => {
    if (!confirm('Remove this seasonal rate?')) return;
    try {
      await listingsApi.deleteSeasonalRate(id, rateId);
      setSeasonalRates((prev) => prev.filter((r) => r.id !== rateId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete rate');
    }
  };

  // ── Availability blocks ────────────────────────────────────────────────────

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlockError('');
    setAddingBlock(true);
    try {
      const block = await listingsApi.addAvailabilityBlock(id, {
        startsAt: blockForm.startsAt,
        endsAt: blockForm.endsAt,
        reason: blockForm.reason,
      });
      setAvailBlocks((prev) => [...prev, block]);
      setBlockForm({ startsAt: '', endsAt: '', reason: '' });
    } catch (err) {
      setBlockError(err instanceof Error ? err.message : 'Failed to add block');
    } finally {
      setAddingBlock(false);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('Remove this availability block?')) return;
    try {
      await listingsApi.deleteAvailabilityBlock(id, blockId);
      setAvailBlocks((prev) => prev.filter((b) => b.id !== blockId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete block');
    }
  };

  if (isLoading || loadingListing) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  if (error && !listing) {
    return (
      <div className="container-page py-16 text-center">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Listing not found</h2>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <button onClick={() => router.push('/dashboard')} className="btn-primary">Back to dashboard</button>
      </div>
    );
  }

  if (success) {
    const needsReapproval = ['city', 'state', 'description'].some(
      (f) => form[f as keyof typeof form] !== listing?.[f as keyof Listing],
    );
    return (
      <div className="container-page py-16 max-w-lg mx-auto text-center">
        <div className="card p-10">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Listing updated!</h2>
          {needsReapproval ? (
            <p className="text-amber-700 text-sm mb-6">
              ⚠️ You changed location or description — your listing has been sent for re-approval.
            </p>
          ) : (
            <p className="text-gray-500 text-sm mb-6">Your changes have been saved.</p>
          )}
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push('/dashboard')} className="btn-primary">Back to dashboard</button>
            <button onClick={() => setSuccess(false)} className="btn-secondary">Continue editing</button>
          </div>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="container-page py-10 max-w-2xl mx-auto">
      <div className="mb-8">
        <button onClick={() => router.push('/dashboard')} className="btn-ghost text-sm mb-4">
          ← Back to dashboard
        </button>
        <h1 className="page-title">Edit listing</h1>
        <p className="text-gray-500 text-sm mt-1">Changes to location or description will trigger re-approval.</p>
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      {/* ── Basic info form ── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">Basic information</h2>
          <div>
            <label className="label">Listing title *</label>
            <input type="text" required value={form.title} onChange={set('title')} className="input" maxLength={120} />
          </div>
          <div>
            <label className="label">Description *</label>
            <textarea required value={form.description} onChange={set('description')}
              className="input min-h-[120px] resize-y" rows={4} />
            <p className="text-xs text-amber-600 mt-1">⚠️ Editing description triggers re-approval</p>
          </div>
        </div>

        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">Location</h2>
          <p className="text-xs text-amber-600">⚠️ Editing city, state or country triggers re-approval</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">City *</label>
              <input type="text" required value={form.city} onChange={set('city')} className="input" />
            </div>
            <div>
              <label className="label">State *</label>
              <input type="text" required value={form.state} onChange={set('state')} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Country</label>
            <input type="text" value={form.country} onChange={set('country')} placeholder="India" className="input" />
          </div>
        </div>

        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">Pricing & capacity</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nightly rate (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                <input type="number" min={1} value={form.baseNightlyRate} onChange={set('baseNightlyRate')}
                  className="input pl-7" placeholder="5000" />
              </div>
            </div>
            <div>
              <label className="label">Max guests</label>
              <input type="number" min={1} max={50} value={form.maxGuests} onChange={set('maxGuests')}
                className="input" placeholder="4" />
            </div>
            <div>
              <label className="label">Min nights</label>
              <input type="number" min={1} value={form.minNights} onChange={set('minNights')}
                className="input" placeholder="1" />
            </div>
            <div>
              <label className="label">Cleaning fee (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                <input type="number" min={0} value={form.cleaningFee} onChange={set('cleaningFee')}
                  className="input pl-7" placeholder="0" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary flex-1 py-3">
            {saving ? <><span className="spinner" /> Saving…</> : 'Save changes'}
          </button>
          <button type="button" onClick={() => router.push('/dashboard')} className="btn-secondary px-6">
            Cancel
          </button>
        </div>
      </form>

      {/* ── Discovery facets (§5.18) ── */}
      <div className="card p-6 mt-8 space-y-5">
        <div>
          <h2 className="font-semibold text-gray-900">Discovery facets</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Help guests find your retreat through filters on the discovery feed.
          </p>
        </div>

        <div>
          <label className="label text-xs">Experience</label>
          <div className="flex flex-wrap gap-2">
            {EXPERIENCE_TAGS.map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => toggleFacet(tag, facetExperience, setFacetExperience)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  facetExperience.includes(tag)
                    ? 'bg-brand-700 text-white border-brand-700'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400 hover:text-brand-700'
                }`}
              >
                {tag.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label text-xs">Property type</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFacetPropertyType('')}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                !facetPropertyType
                  ? 'bg-brand-700 text-white border-brand-700'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400 hover:text-brand-700'
              }`}
            >
              Unspecified
            </button>
            {PROPERTY_TYPES.map((pt) => (
              <button
                type="button"
                key={pt}
                onClick={() => setFacetPropertyType(pt)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  facetPropertyType === pt
                    ? 'bg-brand-700 text-white border-brand-700'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400 hover:text-brand-700'
                }`}
              >
                {pt.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label text-xs">Dietary options</label>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => toggleFacet(option, facetDietary, setFacetDietary)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  facetDietary.includes(option)
                    ? 'bg-brand-700 text-white border-brand-700'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400 hover:text-brand-700'
                }`}
              >
                {option.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </button>
            ))}
          </div>
        </div>

        {facetsError && <p className="text-sm text-red-600">{facetsError}</p>}
        {facetsSuccess && <p className="text-sm text-green-600">{facetsSuccess}</p>}

        <div>
          <button
            type="button"
            onClick={handleSaveFacets}
            disabled={savingFacets}
            className="btn-primary text-sm py-2 px-5"
          >
            {savingFacets ? <><span className="spinner" /> Saving…</> : 'Save facets'}
          </button>
        </div>
      </div>

      {/* ── Preparation guide link ── */}
      <div className="card p-6 mt-8 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Retreat preparation guide</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Help guests prepare — packing list, schedule, dietary info, arrival instructions.
          </p>
        </div>
        <button
          onClick={() => router.push(`/host/listings/${id}/preparation`)}
          className="btn-secondary text-sm py-1.5 px-4 whitespace-nowrap"
        >
          Edit guide →
        </button>
      </div>

      {/* ── Photo gallery ── */}
      <div className="card p-6 mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Photos</h2>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="btn-secondary text-sm py-1.5 px-4"
          >
            {uploadingPhoto ? <><span className="spinner" /> Uploading…</> : '+ Add photo'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </div>

        {media.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            No photos yet. Add photos to make your listing more attractive.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {media.map((m, i) => (
              <div key={m.id} className="relative group rounded-xl overflow-hidden h-28 bg-gray-100">
                <img src={m.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => handleDeleteMedia(m.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs
                             opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  ×
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 bg-brand-700 text-white text-xs px-1.5 py-0.5 rounded">
                    Cover
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Seasonal rates ── */}
      <div className="card p-6 mt-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Seasonal pricing</h2>
        <p className="text-xs text-gray-500">Override the base nightly rate for specific date ranges (e.g. holidays, peak season).</p>

        {seasonalRates.length > 0 && (
          <div className="space-y-2">
            {seasonalRates.map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <div>
                  <span className="font-medium text-brand-700">{formatINR(r.nightlyRate)}/night</span>
                  <span className="text-gray-500 ml-2">{formatDate(r.startsAt)} – {formatDate(r.endsAt)}</span>
                </div>
                <button onClick={() => handleDeleteSeasonalRate(r.id)}
                  className="text-red-400 hover:text-red-600 text-xs">Remove</button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddSeasonalRate} className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="label text-xs">From</label>
            <input type="date" min={today} required value={seasonalForm.startsAt}
              onChange={(e) => setSeasonalForm((p) => ({ ...p, startsAt: e.target.value }))}
              className="input text-sm" />
          </div>
          <div>
            <label className="label text-xs">To</label>
            <input type="date" min={seasonalForm.startsAt || today} required value={seasonalForm.endsAt}
              onChange={(e) => setSeasonalForm((p) => ({ ...p, endsAt: e.target.value }))}
              className="input text-sm" />
          </div>
          <div>
            <label className="label text-xs">Rate (₹/night)</label>
            <div className="flex gap-2">
              <input type="number" min={1} required value={seasonalForm.nightlyRate}
                onChange={(e) => setSeasonalForm((p) => ({ ...p, nightlyRate: e.target.value }))}
                className="input text-sm" placeholder="5000" />
              <button type="submit" disabled={addingRate} className="btn-primary px-3 py-2 text-sm whitespace-nowrap">
                {addingRate ? '…' : 'Add'}
              </button>
            </div>
          </div>
        </form>
        {rateError && <p className="text-xs text-red-600">{rateError}</p>}
      </div>

      {/* ── Availability blocks ── */}
      <div className="card p-6 mt-6 mb-10 space-y-4">
        <h2 className="font-semibold text-gray-900">Blocked dates</h2>
        <p className="text-xs text-gray-500">Block specific periods so guests cannot book (maintenance, personal use, etc.).</p>

        {availBlocks.length > 0 && (
          <div className="space-y-2">
            {availBlocks.map((b) => (
              <div key={b.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <div>
                  <span className="font-medium text-gray-800">{formatDate(b.startsAt)} – {formatDate(b.endsAt)}</span>
                  <span className="text-gray-500 ml-2">· {b.reason}</span>
                </div>
                <button onClick={() => handleDeleteBlock(b.id)}
                  className="text-red-400 hover:text-red-600 text-xs">Remove</button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddBlock} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Block from</label>
              <input type="date" min={today} required value={blockForm.startsAt}
                onChange={(e) => setBlockForm((p) => ({ ...p, startsAt: e.target.value }))}
                className="input text-sm" />
            </div>
            <div>
              <label className="label text-xs">Block until</label>
              <input type="date" min={blockForm.startsAt || today} required value={blockForm.endsAt}
                onChange={(e) => setBlockForm((p) => ({ ...p, endsAt: e.target.value }))}
                className="input text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <input type="text" required value={blockForm.reason}
              onChange={(e) => setBlockForm((p) => ({ ...p, reason: e.target.value }))}
              placeholder="Reason (e.g. Maintenance, Personal stay)"
              className="input text-sm flex-1" maxLength={200} />
            <button type="submit" disabled={addingBlock} className="btn-primary px-4 text-sm whitespace-nowrap">
              {addingBlock ? '…' : 'Block dates'}
            </button>
          </div>
        </form>
        {blockError && <p className="text-xs text-red-600">{blockError}</p>}
      </div>

      {/* ── Tags / Amenities ── */}
      {allTags.length > 0 && (
        <div className="card p-6 mt-6 mb-10 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900">Amenities &amp; Features</h2>
            <p className="text-xs text-gray-500 mt-0.5">Tag your listing so guests can find it with filters.</p>
          </div>

          {(() => {
            const byCategory: Record<string, Tag[]> = {};
            allTags.forEach((t) => {
              if (!byCategory[t.category]) byCategory[t.category] = [];
              byCategory[t.category].push(t);
            });
            return (
              <div className="space-y-3">
                {Object.entries(byCategory).map(([category, tags]) => (
                  <div key={category}>
                    <p className="text-xs text-gray-400 capitalize mb-1.5">{category}</p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() =>
                            setSelectedTagIds((prev) =>
                              prev.includes(tag.id)
                                ? prev.filter((t) => t !== tag.id)
                                : [...prev, tag.id],
                            )
                          }
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            selectedTagIds.includes(tag.id)
                              ? 'bg-brand-700 text-white border-brand-700'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400 hover:text-brand-700'
                          }`}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {tagsSuccess && <p className="text-xs text-green-600">{tagsSuccess}</p>}
          <button
            type="button"
            disabled={savingTags}
            onClick={async () => {
              setSavingTags(true);
              setTagsSuccess('');
              try {
                await listingsApi.setListingTags(id, selectedTagIds);
                setTagsSuccess('Amenities saved.');
                setTimeout(() => setTagsSuccess(''), 3000);
              } catch {
                // silently ignore
              } finally {
                setSavingTags(false);
              }
            }}
            className="btn-secondary text-sm py-1.5 px-4"
          >
            {savingTags ? <><span className="spinner" /> Saving…</> : 'Save amenities'}
          </button>
        </div>
      )}
    </div>
  );
}
