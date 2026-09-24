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
| `planes/mobile-pagos-alquiler.md` | Plan vigente: pagos de alquiler y storage (Fase 5, ítem 2) — registro del pago mensual (periodo único por locación, monto y fecha) con comprobante (cámara/galería/PDF) en el bucket **privado** `comprobantes`; en la fila se guarda el path y se visualiza por **enlace firmado** temporal; el superior jerárquico accede por auditoría (SRS §2) (implementado; pruebas RLS en dispositivo pendientes). |
| `planes/mobile-auditoria-cascada.md` | Plan vigente: auditoría en cascada para superiores (Fase 5, ítem 3) — el Maestro consulta locaciones, valor pactado, estado de pago **derivado** y comprobantes de toda su rama descendente (RLS `*_select_superior`, incluida `comprobantes_select_superior` de **Storage**); solo lectura, con filtro por instructor (implementado; prueba con cuenta de nieto pendiente). |
| `planes/db-seed-auditoria.md` | Registro: seed de datos para prueba manual — árbol de **3 niveles** con cuentas de login (`seed-sensei@`, `seed-jhona@`), locaciones de 3 dueños distintos y los 3 estados de pago (al día / vencida / sin pagos); aditivo e idempotente, corrige un `comprobante_url` roto (implementado). |
| `planes/mobile-cuotas-alumnos.md` | Plan vigente: cuotas de alumnos (Fase 6) — registro manual del pago mensual (periodo, monto, fecha) con prevención de duplicados por `UNIQUE (alumno_id, periodo)`, historial en el detalle del alumno y listado de cobranzas por periodo con estado pagado/pendiente; solo el profesor directo accede (implementado). |
| `planes/mobile-mesas-examen.md` | Plan vigente: creación de mesas de examen (Fase 7, ítem 1) — el Maestro abre mesas con fecha y lugar (chips de locaciones u otro lugar), listado con estado y postulados, detalle, edición y cierre; **elimina `limite_inscripcion`** del modelo y corrige el SRS §3.7 y las Reglas §4 que lo exigían (implementado). |
| `planes/mobile-postulacion-examen.md` | Plan vigente: inscripción y postulación a examen (Fase 7, ítem 2) — el profesor postula a sus alumnos directos en mesas abiertas con el grado aspirado **calculado en el servidor** (RPC `postular_alumno`) y registra el derecho de examen; el Maestro ve la **recaudación total** de su mesa (SRS §3.7) (implementado). |
| `planes/mobile-postulaciones-acciones-claras.md` | Plan vigente (ajuste UX Fase 7.2): en "Tus postulaciones" la acción "Cobro" pasa a **"Editar cobro"** y la `✕` a un botón **"Quitar"** con texto y `accessibilityLabel`, con jerarquía visual (implementado). |
| `planes/mobile-planilla-evaluacion.md` | Plan vigente: planilla técnica y evaluación (Fase 7, ítem 3) — el maestro examinador consulta la planilla (RPC `planilla_mesa_examen`) y carga el resultado **individual** (Aprobado/Desaprobado/Ausente) con confirmación, solo con la mesa **cerrada/finalizada**; v1.1 agrega **mención especial** y **doble graduación** (grado +2, solo de blanco a azul punta roja) y documenta la **sobreescritura de `grado_aspirado`** con el grado otorgado; cierra el ítem 7.4 (ascenso y `graduaciones`) (implementado). |
| `planes/mobile-rediseno-inicio.md` | Plan vigente: rediseño de la pantalla de Inicio como **panel operativo** — resumen del mes (cuotas pendientes, clases sin asistencia de los últimos 7 días, grupos/alumnos), acciones rápidas, resumen de rama para el Maestro (alquileres vencidos, mesas y recaudación) y solicitudes de linaje; pasa a `useFocusEffect` (implementado). |
| `planes/mobile-dashboard-metricas.md` | Plan vigente: dashboard de métricas anonimizadas (Fase 8, ítem 1) — el Maestro consume el RPC `metricas_dashboard(p_vista, p_instructor)` y visualiza distribuciones por género, rango de edad y grado (gráficos con `react-native-gifted-charts` + `react-native-svg` + `expo-linear-gradient`), con filtro consolidada / instructor específico; solo conteos, nunca datos personales (implementado; v1.1 corrige la dependencia obligatoria de gradiente). |
| `planes/mobile-plan-de-pruebas.md` | Registro: creación del **catálogo de casos de prueba** `plan-de-pruebas.md` (permanente, por módulo) y su integración al flujo de trabajo (`AGENTS.md`) y al índice (implementado). |
| `planes/mobile-toggle-contrasena.md` | Plan vigente: botón de **mostrar/ocultar contraseña** con ícono de ojo (SVG propio, sin dependencias nuevas) en los 5 campos de contraseña (login, registro y nueva contraseña); toggle independiente por campo y accesible (implementado). |
| `planes/mobile-verificaciones-stack.md` | Plan vigente: verificaciones de stack y tipado (Fase 9, ítem 1) — `npm run typecheck` y `npm run lint` en verde (`0 problems`), corrigiendo el import/variable sin uso, la precarga del perfil y la carga de instructores en `onboarding` (supresión mínima `eslint-disable`) y un `useEffect` redundante en la asistencia (implementado). |
| `planes/mobile-pruebas-rls-fase9.md` | Plan vigente (aprobado, ejecución pendiente): pruebas integrales de RLS (Fase 9, ítem 2) — corrida manual en dispositivo con 4 perfiles (P0 Maestro, P1 y P2 del seed, P3 ajeno creado en la prueba) sobre el catálogo `plan-de-pruebas.md`: matriz de roles, recursividad, aislamiento, escritura restringida, gates anti-escalada, resiliencia y smoke; incluye bloque BD/API (B8) y el setup de Dan para P3. |
| `planes/db-fix-mapeo-cuentas-seed.md` | Plan vigente: corrección del mapeo de cuentas de prueba (limpieza determinista + seed por email) — elimina todo el drift, deja `jhona@taekwondo.test` (nivel 1) y `sensei@taekwondo.test` (nivel 2) con contraseña `Seed123456!`, árbol P0→P1→P2→6 alumnos verificado y seed idempotente (implementado). |
| `planes/mobile-linaje-confirmar-grado.md` | Plan vigente: confirmación del cinturón al aceptar el linaje (nuevo profesor) — el staff declara su cinturón obligatorio (`dan_1+`) y el superior, al aceptar, **confirma o ajusta** el grado con `grados_verificados = true` y activa `es_profesor`; `es_maestro` sigue solo por Service Role (implementado). |
| `planes/mobile-contacto-emergencia-obligatorio.md` | Plan vigente: contacto de emergencia **obligatorio** (nombre + teléfono con formato) en onboarding y alta de alumnos — reemplaza la columna `contacto_emergencia` por `contacto_emergencia_nombre` + `contacto_emergencia_telefono`, enforzado en BD, RPC y app; se elimina el carácter opcional en toda la documentación (implementado). |
| `planes/mobile-refresco-linaje-tiempo-real.md` | Plan vigente: refresco del linaje **en tiempo real** — Realtime (Postgres Changes) sobre `profiles` y `solicitudes_linaje`: el solicitante ve la confirmación/rechazo sin re-loguear y el superior ve las solicitudes nuevas/resueltas en vivo; incluye refresh al recuperar foco como fallback (implementado). |
| `planes/mobile-fix-flicker-onboarding-login.md` | Plan vigente: fix del **parpadeo del onboarding al iniciar sesión** — `perfilResuelto`/`resolviendoPerfil` en `AuthGlobal` + gate `cargando || resolviendoPerfil` en `_layout`; el login muestra un spinner y va directo al Inicio (implementado). |
| `planes/mobile-fix-navegacion-tab-stacks.md` | Plan vigente: fix de **navegación a stacks anidados de tabs** — ancla `unstable_settings.initialRouteName` en los stacks de Instructor/Maestro, `withAnchor` al navegar desde el Inicio y `tabPress` que vuelve al menú del tab (implementado). |
| `plan-de-pruebas.md` | **Catálogo de casos de prueba** (permanente): **144 casos** por módulo con IDs `TC-*` (auth, onboarding, linaje, navegación, inicio, alumnos, grupos, locaciones, clases, asistencia, cuotas, alquileres, auditoría, mesas, postulación, evaluación), **matriz de roles/RLS**, resiliencia y **smoke test** de 25 casos. Se extiende con cada implementación. |
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