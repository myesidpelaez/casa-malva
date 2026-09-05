'use client'

import { Bot, MessageCircle, ShieldCheck, Workflow } from 'lucide-react'
import { AdminHeader } from '@/components/layout/AdminShell'
import { Surface } from '@/components/ui/surface'
import { Badge } from '@/components/ui/badge'
import { RevealGroup, RevealItem } from '@/components/common/Reveal'
import { WhatsAppTesterCard } from './WhatsAppTesterCard'

const HERRAMIENTAS = [
  {
    icon: MessageCircle,
    titulo: 'Notificaciones WhatsApp Oficiales',
    texto:
      'Confirmación instantánea al agendar citas desde la web con datos del especialista, fecha, hora y ubicación.',
  },
  {
    icon: Workflow,
    titulo: 'Agenda & Disponibilidad en Tiempo Real',
    texto:
      'Las clientas reservan solas contra los turnos reales de los profesionales, evitando dobles reservas.',
  },
  {
    icon: ShieldCheck,
    titulo: 'Costo Marginal & Alta Fidelidad',
    texto:
      'Conexión directa a Meta Cloud API sin intermediarios. Costo de ~$3 COP por mensaje transaccional.',
  },
]

export default function AdminAgentePage() {
  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Zona Fija Superior */}
      <div className="shrink-0 pb-3">
        <AdminHeader
          title="Canal WhatsApp & Agente"
          subtitle="Notificaciones automáticas oficiales y atención inteligente para Casa Malva."
        >
          <Badge tone="success" size="lg">
            Cloud API v24.0 Activa
          </Badge>
        </AdminHeader>
      </div>

      {/* Zona con Scroll Interno */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-2 scrollbar-slim pb-8 space-y-4">
        <WhatsAppTesterCard />

        <Surface material="deep" radius="xl" pad="lg" className="my-[var(--spacing-fib-2)]">
          <span className="grid h-12 w-12 place-items-center rounded-md bg-white/15 text-white">
            <Bot className="h-6 w-6" strokeWidth={1.5} />
          </span>
          <h2 className="mt-3 font-display text-2xl font-semibold text-white">
            Notificaciones y Automatización Conversacional
          </h2>
          <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-white/70">
            Casa Malva ya dispara mensajes de confirmación automáticos por WhatsApp cada vez que una clienta completa su reserva en la web.
          </p>
        </Surface>

        <RevealGroup className="grid gap-3 md:grid-cols-3">
          {HERRAMIENTAS.map((h) => (
            <RevealItem key={h.titulo} variant="pop">
              <Surface pad="md" radius="lg" className="h-full">
                <h.icon className="h-5 w-5 text-malva-500" strokeWidth={1.75} aria-hidden />
                <h3 className="mt-2.5 text-sm font-semibold text-ink-900">{h.titulo}</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-500">{h.texto}</p>
              </Surface>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </div>
  )
}
