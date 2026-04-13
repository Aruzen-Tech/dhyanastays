'use client';

import Link from 'next/link';
import { useState } from 'react';
import { adminApi } from '../../../lib/api';
import { ADMIN_LEVEL_LABELS } from '../../../lib/types';
import type { AdminLevel } from '../../../lib/types';

const LEVEL_OPTIONS: AdminLevel[] = ['L1', 'L2', 'L3', 'L4', 'L5'];

const SERVICE_OPTIONS = [
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'FOOD', label: 'Food & Dining' },
  { value: 'WELLNESS', label: 'Wellness' },
  { value: 'EXPERIENCE', label: 'Experience' },
  { value: 'CONCIERGE', label: 'Concierge' },
  { value: 'HOUSEKEEPING', label: 'Housekeeping' },
];

type Step = 'form' | 'submitted';

export default function AdminRegisterPage() {
  const [step, setStep] = useState<Step>('form');

  // Form fields
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [requestedLevel, setRequestedLevel] = useState<AdminLevel>('L2');
  const [requestedService, setRequestedService] = useState('');
  const [clusterId, setClusterId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [justification, setJustification] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const showServiceField = requestedLevel === 'L5';
  const showClusterField = requestedLevel === 'L3';
  const showPropertyField = requestedLevel === 'L4';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (justification.trim().length < 20) {
      setError('Please provide a justification of at least 20 characters.');
      return;
    }

    setLoading(true);
    try {
      await adminApi.applyForStaff({
        email: email.trim(),
        fullName: fullName.trim(),
        requestedLevel,
        requestedService: showServiceField && requestedService ? requestedService : undefined,
        clusterId: showClusterField && clusterId.trim() ? clusterId.trim() : undefined,
        propertyId: showPropertyField && propertyId.trim() ? propertyId.trim() : undefined,
        justification: justification.trim(),
      });
      setStep('submitted');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'submitted') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted</h1>
            <p className="text-gray-500 text-sm mb-6">
              Your application has been received and is pending review by the Super Admin.
              You will be notified at <strong>{email}</strong> once a decision is made.
            </p>
            <Link href="/auth/login" className="btn-primary inline-block px-8 py-3">
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="card p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🛡️</div>
            <h1 className="text-2xl font-bold text-gray-900">Staff Role Application</h1>
            <p className="text-gray-500 text-sm mt-1">
              Apply for an administrative role on the Dhyana Stays platform.
              Your application will be reviewed by a Super Admin.
            </p>
          </div>

          {error && (
            <div className="alert-error mb-5 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Personal details */}
            <div>
              <label htmlFor="fullName" className="label">Full name</label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full legal name"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="email" className="label">Email address</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input"
              />
            </div>

            {/* Role level selector */}
            <div>
              <label className="label">Requested role level</label>
              <div className="space-y-2">
                {LEVEL_OPTIONS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      setRequestedLevel(lvl);
                      setRequestedService('');
                      setClusterId('');
                      setPropertyId('');
                    }}
                    className={`w-full flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                      requestedLevel === lvl
                        ? 'border-brand-700 bg-brand-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold flex-shrink-0 mt-0.5 ${
                        requestedLevel === lvl
                          ? 'bg-brand-700 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {lvl}
                    </span>
                    <div>
                      <div className="font-semibold text-sm text-gray-900">
                        {ADMIN_LEVEL_LABELS[lvl]}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {lvl === 'L1' && 'Full platform access — only existing L1 admins may approve this'}
                        {lvl === 'L2' && 'Platform operations, listings, and bookings management'}
                        {lvl === 'L3' && 'Manage a specific cluster or regional grouping'}
                        {lvl === 'L4' && 'Manage a specific property'}
                        {lvl === 'L5' && 'Manage a specific service area'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional: service type for L5 */}
            {showServiceField && (
              <div>
                <label htmlFor="serviceType" className="label">Service area</label>
                <select
                  id="serviceType"
                  value={requestedService}
                  onChange={(e) => setRequestedService(e.target.value)}
                  required
                  className="input"
                >
                  <option value="">Select a service…</option>
                  {SERVICE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Conditional: cluster for L3 */}
            {showClusterField && (
              <div>
                <label htmlFor="clusterId" className="label">
                  Cluster / Region ID
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <input
                  id="clusterId"
                  type="text"
                  value={clusterId}
                  onChange={(e) => setClusterId(e.target.value)}
                  placeholder="e.g. cluster_north_goa"
                  className="input font-mono text-sm"
                />
              </div>
            )}

            {/* Conditional: property for L4 */}
            {showPropertyField && (
              <div>
                <label htmlFor="propertyId" className="label">
                  Property ID
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <input
                  id="propertyId"
                  type="text"
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  placeholder="e.g. listing_abc123"
                  className="input font-mono text-sm"
                />
              </div>
            )}

            {/* Justification */}
            <div>
              <label htmlFor="justification" className="label">
                Why are you applying for this role?
              </label>
              <textarea
                id="justification"
                rows={5}
                required
                minLength={20}
                maxLength={2000}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Describe your background, relevant experience, and why you should be granted this role..."
                className="input resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                {justification.length}/2000 characters · minimum 20
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-brand-700 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
