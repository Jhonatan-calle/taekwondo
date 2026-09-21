export function obtenerParametrosDeUrl(url: string | null): Record<string, string> {
  const parametros: Record<string, string> = {}
  if (!url) return parametros

  const conConsulta = url.includes('#') ? url.replace('#', '?') : url
  const soloConsulta = conConsulta.split('?').slice(1).join('?')

  for (const par of soloConsulta.split('&')) {
    if (!par) continue
    const [clave, valor] = par.split('=')
    if (!clave) continue
    parametros[decodeURIComponent(clave)] = valor !== undefined ? decodeURIComponent(valor) : ''
  }

  return parametros
}