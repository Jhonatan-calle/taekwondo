// Grados/cinturones disponibles para la inscripción a torneos.
// Etiquetas de los enums de la BD `grado_gup` (10º Gup → 1º Gup) y `grado_dan` (Dan I → VI).
// Espejo de las definiciones de `esquema_inicial` para el formulario y su validación.
export const GRADOS_INSCRIPCION = [
  'blanco',
  'blanco_punta_amarilla',
  'amarillo',
  'amarillo_punta_verde',
  'verde',
  'verde_punta_azul',
  'azul',
  'azul_punta_roja',
  'rojo',
  'rojo_punta_negra',
  'dan_1',
  'dan_2',
  'dan_3',
  'dan_4',
  'dan_5',
  'dan_6',
] as const

// Forma de lectura para el <select> y la UI.
export const ETIQUETA_GRADO_INSCRIPCION: Record<string, string> = {
  blanco: 'Blanco',
  blanco_punta_amarilla: 'Blanco punta amarilla',
  amarillo: 'Amarillo',
  amarillo_punta_verde: 'Amarillo punta verde',
  verde: 'Verde',
  verde_punta_azul: 'Verde punta azul',
  azul: 'Azul',
  azul_punta_roja: 'Azul punta roja',
  rojo: 'Rojo',
  rojo_punta_negra: 'Rojo punta negra',
  dan_1: '1er Dan',
  dan_2: '2do Dan',
  dan_3: '3er Dan',
  dan_4: '4to Dan',
  dan_5: '5to Dan',
  dan_6: '6to Dan',
}