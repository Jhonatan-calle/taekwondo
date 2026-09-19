// Módulo de la Gestión en Vivo (Fase 3, ítem 5): avance de rondas, validación de
// resultados ITF (combate/formas), historial competitivo y reducción de eventos
// Realtime. Puro y determinista (espeja el Motor y el Editor de llaves).
export {
  armarLlaveFormas,
  ganadorConocido,
  longitudRonda,
  marcarResultado,
  nombreRonda,
  prepararAvance,
} from './avance'
export { construirHistorial } from './historial'
export { aplicarEventoEnVivo } from './reducer'
export {
  esResultadoCombate,
  esResultadoTul,
  sugerirGanador,
  totalesCombate,
  totalesTul,
  validarResultado,
} from './validacion'
export type { EventoEnVivo, ResultadoReducer } from './reducer'
export type {
  AsaltoCombate,
  CambioRonda,
  CategoriaVivo,
  EnfVivo,
  EnfrentamientoRondaNueva,
  EstadoEnfrentamiento,
  EstadoVivo,
  FilaPuntajeTul,
  LlaveVivo,
  ModalidadLlave,
  ResolucionCombate,
  ResultadoCombate,
  ResultadoEnfrentamiento,
  ResultadoTul,
  RestoTorneo,
  TorneoVivo,
} from './tipos'