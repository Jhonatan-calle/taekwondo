# Plan: Inicialización del Backend y Base de Datos (Supabase)

> **Metadatos**
> - **Versión:** 1.2
> - **Estado:** Aprobado

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-14 | Borrador inicial. |
| 1.1 | 2026-09-14 | Correcciones del revisor: proyecto y credenciales ya creados (paso 1 = poblar `.env.local` + `supabase link`); generación de migración estricta por CLI (`migration new`); políticas RLS completas (profiles, errores_runtime, torneos, inscripciones); trigger Auth → `profiles` con `SECURITY DEFINER`. |
| 1.1 | 2026-09-14 | **Aprobado** por el usuario. Único ajuste de implementación: `nivel_agresividad` movido a tabla aparte `inscripciones_datos_privados` para garantizar el aislamiento total del dato frente al alumno con RLS. |
| 1.2 | 2026-09-15 | Implementación completa. Corrección de índice inválido en la migración inicial; migración adicional `politicas_rls` (RLS en 14 tablas + 11 políticas). `supabase link` + `db push` OK con token corregido; `/api/health` verificado → 200. |

## Restricciones y Correcciones Previas (No repetir)
1. **NO tocar archivos `.env*`.** Se versiona únicamente `web/.env.example`; `web/.env.local` se puebla en local y debe permanecer ignorado por git.
2. **NO escribir lógica de negocio aún.** Modelado profundo de roles/linaje → Fase 2 del workflow.
3. **RLS obligatorio desde el día uno** y con **políticas explícitas por tabla** (ver sección 4). Sin políticas, las tablas quedan inaccesibles al activar RLS.
4. **La creación del proyecto Supabase y la obtención de credenciales YA fueron realizadas manualmente por el usuario.** Esta fase no incluye la etapa de creación.
5. **Nomenclatura de migraciones:** el archivo se genera **exclusivamente con el CLI** (`npx supabase migration new esquema_inicial`), que asigna el prefijo de timestamp correcto. NO usar nombres de archivo arbitrarios.
6. Stack de `documentacion/mvc/stack.md`: PostgreSQL vía Supabase, TypeScript compartido; código y comentarios en español; *fail gracefully* registrando en `errores_runtime`.
7. **Trigger con `SECURITY DEFINER`** para que la inserción inicial en `profiles` no sea bloqueada por RLS.

## Contexto / objetivo
Con el proyecto Supabase ya creado y las credenciales obtenidas, conectar el frontend de `web/`, aplicar el **esquema completo inicial** y activar las **políticas RLS** desde el día uno (perfiles + módulo de torneos + clases/asistencia + graduaciones + `errores_runtime` + sync Auth→perfiles). Ítem 2 de Fase 1 del workflow.

## Cambios concretos

### 1. Vinculación del proyecto Supabase (ya creado por el usuario)
1. Copiar la plantilla `web/.env.example` → `web/.env.local` y cargar los valores reales: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
2. Ejecutar dentro de `web/`:
   - `supabase login` (una vez, token de acceso del CLI, si no está logueado).
   - `npx supabase link --project-ref zxzcgkcbzrgbgnsmrtkv` desde `web/supabase/`.

### 2. Dependencias + cliente Supabase en `web/`
- `npm install @supabase/supabase-js`
- `npm install -D supabase`
- Crear:
  - `web/.env.example` (sin valores reales, versionable).
  - `src/lib/supabase/client.ts` → cliente anónimo del navegador (Client Component).
  - `src/lib/supabase/server.ts` → cliente de servidor con `SUPABASE_SERVICE_ROLE_KEY` (Route Handlers / Server Components).

### 3. Migración inicial (generada por CLI obligatoriamente)
1. `npx supabase init` dentro de `web/`.
2. `npx supabase migration new esquema_inicial`.
3. Completar el archivo generado (`<timestamp>_esquema_inicial.sql`) con:
   - `create extension if not exists pgcrypto;`
   - `grados` (enum: blanco → dan_6).
   - `profiles` (id pk → `auth.users`, nombre_completo, fecha_nacimiento, peso_kg, altura_cm, contacto_emergencia, datos_salud, grado_actual, `maestro_id` self-ref).
   - `grupos` (profesor_id, nombre, ubicacion, horarios, `codigo_invitacion` UNIQUE).
   - `miembros_grupo` (grupo_id, alumno_id, estado `pendiente`/`activo`).
   - `clases` y `asistencia`.
   - `torneos` (nombre, fecha, `link_token` UNIQUE, organizador_id, estado).
   - `inscripciones` (torneo_id, alumno_id, datos_antropometricos jsonb, estado `pendiente`/`confirmado`/`rechazado`, profesor_id aval, confirmado_por, confirmado_en).
   - `inscripciones_datos_privados` (inscripcion_id pk, `nivel_agresividad`) — aislado del alumno.
   - `categorias`, `llaves`, `enfrentamientos`, `jurados_torneo`.
   - `graduaciones` (sinodal_id, grado_anterior/nuevo, aprobado).
   - `errores_runtime` (esquema del anexo del workflow).
   - **Trigger** `public.manejar_nuevo_usuario()` con `SECURITY DEFINER` + trigger `AFTER INSERT ON auth.users`.

### 4. Políticas RLS completas (obligatorio, por tabla)
- **`profiles`:** `SELECT` authenticated; `UPDATE` solo propio (`auth.uid() = id`).
- **`errores_runtime`:** `INSERT` anon/authenticated; `SELECT` restringido (ningún usuario común).
- **`torneos`:** `SELECT` público (anon/authenticated).
- **`inscripciones`:** alumno solo filas propias; profesor filas con `profesor_id = auth.uid()`; organizador solo `estado='confirmado'`.
- **`inscripciones_datos_privados`:** sin `SELECT` para anon/authenticated; `INSERT`/`UPDATE` solo para el profesor de la inscripción (y organizador en update). Lectura server-side vía service role.

### 5. Verificación
1. Route Handler `src/app/api/health/route.ts` (Server, try/catch) → `select 1`, responde `{ status: "ok", db: "connected" }`.
2. Comprobar tablas + RLS activo (listado de políticas).
3. Probar acceso por rol (alumno sin ver `nivel_agresividad`; organizador sin ver pendientes).
4. Verificar trigger: usuario nuevo ⇒ fila en `profiles`.
5. `npm run lint` y `npm run build`.

## Criterios de aceptación y verificación
- [x] `web/.env.local` poblado y `supabase link` exitoso.
- [x] `web/.env.example` versionado sin secretos.
- [x] Migración generada por `migration new` y aplicada con `db push`; tablas presentes.
- [x] Trigger Auth → `profiles` operativo.
- [x] RLS activo con políticas de la sección 4.
- [x] `/api/health` → 200 con BD conectada.
- [x] Lint + build OK.
- [x] Ítem 2 de Fase 1 `[x]` en `documentacion/mvc/workflow.md`.
- [x] Diferido: Autenticación (Supabase Auth) → ítem 3 de Fase 1.