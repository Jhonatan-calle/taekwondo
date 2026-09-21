# Documentación — Taekwondo ITF

> **Enfoque actual (2026-09):** app móvil **React Native + Expo** + Supabase para la gestión
> integral de una escuela de Taekwondo ITF. El módulo de **torneos** (tablas intactas en la BD) y la
> plataforma **web** (`web/`, Next.js) quedaron **congelados** y fuera de desarrollo.

## Documentos vigentes

| Documento | Contenido |
|---|---|
| `srs-sistemaDeGestionTaekwondo.md` | **SRS principal** (fuente de verdad): jerarquía, privacidad en cascada, gestión de alumnos/grados/locaciones/clases/asistencia/cuotas/dashboard/exámenes. |
| `ReglasyRestricciones-SistemaTaekwondoITF.md` | Reglas de negocio, permisos y restricciones (escuela). |
| `databaseModel.md` | Modelo de datos (ER) + notas del módulo de torneos (congelado). |
| `planes/bd-gestion-escuela.md` | Plan vigente: adaptación de la BD al SRS (aplicado y verificado). |
| `workflow-implementacion-mobile.md` | Guía de pasos secuenciales y workflow de desarrollo de la app móvil. |
| `planes/mobile-inicializacion-proyecto.md` | Plan aprobado: scaffold de `mobile/` (Expo + Expo Router). |
| `README.md` (este archivo) | Índice de documentación. |

## Documentos descartados (`descartado-web/`)

Pertenecen al enfoque anterior (MVP web Mobile-First + Next.js, prioridad torneos), hoy **congelado**.
Se conservan solo como historial/contexto; **no codear contra ellos**.

### Principales
- `descartado-web/mvc-stack.md` — Stack Next.js/Vercel (reemplazado por Expo + Supabase).
- `descartado-web/mvc-workflow.md` — Fases de desarrollo del MVP web (torneos).
- `descartado-web/guia-estetica-web.md` — Design system Tailwind/shadcn (no aplica a React Native).
- `descartado-web/descripcion-general-srs-web.md` — SRS del enfoque web (torneos, inscripción, emparejamiento).

### Planes web/superados (`descartado-web/planes/`)
- Web (módulo torneos): `flujo-inscripcion-web`, `guia-estetica-consistencia-visual`,
  `panel-profesores`, `motor-emparejamiento`, `navegacion-panel`, `panel-organizador`,
  `doble-categoria`, `diagnostico-guardar-llaves`, `fix-redireccion-emparejamiento`, `gestion-en-vivo`.
- BD/auth históricos (superados por `bd-gestion-escuela.md`): `inicializacion-frontend`,
  `inicializacion-backend`, `roles-duales`, `arbol-jerarquias`, `autenticacion-supabase-auth`,
  `restricciones-acceso`.

## Reglas de oro al tocar documentación
1. Actualizar este índice cuando se agregue/mueva/descarte un documento.
2. El SRS (`srs-sistemaDeGestionTaekwondo.md`) es la fuente de verdad funcional; no duplicarlo.
3. Mantener `AGENTS.md` sincronizado con este mapa de documentos.