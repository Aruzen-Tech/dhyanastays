'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { payoutsApi } from '../../../../lib/api';
import type {
  PayoutAccount,
  PayoutMethod,
  PayoutReadiness,
} from '../../../../lib/types';

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const ACCOUNT_RE = /^[0-9]{6,18}$/;
const VPA_RE = /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z]{2,32}$/;

const STATUS_STYLE: Record<string, string> = {
  VERIFIED: 'bg-green-50 text-green-700 border-green-200',
  SUBMITTED: 'bg-amber-50 text-amber-700 border-amber-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
};

/**
 * Host payout account + KYC. We must verify a host's identity and destination
 * before settling money to them, so this is the gate that unlocks payouts.
 * Full account numbers are never shown back — only the last four digits.
 */
export default function HostPayoutAccountPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [account, setAccount] = useState<PayoutAccount | null>(null);
  const [readiness, setReadiness] = useState<PayoutReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [method, setMethod] = useState<PayoutMethod>('BANK_ACCOUNT');
  const [legalName, setLegalName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccount, setConfirmAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [upiVpa, setUpiVpa] = useState('');
  const [pan, setPan] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payoutsApi.getMyAccount();
      setAccount(res.account);
      setReadiness(res.readiness);
      setEditing(!res.account);
      if (res.account) {
        setMethod(res.account.method);
        setLegalName(res.account.legalName);
        setBankName(res.account.bankName ?? '');
        setIfsc(res.account.ifsc ?? '');
        setUpiVpa(res.account.upiVpa ?? '');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your payout account');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Client-side mirror of the API's validation, so mistakes surface immediately.
  const problems: string[] = [];
  if (editing) {
    if (legalName.trim().length < 2) problems.push('Enter the account holder’s legal name.');
    if (!PAN_RE.test(pan.toUpperCase())) problems.push('PAN must look like ABCDE1234F.');
    if (method === 'BANK_ACCOUNT') {
      if (!ACCOUNT_RE.test(accountNumber)) problems.push('Account number must be 6–18 digits.');
      else if (accountNumber !== confirmAccount) problems.push('Account numbers do not match.');
      if (!IFSC_RE.test(ifsc.toUpperCase())) problems.push('IFSC must look like HDFC0001234.');
    } else if (!VPA_RE.test(upiVpa)) {
      problems.push('UPI ID must look like name@bank.');
    }
  }

  const submit = async () => {
    if (problems.length > 0) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const res = await payoutsApi.submitAccount({
        method,
        legalName: legalName.trim(),
        pan: pan.toUpperCase(),
        ...(method === 'BANK_ACCOUNT'
          ? { accountNumber, ifsc: ifsc.toUpperCase(), bankName: bankName.trim() || undefined }
          : { upiVpa }),
      });
      setAccountNumber('');
      setConfirmAccount('');
      setPan('');
      setEditing(false);
      setNotice(
        res.linesHeld > 0
          ? `Submitted for verification. ${res.linesHeld} pending payout${res.linesHeld === 1 ? '' : 's'} will be released once approved.`
          : 'Submitted for verification. Payouts unlock once our team approves it.',
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your payout account');
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
    <div className="container-page py-8 max-w-2xl">
      <Link href="/host/payouts" className="text-sm text-muted hover:text-brand-700">
        ← Payouts
      </Link>
      <h1 className="page-title mt-2">Payout account</h1>
      <p className="text-sm text-muted mt-1 mb-6">
        We’re required to verify your identity and payout destination before sending you money.
        Your account number and PAN are encrypted — we only ever display the last 4 digits.
      </p>

      {error && <div className="alert-error mb-4">{error}</div>}
      {notice && <div className="alert-success mb-4">{notice}</div>}

      {/* Current status */}
      {account && (
        <div className={`card p-4 mb-4 border ${STATUS_STYLE[account.status] ?? ''}`}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-semibold">
                {account.status === 'VERIFIED'
                  ? 'Verified — payouts are unlocked'
                  : account.status === 'SUBMITTED'
                    ? 'Awaiting verification'
                    : 'Rejected — please resubmit'}
              </p>
              <p className="text-sm mt-0.5">
                {account.method === 'BANK_ACCOUNT'
                  ? `${account.bankName ? `${account.bankName} · ` : ''}A/C ••••${account.accountLast4} · ${account.ifsc}`
                  : account.upiVpa}
                {account.panLast4 ? ` · PAN ••••${account.panLast4}` : ''}
              </p>
              {account.rejectionReason && (
                <p className="text-sm mt-1 font-medium">Reason: {account.rejectionReason}</p>
              )}
            </div>
            {!editing && (
              <button className="btn-secondary text-sm" onClick={() => setEditing(true)}>
                Change details
              </button>
            )}
          </div>
        </div>
      )}

      {/* Why payouts are blocked */}
      {readiness && !readiness.ready && (
        <div className="card p-4 mb-4 bg-amber-50 border border-amber-200">
          <p className="text-sm font-semibold text-amber-800">Payouts are on hold</p>
          <p className="text-sm text-amber-700 mt-0.5">{readiness.summary}</p>
        </div>
      )}

      {/* Form */}
      {editing && (
        <div className="card p-6">
          {account && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              Changing these details returns your account to “awaiting verification”, and any
              pending payouts are held until it’s approved again.
            </p>
          )}

          <div className="flex gap-4 mb-4 text-sm">
            {(['BANK_ACCOUNT', 'UPI'] as PayoutMethod[]).map((m) => (
              <label key={m} className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  checked={method === m}
                  onChange={() => setMethod(m)}
                />
                {m === 'BANK_ACCOUNT' ? 'Bank account' : 'UPI'}
              </label>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="label">Account holder’s legal name</label>
              <input
                className="input"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="As printed on your PAN / bank records"
                maxLength={120}
              />
            </div>

            {method === 'BANK_ACCOUNT' ? (
              <>
                <div>
                  <label className="label">Account number</label>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\s/g, ''))}
                    placeholder="6–18 digits"
                  />
                </div>
                <div>
                  <label className="label">Confirm account number</label>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={confirmAccount}
                    onChange={(e) => setConfirmAccount(e.target.value.replace(/\s/g, ''))}
                    placeholder="Re-enter to avoid typos"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">IFSC</label>
                    <input
                      className="input uppercase"
                      value={ifsc}
                      onChange={(e) => setIfsc(e.target.value.toUpperCase().replace(/\s/g, ''))}
                      placeholder="HDFC0001234"
                      maxLength={11}
                    />
                  </div>
                  <div>
                    <label className="label">Bank name (optional)</label>
                    <input
                      className="input"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      maxLength={120}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="label">UPI ID</label>
                <input
                  className="input"
                  value={upiVpa}
                  onChange={(e) => setUpiVpa(e.target.value.replace(/\s/g, ''))}
                  placeholder="name@bank"
                />
              </div>
            )}

            <div>
              <label className="label">PAN</label>
              <input
                className="input uppercase"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase().replace(/\s/g, ''))}
                placeholder="ABCDE1234F"
                maxLength={10}
              />
              <p className="text-xs text-muted mt-1">
                Required for tax reporting on your earnings.
              </p>
            </div>
          </div>

          {problems.length > 0 && (
            <ul className="mt-4 space-y-1 text-xs text-red-600">
              {problems.map((p) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex justify-end gap-2">
            {account && (
              <button className="btn-ghost" disabled={saving} onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
            <button
              className="btn-primary"
              disabled={saving || problems.length > 0}
              onClick={submit}
            >
              {saving ? 'Submitting…' : 'Submit for verification'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
