'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { hostApi } from '../../../lib/api';
import type { HostApplication, HostIdDocumentType } from '../../../lib/types';

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][Z][0-9A-Z]$/;
const PIN_RE = /^[1-9][0-9]{5}$/;

const ID_LABEL: Record<HostIdDocumentType, string> = {
  PASSPORT: 'Passport',
  DRIVING_LICENCE: 'Driving licence',
  VOTER_ID: 'Voter ID',
};

const STATUS_STYLE: Record<string, string> = {
  APPROVED: 'border-green-200 bg-green-50 text-green-800',
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
  REJECTED: 'border-red-200 bg-red-50 text-red-800',
};

/**
 * The host application. A complete profile is required before a listing can be
 * submitted, so this is the first thing a new host fills in. Identity numbers
 * are encrypted server-side and only ever shown back as the last 4 digits.
 */
export default function HostApplicationPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<HostApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(false);

  const [legalName, setLegalName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [about, setAbout] = useState('');
  const [website, setWebsite] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [pan, setPan] = useState('');
  const [gstin, setGstin] = useState('');
  const [idType, setIdType] = useState<HostIdDocumentType>('PASSPORT');
  const [idNumber, setIdNumber] = useState('');
  const [idDocumentUrl, setIdDocumentUrl] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hostApi.getApplication();
      setData(res);
      setEditing(!res.profile);
      if (res.profile) {
        const p = res.profile;
        setLegalName(p.legalName);
        setBusinessName(p.businessName ?? '');
        setAbout(p.about ?? '');
        setWebsite(p.website ?? '');
        setAddressLine1(p.addressLine1);
        setAddressLine2(p.addressLine2 ?? '');
        setCity(p.city);
        setState(p.state);
        setPostalCode(p.postalCode);
        setGstin(p.gstin ?? '');
        if (p.idType) setIdType(p.idType);
        setIdDocumentUrl(p.idDocumentUrl ?? '');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your application');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Mirrors the server's validation so mistakes surface before submitting.
  const problems: string[] = [];
  if (editing) {
    if (legalName.trim().length < 2) problems.push('Enter your full legal name.');
    if (addressLine1.trim().length < 3) problems.push('Enter your street address.');
    if (city.trim().length < 2) problems.push('Enter your city.');
    if (state.trim().length < 2) problems.push('Enter your state.');
    if (!PIN_RE.test(postalCode)) problems.push('PIN code must be 6 digits.');
    if (!PAN_RE.test(pan.toUpperCase())) problems.push('PAN must look like ABCDE1234F.');
    if (idNumber.trim().length < 4) problems.push('Enter your photo ID number.');
    if (gstin && !GSTIN_RE.test(gstin.toUpperCase())) {
      problems.push('GSTIN must be 15 characters, or leave it blank.');
    }
  }

  const submit = async () => {
    if (problems.length > 0) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await hostApi.submitApplication({
        legalName: legalName.trim(),
        businessName: businessName.trim() || undefined,
        about: about.trim() || undefined,
        website: website.trim() || undefined,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        pan: pan.toUpperCase(),
        gstin: gstin.trim() ? gstin.toUpperCase() : undefined,
        idType,
        idNumber: idNumber.trim().toUpperCase(),
        idDocumentUrl: idDocumentUrl.trim() || undefined,
      });
      setPan('');
      setIdNumber('');
      setEditing(false);
      setNotice('Submitted for verification. We’ll review it shortly.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit your application');
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

  const p = data?.profile;

  return (
    <div className="container-page py-8 max-w-2xl">
      <Link href="/host/listings" className="text-sm text-muted hover:text-brand-700">
        ← Listings
      </Link>
      <h1 className="page-title mt-2">Host application</h1>
      <p className="text-sm text-muted mt-1 mb-6">
        We verify every host before their property goes live. Your PAN and ID number are
        encrypted — we only ever display the last 4 digits.
      </p>

      {error && <div className="alert-error mb-4">{error}</div>}
      {notice && <div className="alert-success mb-4">{notice}</div>}

      {data && (
        <div className={`card p-4 mb-4 border ${STATUS_STYLE[data.verificationStatus] ?? ''}`}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="font-semibold">
                {data.verificationStatus === 'APPROVED'
                  ? 'Verified — you can publish listings'
                  : data.verificationStatus === 'REJECTED'
                    ? 'Not approved — please update and resubmit'
                    : p
                      ? 'Awaiting verification'
                      : 'Application not started'}
              </p>
              {data.rejectionReason && (
                <p className="text-sm mt-1 font-medium">Reason: {data.rejectionReason}</p>
              )}
              {!data.complete && (
                <p className="text-sm mt-1">
                  You can’t submit a listing for approval until this is complete.
                </p>
              )}
            </div>
            {p && !editing && (
              <button className="btn-secondary text-sm" onClick={() => setEditing(true)}>
                Update details
              </button>
            )}
          </div>
        </div>
      )}

      {/* Saved summary */}
      {p && !editing && (
        <div className="card p-5 mb-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Legal name</dt>
              <dd className="font-medium">{p.legalName}</dd>
            </div>
            {p.businessName && (
              <div>
                <dt className="text-xs text-muted">Business name</dt>
                <dd className="font-medium">{p.businessName}</dd>
              </div>
            )}
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted">Address</dt>
              <dd>
                {p.addressLine1}
                {p.addressLine2 ? `, ${p.addressLine2}` : ''}, {p.city}, {p.state}{' '}
                {p.postalCode}, {p.country}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">PAN</dt>
              <dd>••••{p.panLast4}</dd>
            </div>
            {p.gstin && (
              <div>
                <dt className="text-xs text-muted">GSTIN</dt>
                <dd>{p.gstin}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-muted">Photo ID</dt>
              <dd>
                {p.idType ? ID_LABEL[p.idType] : '—'} ••••{p.idLast4}
                {p.idDocumentUrl && (
                  <>
                    {' · '}
                    <a
                      href={p.idDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-700 hover:underline"
                    >
                      document
                    </a>
                  </>
                )}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {editing && (
        <div className="card p-6">
          {p && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              Updating these details returns your account to “awaiting verification”.
            </p>
          )}

          <h2 className="font-semibold mb-3">Who you are</h2>
          <div className="space-y-3">
            <div>
              <label className="label" htmlFor="legalName">Full legal name</label>
              <input id="legalName" className="input" value={legalName}
                onChange={(e) => setLegalName(e.target.value)} maxLength={120}
                placeholder="As printed on your PAN" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="businessName">Business name (optional)</label>
                <input id="businessName" className="input" value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)} maxLength={120} />
              </div>
              <div>
                <label className="label" htmlFor="website">Website (optional)</label>
                <input id="website" className="input" value={website}
                  onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="about">About you (optional)</label>
              <textarea id="about" className="input min-h-[80px]" value={about}
                onChange={(e) => setAbout(e.target.value)} maxLength={1000}
                placeholder="Tell us about your property and hosting experience." />
            </div>
          </div>

          <h2 className="font-semibold mt-6 mb-3">Address</h2>
          <div className="space-y-3">
            <div>
              <label className="label" htmlFor="addr1">Address line 1</label>
              <input id="addr1" className="input" value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)} maxLength={200} />
            </div>
            <div>
              <label className="label" htmlFor="addr2">Address line 2 (optional)</label>
              <input id="addr2" className="input" value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)} maxLength={200} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label" htmlFor="city">City</label>
                <input id="city" className="input" value={city}
                  onChange={(e) => setCity(e.target.value)} maxLength={100} />
              </div>
              <div>
                <label className="label" htmlFor="state">State</label>
                <input id="state" className="input" value={state}
                  onChange={(e) => setState(e.target.value)} maxLength={100} />
              </div>
              <div>
                <label className="label" htmlFor="pin">PIN code</label>
                <input id="pin" className="input" inputMode="numeric" value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))}
                  maxLength={6} placeholder="560001" />
              </div>
            </div>
          </div>

          <h2 className="font-semibold mt-6 mb-3">Tax &amp; identity</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="pan">PAN</label>
                <input id="pan" className="input uppercase" value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  maxLength={10} placeholder="ABCDE1234F" />
                {p?.panLast4 && !pan && (
                  <p className="text-xs text-muted mt-1">Currently ••••{p.panLast4} — re-enter to confirm.</p>
                )}
              </div>
              <div>
                <label className="label" htmlFor="gstin">GSTIN (optional)</label>
                <input id="gstin" className="input uppercase" value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  maxLength={15} placeholder="29ABCDE1234F1Z5" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="idType">Photo ID type</label>
                <select id="idType" className="input" value={idType}
                  onChange={(e) => setIdType(e.target.value as HostIdDocumentType)}>
                  {(Object.keys(ID_LABEL) as HostIdDocumentType[]).map((t) => (
                    <option key={t} value={t}>{ID_LABEL[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="idNumber">ID number</label>
                <input id="idNumber" className="input uppercase" value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value.toUpperCase())} maxLength={24} />
                {p?.idLast4 && !idNumber && (
                  <p className="text-xs text-muted mt-1">Currently ••••{p.idLast4} — re-enter to confirm.</p>
                )}
              </div>
            </div>
            <div>
              <label className="label" htmlFor="idDoc">ID document link (optional)</label>
              <input id="idDoc" className="input" value={idDocumentUrl}
                onChange={(e) => setIdDocumentUrl(e.target.value)}
                placeholder="Paste the uploaded document URL" />
            </div>
          </div>

          {problems.length > 0 && (
            <ul className="mt-4 space-y-1 text-xs text-red-600">
              {problems.map((x) => <li key={x}>• {x}</li>)}
            </ul>
          )}

          <div className="mt-6 flex justify-end gap-2">
            {p && (
              <button className="btn-ghost" disabled={saving} onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
            <button className="btn-primary" disabled={saving || problems.length > 0} onClick={submit}>
              {saving ? 'Submitting…' : 'Submit for verification'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
