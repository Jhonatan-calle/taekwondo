// Módulo de edición manual de llaves (Panel del Organizador): funciones puras
// de edición, serialización del payload jsonb y advertencias de las reglas.
export {
  agregarParticipante,
  liberarDeCategoria,
  moverParticipante,
  podarVacios,
  ubicacionDe,
} from './editar'
export { parsePayload, serializarPayload, validarReglasLlaves } from './payload'
export { advertenciasPar, esCategoriaInfantil } from './advertencias'
export type { AdvertenciaLlave } from './advertencias'
export type {
  CategoriaEditor,
  DestinoMover,
  EnfrentamientoEditor,
  Lado,
  ParticipanteLlave,
  PayloadCategoriaGuardar,
  PayloadGuardarLlaves,
} from './tipos'