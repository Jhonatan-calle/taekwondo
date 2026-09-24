# Plan: Objetivo de clase por elementos del ciclo ITF — `mobile-objetivo-clase-elementos.md`

## Metadatos
- **Versión:** 1.2
- **Estado:** Aprobado
- **Fecha:** 2026-09-24
- **Fecha de aprobación:** 2026-09-24

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-24 | Borrador y aprobación: el objetivo de la clase pasa a **1–2 elementos del ciclo ITF** (modal) + **detalle opcional**; se quita `contenido_tuls`; nueva vista **“Objetivos de clase”** con distribución (% sobre menciones) y filtros de período/grupo. |
| 1.1 | 2026-09-24 | **Implementado.** Migración `20260924133843_objetivo_clase_elementos.sql`, app actualizada y vista `instructor/objetivos`. `typecheck`/`lint` en verde. `db push` pendiente (requiere `supabase login`). Se agrega sección de **Roadmap** (reutilización de clases). |
| 1.2 | 2026-09-24 | **Se elimina `preparacion_fisica`** (migración `20260924140305_quitar_preparacion_fisica.sql`; se descarta su texto). El campo **“Detalles (opcional)”** se amplía (multilínea, ~128 px). `CampoTexto` ahora acepta `style`. Obligatorios: grupo, fecha, horas y 1–2 objetivos. |

## Restricciones y Correcciones Previas (No repetir)
1. No tocar torneos, `web/` ni `.env*`; español; sin commits automáticos.
2. **No romper** la creación de clase ni la **toma de asistencia** (siguen dependiendo de `clases`).
3. Enum nuevo con el patrón del proyecto; migración con `npx supabase migration new`.
4. **Fail gracefully** en la vista de objetivos.
5. La BD no puede inferir los elementos del texto libre viejo → el texto se migra a **Detalles**.

## Contexto / Objetivo
El “objetivo” de una clase era **texto libre** y `contenido_tuls` redundaba con *Formas (Tules)*. Ahora el objetivo son **1–2 elementos del ciclo de composición ITF** + **detalle opcional**, y hay una vista de **distribución** para ver a qué se le da más o menos foco.

## Cambios implementados

### 1. BD — `20260924133843_objetivo_clase_elementos.sql`
- Enum `public.elemento_clase`: `movimientos_fundamentales`, `formas`, `accesorios`, `matsogi`, `hosin_sul`.
- `clases` **+** `elementos_objetivo public.elemento_clase[]` **+** `objetivo_detalle text`.
- **Check** `clases_elementos_objetivo_check`: `elementos_objetivo is null or cardinality between 1 and 2`.
- **Migración de datos:** `objetivo_detalle = concat_ws(E'\n', objetivo, contenido_tuls)`; luego **drop** de `objetivo` y `contenido_tuls`.
- `preparacion_fisica` **se elimina** (migración `20260924140305_quitar_preparacion_fisica.sql`). RLS sin cambios.

### 2. App
- `constants/elementosClase.ts`: `ELEMENTOS_CLASE`, `ElementoClase`, `MAX_ELEMENTOS_CLASE = 2`, `etiquetaElemento`, `etiquetaElementoCorta`.
- `lib/perfil.ts`: `ClaseItem`/`DatosNuevaClase` con `elementos_objetivo` + `objetivo_detalle`; `ResumenObjetivo` + **`resumirObjetivos()`** (porcentaje sobre **menciones**, suma 100%).
- `contextos/AuthGlobal.tsx`: `listarClases`/`obtenerClaseDetalle`/`crearClase` con los campos nuevos.
- `instructor/nueva-clase.tsx`: **modal** para elegir 1–2 elementos (aviso al 3.º), **“Detalles (opcional)”**; se quita “Contenido de Tuls / Formas”.
- `instructor/clases.tsx` y `clase/[id]/index.tsx`: muestran los elementos (etiquetas) + detalle.
- `instructor/objetivos.tsx` (**nueva**): filtros período (Mes actual / Últimos 3 meses / Todo) y grupo; barras por elemento con `N clases · X%`; estado vacío y error.
- `instructor/_layout.tsx` + `instructor/index.tsx`: entrada “Objetivos de clase”.

### 3. Vista de distribución
- `% = clases del elemento / total de menciones × 100` (los 5 suman 100%).
- Sin marca de “a reforzar”: el profesor interpreta las barras.

## Criterios de aceptación
- [x] Se crea una clase eligiendo **1** y **2** elementos; **no** permite 0 ni 3.
- [x] Columnas nuevas; `objetivo` y `contenido_tuls` fuera; el texto viejo queda en **Detalles**.
- [x] Listado y detalle muestran elementos + detalle.
- [x] Vista **Objetivos de clase** con conteo, % (suma 100%) y filtros; vacío y fail gracefully.
- [x] `typecheck` y `lint` en verde.
- [ ] `db push --linked` + `db lint --linked` (requiere `supabase login` del entorno).

## Documentación sincronizada
- `plan-de-pruebas.md`: `TC-CLA-01/02/05` actualizados, `TC-CLA-07` (tope de 2) y nuevo módulo **`TC-OBJ`**.
- `databaseModel.md`, `srs-sistemaDeGestionTaekwondo.md`, `README.md`, `workflow-implementacion-mobile.md`.
- Historial en `planes/mobile-creacion-clase.md` y `planes/mobile-control-asistencia.md`.

## Roadmap / Fuera de alcance
- **Reutilización de clases:** que el profesor no tenga que cargar la ficha técnica clase por clase.
  - Opción A: **“Reutilizar/duplicar clase”** desde una existente (precarga objetivo(s) y detalle; se elige grupo + fecha).
  - Opción B: **plantillas de clase** desacopladas de grupo/fecha.
  - Se definirá en un plan futuro (`mobile-reutilizar-clases.md`).

## Riesgos
- Migración destructiva de dos columnas (mitigada: el texto se conserva en Detalles).
- Pocas clases al inicio → distribución poco significativa (esperable).

---

🐧
