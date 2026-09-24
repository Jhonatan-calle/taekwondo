# Plan de Workflow: Guia de Implementacion de la App Movil (Expo + Supabase)

> **Metadatos**
> - **Version:** 1.2
> - **Estado:** Revision
> - **Fecha de aprobacion:** 2026-09-20

## Historial de revisiones
| Version | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-20 | Borrador inicial: Creacion de la guia de pasos del orden de implementacion del sistema completo respetando el SRS, las reglas de negocio y el modelo de BD. |
| 1.1 | 2026-09-20 | Correcciones previas a implementacion: (1) Fase 5 elimina la solicitud del "valor mensual del alquiler" en el alta de locacion (la tabla `locaciones` no posee ese campo; el monto solo se registra en `pagos_alquiler` al ejecutar el pago); (2) Fase 2 documenta el destino de `altura_cm`, `contacto_emergencia` y `datos_salud` en el formulario de perfil; (3) Fase 4 agrega el paso previo "Creacion de Clase" antes del control de asistencia. |
| 1.2 | 2026-09-20 | Los alumnos regulares dejan de ser usuarios de la app (v1): la app es de uso exclusivo del staff (profesores y maestros). Se eliminan las vistas y flujos "del alumno" (vista base de navegacion, consulta de cuotas, historial academico, auto-linaje) y se agregan el **alta de alumno** por parte del profesor y la **asignacion directa de alumnos a grupos** (sin codigo de invitacion en el flujo movil). El onboarding y el establecimiento de linaje por solicitud quedan restringidos al staff. |

## Restricciones y Correcciones Previas (No repetir)
1. **Modulo de Torneos Congelado:** No modificar ni extender las tablas, flujos o lógica de torneos. Se conservan intactas en la BD, pero la aplicacion movil no interactua con ellas.
2. **Plataforma Web Congelada:** No tocar la carpeta `web/` ni sus flujos.
3. **Seguridad de Datos y Linaje:** La relacion `maestro_id` en `profiles` no es auto-modificable; solo un administrador (Service Role) o RPC especifico la edita.
4. **Grado Unificado:** Utilizar el enum `public.grado` que incluye los 10 Gups y los 9 Dans de manera secuencial para validaciones directas.
5. **No Procesar Dinero:** Los pagos son puramente de caracter de registro de informacion (periodo, monto, fecha, comprobante de alquiler), sin integraciones de pasarelas de pago.
6. **Valor de Alquiler Pactado (corrige v1.1, alineado al SRS §3.3):** La tabla `locaciones` almacena `nombre`, `direccion` (obligatoria), **`valor_alquiler` (obligatorio, >= 0)**, `creado_por` y `creado_en`. Al dar de alta (o editar) una locacion **SI** se solicita el **valor de alquiler pactado** (el acordado en el contrato). Este valor **NO** es el pago: el monto efectivamente pagado de cada periodo se registra unicamente en `pagos_alquiler` (`monto`, `periodo`, `fecha_pago`, `comprobante_url`) al ejecutar el pago.
7. **Campos del Perfil:** `profiles` incluye `altura_cm`, `telefono`, `contacto_emergencia_nombre`, `contacto_emergencia_telefono` y `datos_salud`. El **Contacto de Emergencia (nombre + telefono con formato) es obligatorio** en el onboarding y en el alta de alumno; `altura_cm`, `telefono` y `datos_salud` siguen siendo opcionales. El formato de grado se muestra por color, sin "Gup". Referencia: `planes/mobile-contacto-emergencia-obligatorio.md`.
8. **Clase Previa a Asistencia:** Todo registro en `asistencia` requiere una clase existente en `clases` con `hora_inicio`, `hora_fin`, **1–2 elementos del ciclo ITF (`elementos_objetivo`)** y `objetivo_detalle` opcional documentados; no se puede tomar asistencia sin crear antes la sesion.
9. **Alumnos no son usuarios (decision v1):** la app movil es de uso exclusivo del staff (profesores y maestros). Los alumnos regulares no inician sesion ni tienen vistas en la app; son registros de `profiles` administrados por su profesor (**alta de alumno**, Fase 4). No existen flujos "del alumno": sin consulta de cuotas, sin historial academico, sin auto-linaje. La BD conserva la capacidad de usuarios alumnos (`profiles` + `auth.users`) para el futuro; el codigo no debe asumir sesion de alumno.

---

## Flujo Secuencial de Implementacion

### Fase 1: Bootstrap y Configuración de Infraestructura (`mobile/`)
1. **Inicializacion del Proyecto:**
   - Crear el scaffold de la aplicacion movil en la carpeta `mobile/` mediante el comando `npx create-expo-app@latest -t expo-template-blank-typescript`.
   - Configurar **Expo Router** para una estructura limpia de navegacion basada en archivos.
2. **Dependencias Core:**
   - Instalar `@supabase/supabase-js` para la comunicacion con el backend.
   - Instalar `expo-secure-store` para persistir la sesion de autenticacion del usuario de manera segura en el dispositivo.
   - Instalar `expo-image-picker` y `expo-document-picker` para habilitar la subida de comprobantes en los pagos de alquileres.
3. **Entorno y Cliente Supabase:**
   - Configurar un archivo `.env` (excluido en `.gitignore`) con `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
   - Crear el archivo de inicializacion del cliente `mobile/src/lib/supabase.ts` consumiendo el storage seguro para mantener la sesion activa.
4. **Mecanismo Global de Control de Errores ("Fail Gracefully"):**
   - Implementar un interceptor o wrapper centralizado para solicitudes de BD de modo que cualquier error critico de conexion o consulta se registre de forma asincrona en `errores_runtime` y se muestre un mensaje generico y amigable en la UI.

### Fase 2: Autenticacion, Completado de Perfil (Onboarding) y Linaje
1. **Flujo de Acceso:**
   - Crear pantallas de registro (email/password), inicio de sesion y recuperacion de contraseña dentro de un directorio de rutas protegidas `(auth)`.
2. **Onboarding Obligatorio de Perfil:**
   - Bloquear el acceso a la aplicacion principal hasta que el usuario complete su perfil en `profiles`.
   - Aplica unicamente al usuario del staff que ingresa (futuro profesor/maestro); los alumnos no completan onboarding: su ficha la crea el profesor en el alta de alumno (Fase 4).
   - El formulario exige obligatoriamente: Nombre Completo, **DNI (unico, con validacion en la aplicacion movil antes de registrar)**, Fecha de Nacimiento (con calculo automatico de la edad cronologica), Peso (kg), Genero y **Contacto de Emergencia (nombre + telefono con formato)**.
   - Campos complementarios de `profiles` capturados en el mismo formulario: **Altura (cm)** (numeric, opcional, uso en ficha tecnica/competicion), **Telefono / Celular** (string, opcional) y **Datos de Salud** (string, opcional). No bloquean la finalizacion del perfil; si quedan vacios se completan luego desde el perfil sin repetir el onboarding. *(El contacto de emergencia dejo de ser opcional; ver `planes/mobile-contacto-emergencia-obligatorio.md`.)*
3. **Establecimiento del Linaje (implementado, restringido al staff):**
   - El nuevo **profesor/maestro** **selecciona a su maestro/instructor superior de una lista** (decisión: en v1 se descarta el código de invitación; la alternativa por código queda fuera del alcance movil).
   - La selección genera una **solicitud pendiente** (`solicitudes_linaje`); el superior debe **aceptarla o rechazarla desde su cuenta** (sección "Solicitudes de vinculación" en la pantalla principal).
   - Al aceptar, el sistema persiste `profiles.maestro_id` (única vez, con `set_config('app.derivacion_linaje','on',true)`). Una vez persistido, el sistema bloquea cualquier edición posterior (trigger `bloquear_auto_cambio_maestro`).
   - Salvo el Maestro raíz (`es_maestro = true`, sembrado por Service Role): no elige superior ni envía solicitud.
   - Los alumnos regulares **no participan de este flujo**: su linaje (`maestro_id`) queda fijado al momento del alta de alumno (Fase 4), sin solicitud de por medio.
   - Referencia: `documentacion/planes/mobile-establecimiento-linaje.md`.
   - **Confirmación del cinturón (implementado):** el staff declara su grado al solicitar el linaje (obligatorio `dan_1+`); al aceptar, el superior **confirma o ajusta** ese grado, se persiste `grados_verificados = true` y se activa `es_profesor`. El grado declarado vive en la solicitud hasta la confirmación. Referencia: `documentacion/planes/mobile-linaje-confirmar-grado.md`.
   - **Refresco en vivo (implementado):** Realtime (Postgres Changes) sobre `profiles` y `solicitudes_linaje`: el solicitante ve la confirmación/rechazo **sin re-loguear** y el superior ve las solicitudes nuevas/resueltas **en vivo**. Referencia: `documentacion/planes/mobile-refresco-linaje-tiempo-real.md`.

### Fase 3: Arquitectura de Navegacion Dinamica por "Arbol de Poder"
1. **Analisis del Perfil al Iniciar:**
   - Recuperar las banderas tecnicas de la tabla `profiles` para el usuario autenticado: `grado_actual`, `es_profesor` y `es_maestro`.
2. **Rutas Condicionales en la UI:**
   - **Vista Profesor:** Habilita la pestaña "Instructor" con opciones de gestion de sus alumnos directos (incluido el alta de alumnos), creacion de grupos, toma de asistencia, administracion de locaciones, registro de alquileres y postulacion de alumnos directos a examen. **Nota (v1.2 plan rutas condicionales):** la **visibilidad de la tab** depende de la bandera cruda `es_profesor`; el gate de Dan (`grado_actual >= 'dan_1'`) queda solo en el derivado `esProfesor` para la logica de negocio (el SRS exige Dan para ejercer la faceta).
   - **Vista Maestro (exige `es_maestro = true`):** Habilita la pestaña "Maestro" que incluye la planificacion y apertura de mesas de examen, acceso a la planilla tecnica de evaluacion y visualizacion de estadisticas/auditoria en cascada.
   - **No existe la Vista Alumno Regular:** los alumnos no tienen sesion ni navegacion propia en la app; son filas de `profiles` sin cuenta de usuario, administradas por su profesor.
   - Un usuario autenticado sin `es_profesor` ni `es_maestro` no accede a pestañas de gestion; el otorgamiento de facetas lo efectua un superior o el Service Role. **Implementado:** el superior confirma el cinturon al aceptar el linaje (activa `es_profesor`); la faceta de Maestro (`es_maestro`) sigue siendo exclusiva del Service Role (el creador). Referencia: `documentacion/planes/mobile-linaje-confirmar-grado.md`.
   - **Implementado (Fase 3, ítem 2):** navegacion por tabs (Inicio/Instructor/Maestro) en `(tabs)`; ocultamiento condicional con `href: null` y proteccion de deep links con `<Redirect>` en cada landing; menús con filas deshabilitadas que cada Fase 4-8 activara. Referencia: `documentacion/planes/mobile-rutas-condicionales-navegacion.md`.
3. **Inicio como panel operativo:** *(Implementado — posterior a Fase 7)*
   - La pestana "Inicio" deja de ser solo identidad + solicitudes + cerrar sesion y pasa a ser un **panel de gestion**: resumen del mes (cuotas pendientes, clases sin asistencia de los ultimos 7 dias, grupos y alumnos), **acciones rapidas** y el resumen de **rama** para el Maestro (alquileres vencidos, mesas abiertas y recaudacion).
   - Carga con `useFocusEffect` (se refresca al volver) y **fail gracefully por bloque** (una metrica que falla no rompe el panel).
   - Sin migraciones ni acciones nuevas: se compone con lo ya existente. Referencia: `documentacion/planes/mobile-rediseno-inicio.md`.

### Fase 4: Modulo de Gestion de Alumnos, Grupos y Clases (Rol: Profesor)
1. **Directorio y Alta de Alumnos Directos:** *(Implementado — Fase 4, ítem 1)*
   - Listar los estudiantes del instructor usando el filtro de RLS `maestro_id = auth.uid()`.
   - **Alta de Alumno:** los alumnos no se registran solos; el profesor crea la ficha desde la app. Datos obligatorios: Nombre Completo, **DNI (unico, con validacion previa en la app)**, Fecha de Nacimiento (con calculo de la edad cronologica), Peso (kg), Genero, **Grado actual** y **Contacto de Emergencia (nombre + telefono con formato)**. Opcionales: Altura (cm), Telefono / Celular y Datos de Salud.
   - Al crear la ficha, `profiles.maestro_id` queda fijado al profesor que la da de alta (linaje asignado en el alta; no modificable por el alumno).
   - **Implementado:** RPC `alta_alumno` (SECURITY DEFINER; valida `es_profesor`; elimina la FK `profiles.id -> auth.users` para alumnos sin cuenta) + pantallas `instructor/alumnos`, `instructor/alta-alumno` e `instructor/alumno/[id]` (detalle solo-lectura). Referencia: `documentacion/planes/mobile-directorio-alta-alumnos.md`.
2. **Creacion de Grupos y Horarios:** *(Implementado — Fase 4, ítem 2)*
   - Formulario para crear un grupo de entrenamiento asociandolo a una locacion fisica, indicando nombre y **horarios de clase estructurados** (dia de la semana + hora inicio/fin; sin texto libre). Los horarios viven en la tabla normalizada `grupos_horarios` con RLS del profesor dueño del grupo.
   - **Sin codigo de invitacion en el flujo movil:** el profesor asigna directamente a sus alumnos directos al grupo (fila `miembros_grupo` en estado activo). El campo `codigo_invitacion` de la BD queda para uso futuro y fuera de alcance v1.
   - **Un solo grupo activo por alumno:** la membresia activa es unica por alumno (indice unico parcial). Un alumno ya asignado a un grupo **no se ofrece** para asignar a otro: la UI lo oculta y el RPC `editar_miembros_grupo` **rechaza** la operacion (ya no lo mueve). La reasignacion explicita de grupo queda como plan aparte (ver `documentacion/planes/mobile-asignacion-alumno-un-grupo.md`).
   - **Nota (dependencia locaciones):** se anticipa el **paso minimo de la Fase 5.1** (alta de locacion con nombre y **direccion obligatoria**, sin monto) para poder asociar el grupo a una locacion fisica; alquileres y auditoria quedan para la Fase 5.
   - **Implementado (v1.1):** migraciones `grupos_flujo_movil` + `grupos_horarios_y_reglas` (tabla `grupos_horarios` con RLS, drop de `grupos.horarios` texto, `locaciones.direccion` NOT NULL, indice unico `miembros_grupo(alumno_id) where estado='activo'`, RPC `crear_grupo_con_horarios` y RPC `editar_miembros_grupo` con movimiento) + pantallas `instructor/grupos`, `instructor/nuevo-grupo` (editor de horarios), `instructor/registrar-locacion` (direccion obligatoria) e `instructor/grupo/[id]` (asignacion de miembros activos con badge de traslado). Referencia: `documentacion/planes/mobile-grupos-horarios.md`.
   - **Edicion del grupo (posterior):** el grupo pasa a ser **editable** (nombre, locacion y horarios) via RPC `editar_grupo`, reutilizando el formulario en la ruta `instructor/grupo/[id]/editar`. Referencia: `documentacion/planes/mobile-editar-grupo-locacion.md`.
3. **Creacion de Clase:** *(Implementado — Fase 4, ítem 3)*
   - Antes de registrar asistencias, el profesor crea la sesion particular en `clases` vinculada al grupo y la fecha, documentando obligatoriamente **hora_inicio**, **hora_fin** y **1–2 elementos del ciclo ITF como objetivo** (mas un **detalle opcional**). El campo libre `objetivo`/`contenido_tuls` y la `preparacion_fisica` fueron reemplazados por `elementos_objetivo` + `objetivo_detalle` (ver `planes/mobile-objetivo-clase-elementos.md`).
   - Cada clase creada queda como sesion activa en el selector, y los presentes/ausentes se vincularan a ella mediante `clase_id` en `asistencia` (Fase 4.4).
   - **Implementado:** migracion RLS `clases_politicas_rls` + pantallas `instructor/clases` (listado y selector por grupo), `instructor/nueva-clase` (formulario con validaciones obligatorias) e `instructor/clase/[id]` (detalle de sesión planificada); opción "Toma de asistencia" habilitada en el menú instructor. Referencia: `documentacion/planes/mobile-creacion-clase.md`.
   - **Vista de objetivos (implementado):** `instructor/objetivos` muestra la **distribución de la práctica por elemento ITF** (% sobre menciones) con filtros de período y grupo; opción "Objetivos de clase" en el menú instructor. Referencia: `documentacion/planes/mobile-objetivo-clase-elementos.md`.
4. **Control de Asistencia:** *(Implementado — Fase 4, ítem 4)*
   - Selector de clase activa por fecha (sesion creada en el paso anterior); el listado `instructor/clases` marca con badge "Hoy" la sesión del día.
   - Interfaz con listado de estudiantes inscritos en el grupo para marcar asistencia (Presente/Ausente) con un toque, impactando directamente en la tabla `asistencia` de manera atomica.
   - **Implementado:** migracion `control_asistencia` (policy de lectura `asistencia_select_profesor` + RPC atomico `guardar_asistencia_clase(p_clase_id, p_registros)` con `insert ... on conflict (clase_id, alumno_id) do update`) + pantalla `instructor/clase/[id]/asistencia` (todos Presente por defecto, contadores en vivo, "todos presentes/ausentes", guardado bulk con boton) y boton "Tomar asistencia" en el detalle de la clase; ruta reestructurada a `clase/[id]/index` + `clase/[id]/asistencia`. Referencia: `documentacion/planes/mobile-control-asistencia.md`.

### Fase 5: Locaciones, Alquileres e Infraestructura
1. **Registro de Locacion:** *(Implementado — Fase 5, ítem 1)*
   - Permitir a profesores y maestros dar de alta centros de entrenamiento registrando **nombre**, **direccion (obligatoria)** y el **valor de alquiler pactado** (SRS §3.3; `locaciones.valor_alquiler` NOT NULL con `check >= 0`).
   - Gestion completa: listado, detalle con grupos asociados, edicion y eliminacion, ademas del alta. La fila "Locaciones" del menu Instructor queda habilitada. Referencia: `documentacion/planes/mobile-registro-locaciones.md`.
   - El **valor pactado** (SRS §3.3) se solicita en el alta y en la edicion de la locacion. El **monto pagado** es un concepto distinto: se registra unicamente en `pagos_alquiler` (`monto`, `periodo`, `fecha_pago`) al ejecutar el pago del periodo correspondiente (Fase 5.2).
2. **Pagos de Alquiler y Storage:** *(Implementado — Fase 5, ítem 2)*
   - Formulario para registrar el pago de alquiler mensual de la locacion: periodo (ej. '2026-09'), monto pagado y fecha. Un periodo no puede pagarse dos veces por locacion (indice unico `locacion_id, periodo`).
   - Permitir adjuntar fotos (camara/galeria) o archivos PDF del comprobante de pago, subiendolos al bucket privado de storage `comprobantes` y guardando el **path** en `pagos_alquiler.comprobante_url`.
   - **No hay URL publica** (bucket privado, decision de privacidad/auditoria): al visualizar se genera un **enlace firmado temporal** (1 hora). El dueño sube/lee/borra; el **superior jerarquico** lee (excepcion de auditoria SRS §2).
   - **Implementado:** migracion `pagos_alquiler_reglas` (indice unico) + pantallas `instructor/locacion/[id]/pago` (formulario con periodo/monto/fecha y adjunto camara-galeria-PDF) y seccion "Pagos de alquiler" en `instructor/locacion/[id]` (historial, ver comprobante, eliminar). Referencia: `documentacion/planes/mobile-pagos-alquiler.md`.
3. **Auditoria en Cascada para Superiores:** *(Implementado — Fase 5, ítem 3)*   - El Maestro accede a la pestaña de Auditoria para consultar las locaciones, montos, vencimientos y adjuntos de todas las locaciones que pertenecen a sus instructores subordinados.
   - **Vencimientos:** el modelo no almacena fecha de vencimiento; el estado se **deriva** del ultimo periodo pagado (Al dia / Vencida con meses adeudados / Sin pagos).
   - **Seguridad ya vigente:** RLS `locaciones_select_superior` y `pagos_alquiler_select_superior` (tablas) + `comprobantes_select_superior` (**Storage** sobre `storage.objects`; no existe tabla de comprobantes). `es_subordinado_de`/`descendientes` son recursivos, por lo que alcanzan descendientes indirectos.
   - **Implementado:** layout del tab Maestro con guard + pantallas `maestro/auditoria` (listado con dueno, valor pactado, estado de pago y filtro por instructor) y `maestro/auditoria/[id]` (detalle de solo lectura con historial y comprobante por enlace firmado); fila "Auditoria de locaciones en cascada" habilitada. Referencia: `documentacion/planes/mobile-auditoria-cascada.md`.

### Fase 6: Registro de Cuotas de Alumnos
1. **Cobranzas Directas del Profesor:** *(Implementado — Fase 6)*
   - El profesor registra de manera manual el pago mensual de un alumno directo.
   - Datos a guardar: alumno, periodo (ej. '2026-09'), monto percibido y fecha de pago (columna `fecha`).
   - La aplicacion previene y controla excepciones si se intenta registrar un pago para un periodo ya cubierto por el mismo alumno: la tabla `pagos_cuota` ya tiene `UNIQUE (alumno_id, periodo)`; la app hace **pre-chequeo** y ademas traduce el `23505` a un mensaje amable.
   - El alumno no consulta sus cuotas desde la app (no tiene cuenta); el historial de periodos pagados queda administrado por el **profesor directo**. Los **superiores NO acceden** a las cuotas: las Reglas §2 limitan su visibilidad a metricas anonimizadas de alumnos (las cuotas son dato financiero personal, no infraestructura).
   - **Implementado:** acciones `listarCuotasAlumno`, `listarCuotasPorPeriodo`, `registrarCuota` (con `creado_por = auth.uid()`) y `eliminarCuota`; seccion "Cuotas" en `instructor/alumno/[id]`, formulario `instructor/alumno/[id]/cuota` y listado de cobranzas `instructor/cuotas` (con estado pagado/pendiente por periodo). Referencia: `documentacion/planes/mobile-cuotas-alumnos.md`.

### Fase 7: Examenes de Graduacion y Promocion
1. **Creacion de Mesas de Examen (Maestro):** *(Implementado — Fase 7, ítem 1)*
   - Un Maestro calificado abre una mesa de examen definiendo la fecha, el lugar y el estado como "abierta".
   - **Nota (decision de producto):** el "limite de inscripcion" se elimino del modelo (`mesas_examen.limite_inscripcion` dropeada); el SRS §3.7 y las Reglas §4 se actualizaron para no contradecir. Si se quiere cupo por mesa, es una evolucion futura.
   - **Implementado:** acciones `listarMesasExamen` (con conteo de postulados), `crearMesaExamen` (`maestro_id = auth.uid()`, estado `abierta`), `editarMesaExamen` y `cambiarEstadoMesa`; pantallas `maestro/mesas` (listado con estado y postulados), `maestro/mesas/nueva` (fecha + lugar con chips de locaciones u otro lugar) y `maestro/mesas/[id]` (detalle, editar, cerrar/finalizar). Referencia: `documentacion/planes/mobile-mesas-examen.md`.
2. **Inscripcion y Postulacion (Profesor):** *(Implementado — Fase 7, ítem 2)*
   - Los profesores postulan a sus alumnos directos para la mesa de examen abierta.
   - El sistema calcula automaticamente el `grado_aspirado` (grado inmediato superior segun el enum `grado`) **en el servidor**, via RPC `postular_alumno` (no falsificable desde el cliente).
   - El profesor registra de manera manual el cobro del **derecho de examen** (`derecho_examen`; solo registro, el sistema no procesa dinero).
   - **Recaudacion (SRS §3.7):** el maestro examinador visualiza la **recaudacion total de la mesa** (suma de los derechos de examen), con desglose de cobrados y pendientes, en el detalle de la mesa.
   - **Implementado:** migracion `postular_alumno` (RPCs `postular_alumno`, `actualizar_derecho_examen`, `quitar_postulacion`) + pantallas `instructor/mesas` (mesas abiertas), `instructor/mesas/[id]` (postulaciones propias) e `instructor/mesas/[id]/postular` (seleccion multiple con grado aspirado y derecho); el detalle del Maestro muestra postulados y recaudacion. Referencia: `documentacion/planes/mobile-postulacion-examen.md`.
3. **Planilla Tecnica y Evaluacion (Maestro Examinador):** *(Implementado — Fase 7, ítem 3)*
   - Al momento de evaluar, el Maestro examinador consulta la planilla digital mediante el RPC seguro `planilla_mesa_examen(p_mesa)`.
   - Registra de forma individual el resultado (Aprobado, Desaprobado o Ausente). Sobre un aprobado puede marcar **mención especial** y/o **doble graduación**.
   - **Implementado:** acción `obtenerPlanillaMesa` (RPC de datos técnicos fusionado con `listarPostulacionesMesa` por estado y banderas) + `registrarResultadoExamen`; pantalla `maestro/mesas/[id]/planilla` con datos técnicos (nombre, edad, peso, grado), casilla de **mención especial** y botones **Aprobado / Doble graduación / Desaprobado / Ausente** con confirmación y badge del desenlace. Solo el maestro dueño de la mesa (la RPC devuelve 0 filas a otro); evaluar requiere la mesa **cerrada/finalizada** (el detalle avisa y ofrece cerrarla). Referencia: `documentacion/planes/mobile-planilla-evaluacion.md`.
4. **Ascenso y Log permanente:** *(Cubierto por Fase 7, ítem 3)*
   - Al guardar un resultado como "Aprobado", la aplicacion invoca al RPC `registrar_resultado_examen`.
   - Este RPC actualiza de forma atomica y segura el campo `grado_actual` en el perfil del alumno (un nivel, o **dos** si hay doble graduación), genera una fila de registro historico en `graduaciones` y evita que el usuario pueda autopromocionarse de grado de forma ilegitima.
   - **Mención especial y doble graduación** quedan registradas en `postulaciones_examen` y `graduaciones`. La **doble graduación** solo aplica con grado actual entre `blanco` y `azul_punta_roja` (nuevo grado +2, tope `rojo_punta_negra`); desde `rojo` el maximo es mencion especial. La postulacion guarda el **grado otorgado** (sobreescribe `grado_aspirado`).
   - El historial de `graduaciones` es registro interno del staff: el alumno no accede a el desde la app (no tiene cuenta).
   - **Nota:** el RPC y el ascenso ya existian de la migracion `examenes_graduacion` (la v1.1 agrega las banderas); la Fase 7.3 los consume desde la planilla, por lo que no requiere UI adicional.

### Fase 8: Dashboard de Metricas Anonimizadas
1. **Visualizacion Estadistica:** *(Implementado — Fase 8, ítem 1)*
   - Consumir el RPC `metricas_dashboard(p_vista, p_instructor)` para alimentar graficos de distribucion por genero, rango de edad y cinturon.
   - **Implementado:** acción `obtenerMetricasDashboard(vista, instructorId?)` (normaliza el `jsonb` del RPC con orden fijo de categorías y etiqueta "Mayores de 30" para el bucket `30+`) + componentes `GraficoDona`/`GraficoBarras` (librería `react-native-gifted-charts` + `react-native-svg`) + pantalla `maestro/estadisticas` con filtro por chips (toda la rama / instructor específico) y fail gracefully; fila "Estadísticas anonimizadas" habilitada. Referencia: `documentacion/planes/mobile-dashboard-metricas.md`.
2. **Privacidad en Cascada Activa:** *(Implementado en Fase 8, ítem 1)*
   - Asegurar que ningun dato de caracter personal de los alumnos indirectos (pertenecientes a instructores subordinados) sea expuesto en esta vista.
   - Proveer controles de filtrado entre la vista consolidada (toda la descendencia) y la vista especifica (un instructor seleccionado).
   - **Implementado:** la pantalla solo consume los conteos agregados del RPC `metricas_dashboard` (nunca `profiles` de los alumnos); el filtro por instructor usa `vista='especifica'` y el propio RPC valida la autorización.

### Fase 9: Verificacion, Calidad y Compilacion
1. **Verificaciones de Stack y Tipado:** *(Implementado — Fase 9, ítem 1)*
   - Ejecutar la comprobacion de tipos en TypeScript (`tsc`) y la herramienta de linting (`npm run lint`) en el directorio `mobile/` para garantizar la calidad del codigo.
   - **Implementado:** `npm run typecheck` y `npm run lint` en verde (`0 problems`). Se corrigieron los hallazgos que bloqueaban el lint: import y variable sin uso en `crear-cuenta`, precarga del perfil y carga de instructores en `onboarding` (supresión mínima `eslint-disable` sobre la regla `react-hooks/set-state-in-effect`) y eliminación de un `useEffect` redundante en la asistencia (ya cargaba `useFocusEffect`). Referencia: `documentacion/planes/mobile-verificaciones-stack.md`.
2. **Pruebas Integrales de RLS (Arbol de Poder):** *(Plan aprobado — Fase 9, ítem 2; ejecución pendiente)*
   - Probar los flujos clave utilizando tres perfiles de prueba diferentes para validar que los limites de visibilidad y edicion se aplican correctamente en la aplicacion real.
   - **Plan:** `documentacion/planes/mobile-pruebas-rls-fase9.md` (v1.2, Aprobado). Corrida manual en dispositivo con los tres perfiles del seed (P0 Maestro, P1 Profesor nivel 1, P2 nivel 2/nieto) **más P3** (profesor ajeno creado en la prueba, con `grado_actual >= dan_1` fijado vía Service Role antes de conferir `es_profesor`). Incluye matriz de roles/RLS, recursividad, aislamiento, escritura restringida, gates anti-escalada, resiliencia, smoke final y bloque BD/API (B8).
3. **Generacion de Build:**
   - Configurar y correr EAS Build para empaquetar la aplicacion en su formato correspondiente para distribucion y pruebas cerradas.

---
🐧
