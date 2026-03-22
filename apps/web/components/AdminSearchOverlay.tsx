'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { adminApi } from '../lib/api';
import type { AdminSearchResults } from '../lib/types';

export default function AdminSearchOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setResults(null);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setResults(null);
  }, []);

  // Ctrl+K / Cmd+K to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        open();
      }
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, open, close]);

  // Auto-focus input when overlay opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await adminApi.search(query);
        setResults(data);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Click outside content card to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (
      contentRef.current &&
      !contentRef.current.contains(e.target as Node)
    ) {
      close();
    }
  };

  const hasResults =
    results &&
    (results.users.length > 0 ||
      results.bookings.length > 0 ||
      results.listings.length > 0 ||
      results.hosts.length > 0);

  const roleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-700';
      case 'HOST':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const statusBadgeColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED_PAID':
      case 'CONFIRMED_DEPOSIT':
      case 'APPROVED':
        return 'bg-green-100 text-green-700';
      case 'CANCELLED':
      case 'REJECTED':
        return 'bg-red-100 text-red-700';
      case 'PENDING_APPROVAL':
      case 'PAYMENT_PENDING':
      case 'BALANCE_DUE':
      case 'HOLD':
        return 'bg-yellow-100 text-yellow-700';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const verificationBadgeColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-700';
      case 'REJECTED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  return (
    <>
      <button
        onClick={open}
        className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
        aria-label="Search"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20"
          onClick={handleBackdropClick}
        >
          <div
            ref={contentRef}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[70vh] overflow-hidden flex flex-col"
          >
            <div className="border-b border-gray-200">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users, bookings, listings..."
                className="w-full px-4 py-3 text-lg outline-none placeholder-gray-400"
              />
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              {query.length < 2 && (
                <p className="text-sm text-gray-500 text-center py-8">
                  Type at least 2 characters to search
                </p>
              )}

              {query.length >= 2 && loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                </div>
              )}

              {query.length >= 2 && !loading && results && !hasResults && (
                <p className="text-sm text-gray-500 text-center py-8">
                  No results found for &apos;{query}&apos;
                </p>
              )}

              {query.length >= 2 && !loading && results && hasResults && (
                <div className="space-y-6">
                  {results.users.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Users
                      </h4>
                      <ul className="space-y-1">
                        {results.users.map((user) => (
                          <li key={user.id}>
                            <Link
                              href="/admin/users"
                              onClick={close}
                              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <div>
                                <p className="font-medium text-gray-900 text-sm">
                                  {user.fullName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {user.email}
                                </p>
                              </div>
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBadgeColor(user.role)}`}
                              >
                                {user.role}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {results.bookings.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Bookings
                      </h4>
                      <ul className="space-y-1">
                        {results.bookings.map((booking) => (
                          <li key={booking.id}>
                            <Link
                              href={`/bookings/${booking.id}`}
                              onClick={close}
                              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <div>
                                <p className="font-medium text-gray-900 text-sm">
                                  {booking.id.slice(0, 8)}...
                                </p>
                                <p className="text-xs text-gray-500">
                                  {booking.listingTitle}
                                </p>
                              </div>
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadgeColor(booking.status)}`}
                              >
                                {booking.status.replace(/_/g, ' ')}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {results.listings.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Listings
                      </h4>
                      <ul className="space-y-1">
                        {results.listings.map((listing) => (
                          <li key={listing.id}>
                            <Link
                              href={`/admin/listings/${listing.id}`}
                              onClick={close}
                              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <div>
                                <p className="font-medium text-gray-900 text-sm">
                                  {listing.title}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {listing.city}
                                </p>
                              </div>
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadgeColor(listing.status)}`}
                              >
                                {listing.status.replace(/_/g, ' ')}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {results.hosts.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Hosts
                      </h4>
                      <ul className="space-y-1">
                        {results.hosts.map((host) => (
                          <li key={host.id}>
                            <Link
                              href="/admin/hosts/performance"
                              onClick={close}
                              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <div>
                                <p className="font-medium text-gray-900 text-sm">
                                  {host.fullName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {host.email}
                                </p>
                              </div>
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${verificationBadgeColor(host.verificationStatus)}`}
                              >
                                {host.verificationStatus}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
