# AGENTS.md - Guía para Agentes de IA (Proyecto Taekwondo ITF)

## Propósito y contexto
- Herramienta integral de gestión, seguimiento y conexión para practicantes y profesores de
  Taekwondo ITF (linaje, grados/cinturones, clases, asistencia, torneos).
- MVP actual: **plataforma web Mobile-First** priorizando el **Módulo de Torneos** (vía de
  monetización). App móvil nativa en etapas futuras.
- Docs de referencia obligatoria antes de codear:
  - `documentacion/descripcion-general.md` → SRS completo (roles, torneos, reglas de negocio).
  - `documentacion/mvc/stack.md` → Stack tecnológico (solo para el mvc).
  - `documentacion/mvc/workflow.md` → Fases de desarrollo con checkboxes de avance (solo para el mvc)..

## Stack tecnológico
- Frontend: Next.js (React) + Tailwind CSS + shadcn/ui (Mobile-First).
- Backend: Node.js (TypeScript / API Routes).
- BD y tiempo real: PostgreSQL (Supabase) + WebSockets (Supabase Realtime).
- Auth: Supabase Auth · Deploy: Vercel.

## Reglas generales
- **Idioma:** código y comentarios en español.
- **Canario de sesión:** al final de TODA respuesta incluir el emoji `🐧`.
- **Git:** NO hacer commits ni push automáticos; solo si el usuario lo pide explícitamente.
- **Archivos protegidos (no tocar):** `.env*`, `.obsidian/` (vault), credenciales, builds y
  archivos locales de entorno.
- **No reinventar:** antes de escribir código revisar si ya existen helpers/utilidades/librerías
  del proyecto; no reimplementar lógica existente.
- **Fail gracefully:** toda comunicación con BD o servicios externos (Supabase, APIs, pasarelas,
  etc.) que pueda fallar debe ir envuelta en try/catch. Ante errores no previstos, mostrar mensaje
  amigable y genérico (ej. "No pudimos procesar tu solicitud, intentá de nuevo en unos minutos").
  La UI nunca expone excepciones crudas, stack traces ni detalles técnicos.
- **Verificar al terminar:** correr typecheck, lint y tests del stack antes de dar por terminada
  una tarea.

## Documentación (mantener sincronizada)
- Estar atento: proponer info nueva que deba quedar en los docs y advertir si el código deja
  desactualizado algún doc existente.
- Se puede proponer crear nuevos documentos cuando aporten contexto y eviten repetir código o
  dejar código muerto.

## Flujo de trabajo: plan → revisión → implementación
1. **Modo planificación:** ante un nuevo requerimiento, SIEMPRE crear o actualizar
   `documentacion/planes/<slug-feature>.md` (visible para el vault de Obsidian en la raíz; NO en
   `.opencode/`). NO tocar código fuente. Estructura del plan:
   - Metadatos: versión + estado (`Borrador` / `Revisión` / `Aprobado`).
   - Historial de revisiones al inicio.
   - Sección "Restricciones y Correcciones Previas (No repetir)".
   - Contexto / objetivo.
   - Cambios concretos: rutas exactas, firmas de funciones/actions, contratos de datos,
     render Server vs Client.
   - Criterios de aceptación y verificación.
2. Al terminar el borrador, detenerse y pedir explícitamente:
   *"Por favor somete este plan a revisión."*
3. **Iteración de feedback:** al recibir correcciones, actualizar el plan: subir versión en el
   historial y registrar el error corregido en "Restricciones y Correcciones Previas".
4. **Modo implementación:** pasar a código SOLO cuando el usuario lo apruebe explícitamente.
   Seguir el plan secuencialmente y marcar cada tarea con `[x]`.
5. **Cierre:** verificar que el plan quede marcado como `Aprobado` con su fecha en metadatos
   (sin renombrar ni mover el archivo), actualizar la documentación del proyecto y correr las
   verificaciones del stack.