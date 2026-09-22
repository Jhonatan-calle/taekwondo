# AGENTS.md - Guía para Agentes de IA (Proyecto Taekwondo ITF)

## Propósito y contexto
- Herramienta integral de gestión de una escuela de Taekwondo ITF (alumnos, grados, locaciones/
  alquileres, clases/asistencia, cuotas, dashboard anonimizado y exámenes de graduación).
- MVP actual: **app móvil React Native + Expo (Expo Router) + Supabase**.
- **Congelados (no se desarrollan):** módulo de **torneos** (tablas intactas en la BD) y la
  plataforma **web** (`web/`, Next.js) — no tocar su código ni sus flujos.
- Docs de referencia obligatoria antes de codear:
  - `documentacion/srs-sistemaDeGestionTaekwondo.md` → SRS vigente (fuente de verdad funcional).
  - `documentacion/ReglasyRestricciones-SistemaTaekwondoITF.md` → Reglas de negocio, permisos y
    restricciones (escuela; reglas de torneos congeladas).
  - `documentacion/databaseModel.md` → Modelo de datos (ER) y notas del módulo de torneos.
  - `documentacion/README.md` → Índice de documentación vigente/descartada.
  - `documentacion/plan-de-pruebas.md` → **Catálogo de casos de prueba** (permanente, por módulo,
    con IDs `TC-*`); se extiende con cada implementación.
  - `documentacion/pendientes-pruebas.md` → Pendientes puntuales de verificación (bloqueos, fechas).
  - `documentacion/planes/` → Planes vigentes (hoy `bd-gestion-escuela.md`) y su historial de
    revisiones. Revisar antes de iniciar un nuevo plan para no duplicar ni contradecir.
  - `documentacion/descartado-web/` → ONLY historial del enfoque web; **no codear contra estos docs**.
- Identificación de sesión: respuesta final siempre con `🐧`.

## Stack tecnológico
- App móvil: **React Native + Expo (Expo Router)** — TypeScript.
- Backend/BD: **Supabase** (PostgreSQL, RLS, Auth). Cliente `@supabase/supabase-js`.
- Realtime (Supabase) únicamente si un flujo lo requiere.
- No se usa Next.js, Tailwind CSS ni Vercel (congelados con `web/`).

## Estructura del repo
- `supabase/` → **migraciones canónicas** (`supabase/migrations/`), `config.toml`, `.temp/` (gitignored).
- `web/` → **CONGELADA**. No modificar ni mantener.
- `mobile/` → app Expo (React Native + Expo Router + TypeScript) creada en 2026-09. Scaffold inicial: `src/app` (rutas), `src/lib`, `src/constants`, `src/components`; alias `@/* → ./src/*`; scheme `taekwondo`.
- `documentacion/` → SRS, reglas, modelo de datos, índice, planes vigentes y `descartado-web/`.

## Reglas generales
- **Idioma:** código y comentarios en español.
- **Git:** NO hacer commits ni push automáticos; solo si el usuario lo pide explícitamente.
- **Archivos protegidos (no tocar):** `.env*`, `.obsidian/` (vault), builds y
  archivos locales de entorno.
- **No reinventar:** antes de escribir código revisar si ya existen helpers/utilidades/librerías
  del proyecto (especialmente los RPCs y helpers SQL de `supabase/migrations/`); no reimplementar
  lógica existente.
- **Fail gracefully:** toda comunicación con BD o servicios externos (Supabase, APIs, pasarelas,
  etc.) que pueda fallar debe ir envuelta en try/catch. Ante errores no previstos, mostrar mensaje
  amigable y genérico (ej. "No pudimos procesar tu solicitud, intentá de nuevo en unos minutos").
  La UI nunca expone excepciones crudas, stack traces ni detalles técnicos.
- **No tocar tablas de torneos** (`torneos`, `inscripciones`, `inscripciones_datos_privados`,
  `categorias`, `llaves`, `enfrentamientos`, `jurados_torneo`, `resultados_torneo`).

## Convenciones de BD (Supabase)
- **Grado unificado:** usar el enum `public.grado` (10 Gup + `dan_1…dan_9`). No usar enums legados
  (`grado_gup`/`grado_dan` — eliminados).
- **Jerarquía:** `es_maestro` (solo-sistema) + árbol `maestro_id`; linaje inamovible por el usuario.
- **RLS en cascada:** cada usuario ve su perfil propio + alumnos directos; superiores solo métricas
  anonimizadas, con excepciones de auditoría (alquileres) y planilla de mesa.
- **Patrón de helpers:** funciones `SECURITY DEFINER` (`search_path = public`) para romper recursión
  RLS; RPCs de escritura del sistema con `set_config('app.<contexto>','on',true)` para saltar los
  triggers anti-escalada (`bloquear_auto_cambio_grado`, `bloquear_auto_activacion_maestro`,
  `bloquear_auto_activacion_profesor`, `bloquear_auto_cambio_maestro`).
- **Migraciones:** crear SOLO con `npx supabase migration new <slug>` dentro de `supabase/migrations/`
  (raíz). Nombres en español, orden cronológico por timestamp.
- **Verificación BD:** `supabase db push --linked`, `supabase db lint --linked` y dump/query de
  verificación. No usar `grado_dan_actual` (eliminado).

## Documentación (mantener sincronizada)
- Estar atento: proponer info nueva que deba quedar en los docs y advertir si el código deja
  desactualizado algún doc existente.
- Mantener actualizado `documentacion/README.md` cuando se cree/mueva/descarte documentación.
- **Mantener `documentacion/plan-de-pruebas.md`:** al implementar o modificar una función, **agregar o
  actualizar sus casos de prueba** (ID `TC-<MÓDULO>-<NN>` estable, prioridad Smoke/Regresión, ficha
  con rol, precondición, pasos y resultado esperado). Si la función cambia de comportamiento, el caso
  se actualiza; los IDs no se reutilizan.
- Se puede proponer crear nuevos documentos cuando aporten contexto y eviten repetir código o
  dejar código muerto.

## Flujo de trabajo: plan → revisión → implementación
1. **Modo planificación:** ante un nuevo requerimiento, SIEMPRE crear o actualizar
   `documentacion/planes/<slug-feature>.md` (visible para el vault de Obsidian; NO en `.opencode/`).
   NO tocar código fuente. Estructura del plan:
   - Metadatos: versión + estado (`Borrador` / `Revisión` / `Aprobado`).
   - Historial de revisiones al inicio.
   - Sección "Restricciones y Correcciones Previas (No repetir)".
   - Contexto / objetivo.
   - Cambios concretos: rutas exactas, firmas de funciones/RPCs, contratos de datos, pantallas y
     componentes (Expo/React Native).
   - Criterios de aceptación y verificación.
2. Al terminar el borrador, detenerse y pedir explícitamente:
   *"Por favor somete este plan a revisión."*
3. **Iteración de feedback:** al recibir correcciones, actualizar el plan: subir versión en el
   historial y registrar el error corregido en "Restricciones y Correcciones Previas".
4. **Modo implementación:** pasar a código SOLO cuando el usuario lo apruebe explícitamente.
   Seguir el plan secuencialmente y marcar cada tarea con `[x]`.
5. **Cierre:** verificar que el plan quede marcado como `Aprobado` con su fecha en metadatos
   (sin renombrar ni mover el archivo), actualizar la documentación del proyecto (incluido
   `documentacion/plan-de-pruebas.md`: agregar o extender los casos correspondientes) y correr las
   verificaciones del stack (BD: `supabase db push/lint --linked`; app: lint/typecheck/tests cuando
   exista `mobile/`).
