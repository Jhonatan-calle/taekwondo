# Plan: Pruebas Integrales de RLS (Árbol de Poder) — Fase 9, ítem 2 — `mobile-pruebas-rls-fase9.md`

> **⚠️ Cuentas de prueba (2026-09-24):** las cuentas P0/P1/P2/P3 del seed **ya no existen** tras el
> reset total (`planes/db-seed-demo-ale-criado.md`). Remapear al escenario “Ale Criado” antes de correr.

## Metadatos
- **Versión:** 1.4
- **Estado:** Aprobado
- **Fecha:** 2026-09-23
- **Fecha de aprobación:** 2026-09-22
- **Slug:** `mobile-pruebas-rls-fase9`

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-22 | Borrador inicial: corrida manual del catálogo con foco en la matriz de roles/RLS, cuentas del seed y bloques B1–B7. |
| 1.1 | 2026-09-22 | Se cierran las decisiones: **P3** se crea durante la prueba (registro + linaje); se **incluye** el bloque **B8** (BD/API); el registro se hace **solo en los docs existentes** (`plan-de-pruebas.md` y `pendientes-pruebas.md`). |
| 1.2 | 2026-09-22 | Corrección del setup de P3: se agrega explícitamente el paso de **fijar/confirmar `grado_actual >= 'dan_1'` vía Service Role antes** de conferir `es_profesor`, porque el gate anti-escalada `public.puede_activar_profesor()` (y `activar_faceta_profesor()`) exige 1er Dan y **rechaza** si el perfil tiene un cinturón Gup o nulo. |
| 1.3 | 2026-09-22 | Actualizadas las cuentas del seed a `jhona@taekwondo.test` / `sensei@taekwondo.test` y los conteos esperados (9/4/4/3), tras la corrección `db-fix-mapeo-cuentas-seed.md`. |
| 1.4 | 2026-09-23 | El setup de P3 pasa a ser **100% desde la app**: declara su cinturón (Dan I–IX) y P0 lo confirma al aceptar el linaje (activa `es_profesor`). Ya no requiere Service Role. Referencia: `planes/mobile-linaje-confirmar-grado.md`. |

## Restricciones y Correcciones Previas (No repetir)
1. **Es una corrida de verificación:** no se toca código, `web/`, torneos ni `.env*`.
2. **No inventar casos:** se ejecuta lo que ya está en `plan-de-pruebas.md`; un hallazgo nuevo **se registra, no se parchea** en caliente (va a un plan de corrección aparte).
3. **No tocar la cuenta real** `jhonatancallegaleano@gmail.com` ni borrar datos; el seed es aditivo/idempotente.
4. **Registro de resultados solo en los docs existentes** (no se crea un doc nuevo).
5. **Gate de Dan (corrección v1.2, no repetir):** conferir `es_profesor` a P3 **exige** `grado_actual >= 'dan_1'::public.grado` (helper `public.puede_activar_profesor()`); con Gup o nulo la operación se rechaza. **Primero se fija el grado, después la faceta.**
6. **No reimplementar:** reutilizar los mecanismos existentes (`registrar_grado_verificado(uuid, grado)` con grant a `service_role`, `activar_faceta_profesor()` y la excepción `app.concesion_profesor` honrada por el trigger `bloquear_auto_activacion_profesor`).

## Contexto / Objetivo
Fase 9 del workflow (verificación, calidad y compilación), ítem 2: validar en la **app real** que los límites de **visibilidad y edición** se aplican correctamente (RLS en cascada) sobre el árbol de poder.

Fuente de casos: `documentacion/plan-de-pruebas.md` (matriz §4, smoke §6, resiliencia §5 y módulos). Pendientes puntuales: `documentacion/pendientes-pruebas.md`.

## Perfiles de prueba
| Perfil | Cuenta | Rol en el árbol | Origen |
|---|---|---|---|
| **P0** | `jhonatancallegaleano@gmail.com` | Maestro raíz (nivel 0) | seed |
| **P1** | `jhona@taekwondo.test` / `Seed123456!` | Profesor nivel 1 (subordinado directo) | seed |
| **P2** | `sensei@taekwondo.test` / `Seed123456!` | Profesor nivel 2 (nieto → recursividad) | seed |
| **P3** | `ajeno@taekwondo.test` (a registrar en la app) | Profesor ajeno (sin relación con P1/P2) | **se crea en la corrida** |

> **Hueco cubierto (v1.1):** los casos de aislamiento (`TC-RLS-02`, `TC-ALQ-07`, `TC-AUD-06`) piden un usuario **sin relación de linaje**; el seed no lo trae (P0→P1→P2 son el mismo árbol), por eso P3 se crea durante la prueba.

## Creación de P3 (setup) — 100% desde la app
1. **Registrar la cuenta desde la app** (`TC-AUTH-01`) → completar onboarding → **declarar el cinturón** (chips **Dan I…Dan IX**, obligatorio) → elegir instructor **P0**.
2. **P0 acepta y confirma el cinturón** (`TC-LIN-02`): en "Solicitudes de alumnos" confirma o ajusta el grado (Dan I…IX).
3. Al aceptar, el sistema (RPC `resolver_solicitud_linaje`, ver `planes/mobile-linaje-confirmar-grado.md`) persiste `maestro_id`, fija `grado_actual` con `grados_verificados = true` y activa **`es_profesor`**.
4. **Resultado:** P3 queda como **profesor ajeno** (subordinado de P0, sin relación con P1/P2) con pestaña Instructor habilitada, listo para los casos de aislamiento.
5. **De paso cubre** `TC-AUTH-01`, `TC-ONB-*` y todo `TC-LIN` (registro → onboarding con cinturón → solicitud → aceptación con confirmación de grado).

> **Ya no hace falta Service Role** para `es_profesor` de P3 (lo resuelve la app). `es_maestro` sigue siendo exclusivo del creador por Service Role.

## Preparación previa
1. (Opcional) Dejar la base determinista: limpieza + re-ejecutar el seed. Validar conteos (esperado: **9 `profiles`, 4 `locaciones`, 4 `grupos`, 3 `pagos_alquiler`**):
   `npx supabase db query --linked -f supabase/seed-auditoria.sql` (las cuentas `jhona@` y `sensei@` se crean por Admin API; ver `db-fix-mapeo-cuentas-seed.md`).
2. Metro + Expo Go apuntando a la BD remota; dispositivos listos (uno con cámara para comprobantes).
3. Confirmar credenciales de las cuentas del seed.

## Bloques de ejecución
1. **B1 · Auth, guards, onboarding y linaje** — `TC-AUTH-*`, `TC-ONB-*`, `TC-LIN-*`, `TC-NAV-*` + pendientes #2/#3/#4/#7/#8 (incluye el setup de P3, con su paso de Dan).
2. **B2 · Gestión del profesor** (P1/P2) — `TC-ALU-*`, `TC-GRU-*`, `TC-CLA-*`, `TC-ASI-*`, `TC-CUO-*`, `TC-LOC-*`, `TC-ALQ-*`.
3. **B3 · Núcleo RLS / árbol de poder** (P0–P3) — matriz §4 + `TC-RLS-01..04` + `TC-ALQ-06/07/08` + `TC-AUD-01..07` + `TC-ASI-05` + `TC-CUO-05` + `TC-MES-07/08` + `TC-POS-07` + `TC-EVA-11` + `TC-DASH-08`. **Es el corazón del ítem.**
4. **B4 · Ciclo de exámenes** (P0 maestro / P1 profesor) — `TC-MES-*`, `TC-POS-*`, `TC-EVA-*`.
5. **B5 · Inicio y dashboard** (P0/P1) — `TC-INI-*`, `TC-DASH-*`.
6. **B6 · Resiliencia** — `TC-ERR-01/02/03` + fail gracefully por módulo (red cortada).
7. **B7 · Smoke final** — §6 completo (25 casos) como cierre de la corrida.
8. **B8 · BD/API (incluido)** — con el JWT de cada cuenta:
   - `TC-RLS-03` INSERT prohibido a la API → rechazo por RLS.
   - `TC-RLS-04` gates anti-escalada: intentar cambiar `es_profesor`, `es_maestro` y `grado_actual` → rechazo por los triggers.
   - Recursividad con consulta SQL (P0 ve la rama de P2) y validación de que P3 ve **0 filas**.
   - `TC-ALQ-07`/`TC-AUD-06` para P3: sin filas y el **enlace firmado falla**.
   - `TC-ERR-02`: revisar `errores_runtime` con su `modulo`.

## Evidencia y registro (solo docs existentes)
- Estado por caso en `documentacion/plan-de-pruebas.md` (✅/⏳/❌ con nota, cuenta y fecha).
- Tachar lo verificado en `documentacion/pendientes-pruebas.md`.
- Todo ❌ → plan de corrección aparte (no se corrige dentro de esta corrida).
- Corrección menor incluida: alinear el índice (`documentacion/README.md` dice 129 casos) con el catálogo (137).

## Criterios de aceptación
- [ ] Smoke §6 (25 casos) en ✅, o fallos escalados con plan.
- [ ] Matriz §4 verificada con P0/P1/P2/P3.
- [ ] **Recursividad:** P0 ve locaciones/pagos/comprobantes de P2 (nieto).
- [ ] **Aislamiento:** P3 no ve nada de P1/P2 y el enlace firmado falla.
- [ ] **Escritura restringida** y **gates anti-escalada** confirmados vía B8.
- [ ] Fail gracefully en cada módulo, sin stack traces; errores en `errores_runtime`.
- [ ] `pendientes-pruebas.md` y `plan-de-pruebas.md` actualizados; Fase 9 ítem 2 marcado en `workflow-implementacion-mobile.md`.

## Riesgos
- **Rate limit de Supabase** puede bloquear `TC-AUTH-05` (recuperación de contraseña): pendiente #1 conocido.
- Datos del seed pueden haber cambiado → re-ejecutar antes de la corrida.
- Algunos casos requieren comprobante real (cámara) y dispositivo con visor de PDF.
- P3 sin el grado fijado antes de la faceta haría fallar el setup (mitigado por el paso 3).

---

🐧
