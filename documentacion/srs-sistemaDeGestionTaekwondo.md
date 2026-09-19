# **Especificación de Requerimientos de Software (SRS)**

# **1\. Descripción General del Sistema**

El sistema tiene como objetivo gestionar la administración integral de una escuela de Taekwondo. Está diseñado para facilitar a los instructores el control operativo de sus alumnos, la planificación de clases, el registro de asistencias, y la gestión financiera que incluye tanto el cobro de cuotas como el pago de alquileres de los espacios físicos utilizados. Asimismo, proporcionará a los administradores y maestros de alto rango herramientas de supervisión para visualizar la estructura organizacional de la escuela y métricas clave de desempeño.

# **2\. Jerarquía de Usuarios y Control de Acceso**

El sistema implementa un modelo de acceso basado en un árbol jerárquico que refleja el linaje o la cadena de mando tradicional de la disciplina.

## **Estructura de Roles**

* **Maestro Provincial (ej. Encargado de Córdoba):** Se sitúa en la cúspide de la jerarquía provincial, con supervisión sobre toda la red regional.  
* **Maestro Regional/Ciudad (ej. Encargado de Río Cuarto):** Subordinado directo al Maestro Provincial, responsable de una zona geográfica específica.  
* **Profesor Titular:** Subordinado a un Maestro Regional o a otro Profesor de mayor rango. Administra sus propios centros de enseñanza y grupos de alumnos.  
* **Alumno-Profesor:** Un estudiante que, poseyendo un rango que lo habilita, dicta clases a sus propios alumnos mientras continúa reportando a su Profesor Titular original.  
* **Alumno Regular:** Estudiante en la base del árbol jerárquico, sin personal a cargo.

## **Reglas de Visibilidad y Permisos**

* **Gestión Directa:** Un profesor posee acceso total a los datos personales, historial de asistencias y estados de cuenta exclusivamente de sus alumnos directos.  
* **Privacidad en Cascada:** Los superiores jerárquicos no pueden acceder a los datos personales sensibles de los alumnos de sus subordinados. Su acceso se limita a la visualización de métricas estadísticas anonimizadas.  
* **Excepción de Auditoría de Infraestructura:** Con el fin de garantizar la sostenibilidad de la organización, un superior tiene acceso directo al estado de las locaciones de todos sus subordinados, pudiendo verificar el pago de alquileres, montos, vencimientos y comprobantes adjuntos.  
* **Excepción de Mesas de Examen:** Durante los periodos de evaluación, el examinador designado puede visualizar una planilla con los datos técnicos (nombre, edad, peso, grado actual) de los alumnos postulados por sus subordinados.

# **3\. Requerimientos Funcionales**

## **3.1. Gestión de Alumnos**

El sistema debe permitir registrar y administrar el perfil detallado de cada estudiante, incluyendo:

* Nombre completo (Campo obligatorio).  
* DNI (Campo obligatorio y único).  
* Fecha de nacimiento (Con cálculo automático de la edad cronológica).  
* Peso (Valor aproximado para categorización competitiva).  
* Género.  
* Grado/Cinturón actual.

## **3.2. Catálogo de Grados (Cinturones)**

Se establece una jerarquía predefinida inamovible:

* **Gup:** Desde Blanco (10º Gup) hasta Rojo punta negra (1º Gup).  
* **Dan:** Cinturón Negro (desde I Dan hasta VI Dan y rangos superiores).

## **3.3. Gestión de Lugares y Alquileres**

* **Registro de Locación:** Capacidad de crear nuevos centros de entrenamiento definiendo nombre, dirección física y valor de alquiler pactado.  
* **Registro de Pagos y Comprobantes:** Funcionalidad para asentar los pagos de alquiler, permitiendo adjuntar archivos digitales (imágenes o PDFs) vinculados a la locación y al periodo correspondiente.

## **3.4. Gestión de Clases y Grupos**

* Configuración de grupos asociados a un salón (locación) y horarios específicos.  
* Asignación dinámica de alumnos a sus respectivos grupos y turnos.

## **3.5. Asistencia y Pagos**

* **Control de Asistencia:** Toma de presentes por fecha, vinculada automáticamente al grupo, lugar y horario de la sesión.  
* **Gestión de Cuotas:** Registro de los pagos mensuales de cada alumno, documentando la fecha de la transacción y el monto percibido.

## **3.6. Dashboard de Estadísticas y Métricas**

Panel de control interactivo destinado a usuarios con personal subordinado:

* Visualización de la distribución demográfica por género, rangos de edad y niveles de graduación (cinturones).  
* Herramientas de filtrado para alternar entre una "Vista Consolidada" (toda la rama descendente) y una "Vista Específica" (un instructor subordinado en particular).

## **3.7. Módulo de Exámenes de Graduación**

* **Planificación:** Los Maestros pueden aperturar mesas de examen definiendo fecha, lugar y límite de inscripción.  
* **Inscripción:** Los profesores postulan a sus alumnos aptos; el sistema debe calcular automáticamente el grado inmediato superior al que aspiran.  
* **Gestión Financiera:** Registro del "derecho de examen". El maestro examinador podrá visualizar la recaudación total de la mesa.  
* **Evaluación:** Carga de resultados finales (Aprobado, Desaprobado o Ausente) directamente en la planilla digital.  
* **Ascenso y Registro:** Al aprobar, el sistema debe actualizar automáticamente el cinturón en el perfil del alumno y registrar el evento en su historial académico permanente.

