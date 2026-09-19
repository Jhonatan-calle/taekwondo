# Especificación de Requisitos del Sistema (SRS) - Taekwondo ITF (MVP Web + App Móvil Futura)

## 1. Introducción y Propósito
El objetivo de la aplicación es servir como una herramienta integral de gestión, seguimiento y conexión para practicantes y profesores de Taekwondo ITF, digitalizando la jerarquía tradicional, el historial de competencias, el progreso técnico (grados y formas/tuls), la planificación de clases y el control de asistencia.

> **Nota de arquitectura:** El MVP se implementa como **plataforma web (Mobile-First)**, priorizando el Módulo de Torneos. La aplicación móvil definitiva se lanzará en etapas futuras reutilizando los perfiles e historiales ya registrados.

## 2. Modelado de Usuarios y Roles (Cuentas Duales)
La aplicación implementa un sistema flexible de roles que permite a un usuario actuar tanto de alumno como de profesor bajo una misma cuenta.

### A. Perfil Único con Facetas Duales
* **Faceta Alumno:**
  * **Datos de Perfil:** Contacto de emergencia, datos de salud y cinturón actual.
  * **Cinturones / Grados (ITF - Orden Jerárquico):**
    1. Blanco (10º Gup)
    2. Blanco punta amarilla (9º Gup)
    3. Amarillo (8º Gup)
    4. Amarillo punta verde (7º Gup)
    5. Verde (6º Gup)
    6. Verde punta azul (5º Gup)
    7. Azul (4º Gup)
    8. Azul punta roja (3º Gup)
    9. Rojo (2º Gup)
    10. Rojo punta negra (1º Gup)
    11. Cinturón Negro (I Dan a VI Dan)
  * **Vinculación y Linaje:** Cada alumno está conectado a uno o más Grupos de clase administrados por su Profesor (Maestro), heredando automáticamente el linaje o árbol jerárquico.
  * **Historial y Estadísticas de Competencia:** Registro de torneos, victorias/derrotas en **Formas (Tul)** y **Combate (Matsogi)**, y rondas alcanzadas.
  * **Registro de Asistencia:** Visualización de sus asistencias a clase.

* **Faceta Profesor (Maestro / Instructor):**
  * **Restricción de Acceso:** Solo los usuarios con **1er Dan (Cinturón Negro) o superior verificado** pueden activar la faceta de Profesor. Los grados Gup (cinturones de color) no tienen acceso a estas funciones.
  * **Desbloqueo Automático:** Al alcanzar el 1er Dan (vía examen aprobado y registrado por su maestro), el sistema desbloquea y sugiere al usuario la opción de **"Activar Modo Profesor"**.
  * **Gestión de Múltiples Grupos:** Capacidad de crear y administrar múltiples grupos de clase en diferentes ubicaciones (Dojangs) y horarios.
  * **Planificación de Clases:** Fichas de entrenamiento con objetivos, tuls a practicar y preparación física.
  * **Toma de Asistencia:** Interfaz rápida de pase de lista por fecha y grupo.
  * **Supervisión de Alumnos:** Visualización del progreso, grados y estadísticas de los alumnos vinculados a sus grupos.

---

## 3. Flujo de Vinculación y Conectividad
Para mantener el proceso simple y amigable:
1. **Generación de Código:** Al crear un Grupo, el Profesor puede elegir entre:
   * **Generación automática:** El sistema propone un código de invitación único y legible (ej. `TKD-842`).
   * **Código personalizado:** El Profesor define su propio código de invitación.
   * En ambos casos, el sistema valida la **unicidad global** del código para que ningún grupo se confunda con otro.
2. **Solicitud de Ingreso:** El Alumno introduce este código en su aplicación para solicitar unirse al grupo.
3. **Aprobación:** El Profesor recibe una notificación y aprueba o rechaza la solicitud. Al aprobarse, el alumno se vincula al grupo y a la línea de poder (linaje ascendente) del profesor.

---

## 4. Gestión de Eventos y Registros Externos
Para garantizar la veracidad de la información, el progreso y los logros no son declarados directamente por el alumno, sino que se registran mediante eventos validados externamente.

* **Restricción General de Creación:** La faceta Alumno tiene estrictamente prohibido **crear, modificar o eliminar cualquier tipo de evento** en la plataforma (clases, asistencias, exámenes o torneos). Su rol es exclusivamente de consulta y recepción de datos.

> **Fuera de alcance:** No se contempla el caso de degradación de rango de un profesor (no ocurre en la práctica).

### A. Exámenes de Pase de Cinturón (Graduaciones)
* Son eventos de evaluación técnica gestionados por el Profesor/Sinodal evaluador.
* Al registrarse la aprobación del examen, el sistema actualiza automáticamente el grado/cinturón y la forma correspondiente en el perfil del alumno.

### B. Torneos y Competencias (Módulo de Torneos - Prioridad MVP)
El módulo de torneos es la funcionalidad prioritaria del MVP y la vía de monetización de la plataforma.

**B.0 Arquitectura (MVP Web First)**

* **Formato Web (Mobile-First):** Se implementará una plataforma **web optimizada para dispositivos móviles**. Esto elimina la fricción de obligar a los usuarios (alumnos o padres) a descargar una aplicación móvil únicamente para completar una inscripción puntual.
* **Persistencia de Datos a Futuro:** Desde el día uno la base de datos debe estructurarse con los **perfiles de usuario completos**. Así, cuando en etapas futuras se lance la aplicación móvil definitiva, los usuarios ya contarán con todo su historial y registros en el sistema.

**B.1 Flujo de Inscripción y Gestión de Participantes**

1. **Envío de link de inscripción:** El profesor envía un link de inscripción a sus alumnos.
1. **Inscripción del participante:** Cada participante ingresa a la web y completa sus datos. **La web no gestiona pagos.**
2. **Pago al profesor:** La tarifa de inscripción se abona directamente al profesor, en **efectivo o transferencia**, por fuera de la plataforma.
3. **Validación del profesor:** El profesor a cargo accede a su panel y confirma qué alumnos van a participar realmente (aquellos que hayan abonado), otorgándoles el aval oficial. El sistema **no** confirma automáticamente al alumno tras completar su inscripción.
4. **Dato privado (nivel de agresividad):** Durante la validación, el profesor puede agregar un parámetro interno por participante: el **nivel de agresividad**.
   * **Restricción de visibilidad:** Es un dato estrictamente interno del profesor (o para criterios de organización del torneo) y **no puede ser visible por el alumno**.
6. **Participación del propio profesor:** El profesor que organiza o coordina las inscripciones de sus alumnos puede **decidir también inscribirse o no como participante** en el torneo, aplicándosele el mismo flujo de registro y consideraciones que a cualquier competidor.

**Estados de Inscripción y Permisos (Modelo)**

* **Estado Pendiente:** Cuando un alumno completa el formulario web, su inscripción nace en estado **"Pendiente"**. En esta etapa sus datos son **estrictamente privados** y solo pueden ser visualizados por el maestro a cargo de ese alumno.
* **Estado Confirmado:** Solo adquiere este estado cuando el maestro le otorga el **aval oficial** tras verificar el pago.

**Visibilidad Filtrada por Rol (Vistas y Controladores)**

* **Visibilidad del Profesor:** Acceso total a las inscripciones de sus alumnos (tanto **pendientes** como **confirmadas**), para poder administrarlas.
* **Visibilidad de Autoridades/Organizador:** Quien organiza el torneo o las autoridades superiores **no pueden ver** a los alumnos en estado pendiente. Su panel general se alimenta **exclusivamente** de las inscripciones ya confirmadas por los maestros.
* **Protección de Datos:** El sistema filtra los registros desde la base de datos (Controlador), garantizando que los datos de los alumnos no confirmados **jamás** lleguen al panel del organizador del torneo.

**B.2 Panel del Organizador (Dueño del Torneo) y Armado de Llaves**

1. **Visibilidad general:** Quien organiza el torneo accede a un panel general alimentado **exclusivamente** por las inscripciones **confirmadas** por los maestros, visualizando a todos los inscriptos reales y sus datos correspondientes.
2. **Generación automatizada de categorías (llaves):** El sistema procesa automáticamente los datos de los participantes y genera los emparejamientos (quién pelea con quién).

**Categorías Estrictas (Filtro Primario)**

El algoritmo agrupa a los inscriptos combinando dos variables obligatorias:

* **Rangos (cinturón):**
  * Blanco a punta amarilla.
  * Amarillo a punta azul.
  * Azul a punta negra.
  * 1er Dan a 3er Dan.
  * 4to Dan en adelante.
* **Edades:**
  * Hasta 7 | 8-9 | 10-11 | 12-13 | 14-16 | 17-20 | 21-34 | 35-50 | 50+.

**Lógica del Algoritmo (Filtro Secundario)**

Se utiliza un algoritmo basado en **reglas** (no IA generativa) que procesa los grupos de la siguiente manera:

* **Proximidad de peso:** Empareja buscando la **mínima diferencia de peso** posible.
* **Regla de seguridad infantil:** En categorías infantiles, el algoritmo tiene prohibido emparejar contrincantes con una diferencia de peso superior a **5 kg**.
* **Nivel de agresividad y altura:** A igualdad de peso, el sistema prioriza emparejar participantes con **niveles de agresividad similares** (dato privado provisto por el profesor) y **alturas parecidas**.

3. **Modificación manual (control total del organizador):** El dueño/administrador del torneo tiene total libertad y permisos para realizar **cualquier modificación manual** sobre los emparejamientos o llaves generados por el sistema, si lo considera necesario.

**B.3 Gestión en Vivo durante el Día del Torneo**

* **Jurados y árbitros:** Durante la jornada del torneo, múltiples jurados autorizados ingresan datos en tiempo real de cada enfrentamiento o competencia.
* **Actualización dinámica:** El sistema registra los resultados individuales de cada participante y actualiza de forma automatizada las instancias o llaves subsiguientes conforme avanza el torneo.
* **Registro de resultados finales:** Se registra la fecha, categoría del torneo, el desempeño detallado en Tul (Formas) y Combate (Matsogi), y la posición o ronda final obtenida, alimentando el historial competitivo del participante.
---

## 5. Estructura Jerárquica ("El Árbol de Poder")
* Cada usuario mantiene un maestro ascendente en su perfil de Profesor.
* Esto genera una estructura de linaje en red/árbol, permitiendo visualizar de forma transparente la cadena de enseñanza tradicional desde los alumnos de base hasta los maestros de rango superior de la escuela.

---

## 6. Modelo de Negocio y Estrategia de Monetización
* **Funcionalidades gratuitas (adopción masiva):** Todo el uso cotidiano de la aplicación para alumnos y maestros es completamente gratuito (gestión de clases, perfiles, asistencia, linaje, historial de grados, etc.), con el objetivo de masificar y popularizar la plataforma en dojangs y escuelas.
* **Monetización vía torneos:** La única vía de monetización por el momento es el cobro por la **gestión integral de torneos y competencias**.
* **Prioridad de desarrollo (MVP):** Dado que es el modelo de negocio inicial, el **Módulo de Torneos** se implementa de manera prioritaria.
