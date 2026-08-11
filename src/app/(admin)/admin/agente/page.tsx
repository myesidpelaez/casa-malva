import { Bot } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'

export default function AdminAgentePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="border-b border-[#F3EAF0] pb-4">
        <h1 className="text-2xl font-semibold text-[#1A1618]">Agente IA & Conversaciones</h1>
        <p className="text-xs text-[#6B6268]">Supervisión de atención en WhatsApp/Web y handoff humano</p>
      </div>

      <EmptyState
        icon={Bot}
        title="Módulo de Agente IA (Fase 4)"
        description="Panel de control del asistente de IA, historial de mensajes por canal y escalamiento de conversaciones que requieran atención de recepción."
      />
    </div>
  )
}
