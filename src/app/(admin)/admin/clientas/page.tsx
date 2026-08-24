'use client'

import * as React from 'react'
import { ChevronRight, Phone, Search, UserRound, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { getClientDetailAction, getClientsAction, crearClientaAction, fusionarClientasAction } from '@/actions/clientes'
import { getServicesAction } from '@/actions/catalogo'
import { getProfessionalsAction } from '@/actions/profesionales'
import { formatCurrencyFromCents } from '@/lib/currency'
import { fechaHoraConAnio, selloCorto } from '@/lib/fechas'
import { posiblesDuplicadas } from '@/lib/personas'
import { cn } from '@/lib/utils'
import { AdminHeader } from '@/components/layout/AdminShell'
import { Surface } from '@/components/ui/surface'
import { StatusPill } from '@/components/ui/badge'
import { Field } from '@/components/ui/field'
import { RightDrawer } from '@/components/ui/drawer'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { RevealGroup, RevealItem } from '@/components/common/Reveal'
import { Button } from '@/components/ui/button'
import type { Appointment, Client, Professional, Service } from '@/types'

type Detalle = {
  client: Client
  appointments: Appointment[]
  totalSpentCentavos: number
  totalAppointments: number
  noShowCount: number
}

export default function AdminClientasPage() {
  const [clientas, setClientas] = React.useState<Client[]>([])
  const [servicios, setServicios] = React.useState<Service[]>([])
  const [equipo, setEquipo] = React.useState<Professional[]>([])
  const [cargando, setCargando] = React.useState(true)
  const [busqueda, setBusqueda] = React.useState('')
  const [detalle, setDetalle] = React.useState<Detalle | null>(null)
  const [abriendo, setAbriendo] = React.useState<string | null>(null)
  
  const [crearAbierto, setCrearAbierto] = React.useState(false)
  const [creando, setCreando] = React.useState(false)
  
  const [duplicadasAbierto, setDuplicadasAbierto] = React.useState(false)
  const [fusionando, setFusionando] = React.useState(false)

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
        c.telefonoE164.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        (c.telefonosAlternativos?.some(t => t.replace(/\D/g, '').includes(q.replace(/\D/g, ''))))
    )
  }, [clientas, busqueda])
  
  const pares = React.useMemo(() => posiblesDuplicadas(clientas), [clientas])

  async function onSubmitCrear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCreando(true)
    const formData = new FormData(e.currentTarget)
    const nombre = formData.get('nombre') as string
    const telefono = formData.get('telefono') as string
    const email = formData.get('email') as string
    const notas = formData.get('notas') as string
    
    const res = await crearClientaAction({ nombre, telefono, email, notas })
    setCreando(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    
    if (res.data.yaExistia) {
      toast.info('El teléfono ya existía. Abriendo ficha.')
    } else {
      toast.success('Clienta creada')
      setClientas(prev => [res.data.clienta, ...prev])
    }
    setCrearAbierto(false)
    abrir(res.data.clienta.id)
  }
  
  async function onFusionar(idSuperviviente: string, idAbsorbida: string) {
    setFusionando(true)
    const res = await fusionarClientasAction(idSuperviviente, idAbsorbida)
    setFusionando(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success('Clientas fusionadas')
    setDuplicadasAbierto(false)
    
    // Refresh clients list
    const c = await getClientsAction()
    if (c.ok) setClientas(c.data)
  }

  return (
    <>
      <AdminHeader
        title="Clientas"
        subtitle="Cada ficha reúne el historial completo, venga de la web, de WhatsApp o de recepción."
      >
        <Button variant="primary" onClick={() => setCrearAbierto(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva clienta
        </Button>
      </AdminHeader>

      {pares.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-amber-50 p-3 text-[13px] text-amber-800 border border-amber-200">
          <span>{pares.length} posibles fichas repetidas</span>
          <Button variant="outline" size="sm" onClick={() => setDuplicadasAbierto(true)}>
            Revisar
          </Button>
        </div>
      )}

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
      <RightDrawer
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
      </RightDrawer>
      
      {/* ---------- Crear Clienta ---------- */}
      <RightDrawer
        open={crearAbierto}
        onOpenChange={setCrearAbierto}
        title="Nueva clienta"
        description="Si el teléfono ya existe, se abrirá la ficha existente en su lugar."
      >
        <form onSubmit={onSubmitCrear} className="space-y-4">
          <Field
            label="Nombre completo"
            name="nombre"
            required
            autoFocus
          />
          <Field
            label="Teléfono"
            name="telefono"
            type="tel"
            required
            placeholder="+57..."
          />
          <Field
            label="Correo electrónico"
            name="email"
            type="email"
          />
          <div className="space-y-1">
            <label className="text-[13px] font-medium text-ink-700">Notas</label>
            <textarea
              name="notas"
              className="w-full rounded-[var(--radius-md)] border border-ink-200 bg-white p-2.5 text-[13.5px] text-ink-900 outline-none transition focus:border-malva-400 focus:ring-4 focus:ring-malva-400/20"
              rows={3}
            />
          </div>
          <div className="pt-2">
            <Button type="submit" variant="primary" className="w-full" disabled={creando}>
              {creando ? 'Guardando...' : 'Guardar clienta'}
            </Button>
          </div>
        </form>
      </RightDrawer>
      
      {/* ---------- Resolver Duplicadas ---------- */}
      <RightDrawer
        open={duplicadasAbierto}
        onOpenChange={setDuplicadasAbierto}
        title="Resolver duplicadas"
        description="Selecciona cuál ficha sobrevive. La otra será absorbida (sus citas y cobros se moverán). Esta acción no se puede deshacer desde la interfaz."
        size="lg"
      >
        {pares.length > 0 && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Surface pad="md" className="space-y-3">
                <h3 className="font-semibold text-ink-900">{pares[0][0].nombre}</h3>
                <p className="text-sm text-ink-500">{pares[0][0].telefonoE164}</p>
                <Button 
                  variant="primary" 
                  className="w-full"
                  disabled={fusionando}
                  onClick={() => onFusionar(pares[0][0].id, pares[0][1].id)}
                >
                  Mantener esta
                </Button>
              </Surface>
              <Surface pad="md" className="space-y-3">
                <h3 className="font-semibold text-ink-900">{pares[0][1].nombre}</h3>
                <p className="text-sm text-ink-500">{pares[0][1].telefonoE164}</p>
                <Button 
                  variant="primary" 
                  className="w-full"
                  disabled={fusionando}
                  onClick={() => onFusionar(pares[0][1].id, pares[0][0].id)}
                >
                  Mantener esta
                </Button>
              </Surface>
            </div>
            {pares.length > 1 && (
              <p className="text-sm text-ink-500 text-center">
                Hay {pares.length - 1} par(es) más. Resuelve este primero.
              </p>
            )}
          </div>
        )}
      </RightDrawer>
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
