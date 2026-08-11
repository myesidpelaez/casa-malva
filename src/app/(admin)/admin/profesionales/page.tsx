import { Users } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'

export default function AdminProfesionalesPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="border-b border-[#F3EAF0] pb-4">
        <h1 className="text-2xl font-semibold text-[#1A1618]">Equipo de Profesionales</h1>
        <p className="text-xs text-[#6B6268]">Gestión de especialistas, horarios y excepciones</p>
      </div>

      <EmptyState
        icon={Users}
        title="Módulo de Profesionales (Fase 2)"
        description="Aquí podrás gestionar el equipo (Valentina, Daniela, Sara y Camila), asignar servicios y definir sus horarios específicos."
      />
    </div>
  )
}
