'use server'

import { randomUUID } from 'node:crypto'

import { redirect } from 'next/navigation'

import { registrarError } from '@/lib/errores'
import { GRADOS_INSCRIPCION } from '@/lib/grados'
import { supabaseAdmin } from '@/lib/supabase/admin'

export type ResultadoInscripcion = { error?: string } | undefined

export type MaestroParaInscripcion = { id: string; nombre_completo: string }

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Minúsculas + trim + colapso de espacios extra (para validación cruzada de identidad).
function normalizarNombre(nombre: string): string {
  return nombre.trim().toLowerCase().replace(/\s+/g, ' ')
}

// Recupera el id de un usuario por email vía GoTrue Admin REST (Service Role).
// El SDK @supabase/auth-js (v2.116) solo permite page/perPage en admin.listUsers;
// esta consulta es eficiente y filtra directamente por email.
async function buscarUsuarioPorEmail(email: string): Promise<{ id: string } | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const url = `${base}/auth/v1/admin/users?filter=email&keyword=${encodeURIComponent(email)}`
  const response = await fetch(url, {
    headers: {
      apikey: anonKey!,
      Authorization: `Bearer ${serviceRoleKey!}`,
    },
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`Búsqueda de usuario por email falló: HTTP ${response.status}`)
  }
  const body = (await response.json()) as { users?: { id: string }[] }
  const usuario = body.users?.[0]
  return usuario ? { id: usuario.id } : null
}

export async function registrarInscripcion(
  _estadoPrevio: ResultadoInscripcion,
  formData: FormData,
): Promise<ResultadoInscripcion> {
  const token = String(formData.get('token') ?? '').trim()
  const nombre = String(formData.get('nombre') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const fechaNacimiento = String(formData.get('fecha_nacimiento') ?? '').trim()
  const peso = Number(formData.get('peso_kg'))
  const altura = Number(formData.get('altura_cm'))
  const grado = String(formData.get('grado') ?? '').trim()
  const maestroId = String(formData.get('maestro_id') ?? '').trim()

  // 1. Validación de entrada (errores de capa de usuario: sin errores_runtime).
  if (!token) return { error: 'El enlace de inscripción no es válido.' }
  if (!nombre) return { error: 'Completá tu nombre completo.' }
  if (!EMAIL_REGEX.test(email)) return { error: 'Ingresá un email válido.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)) {
    return { error: 'Ingresá una fecha de nacimiento válida.' }
  }
  const dateNacimiento = new Date(`${fechaNacimiento}T00:00:00`)
  if (Number.isNaN(dateNacimiento.getTime()) || dateNacimiento > new Date()) {
    return { error: 'Ingresá una fecha de nacimiento válida.' }
  }
  if (!Number.isFinite(peso) || peso <= 0) return { error: 'Ingresá un peso válido.' }
  if (!Number.isFinite(altura) || altura <= 0) return { error: 'Ingresá una altura válida.' }
  if (!(GRADOS_INSCRIPCION as readonly string[]).includes(grado)) {
    return { error: 'Seleccioná tu cinturón actual.' }
  }
  if (!UUID_REGEX.test(maestroId)) return { error: 'Seleccioná un maestro válido.' }

  try {
    // 2. Resolver el torneo por link_token (público pero sesgado por token).
    const { data: torneo, error: errorTorneo } = await supabaseAdmin
      .from('torneos')
      .select('id, estado')
      .eq('link_token', token)
      .maybeSingle()
    if (errorTorneo) throw errorTorneo
    if (!torneo) return { error: 'El enlace de inscripción no es válido.' }
    if (torneo.estado !== 'inscripciones') {
      return { error: 'Las inscripciones para este torneo están cerradas.' }
    }

    // 3. Revalidar el maestro elegido (debe ser profesor activo).
    const { data: maestro, error: errorMaestro } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', maestroId)
      .eq('es_profesor', true)
      .maybeSingle()
    if (errorMaestro) throw errorMaestro
    if (!maestro) return { error: 'Seleccioná un maestro válido.' }

    // 4. Crear (o recuperar) el usuario. Email vive en auth.users, nombre en profiles.
    const password = `${randomUUID()}TKD!`
    const creado = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre_completo: nombre },
    })

    let alumnoId: string
    let actualizaNombre = false

    if (creado.data?.user) {
      alumnoId = creado.data.user.id
      actualizaNombre = true
    } else if (creado.error) {
      // Email ya registrado: recuperar el id existente.
      const preexistente = await buscarUsuarioPorEmail(email)
      if (!preexistente) throw creado.error

      // 5. Validación cruzada de identidad (solo usuario recuperado).
      const { data: perfil, error: errorPerfil } = await supabaseAdmin
        .from('profiles')
        .select('nombre_completo')
        .eq('id', preexistente.id)
        .maybeSingle()
      if (errorPerfil) throw errorPerfil
      if (!perfil) throw new Error('Perfil inexistente para el usuario recuperado.')

      // nombre_completo en blanco (default del trigger) → sin identidad previa que reclamar:
      // se procede y se setea el nombre del formulario.
      if (perfil.nombre_completo.trim() === '') {
        actualizaNombre = true
      } else {
        const nombreGuardado = normalizarNombre(perfil.nombre_completo)
        if (nombreGuardado !== normalizarNombre(nombre)) {
          // Error de capa de usuario: NO va a errores_runtime y jamás expone el nombre guardado.
          return {
            error: 'Este email ya está registrado con otro nombre. Verificá los datos o contactá a tu maestro.',
          }
        }
      }

      alumnoId = preexistente.id
    } else {
      throw new Error('No se pudo crear el usuario para la inscripción.')
    }

    // 5b. Poblar/actualizar el perfil con los datos más recientes del formulario.
    const { error: errorPerfil2 } = await supabaseAdmin
      .from('profiles')
      .update({
        ...(actualizaNombre ? { nombre_completo: nombre } : {}),
        fecha_nacimiento: fechaNacimiento,
        peso_kg: peso,
        altura_cm: altura,
      })
      .eq('id', alumnoId)
    if (errorPerfil2) throw errorPerfil2

    // 6. Insert de la inscripción (pendiente). 23505 = ya inscripto (negocio, no técnico).
    const { error: errorInscripcion } = await supabaseAdmin
      .from('inscripciones')
      .insert({
        torneo_id: torneo.id,
        alumno_id: alumnoId,
        profesor_id: maestroId,
        datos_antropometricos: { grado, fecha_nacimiento: fechaNacimiento, peso_kg: peso, altura_cm: altura },
        estado: 'pendiente',
      })
    if (errorInscripcion) {
      if (errorInscripcion.code === '23505') {
        return { error: 'Ya registramos este email para este torneo.' }
      }
      throw errorInscripcion
    }
  } catch (error) {
    await registrarError({ modulo: 'inscripcion', contexto: 'registrarInscripcion', error })
    return { error: 'No pudimos procesar tu solicitud, intentá de nuevo en unos minutos.' }
  }

  redirect(`/t/${encodeURIComponent(token)}?ok=1`)
}