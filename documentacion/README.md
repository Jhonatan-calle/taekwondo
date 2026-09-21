# Documentación — Taekwondo ITF

> **Enfoque actual (2026-09):** app móvil **React Native + Expo** + Supabase para la gestión
> integral de una escuela de Taekwondo ITF. El módulo de **torneos** (tablas intactas en la BD) y la
> plataforma **web** (`web/`, Next.js) quedaron **congelados** y fuera de desarrollo.

## Documentos vigentes

| Documento | Contenido |
|---|---|
| `srs-sistemaDeGestionTaekwondo.md` | **SRS principal** (fuente de verdad): jerarquía, privacidad en cascada, gestión de alumnos/grados/locaciones/clases/asistencia/cuotas/dashboard/exámenes. |
| `ReglasyRestricciones-SistemaTaekwondoITF.md` | Reglas de negocio, permisos y restricciones (escuela). |
| `databaseModel.md` | Modelo de datos (ER) + notas del módulo de torneos (congelado). |
| `planes/bd-gestion-escuela.md` | Plan vigente: adaptación de la BD al SRS (aplicado y verificado). |
| `planes/mobile-control-errores-fail-gracefully.md` | Plan vigente: mecanismo global de control de errores (fail gracefully) en la app móvil (implementado). |
| `planes/mobile-flujo-acceso-auth.md` | Plan vigente: flujo de acceso (registro, inicio de sesión y recuperación de contraseña) en el grupo de rutas `(auth)` (implementado). |
| `planes/mobile-arreglos-auth-require-cycle.md` | Plan vigente: detección de email duplicado en registro y ruptura del require cycle `ErrorGlobal <-> BannerError` (implementado). |
| `planes/db-purga-datos-seed.md` | Registro: purga de datos seed y baja de usuarios en la BD remota de Supabase (datos únicamente, schema intacto; conserva `jhonatancallegaleano@gmail.com` y `errores_runtime`). |
| `planes/mobile-deeplink-recuperacion-fix.md` | Plan vigente: deep link de recuperación — `LargeSecureStore` web-safe (crash en navegador) + paso de dashboard para redirect `exp://` en Expo Go (implementado). |
| `planes/mobile-onboarding-perfil.md` | Plan vigente: onboarding obligatorio de perfil — bloqueo de la app principal hasta completar `profiles` (nombre, DNI, fecha de nacimiento, peso, género) con RPC `verificar_dni_disponible` y campos complementarios no bloqueantes (implementado). |
| `planes/mobile-establecimiento-linaje.md` | Plan vigente: establecimiento del linaje (Fase 2, ítem 3) — el alumno elige a su instructor/maestro de una lista, la solicitud queda pendiente y el instructor la acepta/rechaza desde su pantalla; `maestro_id` se persiste solo al aceptar, con el flag `app.derivacion_linaje` (implementado). |
| `planes/mobile-analisis-perfil-inicio.md` | Plan vigente: análisis del perfil al iniciar (Fase 3, ítem 1) — recupera `grado_actual`, `es_profesor` y `es_maestro` del perfil autenticado y los expone en `AuthGlobal` (`gradoActual`, `esProfesor` gated por Dan y `esInstructor`), reutilizables por la navegación por árbol de poder (implementado). |
| `planes/mobile-rutas-condicionales-navegacion.md` | Plan vigente: rutas condicionales en la UI (Fase 3, ítem 2) — navegación por tabs (Inicio/Instructor/Maestro) según facetas del perfil (Instructor con la bandera cruda `es_profesor`, Maestro solo con `es_maestro`), ocultando tabs con `href: null` y bloqueando deep links con `Redirect`; menús de Instructor y Maestro con filas deshabilitadas por fase (implementado). |
| `planes/mobile-directorio-alta-alumnos.md` | Plan vigente: directorio y alta de alumnos directos (Fase 4, ítem 1) — listado por RLS `maestro_id`, alta sin cuenta de usuario vía RPC `alta_alumno` (elimina la FK de `profiles.id` a `auth.users`) y detalle solo-lectura; activa "Mis alumnos" y "Alta de alumno" en el menú Instructor (implementado). |
| `planes/mobile-grupos-horarios.md` | Plan vigente: creación de grupos y horarios (Fase 4, ítem 2) — formulario de grupo asociado a locación física (con alta mínima de locación anticipada de Fase 5.1) con **horarios estructurados** (`grupos_horarios`: día + inicio/fin), **dirección obligatoria** en la locación y **un solo grupo activo por alumno** (bandaje/traslado atómico vía RPCs); listado "Mis grupos" y detalle con asignación directa de alumnos (miembros `activo`); `codigo_invitacion` nullable, fuera de alcance v1 (implementado, v1.1). |
| `planes/mobile-grado-colores-y-telefono.md` | Plan vigente: etiquetas de grado por color (sin "Gup"; Dan I…Dan IX) y teléfono de contacto del perfil — solo cambia `ETIQUETAS_GRADO` en la UI; agrega `profiles.telefono` y `p_telefono` en `alta_alumno`, con campo en alta/onboarding y fila en el detalle (implementado). |
| `planes/mobile-creacion-clase.md` | Plan vigente: creación de clase (Fase 4, ítem 3) — sesiones en `clases` vinculadas a un grupo y fecha con documentación obligatoria (horarios, objetivo, tuls, preparación física), políticas RLS y selector activo para asistencia (implementado). |
| `planes/mobile-control-asistencia.md` | Plan vigente: control de asistencia (Fase 4, ítem 4) — listado de alumnos activos del grupo, marcado Presente/Ausente de un toque y guardado bulk atómico en `asistencia` vía RPC `SECURITY DEFINER`; verifica y documenta la PK compuesta existente (implementado). |
| `planes/mobile-asignacion-alumno-un-grupo.md` | Plan vigente: asignación de un alumno a un solo grupo — la UI oculta a los alumnos ya asignados y el RPC `editar_miembros_grupo` **rechaza** (ya no mueve) asignarlos a otro grupo; corrige la semántica de `mobile-grupos-horarios.md` v1.1 (reasignación explícita queda como plan aparte) (implementado). |
| `planes/mobile-registro-locaciones.md` | Plan vigente: registro de locaciones (Fase 5, ítem 1) — alta (nombre, dirección obligatoria y **valor de alquiler pactado** según SRS §3.3), listado, detalle con grupos asociados, edición y eliminación; `locaciones.valor_alquiler` pasa a `NOT NULL` + `check >= 0` y se distingue del monto pagado en `pagos_alquiler` (implementado). |
| `planes/mobile-editar-grupo-locacion.md` | Plan vigente: editar grupo y proteger el borrado de locaciones — el grupo pasa a ser editable (nombre, locación y horarios) vía RPC `editar_grupo`, y eliminar una locación con grupos asociados queda **bloqueado** (RPC `eliminar_locacion_segura`), evitando grupos huérfanos "Sin locación" (implementado). |
| `planes/mobile-refresco-detalle-foco.md` | Plan vigente: refresco de pantallas de detalle al recuperar foco — se reemplaza `useEffect` por `useFocusEffect` en `grupo/[id]`, `locacion/[id]`, `clase/[id]` y `alumno/[id]`, corrigiendo que al volver de editar se vieran datos viejos hasta reiniciar la app (implementado). |
| `pendientes-pruebas.md` | Checklist de validaciones E2E/en dispositivo pendientes (deep link de recuperación, email duplicado, guards, onboarding). |
| `workflow-implementacion-mobile.md` | Guía de pasos secuenciales y workflow de desarrollo de la app móvil. |
| `README.md` (este archivo) | Índice de documentación. |

## Documentos descartados (`descartado-web/`)

Pertenecen al enfoque anterior (MVP web Mobile-First + Next.js, prioridad torneos), hoy **congelado**.
Se conservan solo como historial/contexto; **no codear contra ellos**.

### Principales
- `descartado-web/mvc-stack.md` — Stack Next.js/Vercel (reemplazado por Expo + Supabase).
- `descartado-web/mvc-workflow.md` — Fases de desarrollo del MVP web (torneos).
- `descartado-web/guia-estetica-web.md` — Design system Tailwind/shadcn (no aplica a React Native).
- `descartado-web/descripcion-general-srs-web.md` — SRS del enfoque web (torneos, inscripción, emparejamiento).

### Planes web/superados (`descartado-web/planes/`)
- Web (módulo torneos): `flujo-inscripcion-web`, `guia-estetica-consistencia-visual`,
  `panel-profesores`, `motor-emparejamiento`, `navegacion-panel`, `panel-organizador`,
  `doble-categoria`, `diagnostico-guardar-llaves`, `fix-redireccion-emparejamiento`, `gestion-en-vivo`.
- BD/auth históricos (superados por `bd-gestion-escuela.md`): `inicializacion-frontend`,
  `inicializacion-backend`, `roles-duales`, `arbol-jerarquias`, `autenticacion-supabase-auth`,
  `restricciones-acceso`.

## Reglas de oro al tocar documentación
1. Actualizar este índice cuando se agregue/mueva/descarte un documento.
2. El SRS (`srs-sistemaDeGestionTaekwondo.md`) es la fuente de verdad funcional; no duplicarlo.
3. Mantener `AGENTS.md` sincronizado con este mapa de documentos.