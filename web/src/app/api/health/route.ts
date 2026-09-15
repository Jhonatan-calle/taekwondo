import { NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase/admin'

// Health check: verifica conectividad con la base de datos (select 1).
export async function GET() {
  try {
    const { error } = await supabaseAdmin.from('profiles').select('id').limit(1)
    if (error) {
      throw error
    }

    return NextResponse.json({ status: 'ok', db: 'connected' })
  } catch {
    // Fail gracefully: jamás exponemos detalles técnicos al cliente.
    return NextResponse.json(
      { status: 'error', db: 'disconnected' },
      { status: 500 },
    )
  }
}