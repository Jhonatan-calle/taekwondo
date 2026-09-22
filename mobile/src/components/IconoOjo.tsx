import Svg, { Circle, Path } from 'react-native-svg';

type Props = {
  visible: boolean;
  size?: number;
  color?: string;
};

// Ícono de ojo para alternar la visibilidad de una contraseña.
// Se dibuja con react-native-svg (dependencia ya presente en el proyecto)
// para no instalar una librería de íconos completa por un solo elemento.
export function IconoOjo({ visible, size = 22, color = '#666' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Contorno del ojo */}
      <Path
        d="M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Pupila */}
      <Circle cx={12} cy={12} r={3.2} stroke={color} strokeWidth={1.8} />

      {/* Tachado: la contraseña está oculta */}
      {!visible ? (
        <Path
          d="M3 21 21 3"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      ) : null}
    </Svg>
  );
}
