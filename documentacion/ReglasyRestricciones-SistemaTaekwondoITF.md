# Manual de Reglas y Restricciones del Sistema \- Taekwondo ITF

Reglas de negocio, permisos y restricciones que el sistema aplica para reflejar la organización,
jerarquía y disciplina del Taekwondo ITF. Fuente funcional: `srs-sistemaDeGestionTaekwondo.md`.

## 1. Roles y Ascenso Jerárquico (El Árbol de Poder)

> - **Perfil base:** todo usuario ingresa como **Alumno Regular**. La propagación de la jerarquía se
>   modela con el campo `maestro_id` sobre `profiles` (árbol de linaje).
> - **Modelo dinámico (SRS §2):** árbol de linaje infinito (relación directa alumno-instructor); **no
>   existen roles geográficos estáticos**. La autoridad fluye recursivamente según la posición en el
>   árbol: cada nodo es subordinado directo de su `maestro_id`.
> - **Faceta Maestro:** boolean `es_maestro` de **uso exclusivo del sistema** (concedido vía Service
>   Role o RPCs autorizados). Habilita apertura de mesas de examen y poder recursivo sobre toda su
>   rama descendente.
> - **Faceta Profesor:** solo puede activarse con **1er Dan (o superior) verificado**
>   (`grado_actual >= 'dan_1'`). Los grados Gup (cinturones de color) tienen el acceso bloqueado.
>   Sigue siendo alumno respecto a su propio instructor superior (`maestro_id`).
> - **Prohibición de auto-promoción:** el sistema bloquea por completo que un practicante modifique
>   su propio `grado_actual`/`grados_verificados` o se otorgue las facetas Profesor/Maestro. El grado
>   solo se actualiza al aprobar un examen oficial (ver §4).
> - **Linaje inamovible:** una vez establecido, el alumno no puede modificar, reasignar ni alterar su
>   `maestro_id`. Solo una autoridad administradora (Service Role) hace reasignaciones.

## 2. Visibilidad y Permisos

> - **Gestión directa:** un profesor tiene acceso total a los datos personales, historial y estados
>   de cuenta **exclusivamente de sus alumnos directos** (`maestro_id = profesor`).
> - **Privacidad en cascada:** los superiores jerárquicos **no** acceden a los datos personales
>   sensibles de los alumnos de sus subordinados; solo ven métricas estadísticas **anonimizadas**
>   (RPC `metricas_dashboard`).
> - **Excepción — Auditoría de infraestructura:** un superior ve el estado de las locaciones de todos
>   sus subordinados (pagos de alquiler, montos, vencimientos y comprobantes).
> - **Excepción — Mesas de examen:** el maestro examinador ve la planilla con datos técnicos (nombre,
>   edad, peso, grado actual y aspirado) de los postulados (RPC `planilla_mesa_examen`).
> - **Alumnos no crean eventos:** la faceta Alumno tiene prohibido crear, modificar o eliminar
>   eventos (clases, asistencias, exámenes, pagos). Su rol es de consulta.
> - **DNI:** obligatorio y único a nivel app; única para los identificadores (nullable en BD con
>   validación en la aplicación).

## 3. Pagos (solo registro)

> - El sistema **no procesa dinero**: solo **registra pagos** de **cuotas** de alumnos
>   (`pagos_cuota`, único por `(alumno_id, periodo)`) y de **alquileres** de locaciones
>   (`pagos_alquiler`, con comprobantes adjuntos en storage privado).
> - El "derecho de examen" se registra en la postulación (recaudación de la mesa consultable por el
>   maestro examinador).

## 4. Exámenes de Graduación

> - **Planificación:** los Maestros (`es_maestro`) aperturan mesas de examen (fecha, lugar).
> - **Inscripción:** los profesores postulan a sus **alumnos directos**; el sistema calcula
>   automáticamente el **grado inmediato superior** al que aspiran (RPC `postular_alumno`, no
>   falsificable desde el cliente).
> - **Gestión financiera:** el profesor registra manualmente el **derecho de examen** (solo registro:
>   el sistema no procesa dinero). El **maestro examinador visualiza la recaudación total de la mesa**
>   (SRS §3.7), con el desglose de derechos cobrados y pendientes.
> - **Evaluación:** solo el **maestro examinador** (dueño de la mesa) carga el resultado
>   (aprobado / desaprobado / ausente) vía RPC `registrar_resultado_examen`.
> - **Ascenso y registro:** al aprobar, el sistema actualiza automáticamente `profiles.grado_actual`
>   y deja registro permanente en `graduaciones` (historial académico). La escritura en `graduaciones`
>   solo ocurre vía RPC, nunca directa.

## 5. Módulo de Torneos (CONGELADO — web fuera de desarrollo)

> El módulo de torneos se conserva **intacto en la BD** (tablas, RLS y RPCs) pero **no se desarrolla**
> en la app móvil ni en la web (congelada). Reglas históricas (inscripciones pendientes/privacidad,
> aval del profesor, nivel de agresividad, emparejamiento con regla infantil ≤5 kg y doble categoría):
> ver `descartado-web/descripcion-general-srs-web.md` y `descartado-web/planes/`.