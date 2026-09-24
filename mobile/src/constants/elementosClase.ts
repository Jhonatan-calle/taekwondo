// Elementos del ciclo de composición del Taekwondo ITF.
// Una clase puede trabajar 1 o 2 de estos objetivos.

export const ELEMENTOS_CLASE = [
  'movimientos_fundamentales',
  'formas',
  'accesorios',
  'matsogi',
  'hosin_sul',
] as const;

export type ElementoClase = (typeof ELEMENTOS_CLASE)[number];

export const MAX_ELEMENTOS_CLASE = 2;

const ETIQUETAS_ELEMENTO: Record<ElementoClase, { larga: string; corta: string }> = {
  movimientos_fundamentales: {
    larga: 'Movimientos Fundamentales (Gibon Dongjak)',
    corta: 'Mov. Fundamentales',
  },
  formas: { larga: 'Formas (Tules)', corta: 'Formas (Tules)' },
  accesorios: {
    larga: 'Entrenamiento con Accesorios (Dallyon)',
    corta: 'Accesorios (Dallyon)',
  },
  matsogi: { larga: 'Ejercicios de Combate (Matsogi)', corta: 'Combate (Matsogi)' },
  hosin_sul: { larga: 'Defensa Personal (Hosin Sul)', corta: 'Defensa Personal' },
};

export function etiquetaElemento(valor: ElementoClase): string {
  return ETIQUETAS_ELEMENTO[valor].larga;
}

export function etiquetaElementoCorta(valor: ElementoClase): string {
  return ETIQUETAS_ELEMENTO[valor].corta;
}
