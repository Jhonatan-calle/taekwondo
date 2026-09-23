# Plan: Contacto de emergencia obligatorio (nombre + teléfono) — `mobile-contacto-emergencia-obligatorio.md`

## Metadatos
- **Versión:** 1.0
- **Estado:** Aprobado
- **Fecha:** 2026-09-23
- **Fecha de aprobación:** 2026-09-23

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-23 | Borrador y aprobación: el contacto de emergencia pasa a ser **obligatorio** (separado en nombre + teléfono con formato) para el staff (onboarding) y el alta de alumnos; se elimina `contacto_emergencia` y se enforza en BD y RPC. Implementado. |

## Restricciones y Correcciones Previas (No repetir)
1. **Aplica a staff y alumnos** (onboarding y alta de alumno).
2. **Nombre + teléfono con formato** obligatorios; se elimina la columna única `contacto_emergencia`.
3. **`NOT NULL default ''`**: el trigger `manejar_nuevo_usuario()` inserta `profiles (id)` al crear un usuario, así que el default es imprescindible para no romper el registro. El "no vacío" se exige en la app (`perfilCompleto`) y en el RPC; la BD no distingue "sin onboarding" de "completo".
4. Anti-escalada, RLS y *fail gracefully* intactos; español.

## Contexto / Objetivo
El contacto de emergencia era **opcional** en el onboarding del staff y en el alta de alumnos. Pasa a ser obligatorio, con nombre y teléfono separados y formato validado, para que el dato sea confiable.

## Cambios implementados
1. **Migración `20260923170146_contacto_emergencia_obligatorio.sql`:**
   - `contacto_emergencia_nombre text not null default ''` + `contacto_emergencia_telefono text not null default ''`; se elimina `contacto_emergencia`.
   - CHECK de formato del teléfono cuando no está vacío (`^[+0-9 ()-]{6,20}$`).
   - `alta_alumno` con `p_contacto_emergencia_nombre` + `p_contacto_emergencia_telefono` **obligatorios** y validados (nombre ≥2, teléfono con formato).
2. **App:**
   - `perfil.ts`: tipos con los dos campos; `perfilCompleto()` exige contacto válido; validadores `esNombreContactoValido` / `esTelefonoContactoValido`.
   - `onboarding.tsx` y `alta-alumno.tsx`: **dos campos** `Contacto de emergencia · Nombre / Teléfono` (con `*`) y validación inline.
   - `AuthGlobal.tsx`: selects y `completarPerfil`/`altaAlumno` actualizados.
   - `alumno/[id].tsx`: muestra nombre y teléfono de emergencia.
3. **Seed `seed-auditoria.sql`:** contacto para P0/P1/P2 y los 6 alumnos; además se completaron **DNI/fecha/peso/género** de P1/P2 (faltaban y `perfilCompleto` los mandaba a onboarding).
4. **Tipos** regenerados (`database.types.ts`).
5. **Documentación sincronizada** (se quita "opcional" en todo el proyecto): `plan-de-pruebas.md` (v1.3, `TC-ONB-04`/`TC-ALU-04` + `TC-ONB-06`/`TC-ALU-09`), `workflow-implementacion-mobile.md`, `pendientes-pruebas.md`, `databaseModel.md`, y los planes `mobile-onboarding-perfil`, `mobile-directorio-alta-alumnos`, `mobile-grado-colores-y-telefono`.

## Verificación ejecutada
- `supabase db push --linked` + `db lint` (sin issues nuevos; el único reportado es de `sincronizar_resultado_en_vivo`, del módulo de torneos congelado).
- `npm run typecheck` y `npm run lint` → **0 problemas**.
- Seed re-ejecutado: P0/P1/P2 con perfil completo (`nombre/dni/fecha/peso/genero/contacto`); 6 alumnos con contacto.

## Criterios de aceptación
- [x] No se puede completar onboarding ni alta sin nombre y teléfono válidos.
- [x] El teléfono con formato inválido se rechaza (app y servidor).
- [x] `alta_alumno` directo sin contacto falla.
- [x] Migración aplicada; `typecheck`/`lint` en verde.
- [x] Documentación sin contradicciones ("opcional" eliminado).

---

🐧
