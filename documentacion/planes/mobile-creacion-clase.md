# Plan: Creación de Clase (Fase 4, ítem 3) — `mobile-creacion-clase.md`

## Metadatos
- **Versión:** 1.0
- **Estado:** Aprobado
- **Fecha de aprobación:** 2026-09-21

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-21 | Borrador inicial: Planificación completa del ítem 3 de la Fase 4 del workflow: creación de sesiones de entrenamiento en `clases` vinculadas a un grupo y fecha, con horarios y documentación técnica obligatoria (`hora_inicio`, `hora_fin`, `objetivo`, `contenido_tuls`, `preparacion_fisica`), políticas RLS para `clases`, integración en el menú del instructor y habilitación de la opción "Toma de asistencia" como portal de clases. |
| 1.1 | 2026-09-24 | **Cambio de campos (plan `mobile-objetivo-clase-elementos.md`):** `objetivo` (texto libre) y `contenido_tuls` se reemplazan por **`elementos_objetivo` (1–2 elementos del ciclo ITF)** + **`objetivo_detalle` opcional**; `preparacion_fisica` se elimina. Se agrega la vista **"Objetivos de clase"** (distribución por elemento). |

## Restricciones y Correcciones Previas (No repetir)
1. **Torneos y web congelados:** No tocar tablas ni lógica de torneos (`torneos`, `inscripciones`, etc.) ni la plataforma web (`web/`).
2. **Uso exclusivo del staff:** La app es solo para instructores y maestros; los alumnos no tienen usuario ni sesión propia.
3. **Fail gracefully:** Toda comunicación con Supabase se envuelve con `ejecutarConsulta`, capturando errores y mostrando `MENSAJE_ERROR_GENERICO` sin exponer errores crudos o stack traces en la UI.
4. **Alumnos y grupos:** Las clases solo pueden crearse sobre grupos pertenecientes al profesor autenticado (`profesor_id = auth.uid()`).
5. **No adelantar la Fase 4.4 completa:** Este plan se enfoca en la **Creación de Clase y listado/selector de clases creadas**. La interacción táctil masiva de marcado de presentes/ausentes en `asistencia` corresponde al ítem siguiente (Fase 4, ítem 4: Control de Asistencia). Sin embargo, dejamos preparada la navegación y el selector activo.
6. **Campos obligatorios según workflow:** `grupo_id`, `fecha`, `hora_inicio`, `hora_fin`, `objetivo`, `contenido_tuls` y `preparacion_fisica` son de carga obligatoria para reflejar la planificación técnica marcial exigida por el SRS y el workflow.

## Contexto / Objetivo
Implementar el ítem 3 de la Fase 4 del workflow móvil:
Antes de registrar asistencias, el profesor crea la sesión particular en la tabla `clases` vinculada a un **grupo** y una **fecha**, documentando obligatoriamente:
- `hora_inicio` y `hora_fin` (formato horario HH:mm)
- `objetivo` (propósito pedagógico/técnico de la sesión)
- `contenido_tuls` (formas/tuls a practicar)
- `preparacion_fisica` (ejercicios físicos planificados)

Cada clase creada queda disponible en el listado/historial del grupo y como sesión activa en el selector para la posterior toma de asistencias (Fase 4.4).

---

## Cambios Concretos Propuestos

### 1. Base de Datos (Supabase)
Migración nueva: `supabase/migrations/<timestamp>_clases_politicas_rls.sql`
- La tabla `public.clases` ya existe con sus columnas (`id`, `grupo_id`, `fecha`, `hora_inicio`, `hora_fin`, `objetivo`, `contenido_tuls`, `preparacion_fisica`, `creado_en`) y tiene RLS habilitado desde el inicio, pero requiere políticas explícitas de seguridad:
  1. **SELECT (`clases_select_profesor`):**
     - Permitir a un usuario autenticado leer las clases de los grupos donde es profesor:
     ```sql
     create policy "clases_select_profesor"
       on public.clases for select to authenticated
       using (
         exists (
           select 1 from public.grupos g
            where g.id = grupo_id
              and g.profesor_id = auth.uid()
         )
       );
     ```
  2. **INSERT (`clases_insert_profesor`):**
     - Permitir insertar solo si el usuario autenticado es profesor (`es_profesor = true`) y es el dueño del grupo indicado (`profesor_id = auth.uid()`):
     ```sql
     create policy "clases_insert_profesor"
       on public.clases for insert to authenticated
       with check (
         exists (
           select 1 from public.grupos g
            where g.id = grupo_id
              and g.profesor_id = auth.uid()
         )
         and exists (
           select 1 from public.profiles p
            where p.id = auth.uid()
              and p.es_profesor = true
         )
       );
     ```
  3. **UPDATE / DELETE (`clases_update_profesor`, `clases_delete_profesor`):**
     - Permitir al profesor dueño del grupo editar o eliminar una sesión planificada.
  4. **Índice de optimización:**
     - `create index if not exists clases_grupo_fecha_idx on public.clases (grupo_id, fecha desc);`

### 2. Tipos y Validadores en `mobile/src/lib/`
#### `mobile/src/lib/perfil.ts`
- **Tipos de datos:**
  ```typescript
  export type ClaseItem = {
    id: string;
    grupo_id: string;
    nombre_grupo?: string;
    fecha: string; // YYYY-MM-DD
    hora_inicio: string; // HH:mm:ss o HH:mm
    hora_fin: string; // HH:mm:ss o HH:mm
    objetivo: string | null;
    contenido_tuls: string | null;
    preparacion_fisica: string | null;
  };

  export type DatosNuevaClase = {
    grupo_id: string;
    fecha: string; // YYYY-MM-DD
    hora_inicio: string; // HH:mm
    hora_fin: string; // HH:mm
    objetivo: string;
    contenido_tuls: string;
    preparacion_fisica: string;
  };
  ```
- **Validadores:**
  - `esHoraValida(hora: string): boolean`: Valida formato `HH:mm` (24 horas) y que `hora_fin > hora_inicio`.
  - `esTextoRequerido(texto: string, min = 2): boolean`: Valida strings no vacíos de al menos 2 caracteres.

### 3. Contexto y Métodos en `mobile/src/contextos/AuthGlobal.tsx`
Agregar al contexto y exponer en `AuthGlobalValue`:
- **`listarClases(grupoId?: string): Promise<ResultadoConsulta<ClaseItem[] | null>>`**
  - Consulta a Supabase `clases` uniendo `grupos(nombre)` y ordenando por `fecha desc, hora_inicio desc`.
  - Si se pasa `grupoId`, filtra por ese grupo.
- **`obtenerClaseDetalle(claseId: string): Promise<ResultadoConsulta<ClaseItem | null>>`**
  - Consulta los datos técnicos de una clase particular por su ID.
- **`crearClase(datos: DatosNuevaClase): Promise<ResultadoCreacion>`**
  - Inserta en `public.clases` los campos obligatorios limpios (`trim()`).
  - Envuelto en `ejecutarConsulta` con `fail gracefully`.

### 4. Vistas y Pantallas en `mobile/src/app/(tabs)/instructor/`
1. **`clases.tsx` (Lista y selector de Clases):**
   - Pantalla principal accesible desde la opción "Toma de asistencia" en el menú Instructor (o botón rápido desde "Mis grupos").
   - Selector de filtro por grupo (o "Todos los grupos").
   - Listado de clases ordenadas cronológicamente (indicando grupo, fecha formateada DD/MM/AAAA, horario `hora_inicio - hora_fin` y badge con objetivo).
   - Botón flotante o superior destacado: **"Nueva clase"** (`/instructor/nueva-clase`).
   - Al presionar una clase: navega al detalle/sesión de la clase (`/instructor/clase/[id]`), la cual dejará el camino listo para la toma de asistencia en el siguiente ítem.
   - Estados: cargando, error con reintentar y lista vacía (con llamada a la acción "Crear primera clase").

2. **`nueva-clase.tsx` (Formulario de Creación de Sesión):**
   - **Selector de Grupo:** Si no viene preseleccionado por query param (`?grupo_id=...`), muestra selector tipo dropdown o chips con los grupos del profesor (`listarGrupos`). Si el profesor no tiene grupos, muestra aviso y enlace para crear grupo.
   - **Selector de Fecha:** Por defecto hoy, con componente `DateTimePicker` (mismo patrón que `alta-alumno.tsx`).
   - **Horarios:**
     - `Hora inicio` (ej. 18:00) y `Hora fin` (ej. 19:30). Puede prellenar según el horario del grupo si aplica o mediante selector/input con validación.
   - **Campos Técnicos Obligatorios:**
     - `Objetivo de la sesión` (Campo de texto multilínea: ej. "Perfeccionamiento de patadas de giro y distancia").
     - `Contenido de Tuls / Formas` (Campo de texto multilínea: ej. "Dan-Gun y Do-San, corrección de sine wave").
     - `Preparación física` (Campo de texto multilínea: ej. "Tabata de 15 min, fortalecimiento de core y flexibilidad activa").
   - Botón **"Crear clase"**: valida todos los campos obligatorios, llama a `crearClase` y redirige a la vista de la clase recién creada o al listado de clases.

3. **`clase/[id].tsx` (Detalle de la Sesión Creada):**
   - Muestra la ficha técnica completa de la sesión (Grupo, Fecha, Horario, Objetivo, Tuls, Preparación física).
   - Cabecera con estado de la sesión y botón directo "Tomar asistencia" (que enlazará al control de presentes/ausentes de la Fase 4.4).

### 5. Navegación y Menú
- En [`mobile/src/app/(tabs)/instructor/_layout.tsx`](file:///home/jhonatan/Documentos/taekwondo/mobile/src/app/%28tabs%29/instructor/_layout.tsx):
  - Agregar pantallas `clases`, `nueva-clase`, `clase/[id]`.
- En [`mobile/src/app/(tabs)/instructor/index.tsx`](file:///home/jhonatan/Documentos/taekwondo/mobile/src/app/%28tabs%29/instructor/index.tsx):
  - Habilitar la fila **"Toma de asistencia"** (`habilitada: true`, `onPresionar: () => router.push('/instructor/clases')`).
- En [`mobile/src/app/(tabs)/instructor/grupo/[id].tsx`](file:///home/jhonatan/Documentos/taekwondo/mobile/src/app/%28tabs%29/instructor/grupo/%5Bid%5D.tsx):
  - Agregar botón o acceso rápido "Crear clase para este grupo" (`/instructor/nueva-clase?grupo_id=...`).

---

## Criterios de Aceptación y Verificación
- [x] Migración RLS de `clases` creada y aplicada a la base de datos con `supabase db push --linked`.
- [x] La opción "Toma de asistencia" en el menú de Instructor redirige al listado de clases.
- [x] El profesor puede planificar una clase asociándola a uno de sus grupos y a una fecha.
- [x] El formulario valida obligatoriamente `fecha`, `hora_inicio`, `hora_fin`, `objetivo`, `contenido_tuls` y `preparacion_fisica`.
- [x] Una vez creada la clase, aparece listada correctamente con sus datos y ficha de detalle accesible.
- [x] Pruebas de seguridad RLS: un profesor no puede crear clases para grupos de otro profesor ni ver clases ajenas.
- [x] Manejo de errores gracefully en caso de fallo de red o BD.
- [x] Verificación de tipos TypeScript (`npm run typecheck` en `mobile/`) limpio.
