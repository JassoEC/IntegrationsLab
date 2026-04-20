import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id, status, channel, last_message_at, created_at,
      contacts ( id, phone_number, display_name ),
      messages ( direction, body, created_at )
    `)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // attach last message preview to each conversation
  const enriched = (data ?? []).map((conv) => {
    const msgs = (conv.messages as { direction: string; body: string; created_at: string }[]) ?? []
    const last = msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    return { ...conv, messages: undefined, lastMessage: last ?? null }
  })

  return NextResponse.json(enriched)
}
