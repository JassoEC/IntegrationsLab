'use client'

import './globals.css'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { maskPhone } from '@/lib/utils'

type Log = { id: string; provider: string; event_type: string; status: string; created_at: string }
type Conversation = {
  id: string
  status: string
  last_message_at: string | null
  contacts: { phone_number: string; display_name: string | null } | null
  lastMessage: { direction: string; body: string } | null
}

function timeAgo(ts: string | null) {
  if (!ts) return '—'
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [logs, setLogs] = useState<Log[]>([])

  useEffect(() => {
    const fetchConvs = () =>
      fetch('/api/conversations').then((r) => r.json()).then(setConversations).catch(() => {})
    fetchConvs()
    const t = setInterval(fetchConvs, 5000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const fetchLogs = () =>
      fetch('/api/logs').then((r) => r.json()).then(setLogs).catch(() => {})
    fetchLogs()
    const t = setInterval(fetchLogs, 3000)
    return () => clearInterval(t)
  }, [])

  return (
    <html lang="en">
      <head><title>IntegrationsLab</title></head>
      <body className="bg-gray-950 text-gray-100 h-screen flex flex-col overflow-hidden text-sm">

        {/* header */}
        <header className="h-11 border-b border-gray-800 flex items-center px-5 shrink-0 gap-3">
          <span className="font-semibold tracking-wide">IntegrationsLab</span>
          <span className="text-gray-500 text-xs">operator inbox</span>
        </header>

        {/* body */}
        <div className="flex flex-1 overflow-hidden">

          {/* sidebar */}
          <aside className="w-72 border-r border-gray-800 flex flex-col shrink-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Conversations</span>
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
                <p className="text-gray-600 text-xs px-4 py-6 text-center">No conversations yet</p>
              )}
            </div>
          </aside>

          {/* main content */}
          <main className="flex-1 overflow-hidden flex flex-col">
            {children}
          </main>
        </div>

        {/* logs bar */}
        <div className="h-9 border-t border-gray-800 bg-gray-900/80 flex items-center px-4 gap-6 shrink-0 overflow-hidden">
          <span className="text-gray-500 text-xs font-medium uppercase tracking-wider shrink-0">Logs</span>
          <div className="flex items-center gap-4 overflow-x-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-1.5 shrink-0">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.status === 'processed' ? 'bg-green-400' : log.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                <span className="text-gray-400 text-xs">{log.provider}</span>
                <span className="text-gray-600 text-xs">{log.event_type}</span>
                <span className="text-gray-600 text-xs">{timeAgo(log.created_at)}</span>
              </div>
            ))}
            {logs.length === 0 && <span className="text-gray-700 text-xs">No events yet</span>}
          </div>
        </div>

      </body>
    </html>
  )
}
