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
        uuid profesor_id FK "profesor que da el aval"
        jsonb datos_antropometricos "edad, peso, altura"
        string estado "pendiente | confirmado | rechazado"
        uuid confirmado_por FK
        timestamptz confirmado_en
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
        grado_gup rango_min
        string rango_max_especial "maneja caso 'dan' (1er Dan+)"
        int edad_min
        int edad_max
        numeric peso_min
        numeric peso_max
    }

    LLAVES {
        uuid id PK
        uuid categoria_id FK
        string nombre_ronda
        int orden
    }

    ENFRENTAMIENTOS {
        uuid id PK
        uuid llave_id FK
        uuid participante_a FK
        uuid participante_b FK
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
