# Diagnóstico y fix: error al guardar llaves

- **Versión:** 1.0 · **Estado:** Aprobado (2026-09-17)
- **Historial de revisiones:**
  - 1.0 (2026-09-17): versión inicial aprobada por el usuario.

## Restricciones y Correcciones Previas (No repetir)

- No reimplementar lógica existente: usar helpers/proyecto vigentes.
- Comunicación con BD/APIs siempre en try/catch; la UI nunca expone excepciones
  crudas ni stack traces (mensaje genérico + registro interno).
- Los cambios de BD que no requieren migración se prescinden; la RPC
  `guardar_llaves_manuales` ya valida y está correcta.
- No tocar `.env*`.

## Contexto / objetivo

- Los registros `errores_runtime` ids 45 y 46 (contexto `guardarLlavesManuales`)
  muestran `mensaje_error = '[object Object]'` porque `crearRegistrador` solo
  extrae `.message` cuando el error es `instanceof Error`; los errores de
  `supabase.rpc` (PostgrestError) son objetos planos y perdían su mensaje.
- Diagnóstico: los datos persistidos están limpios (sin repetidos por categoría,
  sin auto-enfrentamientos) y la RPC desplegada es correcta. La sospecha es un
  estado corrupto del editor en la pestaña abierta (sesión previa al fix de
  `moverParticipante`/migración). Aun así, el guardado debe dar mensajes
  específicos y registrables ante cualquier violación de reglas.

## Cambios concretos

1. `web/src/lib/errores.ts`
   - `extraerMensajeError(error)`: mensaje legible para cualquier forma de
     error (Error, Supabase, objeto desconocido; nunca `[object Object]`).
   - `esRuidoError(error, mensaje)`: descarta `Dynamic server usage` y
     `NEXT_REDIRECT`/`NextRedirectError` (no son fallas de usuario).
2. `web/src/lib/llaves/payload.ts`
   - Nueva función pura `validarReglasLlaves(payload): string[]` que detecta:
     participante repetido dentro de una misma categoría y auto-enfrentamiento
     (a === b). Mensajes amigables en español.
   - Exportarla desde `web/src/lib/llaves/index.ts`.
3. `web/src/app/(panel)/panel/organizador/actions.ts`
   - `guardarLlavesManuales`: tras `parsePayload`, si `validarReglasLlaves`
     devuelve alguna, responder con el primer mensaje amigable (sin logear).
     Solo logear fallas reales (RPC/cliente).
4. `web/src/lib/llaves/payload.test.ts` (o extender si existe)
   - Repetido dentro de una categoría → mensaje.
   - Auto-enfrentamiento → mensaje.
   - Payload válido → sin advertencias.
5. Limpieza BD remota `errores_runtime` (aprobada por el usuario):
   - Borrar ruido/resueltos: ids 17, 20–24, 26–44.
   - Mantener 45 y 46 hasta confirmar el fix con un guardado real.
   - Comando: `npx supabase db query --linked "delete from public.errores_runtime where id in (...)"`.
6. Verificación: `npm run lint`, `npx tsc --noEmit`, tests vitest (`npm test`).

## Criterios de aceptación

- Un guardado con repetido por categoría muestra un mensaje específico, no el
  genérico, y queda registrado (si persiste) con el mensaje real.
- `errores_runtime` ya no acumula `[object Object]` ni ruido de pre-render.
- Los errores resueltos quedan borrados; los pendientes se mantienen hasta
  resolverlos.