# Plan: Etiquetas de grado por color + teléfono de contacto

> **Metadatos**
> - **Versión:** 1.0
> - **Estado:** Aprobado
> - **Fecha de aprobación:** 2026-09-21

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 0.1 | 2026-09-21 | Borrador. Decisiones del usuario: (1) etiquetas de grado solo color, sin "Gup", y Dan en números romanos ("Dan I"…"Dan IX"); (2) nuevo campo `telefono`, opcional; (3) el teléfono se muestra en formularios y detalle, no en el listado. |
| 1.0 | 2026-09-21 | Aprobado e implementado. |

## Restricciones y Correcciones Previas (No repetir)
1. **El enum `public.grado` NO cambia:** los identificadores ya son colores (`blanco`, `blanco_punta_amarilla`, …, `dan_1`). El cambio es solo de **etiquetas de UI** en `mobile/src/constants/grados.ts` (`ETIQUETAS_GRADO`). Afecta a los 4 usos de `etiquetaGrado`: listado, detalle, chips de alta y selección de instructor del onboarding.
2. **`alta_alumno` cambia de firma:** no se puede usar `create or replace` (generaría un overload); hay que `drop function` de la firma vieja y `create` de la nueva, con `revoke`/`grant` de la nueva firma.
3. **Torneos y `web/` congelados:** no se tocan.
4. **Teléfono opcional:** nullable en BD y en app; validación blanda `^[+0-9 ()-]{6,20}$` (vacío permitido). No se agrega al listado de alumnos.
5. **Patrones vigentes:** `CampoTexto`, `etiquetaGrado`, `ejecutarConsulta`/`MENSAJE_ERROR_GENERICO`/`reportarError()`; no reinventar.

## Contexto / objetivo
El usuario pidió que la UI deje de mostrar "10º Gup"…"1º Gup" y en cambio muestre el **color del cinturón**; además que los Dan se muestren como "Dan I"…"Dan IX". También pidió registrar un **número de celular de contacto normal** por perfil (además del contacto de emergencia).

## Cambios concretos

### 1. `mobile/src/constants/grados.ts`
- Valores de `ETIQUETAS_GRADO`: `Blanco`, `Blanco punta amarilla`, `Amarillo`, `Amarillo punta verde`, `Verde`, `Verde punta azul`, `Azul`, `Azul punta roja`, `Rojo`, `Rojo punta negra`, `Dan I` … `Dan IX`. `Sin grado` se mantiene.
- Sin cambios en `GRADOS`, `GRADOS_DAN`, `esGradoDan` ni `gradoSiguiente`.

### 2. BD — `supabase/migrations/20260921151255_contacto_telefono.sql`
- `alter table public.profiles add column telefono text;`
- `drop function if exists public.alta_alumno(text, text, date, numeric, public.genero, public.grado, numeric, text, text);`
- `create function public.alta_alumno(..., p_altura_cm numeric default null, p_telefono text default null, p_contacto_emergencia text default null, p_datos_salud text default null)` SECURITY DEFINER; incluye `telefono` en el `insert`.
- `revoke`/`grant` con la firma nueva (11 args).

### 3. `mobile/src/lib/perfil.ts`
- `PerfilOnboarding` y `AlumnoDetalle`: + `'telefono'`.
- `DatosPerfilACompletar` y `DatosAltaAlumno`: + `telefono: string | null`.
- Nuevo helper `esTelefonoValido(telefono: string)`.

### 4. `mobile/src/contextos/AuthGlobal.tsx`
- `CAMPOS_PERFIL_SELECT` + `telefono`; `completarPerfil` guarda `telefono`; `obtenerAlumnoDetalle` lo selecciona; `altaAlumno` envía `p_telefono: datos.telefono ?? undefined`.

### 5. Formularios y detalle
- `mobile/src/app/onboarding.tsx`: estado/prefill + `CampoTexto` "Teléfono / Celular (opcional)" (`phone-pad`) antes de contacto de emergencia.
- `mobile/src/app/(tabs)/instructor/alta-alumno.tsx`: ídem.
- `mobile/src/app/(tabs)/instructor/alumno/[id].tsx`: `<Fila etiqueta="Teléfono" …>`.

### 6. Types y documentación
- Regenerar `mobile/src/lib/database.types.ts` (columna `telefono` + `p_telefono`).
- Docs: este plan + `README.md`; `databaseModel.md` (`PROFILES` + `string telefono`); `mobile-directorio-alta-alumnos.md` (firma del RPC, `AlumnoDetalle`); `pendientes-pruebas.md` (ítem 9); `workflow-implementacion-mobile.md` (punto 7); SRS §3.1 (teléfono opcional).

## Criterios de aceptación y verificación
- [x] `npx supabase db push --linked` aplicado; verificado por API: columna `telefono` (text, nullable) y RPC `alta_alumno` con `p_telefono`.
- [x] `npx supabase db lint --linked`: único hallazgo el error preexistente de `sincronizar_resultado_en_vivo` (torneos, congelado).
- [x] `npm run typecheck` limpio con `database.types.ts` regenerado.
- [ ] (Dispositivo) Grados se muestran por color ("Blanco", "Amarillo punta verde", …, "Dan I"…"Dan IX") en listado, detalle, chips de alta y selección de instructor.
- [ ] (Dispositivo) Alta y onboarding permiten cargar el celular; se ve en el detalle; los vacíos quedan `null`.

---
🐧
