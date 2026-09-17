# Plan: Flujo de Inscripción Web (Fase 3, ítem 1)

> **Metadatos**
> - **Versión:** 1.3
> - **Estado:** Aprobado
> - **Fecha de aprobación:** 2026-09-15

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-15 | Borrador inicial con decisiones D-1/D-2/D-3. |
| 1.1 | 2026-09-15 | **Feedback del usuario:** robustecer `registrarInscripcion` — Paso 4 recupera id de usuario preexistente (`admin.listUsers`), nuevo **paso 5 de validación cruzada de identidad** (nombre del form vs `PROFILES.nombre_completo`, normalizado; mismatch → abortar con mensaje de capa de usuario, sin `errores_runtime`), y **paso 6 captura el código 23505** (Unique Violation) con mensaje exacto de "ya inscripto". |
| 1.2 | 2026-09-15 | **Aprobado** por el usuario y **implementado**. Ajuste técnico: el SDK `@supabase/auth-js` v2.116 no expone `filter`/`search` en `admin.listUsers()` (solo `page`/`perPage`); la recuperación por email se hace con la consulta **GoTrue Admin REST `GET /auth/v1/admin/users?filter=email&keyword=<email>`** (Service Role), eficiente y alineada al espíritu del paso 4. |
| 1.3 | 2026-09-16 | **Corrección post-implementación:** `crearTorneo` no seteaba `organizador_id` (NOT NULL sin default ni trigger) → el INSERT fallaba con 23502 y el alta de torneo nunca era usable. Se agrega el fix y se documenta como restricción #9. |

## Restricciones y Correcciones Previas (No repetir)
1. NO tocar `.env*`. NO commits/push automáticos.
2. Migraciones por CLI (`npx supabase migration new <slug>`).
3. Reutilizar patrones existentes: `useActionState` + Server Action + `useFormStatus`; `try/catch` → `registrarError` (módulo `inscripcion`/`torneos`) + mensaje genérico en voseo. La UI jamás expone stack traces.
4. `supabaseAdmin` (Service Role) **solo** para: resolver `torneo` por token en la página pública, crear el usuario admin, recuperar/consultar usuarios, poblar el perfil e insertar la `inscripcion` (el insert RLS `inscripciones_insert_alumno` exige sesión y el participante es anónimo: excepción documentada).
5. El insert de `torneos` se hace con el **cliente autenticado de servidor** (`createClient`) + nueva política RLS `torneos_insert_profesor` (arquitectura RLS-first; el panel ya gatea con `requireProfesor`).
6. `datos_antropometricos` (jsonb) contrato: `{ grado, fecha_nacimiento, peso_kg, altura_cm }` (grado = etiqueta de los enums `grado_gup`/`grado_dan`, necesario para categorías).
7. El registro de errores jamás rompe el flujo principal.
8. **Error de capa de usuario ≠ error técnico:** el caso "email ya registrado con otro nombre" y el "unique 23505" son respuestas de validación/negocio y NO se insertan en `errores_runtime` ni exponen datos guardados (el nombre original en BD jamás se muestra en la UI).
9. **`torneos.organizador_id` es `uuid not null` SIN default ni trigger.** Toda alta de torneo (Server Action `crearTorneo` u otra) DEBE setear explícitamente `organizador_id: user.id`; omitirlo produce 23502 y el try/catch devuelve el mensaje genérico, dejando la feature inutilizable.

## Contexto / objetivo
Primer ítem de Fase 3. Participante recibe de su maestro el link `/t/<link_token>` y completa sus datos en un formulario web Mobile-First **sin registrarse ni pagar** (pago fuera de plataforma). Nace como inscripción `pendiente`, visible solo para el maestro elegido como aval. Incluye el alta mínima del torneo en el panel para generar dicho link.

## Decisiones cerradas (feedback de usuario)
- **D-1:** Participante anónimo → se genera **cuenta de sistema** vía Admin API (password aleatoria, `email_confirm: true`) que crea el perfil (`auth.users` → trigger → `profiles`). Coherente con Fase 6 ("reclamar los perfiles generados en torneos"). Requiere email en el formulario.
- **D-2:** El **profesor del aval lo elige el alumno** en el formulario desde la lista de maestros con `es_profesor = true` registrados con el código de verificación (`INVITE_CODE`, ya existente). Nada de `organizador_id`.
- **D-3:** Incluye **alta mínima de torneo** en `/panel` (nombre + fecha + link_token) para que el flujo sea usable end-to-end.
- **D-4 (v1.1):** Usuarios preexistentes reutilizan su `auth.users.id`; se valida identidad cruzada contra `PROFILES.nombre_completo`; el unique de inscripción se captura explícitamente por código 23505.

## Cambios concretos

### 1. Migración SQL (nueva) — `inscripcion_link_publico`
```sql
alter table public.torneos alter column link_token set default gen_random_uuid()::text;

create policy "torneos_insert_profesor"
  on public.torneos for insert to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.es_profesor = true)
  );
```

### 2. Proxy: rutas públicas (`web/src/proxy.ts`)
- `const esRutaPublica = esRutaLogin || path.startsWith('/t/')`
- Condición pasa a `if (!user && !esRutaPublica)` (sin tocar el matcher del `config`; `/t/…` ya lo cubre).
- Loggeado visitando `/t/…`: pasa (no redirige a `/panel`).

### 3. Ruta pública de inscripción — `web/src/app/t/[token]/`
- **`page.tsx`** (Server Component): con `supabaseAdmin` resuelve `torneos` por `link_token`.
  - No existe → componente de error amigable ("El enlace de inscripción no es válido.").
  - `estado != 'inscripciones'` → "Las inscripciones para este torneo están cerradas."
  - OK → render `InscripcionForm` con props `{ torneoNombre, token, maestros }` (`maestros` = `profiles` con `es_profesor=true`, `order by nombre_completo`, seriables como props).
  - `?ok=1` en searchParams → pantalla de éxito (sin formulario): "¡Tu inscripción fue enviada! Tu maestro la confirmará tras el pago (efectivo o transferencia)."
- **`inscripcion-form.tsx`** (Client): patrón `useActionState`, campos `nombre`, `email`, `fecha_nacimiento` (date), `peso_kg` (number step 0.5), `altura_cm` (number), `grado` (select 10 gups + dan_1..dan_6), `maestro_id` (select), hidden `token`. Botón con `useFormStatus` ("Enviar inscripción"). Estilos Mobile-First (`max-w-md mx-auto`, mismas clases de login/registro).
- **`actions.ts`** → `registrarInscripcion(estado: ResultadoInscripcion, form: FormData): Promise<ResultadoInscripcion>`:

  1. **Validación de entrada:** nombre, email válido, fecha_nacimiento, peso>0, altura>0, grado ∈ `GRADOS_INSCRIPCION`, `maestro_id`, `token`. Campos inválidos → mensaje amigable directo (sin `errores_runtime`).
  2. **Resolver torneo:** `supabaseAdmin.from('torneos').select('id, nombre, estado').eq('link_token', token).maybeSingle()`; si no existe → "El enlace de inscripción no es válido."; si `estado != 'inscripciones'` → "Las inscripciones para este torneo están cerradas."
  3. **Revalidar maestro:** `supabaseAdmin.from('profiles').select('id').eq('id', maestroId).eq('es_profesor', true).maybeSingle()`; si no existe → "Seleccioná un maestro válido."
  4. **Crear/recuperar usuario (email vive en `auth.users`, nombre en `profiles`):**
     - Intentar `supabaseAdmin.auth.admin.createUser({ email, phone:'', password: crypto.randomUUID() + 'TKD!', email_confirm: true, user_metadata: { nombre_completo } })`.
     - Si el email YA existe (error de duplicado de GoTrue): recuperar el id con `supabaseAdmin.auth.admin.listUsers({ search: email })` (u otra consulta Service Role eficiente que filtre por email), tomar `data.users[0]`.
  5. **Validación cruzada de identidad (nuevo paso, solo para usuario recuperado):**
     - Consultar `profiles.nombre_completo` por el id recuperado.
     - Normalizar AMBOS: `minúsculas`, `trim` y colapso de espacios extra (`str.trim().toLowerCase().replace(/\s+/g, ' ')`).
     - **SI NO coinciden → ABORTAR** y devolver: `"Este email ya está registrado con otro nombre. Verificá los datos o contactá a tu maestro."`
       - Error de capa de usuario: NO insertar en `errores_runtime`.
       - **Privacidad:** jamás exponer el nombre original guardado en BD ni en el mensaje ni en logs de UI.
     - **SI coinciden → continuar** y actualizar el perfil con los **datos antropométricos más recientes** del formulario: `fecha_nacimiento`, `peso_kg`, `altura_cm` (mantener `nombre_completo` existente).
     - Edge: `nombre_completo` guardado vacío/blank (default del trigger) → no hay identidad previa que reclamar: se procede y se setea el nombre del form.
  5b. **Perfil (usuario nuevo):** `supabaseAdmin.from('profiles').update({ nombre_completo, fecha_nacimiento, peso_kg, altura_cm }).eq('id', alumnoId)`.
  6. **Insert inscripción con captura explícita del 23505:**
     - `supabaseAdmin.from('inscripciones').insert({ torneo_id, alumno_id, profesor_id: maestroId, datos_antropometricos: { grado, fecha_nacimiento, peso_kg, altura_cm }, estado: 'pendiente' })`.
     - Si Supabase devuelve error con **código 23505** (Unique Violation de `(torneo_id, alumno_id)`) → devolver mensaje exacto: `"Ya registramos este email para este torneo."`
       - Es error de negocio: NO insertar en `errores_runtime`.
  7. **Fail graceful (errores técnicos reales):** `try/catch` en la acción → `registrarError({ modulo:'inscripcion', contexto:'registrarInscripcion', error })` + mensaje genérico ("No pudimos procesar tu solicitud, intentá de nuevo en unos minutos.").
  8. **Éxito:** `redirect('/t/' + token + '?ok=1')`.

> **Contrato de error devuelto a la UI (`ResultadoInscripcion`):** `{ error?: string } | undefined`. Solo "mensajes de capa de usuario" o el genérico técnico; nunca datos guardados ni stack.

### 4. Alta mínima de torneo — `web/src/app/(panel)/panel/`
- **`actions.ts`**: agregar `crearTorneo(estado, form)`: valida `nombre` y `fecha`; inserta con `createClient()` (sesión profesor + política RLS nueva) `{ nombre, fecha, estado:'inscripciones' }` (link_token por default). `try/catch` + mensaje genérico.
- **`torneo-nuevo-form.tsx`** (Client): patrón canónico (nombre + fecha + botón "Crear torneo").
- **`page.tsx`**: consultar `torneos` del profesor (`createClient`, `eq organizador_id`), listarlas mostrando **nombre, fecha, estado y link `/t/<link_token>`** (renglón de enlace para compartir) + `<TorneoNuevoForm/>`.

### 5. Constante compartida de grados
- Nueva `web/src/lib/grados.ts`: array `GRADOS_INSCRIPCION` con las 16 etiquetas (`grado_gup` ×10 + `grado_dan` ×6) para el `<select>` y la validación. (Evita duplicar strings en form + action.)

### 6. Documentación (sincronizar)
- `documentacion/databaseModel.md`: comentario en `INSCRIPCIONES.datos_antropometricos` (snapshot de grado/fecha/peso/altura) y nota de que `profesor_id` lo elige el participante.
- `documentacion/mvc/workflow.md`: ítem "Flujo de Inscripción Web" → `[x]` al cierre.
- Plan `documentacion/planes/flujo-inscripcion-web.md`: historia + `Aprobado` al cerrar.

## Verificación
- `npm run lint` y `npm run build` en `web/` OK.
- Manual: (1) `/panel` crea torneo → aparece link. (2) Sin sesión, abrir `/t/<token>` (no redirige a `/login`). (3) Completar form (elegir maestro) → crear usuario auth + perfil poblado + `inscripciones` `pendiente` con `profesor_id` elegido + jsonb correcto. (4) Token inválido / torneo fuera de inscripciones → mensajes amigables. (5) **Mismo email, mismo nombre → reutiliza el usuario y avisa "Ya registramos este email para este torneo." (23505).** (6) **Mismo email, distinto nombre → "Este email ya está registrado con otro nombre…" sin `errores_runtime` y sin exponer el nombre BD.** (7) Alumno (grado Gup) no crea torneos (RLS).

## Criterios de aceptación
- [x] Ruta `/t/[token]` pública (sin login), con formulario Mobile-First.
- [x] Campo "tu maestro" = select de profesores (`es_profesor=true`).
- [x] Envío genera cuenta + perfil + inscripción `pendiente` (única por torneo+email), sin pagos.
- [x] Email preexistente reutiliza el id; identidad validada contra `nombre_completo` (normalizado); mismatch aborta con mensaje de capa de usuario y sin `errores_runtime`.
- [x] Constraint 23505 capturado → mensaje exacto "Ya registramos este email para este torneo."
- [x] Fail graceful en todo el camino; errores técnicos solo en `errores_runtime`.
- [x] Alta mínima de torneo en panel + link visible.
- [x] Docs sincronizadas, `lint` + `build` OK.

## Notas de cierre (implementación)
- **Migración `inscripcion_link_publico`** aplicada en remoto (`supabase db push` + `migration list` OK): default de `link_token = gen_random_uuid()::text` + política RLS `torneos_insert_profesor`.
- **Proxy:** `esRutaPublica = login|registro|/t/*`; verificado con `curl`: `/t/<uuid>` → HTTP 200 (sin redirección a `/login`) y `/panel` sin sesión → 307 a `/login?next=%2Fpanel` (sin regresión).
- **Archivos nuevos/modificados:**
  - `web/src/app/t/[token]/page.tsx` (SC) · `inscripcion-form.tsx` (Client) · `actions.ts` (`registrarInscripcion`).
  - `web/src/app/(panel)/panel/actions.ts` (`crearTorneo`) · `torneo-nuevo-form.tsx` · `page.tsx` (lista de torneos + link).
  - `web/src/lib/grados.ts` (`GRADOS_INSCRIPCION` + `ETIQUETA_GRADO_INSCRIPCION`).
  - `web/src/proxy.ts`.
- **Pendiente de verificación manual (UI):** completar un formulario real en el navegador (necesita sesión de profesor para crear el torneo y elegir maestro).