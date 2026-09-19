# taekwondo

Herramienta de gestión de una escuela de Taekwondo ITF (alumnos, grados, locaciones/alquileres,
clases/asistencia, cuotas, dashboard anonimizado y exámenes de graduación).

## Stack
- **App móvil:** React Native + Expo (Expo Router) — TypeScript.
- **Backend/BD:** Supabase (PostgreSQL, RLS, Auth).
- **Congelados:** módulo de torneos (tablas intactas) y plataforma web (`web/`).

## Estructura
- `supabase/` → migraciones canónicas de BD (`supabase/migrations/`) + `config.toml`.
- `web/` → congelada (Next.js, no se desarrolla).
- `mobile/` → app Expo (aún no creada).
- `documentacion/` → SRS, reglas, modelo de datos, índice de docs y planes.

## Documentación
Empezar por `documentacion/README.md` (índice vigente/descartada) y
`documentacion/srs-sistemaDeGestionTaekwondo.md` (SRS).