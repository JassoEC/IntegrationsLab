export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const NO_CACHE = { headers: { 'Cache-Control': 'no-store' } }

export async function GET() {
  const { data, error } = await supabase
    .from('webhook_events')
    .select('id, provider, event_type, status, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500, ...NO_CACHE })
  return NextResponse.json(data ?? [], NO_CACHE)
}
