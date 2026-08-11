import { UserCheck } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'

export default function AdminClientasPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="border-b border-[#F3EAF0] pb-4">
        <h1 className="text-2xl font-semibold text-[#1A1618]">Directorio de Clientas</h1>
        <p className="text-xs text-[#6B6268]">Fichas de clientas, historial de servicios y notas</p>
      </div>

      <EmptyState
        icon={UserCheck}
        title="Módulo de Clientas (Fase 3)"
        description="Gestión completa de perfiles de clientas, teléfonos E.164, notas de preferencias y registros de citas asistidas/canceladas."
      />
    </div>
  )
}
