import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { Session } from '@supabase/supabase-js'
import * as Linking from 'expo-linking'
import { supabase } from '@/lib/supabase'
import { MENSAJE_ERROR_GENERICO, esErrorDeRed, registrarError } from '@/lib/errores'
import { esRechazoEsperado, mensajeAmigableDeErrorAuth, MENSAJE_USUARIO_YA_EXISTE } from '@/lib/auth-mensajes'

export type ResultadoAuth = { error: string | null; pendienteConfirmacion?: boolean }

type AuthGlobalValue = {
  sesion: Session | null
  cargando: boolean
  iniciarSesion(email: string, password: string): Promise<ResultadoAuth>
  registrarCuenta(email: string, password: string): Promise<ResultadoAuth>
  recuperarContrasena(email: string): Promise<ResultadoAuth>
  cerrarSesion(): Promise<void>
}

const AuthContext = createContext<AuthGlobalValue | null>(null)

function normalizarErrorAuth(error: unknown, contexto: string): ResultadoAuth {
  if (esRechazoEsperado(error)) {
    return { error: mensajeAmigableDeErrorAuth(error) }
  }
  void registrarError({
    modulo: 'auth',
    contexto,
    error,
    severidad: esErrorDeRed(error) ? 'critical' : 'error',
  })
  return { error: MENSAJE_ERROR_GENERICO }
}

export function AuthGlobalProvider({ children }: PropsWithChildren) {
  const [sesion, setSesion] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true

    const restaurarSesion = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (!activo) return
        if (error) {
          void registrarError({ modulo: 'auth', contexto: 'restaurarSesion', error })
        } else {
          setSesion(data.session)
        }
      } catch (error) {
        if (activo) {
          void registrarError({ modulo: 'auth', contexto: 'restaurarSesion', error })
        }
      } finally {
        if (activo) setCargando(false)
      }
    }

    restaurarSesion()

    const { data } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSesion(nuevaSesion)
    })

    return () => {
      activo = false
      data.subscription.unsubscribe()
    }
  }, [])

  const iniciarSesion = useCallback(
    async (email: string, password: string): Promise<ResultadoAuth> => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return normalizarErrorAuth(error, 'iniciarSesion')
        if (data.session) setSesion(data.session)
        return { error: null }
      } catch (error) {
        return normalizarErrorAuth(error, 'iniciarSesion')
      }
    },
    [],
  )

  const registrarCuenta = useCallback(
    async (email: string, password: string): Promise<ResultadoAuth> => {
      try {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) return normalizarErrorAuth(error, 'registrarCuenta')
        if (data.session) {
          setSesion(data.session)
          return { error: null }
        }
        if (data.user != null && (data.user.identities?.length ?? 0) === 0) {
          return { error: MENSAJE_USUARIO_YA_EXISTE }
        }
        return { error: null, pendienteConfirmacion: data.user != null }
      } catch (error) {
        return normalizarErrorAuth(error, 'registrarCuenta')
      }
    },
    [],
  )

  const recuperarContrasena = useCallback(async (email: string): Promise<ResultadoAuth> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: Linking.createURL('nueva-contrasena'),
      })
      if (error) return normalizarErrorAuth(error, 'recuperarContrasena')
      return { error: null }
    } catch (error) {
      return normalizarErrorAuth(error, 'recuperarContrasena')
    }
  }, [])

  const cerrarSesion = useCallback(async (): Promise<void> => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      void registrarError({ modulo: 'auth', contexto: 'cerrarSesion', error })
    }
    setSesion(null)
  }, [])

  const valor = useMemo<AuthGlobalValue>(
    () => ({ sesion, cargando, iniciarSesion, registrarCuenta, recuperarContrasena, cerrarSesion }),
    [sesion, cargando, iniciarSesion, registrarCuenta, recuperarContrasena, cerrarSesion],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuthGlobal(): AuthGlobalValue {
  const contexto = useContext(AuthContext)
  if (!contexto) {
    throw new Error('useAuthGlobal debe usarse dentro de <AuthGlobalProvider>')
  }
  return contexto
}