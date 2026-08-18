'use client'

import * as React from 'react'
import { ChevronRight, Phone, Search, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { getClientDetailAction, getClientsAction } from '@/actions/clientes'
import { getServicesAction } from '@/actions/catalogo'
import { getProfessionalsAction } from '@/actions/profesionales'
import { formatCurrencyFromCents } from '@/lib/currency'
import { fechaHoraConAnio, selloCorto } from '@/lib/fechas'
import { cn } from '@/lib/utils'
import { AdminHeader } from '@/components/layout/AdminShell'
import { Surface } from '@/components/ui/surface'
import { StatusPill } from '@/components/ui/badge'
import { Field } from '@/components/ui/field'
import { Sheet } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { RevealGroup, RevealItem } from '@/components/common/Reveal'
import type { Appointment, Client, Professional, Service } from '@/types'

type Detalle = {
  client: Client
  appointments: Appointment[]
  totalSpentCentavos: number
  totalAppointments: number
  noShowCount: number
}

/**
 * Fichas de clientas.
 *
 * Las tres cifras de la ficha se CALCULAN sobre citas que existen de verdad,
 * nunca se guardan ni se inventan ([[04-BIBLIOTECA/patrones/fallos-silenciosos]]:
 * cero métricas derivadas en el seed). "Gastado" cuenta solo lo completado —
 * una cita agendada todavía no es dinero.
 *
 * Spec: docs/specs/08-crm-admin.md
 */
export default function AdminClientasPage() {
  const [clientas, setClientas] = React.useState<Client[]>([])
  const [servicios, setServicios] = React.useState<Service[]>([])
  const [equipo, setEquipo] = React.useState<Professional[]>([])
  const [cargando, setCargando] = React.useState(true)
  const [busqueda, setBusqueda] = React.useState('')
  const [detalle, setDetalle] = React.useState<Detalle | null>(null)
  const [abriendo, setAbriendo] = React.useState<string | null>(null)

  React.useEffect(() => {
    Promise.all([getClientsAction(), getServicesAction(), getProfessionalsAction()]).then(
      ([c, s, p]) => {
        if (c.ok) setClientas(c.data)
        if (s.ok) setServicios(s.data)
        if (p.ok) setEquipo(p.data)
        setCargando(false)
      }
    )
  }, [])

  async function abrir(clientId: string) {
    setAbriendo(clientId)
    const res = await getClientDetailAction(clientId)
    setAbriendo(null)
    if (res.ok) setDetalle(res.data)
    else toast.error(res.error)
  }

  const filtradas = React.useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return clientas
    return clientas.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.telefonoE164.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
    )
  }, [clientas, busqueda])

  return (
    <>
      <AdminHeader
        title="Clientas"
        subtitle="Cada ficha reúne el historial completo, venga de la web, de WhatsApp o de recepción."
      />

      <div className="mb-[var(--spacing-fib-3)] max-w-sm">
        <Field
          icon={Search}
          type="search"
          placeholder="Buscar por nombre o teléfono"
          aria-label="Buscar clienta"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {cargando ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : filtradas.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title={busqueda ? 'Ninguna coincidencia' : 'Todavía no hay clientas'}
          description={
            busqueda
              ? 'Prueba con otro nombre o con los últimos dígitos del celular.'
              : 'La primera reserva crea la ficha automáticamente, con el teléfono como identidad.'
          }
        />
      ) : (
        <RevealGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtradas.map((cli) => (
            <RevealItem key={cli.id} variant="pop">
              <Surface
                interactive
                pad="sm"
                radius="lg"
                role="button"
                tabIndex={0}
                onClick={() => abrir(cli.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    abrir(cli.id)
                  }
                }}
                className={cn('h-full', abriendo === cli.id && 'opacity-60')}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-malva-100 font-display text-base font-semibold text-malva-700">
                    {cli.nombre.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[14px] font-semibold text-ink-900">
                      {cli.nombre}
                    </h2>
                    <p className="tnum flex items-center gap-1 truncate text-[12px] text-ink-400">
                      <Phone className="h-3 w-3" strokeWidth={2} />
                      {cli.telefonoE164}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-300" strokeWidth={2} />
                </div>
              </Surface>
            </RevealItem>
          ))}
        </RevealGroup>
      )}

      {/* ---------- Ficha ---------- */}
      <Sheet
        open={!!detalle}
        onOpenChange={(abierto) => !abierto && setDetalle(null)}
        title={detalle?.client.nombre ?? ''}
        description={detalle?.client.telefonoE164}
        size="lg"
      >
        {detalle && (
          <div className="space-y-[var(--spacing-fib-3)]">
            <div className="grid grid-cols-3 gap-2">
              <Metrica etiqueta="Citas" valor={String(detalle.totalAppointments)} />
              <Metrica
                etiqueta="Gastado"
                valor={formatCurrencyFromCents(detalle.totalSpentCentavos)}
                nota="solo completadas"
                acento
              />
              <Metrica
                etiqueta="No-shows"
                valor={String(detalle.noShowCount)}
                tono={detalle.noShowCount > 0 ? 'alerta' : 'bien'}
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-[13px] font-semibold text-ink-700">Historial</h3>

              {detalle.appointments.length === 0 ? (
                <EmptyState compact title="Sin citas registradas" />
              ) : (
                <ol className="relative space-y-2 border-l border-malva-200 pl-4">
                  {detalle.appointments.map((cita) => (
                    <li key={cita.id} className="relative">
                      <span className="absolute -left-[21px] top-3 h-2 w-2 rounded-full bg-malva-400 ring-4 ring-[var(--canvas)]" />

                      <Surface material="solid" radius="md" pad="sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-ink-900">
                              {servicios.find((s) => s.id === cita.serviceId)?.nombre ??
                                'Servicio'}
                            </p>
                            <p className="tnum text-[11.5px] text-ink-400 first-letter:uppercase">
                              {fechaHoraConAnio(cita.inicioUtc)}
                              {' · '}
                              {equipo.find((p) => p.id === cita.professionalId)?.nombre ?? '—'}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="tnum text-[13px] font-semibold text-malva-700">
                              {formatCurrencyFromCents(cita.precioCentavos)}
                            </p>
                            <div className="mt-1">
                              <StatusPill estado={cita.estado} />
                            </div>
                          </div>
                        </div>

                        {cita.historial?.length > 0 && (
                          <details className="mt-2 border-t border-ink-100 pt-2">
                            <summary className="cursor-pointer text-[11.5px] font-semibold text-ink-400 hover:text-malva-700">
                              Traza ({cita.historial.length})
                            </summary>
                            <ul className="mt-1.5 space-y-1">
                              {cita.historial.map((h, i) => (
                                <li key={i} className="text-[11px] leading-relaxed text-ink-400">
                                  <span className="tnum">
                                    {selloCorto(h.fechaUtc)}
                                  </span>{' '}
                                  · <strong className="text-ink-700">{h.estado}</strong>
                                  {h.nota ? ` — ${h.nota}` : ''}
                                  {h.cambiadoPor ? ` (${h.cambiadoPor})` : ''}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </Surface>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </Sheet>
    </>
  )
}

function Metrica({
  etiqueta,
  valor,
  nota,
  acento,
  tono,
}: {
  etiqueta: string
  valor: string
  nota?: string
  acento?: boolean
  tono?: 'alerta' | 'bien'
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-ink-100 bg-[var(--glass-tint)] px-2.5 py-3 text-center">
      <p className="text-[10.5px] uppercase tracking-[0.1em] text-ink-400">{etiqueta}</p>
      <p
        className={cn(
          'tnum mt-0.5 text-[16px] font-semibold',
          acento && 'text-malva-700',
          tono === 'alerta' && 'text-danger',
          tono === 'bien' && 'text-success',
          !acento && !tono && 'text-ink-900'
        )}
      >
        {valor}
      </p>
      {nota && <p className="text-[9.5px] text-ink-300">{nota}</p>}
    </div>
  )
}
