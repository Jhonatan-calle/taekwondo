# Plan: Refresco del linaje en tiempo real — `mobile-refresco-linaje-tiempo-real.md`

## Metadatos
- **Versión:** 1.1
- **Estado:** Aprobado
- **Fecha:** 2026-09-23
- **Fecha de aprobación:** 2026-09-23

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-23 | Borrador inicial: la cuenta pendiente de linaje se actualiza en vivo (Realtime sobre `profiles` y `solicitudes_linaje`) + refresh al recuperar foco como fallback. |
| 1.1 | 2026-09-23 | **Se incluye el punto 4**: el superior ve las solicitudes nuevas/resueltas **en vivo** en "Solicitudes de alumnos". Implementado. |

## Restricciones y Correcciones Previas (No repetir)
1. **No romper el Realtime existente:** `supabase_realtime` ya publicaba `torneos`, `llaves` y `enfrentamientos` (congelado). Solo se **agregan** tablas.
2. **Realtime con RLS:** Postgres Changes respeta RLS; cada usuario recibe **solo sus filas**.
3. **Un canal por sesión/pantalla:** sin duplicados; se desuscribe en `SIGNED_OUT`/`cleanup`.
4. **Fail gracefully:** si Realtime no conecta, la app sigue andando y el refresh por foco cubre.
5. **No tocar** `.env*`, `web/` ni torneos; español; sin commits automáticos.

## Contexto / Diagnóstico
- `refrescarPerfil()` corría **solo** al restaurar sesión (arranque) y en `SIGNED_IN`; **no** había refresh al foco ni Realtime.
- `supabase_realtime` **no** incluía `profiles` ni `solicitudes_linaje`.
- Efecto: el solicitante quedaba con *"Tu instructor todavía no confirmó tu registro"* hasta reiniciar/re-loguear; el superior solo veía solicitudes nuevas al recuperar foco.

## Cambios implementados

### 1. Migración `20260923172450_realtime_linaje.sql`
```sql
alter publication supabase_realtime
  add table public.profiles, public.solicitudes_linaje;
```
- `relreplident = default` (PK) ya alcanza para updates filtrados por `id` / `alumno_id` / `instructor_id`.

### 2. `mobile/src/contextos/AuthGlobal.tsx` (lado del solicitante)
- Canal por sesión con dos bindings:
  - `profiles` (`event: UPDATE`, `filter: id=eq.<uid>`) → `refrescarPerfil(uid)`.
  - `solicitudes_linaje` (`event: *`, `filter: alumno_id=eq.<uid>`) → `refrescarLinajeEnCurso(uid)`.
- Limpieza con `supabase.removeChannel(canal)` en el `cleanup`.
- Se expone `refrescarMiPerfil()` (fallback).

### 3. `mobile/src/app/(tabs)/index.tsx` (lado del superior — punto 4)
- Con `esInstructor`, canal `solicitudes:<uid>` sobre `solicitudes_linaje` (`filter: instructor_id=eq.<uid>`) → `cargarSolicitudes()`.
- La sección **"Solicitudes de alumnos"** se actualiza **en vivo**.

### 4. Fallback: refresco al recuperar foco
- `useFocusEffect` del Inicio llama `refrescarMiPerfil()` además de `cargarResumen()`.

## Verificación ejecutada
- `supabase db push --linked`: publicación con `profiles` y `solicitudes_linaje` confirmada.
- **Prueba de Realtime real** (Node + `@supabase/supabase-js`, dos conexiones):
  - Login como `jhona@`, canal `SUBSCRIBED`.
  - `UPDATE` del perfil propio (vía service role) → **evento recibido** ✅.
  - `INSERT`/`DELETE` de una solicitud con `instructor_id = jhona` → **evento recibido** ✅.
  - Datos de prueba limpiados (solicitud borrada, perfil restaurado); sin residuos.
- `npm run typecheck` y `npm run lint` → **0 problemas**.
- **Flujo real confirmado:** `ajeno@` completó onboarding y Jhonatan aceptó → `grado_actual = dan_1`, `grados_verificados = true`, `es_profesor = true`, linaje establecido.

## Criterios de aceptación
- [x] Solicitante: al confirmar el superior, el aviso desaparece **en vivo** y se habilita Instructor (Realtime verificado).
- [x] Al rechazar, el solicitante vuelve al onboarding sin re-login (vía `refrescarLinajeEnCurso`).
- [x] Superior: solicitudes nuevas/resueltas se ven **en vivo**.
- [x] Un canal por sesión/pantalla; desuscripción correcta.
- [x] RLS respetada (solo filas propias).
- [x] `typecheck`/`lint` en verde; `db lint` sin issues nuevos.

## Documentación sincronizada
- `plan-de-pruebas.md`: `TC-LIN-09` (solicitante en vivo) y `TC-LIN-10` (solicitudes del superior en vivo).
- `workflow-implementacion-mobile.md`: nota de refresco en vivo del linaje.
- `README.md`: fila del plan.

## Riesgos
- Límites de Realtime (plan free) para conexiones/mensajes: flujo de bajo volumen.
- Si Realtime está deshabilitado a nivel plataforma, `add table` falla (verificado OK).

---

🐧
