# Plan: Directorio y Alta de Alumnos Directos (Fase 4, ítem 1)

> **Metadatos**
> - **Versión:** 1.0
> - **Estado:** Aprobado
> - **Fecha de aprobación:** 2026-09-21

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 0.1 | 2026-09-21 | Borrador inicial. Decisiones del usuario: (1) el RPC de alta valida solo la bandera `es_profesor` (sin gate de Dan); (2) se incluye pantalla de detalle solo-lectura además del listado y el alta. |
| 1.0 | 2026-09-21 | Aprobado por el usuario e implementado. |

## Restricciones y Correcciones Previas (No repetir)
1. **`web/` congelada y torneos intactos:** no se tocan.
2. **Schema change:** `profiles.id` era FK a `auth.users(id)` sin default, sin política INSERT y sin Service Role en la app. La migración `alta_alumnos` **elimina la FK `profiles_id_fkey`** para permitir alumnos sin cuenta. Los perfiles con cuenta existentes siguen intactos; la capacidad futura de usuarios-alumno se conserva (una fila de `profiles` puede o no corresponder a un `auth.users`).
3. **Insert sin RLS:** el alta escribe vía RPC `SECURITY DEFINER` + `search_path = public`. La autorización (que `auth.uid()` sea `es_profesor = true`) se valida **dentro de la función**. Los triggers anti-escalada (`bloquear_auto_cambio_maestro`, `bloquear_auto_cambio_grado`, etc.) son `before update`: no bloquean el INSERT.
4. **Gate del alta:** solo `es_profesor = true` (consistente con la decisión de la tab Instructor); sin exigir `grado_actual >= dan_1`.
5. **Patrones vigentes obligatorios:** `ejecutarConsulta`/`registrarError`/`MENSAJE_ERROR_GENERICO`/`reportarError()`; validaciones reutilizadas de `mobile/src/lib/perfil.ts` (`esDniValido`, `esPesoValido`, `esAlturaValida`, `fechaValidaNacimiento` con `EDAD_MINIMA_ANIOS = 4`, `parsearNumero`, `calcularEdad`, `aIsoLocal`); `verificarDniDisponible` antes del alta. No importar de `@react-navigation/*` → `Stack`, `Redirect`, `useFocusEffect`, `useRouter` se importan de `expo-router`.
6. **No reinventar selectores:** se replicó el patrón del onboarding (pills de género, DateTimePicker con "Edad calculada", chips de grado).
7. **Detalle/edición/baja:** este ítem abarca listado, alta y **detalle solo-lectura**; editar/bajar alumnos queda para el ítem 2 (no se creó código de edición/baja).
8. **Fail gracefully:** toda comunicación con BD en try/catch; errores no previstos → mensaje genérico + `reportarError()`.

## Contexto / objetivo
Cubrir el ítem 1 de la Fase 4 del workflow: el profesor puede **listar sus alumnos directos** (filtro RLS `maestro_id = auth.uid()`), **dar de alta** fichas de alumnos sin cuenta de usuario (`profiles.maestro_id` fijado al profesor al alta, inamovible por el alumno) y **ver el detalle** de cada ficha. Se activaron las opciones "Mis alumnos" y "Alta de alumno" del menú Instructor; el resto queda "Próximamente".

## Cambios concretos

### 1. BD — `supabase/migrations/20260921135535_alta_alumnos.sql`
- `alter table public.profiles drop constraint if exists profiles_id_fkey;`
- RPC `alta_alumno(p_nombre_completo text, p_dni text, p_fecha_nacimiento date, p_peso_kg numeric, p_genero public.genero, p_grado_actual public.grado, p_altura_cm numeric default null, p_telefono text default null, p_contacto_emergencia text default null, p_datos_salud text default null) returns uuid` — SECURITY DEFINER, `search_path = public`, grant `authenticated`, revoke `public`/`anon`. *(v posterior: `p_telefono` se agregó en `mobile-grado-colores-y-telefono`; ver ese plan.)*
  - Valida: llamador con `es_profesor = true`; nombre no vacío; DNI `^\d{7,8}$` y no duplicado; fecha no nula/no futura; peso > 0; género/grado no nulos; altura opcional en [50, 230].
  - Inserta `id = gen_random_uuid()`, `maestro_id = auth.uid()`; retorna el `id` creado.

### 2. Types — regenerar `mobile/src/lib/database.types.ts`
- `npx supabase db push --linked` → `npx supabase lint --linked` → `npx supabase gen types typescript --linked > mobile/src/lib/database.types.ts` (tipa `alta_alumno` y saca la FK `auth.users`).

### 3. `mobile/src/lib/perfil.ts`
- `AlumnoDirecto` (`id, nombre_completo, dni, fecha_nacimiento, genero, grado_actual, contacto_emergencia`), `DatosAltaAlumno`, `AlumnoDetalle` (ficha completa + `telefono` + `creado_en`).

### 4. `mobile/src/contextos/AuthGlobal.tsx`
- `listarAlumnosDirectos()` → `profiles.select(...).eq('maestro_id', uid).order('nombre_completo')` (RLS `profiles_select_maestro_directo`).
- `obtenerAlumnoDetalle(id)` → `.eq('id', id).eq('maestro_id', uid).single()`.
- `altaAlumno(datos)` → `rpc('alta_alumno', {...})`.
- Las tres vía `ejecutarConsulta`, agregadas al tipo/valor/deps.

### 5. `mobile/src/app/(tabs)/instructor/_layout.tsx` (nuevo)
- `<Stack>` de la sección; guard central `if (!esProfesorBandera) return <Redirect href="/" />`. Headers activos para `alumnos` ("Mis alumnos"), `alta-alumno` ("Alta de alumno") y `alumno/[id]` ("Detalle del alumno"); `index` sin header.

### 6. `mobile/src/app/(tabs)/instructor/index.tsx` (editado)
- Se quitó el `Redirect` (centralizado en `_layout`). "Mis alumnos" y "Alta de alumno" activas con `router.push`; el resto sigue "Próximamente".

### 7. `mobile/src/components/FilaOpcionMenu.tsx` (editado)
- Props `habilitada` y `onPresionar`; fila activa con chevron `›` (sin badge "Próximamente"); el modo deshabilitado no cambió.

### 8. `mobile/src/app/(tabs)/instructor/alumnos.tsx` (nuevo)
- Recarga con `useFocusEffect`; estados cargando/error (Reintentar)/vacío (CTA de alta)/lista; filas navegan al detalle; botón "Nuevo alumno".

### 9. `mobile/src/app/(tabs)/instructor/alta-alumno.tsx` (nuevo)
- Formulario con obligatorios (nombre, DNI, fecha + edad, peso, género, grado) y opcionales (altura, contacto, datos de salud); validación previa de DNI; `altaAlumno` → `router.replace('/instructor/alumnos')`.

### 10. `mobile/src/app/(tabs)/instructor/alumno/[id].tsx` (nuevo)
- Detalle solo-lectura con `obtenerAlumnoDetalle`; estados cargando/error/no encontrado.

### 11. Documentación
- Este plan + fila en `README.md`; ítem en `pendientes-pruebas.md`; `databaseModel.md` (profiles sin FK a `auth.users`); Fase 4, ítem 1 marcado en `workflow-implementacion-mobile.md`.

## Criterios de aceptación y verificación
- [x] Migración creada con `npx supabase migration new alta_alumnos`.
- [x] `npx supabase db push --linked` aplicado; verificado por API que no existe `profiles_id_fkey` y que `alta_alumno` es `SECURITY DEFINER` con los args esperados.
- [x] `npx supabase db lint --linked`: único hallazgo un error preexistente en `public.sincronizar_resultado_en_vivo` (módulo de torneos, congelado; no se toca).
- [x] `npm run typecheck` limpio en `mobile/` con `database.types.ts` regenerado (`alta_alumno` tipado).
- [x] `git status`: solo `mobile/`, `supabase/` y `documentacion/`; `web/` intacto.
- [ ] (Dispositivo) Profesor (`es_profesor = true`) ve el directorio; vacío muestra el CTA de alta.
- [ ] (Dispositivo) Alta exitosa: aparece en el directorio con `maestro_id` = profesor; DNI duplicado bloquea; validaciones por campo.
- [ ] (Dispositivo) Detalle navega y muestra la ficha completa (solo lectura).
- [ ] (Dispositivo) Deep link a `/instructor/alumnos` o `/instructor/alta-alumno` sin faceta → redirige a `/`.

---
🐧
