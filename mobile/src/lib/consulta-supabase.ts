import type { PostgrestError } from '@supabase/supabase-js'
import {
  MENSAJE_ERROR_GENERICO,
  esErrorDeRed,
  registrarError,
  type SeveridadError,
} from '@/lib/errores'

export type ResultadoConsulta<T> = { data: T | null; error: string | null }

export type OpcionesConsulta = {
  modulo: string
  contexto: string
  severidad?: SeveridadError
}

export async function ejecutarConsulta<T>(
  promesa: Promise<{ data: T; error: PostgrestError | null }>,
  opciones: OpcionesConsulta,
): Promise<ResultadoConsulta<T>> {
  try {
    const { data, error } = await promesa
    if (error) {
      void registrarError({
        modulo: opciones.modulo,
        contexto: opciones.contexto,
        error,
        severidad: opciones.severidad ?? 'error',
      })
      return { data: null, error: MENSAJE_ERROR_GENERICO }
    }
    return { data, error: null }
  } catch (error) {
    void registrarError({
      modulo: opciones.modulo,
      contexto: opciones.contexto,
      error,
      severidad: esErrorDeRed(error) ? 'critical' : (opciones.severidad ?? 'error'),
    })
    return { data: null, error: MENSAJE_ERROR_GENERICO }
  }
}