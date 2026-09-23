# Plan: Confirmación del cinturón al aceptar el linaje (nuevo profesor) — `mobile-linaje-confirmar-grado.md`

## Metadatos
- **Versión:** 1.0
- **Estado:** Aprobado
- **Fecha:** 2026-09-23
- **Fecha de aprobación:** 2026-09-23

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-23 | Borrador y aprobación: el nuevo staff declara su cinturón (obligatorio `dan_1+`) al pedir el linaje y el superior, al aceptar, **confirma o ajusta** ese grado, activando `es_profesor`. Cierra el hueco del "otorgamiento de facetas por un superior". Implementado. |

## Restricciones y Correcciones Previas (No repetir)
1. **`es_maestro` solo por Service Role (el creador):** la app nunca concede la faceta de maestro.
2. **Anti-escalada intacto:** `grado_actual`, `grados_verificados`, `es_profesor` y `maestro_id` se escriben solo vía RPC `SECURITY DEFINER` con los flags del sistema (`app.derivacion_linaje`, `app.aprobacion_examen`, `app.concesion_profesor`).
3. **Cinturón siempre `dan_1+`:** declarado y confirmado; un Gup o nulo se rechaza en el servidor.
4. **Grado declarado no verificado:** vive como snapshot en `solicitudes_linaje.grado_solicitado`; `profiles.grado_actual` queda en `NULL` hasta que el superior acepta.
5. **RLS en cascada y fail gracefully** intactos; español; sin commits automáticos.

## Contexto / Objetivo
Antes, `resolver_solicitud_linaje` solo persistía `maestro_id`; el usuario nuevo quedaba sin grado ni `es_profesor` y sin pestañas de gestión. Se quería que el propio superior **valide el cinturón** en el mismo acto de aceptar el linaje, y que `es_maestro` siga siendo exclusivo del creador por Service Role.

## Cambios implementados
1. **Migración `20260923160304_confirmar_grado_linaje.sql`:**
   - `solicitudes_linaje.grado_solicitado public.grado` (snapshot del grado declarado).
   - `solicitar_linaje(p_instructor uuid, p_grado public.grado)`: valida `dan_1+`, guarda/reabre la solicitud con el grado declarado.
   - `resolver_solicitud_linaje(p_solicitud uuid, p_resultado text, p_grado public.grado default null)`: al **aceptar**, `p_grado` (o el declarado) debe ser `dan_1+`; setea `maestro_id`, `grado_actual`, `grados_verificados = true` y `es_profesor = true` (solo si `maestro_id` seguía nulo).
   - `activar_faceta_profesor()` queda **deprecada** (no se elimina en este plan).
2. **Tipos regenerados** (`database.types.ts`) con las firmas nuevas y `grado_solicitado`.
3. **`AuthGlobal.tsx`:** `solicitarLinaje(maestroId, grado)`, `resolverSolicitudLinaje(..., grado?)`, y `listarSolicitudesPendientes` con `grado_solicitado`.
4. **`onboarding.tsx`:** selector de cinturón **obligatorio** (chips `Dan I…Dan IX`) visible cuando `necesitaLinaje`; validación inline; se pasa a `solicitarLinaje`.
5. **`(tabs)/index.tsx` (Solicitudes de alumnos):** muestra nombre + **grado declarado**; "Aceptar" abre la confirmación para **confirmar o ajustar** el cinturón antes de resolver.

## Verificación ejecutada
- `npm run typecheck` y `npm run lint` → **0 problemas**.
- `supabase db push --linked` + `supabase db lint --linked` (sin issues nuevos; el único reportado es de `sincronizar_resultado_en_vivo`, del módulo de torneos congelado).
- **Prueba funcional** (transacción con rollback): el solicitante declara `dan_1`, el instructor acepta y **ajusta a `dan_2`** → resultado: `grado_actual=dan_2`, `grados_verificados=true`, `es_profesor=true`, `maestro_id` persistido, `grado_solicitado=dan_1`, `estado=aceptada`.
- **Prueba negativa:** declarar `azul` (Gup) → `ERROR: El grado debe ser primer Dan o superior.`
- Base intacta tras las pruebas: 9 perfiles, 0 solicitudes residuales.

## Criterios de aceptación
- [x] El onboarding exige `dan_1+`; un Gup/vacío se rechaza (UI y servidor).
- [x] La solicitud pendiente muestra el grado declarado.
- [x] Al aceptar: `maestro_id`, `grado_actual` (confirmado/ajustado), `grados_verificados = true` y `es_profesor = true`.
- [x] El superior puede ajustar el grado (solo `dan_1+`).
- [x] Al rechazar no cambia grado, `grados_verificados` ni `es_profesor`.
- [x] `es_maestro` sigue intocable desde la app.
- [x] `typecheck`/`lint` en verde y migración aplicada.

## Efecto colateral
Con esta feature, **P3 (`ajeno@`) se puede dejar listo 100% desde la app** (declara Dan y el superior confirma): ya no hace falta conferir `es_profesor` por Service Role en la corrida de pruebas de RLS.

---

🐧
