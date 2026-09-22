# Plan: Adaptación de la BD al nuevo SRS (gestión de escuela) para app móvil Expo + Supabase

> **Metadatos**
> - **Versión:** 1.1
> - **Estado:** Aprobado
> - **Fecha de aprobación:** 2026-09-18

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-18 | Borrador: diagnóstico de la BD actual (modelada para torneos) vs. nuevo SRS de gestión de escuela; cambio de enfoque a app móvil (React Native + Expo) reutilizando la BD; decisión de unificar el grado actual del alumno en una sola columna. |
| 1.1 | 2026-09-18 | **Aprobado por el usuario.** Decisiones cerradas: torneos se conservan sin tocar; web se congela (no se mantiene funcional); monorepo `taekwondo/mobile` (Expo) + migraciones centralizadas en `supabase/` raíz; DNI `unique` nullable con validación en app; `grado_actual public.grado` unificado (Opción B, `dan_1…dan_9`); `es_maestro + árbol` para la jerarquía. |
| 1.2 | 2026-09-19 | **Implementación verificada.** Push remoto exitoso (7 migraciones aplicadas: 1 historial + 6 nuevas). Dump remoto valida enum `grado`, columnas de `profiles`, tablas nuevas, RPCs/triggers/grants y bucket `comprobantes`. Tests RLS empíricos con usuarios desechables en transacción: privacidad en cascada (propio + alumnos directos), auditoría de alquileres para superiores, anti-escalada de `es_profesor`/`es_maestro`/`grado_actual`, gate de profesor (dan_1 OK / gup NO), flujo de examen completo (postulación → RPC aprobado → ascenso automático + `graduaciones`). Criterios de aceptación OK. |

## Restricciones y Correcciones Previas (No repetir)
1. **NO tocar `.env*` ni `credenciales.txt`** (archivos protegidos).
2. **NO commits/push automáticos** (solo si el usuario lo pide).
3. **Migraciones nuevas generadas por CLI** (`npx supabase migration new <slug>`) en `supabase/migrations/`.
4. **Módulo de torneos intacto:** `torneos`, `inscripciones`, `inscripciones_datos_privados`, `categorias`, `llaves`, `enfrentamientos`, `jurados_torneo`, `resultados_torneo` NO se tocan. Se conservan en la BD aunque la app no los use.
5. **Web congelada:** `web/` no se modifica ni se mantiene funcional. La eliminación de `profiles_select_authenticated (using true)` provoca una **regresión aceptada** en los flujos web de torneos (inscripción pública y autocompletado de jurados). No se corrige.
6. **No re-inventar patrones:** reutilizar el patrón de helpers `SECURITY DEFINER` (rompen recursión RLS, ver `fix_rls_arbol`) y de RPCs con `set_config('app.<contexto>', 'on', true)` para escrituras del sistema que deben respetar triggers anti-escalada (`derivacion_linaje`, `concesion_profesor`).
7. **Escritura de columnas sensibles solo-sistema:** `grado_actual`, `es_profesor`, `es_maestro`, `maestro_id`, `grados_verificados` solo pueden escribir funciones `SECURITY DEFINER` (Service Role) o RPC con gate y `set_config`. El usuario autenticado jamás se las auto-edita.
8. **Grado unificado (Opción B, cerrada):** nuevo enum `public.grado` = los 10 Gup + `dan_1…dan_9` (SRS §3.2 "VI Dan y rangos superiores"). Reemplaza `profiles.grado_dan_actual`. Los enums `grado_gup`/`grado_dan` **NO se eliminan** (los usan tablas de torneos: `categorias.rango_min`, `graduaciones` legacy).
9. **DNI:** `dni text` con índice único, **nullable en BD** (el trigger `manejar_nuevo_usuario` crea el perfil sin DNI); obligatorio a nivel app al completar el perfil (SRS §3.1 "obligatorio y único" → unicidad en BD, requerimiento en app).
10. **Pagos = registro, no pasarela:** cuotas, alquileres y derecho de examen solo se asientan (fecha + monto). No se procesa dinero.
11. **Fail gracefully:** toda comunicación con BD desde la app será en try/catch con registro en `errores_runtime` y mensaje genérico.

## Contexto / objetivo
- Cambio de enfoque: se **descarta el desarrollo web** (Next.js). Solo se reutiliza la **base de datos Supabase**.
- Nueva app **React Native + Expo (Expo Router) + Supabase** que cumple `documentacion/srs-sistemaDeGestionTaekwondo.md` (gestión integral de una escuela de Taekwondo ITF: alumnos, grados, lugares/alquileres, clases/grupos, asistencia, cuotas, dashboard y exámenes de graduación).
- La BD actual fue modelada para el MVP de torneos. Este plan la adapta al nuevo SRS mediante migraciones y centraliza el schema en la raíz del monorepo.

## Cambios concretos

### Fase 0 — Reestructuración del repo
- `git mv web/supabase/migrations/*.sql supabase/migrations/` (conserva historial; los timestamps ya fueron aplicados al remoto).
- Copiar `web/supabase/config.toml` → `supabase/config.toml` (las migraciones pasan a `supabase/migrations`).
- `supabase/.gitignore` → excluir `.temp/` (contiene el link al proyecto remoto `zxzcgkcbzrgbgnsmrtkv`; no versionar).
- Re-`supabase link` en la raíz desde el proyecto existente (fuente: `web/supabase/.temp/linked-project.json`).
- `web/` queda congelada e intacta.

### Fase 1 — Migración `grado_unificado_y_perfil`
- `create type public.grado as enum (blanco … rojo_punta_negra, dan_1 … dan_9)` en ese orden (los Gup quedan por debajo de `dan_1`, permitiendo comparar `grado_actual >= 'dan_1'`).
- `create type public.genero as enum ('masculino','femenino','otro')`.
- `profiles`: `+ dni text` (`unique`), `+ genero public.genero`, `+ grado_actual public.grado`, `+ es_maestro boolean not null default false`.
- Backfill `grado_actual ← grado_dan_actual` y `drop column grado_dan_actual`.
- Re-cablear: `bloquear_auto_cambio_grado` (vigila `grado_actual`/`grados_verificados`, honra `set_config('app.aprobacion_examen')`); `registrar_grado_dan_verificado` → `registrar_grado_verificado(p_perfil uuid, p_grado public.grado)` (Service Role); `puede_activar_profesor()`/`activar_faceta_profesor()` gate `grado_actual >= 'dan_1'`.
- Nuevo trigger `bloquear_auto_activacion_maestro` + RPC `conceder_faceta_maestro(p_perfil uuid)` (Service Role).

### Fase 2 — Migración `locaciones_y_alquileres`
- `public.locaciones`: `id, nombre not null, direccion, valor_alquiler numeric(10,2), creado_por → profiles, creado_en`.
- `public.pagos_alquiler`: `id, locacion_id → locaciones, monto numeric(10,2), periodo text, fecha_pago date, comprobante_url text, creado_por, creado_en`.
- Bucket privado `comprobantes` en storage con RLS alineada (dueño + auditoría de superiores).

### Fase 3 — Migración `grupos_locacion`
- `grupos + locacion_id uuid references locaciones(id)`. `ubicacion` queda como legacy (deprecated).

### Fase 4 — Migración `pagos_cuota`
- `public.pagos_cuota`: `id, alumno_id → profiles, fecha, monto numeric(10,2), periodo text, observaciones, creado_por`, `unique (alumno_id, periodo)`.

### Fase 5 — Migración `examenes_graduacion`
- `public.mesas_examen`: `id, maestro_id → profiles, fecha, lugar, estado ('abierta'|'cerrada'|'finalizada'), creado_en`.
- `public.postulaciones_examen`: `id, mesa_id → mesas_examen, alumno_id → profiles, profesor_id → profiles, grado_aspirado public.grado, derecho_examen numeric(10,2), estado ('postulado'|'aprobado'|'desaprobado'|'ausente'), evaluado_por, evaluado_en`, `unique (mesa_id, alumno_id)`.
- Refactor `graduaciones` (historial académico permanente): `grado_anterior public.grado`, `grado_nuevo public.grado`, `+ mesa_id → mesas_examen`, `resultado text not null default 'aprobado'`; drop `grado_anterior/grado_nuevo/grado_dan*` legacy y `aprobado bool`.
- RPC `registrar_resultado_examen(p_postulacion uuid, p_resultado text, p_mencion_especial boolean default false, p_promocion_doble boolean default false)` (SECURITY DEFINER, valida `es_maestro` + dueño de la mesa): `aprobado` → `graduaciones` + ascenso de `profiles.grado_actual` (vía `set_config('app.aprobacion_examen','on',true)`); `desaprobado`/`ausente` → solo estado de la postulación.
  - **Extensión (Fase 7.3/7.4, v1.1):** mención especial y doble graduación combinables sobre un aprobado; la doble salta un cinturón (grado **+2**) y solo aplica con grado actual entre `blanco` y `azul_punta_roja` (tope `azul_punta_roja → rojo_punta_negra`); desde `rojo` el máximo es mención especial. Se guarda en `postulaciones_examen`/`graduaciones` (`mencion_especial`, `promocion_doble`) y la postulación registra el **grado otorgado** (sobreescribe `grado_aspirado`). Detalle en `mobile-planilla-evaluacion.md` v1.1.

### Fase 6 — Migración `rls_gestion_escuela`
- Drop `profiles_select_authenticated`. Nuevas: `profiles_select_propio` (`auth.uid() = id`) + `profiles_select_maestro_directo` (`maestro_id = auth.uid()`). UPDATE sigue `profiles_update_propio` (los triggers bloquean las columnas sensibles).
- Helpers SECURITY DEFINER: `es_subordinado_de(p_jefe uuid, p_perfil uuid)` (árbol recursivo sobre `maestro_id`) y `es_alumno_directo_de(p_profesor uuid, p_alumno uuid)`.
- RLS nuevas tablas:
  - `locaciones`: SELECT dueño + superiores del dueño; INSERT/UPDATE/DELETE dueño (INSERT de profesor/maestro).
  - `pagos_alquiler`: SELECT dueño + superiores (auditoría de infraestructura); INSERT/UPDATE dueño de la locación.
  - `pagos_cuota`: SELECT alumno propio + profesor directo; INSERT/UPDATE profesor directo.
  - `mesas_examen`: SELECT authenticated; INSERT solo `es_maestro` (`auth.uid() = maestro_id` y `es_maestro`); UPDATE solo maestro dueño.
  - `postulaciones_examen`: SELECT alumno propio, profesor postulante, maestro examinador; INSERT profesor con alumno directo (`es_alumno_directo_de` y `es_profesor`); UPDATE profesor mientras `postulado`; resultados solo vía RPC.
  - `graduaciones`: SELECT alumno propio + profesor directo; escritura solo vía RPC (sin grants a authenticated).
- RPC `metricas_dashboard(p_vista text, p_instructor uuid default null)` (SECURITY DEFINER, authenticated): distribuciones anonimizadas por género/edad/grado de los descendientes de `auth.uid()` (vista consolidada) o de un instructor subordinado validado (vista específica). Nunca expone datos personales (privacidad en cascada).
- RPC `planilla_mesa_examen(p_mesa uuid)` (SECURITY DEFINER, authenticated): datos técnicos (nombre, edad, peso, grado actual, grado aspirado) de las postulaciones, solo para el maestro examinador (excepción mesas de examen).

## Fuera de alcance (de este plan)
- Creación de la app `mobile/` (plan posterior: bootstrap Expo Router + supabase-js + auth/deep links + env).
- No se procesa dinero (solo registro de pagos).
- Módulo de torneos y `web/`: intactos/frozen.

## Verificación
- `git mv` preserva historial; `supabase db push` desde la raíz aplica las migraciones nuevas.
- Dump remoto: enum `grado` (Gup + `dan_1…dan_9`), columnas nuevas en `profiles` (incl. drop de `grado_dan_actual`), tablas nuevas, RPCs/triggers/grants.
- Tests RLS empíricos con usuarios desechables (patrón `restricciones-acceso`): gates `es_profesor`/`es_maestro`, privacidad en cascada, auditoría de alquileres, planilla de mesa.
- `supabase db lint`/dump sin errores. Al existir `mobile/`, typecheck + lint del stack Expo.

## Criterios de aceptación
- [x] La BD refleja los requerimientos SRS §3.1–3.7 (DNI único, género, grado actual, locaciones/alquileres, cuotas, mesas de examen, dashboard anonimizado).
- [x] `es_maestro` y `es_profesor` no son auto-concedibles; el gate de profesor usa `grado_actual >= 'dan_1'`.
- [x] Un superior jamás lee datos personales de subordinados; solo métricas anonimizadas + excepciones (alquileres y planilla de mesa).
- [x] Al aprobar un examen, `profiles.grado_actual` se actualiza automáticamente y queda registro en `graduaciones`.
- [x] Torneos intactos; web congelada.
- [x] Migraciones centralizadas en `supabase/migrations` y aplicadas al remoto.