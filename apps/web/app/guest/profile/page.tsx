'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { formatDate, guestApi } from '../../../lib/api';
import type { GuestProfile } from '../../../lib/types';

export default function GuestProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<GuestProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    guestApi.getProfile()
      .then((p) => {
        setProfile(p);
        setFullName(p.fullName);
        setPhone(p.phone ?? '');
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSave = async () => {
    if (!fullName.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const updated = await guestApi.updateProfile({
        fullName: fullName.trim(),
        ...(phone.trim() && { phone: phone.trim() }),
      });
      setProfile((prev) => prev ? { ...prev, ...updated } : prev);
      setEditing(false);
      showToast('Profile updated');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update');
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

  if (!profile) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-gray-500">{error || 'Profile not found'}</p>
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

      <h1 className="page-title mb-8">My Profile</h1>

      {/* Avatar + name header */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-2xl font-bold text-brand-700">
            {profile.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{profile.fullName}</h2>
            <p className="text-sm text-gray-500">{profile.email}</p>
            <p className="text-xs text-gray-400 mt-0.5">Member since {formatDate(profile.createdAt)}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-xl font-bold text-brand-700">{profile._count.bookings}</p>
            <p className="text-xs text-gray-500">Bookings</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-xl font-bold text-amber-600">{profile._count.reviews}</p>
            <p className="text-xs text-gray-500">Reviews</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-xl font-bold text-red-500">{profile._count.wishlists}</p>
            <p className="text-xs text-gray-500">Wishlist</p>
          </div>
        </div>

        {/* Edit form */}
        {editing ? (
          <div className="space-y-4 border-t border-gray-100 pt-6">
            <div>
              <label className="label">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="input"
              />
            </div>
            {error && <div className="alert-error text-sm">{error}</div>}
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button onClick={() => { setEditing(false); setFullName(profile.fullName); setPhone(profile.phone ?? ''); }} className="btn-ghost text-sm">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-gray-100 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400">Full name</p>
                <p className="font-medium text-gray-900">{profile.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="font-medium text-gray-900">{profile.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Phone</p>
                <p className="font-medium text-gray-900">{profile.phone || 'Not set'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Role</p>
                <p className="font-medium text-gray-900 capitalize">{profile.role.toLowerCase()}</p>
              </div>
            </div>
            <button onClick={() => setEditing(true)} className="btn-secondary text-sm mt-6">
              Edit profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
