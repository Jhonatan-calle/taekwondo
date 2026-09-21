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
6. **Alta de Locacion sin Monto:** La tabla `locaciones` solo almacena `nombre`, `direccion`, `creado_por` y `creado_en`. No solicitar "valor mensual del alquiler" al dar de alta; el monto se registra unicamente en `pagos_alquiler` (`monto`, `periodo`, `fecha_pago`) cuando se ejecuta el pago.
7. **Campos Omitidos del Perfil:** `profiles` incluye `altura_cm`, `telefono`, `contacto_emergencia` y `datos_salud`; estan contemplados en el onboarding y en el perfil (y el formato de grado se muestra por color, sin "Gup") aunque el SRS §3.1 no los liste como obligatorios.
8. **Clase Previa a Asistencia:** Todo registro en `asistencia` requiere una clase existente en `clases` con `hora_inicio`, `hora_fin`, `objetivo`, `contenido_tuls` y `preparacion_fisica` documentados; no se puede tomar asistencia sin crear antes la sesion.
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
   - El formulario exige obligatoriamente: Nombre Completo, **DNI (unico, con validacion en la aplicacion movil antes de registrar)**, Fecha de Nacimiento (con calculo automatico de la edad cronologica), Peso (kg) y Genero.
   - Campos complementarios de `profiles` capturados en el mismo formulario: **Altura (cm)** (numeric, opcional, uso en ficha tecnica/competicion), **Contacto de Emergencia** (string, opcional) y **Datos de Salud** (string, opcional). No bloquean la finalizacion del perfil; si quedan vacios se completan luego desde el perfil sin repetir el onboarding.
3. **Establecimiento del Linaje (implementado, restringido al staff):**
   - El nuevo **profesor/maestro** **selecciona a su maestro/instructor superior de una lista** (decisión: en v1 se descarta el código de invitación; la alternativa por código queda fuera del alcance movil).
   - La selección genera una **solicitud pendiente** (`solicitudes_linaje`); el superior debe **aceptarla o rechazarla desde su cuenta** (sección "Solicitudes de vinculación" en la pantalla principal).
   - Al aceptar, el sistema persiste `profiles.maestro_id` (única vez, con `set_config('app.derivacion_linaje','on',true)`). Una vez persistido, el sistema bloquea cualquier edición posterior (trigger `bloquear_auto_cambio_maestro`).
   - Salvo el Maestro raíz (`es_maestro = true`, sembrado por Service Role): no elige superior ni envía solicitud.
   - Los alumnos regulares **no participan de este flujo**: su linaje (`maestro_id`) queda fijado al momento del alta de alumno (Fase 4), sin solicitud de por medio.
   - Referencia: `documentacion/planes/mobile-establecimiento-linaje.md`.

### Fase 3: Arquitectura de Navegacion Dinamica por "Arbol de Poder"
1. **Analisis del Perfil al Iniciar:**
   - Recuperar las banderas tecnicas de la tabla `profiles` para el usuario autenticado: `grado_actual`, `es_profesor` y `es_maestro`.
2. **Rutas Condicionales en la UI:**
   - **Vista Profesor:** Habilita la pestaña "Instructor" con opciones de gestion de sus alumnos directos (incluido el alta de alumnos), creacion de grupos, toma de asistencia, administracion de locaciones, registro de alquileres y postulacion de alumnos directos a examen. **Nota (v1.2 plan rutas condicionales):** la **visibilidad de la tab** depende de la bandera cruda `es_profesor`; el gate de Dan (`grado_actual >= 'dan_1'`) queda solo en el derivado `esProfesor` para la logica de negocio (el SRS exige Dan para ejercer la faceta).
   - **Vista Maestro (exige `es_maestro = true`):** Habilita la pestaña "Maestro" que incluye la planificacion y apertura de mesas de examen, acceso a la planilla tecnica de evaluacion y visualizacion de estadisticas/auditoria en cascada.
   - **No existe la Vista Alumno Regular:** los alumnos no tienen sesion ni navegacion propia en la app; son filas de `profiles` sin cuenta de usuario, administradas por su profesor.
   - Un usuario autenticado sin `es_profesor` ni `es_maestro` no accede a pestañas de gestion; el otorgamiento de facetas lo efectua un superior o el Service Role.
   - **Implementado (Fase 3, ítem 2):** navegacion por tabs (Inicio/Instructor/Maestro) en `(tabs)`; ocultamiento condicional con `href: null` y proteccion de deep links con `<Redirect>` en cada landing; menús con filas deshabilitadas que cada Fase 4-8 activara. Referencia: `documentacion/planes/mobile-rutas-condicionales-navegacion.md`.

### Fase 4: Modulo de Gestion de Alumnos, Grupos y Clases (Rol: Profesor)
1. **Directorio y Alta de Alumnos Directos:** *(Implementado — Fase 4, ítem 1)*
   - Listar los estudiantes del instructor usando el filtro de RLS `maestro_id = auth.uid()`.
   - **Alta de Alumno:** los alumnos no se registran solos; el profesor crea la ficha desde la app. Datos obligatorios: Nombre Completo, **DNI (unico, con validacion previa en la app)**, Fecha de Nacimiento (con calculo de la edad cronologica), Peso (kg), Genero y **Grado actual**. Opcionales: Altura (cm), Contacto de Emergencia y Datos de Salud.
   - Al crear la ficha, `profiles.maestro_id` queda fijado al profesor que la da de alta (linaje asignado en el alta; no modificable por el alumno).
   - **Implementado:** RPC `alta_alumno` (SECURITY DEFINER; valida `es_profesor`; elimina la FK `profiles.id -> auth.users` para alumnos sin cuenta) + pantallas `instructor/alumnos`, `instructor/alta-alumno` e `instructor/alumno/[id]` (detalle solo-lectura). Referencia: `documentacion/planes/mobile-directorio-alta-alumnos.md`.
2. **Creacion de Grupos y Horarios:** *(Implementado — Fase 4, ítem 2)*
   - Formulario para crear un grupo de entrenamiento asociandolo a una locacion fisica, indicando nombre y horarios de clase.
   - **Sin codigo de invitacion en el flujo movil:** el profesor asigna directamente a sus alumnos directos al grupo (fila `miembros_grupo` en estado activo). El campo `codigo_invitacion` de la BD queda para uso futuro y fuera de alcance v1.
   - **Nota (dependencia locaciones):** se anticipa el **paso minimo de la Fase 5.1** (alta de locacion con nombre y direccion, sin monto) para poder asociar el grupo a una locacion fisica; alquileres y auditoria quedan para la Fase 5.
   - **Implementado:** migracion `grupos_flujo_movil` (codigo_invitacion nullable + RPC `editar_miembros_grupo`) + pantallas `instructor/grupos`, `instructor/nuevo-grupo`, `instructor/registrar-locacion` e `instructor/grupo/[id]` (asignacion de miembros activos). Referencia: `documentacion/planes/mobile-grupos-horarios.md`.
3. **Creacion de Clase:**
   - Antes de registrar asistencias, el profesor crea la sesion particular en `clases` vinculada al grupo y la fecha, documentando obligatoriamente **hora_inicio**, **hora_fin**, **objetivo**, **contenido_tuls** y **preparacion_fisica**.
   - Cada clase creada queda como sesion activa en el selector, y los presentes/ausentes se vinculan a ella mediante `clase_id` en `asistencia`.
4. **Control de Asistencia:**
   - Selector de clase activa por fecha (sesion creada en el paso anterior).
   - Interfaz con listado de estudiantes inscritos en el grupo para marcar asistencia (Presente/Ausente) con un toque, impactando directamente en la tabla `asistencia` de manera atomica.

### Fase 5: Locaciones, Alquileres e Infraestructura
1. **Registro de Locacion:**
   - Permitir a profesores y maestros dar de alta centros de entrenamiento registrando **solo** nombre y direccion (la tabla `locaciones` no posee campo de monto).
   - El valor del alquiler no se solicita en este paso: el monto se registra unicamente en `pagos_alquiler` al ejecutar el pago del periodo correspondiente.
2. **Pagos de Alquiler y Storage:**
   - Formulario para registrar el pago de alquiler mensual de la locacion: periodo (ej. '2026-09'), monto pagado y fecha.
   - Permitir adjuntar fotos o archivos PDF del comprobante de pago, subiendolos al bucket privado de storage `comprobantes` y enlazando la URL publica en la fila correspondiente en `pagos_alquiler`.
3. **Auditoria en Cascada para Superiores:**
   - El Maestro puede acceder a la pestaña de Auditoria para consultar las locaciones, montos, vencimientos y adjuntos de todas las locaciones que pertenecen a sus instructores subordinados.

### Fase 6: Registro de Cuotas de Alumnos
1. **Cobranzas Directas del Profesor:**
   - El profesor registra de manera manual el pago mensual de un alumno directo.
   - Datos a guardar: alumno, periodo (ej. '2026-09'), monto percibido y fecha de pago.
   - La aplicacion previene y controla excepciones si se intenta registrar un pago para un periodo ya cubierto por el mismo alumno (cumpliendo con la restriccion de unicidad de la BD).
   - El alumno no consulta sus cuotas desde la app (no tiene cuenta); el historial de periodos pagados queda administrado por el profesor y los superiores.

### Fase 7: Examenes de Graduacion y Promocion
1. **Creacion de Mesas de Examen (Maestro):**
   - Un Maestro calificado abre una mesa de examen definiendo la fecha, el lugar, el limite maximo de participantes y el estado como "abierta".
2. **Inscripcion y Postulacion (Profesor):**
   - Los profesores postulan a sus alumnos directos para la mesa de examen abierta.
   - El sistema calcula automaticamente el `grado_aspirado` (grado inmediato superior segun el enum `grado`). El profesor registra de manera manual el cobro del "derecho de examen".
3. **Planilla Tecnica y Evaluacion (Maestro Examinador):**
   - Al momento de evaluar, el Maestro examinador consulta la planilla digital mediante el RPC seguro `planilla_mesa_examen(p_mesa)`.
   - Registra de forma individual el resultado (Aprobado, Desaprobado o Ausente).
4. **Ascenso y Log permanente:**
   - Al guardar un resultado como "Aprobado", la aplicacion invoca al RPC `registrar_resultado_examen`.
   - Este RPC actualiza de forma atomica y segura el campo `grado_actual` en el perfil del alumno, genera una fila de registro historico en `graduaciones` y evita que el usuario pueda autopromocionarse de grado de forma ilegitima.
   - El historial de `graduaciones` es registro interno del staff: el alumno no accede a el desde la app (no tiene cuenta).

### Fase 8: Dashboard de Metricas Anonimizadas
1. **Visualizacion Estadistica:**
   - Consumir el RPC `metricas_dashboard(p_vista, p_instructor)` para alimentar graficos o listas de distribucion por genero, rango de edad y cinturon.
2. **Privacidad en Cascada Activa:**
   - Asegurar que ningun dato de caracter personal de los alumnos indirectos (pertenecientes a instructores subordinados) sea expuesto en esta vista.
   - Proveer controles de filtrado entre la vista consolidada (toda la descendencia) y la vista especifica (un instructor seleccionado).

### Fase 9: Verificacion, Calidad y Compilacion
1. **Verificaciones de Stack y Tipado:**
   - Ejecutar la comprobacion de tipos en TypeScript (`tsc`) y la herramienta de linting (`npm run lint`) en el directorio `mobile/` para garantizar la calidad del codigo.
2. **Pruebas Integrales de RLS (Arbol de Poder):**
   - Probar los flujos clave utilizando tres perfiles de prueba diferentes para validar que los limites de visibilidad y edicion se aplican correctamente en la aplicacion real.
3. **Generacion de Build:**
   - Configurar y correr EAS Build para empaquetar la aplicacion en su formato correspondiente para distribucion y pruebas cerradas.

---
🐧
