# Plan: Auditoría agrupada por rama — `mobile-auditoria-rama-agrupada.md`

## Metadatos
- **Versión:** 1.1
- **Estado:** Aprobado
- **Fecha:** 2026-09-24
- **Fecha de aprobación:** 2026-09-24

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-24 | Borrador y aprobación: agrupa la **Auditoría de locaciones** por **rama** (un bloque por subordinado directo, con las locaciones de sus descendientes dentro), preservando la **privacidad** (sin nombres de descendientes indirectos). |
| 1.1 | 2026-09-24 | **Implementado.** Migración `20260924144730_rama_descendientes.sql`; `AuthGlobal` + pantallas actualizadas; `typecheck`/`lint` en verde. `db push` pendiente (usuario). |

## Restricciones y Correcciones Previas (No repetir)
1. **No tocar** torneos, `web/` ni `.env*`; español; sin commits automáticos.
2. **Privacidad:** el helper devuelve **solo ids** (relación organizacional); **nunca nombres ni datos personales**.
3. **No romper:** la auditoría, el **detalle auditado** ni el bloque **“Tu rama”** del Inicio.
4. **Patrón del proyecto:** helper `SECURITY DEFINER` (`search_path = public`), `grant` solo a `authenticated`.
5. **RLS intacta:** las locaciones siguen limitadas a la rama; solo cambia la presentación.

## Contexto / Diagnóstico
- `listarLocacionesAuditadas()` armaba el nombre del dueño con un `join` a `profiles`. Por RLS, el Maestro **no puede leer** el perfil de un **descendiente indirecto** → el join devolvía `null` y caía al literal **`'Instructor'`**.
- Los filtros (`listarInstructoresSubordinados()`) leían `profiles` por los ids de `descendientes`; RLS también ocultaba a los indirectos → **sin chip** para ese dueño.
- Resultado: fila con dueño **“Instructor”** sin chip correspondiente.

## Cambios implementados

### 1. BD — `20260924144730_rama_descendientes.sql`
- `public.rama_descendientes(p_ancestro uuid) returns table (descendiente_id uuid, raiz_id uuid)`:
  - `security definer`, `stable`, `set search_path = public`.
  - CTE recursivo: el primer nivel (hijos directos) define `raiz_id = id`; los niveles siguientes heredan la raíz.
  - **Solo ids** (estructura). `revoke … from public, anon; grant … to authenticated;`.

### 2. Tipos — `lib/perfil.ts`
- `LocacionAuditada.dueno_nombre: string | null`.
- Nuevo `RamaDescendiente = { descendiente_id: string; raiz_id: string }`.

### 3. `contextos/AuthGlobal.tsx`
- `listarLocacionesAuditadas()` **sin parámetro**; `dueno_nombre: … ?? null` (se elimina el fallback `'Instructor'`).
- Nueva `listarRamaDescendientes()` → RPC `rama_descendientes`.
- `AuthGlobalValue` + deps actualizados.

### 4. `app/(tabs)/maestro/auditoria.tsx`
- Carga locaciones + subordinados directos + mapa de rama.
- **Secciones** por subordinado directo (nombre + resumen `N locación(es) · M vencida(s)`); las locaciones de ramas indirectas van dentro del bloque, con la marca **“De su rama”**.
- Sección final **“De su rama”** para lo que no encaja.
- **Filtro por rama** (“Toda mi rama” + cada subordinado directo).

### 5. `app/(tabs)/maestro/auditoria/[id].tsx`
- Header: `dueno_nombre ?? 'De su rama'`.

## Criterios de aceptación
- [x] Auditoría **agrupada por subordinado directo**, con las locaciones de **toda la rama** en su bloque.
- [x] Locaciones de descendientes **indirectos** marcadas **“De su rama”**, **sin nombre**.
- [x] **Ya no** aparece el literal **“Instructor”** como dueño.
- [x] **Filtro por rama** muestra toda la rama del directo.
- [x] **Detalle** muestra “De su rama” cuando no hay nombre.
- [x] Sin regresión en el bloque “Tu rama” del Inicio.
- [x] `typecheck` y `lint` en verde.
- [ ] `db push --linked` + `db lint --linked` (usuario).

## Documentación sincronizada
- `planes/mobile-auditoria-cascada.md` (v1.1), `plan-de-pruebas.md` (`TC-AUD-04/05` + `TC-AUD-08`), `databaseModel.md` (helper), `README.md`.

## Riesgos
- **Cambio de firma** de `listarLocacionesAuditadas()` (se revisaron los 3 call sites).
- Un dueño sin rama directa cae en **“De su rama”** (comportamiento buscado).
- Migración **no destructiva**.

---

🐧
