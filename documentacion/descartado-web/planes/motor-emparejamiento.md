# Plan: Motor de Emparejamiento (Fase 3, ítem 3)

> **Metadatos**
> - **Versión:** 1.1
> - **Estado:** Aprobado
> - **Fecha de aprobación:** 2026-09-16

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-16 | Borrador inicial. Decisiones cerradas: infantil = hasta 13 años; alcance = motor + trigger mínimo. **Pregunta abierta:** infraestructura de testing. |
| 1.1 | 2026-09-16 | **Revisión del usuario:** (1) resuelta la pregunta abierta → **Vitest** (Opción A) como infraestructura de testing; (2) en `llaves_select_organizador` y `enfrentamientos_select_organizador` calificar explícitamente las columnas de la tabla principal (`c.id = llaves.categoria_id`, `l.id = enfrentamientos.llave_id`) para evitar ambigüedad en PostgreSQL. Aprobado. |

## Restricciones y Correcciones Previas (No repetir)
1. NO tocar `.env*`. NO commits/push automáticos. Migraciones por CLI (`npx supabase migration new motor_emparejamiento`).
2. `try/catch` → `registrarError` (módulo `emparejamiento`) + mensaje genérico ("No pudimos armar las llaves, intentá de nuevo en unos minutos."). La UI jamás expone stack traces ni detalles técnicos. El registro de errores jamás rompe el flujo.
3. **RLS-first:** lecturas con `createClient` (sesión del organizador, apoyándose en RLS). Escritura de llaves **solo** vía RPC `generar_llaves` (SECURITY DEFINER con validación de organizador adentro y `search_path = public`) para atomicidad transaccional. Nunca `supabaseAdmin` para datos operativos.
4. Solo se regeneran llaves en estados `inscripciones` o `armado_llaves`. En `en_vivo`/`finalizado` → mensaje amigable de bloqueo.
5. Contrato `datos_antropometricos` = `{ grado, fecha_nacimiento, peso_kg, altura_cm }`. Agresividad default 3 si no está cargada. Participantes con datos incompletos se excluyen del emparejamiento y se reportan en el resumen (nunca falla el proceso).
6. Regla infantil (≤ 13 años inclusive): pares con |Δpeso| > 5 kg **bloqueados**. No existe "aproximación"; el par se descarta.
7. El motor es **puro y determinista** (sin efectos; desempate final por `inscripcion_id`). Nada de UI ni DB dentro de las funciones del algoritmo.
8. Al regenerar se reemplazan todas las categorías previas del torneo (delete + reinsert en la misma transacción del RPC). Never duplicar llaves.
9. En las consultas embedded Supabase la tabla es `profiles` y la propiedad `fila.profiles` (nunca `perfiles`). Verificado al tocar `page.tsx`.
10. En políticas RLS con JOIN sobre varias tablas, calificar SIEMPRE las columnas con el alias de la tabla (`c.id = llaves.categoria_id`, `l.id = enfrentamientos.llave_id`); omitirlo produce error de ambigüedad en PostgreSQL.

## Decisiones cerradas (feedback de usuario)
- **D-1:** Categoría infantil = bandas de edad con `max ≤ 13` (hasta 7 · 8-9 · 10-11 · 12-13) → aplican la regla bloqueante de ≤ 5 kg de diferencia de peso.
- **D-2:** Alcance del ítem = motor puro + persistencia atómica (RPC) + **trigger mínimo** en `/panel` (botón "Generar llaves" + conteos). El Panel del Organizador completo (modificación manual) es el ítem siguiente.
- **D-3:** Infraestructura de testing = **Vitest** (devDependency + script `test`). Estándar para Next.js: resuelve el alias `@/` y la ejecución de TS sin fricción, de cara a la Fase 4 QA. El motor vive en funciones puras `lib/emparejamiento/` testables en isolation.

## Contexto / objetivo
Tercer ítem de Fase 3. Algoritmo basado en reglas que, tomando **exclusivamente inscripciones `confirmado`** de un torneo, agrupa por **cinturón × edad** (filtro primario) y empareja por **mínima diferencia de peso** con desempate por **agresividad y altura** (filtro secundario), aplicando la **regla bloqueante de ≤ 5 kg para infantiles** (≤ 13 años). Persiste el resultado en `categorias` → `llaves` → `enfrentamientos` y pasa el torneo a `armado_llaves`.

## Criterios de categorización (reglas del sistema, SRS §B.2)
**Rangos de cinturón:**
- `blanco`, `blanco_punta_amarilla` → "Blanco a punta amarilla" (`rango_min='blanco'`)
- `amarillo`, `amarillo_punta_verde`, `verde`, `verde_punta_azul` → "Amarillo a punta azul" (`rango_min='amarillo'`)
- `azul`, `azul_punta_roja`, `rojo`, `rojo_punta_negra` → "Azul a punta negra" (`rango_min='azul'`)
- `dan_1..dan_3` → "1er Dan a 3er Dan" (`rango_max_especial='dan_3'`)
- `dan_4..dan_6` → "4to Dan en adelante" (`rango_max_especial='dan_6'`)

**Bandas de edad (años):** hasta 7 · 8-9 · 10-11 · 12-13 · 14-16 · 17-20 · 21-34 · 35-50 · 50+ (= 51+).

Cada participante cae en exactamente **una** categoría = (rango cinturón ∩ banda edad).

## Lógica del emparejador
- 1. Ordenar por peso ascendente (desempate: agresividad, altura, `inscripcion_id`).
- 2. Greedy global: repetir hasta agotar o no quedar pares válidos → elegir el par pendiente de **menor costo lexicográfico** `(Δpeso, Δagresividad, Δaltura, inscripcion_id)` (implementa "mínima diferencia de peso; a igualdad, agresividad y altura parecidas").
- 3. En categoría infantil descartar de antemano todo par con `|Δpeso| > 5` (regla bloqueante).
- 4. Los no emparejados (impar o sin rival válido) quedan como **bye** (`participante_b = null`) y se reportan en el resumen.

## Cambios concretos

### 1. Motor puro — `web/src/lib/emparejamiento/`
- **`tipos.ts`:** `Participante`, `Par`, `CategoriaArmada`, `PayloadCategoria`, `ResultadoArmado`, `ResumenEmparejamiento`.
- **`reglas.ts`:** `RANGOS_CINTURON`, `BANDAS_EDAD`, `EDAD_MAX_INFANTIL = 13`, helpers `esInfantil`, `determinarRango`, `determinarBanda`, `calcularEdad`. Autocontenido (mapeo propio de las 16 etiquetas; no depende de UI).
- **`agrupador.ts`:** `agruparPorCategoria(participantes)` → categorías con `nombre = "<Rango> · <Edad>"` + lista `sinCategoria`.
- **`emparejador.ts`:** `emparejar(participantes, limiteKgInfantil)` → `Par[]` (greedy descrito).
- **`index.ts`:** `armarLlaves(participantes)` → `ResultadoArmado` = agrupar + emparejar + `payload` jsonb para el RPC + `ResumenEmparejamiento`.

Contrato del payload jsonb (idem campos de `categorias`/`enfrentamientos`):
```json
{
  "categorias": [{
    "nombre": "Blanco a punta amarilla · 8-9 años",
    "rango_min": "blanco" | null,
    "rango_max_especial": null | "dan_3" | "dan_6",
    "edad_min": 8, "edad_max": 9,
    "enfrentamientos": [{ "a": "<inscripcion_id>", "b": "<inscripcion_id>" | null }]
  }]
}
```

### 2. Migración SQL — `web/supabase/migrations/<ts>_motor_emparejamiento.sql`
- Políticas RLS:
```sql
create policy "categorias_select_organizador"
  on public.categorias for select to authenticated
  using (auth.uid() in (select organizador_id from public.torneos where id = torneo_id));

create policy "llaves_select_organizador"
  on public.llaves for select to authenticated
  using (auth.uid() in (
    select t.organizador_id
    from public.torneos t
    join public.categorias c on c.torneo_id = t.id
    where c.id = llaves.categoria_id
  ));

create policy "enfrentamientos_select_organizador"
  on public.enfrentamientos for select to authenticated
  using (auth.uid() in (
    select t.organizador_id
    from public.torneos t
    join public.categorias c on c.torneo_id = t.id
    join public.llaves l on l.categoria_id = c.id
    where l.id = enfrentamientos.llave_id
  ));

create policy "torneos_update_organizador"
  on public.torneos for update to authenticated
  using (auth.uid() = organizador_id) with check (auth.uid() = organizador_id);
```
- RPC `public.generar_llaves(p_torneo_id uuid, p_categorias jsonb)` SECURITY DEFINER `set search_path = public`: valida que `auth.uid()` sea `organizador_id` del torneo (si no → `raise exception`); `delete from public.categorias where torneo_id = p_torneo_id` (cascade a llaves/enfrentamientos); insert de categorías (`rango_min` cast `::public.grado_gup`, `rango_max_especial` para rangos dan, `edad_min/edad_max`); una `llaves` "Primera ronda" (orden 0) por categoría; un `enfrentamientos` por par (`tipo='combate'`, `estado='pendiente'`, `resultados='{}'`, `participante_b` nullable para bye); cierre con `update torneos set estado='armado_llaves'`. Todo atómico (función plpgsql en una transacción).

### 3. Server Action — `web/src/app/(panel)/panel/actions.ts`
`generarEmparejamiento(estadoPrevio, formData)` con campo `torneo_id`:
1. Validar uuid; `requireUser()`; cargar torneo `.eq('id', id).eq('organizador_id', user.id)` (ausente → "El torneo no existe o no tenés permisos para modificarlo.").
2. Estado ∉ {`inscripciones`,`armado_llaves`} → "El torneo ya está en curso o finalizado; no se pueden regenerar las llaves."
3. Leer confirmados:
```ts
.from('inscripciones')
.select(`id, datos_antropometricos, inscripciones_datos_privados(nivel_agresividad)`)
.eq('torneo_id', torneoId).eq('estado', 'confirmado')
```
4. Cero confirmados → "Todavía no hay inscripciones confirmadas para armar las llaves."
5. Construir `Participante[]` (excluir y contar `sinDatos`), `armarLlaves()` → payload vacío → mensaje de capa de usuario.
6. `supabase.rpc('generar_llaves', { p_torneo_id, p_categorias: payload.categorias })`.
7. `redirect('/panel')` (el resumen se muestra desde la BD en la card "Tus torneos").
Patrón: `try/catch` → `registrarError` + mensaje genérico.

### 4. Trigger mínimo — `/panel`
- **`web/src/app/(panel)/panel/generar-llaves-form.tsx`** (Client): patrón canónico `useActionState` + `SubmitButton`, hidden `torneo_id`, botón "Generar llaves"; muestra `error`.
- **`web/src/app/(panel)/panel/page.tsx`:** en "Tus torneos", para estados `inscripciones`/`armado_llaves` renderizar `<GenerarLlavesForm>`; para `armado_llaves`, query de `categorias` + `llaves(enfrentamientos(id, participante_a, participante_b))` por torneo e imprimir por categoría "N enfrentamientos · M libres".

### 5. Tests (Vitest)
- **`web/vitest.config.ts`:** alias `@` → `src`, environment `node`.
- **`web/src/lib/emparejamiento/*.test.ts`:** mapeo rango/banda; par adyacente por peso; tie-break agresividad/altura en igualdad de peso; **bloqueo infantil > 5 kg**; bye con impar; bye sin rival válido en infantil; determinismo; payload del resultado.
- **`package.json`:** devDependency `vitest` + script `"test": "vitest run"`.

### 6. Documentación (sincronizar)
- `documentacion/databaseModel.md`: uso de `categorias.rango_min/rango_max_especial/edad_*`; `llaves` primera ronda + orden; bye (`enfrentamientos.participante_b` nullable); RPC `generar_llaves`; políticas RLS nuevas.
- `documentacion/mvc/workflow.md`: ítem "Motor de Emparejamiento" → `[x]` al cierre.
- Plan: historial + `Aprobado` al cerrar.

## Criterios de aceptación
- [x] Motor puro, determinista y unit-testado (Vitest).
- [x] Solo `confirmado` entra al armado; pendientes/rechazados invisibles (RLS).
- [x] Categorías estrictas cinturón × edad según SRS; emparejamiento pesada → agresividad → altura.
- [x] Regla infantil (≤13 años): ningún par con |Δpeso| > 5 kg.
- [x] `generar_llaves` atómico; regenerar reemplaza llaves previas; torneo pasa a `armado_llaves`.
- [x] Byes y participantes sin datos/categoría reportados en el resumen; UI solo mensajes amigables.
- [x] `npm run lint` + `npm run build` + `npm run test` OK.
- [x] RLS: organizador lee sus `categorias/llaves/enfrentamientos`; otros usuarios no.

## Verificación manual (resumen)
Crear torneo → inscribir ≥2 y confirmar → "Generar llaves" → verificar filas en las tres tablas + estado `armado_llaves`; regenerar con más inscriptos → reemplazo sin duplicados; torneo `en_vivo` → bloqueo; otro usuario sin acceso (SELECT vacío); infantil con pares >5kg → libres, sin enfrentamiento inválido.

## Notas de cierre (implementación)
- **Migración `20260917022404_motor_emparejamiento`** aplicada en remoto (`supabase db push`); `migration list` muestra local/remoto sincronizados.
- **Archivos:** `lib/emparejamiento/{tipos,reglas,agrupador,emparejador,index}.ts` (+ 4 archivos `*.test.ts`) · `panel/actions.ts` (`generarEmparejamiento`) · `panel/generar-llaves-form.tsx` · `panel/page.tsx` (searchParams banner + `listarResumenLlaves`) · `vitest.config.ts` · `package.json` (script `test`, devDependencies `vitest@^3`).
- **Verificación:** `npm run test` 23/23 OK · `npm run lint` sin warnings · `npm run build` OK.
- **Nota de contrato:** `emparejar()` devuelve los pares resueltos **incluyendo los byes** (`participanteB = null`); el orquestador y el payload jsonb lo asumen.
- **Pendiente de verificación manual (UI):** end-to-end en el navegador con sesión de profesor (crear torneo → inscribir/confirmar → generar llaves → revisar resumen y tablas).