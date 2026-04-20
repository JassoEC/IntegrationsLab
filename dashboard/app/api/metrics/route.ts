import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    { count: totalMessages },
    { count: openConversations },
    { count: messagesToday },
    { data: openConvIds },
  ] = await Promise.all([
    supabase.from('messages').select('*', { count: 'exact', head: true }),
    supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    supabase.from('conversations').select('id').eq('status', 'open'),
  ])

  let pendingReply = 0
  if (openConvIds && openConvIds.length > 0) {
    const ids = openConvIds.map((c) => c.id)
    const { data: lastMessages } = await supabase
      .from('messages')
      .select('conversation_id, direction, created_at')
      .in('conversation_id', ids)
      .order('created_at', { ascending: false })

    // keep only the most recent message per conversation
    const seen = new Set<string>()
    for (const msg of lastMessages ?? []) {
      if (!seen.has(msg.conversation_id)) {
        seen.add(msg.conversation_id)
        if (msg.direction === 'inbound') pendingReply++
      }
    }
  }

  return NextResponse.json({
    totalMessages: totalMessages ?? 0,
    openConversations: openConversations ?? 0,
    messagesToday: messagesToday ?? 0,
    pendingReply,
  })
}
