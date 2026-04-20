'use client'

import { useI18n } from '@/lib/i18n'

export default function Home() {
  const { t } = useI18n()

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-base font-semibold text-gray-200 mb-6">{t.dashboard.title}</h1>

      <div className="grid grid-cols-2 gap-4 max-w-xl">
        {t.dashboard.metrics.map((m) => (
          <div key={m.label} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <p className="text-2xl font-bold text-gray-100">—</p>
            <p className="text-xs font-medium text-gray-300 mt-1">{m.label}</p>
            <p className="text-xs text-gray-500">{m.sub}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-gray-600 text-xs">{t.dashboard.hint}</p>
    </div>
  )
}
