import { Calendar } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'

export default function AdminAgendaPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="border-b border-[#F3EAF0] pb-4">
        <h1 className="text-2xl font-semibold text-[#1A1618]">Agenda de Citas</h1>
        <p className="text-xs text-[#6B6268]">Gestión de citas, estados e historial</p>
      </div>

      <EmptyState
        icon={Calendar}
        title="Módulo de Agenda (Fase 3)"
        description="En esta sección se integrará el calendario interactivo con vista diaria/semanal, cambio de estados de citas y cálculo dinámico de disponibilidad."
      />
    </div>
  )
}
