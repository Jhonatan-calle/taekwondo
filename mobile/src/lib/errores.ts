import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export type SeveridadError = 'info' | 'warning' | 'error' | 'critical'

export const MENSAJE_ERROR_GENERICO =
  'No pudimos procesar tu solicitud, intentá de nuevo en unos minutos.'

export type ParametrosRegistroError = {
  modulo: string
  contexto?: string
  error: unknown
  severidad?: SeveridadError
}

export function extraerMensajeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.length > 0 ? error.message : String(error)
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const mensaje = (error as { message: unknown }).message
    if (typeof mensaje === 'string' && mensaje.length > 0) return mensaje
  }
  try {
    const serializado = JSON.stringify(error)
    if (serializado !== undefined && serializado !== '{}') return serializado
  } catch {
    // JSON.stringify puede fallar ante objetos con ciclos
  }
  const comoTexto = String(error)
  return comoTexto === '[object Object]' ? MENSAJE_ERROR_GENERICO : comoTexto
}

export function esErrorDeRed(error: unknown): boolean {
  return error instanceof TypeError
}

export function crearRegistrador(cliente: SupabaseClient<Database>) {
  return async (params: ParametrosRegistroError): Promise<void> => {
    try {
      await cliente.from('errores_runtime').insert({
        modulo: params.modulo,
        contexto: params.contexto ?? null,
        mensaje_error: extraerMensajeError(params.error),
        stack_trace: params.error instanceof Error ? (params.error.stack ?? null) : null,
        severidad: params.severidad ?? 'error',
      })
    } catch {
      // silencioso: el registro de errores nunca rompe el flujo principal
    }
  }
}

export const registrarError = crearRegistrador(supabase)