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
  blanco: '10º Gup',
  blanco_punta_amarilla: '9º Gup',
  amarillo: '8º Gup',
  amarillo_punta_verde: '7º Gup',
  verde: '6º Gup',
  verde_punta_azul: '5º Gup',
  azul: '4º Gup',
  azul_punta_roja: '3º Gup',
  rojo: '2º Gup',
  rojo_punta_negra: '1º Gup',
  dan_1: 'I Dan',
  dan_2: 'II Dan',
  dan_3: 'III Dan',
  dan_4: 'IV Dan',
  dan_5: 'V Dan',
  dan_6: 'VI Dan',
  dan_7: 'VII Dan',
  dan_8: 'VIII Dan',
  dan_9: 'IX Dan',
};

export function etiquetaGrado(grado: Grado | null): string {
  return grado != null ? ETIQUETAS_GRADO[grado] : 'Sin grado';
}