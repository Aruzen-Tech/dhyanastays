'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { payLaterApi, formatINR } from '../../../../lib/api';
import type { PayLaterPlan, PayLaterInstalment } from '../../../../lib/types';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function planStatusBadge(status: PayLaterPlan['status']) {
  const map: Record<PayLaterPlan['status'], string> = {
    SCHEDULED: 'bg-green-100 text-green-800',
    OVERDUE: 'bg-amber-100 text-amber-800',
    DEFAULTED: 'bg-red-100 text-red-800',
    COMPLETED: 'bg-gray-100 text-gray-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
  };
  return `inline-block rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`;
}

function instalmentStatus(inst: PayLaterInstalment): {
  label: string;
  tone: 'paid' | 'overdue' | 'due' | 'upcoming';
} {
  if (inst.paidAt) return { label: 'Paid', tone: 'paid' };
  const due = new Date(inst.dueAt).getTime();
  const now = Date.now();
  if (due < now) return { label: 'Overdue', tone: 'overdue' };
  if (due - now < 72 * 60 * 60 * 1000) return { label: 'Due soon', tone: 'due' };
  return { label: 'Upcoming', tone: 'upcoming' };
}

export default function PayLaterPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [plan, setPlan] = useState<PayLaterPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingSeq, setPayingSeq] = useState<number | null>(null);
  const [payError, setPayError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  const reload = () => {
    payLaterApi
      .getPlan(id)
      .then(setPlan)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const handlePay = async (seq: number) => {
    setPayError('');
    setPayingSeq(seq);
    try {
      const result = await payLaterApi.payInstalment(id, seq, generateUUID());
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      document.body.appendChild(script);
      await new Promise<void>((resolve) => { script.onload = () => resolve(); });
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: result.keyId,
          amount: result.amount * 100,
          currency: result.currency,
          order_id: result.razorpayOrderId,
          name: 'Dhyana Stays',
          description: `Pay Later instalment ${seq}`,
          theme: { color: '#1a5c4a' },
          handler: () => resolve(),
          modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
        });
        rzp.open();
      });
      setTimeout(reload, 1500);
    } catch (e: unknown) {
      setPayError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setPayingSeq(null);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="container-page py-16 text-center">
        <div className="text-5xl mb-4">📅</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">No Pay Later plan</h2>
        <p className="text-gray-400 text-sm mb-6">{error || 'This booking does not use Pay Later.'}</p>
        <Link href={`/bookings/${id}`} className="btn-primary">Back to booking</Link>
      </div>
    );
  }

  const paidCount = plan.instalments.filter((i) => i.paidAt).length;
  const nextUnpaid = plan.instalments.find((i) => !i.paidAt);

  return (
    <div className="container-page py-10 max-w-3xl">
      <Link href={`/bookings/${id}`} className="text-sm text-brand-700 hover:underline">
        ← Back to booking
      </Link>

      <header className="mt-4 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pay Later Plan</h1>
          <p className="text-sm text-gray-500">
            {plan.months}-month schedule · {paidCount}/{plan.months} paid
          </p>
        </div>
        <span className={planStatusBadge(plan.status)}>{plan.status}</span>
      </header>

      {plan.status === 'DEFAULTED' && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>Plan defaulted.</strong> The grace period has expired. Please
          contact support if you believe this is an error.
        </div>
      )}

      {plan.status === 'OVERDUE' && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Plan overdue.</strong> Pay the earliest unpaid instalment to
          avoid default.
        </div>
      )}

      {payError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {payError}
        </div>
      )}

      <ol className="space-y-3">
        {plan.instalments.map((inst) => {
          const status = instalmentStatus(inst);
          const canPay =
            !inst.paidAt &&
            nextUnpaid?.seq === inst.seq &&
            (plan.status === 'SCHEDULED' || plan.status === 'OVERDUE');
          return (
            <li
              key={inst.id}
              className="card flex items-center justify-between p-4"
            >
              <div>
                <div className="font-medium">
                  Instalment {inst.seq}{' '}
                  <span className="text-gray-500 font-normal">
                    · {formatINR(inst.amountMinor)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Due {new Date(inst.dueAt).toLocaleDateString('en-IN')}
                  {inst.paidAt && ` · Paid ${new Date(inst.paidAt).toLocaleDateString('en-IN')}`}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={
                    status.tone === 'paid'
                      ? 'text-xs text-green-700'
                      : status.tone === 'overdue'
                      ? 'text-xs text-red-700'
                      : status.tone === 'due'
                      ? 'text-xs text-amber-700'
                      : 'text-xs text-gray-500'
                  }
                >
                  {status.label}
                </span>
                {canPay && (
                  <button
                    onClick={() => handlePay(inst.seq)}
                    disabled={payingSeq !== null}
                    className="btn-primary text-sm"
                  >
                    {payingSeq === inst.seq ? 'Opening…' : 'Pay now'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-6 text-xs text-gray-400">
        Total: {formatINR(plan.totalMinor)} · You must pay instalments in order.
      </p>
    </div>
  );
}
