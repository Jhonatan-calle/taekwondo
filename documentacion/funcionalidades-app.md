# Funcionalidades de la app (CHS ALFA)

## Acceso y cuenta
- Registro con email y contraseña.
- Inicio de sesión.
- Recuperación de contraseña por email (deep link a "nueva contraseña").
## Linaje y jerarquía
- Elección de instructor/maestro al registrarse (solicitud de linaje).
- Aceptar solicitud con confirmación/ajuste del cinturón del solicitante.
## Navegación por roles
- Pestañas Inicio / Instructor / Maestro según facetas del perfil.
- Redirección de rutas no autorizadas a Inicio.
- Menús con opciones deshabilitadas marcadas "Próximamente".

## Inicio (panel operativo)
- Tarjetas de resumen: alumnos, grupos, cuotas pendientes del mes, clases sin asistencia (últimos 7 días).
- Acciones rápidas por rol.
- Bloque "Tu rama" (Maestro): alquileres vencidos, mesas abiertas y recaudación.
## Alumnos (Instructor)
- Directorio de alumnos directos.
- Alta de alumno con validaciones por campo (obligatorios y opcionales).
## Grupos y horarios
- Listado de grupos.
- Creación de grupo con locación y horarios estructurados (día + hora inicio/fin).
- Un alumno por un solo grupo activo (asignación única).

## Locaciones
- Registro de locación (nombre, dirección obligatoria, valor de alquiler pactado).
- Listado y detalle de locaciones (con grupos asociados).
- Eliminación protegida: bloqueada si tiene grupos asociados.

## Clases y objetivos
- Listado de clases.
- Creación de clase (grupo, fecha, horarios, objetivos y detalle opcional).
- Objetivo de clase por elementos del ciclo ITF (1 o 2).
- Vista "Objetivos de clase": distribución porcentual por elemento ITF, con filtros.
## Asistencia
- Toma de asistencia por clase (arranca con todos Presente).
- Acciones "Todos presentes" / "Todos ausentes".
- Guardado atómico de todo el conjunto.
- Contadores de presentes/ausentes en vivo.
## Cuotas de alumnos
- Registro de cuota (periodo con selector de mes, monto y fecha de pago).
- Prevención de duplicado por alumno + periodo.
- Estado del mes actual (Pagado/Pendiente) e historial en el detalle del alumno.
- Listado de cobranzas por periodo con badge Pagado/Pendiente y resumen "X de Y".
- Eliminación de cuota cargada.

## Pagos de alquiler y comprobantes
- Registro de pago (periodo, monto, fecha).
- Comprobante por cámara, galería o PDF (bucket privado).
- Historial de pagos por locación.
- Ver comprobante por enlace firmado (visor del sistema).
- Duplicado bloqueado por locación + periodo.
- Eliminación del pago (borra también el archivo).

## Auditoría de locaciones (Maestro)
- Listado en cascada de las locaciones de toda la rama (incluye descendientes indirectos).
- Agrupación por rama (subordinado directo) con marca "De su rama".
- Estado de pago derivado: Al día / Vencida · N meses / Sin pagos.
- Filtro por rama/instructor.
- Detalle con historial de pagos y comprobantes (solo lectura).
- Sin datos personales de alumnos (solo infraestructura).

## Mesas de examen (Maestro)
- Crear mesa (fecha + lugar: locaciones propias u "otro lugar").
- Listado de mesas (fecha, lugar, estado, cantidad de postulados; propias primero).
- Detalle de mesa.
- Editar mesa (fecha/lugar).
- Cerrar mesa y finalizar mesa.
- Recaudación de la mesa (total, cobrados/pendientes) y detalle de postulaciones.
- Abrir planilla de evaluación.
- Visibilidad por jerarquía: dueño + subordinados directos; mesas ajenas en solo lectura con el nombre del dueño.

## Postulación a examen (Profesor)
- Listado de mesas abiertas del superior directo.
- Postular alumnos directos mostrando grado actual → grado aspirado.
- Registro del derecho de examen (cobro manual).
- "Tus postulaciones": editar cobro y quitar postulación.
- Bloqueo de postulación duplicada.

## Planilla de evaluación (Maestro)
- Planilla de postulados con nombre, edad, peso y grado actual → aspirado.
- Carga de resultado: Aprobado / Desaprobado / Ausente (con confirmación).
- Mención especial.
- Doble graduación (salto de un cinturón, según rango).
- Ascenso automático del grado del alumno y registro en el historial de graduaciones.
- Muestra del grado otorgado.
- Irreversibilidad: una postulación evaluada no se vuelve a cargar.

## Dashboard de métricas (Maestro)
- Distribución por género (gráfico de dona).
- Distribución por rango de edad (barras).
- Distribución por grado (barras, orden del enum y etiquetas de color).
- Filtro consolidado (toda la rama) o por instructor.
- Solo conteos; nunca datos personales.

## Errores y resiliencia
- Banner de error global con mensaje genérico.
- Registro de errores en `errores_runtime`.
- Pantallas con "Reintentar" ante fallas de red.

## Distribución y actualizaciones
- Builds Android con EAS: `preview` (APK de **testeo**, canal `preview`), `production-apk` (APK de **usuarios reales**, canal `production`) y `production` (AAB para Play Store, canal `production`).
- Actualizaciones **OTA** de JS/assets con EAS Update: se publican al canal `preview`, se prueban y luego se **promueven** al canal `production` (`eas update:republish`).
- `runtimeVersion` con política **`fingerprint`**: un cambio nativo cambia el runtime y obliga a recompilar (no puede romper por update).
- Variables `EXPO_PUBLIC_*` en **EAS Environment Variables** (`preview`/`production`).
- Barra de estado clara con íconos oscuros; contenido respeta el borde superior (safe area).
