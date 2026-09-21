---
version: 1.0.0
estado: Aprobado
fecha_aprobacion: 2026-09-21
---

# Plan: Generar Seed de Alumnos (Datos de Prueba)

## Historial de revisiones
- v1.0.0: Creación inicial del plan.

## Restricciones y Correcciones Previas (No repetir)
- Ninguna por el momento.

## Contexto / Objetivo
El usuario solicitó generar un seed (datos de prueba iniciales) de alumnos en la base de datos para facilitar el desarrollo y las pruebas de la aplicación móvil de gestión.
Esto implica crear el archivo `supabase/seed.sql` e insertar perfiles simulados de alumnos con distintos grados y características, aprovechando que los perfiles no requieren obligatoriamente una cuenta en `auth.users` (según el modelo, `id` en `profiles` no tiene FK estricta a `auth.users` para el caso de altas de alumnos sin cuenta).

## Cambios Concretos
1. **Crear archivo `supabase/seed.sql`**:
   - Escribir instrucciones `INSERT INTO public.profiles` para generar al menos 5-10 perfiles de alumnos.
   - Usar `gen_random_uuid()` para los `id` de los perfiles.
   - Definir datos ficticios: `nombre_completo`, `fecha_nacimiento`, `peso_kg`, `altura_cm`, `dni`, `genero` (enum `masculino | femenino | otro`), y `grado_actual` (enum `public.grado` como `blanco`, `amarillo`, `dan_1`, etc.).
   - Asegurarse de que `es_profesor = false` y `es_maestro = false`.
   - Asignar `grados_verificados = false` por defecto.
   - (Opcional) Asignar un `maestro_id` si se desea armar el árbol de linaje, o dejarlo en `null` si no es estrictamente necesario en esta etapa.

## Criterios de Aceptación y Verificación
- [ ] Existe el archivo `supabase/seed.sql` con sentencias SQL válidas.
- [ ] Ejecutar `supabase db reset --linked` o `supabase db push --linked` carga exitosamente los datos de prueba sin errores de constraints.
- [ ] Los alumnos insertados cumplen con el esquema de la tabla `profiles` y los tipos de datos enumerados (`grado`, `genero`).
