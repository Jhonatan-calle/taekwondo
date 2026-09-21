import { AuthError } from '@supabase/supabase-js'
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores'

const MENSAJES_POR_CASO: Record<string, string> = {
  invalid_credentials: 'El email o la contraseña son incorrectos.',
  user_already_exists: 'Ya existe una cuenta con ese email.',
  email_not_confirmed: 'Debés confirmar tu email antes de iniciar sesión.',
  weak_password: 'La contraseña debe tener al menos 6 caracteres.',
  email_address_invalid: 'El email ingresado no es válido.',
  over_email_send_rate_limit: 'Se enviaron demasiados correos. Esperá unos minutos y volvé a intentarlo.',
  over_request_rate_limit: 'Demasiados intentos. Esperá unos minutos y volvé a intentarlo.',
}

export const MENSAJE_USUARIO_YA_EXISTE = MENSAJES_POR_CASO.user_already_exists

const RECHAZOS_ESPERADOS = Object.keys(MENSAJES_POR_CASO)

export function esRechazoEsperado(error: unknown): boolean {
  return error instanceof AuthError && !!error.code && RECHAZOS_ESPERADOS.includes(error.code)
}

export function mensajeAmigableDeErrorAuth(error: unknown): string {
  if (!(error instanceof AuthError) || !error.code) return MENSAJE_ERROR_GENERICO
  return MENSAJES_POR_CASO[error.code] ?? MENSAJE_ERROR_GENERICO
}