'use client'

import './globals.css'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { maskPhone } from '@/lib/utils'
import { I18nProvider, useI18n } from '@/lib/i18n'

type Log = { id: string; provider: string; event_type: string; status: string; created_at: string }
type Conversation = {
  id: string
  status: string
  last_message_at: string | null
  contacts: { phone_number: string; display_name: string | null } | null
  lastMessage: { direction: string; body: string } | null
}

const MOCK_CONVERSATIONS = [
  { id: 'm1', phone: '+52155•••8821', preview: '↙ ¿Tienen balatas para Nissan Sentra 2019?', time: '2h', pending: true },
  { id: 'm2', phone: '+52133•••4402', preview: '↗ Tu cita está confirmada para el jueves.', time: '5h', pending: false },
  { id: 'm3', phone: '+52181•••7713', preview: '↙ ¿Cuánto cuesta un juego de amortiguadores?', time: '8h', pending: true },
  { id: 'm4', phone: '+52155•••2290', preview: '↗ Refacción lista para recolección en tienda.', time: '1d', pending: false },
  { id: 'm5', phone: '+52133•••6645', preview: '↙ Necesito agendar con el cardiólogo', time: '1d', pending: true },
  { id: 'm6', phone: '+52181•••3378', preview: '↗ ¡Con gusto! Estamos para servirte.', time: '2d', pending: false },
  { id: 'm7', phone: '+52155•••9934', preview: '↙ ¿Hacen envíos a Monterrey?', time: '2d', pending: false },
  { id: 'm8', phone: '+52133•••1156', preview: '↙ ¿Aceptan GNP Seguros?', time: '3d', pending: false },
]

function timeAgo(ts: string | null) {
  if (!ts) return '—'
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { locale, setLocale, t } = useI18n()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [logs, setLogs] = useState<Log[]>([])

  useEffect(() => {
    const fetchConvs = () =>
      fetch('/api/conversations').then((r) => r.json()).then((d) => { if (Array.isArray(d)) setConversations(d) }).catch(() => {})
    fetchConvs()
    const ti = setInterval(fetchConvs, 3000)
    return () => clearInterval(ti)
  }, [])

  useEffect(() => {
    const fetchLogs = () =>
      fetch('/api/logs').then((r) => r.json()).then((d) => { if (Array.isArray(d)) setLogs(d) }).catch(() => {})
    fetchLogs()
    const ti = setInterval(fetchLogs, 3000)
    return () => clearInterval(ti)
  }, [])

  return (
    <>
      {/* header */}
      <header className="h-11 border-b border-gray-800 flex items-center px-5 shrink-0 gap-3">
        <span className="font-semibold tracking-wide">IntegrationsLab</span>
        <span className="text-gray-500 text-xs">{t.header.subtitle}</span>

        <nav className="flex items-center gap-1 ml-4">
          <Link
            href="/"
            className={`px-2.5 py-1 rounded text-xs transition-colors ${pathname === '/' || pathname.startsWith('/conversations') ? 'bg-gray-800 text-gray-100' : 'text-gray-500 hover:text-gray-300'}`}
          >
            WhatsApp
          </Link>
          <Link
            href="/stripe"
            className={`px-2.5 py-1 rounded text-xs transition-colors ${pathname === '/stripe' ? 'bg-gray-800 text-gray-100' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {t.stripe.nav}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1 text-xs border border-gray-700 rounded-md overflow-hidden">
          <button
            onClick={() => setLocale('en')}
            className={`px-2 py-1 transition-colors ${locale === 'en' ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:text-gray-300'}`}
          >
            EN
          </button>
          <button
            onClick={() => setLocale('es')}
            className={`px-2 py-1 transition-colors ${locale === 'es' ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:text-gray-300'}`}
          >
            ES
          </button>
        </div>
      </header>

      {/* body */}
      <div className="flex flex-1 overflow-hidden">

        {/* sidebar */}
        <aside className="w-72 border-r border-gray-800 flex flex-col shrink-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t.sidebar.title}</span>
            <span className="text-xs text-gray-500">{conversations.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => {
              const phone = maskPhone(conv.contacts?.phone_number)
              const name = conv.contacts?.display_name ?? phone
              const isActive = pathname === `/conversations/${conv.id}`
              const isPending = conv.lastMessage?.direction === 'inbound'

              return (
                <Link key={conv.id} href={`/conversations/${conv.id}`}>
                  <div className={`px-4 py-3 border-b border-gray-800/50 cursor-pointer hover:bg-gray-800/40 transition-colors ${isActive ? 'bg-gray-800/60' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {isPending && <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />}
                        <span className="font-medium truncate">{name}</span>
                      </div>
                      <span className="text-gray-500 text-xs shrink-0 ml-2">{timeAgo(conv.last_message_at)}</span>
                    </div>
                    {conv.lastMessage && (
                      <p className="text-gray-400 text-xs truncate">
                        {conv.lastMessage.direction === 'outbound' ? '↗ ' : '↙ '}
                        {conv.lastMessage.body}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
            {conversations.length === 0 && (
              <p className="text-gray-600 text-xs px-4 py-6 text-center">{t.sidebar.empty}</p>
            )}

            {/* mock archived conversations for demo */}
            {MOCK_CONVERSATIONS.map((mock) => (
              <div key={mock.id} className="px-4 py-3 border-b border-gray-800/30 opacity-50">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {mock.pending && <span className="w-2 h-2 rounded-full bg-green-400/50 shrink-0" />}
                    <span className="font-medium truncate text-gray-400">{mock.phone}</span>
                  </div>
                  <span className="text-gray-600 text-xs shrink-0 ml-2">{mock.time}</span>
                </div>
                <p className="text-gray-500 text-xs truncate">{mock.preview}</p>
              </div>
            ))}
          </div>
        </aside>

        {/* main content */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>
      </div>

      {/* logs bar */}
      <div className="h-9 border-t border-gray-800 bg-gray-900/80 flex items-center px-4 gap-6 shrink-0 overflow-hidden">
        <span className="text-gray-500 text-xs font-medium uppercase tracking-wider shrink-0">{t.logs.title}</span>
        <div className="flex items-center gap-4 overflow-x-auto">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center gap-1.5 shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.status === 'processed' ? 'bg-green-400' : log.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400'}`} />
              <span className="text-gray-400 text-xs">{log.provider}</span>
              <span className="text-gray-600 text-xs">{log.event_type}</span>
              <span className="text-gray-600 text-xs">{timeAgo(log.created_at)}</span>
            </div>
          ))}
          {logs.length === 0 && <span className="text-gray-700 text-xs">{t.logs.empty}</span>}
        </div>
      </div>

    </>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><title>IntegrationsLab</title></head>
      <body className="bg-gray-950 text-gray-100 h-screen flex flex-col overflow-hidden text-sm">
        <I18nProvider>
          <AppShell>{children}</AppShell>
        </I18nProvider>
      </body>
    </html>
  )
}
