```mermaid
erDiagram
    AUTH.USERS {
        uuid id PK
        string email
        string phone
    }

    PROFILES {
        uuid id PK
        string nombre_completo
        date fecha_nacimiento
        numeric peso_kg
        numeric altura_cm
        string contacto_emergencia
        string datos_salud
        uuid maestro_id FK "maestro ascendente (se deriva al aprobarse el 1er grupo; reasignable solo vía Service Role)"
        bool grados_verificados
        grado_dan grado_dan_actual "Dan vigente verificado (solo-sistema; su presencia habilita la faceta profesor)"
        bool es_profesor "faceta profesor (alumno = perfil base)"
        timestamptz creado_en
    }

    GRUPOS {
        uuid id PK
        uuid profesor_id FK "RLS: dueño (profesor) + miembros del grupo"
        string nombre
        string ubicacion
        string horarios
        string codigo_invitacion UK "código único de vinculación"
        timestamptz creado_en
    }

    MIEMBROS_GRUPO {
        uuid grupo_id FK "RLS: alumno solo a sí mismo; profesor a su grupo"
        uuid alumno_id FK
        string estado "activo | pendiente_aprobacion"
        timestamptz creado_en
    }

    CLASES {
        uuid id PK
        uuid grupo_id FK
        date fecha
        time hora_inicio
        time hora_fin
        string objetivo
        string contenido_tuls
        string preparacion_fisica
        timestamptz creado_en
    }

    ASISTENCIA {
        uuid clase_id FK
        uuid alumno_id FK
        bool presente
        timestamptz creado_en
    }

    TORNEOS {
        uuid id PK
        uuid organizador_id FK
        string nombre
        date fecha
        string link_token UK "link de inscripción (secreto)"
        string estado "borrador | inscripciones | armado_llaves | en_vivo | finalizado"
        timestamptz creado_en
    }

    INSCRIPCIONES {
        uuid id PK
        uuid torneo_id FK
        uuid alumno_id FK
        uuid profesor_id FK "profesor que da el aval; en el formulario público (/t/:token) lo elige el participante"
        jsonb datos_antropometricos "snapshot al inscribirse: {grado, fecha_nacimiento, peso_kg, altura_cm}"
        string estado "pendiente | confirmado | rechazado"
        uuid confirmado_por FK
        timestamptz confirmado_en
        uuid rechazado_por FK "auditoría simétrica: profesor que rechazó"
        timestamptz rechazado_en
        timestamptz creado_en
    }

    INSCRIPCIONES_DATOS_PRIVADOS {
        uuid inscripcion_id PK, FK
        int nivel_agresividad "1-5, solo profesor (aislado por RLS)"
        timestamptz creado_en
    }

    CATEGORIAS {
        uuid id PK
        uuid torneo_id FK
        string nombre
        grado_gup rango_min "solo rangos Gup: primer cinturón del rango (ej blanco/amarillo/azul)"
        string rango_max_especial "maneja caso 'dan' (ej 'dan_3'/'dan_6'); null en rangos Gup"
        int edad_min
        int edad_max
        numeric peso_min
        numeric peso_max
    }

    LLAVES {
        uuid id PK
        uuid categoria_id FK
        string nombre_ronda "el armado inicial crea 'Primera ronda' (orden 0)"
        int orden
    }

    ENFRENTAMIENTOS {
        uuid id PK
        uuid llave_id FK
        uuid participante_a FK
        uuid participante_b FK "null = bye (sin rival válido)"
        uuid ganador_id FK
        string tipo "combate | tul"
        string estado "pendiente | en_curso | finalizado"
        jsonb resultados
    }

    JURADOS_TORNEO {
        uuid torneo_id FK
        uuid jurado_id FK
    }

    GRADUACIONES {
        uuid id PK
        uuid alumno_id FK
        uuid sinodal_id FK "maestro evaluador"
        grado_gup grado_anterior
        grado_gup grado_nuevo
        grado_dan dan_anterior
        grado_dan dan_nuevo
        bool aprobado
        timestamptz examinado_en
    }

    ERRORES_RUNTIME {
        bigint id PK
        timestamptz fecha
        string modulo
        string contexto
        string mensaje_error
        string stack_trace
        string severidad "info | warning | error | critical"
        string estado "nuevo | en_revision | resuelto | descartado"
        string solucion
    }

    AUTH.USERS ||--o| PROFILES : id
    PROFILES ||--o| GRUPOS : profesor_id
    PROFILES ||--o| MIEMBROS_GRUPO : alumno_id
    GRUPOS ||--o| MIEMBROS_GRUPO : grupo_id
    GRUPOS ||--o| CLASES : grupo_id
    CLASES ||--o| ASISTENCIA : clase_id
    PROFILES ||--o| ASISTENCIA : alumno_id
    PROFILES ||--o| TORNEOS : organizador_id
    TORNEOS ||--o| INSCRIPCIONES : torneo_id
    PROFILES ||--o| INSCRIPCIONES : alumno_id
    PROFILES ||--o{ INSCRIPCIONES : "profesor_id (aval)"
    INSCRIPCIONES ||--o| INSCRIPCIONES_DATOS_PRIVADOS : inscripcion_id
    TORNEOS ||--o| CATEGORIAS : torneo_id
    CATEGORIAS ||--o| LLAVES : categoria_id
    LLAVES ||--o| ENFRENTAMIENTOS : llave_id
    INSCRIPCIONES ||--o| ENFRENTAMIENTOS : participante_a
    INSCRIPCIONES ||--o| ENFRENTAMIENTOS : participante_b
    INSCRIPCIONES ||--o| ENFRENTAMIENTOS : ganador_id
    TORNEOS ||--o| JURADOS_TORNEO : torneo_id
    PROFILES ||--o{ JURADOS_TORNEO : jurado_id
    PROFILES ||--o| GRADUACIONES : alumno_id

    ```

## Notas del Motor de Emparejamiento (Fase 3, ítem 3)

- **Alcance:** solo armado inicial. El motor (TS puro en `web/src/lib/emparejamiento/`) toma
  inscripciones **confirmadas** de un torneo, agrupa por categoría estricta (rango de cinturón ×
  banda de edad, SRS §B.2) y empareja por mínima diferencia de peso con desempate por agresividad
  y altura. Categoría infantil = bandas con `max ≤ 13 años` → prohibido emparejar con |Δpeso| > 5 kg.
- **Persistencia atómica:** el resultado llega como jsonb al RPC `generar_llaves(p_torneo_id,
  p_categorias)` (SECURITY DEFINER, valida que `auth.uid()` sea el `organizador_id`, elimina
  categorías previas del torneo y reconstruye en una transacción; el torneo pasa a `armado_llaves`).
- **Llaves iniciales:** cada categoría arma una `LLAVES` de primera ronda (`nombre_ronda =
  'Primera ronda'`, `orden = 0`). Las rondas subsiguientes se generan en el módulo en vivo (Fase 3).
- **Byes:** un participante sin rival válido (impar o infantil sin oponente dentro del tope) queda
  como `ENFRENTAMIENTOS.participante_b = NULL`.
- **RLS nuevas:** SELECT de `categorias`/`llaves`/`enfrentamientos` (y UPDATE de `torneos`) habilitado
  para el organizador del torneo. Escritura de llaves solo vía RPC (nunca directa).

## Notas del Panel del Organizador (Fase 3, ítem 4)

- **Alimentado solo por confirmados:** el panel (`/panel/organizador`) lee exclusivamente
  `inscripciones.estado = 'confirmado'` (filtro en `organizador/datos.ts` + RLS
  `inscripciones_select_organizador`). Pendientes/rechazados jamás llegan a la vista.
- **Edición manual atómica:** el organizador arma el estado final de la llave en el cliente
  (`web/src/lib/llaves/`, puro/determinista) y lo persiste con el RPC
  `guardar_llaves_manuales(p_torneo_id, p_categorias)` (SECURITY DEFINER, `search_path = public`):
  valida `auth.uid() = organizador_id`, exige `torneos.estado = 'armado_llaves'`, verifica que toda
  referencia a inscripción pertenezca al torneo y esté `confirmado`, y reemplaza las categorías del
  torneo con el **mismo contrato jsonb** que `generar_llaves` (sin cambiar el estado del torneo).
- **Ids regenerados:** reconstruir `categorias`/`llaves`/`enfrentamientos` en cada guardado crea ids
  nuevos (igual que regenerar); el módulo en vivo deberá resolver las FKs recién creadas.
- **Doble categoría (SRS B.2.3):** un participante confirmado puede aparecer en varias categorías del
  torneo (a lo sumo una vez por categoría). El RPC `guardar_llaves_manuales` rechaza con `raise
  exception` la repetición DENTRO de la misma categoría y los auto-enfrentamientos
  (`participante_a = participante_b`). El editor (`lib/llaves/editar.ts`) aplica el mismo invariante:
  mover/sumar a otro bracket conserva las apariciones en otras categorías, y la "x" quita solo de la
  categoría en curso.
- **Advertencias no bloqueantes (SRS B.2.3):** la regla infantil ≤5 kg y las salidas de rango/edad se
  informan con confirmación en la UI (`lib/llaves/advertencias.ts`), pero no impiden guardar: el
  control es total y la responsabilidad del organizador.
