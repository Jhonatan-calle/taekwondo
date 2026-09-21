# Plan de Workflow: Guia de Implementacion de la App Movil (Expo + Supabase)

> **Metadatos**
> - **Version:** 1.1
> - **Estado:** Revision
> - **Fecha de aprobacion:** 2026-09-20

## Historial de revisiones
| Version | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-20 | Borrador inicial: Creacion de la guia de pasos del orden de implementacion del sistema completo respetando el SRS, las reglas de negocio y el modelo de BD. |
| 1.1 | 2026-09-20 | Correcciones previas a implementacion: (1) Fase 5 elimina la solicitud del "valor mensual del alquiler" en el alta de locacion (la tabla `locaciones` no posee ese campo; el monto solo se registra en `pagos_alquiler` al ejecutar el pago); (2) Fase 2 documenta el destino de `altura_cm`, `contacto_emergencia` y `datos_salud` en el formulario de perfil; (3) Fase 4 agrega el paso previo "Creacion de Clase" antes del control de asistencia. |

## Restricciones y Correcciones Previas (No repetir)
1. **Modulo de Torneos Congelado:** No modificar ni extender las tablas, flujos o lógica de torneos. Se conservan intactas en la BD, pero la aplicacion movil no interactua con ellas.
2. **Plataforma Web Congelada:** No tocar la carpeta `web/` ni sus flujos.
3. **Seguridad de Datos y Linaje:** La relacion `maestro_id` en `profiles` no es auto-modificable; solo un administrador (Service Role) o RPC especifico la edita.
4. **Grado Unificado:** Utilizar el enum `public.grado` que incluye los 10 Gups y los 9 Dans de manera secuencial para validaciones directas.
5. **No Procesar Dinero:** Los pagos son puramente de caracter de registro de informacion (periodo, monto, fecha, comprobante de alquiler), sin integraciones de pasarelas de pago.
6. **Alta de Locacion sin Monto:** La tabla `locaciones` solo almacena `nombre`, `direccion`, `creado_por` y `creado_en`. No solicitar "valor mensual del alquiler" al dar de alta; el monto se registra unicamente en `pagos_alquiler` (`monto`, `periodo`, `fecha_pago`) cuando se ejecuta el pago.
7. **Campos Omitidos del Perfil:** `profiles` incluye `altura_cm`, `contacto_emergencia` y `datos_salud`; estan contemplados en el onboarding y en el perfil aunque el SRS §3.1 no los liste como obligatorios.
8. **Clase Previa a Asistencia:** Todo registro en `asistencia` requiere una clase existente en `clases` con `hora_inicio`, `hora_fin`, `objetivo`, `contenido_tuls` y `preparacion_fisica` documentados; no se puede tomar asistencia sin crear antes la sesion.

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
   - El formulario exige obligatoriamente: Nombre Completo, **DNI (unico, con validacion en la aplicacion movil antes de registrar)**, Fecha de Nacimiento (con calculo automatico de la edad cronologica), Peso (kg) y Genero.
   - Campos complementarios de `profiles` capturados en el mismo formulario: **Altura (cm)** (numeric, opcional, uso en ficha tecnica/competicion), **Contacto de Emergencia** (string, opcional) y **Datos de Salud** (string, opcional). No bloquean la finalizacion del perfil; si quedan vacios se completan luego desde el perfil sin repetir el onboarding.
3. **Establecimiento del Linaje:**
   - El nuevo usuario debe ingresar un codigo de invitacion o seleccionar a su instructor/maestro para inicializar su `maestro_id`.
   - Una vez persistido, el sistema bloquea cualquier edicion posterior sobre esta columna desde el perfil del usuario.

### Fase 3: Arquitectura de Navegacion Dinamica por "Arbol de Poder"
1. **Analisis del Perfil al Iniciar:**
   - Recuperar las banderas tecnicas de la tabla `profiles` para el usuario autenticado: `grado_actual`, `es_profesor` y `es_maestro`.
2. **Rutas Condicionales en la UI:**
   - **Vista Alumno Regular (Perfil Base):** Navegacion simple con acceso a su informacion de perfil, su historial academico de graduaciones, control de asistencias recibidas y estado de cuotas pagadas.
   - **Vista Profesor (exige `es_profesor = true` y `grado_actual >= 'dan_1'`):** Habilita la pestaña "Instructor" con opciones de gestion de sus alumnos directos, creacion de grupos, toma de asistencia, administracion de locaciones, registro de alquileres y postulacion de alumnos directos a examen.
   - **Vista Maestro (exige `es_maestro = true`):** Habilita la pestaña "Maestro" que incluye la planificacion y apertura de mesas de examen, acceso a la planilla tecnica de evaluacion y visualizacion de estadisticas/auditoria en cascada.

### Fase 4: Modulo de Gestion de Alumnos, Grupos y Clases (Rol: Profesor)
1. **Directorio de Alumnos Directos:**
   - Listar los estudiantes del instructor usando el filtro de RLS `maestro_id = auth.uid()`.
2. **Creacion de Grupos y Horarios:**
   - Formulario para crear un grupo de entrenamiento asociandolo a una locacion fisica, indicando nombre, horarios de clase y generando un codigo de invitacion unico.
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
2. **Consulta de Cuotas (Alumno):**
   - El alumno puede visualizar de forma historica los periodos registrados como pagados en su perfil.

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
