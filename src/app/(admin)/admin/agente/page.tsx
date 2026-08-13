'use client'

import { Bot, MessageCircle, ShieldCheck, Workflow } from 'lucide-react'
import { AdminHeader } from '@/components/layout/AdminShell'
import { Surface } from '@/components/ui/surface'
import { Badge } from '@/components/ui/badge'
import { RevealGroup, RevealItem } from '@/components/common/Reveal'

/**
 * Módulo del agente de IA — todavía no construido.
 *
 * Esta pantalla NO finge que existe. Muestra lo que va a hacer y en qué fase
 * entra, porque una pantalla vacía sin explicación delante de un cliente se
 * lee como una parte rota del producto, no como una parte pendiente.
 *
 * Spec pendiente: docs/specs/06-agente.md
 */
const HERRAMIENTAS = [
  {
    icon: MessageCircle,
    titulo: 'Conversaciones unificadas',
    texto:
      'WhatsApp y el chat del sitio entran al mismo cerebro y escriben en esta misma agenda. Una sola verdad, no dos calendarios.',
  },
  {
    icon: Workflow,
    titulo: 'Agenda de verdad',
    texto:
      'El agente consulta disponibilidad, agenda, reagenda y cancela usando las mismas reglas que valida el servidor.',
  },
  {
    icon: ShieldCheck,
    titulo: 'Blindaje anti-invento',
    texto:
      'Nunca inventa precios ni cupos: todo dato sale de una herramienta. Y por encima de $200.000 escala a una persona en vez de bloquear el cupo.',
  },
]

export default function AdminAgentePage() {
  return (
    <>
      <AdminHeader
        title="Agente de IA"
        subtitle="Atención por WhatsApp y web, con traspaso a una persona cuando hace falta."
      >
        <Badge tone="warning" size="lg">
          Fase 4 · en construcción
        </Badge>
      </AdminHeader>

      <Surface material="deep" radius="xl" pad="lg" className="mb-[var(--spacing-fib-3)]">
        <span className="grid h-12 w-12 place-items-center rounded-[16px] bg-white/15 text-white">
          <Bot className="h-6 w-6" strokeWidth={1.5} />
        </span>
        <h2 className="mt-3 font-display text-[24px] font-semibold text-white">
          Todavía no está encendido
        </h2>
        <p className="mt-1.5 max-w-lg text-[13.5px] leading-relaxed text-white/70">
          La agenda, el catálogo y las reglas de negocio ya están construidas y
          probadas — que es exactamente lo que el agente necesita para no
          equivocarse. Lo que falta es conectarle el canal de WhatsApp y las
          herramientas.
        </p>
      </Surface>

      <RevealGroup className="grid gap-3 md:grid-cols-3">
        {HERRAMIENTAS.map((h) => (
          <RevealItem key={h.titulo} variant="pop">
            <Surface pad="md" radius="lg" className="h-full">
              <h.icon className="h-5 w-5 text-malva-500" strokeWidth={1.75} aria-hidden />
              <h3 className="mt-2.5 text-[14px] font-semibold text-ink-900">{h.titulo}</h3>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">{h.texto}</p>
            </Surface>
          </RevealItem>
        ))}
      </RevealGroup>
    </>
  )
}
