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

export const GRADOS_DAN = [
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

export function esGradoDan(grado: Grado | null): boolean {
  return grado != null && GRADOS.indexOf(grado) >= GRADOS.indexOf('dan_1');
}

export function gradoSiguiente(grado: Grado): Grado | null {
  const indice = GRADOS.indexOf(grado);
  if (indice === -1 || indice === GRADOS.length - 1) {
    return null;
  }
  return GRADOS[indice + 1];
}

const ETIQUETAS_GRADO: Record<Grado, string> = {
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
  dan_1: 'Dan I',
  dan_2: 'Dan II',
  dan_3: 'Dan III',
  dan_4: 'Dan IV',
  dan_5: 'Dan V',
  dan_6: 'Dan VI',
  dan_7: 'Dan VII',
  dan_8: 'Dan VIII',
  dan_9: 'Dan IX',
};

export function etiquetaGrado(grado: Grado | null): string {
  return grado != null ? ETIQUETAS_GRADO[grado] : 'Sin grado';
}