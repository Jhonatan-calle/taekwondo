import type { SupabaseClient } from '@supabase/supabase-js'

import { supabaseAdmin } from '@/lib/supabase/admin'

export type ParametrosError = {
  modulo: string
  contexto?: string
  error: unknown
  severidad?: 'info' | 'warning' | 'error' | 'critical'
}

// Extrae un mensaje legible ante cualquier forma de error (Error, Supabase,
// objeto desconocido). Nunca debe quedar '[object Object]' en el registro.
function extraerMensajeError(error: unknown): string {
  if (error instanceof Error) return error.message

  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>
    if (typeof e.message === 'string') return e.message
    try {
      const serializado = JSON.stringify(e)
      if (serializado && serializado !== '{}') return serializado
    } catch {
      // se usa el fallback
    }
  }

  return String(error)
}

// Ruido esperado (no son fallas de usuario): pre-render dinámico de Next.js y
// redirects de las acciones. Se descartan para no ensuciar errores_runtime.
function esRuidoError(error: unknown, mensaje: string): boolean {
  if (mensaje.startsWith('Dynamic server usage')) return true
  const nombre =
    typeof error === 'object' && error !== null
      ? (error as Record<string, unknown>).name
      : undefined
  return nombre === 'NEXT_REDIRECT' || nombre === 'NextRedirectError'
}

// Crea un registrador de errores atado a un cliente Supabase específico.
// El registro en errores_runtime es interno y jamás debe romper el flujo principal.
export function crearRegistrador(supabase: SupabaseClient) {
  return async (params: ParametrosError): Promise<void> => {
    try {
      const mensaje_error = extraerMensajeError(params.error)
      if (esRuidoError(params.error, mensaje_error)) return
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