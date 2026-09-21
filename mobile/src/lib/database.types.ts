export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      asistencia: {
        Row: {
          alumno_id: string
          clase_id: string
          creado_en: string
          presente: boolean
        }
        Insert: {
          alumno_id: string
          clase_id: string
          creado_en?: string
          presente?: boolean
        }
        Update: {
          alumno_id?: string
          clase_id?: string
          creado_en?: string
          presente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "asistencia_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencia_clase_id_fkey"
            columns: ["clase_id"]
            isOneToOne: false
            referencedRelation: "clases"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          edad_max: number | null
          edad_min: number | null
          id: string
          nombre: string
          peso_max: number | null
          peso_min: number | null
          rango_max_especial: string | null
          rango_min: Database["public"]["Enums"]["grado_gup"] | null
          torneo_id: string
        }
        Insert: {
          edad_max?: number | null
          edad_min?: number | null
          id?: string
          nombre: string
          peso_max?: number | null
          peso_min?: number | null
          rango_max_especial?: string | null
          rango_min?: Database["public"]["Enums"]["grado_gup"] | null
          torneo_id: string
        }
        Update: {
          edad_max?: number | null
          edad_min?: number | null
          id?: string
          nombre?: string
          peso_max?: number | null
          peso_min?: number | null
          rango_max_especial?: string | null
          rango_min?: Database["public"]["Enums"]["grado_gup"] | null
          torneo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_torneo_id_fkey"
            columns: ["torneo_id"]
            isOneToOne: false
            referencedRelation: "torneos"
            referencedColumns: ["id"]
          },
        ]
      }
      clases: {
        Row: {
          contenido_tuls: string | null
          creado_en: string
          fecha: string
          grupo_id: string
          hora_fin: string
          hora_inicio: string
          id: string
          objetivo: string | null
          preparacion_fisica: string | null
        }
        Insert: {
          contenido_tuls?: string | null
          creado_en?: string
          fecha: string
          grupo_id: string
          hora_fin: string
          hora_inicio: string
          id?: string
          objetivo?: string | null
          preparacion_fisica?: string | null
        }
        Update: {
          contenido_tuls?: string | null
          creado_en?: string
          fecha?: string
          grupo_id?: string
          hora_fin?: string
          hora_inicio?: string
          id?: string
          objetivo?: string | null
          preparacion_fisica?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clases_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      enfrentamientos: {
        Row: {
          estado: string
          ganador_id: string | null
          id: string
          llave_id: string
          orden: number
          participante_a: string | null
          participante_b: string | null
          resultados: Json
          tipo: string
        }
        Insert: {
          estado?: string
          ganador_id?: string | null
          id?: string
          llave_id: string
          orden?: number
          participante_a?: string | null
          participante_b?: string | null
          resultados?: Json
          tipo?: string
        }
        Update: {
          estado?: string
          ganador_id?: string | null
          id?: string
          llave_id?: string
          orden?: number
          participante_a?: string | null
          participante_b?: string | null
          resultados?: Json
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "enfrentamientos_ganador_id_fkey"
            columns: ["ganador_id"]
            isOneToOne: false
            referencedRelation: "inscripciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enfrentamientos_llave_id_fkey"
            columns: ["llave_id"]
            isOneToOne: false
            referencedRelation: "llaves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enfrentamientos_participante_a_fkey"
            columns: ["participante_a"]
            isOneToOne: false
            referencedRelation: "inscripciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enfrentamientos_participante_b_fkey"
            columns: ["participante_b"]
            isOneToOne: false
            referencedRelation: "inscripciones"
            referencedColumns: ["id"]
          },
        ]
      }
      errores_runtime: {
        Row: {
          contexto: string | null
          estado: string
          fecha: string
          id: number
          mensaje_error: string
          modulo: string
          severidad: string
          solucion: string | null
          stack_trace: string | null
        }
        Insert: {
          contexto?: string | null
          estado?: string
          fecha?: string
          id?: never
          mensaje_error: string
          modulo: string
          severidad?: string
          solucion?: string | null
          stack_trace?: string | null
        }
        Update: {
          contexto?: string | null
          estado?: string
          fecha?: string
          id?: never
          mensaje_error?: string
          modulo?: string
          severidad?: string
          solucion?: string | null
          stack_trace?: string | null
        }
        Relationships: []
      }
      graduaciones: {
        Row: {
          alumno_id: string
          examinado_en: string
          grado_anterior: Database["public"]["Enums"]["grado"] | null
          grado_nuevo: Database["public"]["Enums"]["grado"] | null
          id: string
          mesa_id: string | null
          resultado: string
          sinodal_id: string
        }
        Insert: {
          alumno_id: string
          examinado_en?: string
          grado_anterior?: Database["public"]["Enums"]["grado"] | null
          grado_nuevo?: Database["public"]["Enums"]["grado"] | null
          id?: string
          mesa_id?: string | null
          resultado?: string
          sinodal_id: string
        }
        Update: {
          alumno_id?: string
          examinado_en?: string
          grado_anterior?: Database["public"]["Enums"]["grado"] | null
          grado_nuevo?: Database["public"]["Enums"]["grado"] | null
          id?: string
          mesa_id?: string | null
          resultado?: string
          sinodal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "graduaciones_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "graduaciones_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "mesas_examen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "graduaciones_sinodal_id_fkey"
            columns: ["sinodal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos: {
        Row: {
          codigo_invitacion: string | null
          creado_en: string
          id: string
          locacion_id: string | null
          nombre: string
          profesor_id: string
          ubicacion: string | null
        }
        Insert: {
          codigo_invitacion?: string | null
          creado_en?: string
          id?: string
          locacion_id?: string | null
          nombre: string
          profesor_id: string
          ubicacion?: string | null
        }
        Update: {
          codigo_invitacion?: string | null
          creado_en?: string
          id?: string
          locacion_id?: string | null
          nombre?: string
          profesor_id?: string
          ubicacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grupos_locacion_id_fkey"
            columns: ["locacion_id"]
            isOneToOne: false
            referencedRelation: "locaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grupos_profesor_id_fkey"
            columns: ["profesor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos_horarios: {
        Row: {
          dia_semana: number
          grupo_id: string
          hora_fin: string
          hora_inicio: string
          id: string
        }
        Insert: {
          dia_semana: number
          grupo_id: string
          hora_fin: string
          hora_inicio: string
          id?: string
        }
        Update: {
          dia_semana?: number
          grupo_id?: string
          hora_fin?: string
          hora_inicio?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupos_horarios_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      inscripciones: {
        Row: {
          alumno_id: string
          confirmado_en: string | null
          confirmado_por: string | null
          creado_en: string
          datos_antropometricos: Json
          estado: string
          id: string
          profesor_id: string
          rechazado_en: string | null
          rechazado_por: string | null
          torneo_id: string
        }
        Insert: {
          alumno_id: string
          confirmado_en?: string | null
          confirmado_por?: string | null
          creado_en?: string
          datos_antropometricos?: Json
          estado?: string
          id?: string
          profesor_id: string
          rechazado_en?: string | null
          rechazado_por?: string | null
          torneo_id: string
        }
        Update: {
          alumno_id?: string
          confirmado_en?: string | null
          confirmado_por?: string | null
          creado_en?: string
          datos_antropometricos?: Json
          estado?: string
          id?: string
          profesor_id?: string
          rechazado_en?: string | null
          rechazado_por?: string | null
          torneo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inscripciones_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscripciones_confirmado_por_fkey"
            columns: ["confirmado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscripciones_profesor_id_fkey"
            columns: ["profesor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscripciones_rechazado_por_fkey"
            columns: ["rechazado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscripciones_torneo_id_fkey"
            columns: ["torneo_id"]
            isOneToOne: false
            referencedRelation: "torneos"
            referencedColumns: ["id"]
          },
        ]
      }
      inscripciones_datos_privados: {
        Row: {
          creado_en: string
          inscripcion_id: string
          nivel_agresividad: number
        }
        Insert: {
          creado_en?: string
          inscripcion_id: string
          nivel_agresividad?: number
        }
        Update: {
          creado_en?: string
          inscripcion_id?: string
          nivel_agresividad?: number
        }
        Relationships: [
          {
            foreignKeyName: "inscripciones_datos_privados_inscripcion_id_fkey"
            columns: ["inscripcion_id"]
            isOneToOne: true
            referencedRelation: "inscripciones"
            referencedColumns: ["id"]
          },
        ]
      }
      jurados_torneo: {
        Row: {
          jurado_id: string
          torneo_id: string
        }
        Insert: {
          jurado_id: string
          torneo_id: string
        }
        Update: {
          jurado_id?: string
          torneo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jurados_torneo_jurado_id_fkey"
            columns: ["jurado_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jurados_torneo_torneo_id_fkey"
            columns: ["torneo_id"]
            isOneToOne: false
            referencedRelation: "torneos"
            referencedColumns: ["id"]
          },
        ]
      }
      llaves: {
        Row: {
          categoria_id: string
          id: string
          modalidad: string
          nombre_ronda: string
          orden: number
        }
        Insert: {
          categoria_id: string
          id?: string
          modalidad?: string
          nombre_ronda: string
          orden?: number
        }
        Update: {
          categoria_id?: string
          id?: string
          modalidad?: string
          nombre_ronda?: string
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "llaves_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      locaciones: {
        Row: {
          creado_en: string
          creado_por: string
          direccion: string
          id: string
          nombre: string
          valor_alquiler: number
        }
        Insert: {
          creado_en?: string
          creado_por: string
          direccion: string
          id?: string
          nombre: string
          valor_alquiler: number
        }
        Update: {
          creado_en?: string
          creado_por?: string
          direccion?: string
          id?: string
          nombre?: string
          valor_alquiler?: number
        }
        Relationships: [
          {
            foreignKeyName: "locaciones_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mesas_examen: {
        Row: {
          creado_en: string
          estado: string
          fecha: string
          id: string
          limite_inscripcion: number | null
          lugar: string | null
          maestro_id: string
        }
        Insert: {
          creado_en?: string
          estado?: string
          fecha: string
          id?: string
          limite_inscripcion?: number | null
          lugar?: string | null
          maestro_id: string
        }
        Update: {
          creado_en?: string
          estado?: string
          fecha?: string
          id?: string
          limite_inscripcion?: number | null
          lugar?: string | null
          maestro_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mesas_examen_maestro_id_fkey"
            columns: ["maestro_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      miembros_grupo: {
        Row: {
          alumno_id: string
          creado_en: string
          estado: string
          grupo_id: string
        }
        Insert: {
          alumno_id: string
          creado_en?: string
          estado?: string
          grupo_id: string
        }
        Update: {
          alumno_id?: string
          creado_en?: string
          estado?: string
          grupo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "miembros_grupo_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "miembros_grupo_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_alquiler: {
        Row: {
          comprobante_url: string | null
          creado_en: string
          creado_por: string | null
          fecha_pago: string
          id: string
          locacion_id: string
          monto: number
          periodo: string
        }
        Insert: {
          comprobante_url?: string | null
          creado_en?: string
          creado_por?: string | null
          fecha_pago: string
          id?: string
          locacion_id: string
          monto: number
          periodo: string
        }
        Update: {
          comprobante_url?: string | null
          creado_en?: string
          creado_por?: string | null
          fecha_pago?: string
          id?: string
          locacion_id?: string
          monto?: number
          periodo?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_alquiler_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_alquiler_locacion_id_fkey"
            columns: ["locacion_id"]
            isOneToOne: false
            referencedRelation: "locaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_cuota: {
        Row: {
          alumno_id: string
          creado_en: string
          creado_por: string | null
          fecha: string
          id: string
          monto: number
          observaciones: string | null
          periodo: string
        }
        Insert: {
          alumno_id: string
          creado_en?: string
          creado_por?: string | null
          fecha: string
          id?: string
          monto: number
          observaciones?: string | null
          periodo: string
        }
        Update: {
          alumno_id?: string
          creado_en?: string
          creado_por?: string | null
          fecha?: string
          id?: string
          monto?: number
          observaciones?: string | null
          periodo?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_cuota_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_cuota_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      postulaciones_examen: {
        Row: {
          alumno_id: string
          creado_en: string
          derecho_examen: number | null
          estado: string
          evaluado_en: string | null
          evaluado_por: string | null
          grado_aspirado: Database["public"]["Enums"]["grado"]
          id: string
          mesa_id: string
          profesor_id: string
        }
        Insert: {
          alumno_id: string
          creado_en?: string
          derecho_examen?: number | null
          estado?: string
          evaluado_en?: string | null
          evaluado_por?: string | null
          grado_aspirado: Database["public"]["Enums"]["grado"]
          id?: string
          mesa_id: string
          profesor_id: string
        }
        Update: {
          alumno_id?: string
          creado_en?: string
          derecho_examen?: number | null
          estado?: string
          evaluado_en?: string | null
          evaluado_por?: string | null
          grado_aspirado?: Database["public"]["Enums"]["grado"]
          id?: string
          mesa_id?: string
          profesor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "postulaciones_examen_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postulaciones_examen_evaluado_por_fkey"
            columns: ["evaluado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postulaciones_examen_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "mesas_examen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postulaciones_examen_profesor_id_fkey"
            columns: ["profesor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          altura_cm: number | null
          contacto_emergencia: string | null
          creado_en: string
          datos_salud: string | null
          dni: string | null
          es_maestro: boolean
          es_profesor: boolean
          fecha_nacimiento: string | null
          genero: Database["public"]["Enums"]["genero"] | null
          grado_actual: Database["public"]["Enums"]["grado"] | null
          grados_verificados: boolean
          id: string
          maestro_id: string | null
          nombre_completo: string
          peso_kg: number | null
          telefono: string | null
        }
        Insert: {
          altura_cm?: number | null
          contacto_emergencia?: string | null
          creado_en?: string
          datos_salud?: string | null
          dni?: string | null
          es_maestro?: boolean
          es_profesor?: boolean
          fecha_nacimiento?: string | null
          genero?: Database["public"]["Enums"]["genero"] | null
          grado_actual?: Database["public"]["Enums"]["grado"] | null
          grados_verificados?: boolean
          id: string
          maestro_id?: string | null
          nombre_completo?: string
          peso_kg?: number | null
          telefono?: string | null
        }
        Update: {
          altura_cm?: number | null
          contacto_emergencia?: string | null
          creado_en?: string
          datos_salud?: string | null
          dni?: string | null
          es_maestro?: boolean
          es_profesor?: boolean
          fecha_nacimiento?: string | null
          genero?: Database["public"]["Enums"]["genero"] | null
          grado_actual?: Database["public"]["Enums"]["grado"] | null
          grados_verificados?: boolean
          id?: string
          maestro_id?: string | null
          nombre_completo?: string
          peso_kg?: number | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_maestro_id_fkey"
            columns: ["maestro_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resultados_torneo: {
        Row: {
          categoria_id: string
          creado_en: string
          detalle: Json
          ganadas: number
          id: string
          inscripcion_id: string
          modalidad: string
          perdidas: number
          posicion: number | null
          rondas_alcanzadas: number
          torneo_id: string
        }
        Insert: {
          categoria_id: string
          creado_en?: string
          detalle?: Json
          ganadas?: number
          id?: string
          inscripcion_id: string
          modalidad: string
          perdidas?: number
          posicion?: number | null
          rondas_alcanzadas?: number
          torneo_id: string
        }
        Update: {
          categoria_id?: string
          creado_en?: string
          detalle?: Json
          ganadas?: number
          id?: string
          inscripcion_id?: string
          modalidad?: string
          perdidas?: number
          posicion?: number | null
          rondas_alcanzadas?: number
          torneo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resultados_torneo_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resultados_torneo_inscripcion_id_fkey"
            columns: ["inscripcion_id"]
            isOneToOne: false
            referencedRelation: "inscripciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resultados_torneo_torneo_id_fkey"
            columns: ["torneo_id"]
            isOneToOne: false
            referencedRelation: "torneos"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes_linaje: {
        Row: {
          alumno_id: string
          creado_en: string
          estado: string
          id: string
          instructor_id: string
          nombre_alumno: string
          resuelto_en: string | null
        }
        Insert: {
          alumno_id: string
          creado_en?: string
          estado?: string
          id?: string
          instructor_id: string
          nombre_alumno?: string
          resuelto_en?: string | null
        }
        Update: {
          alumno_id?: string
          creado_en?: string
          estado?: string
          id?: string
          instructor_id?: string
          nombre_alumno?: string
          resuelto_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_linaje_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_linaje_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      torneos: {
        Row: {
          creado_en: string
          estado: string
          fecha: string
          id: string
          link_token: string
          nombre: string
          organizador_id: string
        }
        Insert: {
          creado_en?: string
          estado?: string
          fecha: string
          id?: string
          link_token?: string
          nombre: string
          organizador_id: string
        }
        Update: {
          creado_en?: string
          estado?: string
          fecha?: string
          id?: string
          link_token?: string
          nombre?: string
          organizador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "torneos_organizador_id_fkey"
            columns: ["organizador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activar_faceta_profesor: { Args: never; Returns: boolean }
      alta_alumno: {
        Args: {
          p_altura_cm?: number
          p_contacto_emergencia?: string
          p_datos_salud?: string
          p_dni: string
          p_fecha_nacimiento: string
          p_genero: Database["public"]["Enums"]["genero"]
          p_grado_actual: Database["public"]["Enums"]["grado"]
          p_nombre_completo: string
          p_peso_kg: number
          p_telefono?: string
        }
        Returns: string
      }
      conceder_faceta_maestro: {
        Args: { p_perfil: string }
        Returns: undefined
      }
      crear_grupo_con_horarios: {
        Args: {
          p_horarios: Json
          p_locacion_id?: string
          p_nombre: string
        }
        Returns: string
      }
      crear_llave_tul: {
        Args: {
          p_categoria_id: string
          p_participantes: string[]
          p_torneo_id: string
        }
        Returns: undefined
      }
      descendientes: { Args: { p_ancestro: string }; Returns: string[] }
      eliminar_locacion_segura: {
        Args: { p_locacion_id: string }
        Returns: boolean
      }
      es_alumno_del_grupo: {
        Args: { p_grupo_id: string; p_perfil_id: string }
        Returns: boolean
      }
      es_alumno_directo_de: {
        Args: { p_alumno: string; p_profesor: string }
        Returns: boolean
      }
      es_profesor_del_grupo: {
        Args: { p_grupo_id: string; p_perfil_id: string }
        Returns: boolean
      }
      es_subordinado_de: {
        Args: { p_jefe: string; p_perfil: string }
        Returns: boolean
      }
      editar_grupo: {
        Args: {
          p_grupo_id: string
          p_horarios?: Json
          p_locacion_id?: string
          p_nombre: string
        }
        Returns: boolean
      }
      editar_miembros_grupo: {
        Args: { p_alumno_ids: string[]; p_grupo_id: string }
        Returns: boolean
      }
      finalizar_torneo: {
        Args: { p_historial: Json; p_torneo_id: string }
        Returns: undefined
      }
      generar_llaves: {
        Args: { p_categorias: Json; p_torneo_id: string }
        Returns: undefined
      }
      guardar_asistencia_clase: {
        Args: { p_clase_id: string; p_registros: Json }
        Returns: boolean
      }
      guardar_llaves_manuales: {
        Args: { p_categorias: Json; p_torneo_id: string }
        Returns: undefined
      }
      lista_instructores_linaje: {
        Args: never
        Returns: {
          es_maestro: boolean
          es_profesor: boolean
          grado_actual: Database["public"]["Enums"]["grado"]
          id: string
          nombre_completo: string
        }[]
      }
      marcar_en_curso: {
        Args: { p_enfrentamiento: string }
        Returns: undefined
      }
      metricas_dashboard: {
        Args: { p_instructor?: string; p_vista?: string }
        Returns: Json
      }
      planilla_mesa_examen: {
        Args: { p_mesa: string }
        Returns: {
          alumno_id: string
          edad: number
          grado_actual: Database["public"]["Enums"]["grado"]
          grado_aspirado: Database["public"]["Enums"]["grado"]
          nombre_completo: string
          peso: number
          postulacion_id: string
        }[]
      }
      puede_activar_profesor: { Args: never; Returns: boolean }
      registrar_grado_verificado: {
        Args: {
          p_grado: Database["public"]["Enums"]["grado"]
          p_perfil: string
        }
        Returns: undefined
      }
      registrar_resultado_examen: {
        Args: { p_postulacion: string; p_resultado: string }
        Returns: boolean
      }
      resolver_solicitud_linaje: {
        Args: { p_resultado: string; p_solicitud: string }
        Returns: boolean
      }
      sincronizar_resultado_en_vivo: {
        Args: {
          p_enfrentamiento: string
          p_ganador: string
          p_resultados: Json
          p_rondas: Json
          p_torneo_id: string
        }
        Returns: undefined
      }
      solicitar_linaje: { Args: { p_instructor: string }; Returns: boolean }
      verificar_dni_disponible: { Args: { p_dni: string }; Returns: boolean }
    }
    Enums: {
      genero: "masculino" | "femenino" | "otro"
      grado:
        | "blanco"
        | "blanco_punta_amarilla"
        | "amarillo"
        | "amarillo_punta_verde"
        | "verde"
        | "verde_punta_azul"
        | "azul"
        | "azul_punta_roja"
        | "rojo"
        | "rojo_punta_negra"
        | "dan_1"
        | "dan_2"
        | "dan_3"
        | "dan_4"
        | "dan_5"
        | "dan_6"
        | "dan_7"
        | "dan_8"
        | "dan_9"
      grado_dan: "dan_1" | "dan_2" | "dan_3" | "dan_4" | "dan_5" | "dan_6"
      grado_gup:
        | "blanco"
        | "blanco_punta_amarilla"
        | "amarillo"
        | "amarillo_punta_verde"
        | "verde"
        | "verde_punta_azul"
        | "azul"
        | "azul_punta_roja"
        | "rojo"
        | "rojo_punta_negra"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      genero: ["masculino", "femenino", "otro"],
      grado: [
        "blanco",
        "blanco_punta_amarilla",
        "amarillo",
        "amarillo_punta_verde",
        "verde",
        "verde_punta_azul",
        "azul",
        "azul_punta_roja",
        "rojo",
        "rojo_punta_negra",
        "dan_1",
        "dan_2",
        "dan_3",
        "dan_4",
        "dan_5",
        "dan_6",
        "dan_7",
        "dan_8",
        "dan_9",
      ],
      grado_dan: ["dan_1", "dan_2", "dan_3", "dan_4", "dan_5", "dan_6"],
      grado_gup: [
        "blanco",
        "blanco_punta_amarilla",
        "amarillo",
        "amarillo_punta_verde",
        "verde",
        "verde_punta_azul",
        "azul",
        "azul_punta_roja",
        "rojo",
        "rojo_punta_negra",
      ],
    },
  },
} as const
