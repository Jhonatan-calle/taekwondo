# Plan: Corrección del mapeo de cuentas de prueba (RLS) — `db-fix-mapeo-cuentas-seed.md`

## Metadatos
- **Versión:** 1.1
- **Estado:** Aprobado
- **Fecha:** 2026-09-22
- **Fecha de aprobación:** 2026-09-22
- **Slug:** `db-fix-mapeo-cuentas-seed`

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-22 | Borrador inicial: diagnóstico del drift de cuentas/perfiles de prueba y propuesta de corrección determinista del seed por email, con remediación de datos y decisiones abiertas. Desbloquea `mobile-pruebas-rls-fase9.md`. |
| 1.1 | 2026-09-22 | **Aprobado e implementado.** Decisiones del usuario: limpiar **todos** los datos sobrantes y usar emails de prueba **simples e intuitivos** (`jhona@taekwondo.test` nivel 1, `sensei@taekwondo.test` nivel 2). Ejecutado: limpieza determinista, alta de cuentas por Admin API, reescritura del seed para resolver por email y verificación (idempotente). |

## Restricciones y Correcciones Previas (No repetir)
1. **No borrar la cuenta real** `jhonatancallegaleano@gmail.com` ni datos sin decisión explícita del usuario.
2. **Causa raíz:** el seed resuelve a `Profesor Jhona` y `Sensei Seed` por `nombre_completo`, mientras los logins se crean por Admin API con sus propios perfiles. **La corrección debe resolver por email de auth**, no por nombre.
3. **Respetar los triggers anti-escalada:** `es_profesor`, `es_maestro`, `grado_actual` y `maestro_id` se tocan con los flags del sistema (`app.concesion_profesor`, `app.concesion_maestro`, `app.derivacion_linaje`) o vía Service Role; el grado se fija con `public.registrar_grado_verificado(uuid, grado)`.
4. **Gate de Dan:** conferir `es_profesor` requiere `grado_actual >= 'dan_1'` (`puede_activar_profesor()`); primero el grado, después la faceta.
5. **Seed aditivo e idempotente:** se puede re-ejecutar sin duplicar; no debe volver a crear perfiles duplicados.
6. **No tocar** `web/`, torneos ni `.env*`; español; sin commits automáticos.

## Contexto / Diagnóstico
Al preparar la corrida de `mobile-pruebas-rls-fase9.md` se detectó que el **mapeo documentado de cuentas no coincide con la BD** (proyecto `zxzcgkcbzrgbgnsmrtkv`):

| Documentado en `plan-de-pruebas.md` §2 | Realidad actual |
|---|---|
| `seed-jhona@taekwondo.test` = **Profesor Jhona** (nivel 1) | Perfil **vacío** (`dfdb199f-e9e7-47fa-884a-252c56ec75e0`): sin nombre, facetas ni `maestro_id`. Al loguear cae en onboarding. |
| `seed-sensei@taekwondo.test` = **Sensei Seed** (nivel 2) | Es **"Asa Solo Maestro"** (`7bb27a21-…`): `es_profesor=true`, `maestro_id`=Jhona, dueño de la locación extra "Club Alberdi". |
| — | **"Profesor Jhona"** real = `jhonatansitoo312@gmail.com` (`4ec423a4-…`), **`es_maestro=true`** (el seed solo le pone `es_profesor`). |
| — | **"Sensei Seed"** real (nivel 2, `dan_2`, `06538eae-…`) **no tiene login**. |
| **P0** Jhonatan | ✅ OK (`1fa6308b-…`), `es_maestro`+`es_profesor`, `grado_actual = NULL`. |

**Datos de auditoría** (hoy colgados de los perfiles equivocados):
- `Seed Dojang Jhona A/B` + `Seed Grupo Jhona` → perfil `4ec423a4` (jhonatansitoo312@).
- `Seed Dojang Sensei` + `Seed Grupo Sensei` + 6 `Alumno Seed *` → perfil `06538eae` (sin login).
- Extra de pruebas manuales: `Club Alberdi` (Asa), grupos `Muy Adultos` (Jhonatan), alumnos `Nene 1` (Asa), `Somepne`, `Juan Perez`, `Maria Gomez`, `Julian Andres Alle`.

**Conteos observados:** 22 `profiles`, 5 `locaciones`, 6 `grupos`, 3 `pagos_alquiler` (el doc esperaba 20/4/5/3).

**Impacto:** B1–B7 (app) y la recursividad en dispositivo quedan bloqueados; B8 tampoco debe correrse sobre una base que no coincide con el plan.

## Objetivo (estado final, implementado)
- **P0** = Jhonatan (`jhonatancallegaleano@gmail.com`), sin cambios de rol.
- **P1** = `jhona@taekwondo.test` / `Seed123456!` ↔ perfil **"Profesor Jhona"**, `es_profesor=true`, **`es_maestro=false`**, `grado_actual = dan_1`, `maestro_id = P0`.
- **P2** = `sensei@taekwondo.test` / `Seed123456!` ↔ perfil **"Sensei Seed"**, `es_profesor=true`, `grado_actual = dan_2`, `maestro_id = P1`.
- Los datos de auditoría cuelgan de **P1** (Jhona A/B, grupo Jhona) y **P2** (Dojang Sensei, grupo Sensei, 6 alumnos), con los 3 estados de pago.
- Seed **determinista por email** e idempotente.

## Cambios implementados (v1.1)
1. **Limpieza determinista** (`supabase/` + CLI): `truncate` de todas las tablas de negocio, baja de todos los `auth.users` y `profiles` salvo `jhonatancallegaleano@gmail.com`. Se conserva `errores_runtime`. Resultado: 1 usuario real, 0 data de negocio.
2. **Alta de cuentas de prueba por Admin API** (emails simples):
   - `jhona@taekwondo.test` (id `8b7ed0f5-…`) — P1.
   - `sensei@taekwondo.test` (id `bdfaa10e-…`) — P2.
   - Contraseña `Seed123456!`, `email_confirm: true`.
3. **Reescritura de `supabase/seed-auditoria.sql` (v2):** resuelve `v_maestro`/`v_jhona`/`v_sensei` por **`auth.users.email`** (no por `nombre_completo`, causa del drift), setea facetas/grado/linaje y crea el escenario idempotente (guarda por clave natural: `dni`, nombre de locación/grupo, periodo de pago).
4. **Documentación sincronizada:**
   - `planes/db-seed-auditoria.md`: v1.1 con causa raíz y emails nuevos.
   - `plan-de-pruebas.md` §2: cuentas y datos actualizados.
   - `README.md`: fila de este plan.
   - `mobile-pruebas-rls-fase9.md`: cuentas P1/P2 actualizadas.

## Verificación ejecutada
- **Conteos:** 9 `profiles` (Jhonatan + Jhona + Sensei + 6 alumnos), 4 `locaciones`, 4 `grupos`, 3 `pagos_alquiler`.
- **Árbol:** Jhonatan (raíz) → Profesor Jhona (`es_profesor`, `dan_1`, `maestro_id`=P0) → Sensei Seed (`es_profesor`, `dan_2`, `maestro_id`=P1) → 6 alumnos.
- **Recursividad:** la CTE desde P0 devuelve **9** filas (raíz + 8 descendientes; alcanza niveles 1–3).
- **Idempotencia:** re-ejecutar el seed mantiene 9/4/4/3.
- **Locaciones por dueño:** Banda Norte (Jhonatan), Jhona A/B (P1), Dojang Sensei (P2).
- **Pagos:** 2026-09 (Banda, al día), 2026-07 (Jhona A, vencida), 2026-08 (Sensei, vencida); Jhona B sin pagos.

## Decisiones tomadas (v1.1)
1. **Limpieza total:** se eliminó **toda** la data de prueba sobrante, incluida la cuenta `jhonatansitoo312@gmail.com`, "Asa Solo Maestro", "Club Alberdi" y los alumnos/grupos manuales.
2. **Emails simples e intuitivos:** `jhona@taekwondo.test` (P1) y `sensei@taekwondo.test` (P2).
3. **Contraseña:** se mantiene `Seed123456!` para ambas.
4. **Seed por email:** `seed-auditoria.sql` resuelve los perfiles por `auth.users.email`.

## Criterios de aceptación y verificación
- [x] `seed-auditoria.sql` resuelve P1/P2 **por email** y es **idempotente** (re-ejecutar no duplica ni re-desvía).
- [x] P1 = `jhona@` con `es_profesor=true`, `es_maestro=false`, `grado=dan_1`, `maestro_id=P0`.
- [x] P2 = `sensei@` con `es_profesor=true`, `grado=dan_2`, `maestro_id=P1`.
- [x] Locaciones/grupos/alumnos/pagos cuelgan de P1/P2 como indica el escenario.
- [x] Login de P1 y P2 creado con `Seed123456!` (verificado por Admin API).
- [x] Recursividad: la consulta desde P0 alcanza a P2 y sus alumnos (9 filas).
- [x] Conteos y árbol documentados en `plan-de-pruebas.md` §2 y `db-seed-auditoria.md`.
- [x] Desbloquea `mobile-pruebas-rls-fase9.md` (B1–B8).

## Riesgos
- Tocar perfiles con `es_maestro`/linaje sin los flags del sistema → rechazo por trigger; mitigado por Service Role + `set_config('app.*')`.
- Borrar datos de prueba manuales puede eliminar evidencia que el usuario quiera conservar → por eso son **decisiones abiertas**.
- `grado_actual` de P1 en `NULL` bloquea la faceta de profesor → se fija **antes** de conferir `es_profesor`.

---

🐧
