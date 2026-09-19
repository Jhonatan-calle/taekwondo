# Plan: Gestión en Vivo — Torneos con Supabase Realtime

> **Metadatos**
> - **Versión:** 1.1
> - **Estado:** Aprobado (2026-09-17)

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-17 | Borrador inicial. |
| 1.1 | 2026-09-17 | Feedback usuario: ganador **explícito obligatorio** + validación suave (el autocalculado solo agiliza la UI; un empate numérico se resuelve por fallo de jueces/por superioridad/punto de oro sin bloquear la llave). Aprobado. |

## Restricciones y Correcciones Previas (No repetir)
1. NO tocar `.env*`. NO commits/push automáticos. Migraciones por CLI (`npx supabase migration new gestion_en_vivo`).
2. **RLS-first:** lecturas con `createClient` (RLS filtra). Escrituras de torneo/llaves/resultados SOLO vía RPC `SECURITY DEFINER` con `search_path = public`. Jurados **nunca** escriben directo.
3. `try/catch` → `registrarError` (módulo `en_vivo`) + mensaje genérico. `redirect()` fuera del `try` o `unstable_rethrow` (regla vigente del bugfix de emparejamiento).
4. **Regeneración de ids = prohibido en en-vivo:** los RPCs `generar_llaves`/`guardar_llaves_manuales` reemplazan categorías y crean ids nuevos (documentado). El módulo en vivo NO puede hacer `delete/rebuild`: usa **upserts incrementales** por `(llave_id, orden)` para que los ids persistan y la suscripción realtime por clave primaria siga funcionando.
5. `lib/emparejamiento/` y `lib/llaves/` NO se tocan; sus 53 tests deben seguir pasando. El nuevo `lib/en_vivo/` es puro y determinista (espeja el patrón del motor/editor).
6. Los RPCs existentes `generar_llaves` y `guardar_llaves_manuales` se actualizan **solo para** escribir la nueva columna `enfrentamientos.orden` (contador de bucle), sin cambiar su contrato jsonb.
7. Los eventos realtime son filtrados por RLS: el jurado solo recibe filas que pueda leer. Exige las políticas SELECT nuevas (jurado) ANTES de habilitar la subscription.
8. En consultas embedded la tabla del usuario es `profiles` y la FK del alumno se desambigua con `inscripciones_alumno_id_fkey` (patrón vigente).
9. **Ganador explícito obligatorio + validación suave:** el autocalculado (sumas de asaltos / totales tul) solo agiliza la carga. El ganador siempre es un campo explícito que el humano puede sobrescribir. Nunca bloquear un enfrentamiento por empate numérico (la competencia ITF lo resuelve con fallo de jueces / superioridad / punto de oro).

## Decisiones cerradas (feedback de usuario)
- **D-1 — Jurados:** el organizador asigna jurados al torneo por búsqueda de perfil; cada jurado ingresa con su cuenta y usa una consola móvil propia para cargar resultados. También el organizador puede cargar.
- **D-2 — Detalle de resultados ITF:** Combate guarda asaltos con puntos y penalidades por lado + resolución. Formas guarda puntaje por jurado (contenido técnico + presentación por competidor) sumado.
- **D-3 — 3er puesto:** compartido (semifinalistas perdedores), sin combate extra.
- **D-4 — Rondas:** pares consecutivos (ganador de slot `n` vs ganador de `n+1`); un bye auto-avanza sin pelear.

## Contexto / objetivo
Interfaz del día del torneo (SRS B.3): jurados cargan resultados de Combate y Formas en tiempo real vía canales WebSocket de Supabase; las llaves avanzan automatizadamente ronda a ronda (pares consecutivos + byes); al finalizar se persiste el historial competitivo por participante (modalidad, posición, rondas alcanzadas, ganadas/perdidas). Hoy no existe gestión de jurados (tabla `jurados_torneo` sin RLS ni UI), ni transición real a `en_vivo`, ni avance de rondas, ni historial.

## Cambios concretos

### A. Base de datos — `web/supabase/migrations/<ts>_gestion_en_vivo.sql`
1. **`enfrentamientos`: agregar `orden int not null default 0`** + backfill por `row_number()` sobre llave y `unique (llave_id, orden)` (evita slots duplicados con concurrencia). Varios enfrentamientos por ronda = posiciones 0..n-1.
2. **`llaves`: agregar `modalidad text not null default 'combate'`** con `check ('combate','tul')`. Cadenas de ronda = `(categoria_id, modalidad, orden)`. Los combates quedan en la cadena `combate` (orden 0 = actuales); las Formas serán una cadena independiente `modalidad='tul'`.
3. **Tabla `resultados_torneo`** (historial): `torneo_id`, `categoria_id`, `inscripcion_id`, `modalidad`, `posicion` (1-3, 3 = compartido), `rondas_alcanzadas`, `ganadas`, `perdidas`, `detalle jsonb`, `creado_en`, `unique(torneo_id, inscripcion_id, categoria_id, modalidad)`.
4. **RLS jurados (SELECT)** sobre `categorias`/`llaves`/`enfrentamientos`/`inscripciones` (solo `estado='confirmado'`, nunca pendientes ni `inscripciones_datos_privados`) usando `auth.uid() in (select jurado_id from jurados_torneo where torneo_id = ...)`. Políticas en `jurados_torneo`: SELECT para organizador y los propios jurados; INSERT/DELETE solo organizador. `resultados_torneo`: SELECT organizador + SELECT del alumno (su propia inscripción, orientado a historial futuro).
5. **RPCs nuevos (SECURITY DEFINER, `search_path = public`):**
   - `sincronizar_resultado_en_vivo(p_torneo_id uuid, p_enfrentamiento uuid, p_ganador uuid, p_resultados jsonb, p_rondas jsonb)`: valida `torneos.estado='en_vivo'` + `auth.uid()` ∈ {organizador} ∪ {jurados_torneo}; valida el enfrentamiento (pertenece al torneo, `pendiente`/`en_curso`) y que `p_ganador ∈ (a,b)` (walkover/retiro → presente); `update` finaliza la fila (`ganador_id`, `resultados`, `estado='finalizado'`); luego **upsert incremental** de cada llave de `p_rondas` por `(categoria_id, modalidad, orden)` y cada enfrentamiento por `(llave_id, orden)` con `on conflict do update set a=coalesce(existente, excluido), b=coalesce(...)` (`''`→null). Idempotente y tolerante a concurrencia; los ids de filas existentes se conservan (clave para Realtime).
   - `marcar_en_curso(p_enfrentamiento uuid)`: mismas validaciones; `estado='en_curso'`.
   - `crear_llave_tul(p_torneo_id uuid, p_categoria_id uuid, p_participantes uuid[])`: organizador + estado `armado_llaves`; crea `llaves (modalidad='tul', nombre_ronda='Formas', orden=0)` y sus enfrentamientos `tipo='tul'` en pares consecutivos (impar → bye), con defensa de confirmados/no repetidos.
   - `finalizar_torneo(p_torneo_id uuid, p_historial jsonb)`: organizador + estado `en_vivo`; borra `resultados_torneo` previos (idempotente), inserta el historial calculado por TS y pasa el torneo a `finalizado`.
   - Transición `armado_llaves → en_vivo` sin RPC: la política existente `torneos_update_organizador` lo cubre; la Server Action valida el estado.
6. **Actualizar `generar_llaves` y `guardar_llaves_manuales`:** escribir `orden` (contador del bucle) en los enfrentamientos. Sin otros cambios.
7. **Realtime publication:** `alter publication supabase_realtime add table public.enfrentamientos, public.llaves, public.torneos;`

### B. Módulo puro — `web/src/lib/en_vivo/` (Vitest)
- **`tipos.ts`:** `EnfVivo{id, orden, a, b, ganadorId|null, tipo, estado, resultados}`, `LlaveVivo{id, categoriaId, nombreRonda, orden, modalidad, enfrentamientos[]}`, `CategoriaVivo` (con `llaves[]`), `ResultadoCombate{modalidad:'combate', asaltos[{numero,puntos_a,puntos_b,penalidades_a,penalidades_b}], resolucion, observaciones?}`, `ResultadoTul{modalidad:'tul', puntajes[{jurado_nombre, contenido_tecnico_a, presentacion_a, contenido_tecnico_b, presentacion_b}]}`, `CambioRonda`, `RestoTorneo`.
- **`validacion.ts`:** `validarResultado(modalidad, resultado, a, b)` → errores (asaltos 1-3, números ≥0, ganador ∈ {a,b}; tul ≥1 puntaje). Validación **suelve**: no bloquea empates numéricos; el ganador explícito es obligatorio.
- **`avance.ts`:** `prepararAvance(categorias)` → `CambioRonda[]` determinístico e idempotente: slot `i` de la ronda alimenta al slot `floor(i/2)` de la ronda siguiente (lado `a` si `i` par, `b` si impar); un enfrentamiento con un solo lado y finalizado aporta su participante (bye auto-avanza); solo emite slots de la ronda `orden+1` con al menos un lado conocido. `marcarResultado(...)` aplica en memoria. `armarLlaveFormas(participantes[])` → pares consecutivos con bye.
- **`historial.ts`:** `construirHistorial(torneoId, categorias)` → podio por (categoría, modalidad): campeón de la final `1º`, finalista `2º`, perdedores de la ronda con 2 enfrentamientos que alimentan la final `3º` (compartido); categorías de 2 solo `1º/2º`; stats por participante (rondas_alcanzadas, ganadas, perdidas); todos los que pelearon tienen fila (posición null si no llegaron al podio).
- **`reducer.ts`:** `aplicarEventoEnVivo(state, evento)` para reconciliar eventos realtime (INSERT/UPDATE de `llaves` y `enfrentamientos`) en el estado local.
- **Tests:** avance pares/bye/impar/idempotencia; validación combate/tul; podio 4 y 2 jugadores + stats; reducer eventos; `armarLlaveFormas`. Los 53 tests existentes siguen pasando.

### C. Server — `web/src/lib/en-vivo/datos.ts` (nuevo)
`listarTorneoEnVivo(supabase, torneoId, userId)` → `{ torneo, rol: 'organizador'|'jurado'|null, categorias: CategoriaVivo[], confirmados: Map<id,{nombre,grado}> }`: detecta rol (organizador o miembro de `jurados_torneo`), lee categorías con `llaves(enfrentamientos)` (incluye `orden, ganador_id, tipo, estado, resultados`) ordenadas y los confirmados para resolver nombres (RLS: jurado ya puede leer confirmados).

### D. Server Actions (nuevas)
- `web/src/app/en-vivo/actions.ts` (consola jurado/organizador, `requireUser`):
  - `registrarResultado(_prev, formData)` con `torneo_id`, `enfrentamiento_id`, `ganador`, `resultados` (JSON): valida rol, estados, `validarResultado`, carga bracket, `prepararAvance`, llama a `sincronizar_resultado_en_vivo`. Devuelve `{ ok? | error? }` vía `useActionState` (sin `redirect`; el estado se refresca por Realtime).
  - `marcarEnCurso(enfrentamiento_id)`.
- `web/src/app/(panel)/panel/en-vivo/actions.ts` (organizador, `requireProfesor` + dueño):
  - `iniciarTorneoEnVivo(torneo_id)` (armado_llaves → en_vivo), `finalizarTorneo(torneo_id)` (calcula `construirHistorial` y llama a RPC `finalizar_torneo`).
  - `asignarJurado(torneo_id, profile_id)` / `quitarJurado(torneo_id, jurado_id)`.
  - `buscarPerfiles(query)` → perfiles `nombre_completo` ILIKE (autocomplete del select).
  - `crearLlaveFormas(torneo_id, categoria_id)`.

### E. UI (Mobile-First, page-shell `max-w-3xl p-6`, tokens de la guía estética)
- **`web/src/app/en-vivo/[torneoId]/page.tsx`** (Server, `requireUser`): consola del jurado. Header minimalista (nombre del torneo, Badge estado) + `<VistaEnVivo rol="jurado" />`. Si no es jurado ni organizador → card "No autorizado".
- **`web/src/app/(panel)/panel/en-vivo/[torneoId]/page.tsx`** (Server, `requireProfesor` + dueño): control del organizador en vivo. `<VistaEnVivo rol="organizador" />` + card de controles (Iniciar torneo, Finalizar torneo, link para compartir con jurados `/en-vivo/<id>`) + `GestionJurados` (autocomplete/select + lista con quitar) + botones "Armar llave de Formas" por categoría + tabla "Resultados finales" (solo `finalizado`).
- **`cargar-resultado-form.tsx`** (Client): por enfrentamiento `pendiente`/`en_curso` abre el form canónico (`Card` + `FormField` + `SubmitButton`, error `bg-destructive/10`):
  - **Combate:** filas de asaltos (inputs de puntos y penalidades por lado; agregar hasta 3), `Select` resolución (puntos / descalificación / retiro / walkover), ganador autocalculado por suma con posibilidad de sobrescribir (fallo de jueces / superioridad / punto de oro).
  - **Formas:** filas dinámicas de puntaje por jurado (contenido técnico + presentación por competidor A y B), totales y ganador autocalculados (sobrescribible).
  - `useActionState` → `registrarResultado`; el éxito se refleja por Realtime (snapshot del volante).
- **`vista-en-vivo.tsx`** (Client, orquestador) + `enfrentamiento-card.tsx` / `bracket-categoria.tsx` / `chip-participante.tsx` (reuso visual del editor): muestra categorías → rondas (llaves) por modalidad → enfrentamientos con estado (pendiente/en curso/finalizado/ganador) y, según rol y estado del enfrentamiento, el botón "Cargar resultado".
- **Hook `web/src/lib/en-vivo/use-en-vivo.ts`** (Client): estado inicial = snapshot del server; suscribe `supabase.channel('en-vivo-<torneo>')` con `postgres_changes` por llave (filter `llave_id=eq.<id>`) + un canal por llave recién insertada (filter `categoria_id=eq.<id>` en `llaves`) + `torneos` (filter `id=eq.<id>`) para cambios de estado; cada evento pasa por `aplicarEventoEnVivo`. Cleanup con `removeChannel`.
- **Navegación/organizador:** en `panel/organizador/[torneoId]`, CTA "Ver en vivo" cuando estado ≥ `armado_llaves`; en `/panel/torneos`, vínculo rápido a `/panel/en-vivo/<id>` para torneos `armado_llaves`.

### F. Documentación (sincronizar)
- `documentacion/databaseModel.md`: columnas `orden`/`modalidad`, tabla `resultados_torneo`, RLS jurados, RPCs, publication realtime, nota incremental (ids se conservan en en-vivo).
- `documentacion/guia-estetica.md`: patrón "bracket en vivo" y formularios de resultado (asaltos/penales y puntajes tul).
- `documentacion/ReglasyRestricciones-*.md`: rol jurado asignado por el organizador.
- `documentacion/mvc/workflow.md`: ítem "Gestión en Vivo" → `[x]` al cierre.
- Plan: historial + `Aprobado` al cerrar.

## Criterios de aceptación
- [ ] Jurado asignado (cuenta propia) ve su torneo, carga combate detallado (asaltos/puntos/penales) y formas (puntajes por jurado); el organizador ve el cambio en vivo sin recargar.
- [ ] Avance automático de rondas por pares consecutivos; byes auto-avanzan; ids de enfrentamientos/llaves se conservan entre resultados.
- [ ] Torneo solo editable en el flujo correcto (armado_llaves → en_vivo → finalizado); `finalizar_torneo` es idempotente y persiste podio (3º compartido) + stats por participante/modalidad.
- [ ] Un pendiente jamás llega al organizador/jurado (RLS); otro usuario/rol no ve ni modifica el torneo ajeno.
- [ ] Ganador explícito obligatorio: un empate numérico jamás bloquea la carga de la llave.
- [ ] Fail gracefully: errores a `registrarError` (módulo `en_vivo`); la UI nunca expone detalles técnicos.
- [ ] `npm run lint` + `npm run build` + `npm run test` OK (nuevos tests del módulo incluidos).

## Verificación manual
(1) Torneo con 4-8 confirmados → armar llaves → iniciar en vivo. (2) Asignar jurado por búsqueda de perfil → entrar en otra pestaña a `/en-vivo/<id>` con esa cuenta. (3) Cargar un combate completo (asaltos + penalidades) y una forma (2-3 jurados de puntaje) → ver la llave actualizada en vivo en el panel del organizador. (4) Avanzar rondas hasta la final → finalizar → verificar podio (3º compartido) y `resultados_torneo`. (5) Otro perfil sin rol → "No autorizado". (6) Regresar a `guardar_llaves_manuales` → sin regresiones.