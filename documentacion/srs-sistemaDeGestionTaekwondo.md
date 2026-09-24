# **Especificación de Requerimientos de Software (SRS)**

# **1\. Descripción General del Sistema**

El sistema tiene como objetivo gestionar la administración integral de una escuela de Taekwondo. Está diseñado para facilitar a los instructores el control operativo de sus alumnos, la planificación de clases, el registro de asistencias, y la gestión financiera que incluye tanto el cobro de cuotas como el pago de alquileres de los espacios físicos utilizados. Asimismo, proporcionará a los administradores y maestros de alto rango herramientas de supervisión para visualizar la estructura organizacional de la escuela y métricas clave de desempeño.

# **2. Jerarquía de Usuarios y Control de Acceso**

El sistema implementa un modelo de acceso basado en un árbol jerárquico infinito que refleja el linaje natural de la disciplina (relación directa alumno-instructor). No existen roles geográficos estáticos; la autoridad fluye dinámicamente según la posición del usuario en el árbol.

## **Estructura de Roles Dinámica**

* **Maestro:** Usuario superior (con la bandera `es_maestro` habilitada) que tiene descendencia en el sistema. Su posición en el árbol le otorga poder recursivo sobre sus subordinados (Profesores y Alumnos-Profesores) y toda la red debajo de ellos. Son los únicos habilitados para aperturar mesas de examen.
* **Profesor / Alumno-Profesor:** Usuario con un grado mínimo de 1º Dan (`dan_1`) que ha sido habilitado para dar clases (bandera `es_profesor` activa). Administra a sus propios alumnos directos. Sigue siendo un alumno respecto a su propio instructor superior (`maestro_id`), a quien le rinde cuentas.
* **Alumno Regular:** Estudiante en la base del árbol jerárquico, sin permisos de enseñanza ni alumnos a cargo.

## **Reglas de Visibilidad y Permisos (Árbol de Poder)**

* **Gestión Directa:** Un Profesor posee acceso total para editar perfiles, registrar pagos de cuotas y postular a exámenes **exclusivamente** a sus alumnos directos.
* **Privacidad en Cascada:** Ningún superior jerárquico puede leer los datos personales sensibles de los alumnos de sus subordinados; su acceso hacia las ramas inferiores se limita a visualizar métricas estadísticas anonimizadas generadas por el sistema.
* **Auditoría de Infraestructura en Cascada:** Cualquier Maestro en la cadena de mando tiene el poder recursivo de auditar a sus instructores subordinados, pudiendo visualizar el pago de alquileres y comprobantes adjuntos de toda su rama inferior.
* **Excepción de Mesa de Examen:** Al momento de evaluar, el Maestro examinador recibe temporalmente acceso a una planilla técnica (nombre, edad, peso, grados) de los alumnos postulados por los profesores de su linaje.

# **3\. Requerimientos Funcionales**

## **3.1. Gestión de Alumnos**

El sistema debe permitir registrar y administrar el perfil detallado de cada estudiante, incluyendo:

* Nombre completo (Campo obligatorio).  
* DNI (Campo obligatorio y único).  
* Fecha de nacimiento (Con cálculo automático de la edad cronológica).  
* Peso (Valor aproximado para categorización competitiva).  
* Género.  
* Grado/Cinturón actual.
* Teléfono / celular de contacto (Campo opcional).

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
* Planificación de la sesión con **1 o 2 objetivos** elegidos entre los elementos del ciclo de composición del Taekwondo ITF —**Movimientos Fundamentales (Gibon Dongjak)**, **Formas (Tules)**, **Entrenamiento con Accesorios (Dallyon)**, **Ejercicios de Combate (Matsogi)** y **Defensa Personal (Hosin Sul)**— más un **detalle opcional** de la sesión.
* **Vista de distribución de objetivos** para el profesor: porcentaje de clases dedicado a cada elemento (con filtros de período y grupo), con el fin de detectar qué contenidos reforzar.

## **3.5. Asistencia y Pagos**

* **Control de Asistencia:** Toma de presentes por fecha, vinculada automáticamente al grupo, lugar y horario de la sesión.  
* **Gestión de Cuotas:** Registro de los pagos mensuales de cada alumno, documentando la fecha de la transacción y el monto percibido.

## **3.6. Dashboard de Estadísticas y Métricas**

Panel de control interactivo destinado a usuarios con personal subordinado:

* Visualización de la distribución demográfica por género, rangos de edad y niveles de graduación (cinturones).  
* Herramientas de filtrado para alternar entre una "Vista Consolidada" (toda la rama descendente) y una "Vista Específica" (un instructor subordinado en particular).

## **3.7. Módulo de Exámenes de Graduación**

* **Planificación:** Los Maestros pueden aperturar mesas de examen definiendo fecha y lugar.  
* **Inscripción:** Los profesores postulan a sus alumnos aptos; el sistema debe calcular automáticamente el grado inmediato superior al que aspiran.  
* **Gestión Financiera:** Registro del "derecho de examen". El maestro examinador podrá visualizar la recaudación total de la mesa.  
* **Evaluación:** Carga de resultados finales directamente en la planilla digital: **Aprobado** o **Desaprobado**, o **Ausente**. Sobre un aprobado el maestro examinador puede marcar además **Mención especial** y/o **Doble graduación** (el alumno se salta un cinturón).  
* **Doble graduación:** solo aplica cuando el grado actual del alumno está entre **Blanco** y **Azul punta roja** (inclusive); el nuevo grado es dos niveles superior (caso tope: Azul punta roja → Rojo punta negra). De ahí en adelante el máximo premio es la **mención especial**.  
* **Ascenso y Registro:** Al aprobar, el sistema debe actualizar automáticamente el cinturón en el perfil del alumno (un nivel, o dos si hay doble graduación) y registrar el evento en su historial académico permanente (`graduaciones`), incluidas la mención especial y la doble graduación. La postulación guarda el **grado otorgado**.  

