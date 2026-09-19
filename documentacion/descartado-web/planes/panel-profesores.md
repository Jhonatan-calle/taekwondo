# Plan: Panel de Profesores — Validación de Inscripciones

> **Metadatos**
> - **Versión:** 1.2
> - **Estado:** Aprobado
> - **Fecha de aprobación:** 2026-09-15

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-15 | Borrador inicial (secciones agrupadas por torneo, sin email, historial incluido). |
| 1.1 | 2026-09-15 | **Revisión del usuario:** (1) corregido nombre de tabla `perfiles` → `profiles` en la consulta embedded; (2) upsert de `guardarAgresividad` con `inscripcion_id` (PK) explícito; (3) usar componente `Badge` para estados (scannability); (4) **decisión:** agregar auditoría simétrica `rechazado_por`/`rechazado_en`. Aprobado. |
| 1.2 | 2026-09-16 | **Corrección post-implementación:** la consulta embedded de `page.tsx` volvió a usar `perfiles`/`fila.perfiles` en lugar de `profiles`/`fila.profiles` (restricción #1), lo que rompía el listado (catch → `[]`). Corregido; se registra restricción #7 y Notas de cierre. |

## Restricciones y Correcciones Previas (No repetir)
1. En las consultas embedded de Supabase la tabla real del usuario se llama `profiles` (NUNCA `perfiles`). Desambiguación por FK: `profiles!inscripciones_alumno_id_fkey(...)`.
2. El upsert a `inscripciones_datos_privados` debe incluir SIEMPRE `inscripcion_id` (PK) en el objeto, o falla por restricción.
3. Estados en la UI con componente `Badge` (variantes `default`/`success`/`warning`/`destructive`). No repetir `rounded-full bg-muted ...` inline.
4. `confirmarInscripcion`/`rechazarInscripcion` con `.eq('estado','pendiente')` para evitar doble procesamiento (0 filas → "ya procesada").
5. Cambios de estado y `nivel_agresividad` con el **cliente autenticado de servidor** (`createClient`) apoyándose en RLS (NUNCA `supabaseAdmin`).
6. NO tocar `.env*`. Migraciones por CLI (`npx supabase migration new <slug>`).
7. La tabla embedded es `profiles` en el **string de `.select()`** y la propiedad resultante es `fila.profiles` (nunca `fila.perfiles`). Un solo carácter mal (typo `perfiles`) hace fallar el embed, el `try/catch` devuelve `[]` y la card queda vacía sin señal visible de error. Verificar el nombre exacto en ambos lugares al tocar la consulta.

## Contexto / objetivo
Segundo ítem de Fase 3. El profesor (aval) visualiza en `/panel` las inscripciones donde es `profesor_id`, confirma a quienes ya pagaron, rechaza las que no correspondan y carga el **nivel de agresividad** (1–5), dato interno invisible para el alumno (regla §3).

## Decisiones cerradas (feedback de usuario)
- **D-1:** Sección nueva en el panel actual, agrupada por torneo, sobre la card "Nuevo torneo".
- **D-2:** No mostrar el email del alumno (vive en `auth.users`).
- **D-3:** Confirmar/rechazar = solo cambio de estado. La agresividad se edita aparte (upsert), disponible en filas confirmadas.
- **D-4:** Historial completo: Pendientes / Confirmados / Rechazados por torneo.
- **D-5:** Auditoría simétrica de rechazo: columnas `rechazado_por` / `rechazado_en`.

## Cambios concretos

### 1. Migración SQL — `20260915152926_panel_profesor_inscripciones.sql`
```sql
alter table public.inscripciones
  add column rechazado_por uuid references public.profiles(id),
  add column rechazado_en timestamptz;

create policy "datos_privados_select_profesor"
  on public.inscripciones_datos_privados for select
  to authenticated
  using (
    auth.uid() = (select profesor_id from public.inscripciones where id = inscripcion_id)
    or auth.uid() in (
      select t.organizador_id from public.torneos t
      join public.inscripciones i on i.torneo_id = t.id
      where i.id = inscripcion_id
    )
  );
```

### 2. `web/src/components/ui/badge.tsx` (nuevo)
`Badge` con `cva`: `default` (muted), `success` (emerald), `warning` (amber), `destructive`. Con `data-slot="badge"`.

### 3. `web/src/app/(panel)/panel/actions.ts` — nuevas Server Actions
- `confirmarInscripcion(estado, form)`: update `estado='confirmado', confirmado_por=uid, confirmado_en=now()` con `.eq('id',id).eq('estado','pendiente').select('id')`; 0 filas → "Esta inscripción ya fue procesada."
- `rechazarInscripcion(estado, form)`: idem con `estado='rechazado', rechazado_por, rechazado_en`.
- `guardarAgresividad(estado, form)`: valida `nivel_agresividad` ∈ 1–5; `upsert({ inscripcion_id, nivel_agresividad })`.
- Patrón: `try/catch` → `registrarError` + mensaje genérico; `redirect('/panel')` al éxito.

### 4. `web/src/app/(panel)/panel/page.tsx` — consulta + agrupación
- Query RLS (createClient):
```ts
.from('inscripciones')
.select(`id, estado, datos_antropometricos, creado_en, confirmado_en,
         torneos(id, nombre, fecha),
         profiles!inscripciones_alumno_id_fkey(nombre_completo),
         inscripciones_datos_privados(nivel_agresividad)`)
.eq('profesor_id', user.id)
.order('creado_en', { ascending: false })
```
- Map a `InscripcionesGrupo[]` (`pendientes/confirmados/rechazados`), ordenadas por fecha de torneo desc.
- Render: nueva card "Inscripciones para confirmar" (con `InscripcionesSeccion`) arriba de "Nuevo torneo". Badges de estado de torneo con `Badge`.

### 5. `web/src/app/(panel)/panel/inscripciones.tsx` (nuevo, Client)
- `InscripcionesSeccion` → `InscripcionesTorneo` (header torneo + contadores Badge + subsecciones).
- `FilaPendiente`: form `confirmarInscripcion` ("Confirmar pago") + `rechazarInscripcion` ("Rechazar", outline/destructive).
- `FilaConfirmado`: form `guardarAgresividad` con `Select` 1–5 (default valor actual o 3) + elegir cinturón/grado etiquetas.
- `FilaRechazado`: estilado apagado (border destructive/5), solo datos.
- `FilaDatos`: nombre, Badge grado (`ETIQUETA_GRADO_INSCRIPCION`), peso/altura, edad calculada, Badge estado, agresividad (no pendientes).

### 6. `web/src/components/ui/submit-button.tsx` — ampliar props
Aceptar `variant` y `size` (`VariantProps<typeof buttonVariants>`) para sostener el "Rechazar" outline. Retrocompatible con usos actuales.

### 7. `web/src/components/ui/card.tsx` — `CardDescription`
Nuevo subcomponente (`text-sm text-muted-foreground`), usado en headers de card del panel.

### 8. Documentación (sincronizar)
- `documentacion/databaseModel.md`: columnas `rechazado_por/rechazado_en` en `INSCRIPCIONES`; nota en `INSCRIPCIONES_DATOS_PRIVADOS.nivel_agresividad` (SELECT solo profesor del aval/organizador; invisible alumno).
- `documentacion/guia-estetica.md`: catálogo + `Badge` y `CardDescription`.
- `documentacion/mvc/workflow.md`: ítem "Panel de Profesores" → `[x]`.

## Criterios de aceptación
- [x] Profesor ve sus inscripciones (aval) agrupadas por torneo, con historial completo.
- [x] Confirmar pago → `confirmado` con audit `confirmado_por/en`; rechazar → `rechazado` con `rechazado_por/en`; nº caso ya procesado.
- [x] Agresividad 1–5 upsert con PK explícita; invisible al alumno (RLS sin SELECT para él).
- [x] Estados escaneables con `Badge`; sin clases inline repetidas.
- [x] `lint` + `build` OK, docs sincronizadas.

## Verificación manual
(1) Crear torneo, inscribir alumnos desde `/t/<token>`, verlas en `/panel` agrupadas. (2) Confirmar y rechazar; recargar para ver historial. (3) Editar agresividad y confirmar persistencia. (4) El alumno autenticado no puede leer `nivel_agresividad` (RLS). (5) Otro profesor no ve esas filas.

## Notas de cierre (implementación)
- **Migración `20260915152926_panel_profesor_inscripciones`** aplicada en remoto: `migration list` muestra local/remoto sincronizados.
- **Archivos:** `panel/actions.ts` (`confirmarInscripcion`/`rechazarInscripcion`/`guardarAgresividad`) · `panel/page.tsx` (consulta + agrupación) · `panel/inscripciones.tsx` (Client) · `components/ui/badge.tsx` · `card.tsx` (`CardDescription`) · `submit-button.tsx` (`variant`/`size`).
- **Corrección 1.2:** `panel/page.tsx` usaba `perfiles!inscripciones_alumno_id_fkey` / `fila.perfiles` → corregido a `profiles` (ver restricción #1 y #7).
- **Dependencia cruzada:** el flujo de inscripción (`/t/<token>`) requiere poder crear torneos; el bug de `organizador_id` se corrigió en `flujo-inscripcion-web.md` v1.3.
- **Pendiente de verificación manual (UI):** confirmar/rechazar/agresividad end-to-end en el navegador con sesión de profesor y alumnos inscriptos.