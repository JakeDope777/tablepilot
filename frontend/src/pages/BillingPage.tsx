import { useEffect, useState } from 'react';
import { CreditCard, ExternalLink, Loader2, Receipt } from 'lucide-react';
import { billingService } from '../services/api';
import { trackEvent } from '../services/analytics';

interface InvoiceItem {
  id: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string;
  hosted_invoice_url?: string;
  invoice_pdf?: string;
  created_at?: string;
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState<{
    tier: string;
    status: string;
    current_period_end?: string;
    demo?: boolean;
  } | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const [subData, invoiceData] = await Promise.all([
        billingService.getSubscription(),
        billingService.getInvoices(),
      ]);
      setSubscription(subData);
      setInvoices(invoiceData.invoices || []);
    } catch {
      setError('Unable to load billing data right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void trackEvent('billing_viewed');
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      void trackEvent('checkout_completed');
    }
    void refresh();
  }, []);

  const startCheckout = async () => {
    setBusy(true);
    setError('');
    try {
      await trackEvent('checkout_started', { plan: 'pro' });
      const data = await billingService.createCheckoutSession('pro');
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      setError('Could not create checkout session.');
    } catch {
      setError('Checkout is temporarily unavailable.');
    } finally {
      setBusy(false);
    }
  };

  const openPortal = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await billingService.createPortalSession();
      if (data.portal_url) {
        window.location.href = data.portal_url;
        return;
      }
      setError('Could not create billing portal session.');
    } catch {
      setError('Billing portal is temporarily unavailable.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Billing</h2>
        <p className="text-sm text-slate-600">Stripe test-mode subscription and invoice history.</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Current Plan</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900 capitalize">{subscription?.tier || 'free'}</h3>
          <p className="mt-1 text-sm text-slate-600">Status: {subscription?.status || 'inactive'}</p>
          {subscription?.current_period_end && (
            <p className="text-xs text-slate-500">Renews: {new Date(subscription.current_period_end).toLocaleDateString()}</p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={startCheckout}
              disabled={busy}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              Upgrade to Pro
            </button>
            <button
              onClick={openPortal}
              disabled={busy}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Open Billing Portal
            </button>
          </div>
          {subscription?.demo && (
            <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 inline-block">
              Running in demo/test mode.
            </p>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-orange-600" />
            <h3 className="text-sm font-semibold text-slate-800">Payment Mode</h3>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Pilot launch uses Stripe test mode for checkout validation before enabling live payments.
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-slate-700" />
          <h3 className="text-sm font-semibold text-slate-800">Invoices</h3>
        </div>
        {invoices.length === 0 ? (
          <p className="text-sm text-slate-500">No invoices yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 font-medium">Invoice</th>
                  <th className="py-2 font-medium">Amount</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">Link</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 font-medium text-slate-800">{invoice.id}</td>
                    <td className="py-3 text-slate-600">
                      {(invoice.amount_paid / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                    </td>
                    <td className="py-3 text-slate-600">{invoice.status}</td>
                    <td className="py-3 text-slate-600">
                      {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3">
                      {invoice.hosted_invoice_url ? (
                        <a
                          className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900"
                          href={invoice.hosted_invoice_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
