# Plan: Establecimiento del Linaje — (Fase 2, ítem 3 del workflow)

> **Metadatos**
> - **Versión:** 1.0
> - **Estado:** Aprobado
> - **Fecha de aprobación:** 2026-09-20

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-20 | Borrador aprobado por el usuario e implementado. Decisión del usuario: el usuario elige a su instructor/maestro de una **lista** (en lugar de código de invitación). En revisión se agregó: el instructor/maestro elegido debe **aceptar/verificar** la solicitud desde su perfil → flujo de solicitud (pendiente → aceptada/rechazada); el `maestro_id` se persiste recién al aceptar. Obligatorio en onboarding salvo que el usuario sea `es_maestro = true` (el dueño lo siembra a mano desde Supabase). |

## Restricciones y Correcciones Previas (No repetir)
1. **`web/` congelada y módulo de torneos intacto:** no se tocan.
2. **RLS en cascada:** el usuario nuevo no puede listar perfiles → el listado de instructores sale de un RPC `SECURITY DEFINER` con salida controlada (`id`, `nombre_completo`, `grado_actual`, `es_profesor`, `es_maestro`; jamás `dni`), y la tabla `solicitudes_linaje` guarda un **snapshot** `nombre_alumno` (patrón del proyecto, como `inscripciones.datos_antropometricos`) para que el instructor liste sin romper la privacidad.
3. **Escrituras SOLO vía RPC SECURITY DEFINER:** toda mutación pasa por `solicitar_linaje` y `resolver_solicitud_linaje`. Sin INSERT/UPDATE/DELETE directos sobre `solicitudes_linaje` (excepto SELECT por RLS propio/instructor).
4. **Patrón de escritura del sistema:** `maestro_id` está bloqueado por `bloquear_auto_cambio_maestro`; se reutiliza el flag existente `set_config('app.derivacion_linaje','on',true)` (mismo que usa `vincular_linaje_al_aprobar`). No reimplementar.
5. **Linaje inamovible:** al aceptar, el UPDATE usa `WHERE maestro_id is null` (única vez). El cliente jamás envía `maestro_id` en updates.
6. **Maestro = raíz del árbol:** quien tiene `es_maestro = true` no elige instructor ni envía solicitud; el RPC `solicitar_linaje` lo rechaza. El RPC `resolver_solicitud_linaje` solo lo invoca el instructor destino de la solicitud.
7. **Código de invitación FUERA de alcance (decisión del usuario):** v1 solo lista. La alternativa por código queda cubierta por `grupos.codigo_invitacion` + trigger `vincular_linaje_al_aprobar` (Fase 4).
8. **Solo profesores y maestros** (`es_profesor` o `es_maestro`) con `nombre_completo` no vacío, excluyendo `auth.uid()`.
9. **Fail gracefully:** toda llamada vía `ejecutarConsulta` (módulo `'perfil'`), mensaje genérico en UI, sin stack traces.
10. **Migraciones solo con `npx supabase migration new <slug>`**; tipos de BD incorporados manualmente a `database.types.ts` (no hay token para `supabase gen types`).

## Contexto / objetivo
Persistir `profiles.maestro_id` del usuario nuevo **con confirmación del instructor/maestro elegido**: el alumno elige de una lista en el onboarding, queda una solicitud pendiente y el instructor la acepta/rechaza desde su pantalla principal. Obligatorio para completar el onboarding salvo `es_maestro=true`.

## Cambios concretos

### 1. BD — migración `establecer_linaje`
- `solicitudes_linaje` (`id`, `alumno_id → profiles`, `instructor_id → profiles`, `nombre_alumno` snapshot, `estado` `pendiente|aceptada|rechazada`, `creado_en`, `resuelto_en`, `unique (alumno_id, instructor_id)`).
- RLS: SELECT propio (`alumno_id = auth.uid()`) + instructor (`instructor_id = auth.uid()`). Sin políticas de escritura directa.
- `lista_instructores_linaje()` → `table(id, nombre_completo, grado_actual, es_profesor, es_maestro)`; `SECURITY DEFINER`, `stable`, `search_path = public`; filtros (facetas, nombre no vacío, `id <> auth.uid()`), orden por nombre; `grant execute to authenticated`.
- `solicitar_linaje(p_instructor uuid)` → `boolean`; `SECURITY DEFINER`, `plpgsql`: rechaza Maestro raíz / sin perfil / ya con maestro / instructor inválido; reutiliza una solicitud rechazada previa del par (unique) o inserta nueva con snapshot; true si queda pendiente, false si ya fue aceptada.
- `resolver_solicitud_linaje(p_solicitud uuid, p_resultado text)` → `boolean`; `SECURITY DEFINER`: solo el `instructor_id` de la solicitud; `aceptada` → `set_config('app.derivacion_linaje','on',true)` + `update profiles set maestro_id = instructor where id = alumno and maestro_id is null`; marca estado y `resuelto_en`.

### 2. `mobile/src/lib/database.types.ts`
- Tabla `solicitudes_linaje` (Row/Insert/Update + relaciones a profiles) y funciones `lista_instructores_linaje`, `solicitar_linaje`, `resolver_solicitud_linaje`.

### 3. `mobile/src/lib/perfil.ts`
- `PerfilOnboarding` += `es_maestro`, `es_profesor`, `maestro_id`.
- Tipos `InstructorLinaje` (id, nombre_completo, grado_actual, es_profesor, es_maestro) y `SolicitudLinaje` (id, nombre_alumno, estado, creado_en).

### 4. `mobile/src/constants/grados.ts`
- `ETIQUETAS_GRADO` + `etiquetaGrado(grado)` para mostrar el cinturón del instructor.

### 5. `mobile/src/contextos/AuthGlobal.tsx`
- `CAMPOS_PERFIL_SELECT` += `es_maestro, es_profesor, maestro_id`.
- Estado `linajeEnCurso` (¿hay solicitud pendiente propia?) refrescado en `refrescarPerfil` (query `solicitudes_linaje` pendiente propia vía RLS). Reset en `SIGNED_OUT`/`cerrarSesion`.
- Derivados memorizados: `esMaestro`, `linajeEstablecido` (maestro_id != null), `onboardingCompleto = perfilCompleto && (esMaestro || linajeEstablecido || linajeEnCurso)`, `esProfesor`.
- Funciones: `listarInstructores`, `solicitarLinaje` (RPC; refresca `linajeEnCurso` al exito), `listarSolicitudesPendientes` (RLS: `instructor_id = auth.uid()`, `estado='pendiente'`), `resolverSolicitudLinaje` (RPC `aceptada|rechazada`).

### 6. `mobile/src/app/onboarding.tsx`
- Prefill de datos personales desde `perfil` (parciales ya completos o re-ingreso tras rechazo).
- Carga de `listarInstructores()` solo si `necesitaLinaje = !esMaestro && !tieneLinajeEstablecido` (loading / error con "Reintentar" / lista vacía bloqueante).
- Selector "Tu instructor / maestro *": lista vertical de `Pressable` (estilo `#C62828`) con nombre + `Maestro|Profesor · <grado>`; validación obligatoria.
- Maestro (`es_maestro`) → muestra "tu linaje se define a nivel de administración", sin selector. Si ya tiene maestro → nota bloqueada.
- Submit: `completarPerfil` → si `necesitaLinaje`, `solicitarLinaje(instructorSeleccionado)`; navega a `/` vía guard (efecto sobre `onboardingCompleto`).

### 7. `mobile/src/app/_layout.tsx`
- Guards con `onboardingCompleto`: `index` → `sesion && onboardingCompleto`; `onboarding` → `sesion && !onboardingCompleto`.

### 8. `mobile/src/app/index.tsx`
- Banner "Tu instructor todavía no confirmó tu registro" si `!esMaestro && !linajeEstablecido`.
- Sección "Solicitudes de alumnos" si `es_profesor || es_maestro`: lista pendientes (snapshot del nombre) con **Aceptar** / **Rechazar** (vía `resolverSolicitudLinaje`), wording de "Aceptando…", reintentar ante error.

### 9. Documentación
- Este plan + fila en `documentacion/README.md`, item en `documentacion/pendientes-pruebas.md` y nota de decisión en el ítem 3 de Fase 2 de `workflow-implementacion-mobile.md`.

## Criterios de aceptación y verificación
- [x] `npm run typecheck` limpio en `mobile/`.
- [x] `supabase db lint --linked` sin errores nuevos (queda el issue pre-existente de torneos congelado).
- [x] `supabase db push --linked` aplicado a la BD remota (junto con `verificar_dni_disponible`).
- [ ] (Dispositivo) Nuevo alumno elige instructor → queda solicitud pendiente en `solicitudes_linaje`; `maestro_id` sigue `null`; entra a `index` con banner de confirmación pendiente.
- [ ] (Dispositivo) El instructor ve la solicitud en su pantalla; **Aceptar** → `maestro_id` setado (única vez) y el banner del alumno desaparece al refrescar; **Rechazar** → el alumno vuelve al onboarding a elegir de nuevo.
- [ ] (Dispositivo) Maestro (`es_maestro`) completa onboarding sin elegir instructor y entra a `index`.
- [ ] (Dispositivo) Lista vacía → aviso bloqueante; luego de conferir un instructor, aparece.
- [ ] (Dispositivo) Un usuario con `maestro_id` no puede modificarlo (trigger + UI no lo expone).
- [ ] `git status`: `supabase/` solo con la migración nueva; `web/` intacto.

---
🐧