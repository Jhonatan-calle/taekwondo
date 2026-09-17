// Seed de desarrollo: "Torneo Seed Emparejamiento" con inscripciones CONFIRMADAS
// preparadas para probar el Motor de Emparejamiento sin completar formularios a mano.
//
// Uso: node scripts/seed-emparejamiento.mjs   (desde web/)
//
// - Lee NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de .env.local (solo lectura).
// - Ata el torneo y el aval (profesor_id) al PRIMER profesor del sistema (es_profesor=true).
// - Idempotente: al re-ejecutar, borra el torneo seed previo y lo reconstruye.
//   Los usuarios (auth) con email fijo se REUTILIZAN (no se acumulan).
//
// Escenarios incluidos (ver resumen al final de la ejecución):
//   1. Infantil 8-9 años, 30 vs 34 kg   -> 1 enfrentamiento (regla ≤5 kg OK)
//   2. Infantil 10-11 años, 30 vs 36 kg -> 2 libres (regla ≤5 kg bloquea)
//   3. Hasta 7 años, único              -> 1 libre (bye)
//   4. Adultos 21-34: 3 a 80 kg (agr 2/4/4, alt 175/180/190) -> par agresividad+altura + libre
//   5. Adultos 35-50: 70 vs 85 kg       -> 1 enfrentamiento (adultos sin tope)

import { readFileSync } from 'node:fs'

import { createClient } from '@supabase/supabase-js'

const ENV_PATH = new URL('../.env.local', import.meta.url)

function leerEnv(path) {
  const env = {}
  for (const linea of readFileSync(path, 'utf8').split('\n')) {
    const match = linea.trim().match(/^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (!match) continue
    let valor = match[2].trim()
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1)
    }
    env[match[1]] = valor
  }
  return env
}

const env = leerEnv(ENV_PATH)
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

const NOMBRE_TORNEO = 'Torneo Seed Emparejamiento'

// Nacimiento tal que hoy cumple `edad` años (igual criterio que el motor).
function haciaAnios(edad) {
  const hoy = new Date()
  const nac = new Date(Date.UTC(hoy.getUTCFullYear() - edad, hoy.getUTCMonth(), hoy.getUTCDate()))
  return nac.toISOString().slice(0, 10)
}

function participante(email, nombre, grado, edad, pesoKg, alturaCm, nivelAgresividad) {
  return {
    email,
    nombre,
    grado,
    fechaNacimiento: haciaAnios(edad),
    pesoKg,
    alturaCm,
    nivelAgresividad,
  }
}

// Casos: cada grupo es un escenario esperado del motor.
const PARTICIPANTES = [
  // Escenario 1
  participante('seed-tkd-a@example.com', 'Seed Ana', 'blanco', 8, 30, 130, 2),
  participante('seed-tkd-b@example.com', 'Seed Bruno', 'blanco_punta_amarilla', 9, 34, 132, 4),
  // Escenario 2
  participante('seed-tkd-c@example.com', 'Seed Carla', 'blanco', 10, 30, 130, 3),
  participante('seed-tkd-d@example.com', 'Seed Denis', 'blanco', 11, 36, 131, 3),
  // Escenario 3
  participante('seed-tkd-e@example.com', 'Seed Elías', 'blanco', 6, 22, 118, 3),
  // Escenario 4
  participante('seed-tkd-f@example.com', 'Seed Fede', 'amarillo', 30, 80, 175, 2),
  participante('seed-tkd-g@example.com', 'Seed Gabi', 'amarillo_punta_verde', 31, 80, 180, 4),
  participante('seed-tkd-h@example.com', 'Seed Hugo', 'verde', 29, 80, 190, 4),
  // Escenario 5
  participante('seed-tkd-i@example.com', 'Seed Iva', 'azul', 40, 70, 168, 3),
  participante('seed-tkd-j@example.com', 'Seed Juli', 'azul_punta_roja', 42, 85, 178, 3),
]

function esperarError(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Reutiliza o crea el auth user por email (mismo espíritu del flujo /t/<token>).
async function obtenerOCrearUsuario({ email, nombre }) {
  const password = `${Math.random().toString(36).slice(2)}TKD!`

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre_completo: nombre },
  })
  if (!error && data.user) return { id: data.user.id, creado: true }

  // Email ya registrado: recuperar por GoTrue Admin REST (como en flujo-inscripcion-web).
  const res = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?filter=email&keyword=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${serviceRoleKey}` } },
  )
  if (!res.ok) throw new Error(`Fallo al buscar usuario ${email}: HTTP ${res.status}`)
  const pagina = await res.json()
  const usuario = (pagina.users ?? []).find((u) => u.email === email)
  if (!usuario) throw new Error(`No se pudo resolver el usuario ${email}`)
  return { id: usuario.id, creado: false }
}

async function limpiarTorneoPrev(profesorId) {
  const { data: torneos, error } = await supabase
    .from('torneos')
    .select('id')
    .eq('organizador_id', profesorId)
    .eq('nombre', NOMBRE_TORNEO)
  if (error) throw error
  for (const t of torneos ?? []) {
    await supabase.from('categorias').delete().eq('torneo_id', t.id)
    await supabase.from('inscripciones').delete().eq('torneo_id', t.id)
    await supabase.from('torneos').delete().eq('id', t.id)
  }
}

async function main() {
  const { data: profesor, error: errorProfesor } = await supabase
    .from('profiles')
    .select('id, nombre_completo')
    .eq('es_profesor', true)
    .order('creado_en', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (errorProfesor) throw errorProfesor
  if (!profesor) throw new Error('No hay ningún profesor (es_profesor=true) para atar el seed.')

  console.log(`Profesor del seed: ${profesor.nombre_completo || profesor.id}`)

  await limpiarTorneoPrev(profesor.id)

  const { data: torneo, error: errorTorneo } = await supabase
    .from('torneos')
    .insert({
      nombre: NOMBRE_TORNEO,
      fecha: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      estado: 'inscripciones',
      organizador_id: profesor.id,
    })
    .select('id, link_token')
    .single()
  if (errorTorneo) throw errorTorneo

  let creados = 0
  let reutilizados = 0

  for (const p of PARTICIPANTES) {
    const { id: alumnoId, creado } = await obtenerOCrearUsuario(p)
    if (creado) creados += 1
    else reutilizados += 1

    const { error: errorPerfil } = await supabase
      .from('profiles')
      .update({
        nombre_completo: p.nombre,
        fecha_nacimiento: p.fechaNacimiento,
        peso_kg: p.pesoKg,
        altura_cm: p.alturaCm,
      })
      .eq('id', alumnoId)
    if (errorPerfil) throw errorPerfil

    const { data: inscripcion, error: errorInsc } = await supabase
      .from('inscripciones')
      .insert({
        torneo_id: torneo.id,
        alumno_id: alumnoId,
        profesor_id: profesor.id,
        datos_antropometricos: {
          grado: p.grado,
          fecha_nacimiento: p.fechaNacimiento,
          peso_kg: p.pesoKg,
          altura_cm: p.alturaCm,
        },
        estado: 'confirmado',
        confirmado_por: profesor.id,
        confirmado_en: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (errorInsc) throw errorInsc

    const { error: errorPriv } = await supabase
      .from('inscripciones_datos_privados')
      .upsert({ inscripcion_id: inscripcion.id, nivel_agresividad: p.nivelAgresividad })
    if (errorPriv) throw errorPriv

    await esperarError(120) // evitar ráfagas de rate-limit en auth.admin
  }

  const { count, error: errorCount } = await supabase
    .from('inscripciones')
    .select('id', { count: 'exact', head: true })
    .eq('torneo_id', torneo.id)
    .eq('estado', 'confirmado')
  if (errorCount) throw errorCount

  console.log(`\nTorneo semilla creado: ${NOMBRE_TORNEO}`)
  console.log(`Link de inscripción: /t/${torneo.link_token}`)
  console.log(
    `Inscripciones confirmadas: ${count ?? PARTICIPANTES.length}/${PARTICIPANTES.length} (usuarios: ${creados} nuevos, ${reutilizados} existentes)`,
  )
  console.log(`
Escenarios esperados al tocar "Generar llaves" en /panel:
  1. Blanco a punta amarilla · 8-9 años   -> 1 enfrentamiento (30 vs 34 kg)
  2. Blanco a punta amarilla · 10-11 años -> 2 libres (30 vs 36 kg: supera 5 kg)
  3. Blanco a punta amarilla · Hasta 7    -> 1 libre (único)
  4. Amarillo a punta azul · 21-34        -> 1 enfrentamiento (Fede-Gabi) + 1 libre (Hugo)
  5. Azul a punta negra · 35-50           -> 1 enfrentamiento (70 vs 85 kg, sin tope en adultos)`)
}

main().catch((error) => {
  console.error('Seed falló:', error?.message ?? error)
  process.exit(1)
})