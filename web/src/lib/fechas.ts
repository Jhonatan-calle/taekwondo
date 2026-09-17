// Helpers de fechas legibles (es-AR), seguros para Server y Client components.
export function fechaLegible(fecha: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${fecha}T00:00:00Z`))
}

export function edadLegible(fechaNacimiento: string): string {
  const hoy = new Date()
  const nac = new Date(`${fechaNacimiento}T00:00:00Z`)
  let edad = hoy.getUTCFullYear() - nac.getUTCFullYear()
  const mes = hoy.getUTCMonth() - nac.getUTCMonth()
  if (mes < 0 || (mes === 0 && hoy.getUTCDate() < nac.getUTCDate())) edad--
  return `${edad} años`
}