'use server'

import { requireUser } from '@/lib/auth'
import { registrarError } from '@/lib/errores'
import { createClient } from '@/lib/supabase/server'

export type ResultadoActivarModoProfesor = { error?: string } | undefined

export async function activarModoProfesor(): Promise<ResultadoActivarModoProfesor> {
  await requireUser()

  try {
    const supabase = await createClient()
    const { data: activado, error } = await supabase.rpc('activar_faceta_profesor')
    if (error) throw error

    if (!activado) {
      return { error: 'Necesitás tener un 1er Dan verificado para activar el modo profesor.' }
    }

    return undefined
  } catch (error) {
    await registrarError({ modulo: 'profesores', contexto: 'activarModoProfesor', error })
    return { error: 'No pudimos procesar tu solicitud, intentá de nuevo en unos minutos.' }
  }
}