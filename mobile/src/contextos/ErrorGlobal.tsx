import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react'
import type { PostgrestError } from '@supabase/supabase-js'
import { BannerError } from '@/components/BannerError'
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores'
import { ejecutarConsulta, type OpcionesConsulta, type ResultadoConsulta } from '@/lib/consulta-supabase'

const TIEMPO_AUTO_DISMISS_MS = 6000

type ErrorContexto = {
  mensaje: string | null
  reportarError(mensaje?: string): void
  ocultarError(): void
}

const ErrorContext = createContext<ErrorContexto | null>(null)

export function ErrorGlobalProvider({ children }: PropsWithChildren) {
  const [mensaje, setMensaje] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const ocultarError = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setMensaje(null)
  }, [])

  const reportarError = useCallback((nuevoMensaje?: string) => {
    setMensaje(nuevoMensaje ?? MENSAJE_ERROR_GENERICO)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      setMensaje(null)
    }, TIEMPO_AUTO_DISMISS_MS)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const valor = useMemo<ErrorContexto>(
    () => ({ mensaje, reportarError, ocultarError }),
    [mensaje, reportarError, ocultarError],
  )

  return (
    <ErrorContext.Provider value={valor}>
      {children}
      <BannerError mensaje={mensaje} onCerrar={ocultarError} />
    </ErrorContext.Provider>
  )
}

export function useErrorGlobal(): ErrorContexto {
  const contexto = useContext(ErrorContext)
  if (!contexto) {
    throw new Error('useErrorGlobal debe usarse dentro de <ErrorGlobalProvider>')
  }
  return contexto
}

export function useConsultaSupabase() {
  const { reportarError } = useErrorGlobal()

  const ejecutar = useCallback(
    async <T,>(
      promesa: Promise<{ data: T; error: PostgrestError | null }>,
      opciones: OpcionesConsulta,
    ): Promise<ResultadoConsulta<T>> => {
      const resultado = await ejecutarConsulta(promesa, opciones)
      if (resultado.error) reportarError(resultado.error)
      return resultado
    },
    [reportarError],
  )

  return { ejecutar }
}