'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'

type Payment = {
  id: string
  external_id: string
  amount: number
  currency: string
  status: string
  payment_url: string | null
  created_at: string
}

type StripeEvent = {
  id: string
  event_type: string
  status: string
  error: string | null
  created_at: string
}

const STATUS_DOT: Record<string, string> = {
  succeeded: 'bg-green-400',
  processed: 'bg-green-400',
  pending:   'bg-yellow-400',
  failed:    'bg-red-400',
}

const STATUS_TEXT: Record<string, string> = {
  succeeded: 'text-green-400',
  processed: 'text-green-400',
  pending:   'text-yellow-400',
  failed:    'text-red-400',
  refunded:  'text-blue-400',
}

function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60)    return `${diff}s`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export default function StripePage() {
  const { t } = useI18n()

  const [form, setForm] = useState({ amount: '20.00', currency: 'usd', customer_phone: '', description: '' })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ payment_url?: string; error?: string } | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [events, setEvents] = useState<StripeEvent[]>([])

  useEffect(() => {
    const fetchAll = () => {
      fetch('/api/stripe/payments').then(r => r.json()).then(d => { if (Array.isArray(d)) setPayments(d) }).catch(() => {})
      fetch('/api/stripe/events').then(r => r.json()).then(d => { if (Array.isArray(d)) setEvents(d) }).catch(() => {})
    }
    fetchAll()
    const ti = setInterval(fetchAll, 3000)
    return () => clearInterval(ti)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setResult(null)
    try {
      const res = await fetch('/api/stripe/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(form.amount),
          currency: form.currency,
          customer_phone: form.customer_phone,
          description: form.description || undefined,
        }),
      })
      setResult(await res.json())
    } catch {
      setResult({ error: 'Request failed' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <h1 className="text-base font-semibold text-gray-200">{t.stripe.title}</h1>

      {/* Create payment form */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 max-w-lg">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">{t.stripe.form.title}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">{t.stripe.form.amount}</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-gray-500"
              />
            </div>
            <div className="w-24">
              <label className="text-xs text-gray-500 block mb-1">{t.stripe.form.currency}</label>
              <select
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-gray-500"
              >
                <option value="usd">USD</option>
                <option value="mxn">MXN</option>
                <option value="eur">EUR</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">{t.stripe.form.phone}</label>
            <input
              type="text"
              required
              placeholder="+521234567890"
              value={form.customer_phone}
              onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-gray-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">{t.stripe.form.description}</label>
            <input
              type="text"
              placeholder="Order #1001 — Pro Plan"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-gray-500"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded text-sm font-medium transition-colors"
          >
            {submitting ? t.stripe.form.sending : t.stripe.form.submit}
          </button>
        </form>

        {result && (
          <div className="mt-3 p-3 rounded bg-gray-900 border border-gray-700">
            {result.error ? (
              <p className="text-red-400 text-xs">{result.error}</p>
            ) : (
              <div className="space-y-1.5">
                <p className="text-green-400 text-xs font-medium">{t.stripe.form.success}</p>
                {result.payment_url && (
                  <a
                    href={result.payment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 text-xs break-all underline underline-offset-2"
                  >
                    {result.payment_url}
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payments + Events */}
      <div className="grid grid-cols-2 gap-4">
        {/* Payments table */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-700/50 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t.stripe.payments.title}</span>
            <span className="text-xs text-gray-600">{payments.length}</span>
          </div>
          <div className="divide-y divide-gray-800/50">
            {payments.map(p => (
              <div key={p.id} className="px-4 py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[p.status] ?? 'bg-gray-500'}`} />
                    <span className="text-xs font-mono text-gray-500">{p.external_id.slice(-10)}</span>
                  </div>
                  <p className="text-sm text-gray-200 font-medium">
                    {p.currency.toUpperCase()} {Number(p.amount).toFixed(2)}
                    <span className={`ml-2 text-xs font-normal ${STATUS_TEXT[p.status] ?? 'text-gray-400'}`}>{p.status}</span>
                  </p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-xs text-gray-600">{timeAgo(p.created_at)}</p>
                  {p.payment_url && p.status === 'pending' && (
                    <a
                      href={p.payment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 block"
                    >
                      {t.stripe.payments.pay} →
                    </a>
                  )}
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <p className="text-gray-600 text-xs px-4 py-6 text-center">{t.stripe.payments.empty}</p>
            )}
          </div>
        </div>

        {/* Webhook events table */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-700/50 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t.stripe.events.title}</span>
            <span className="text-xs text-gray-600">{events.length}</span>
          </div>
          <div className="divide-y divide-gray-800/50">
            {events.map(ev => (
              <div key={ev.id} className="px-4 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-300 font-mono">{ev.event_type}</span>
                  <span className="text-xs text-gray-600">{timeAgo(ev.created_at)}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[ev.status] ?? 'bg-gray-500'}`} />
                  <span className={`text-xs ${STATUS_TEXT[ev.status] ?? 'text-gray-400'}`}>{ev.status}</span>
                  {ev.error && <span className="text-xs text-red-400 truncate ml-1">{ev.error}</span>}
                </div>
              </div>
            ))}
            {events.length === 0 && (
              <p className="text-gray-600 text-xs px-4 py-6 text-center">{t.stripe.events.empty}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
