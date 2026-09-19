'use client'

import { useActionState, useEffect, useState } from 'react'

import { registrarResultado, type ResultadoCargarResultado } from '@/app/en-vivo/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'
import type {
  AsaltoCombate,
  EnfVivo,
  FilaPuntajeTul,
  ResolucionCombate,
} from '@/lib/en_vivo'
import { sugerirGanador, totalesCombate, totalesTul } from '@/lib/en_vivo'

type Props = {
  torneoId: string
  enfrentamiento: EnfVivo
  porNombre: (id: string | null) => string
  onClose: () => void
}

const RESOLUCIONES: { valor: ResolucionCombate; etiqueta: string }[] = [
  { valor: 'puntos', etiqueta: 'Por puntos' },
  { valor: 'descalificacion', etiqueta: 'Descalificación' },
  { valor: 'retiro', etiqueta: 'Retiro' },
  { valor: 'walkover', etiqueta: 'Walkover (sin presentarse)' },
]

const NUM_ASALTO_MIN = 1
const NUM_ASALTO_MAX = 3

type Lado = 'a' | 'b'

// Formulario canónico de resultado ITF (guía estética). Combate: asaltos con
// puntos y penalidades por lado + resolución. Formas: puntajes por jurado
// (contenido técnico + presentación). El ganador es explícito y obligatorio
// (el autocalculado solo sugiere; un empate se resuelve por fallo de jueces /
// superioridad / punto de oro — jamás bloquea la carga desde la UI).
export function CargarResultadoForm({ torneoId, enfrentamiento, porNombre, onClose }: Props) {
  const esTul = enfrentamiento.tipo === 'tul'

  const [asaltos, setAsaltos] = useState<AsaltoCombate[]>([
    { numero: 1, puntos_a: 0, puntos_b: 0, penalidades_a: 0, penalidades_b: 0 },
  ])
  const [resolucion, setResolucion] = useState<ResolucionCombate>('puntos')
  const [filas, setFilas] = useState<FilaPuntajeTul[]>([
    { jurado_nombre: '', contenido_tecnico_a: 0, presentacion_a: 0, contenido_tecnico_b: 0, presentacion_b: 0 },
  ])
  const [ladoGanador, setLadoGanador] = useState<'' | Lado>('')
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  const [state, action] = useActionState<ResultadoCargarResultado, FormData>(registrarResultado, undefined)

  // Sugerencia por totales (validación suave): inicializa la selección y se
  // muestra como referencia; el jurado puede sobrescribirla.
  useEffect(() => {
    if (esTul) {
      const sugerido = sugerirGanador('tul', { modalidad: 'tul', puntajes: filas })
      setLadoGanador((prev) => prev || sugerido)
    } else {
      const sugerido = sugerirGanador('combate', { modalidad: 'combate', asaltos, resolucion })
      setLadoGanador((prev) => prev || sugerido)
    }
    // Solo al abrir: al cambiar totales no se pisan decisiones del jurado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (state?.ok) {
      const timer = setTimeout(onClose, 900)
      return () => clearTimeout(timer)
    }
  }, [state, onClose])

  const valoresValidos = esTul
    ? totalesTul({ modalidad: 'tul', puntajes: filas })
    : totalesCombate({ modalidad: 'combate', asaltos, resolucion })
  const sugerido = esTul
    ? sugerirGanador('tul', { modalidad: 'tul', puntajes: filas })
    : sugerirGanador('combate', { modalidad: 'combate', asaltos, resolucion })

  const ganadorId = ladoGanador === 'a' ? (enfrentamiento.a ?? '') : ladoGanador === 'b' ? (enfrentamiento.b ?? '') : ''
  const resultados = esTul
    ? JSON.stringify({ modalidad: 'tul', puntajes: filas })
    : JSON.stringify({ modalidad: 'combate', asaltos, resolucion })

  function validarAntesDeEnviar(): boolean {
    if (!ladoGanador) {
      setErrorLocal('Elegí al ganador del enfrentamiento (o definilo por fallo de jueces / superioridad / punto de oro).')
      return false
    }
    if (!esTul && asaltos.some((a) => a.puntos_a < 0 || a.puntos_b < 0 || a.penalidades_a < 0 || a.penalidades_b < 0)) {
      setErrorLocal('Los puntos y penalidades deben ser valores no negativos.')
      return false
    }
    if (
      esTul &&
      filas.some((f) => f.contenido_tecnico_a < 0 || f.presentacion_a < 0 || f.contenido_tecnico_b < 0 || f.presentacion_b < 0)
    ) {
      setErrorLocal('Los puntajes deben ser valores no negativos.')
      return false
    }
    setErrorLocal(null)
    return true
  }

  function moverAsalto(indice: number, clave: keyof AsaltoCombate, valor: string) {
    setAsaltos((prev) =>
      prev.map((a, i) => {
        if (i !== indice) return a
        const numero = Number(valor)
        if (!Number.isFinite(numero)) return a
        return { ...a, [clave]: Math.max(0, numero) }
      }),
    )
  }

  function moverFila(indice: number, clave: keyof FilaPuntajeTul, valor: string) {
    setFilas((prev) =>
      prev.map((f, i) => {
        if (i !== indice) return f
        if (clave === 'jurado_nombre') return { ...f, jurado_nombre: valor }
        const numero = Number(valor)
        if (!Number.isFinite(numero)) return f
        return { ...f, [clave]: Math.max(0, numero) }
      }),
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-2xl bg-background p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-lg font-semibold">
              Cargar resultado · {esTul ? 'Formas' : 'Combate'}
            </p>
            <p className="text-sm text-muted-foreground">
              {porNombre(enfrentamiento.a)} vs {porNombre(enfrentamiento.b)}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>

        <form action={action} className="flex flex-col gap-4" onSubmit={() => validarAntesDeEnviar()}>
          <input type="hidden" name="torneo_id" value={torneoId} />
          <input type="hidden" name="enfrentamiento_id" value={enfrentamiento.id} />
          <input type="hidden" name="ganador" value={ganadorId} />
          <input type="hidden" name="resultados" value={resultados} />

          {!esTul ? (
            <SeccionCombate
              asaltos={asaltos}
              resolucion={resolucion}
              totales={valoresValidos}
              setAsaltos={setAsaltos}
              setResolucion={setResolucion}
              moverAsalto={moverAsalto}
            />
          ) : (
            <SeccionTul filas={filas} totales={valoresValidos} setFilas={setFilas} moverFila={moverFila} />
          )}

          <FormField label="Ganador (obligatorio)" htmlFor="lado_ganador">
            <Select
              id="lado_ganador"
              value={ladoGanador}
              onChange={(e) => {
                setLadoGanador(e.target.value as '' | Lado)
                setErrorLocal(null)
              }}
            >
              <option value="">Elegí ganador…</option>
              <option value="a">
                A · {porNombre(enfrentamiento.a)} {sugerido === 'a' ? '· sugerido' : ''}
              </option>
              <option value="b">
                B · {porNombre(enfrentamiento.b)} {sugerido === 'b' ? '· sugerido' : ''}
              </option>
            </Select>
          </FormField>

          <div className="flex items-center justify-between gap-2 text-sm">
            <p className="text-muted-foreground">
              Totales: A {valoresValidos.a} — B {valoresValidos.b}
              {sugerido
                ? ` · Sugerido: ${sugerido === 'a' ? 'A' : 'B'}`
                : ' · No hay sugerencia (definí el ganador)'}
            </p>
          </div>

          {(state?.error || errorLocal) && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorLocal ?? state?.error}
            </div>
          )}
          {state?.ok && (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Resultado cargado. La llave se actualizó en vivo.
            </div>
          )}

          <SubmitButton texto="Guardar resultado" textoCargando="Guardando…" />
        </form>
      </div>
    </div>
  )
}

function SeccionCombate({
  asaltos,
  resolucion,
  totales,
  setAsaltos,
  setResolucion,
  moverAsalto,
}: {
  asaltos: AsaltoCombate[]
  resolucion: ResolucionCombate
  totales: { a: number; b: number }
  setAsaltos: React.Dispatch<React.SetStateAction<AsaltoCombate[]>>
  setResolucion: React.Dispatch<React.SetStateAction<ResolucionCombate>>
  moverAsalto: (indice: number, clave: keyof AsaltoCombate, valor: string) => void
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        {asaltos.map((asalto, i) => (
          <div key={asalto.numero} className="flex flex-col gap-2 rounded-xl border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Asalto {asalto.numero}</span>
              {asaltos.length > NUM_ASALTO_MIN && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setAsaltos((prev) => prev.filter((_, x) => x !== i))}
                >
                  Quitar
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Puntos A" htmlFor={`puntos_a_${i}`}>
                <Input
                  id={`puntos_a_${i}`}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={asalto.puntos_a}
                  onChange={(e) => moverAsalto(i, 'puntos_a', e.target.value)}
                />
              </FormField>
              <FormField label="Puntos B" htmlFor={`puntos_b_${i}`}>
                <Input
                  id={`puntos_b_${i}`}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={asalto.puntos_b}
                  onChange={(e) => moverAsalto(i, 'puntos_b', e.target.value)}
                />
              </FormField>
              <FormField label="Penalidades A" htmlFor={`penalidades_a_${i}`}>
                <Input
                  id={`penalidades_a_${i}`}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={asalto.penalidades_a}
                  onChange={(e) => moverAsalto(i, 'penalidades_a', e.target.value)}
                />
              </FormField>
              <FormField label="Penalidades B" htmlFor={`penalidades_b_${i}`}>
                <Input
                  id={`penalidades_b_${i}`}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={asalto.penalidades_b}
                  onChange={(e) => moverAsalto(i, 'penalidades_b', e.target.value)}
                />
              </FormField>
            </div>
          </div>
        ))}
        {asaltos.length < NUM_ASALTO_MAX && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setAsaltos((prev) => [
                ...prev,
                { numero: prev.length + 1, puntos_a: 0, puntos_b: 0, penalidades_a: 0, penalidades_b: 0 },
              ])
            }
          >
            Agregar asalto
          </Button>
        )}
      </div>

      <FormField label="Resolución" htmlFor="resolucion">
        <Select id="resolucion" value={resolucion} onChange={(e) => setResolucion(e.target.value as ResolucionCombate)}>
          {RESOLUCIONES.map((r) => (
            <option key={r.valor} value={r.valor}>
              {r.etiqueta}
            </option>
          ))}
        </Select>
      </FormField>
    </>
  )
}

function SeccionTul({
  filas,
  totales,
  setFilas,
  moverFila,
}: {
  filas: FilaPuntajeTul[]
  totales: { a: number; b: number }
  setFilas: React.Dispatch<React.SetStateAction<FilaPuntajeTul[]>>
  moverFila: (indice: number, clave: keyof FilaPuntajeTul, valor: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {filas.map((fila, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-xl border p-3">
          <div className="flex items-center justify-between gap-2">
            <FormField label={`Jurado ${i + 1}`} htmlFor={`jurado_${i}`} className="flex-1">
              <Input
                id={`jurado_${i}`}
                placeholder="Nombre del jurado"
                value={fila.jurado_nombre}
                onChange={(e) => moverFila(i, 'jurado_nombre', e.target.value)}
              />
            </FormField>
            {filas.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setFilas((prev) => prev.filter((_, x) => x !== i))}>
                Quitar
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Contenido técnico A" htmlFor={`ct_a_${i}`}>
              <Input
                id={`ct_a_${i}`}
                type="number"
                min={0}
                inputMode="numeric"
                value={fila.contenido_tecnico_a}
                onChange={(e) => moverFila(i, 'contenido_tecnico_a', e.target.value)}
              />
            </FormField>
            <FormField label="Presentación A" htmlFor={`pres_a_${i}`}>
              <Input
                id={`pres_a_${i}`}
                type="number"
                min={0}
                inputMode="numeric"
                value={fila.presentacion_a}
                onChange={(e) => moverFila(i, 'presentacion_a', e.target.value)}
              />
            </FormField>
            <FormField label="Contenido técnico B" htmlFor={`ct_b_${i}`}>
              <Input
                id={`ct_b_${i}`}
                type="number"
                min={0}
                inputMode="numeric"
                value={fila.contenido_tecnico_b}
                onChange={(e) => moverFila(i, 'contenido_tecnico_b', e.target.value)}
              />
            </FormField>
            <FormField label="Presentación B" htmlFor={`pres_b_${i}`}>
              <Input
                id={`pres_b_${i}`}
                type="number"
                min={0}
                inputMode="numeric"
                value={fila.presentacion_b}
                onChange={(e) => moverFila(i, 'presentacion_b', e.target.value)}
              />
            </FormField>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => setFilas((prev) => [...prev, {
        jurado_nombre: '',
        contenido_tecnico_a: 0,
        presentacion_a: 0,
        contenido_tecnico_b: 0,
        presentacion_b: 0,
      }])}>
        Agregar jurado
      </Button>
    </div>
  )
}