import { requireProfesor } from '@/lib/auth'

// Guard de la ruta /panel: exige sesión activa y faceta de profesor.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireProfesor()
  return <div className="flex flex-1 flex-col">{children}</div>
}