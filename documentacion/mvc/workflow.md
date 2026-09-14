**Fase 1: Setup de la Arquitectura Base y Repositorio**

- [x] **Inicialización del Frontend:** Configurar el proyecto utilizando Next.js (React) junto con Tailwind CSS y shadcn/ui. Esto garantizará un diseño fluido e impecable centrado en el enfoque "Mobile-First".

- [ ] **Inicialización del Backend y Base de Datos:** Configurar Supabase para utilizar PostgreSQL como base de datos principal. Es crucial estructurar la base de datos desde el primer día para almacenar perfiles e historiales completos.

- [ ] **Autenticación:** Implementar Supabase Auth para gestionar la seguridad del MVP y los roles. La seguridad del MVP estará centrada en Profesores y Organizadores, quienes tendrán cuentas activas para gestionar los torneos.



**Fase 2: Modelado de Usuarios y Base de Datos (PostgreSQL)**

- [ ] **Esquema de Roles Duales:** Estructurar en el back-end (PostgreSQL) el sistema que permite a un usuario actuar tanto de alumno como de profesor bajo una misma cuenta.

- [ ] **Árbol de Jerarquías:** Modelar las relaciones complejas del sistema para el linaje o árbol jerárquico, permitiendo que cada alumno esté conectado a un grupo administrado por su Profesor.

- [ ] **Restricciones de Acceso:** Configurar la lógica para que solo los usuarios con 1er Dan o superior verificado puedan activar la faceta de Profesor y acceder a funciones de gestión.



**Fase 3: Desarrollo del Módulo de Torneos MVP (Next.js & Node.js)**
Esta fase es la prioridad del MVP y la vía inicial de monetización.

- [ ] **Flujo de Inscripción Web:** Desarrollar los formularios en Next.js donde el participante completa sus datos tras recibir un link de su profesor. Este formulario no procesará pagos, ya que el alumno abonará directamente al profesor en efectivo o transferencia.

- [ ] **Panel de Profesores:** Crear la vista donde los profesores validan las inscripciones en estado "Pendiente" y confirman a los alumnos que ya pagaron. En esta instancia, el profesor podrá cargar datos internos e invisibles para el alumno, como el nivel de agresividad.

- [ ] **Motor de Emparejamiento (Node.js/TypeScript):** Desarrollar un algoritmo basado en reglas que empareje a los inscriptos confirmados considerando cinturón, edad, peso, altura y agresividad. Se debe incluir la regla de seguridad para infantiles que prohíbe emparejamientos con diferencias de peso mayores a 5 kg.

- [ ] **Panel del Organizador:** Desarrollar el panel alimentado exclusivamente por inscripciones confirmadas, donde el organizador tendrá control total para modificar las llaves manualmente si lo considera necesario.

- [ ] **Gestión en Vivo (Supabase WebSockets):** Implementar la interfaz para el día del torneo utilizando canales WebSocket de Supabase. Esto permitirá que los jurados carguen los resultados (combate y formas) en tiempo real, actualizando las llaves de forma automatizada y guardando el historial de cada participante.

- [ ] **Registro de Errores en Tiempo de Ejecución:** Crear una tabla en la base de datos (PostgreSQL/Supabase) donde **todo `try/catch` registre** los errores capturados (fecha, módulo, ruta/contexto, mensaje interno, stack trace y severidad). La UI sigue mostrando el mensaje genérico y amigable; los detalles técnicos quedan solo en el registro interno para su posterior recolección y corrección.



**Fase 4: Pruebas y Validación (QA)**

- [ ] Verificar desde los controladores que las inscripciones "Pendientes" jamás sean visibles para las autoridades o el organizador del torneo.

- [ ] Testear el algoritmo de Node.js para asegurar que el emparejamiento respete estrictamente los rangos de edad, peso y grados.

- [ ] Validar la usabilidad del formulario web desde distintos teléfonos móviles para asegurar el enfoque Mobile-First.

- [ ] Verificar que cada `try/catch` registre correctamente el error en la tabla interna y que la UI nunca exponga detalles técnicos (solo el mensaje genérico y amigable).



**Fase 5: Despliegue (Deploy)**

- [ ] Realizar la puesta en producción de la plataforma utilizando Vercel.

- [ ] Asegurar que la infraestructura ofrezca alta disponibilidad para soportar la carga de datos en tiempo real que harán los jurados durante los eventos.



**Fase 6: Operación y Roadmap Futuro**

- [ ] Ejecutar los primeros torneos reales utilizando la plataforma web.

- [ ] Aprovechar el uso gratuito de las herramientas cotidianas (gestión de clases, historiales, etc.) para fomentar la adopción masiva en los dojangs.

- [ ] Como paso siguiente, iniciar el desarrollo de la aplicación móvil nativa y habilitar los códigos de vinculación para que los alumnos puedan reclamar los perfiles generados durante estos torneos.



**Anexo: Registro de Errores en Tiempo de Ejecución**

Los `try/catch` del sistema registran los errores capturados en una tabla interna de la base de datos (PostgreSQL/Supabase) para su posterior recolección y corrección. Este registro es **interno**: la UI siempre muestra mensajes genéricos y amigables, y jamás expone estos detalles técnicos.

**Esquema de la tabla `errores_runtime`:**

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | serial | Identificador único |
| `fecha` | timestamptz | Momento del error |
| `modulo` | text | Módulo afectado (inscripción, panel profesor, emparejamiento, en vivo, etc.) |
| `contexto` | text | Ruta/endpoint o acción donde ocurrió |
| `mensaje_error` | text | Mensaje técnico interno (no visible al usuario) |
| `stack_trace` | text | Traza interna (no visible al usuario) |
| `severidad` | text | `info` / `warning` / `error` / `critical` |
| `estado` | text | `nuevo` / `en revisión` / `resuelto` / `descartado` |
| `solucion` | text | Notas/descripción de la solución aplicada |

**Tabla de seguimiento (ir completando a medida que se recolectan errores):**

| Fecha | Módulo | Contexto/Ruta | Error (interno) | Severidad | Estado | Solución/Notas |
|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |