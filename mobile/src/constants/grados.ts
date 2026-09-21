const GRADOS_GUP = [
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
] as const;

const GRADOS_DAN = [
  'dan_1',
  'dan_2',
  'dan_3',
  'dan_4',
  'dan_5',
  'dan_6',
  'dan_7',
  'dan_8',
  'dan_9',
] as const;

export const GRADOS = [...GRADOS_GUP, ...GRADOS_DAN] as const;

export type Grado = (typeof GRADOS)[number];

export function gradoSiguiente(grado: Grado): Grado | null {
  const indice = GRADOS.indexOf(grado);
  if (indice === -1 || indice === GRADOS.length - 1) {
    return null;
  }
  return GRADOS[indice + 1];
}