import Link from 'next/link'
import { Calendar, BookOpen, Users, UserCheck, Bot, Lock } from 'lucide-react'

export default function AdminDashboardPage() {
  const modules = [
    { title: 'Agenda', href: '/admin/agenda', icon: Calendar, desc: 'Citas, disponibilidad y calendario' },
    { title: 'Catálogo', href: '/admin/catalogo', icon: BookOpen, desc: 'Categorías y servicios' },
    { title: 'Profesionales', href: '/admin/profesionales', icon: Users, desc: 'Equipo, horarios y especialidades' },
    { title: 'Clientas', href: '/admin/clientas', icon: UserCheck, desc: 'Base de datos e historial de citas' },
    { title: 'Agente IA', href: '/admin/agente', icon: Bot, desc: 'Configuración y chats del agente' },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Login Placeholder Header */}
      <div className="p-6 rounded-xl border border-[#F3EAF0] bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#7B4B6E] bg-[#F3EAF0] px-3 py-1 rounded-full w-fit mb-2">
            <Lock className="h-3.5 w-3.5" />
            <span>Fase 1 · Modo Demostración</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#1A1618]">Panel de Administración</h1>
          <p className="text-xs text-[#6B6268]">Casa Malva · Estudio de belleza</p>
        </div>
        <div className="text-xs text-[#6B6268] bg-[#FAF8F9] px-3 py-2 rounded-lg border border-[#F3EAF0]">
          Autenticación Firebase Auth se conecta en Fase 2
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {modules.map((mod) => {
          const Icon = mod.icon
          return (
            <Link
              key={mod.href}
              href={mod.href}
              className="p-6 rounded-xl border border-[#F3EAF0] bg-white hover:border-[#7B4B6E]/30 transition-all flex items-start gap-4"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F3EAF0] text-[#7B4B6E]">
                <Icon className="h-6 w-6 stroke-[1.5]" />
              </div>
              <div>
                <h2 className="font-semibold text-base text-[#1A1618]">{mod.title}</h2>
                <p className="text-xs text-[#6B6268] mt-1">{mod.desc}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
