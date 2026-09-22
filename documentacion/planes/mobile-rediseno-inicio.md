# Plan: Rediseño de la pantalla de Inicio (panel operativo) — `mobile-rediseno-inicio.md`

## Metadatos
- **Versión:** 1.1
- **Estado:** Aprobado
- **Fecha:** 2026-09-22
- **Fecha de aprobación:** 2026-09-22

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-22 | Borrador inicial: convertir el Inicio (hoy identidad + solicitudes + cerrar sesión) en un panel operativo con resumen, acciones rápidas y pendientes; resumen de rama para el Maestro; cerrar sesión discreto. |
| 1.1 | 2026-09-22 | Se acota **"Clases sin asistencia"** a los últimos **7 días** con **conteo numérico** y sin consultas anidadas (justificado: `listarClases()` no filtra por fecha). Se valida la obtención de la **recaudación del Maestro** vía `listarPostulacionesMesa(id)` por mesa abierta (SRS §3.7) y se deja asentada la **deuda técnica**: migrar a un RPC agregado si crecen las mesas simultáneas. |

## Restricciones y Correcciones Previas (No repetir)
1. **Torneos y web congelados:** no tocar tablas de torneos ni `web/`.
2. **Sin migración y sin métodos nuevos:** todo se compone con acciones que ya existen en `AuthGlobal`.
3. **Corregir el refresco:** el Inicio usaba `useEffect`; pasa a **`useFocusEffect`** (patrón vigente del proyecto) para actualizar métricas al volver de otras pantallas.
4. **Fail gracefully por bloque:** si una métrica falla, el resto del panel sigue siendo útil.
5. **No exponer datos personales** de alumnos de subordinados (el Maestro ve agregados de su rama).
6. **Sin regresión** en el flujo de solicitudes de linaje.

## Contexto / Problema
El Inicio era **identidad + avisos condicionales + solicitudes + cerrar sesión**. Con linaje confirmado y facetas, quedaba prácticamente vacío (solo email y botón de salir). Además no refrescaba al recuperar foco.

## Cambios Implementados

### 1. Estructura del nuevo Inicio `[x]`
- **A. Encabezado compacto:** saludo con el **nombre del perfil** y subtítulo "Panel de gestión". Los avisos (linaje sin confirmar / sin facetas) se conservan y solo aparecen si aplican.
- **B. Resumen operativo** (`TarjetaMetrica`, navegables):
  - **Instructor:** Alumnos directos · Grupos activos · **Cuotas pendientes** (`pendientes/total` del mes) · **Clases sin asistencia** (últimos 7 días).
  - **Maestro:** Alquileres vencidos de su rama · Mesas abiertas · **Recaudación de mesas** abiertas.
- **C. Acciones rápidas** (`BotonAccion`): Instructor → Tomar asistencia, Registrar cuota, Alta de alumno. Maestro → Nueva mesa, Auditoría.
- **D. Solicitudes de linaje:** se conserva la sección tal cual (con aceptar/rechazar); al aceptar se recarga el resumen.
- **E. Cerrar sesión:** discreto, como enlace de texto al final.

### 2. Cálculos (todos sobre datos existentes) `[x]`
- **Cuotas:** `listarCuotasPorPeriodo(mesActual())` → conteo `pagado` vs `pendiente`. Tarjeta en tono **alerta** si hay pendientes.
- **Clases sin asistencia (acotado):** se consulta `listarClases()` y se filtra **en el cliente** a los **últimos 7 días** (la acción **no filtra por fecha**). Sobre ese subconjunto se leen las asistencias **en paralelo** (`Promise.all`), **sin consultas anidadas**, y se muestra **solo el conteo numérico**. Si es 0, queda neutro.
- **Grupos / alumnos:** `listarGrupos()` y `listarAlumnosDirectos()` → conteo.
- **Locaciones vencidas (Maestro):** `listarLocacionesAuditadas()` → cuenta `estado_pago === 'vencida'` (la RLS ya limita a su rama).
- **Mesas abiertas y recaudación (Maestro):** `listarMesasExamen()` filtra las abiertas y luego **`listarPostulacionesMesa(id)` por cada mesa abierta** para sumar los derechos de examen. La RLS `postulaciones_examen_select_maestro` ya permite al maestro examinador leer todas las postulaciones de su mesa, conforme al **SRS §3.7**.
  > **Deuda técnica asentada:** esta composición hace **una consulta por mesa abierta**. Con pocas mesas es liviano; si el número de **mesas simultáneas crece**, deberá migrarse a un **RPC agregado** (p. ej. `recaudacion_mesas_abiertas()`).

### 3. Estados `[x]`
- **Cargando:** indicador por sección (no bloquea todo el panel).
- **Error por bloque:** la métrica que falla queda en `—` sin romper el resto.
- **Sin datos:** textos guía en las secciones vacías.

### 4. Documentación `[x]`
- Nuevo plan (este archivo) y `README.md`.
- `workflow-implementacion-mobile.md`: nota de que el Inicio es un **panel operativo**.

## Criterios de Aceptación y Verificación
- [x] El Inicio muestra **resumen**, **acciones rápidas** y **solicitudes**; ya no queda vacío con linaje confirmado.
- [x] Las tarjetas reflejan **datos reales** y navegan al listado correspondiente.
- [x] Las métricas se **actualizan al volver** a la pantalla (`useFocusEffect`).
- [x] "Clases sin asistencia" muestra **solo el conteo** de los **últimos 7 días**, sin listar ni hacer consultas anidadas.
- [x] La **recaudación** del Maestro se calcula con `listarPostulacionesMesa(id)` por mesa abierta, conforme al **SRS §3.7**.
- [x] Queda documentada la **deuda técnica** del RPC agregado si crecen las mesas simultáneas.
- [x] Si una métrica falla, **el resto del panel sigue funcionando** (carga por bloques independientes).
- [x] El **Maestro** ve un resumen de **su rama**, no métricas de alumnos propios.
- [x] El flujo de **solicitudes de linaje** sigue funcionando igual.
- [x] "Cerrar sesión" queda discreto al final.
- [x] Sin migración ni métodos nuevos; `npm run typecheck` limpio.
- [x] Lint: el Inicio dejó de reportar el error `set-state-in-effect` (errores del proyecto: 3 → 2).

### Componentes nuevos
- `mobile/src/components/TarjetaMetrica.tsx` — tarjeta de métrica navegable (tono neutro/alerta).
- `mobile/src/components/BotonAccion.tsx` — botón de acción rápida.

---
🐧
