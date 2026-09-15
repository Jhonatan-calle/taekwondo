import type { SupabaseClient } from '@supabase/supabase-js'

import { supabaseAdmin } from '@/lib/supabase/admin'

export type ParametrosError = {
  modulo: string
  contexto?: string
  error: unknown
  severidad?: 'info' | 'warning' | 'error' | 'critical'
}

// Crea un registrador de errores atado a un cliente Supabase específico.
// El registro en errores_runtime es interno y jamás debe romper el flujo principal.
export function crearRegistrador(supabase: SupabaseClient) {
  return async (params: ParametrosError): Promise<void> => {
    try {
      const mensaje_error =
        params.error instanceof Error ? params.error.message : String(params.error)
      const stack_trace = params.error instanceof Error ? params.error.stack : undefined

      const { error } = await supabase.from('errores_runtime').insert({
        modulo: params.modulo,
        contexto: params.contexto,
        mensaje_error,
        stack_trace,
        severidad: params.severidad ?? 'error',
      })
      if (error) throw error
    } catch {
      // El registro de errores no debe volver a fallar ni interrumpir la acción original.
    }
  }
}

// Registrador por defecto del lado servidor (usa Service Role para garantizar el INSERT).
export const registrarError = crearRegistrador(supabaseAdmin)