'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { maskPhone } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

type Message = {
  id: string
  direction: 'inbound' | 'outbound'
  body: string
  status: string
  provider: string
  created_at: string
}

type Conversation = {
  id: string
  status: string
  contacts: { phone_number: string; display_name: string | null } | null
  messages: Message[]
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t } = useI18n()
  const [conv, setConv] = useState<Conversation | null>(null)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchConv = async () => {
    const res = await fetch(`/api/conversations/${id}`)
    if (res.ok) setConv(await res.json())
    else router.replace('/')
  }

  useEffect(() => {
    fetchConv()
    const ti = setInterval(fetchConv, 2000)
    return () => clearInterval(ti)
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conv?.messages.length])

  const send = async () => {
    if (!body.trim() || sending || !conv) return
    const to = conv.contacts?.phone_number
    if (!to) return

    const text = body.trim()
    const tempId = `temp-${Date.now()}`

    // Optimistic update: show message instantly before API confirms
    setBody('')
    setSending(true)
    setError(null)
    setConv((prev) => prev ? {
      ...prev,
      messages: [...prev.messages, {
        id: tempId, direction: 'outbound', body: text,
        status: 'sending', provider: 'twilio', created_at: new Date().toISOString(),
      }],
    } : prev)

    const res = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, body: text, provider: 'twilio' }),
    })

    if (res.ok) {
      await fetchConv() // reconcile temp message with real DB record
    } else {
      // Roll back optimistic message on failure
      setConv((prev) => prev ? {
        ...prev,
        messages: prev.messages.filter((m) => m.id !== tempId),
      } : prev)
      const data = await res.json()
      setError(data?.error ?? 'Failed to send')
    }

    setSending(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  if (!conv) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-xs">
        {t.conversation.loading}
      </div>
    )
  }

  const phone = maskPhone(conv.contacts?.phone_number)
  const name = conv.contacts?.display_name ?? phone

  return (
    <div className="flex flex-col h-full">

      {/* thread header */}
      <div className="h-12 border-b border-gray-800 flex items-center px-5 gap-3 shrink-0">
        <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold">
          {name[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-sm leading-none">{name}</p>
          <p className="text-gray-500 text-xs mt-0.5">{phone}</p>
        </div>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${conv.status === 'open' ? 'bg-green-900/40 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
          {conv.status}
        </span>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2">
        {conv.messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-2xl text-sm ${
              msg.direction === 'outbound'
                ? 'bg-green-700/80 text-white rounded-br-sm'
                : 'bg-gray-700/80 text-gray-100 rounded-bl-sm'
            }`}>
              <p className="leading-snug">{msg.body}</p>
              <p className={`text-xs mt-1 ${msg.direction === 'outbound' ? 'text-green-300/70' : 'text-gray-400'}`}>
                {formatTime(msg.created_at)}
              </p>
            </div>
          </div>
        ))}
        {conv.messages.length === 0 && (
          <p className="text-gray-600 text-xs text-center mt-8">{t.conversation.empty}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* reply input */}
      <div className="border-t border-gray-800 px-4 py-3 shrink-0">
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:border-gray-500 min-h-[40px] max-h-32"
            placeholder={t.conversation.placeholder}
            rows={1}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button
            onClick={send}
            disabled={sending || !body.trim()}
            className="h-10 px-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-xl transition-colors shrink-0"
          >
            {sending ? t.conversation.sending : t.conversation.send}
          </button>
        </div>
      </div>

    </div>
  )
}
