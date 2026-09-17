# Plan: Navegación del Panel de Profesor (rutas + nav persistente)

> **Metadatos**
> - **Versión:** 1.0
> - **Estado:** Aprobado
> - **Fecha de aprobación:** 2026-09-17

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-17 | Borrador inicial. Decisiones cerradas: (1) enfoque = **rutas reales con barra superior persistente** (no tabs en una sola página); (2) secciones = **Resumen, Inscripciones y Torneos**, con `/panel` como Resumen/landing. Aprobado. |

## Restricciones y Correcciones Previas (No repetir)
1. NO tocar `.env*`, NO commits/push automáticos. Verificaciones finales: `npm run lint` + `npm run build` + `npm run test`.
2. No reinventar: reutilizar `listarTorneos`, `listarInscripcionesAgrupadas`, `listarResumenLlaves` moviéndolas a un módulo compartido (sin duplicar queries). `cn` viene de `@/lib/utils`.
3. Componentes Client que renderizan datos usan el page-shell de la guía: `<main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">`.
4. Los `redirect()` de las Server Actions apuntan a la ruta contextual de la sección (`/panel/torneos`, `/panel/inscripciones`), nunca a `/panel` genérico cuando hay contexto de acción. `unstable_rethrow` ante errores de redirección (regla vigente).
5. El Motor de Emparejamiento (`lib/emparejamiento/`) NO se toca; los 23 tests Vitest deben seguir pasando.

## Contexto / objetivo
`/panel` concentraba en una sola página 4 secciones (header, confirmar inscripciones, nuevo torneo, tus torneos) con scroll largo y contenido mezclado. Se reorganiza en **rutas reales con barra superior persistente** (Mobile-First), dejando `/panel` como dashboard de resumen con conteos y atajos. El próximo ítem (Panel del Organizador) encajará como `/panel/organizador` sobre el mismo shell.

## Estructura de rutas resultante
| Ruta | Contenido |
|---|---|
| `/panel` | **Resumen**: conteos (torneos por estado; pendientes/confirmados/rechazados como aval) + atajos |
| `/panel/inscripciones` | Card "Inscripciones para confirmar" (`InscripcionesSeccion`) |
| `/panel/torneos` | Cards "Nuevo torneo" + "Tus torneos" (link, "Generar llaves", "Llaves armadas") + banner `?llaves=&omitidos=` |

## Cambios concretos
### 1. Shell persistente — `web/src/app/(panel)/panel/layout.tsx`
- Mantiene `requireProfesor()`.
- Agrega `<header>` (título "Panel de Profesor" + formulario `cerrarSesion`) y `<PanelNav />`; luego `{children}`.

### 2. Nav — `web/src/app/(panel)/panel/nav-panel.tsx` (nuevo, Client)
- `usePathname()` para estado activo; pills `Link` con `aria-current="page"`.
- Activo: `bg-primary text-primary-foreground`; inactivo: `text-muted-foreground hover:bg-muted`.
- `flex gap-1 overflow-x-auto` (mobile-first).

### 3. Módulo de datos — `panel/datos.ts` (nuevo, server)
- Mueve `listarTorneos`, `listarInscripcionesAgrupadas`, `listarResumenLlaves` + tipos (`TorneoRow`, `FilaInscripcion`, `EstadoInscripcion`, `InscripcionesGrupo`, `CategoriaLigera`).
- Helpers de fechas centralizados en `web/src/lib/fechas.ts` (`fechaLegible`, `edadLegible`), seguros para Server y Client.

### 4. Resumen — `panel/page.tsx` (reescribe)
- Conteos derivados de `listarTorneos` + `listarInscripcionesAgrupadas`; atajos (`Link`) a `/panel/inscripciones` y `/panel/torneos`.

### 5. Secciones por ruta
- `panel/inscripciones/seccion.tsx` (`InscripcionesSeccion`, movido desde `panel/inscripciones.tsx`; pulls fechas de `@/lib/fechas`).
- `panel/inscripciones/page.tsx` (nuevo): card "Inscripciones para confirmar".
- `panel/torneos/torneo-nuevo-form.tsx` y `panel/torneos/generar-llaves-form.tsx` (movidos).
- `panel/torneos/page.tsx` (nuevo): cards de torneos + banner de `?llaves=&omitidos=` con link a `/panel/inscripciones` si `omitidos>0`.

### 6. Server Actions — `panel/actions.ts` (redirects contextuales)
- `crearTorneo` → `/panel/torneos`.
- `confirmarInscripcion` / `rechazarInscripcion` / `guardarAgresividad` → `/panel/inscripciones`.
- `generarEmparejamiento` → `/panel/torneos?llaves=<id>&omitidos=<N>`.

### 7. Docs
- `documentacion/guia-estetica.md`: registrar `PanelNav` en el catálogo + patrón "nav persistente".
- `documentacion/mvc/workflow.md`: nota de reorganización.
- Plan `navegacion-panel.md` → Aprobado.

## Criterios de aceptación
- [ ] Header + nav persistente en las 3 rutas; `aria-current` correcto.
- [ ] `/panel` = resumen con conteos reales; secciones funcionales con la misma data de hoy.
- [ ] Redirecciones post-acción aterrizan en la sección correcta; banner de llaves en `/panel/torneos`.
- [ ] Sin lógica duplicada (datos en `datos.ts`; fechas en `lib/fechas`); `lib/emparejamiento/` intacto.
- [ ] `npm run lint` + `npm run build` OK; `npm run test` 23/23.

## Verificación manual (la hacés vos)
1. Login → `/panel` muestra resumen con conteos y atajos que navegan.
2. Tabs navegables con estado activo correcto.
3. `/panel/torneos`: crear torneo → aterriza en torneos; "Generar llaves" → banner verde + badge; regenerar sin duplicados.
4. `/panel/inscripciones`: confirmar/rechazar/guardar agresividad se quedan en esa sección (sin saltar a torneos).