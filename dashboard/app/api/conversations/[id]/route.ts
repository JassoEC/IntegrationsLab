import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id, status, channel, last_message_at, created_at,
      contacts ( id, phone_number, display_name ),
      messages ( id, direction, body, media_url, status, external_id, provider, created_at )
    `)
    .eq('id', params.id)
    .single()

  if (error?.code === 'PGRST116') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const sorted = {
    ...data,
    messages: ((data.messages ?? []) as { created_at: string }[])
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
  }

  return NextResponse.json(sorted)
}
