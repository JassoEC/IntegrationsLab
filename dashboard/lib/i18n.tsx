'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const translations = {
  en: {
    header: {
      subtitle: 'operator inbox',
    },
    sidebar: {
      title: 'Conversations',
      empty: 'No conversations yet',
    },
    logs: {
      title: 'Logs',
      empty: 'No events yet',
    },
    dashboard: {
      title: 'Dashboard',
      hint: 'Select a conversation from the sidebar to view the message thread.',
      metrics: [
        { label: 'Total Messages', sub: 'all time' },
        { label: 'Open Conversations', sub: 'active threads' },
        { label: 'Pending Reply', sub: 'awaiting response' },
        { label: 'Messages Today', sub: 'last 24h' },
      ],
    },
    conversation: {
      loading: 'Loading…',
      empty: 'No messages yet',
      placeholder: 'Type a message… (Enter to send)',
      send: 'Send',
      sending: '…',
    },
  },
  es: {
    header: {
      subtitle: 'bandeja del operador',
    },
    sidebar: {
      title: 'Conversaciones',
      empty: 'Aún sin conversaciones',
    },
    logs: {
      title: 'Registros',
      empty: 'Sin eventos aún',
    },
    dashboard: {
      title: 'Panel',
      hint: 'Selecciona una conversación del panel lateral para ver el hilo de mensajes.',
      metrics: [
        { label: 'Mensajes Totales', sub: 'desde siempre' },
        { label: 'Conversaciones Abiertas', sub: 'hilos activos' },
        { label: 'Respuesta Pendiente', sub: 'esperando respuesta' },
        { label: 'Mensajes Hoy', sub: 'últimas 24h' },
      ],
    },
    conversation: {
      loading: 'Cargando…',
      empty: 'Aún sin mensajes',
      placeholder: 'Escribe un mensaje… (Enter para enviar)',
      send: 'Enviar',
      sending: '…',
    },
  },
} as const

export type Locale = keyof typeof translations
export type Translations = typeof translations.en

type I18nContext = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: Translations
}

const Ctx = createContext<I18nContext | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    const saved = localStorage.getItem('locale') as Locale | null
    if (saved === 'en' || saved === 'es') setLocaleState(saved)
  }, [])

  const setLocale = (l: Locale) => {
    localStorage.setItem('locale', l)
    setLocaleState(l)
  }

  return (
    <Ctx.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </Ctx.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
