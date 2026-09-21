import NuevoGrupoScreen from '../../nuevo-grupo';

// Reexporta el formulario de grupo en modo edición. La ruta anidada
// `/instructor/grupo/[id]/editar` expone el `id` en el path y el
// formulario lo lee con `useLocalSearchParams` (`params.id`), por lo
// que aquí no hace falta pasarlo como prop.
export default NuevoGrupoScreen;
