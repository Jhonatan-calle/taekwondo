# Plan: Control de Asistencia (Fase 4, ítem 4) — `mobile-control-asistencia.md`

## Metadatos
- **Versión:** 1.2
- **Estado:** Aprobado
- **Fecha:** 2026-09-21
- **Fecha de aprobación:** 2026-09-21

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-21 | Borrador inicial: control de asistencia de la Fase 4, ítem 4 del workflow. Selector de clase activa por fecha (reutiliza el listado de `clases`), listado de alumnos activos del grupo, marcado Presente/Ausente de un toque y persistencia bulk atómica en `asistencia` vía RPC `SECURITY DEFINER`; RLS de lectura para el profesor dueño del grupo; tipos, métodos de contexto, pantalla `clase/[id]/asistencia` y navegación. |
| 1.1 | 2026-09-21 | Se elimina la tarea de `ALTER TABLE public.asistencia ADD PRIMARY KEY (clase_id, alumno_id)`: la PK compuesta **ya existe** en `20260915001759_esquema_inicial.sql` (el `ON CONFLICT` es válido y el `ALTER` duplicado fallaría). Se reemplaza por una **verificación** del constraint en remoto y por la **documentación de la tabla `asistencia`** (PK y FKs) en `databaseModel.md`. |
| 1.2 | 2026-09-21 | Corrección: el bloque `ASISTENCIA` **ya existe** en `databaseModel.md` (debajo de `CLASES`), por lo que la instrucción deja de decir que se debe "agregar la tabla" y pasa a indicar que se debe **actualizar el bloque existente** marcando la PK compuesta `(clase_id, alumno_id)` y las especificaciones de FKs, evitando generar una tabla duplicada. |

## Restricciones y Correcciones Previas (No repetir)
1. **Torneos y web congelados:** No tocar tablas ni lógica de torneos (`torneos`, `inscripciones`, etc.) ni la plataforma web (`web/`).
2. **Uso exclusivo del staff:** La app es solo para instructores y maestros; los alumnos no tienen usuario ni sesión propia. La asistencia la registra el profesor.
3. **Fail gracefully:** Toda comunicación con Supabase se envuelve con `ejecutarConsulta`, capturando errores y mostrando `MENSAJE_ERROR_GENERICO` sin exponer errores crudos ni stack traces en la UI.
4. **Asistencia solo sobre clases propias:** Solo el profesor dueño del grupo de la clase (`grupos.profesor_id = auth.uid()`) puede leer y registrar asistencia.
5. **No reimplementar:** Reutilizar helpers existentes (`es_alumno_directo_de`, `ejecutarConsulta`, `etiquetaGrado`, patrón RPC `SECURITY DEFINER` de `editar_miembros_grupo`); no reintroducir lógica ya existente.
6. **No re-agregar la PK de `asistencia`:** La PK compuesta `(clase_id, alumno_id)` ya existe desde el esquema inicial; un `ALTER TABLE ... ADD PRIMARY KEY` duplicado falla en PostgreSQL. La tarea correcta es **verificar** el constraint y **documentarlo**, no alterarlo.
7. **Escritura solo por RPC:** No se crean políticas de INSERT/UPDATE/DELETE sobre `asistencia`; la unicidad de la escritura atómica se garantiza con el RPC (patrón usado en `graduaciones`).
8. **No duplicar la documentación de `asistencia`:** El bloque `ASISTENCIA` ya existe en `databaseModel.md`; se **actualiza** (PK compuesta + FKs), nunca se agrega una tabla repetida.

## Contexto / Objetivo
Implementar el ítem 4 de la Fase 4 del workflow móvil:

- **Selector de clase activa por fecha:** El listado `/instructor/clases` (creado en el ítem 3) funciona como selector; se marca la clase del día con un badge "Hoy".
- **Interfaz de toma de asistencia:** Listado de los estudiantes **inscritos (miembros activos)** en el grupo de la clase, para marcar **Presente/Ausente con un toque**.
- **Persistencia atómica:** Un único RPC `guardar_asistencia_clase` impacta la tabla `asistencia` en **una sola transacción** (todo o nada), con `insert ... on conflict (clase_id, alumno_id) do update`.

**Decisión de UX acordada:** los toques se reflejan al instante en la UI, pero se persisten todos juntos con el botón **"Guardar asistencia"** (bulk atómico). Al abrir una clase sin registros previos, **todos los alumnos aparecen como Presente por defecto**.

---

## Cambios Concretos Propuestos

### 1. Base de Datos (Supabase)
Migración nueva: `supabase/migrations/<timestamp>_control_asistencia.sql`
(crear con `npx supabase migration new control_asistencia`).

#### 1.1. Verificación de la PK existente (NO alterar)
La tabla `public.asistencia` ya define `primary key (clase_id, alumno_id)` desde
`20260915001759_esquema_inicial.sql`. Antes del `db push` se verifica en el remoto:

```sql
select conname
  from pg_constraint
 where conrelid = 'public.asistencia'::regclass
   and contype = 'p';
-- Esperado: asistencia_pkey
```

Esto garantiza que el índice único requerido por `ON CONFLICT (clase_id, alumno_id)` exista.

#### 1.2. RLS de lectura para el profesor dueño del grupo
```sql
drop policy if exists "asistencia_select_profesor" on public.asistencia;
create policy "asistencia_select_profesor"
  on public.asistencia for select to authenticated
  using (
    exists (
      select 1
        from public.clases c
        join public.grupos g on g.id = c.grupo_id
       where c.id = asistencia.clase_id
         and g.profesor_id = auth.uid()
    )
  );
```

#### 1.3. RPC de escritura atómica
`guardar_asistencia_clase(p_clase_id uuid, p_registros jsonb) returns boolean`
(`SECURITY DEFINER`, `set search_path = public`):
1. Valida que el grupo de la clase pertenezca a `auth.uid()` (`raise exception` si no).
2. Valida que el usuario tenga `es_profesor = true`.
3. Valida que cada `alumno_id` sea alumno directo (`es_alumno_directo_de`).
4. Persiste todo el conjunto en una transacción con upsert.

```sql
create or replace function public.guardar_asistencia_clase(
  p_clase_id uuid,
  p_registros jsonb
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profesor uuid;
  v_es_profesor boolean;
begin
  select g.profesor_id into v_profesor
    from public.clases c
    join public.grupos g on g.id = c.grupo_id
   where c.id = p_clase_id;

  if v_profesor is null or v_profesor <> auth.uid() then
    raise exception 'No autorizado para esta clase.';
  end if;

  select es_profesor into v_es_profesor
    from public.profiles
   where id = auth.uid();

  if coalesce(v_es_profesor, false) <> true then
    raise exception 'Solo un profesor puede registrar asistencia.';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(coalesce(p_registros, '[]'::jsonb)) as r
     where not public.es_alumno_directo_de(auth.uid(), (r->>'alumno_id')::uuid)
  ) then
    raise exception 'Solo se puede registrar asistencia de alumnos directos.';
  end if;

  insert into public.asistencia (clase_id, alumno_id, presente)
  select p_clase_id,
         (r->>'alumno_id')::uuid,
         coalesce((r->>'presente')::boolean, false)
    from jsonb_array_elements(coalesce(p_registros, '[]'::jsonb)) as r
  on conflict (clase_id, alumno_id)
    do update set presente = excluded.presente;

  return true;
end;
$$;

revoke execute on function public.guardar_asistencia_clase(uuid, jsonb) from public, anon;
grant execute on function public.guardar_asistencia_clase(uuid, jsonb) to authenticated;
```

Notas:
- El upsert **no borra** filas omitidas: preserva el historial de alumnos que luego salieron del grupo.
- No se requieren políticas de INSERT/UPDATE: la escritura pasa solo por el RPC.
- No se crea índice extra: la PK `(clase_id, alumno_id)` ya cubre las búsquedas por `clase_id`.

#### 1.4. Documentación del modelo de datos
**Actualizar el bloque existente `ASISTENCIA`** en `documentacion/databaseModel.md` (ya definido debajo de `CLASES`, aprox. líneas 94-99). **No crear una tabla/bloque nuevo**, para no duplicar la definición:
- Marcar la **PK compuesta** en las columnas ya existentes, siguiendo la convención del documento (`PK, FK`), p. ej.:
  ```
  ASISTENCIA {
      uuid clase_id PK, FK
      uuid alumno_id PK, FK
      bool presente
      timestamptz creado_en
  }
  ```
- Añadir las **especificaciones de FKs**: `clase_id → clases(id)` y `alumno_id → profiles(id)`, ambas `on delete cascade`.
- Dejar anotada la **PK `(clase_id, alumno_id)`** (`asistencia_pkey`), que es el índice único requerido por el `ON CONFLICT` del RPC.

### 2. Tipos en `mobile/src/lib/perfil.ts`
```typescript
export type AlumnoGrupo = Pick<AlumnoDirecto, 'id' | 'nombre_completo' | 'grado_actual' | 'dni'>

export type AsistenciaItem = {
  alumno_id: string
  presente: boolean
}
```

### 3. Contexto y Métodos en `mobile/src/contextos/AuthGlobal.tsx`
Agregar y exponer en `AuthGlobalValue` (más `valor` memo y deps), todos envueltos con `ejecutarConsulta`:

- **`listarAlumnosDeGrupo(grupoId: string): Promise<ResultadoConsulta<AlumnoGrupo[] | null>>`**
  - Consulta `miembros_grupo` con `estado = 'activo'` y `profiles!inner(...)`, ordenando por nombre.
    > Verificar en implementación el nombre exacto de la relación: `profiles!miembros_grupo_alumno_id_fkey`.
  - RLS `miembros_select_profesor` + `profiles_select_maestro_directo` ya lo permiten.
- **`listarAsistenciaClase(claseId: string): Promise<ResultadoConsulta<AsistenciaItem[] | null>>`**
  - `supabase.from('asistencia').select('alumno_id, presente').eq('clase_id', claseId)`.
- **`guardarAsistenciaClase(claseId: string, registros: AsistenciaItem[]): Promise<{ error: string | null }>`**
  - `supabase.rpc('guardar_asistencia_clase', { p_clase_id: claseId, p_registros: registros })`.
  - Retorna `{ error: MENSAJE_ERROR_GENERICO }` si falla o si `data !== true`.

### 4. Pantallas en `mobile/src/app/(tabs)/instructor/`
#### 4.1. Reestructura de la ruta de clase
- Mover `clase/[id].tsx` → `clase/[id]/index.tsx` y agregar `clase/[id]/asistencia.tsx`.
  Los `router.push('/instructor/clase/${id}')` existentes siguen funcionando.
- En `_layout.tsx` registrar:
  - `clase/[id]/index` → título "Detalle de la clase".
  - `clase/[id]/asistencia` → título "Toma de asistencia".

#### 4.2. `clase/[id]/index.tsx` (detalle)
- Reemplazar el botón placeholder "Ver grupo" por el botón primario **"Tomar asistencia"**
  → `router.push('/instructor/clase/${id}/asistencia')`.
- Mantener la ficha técnica actual (objetivo, tuls, preparación física) y "Ver grupo" como acción secundaria.

#### 4.3. `clase/[id]/asistencia.tsx` (nueva pantalla)
- **Carga** (`useFocusEffect`): `obtenerClaseDetalle(id)`, `listarAlumnosDeGrupo(clase.grupo_id)` y
  `listarAsistenciaClase(id)`.
- **Estado local** `Record<alumno_id, boolean>`: inicializa **todos en Presente** y sobrescribe con lo
  ya guardado.
- **Cabecera:** nombre del grupo, fecha, horario y contador **Presentes · Ausentes** en vivo.
- **Acciones rápidas:** "Marcar todos presentes" / "Marcar todos ausentes".
- **Listado (`FlatList`):** nombre + `etiquetaGrado(grado_actual)` + DNI. Un toque alterna
  Presente (verde) ↔ Ausente (rojo), con `accessibilityState`.
- **Pie:** botón **"Guardar asistencia"** (deshabilitado durante el guardado) que llama a
  `guardarAsistenciaClase`; en éxito `Alert` de confirmación, en error `Alert` genérico +
  `reportarError()` si aplica.
- **Estados:** cargando; error con reintentar; grupo sin alumnos activos
  ("Este grupo no tiene alumnos asignados").

### 5. Navegación y Selector por fecha
- `instructor/clases.tsx`: badge **"Hoy"** en las clases cuya `fecha` sea la actual (el listado ya
  ordena por `fecha desc, hora_inicio desc`). Sin cambios de contrato.
- `instructor/index.tsx`: sin cambios de ruta; ajustar la descripción de "Toma de asistencia" a
  "Registrar presentes y ausentes".

### 6. Documentación
- Crear este plan: `documentacion/planes/mobile-control-asistencia.md`.
- `documentacion/README.md`: agregar la fila del plan.
- `documentacion/databaseModel.md`: **actualizar** el bloque `ASISTENCIA` existente (ver 1.4).
- `documentacion/workflow-implementacion-mobile.md`: al cerrar, marcar la Fase 4, ítem 4 como
  implementada (referencia a este plan).

---

## Criterios de Aceptación y Verificación
- [x] Migración `control_asistencia` creada con `npx supabase migration new` y aplicada con
      `supabase db push --linked`.
- [x] Verificado en remoto que `asistencia` tiene PK `(clase_id, alumno_id)` (`asistencia_pkey`) —
      sin ejecutar ningún `ALTER TABLE ... ADD PRIMARY KEY`.
- [x] Se **actualizó el bloque `ASISTENCIA` existente** en `databaseModel.md` con la PK compuesta `(clase_id, alumno_id)` y las especificaciones de FKs `on delete cascade`, sin generar un bloque duplicado.
- [x] `supabase db lint --linked`: sin hallazgos en `guardar_asistencia_clase` (el único reportado es `sincronizar_resultado_en_vivo`, del módulo de torneos congelado y preexistente).
- [x] La pantalla de asistencia lista **solo** los alumnos activos del grupo de la clase.
- [x] Por defecto todos Presente; un toque alterna a Ausente y viceversa; contadores en vivo.
- [x] "Guardar asistencia" impacta `asistencia` en **una sola transacción** (todo o nada).
- [x] Al reabrir la clase se refleja la asistencia ya guardada.
- [x] Prueba de RLS: un profesor no puede leer ni registrar asistencia de clases de otro profesor (policy + validación del RPC).
- [x] Manejo de errores gracefully ante fallo de red/BD.
- [x] Verificación de tipos TypeScript (`npm run typecheck` en `mobile/`) limpio.

---
🐧
