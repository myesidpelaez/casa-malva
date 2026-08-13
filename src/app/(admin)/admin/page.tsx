'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  MessageCircle,
  Monitor,
  Sparkles,
  Users,
  UserX,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  cancelarCitaAction,
  confirmarCitaAction,
  getCitasAction,
  marcarCompletadaAction,
  marcarNoAsistioAction,
} from '@/actions/citas'
import { getServicesAction } from '@/actions/catalogo'
import { getProfessionalsAction } from '@/actions/profesionales'
import { getClientsAction } from '@/actions/clientes'
import { formatCurrencyFromCents } from '@/lib/currency'
import { claveDia, startOfDay } from '@/lib/disponibilidad'
import { fechaHoraCorta, fechaHoraLarga, fechaLarga, hora } from '@/lib/fechas'
import { cn } from '@/lib/utils'
import { spring, tween } from '@/lib/motion'
import { AdminHeader } from '@/components/layout/AdminShell'
import { Button } from '@/components/ui/button'
import { Surface } from '@/components/ui/surface'
import { APPOINTMENT_STATE, Badge, LivePulse, StatusPill } from '@/components/ui/badge'
import { Segmented } from '@/components/ui/segmented'
import { Sheet } from '@/components/ui/sheet'
import { Field } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import type { Appointment, Client, Professional, Service } from '@/types'

const REFRESCO_MS = 3000

type Filtro = 'todas' | 'pendientes' | 'activas'

const ORIGEN_META = {
  whatsapp: { icon: MessageCircle, label: 'WhatsApp' },
  web: { icon: Globe, label: 'Web' },
  admin: { icon: Monitor, label: 'Recepción' },
} as const

export default function AdminAgendaPage() {
  const [dia, setDia] = React.useState<Date>(() => startOfDay(new Date()))
  const [citas, setCitas] = React.useState<Appointment[]>([])
  const [servicios, setServicios] = React.useState<Service[]>([])
  const [equipo, setEquipo] = React.useState<Professional[]>([])
  const [clientas, setClientas] = React.useState<Client[]>([])
  const [cargando, setCargando] = React.useState(true)
  const [filtro, setFiltro] = React.useState<Filtro>('todas')
  const [profesionalMovil, setProfesionalMovil] = React.useState<string>('todas')
  const [recienLlegadas, setRecienLlegadas] = React.useState<Set<string>>(new Set())
  const [cancelando, setCancelando] = React.useState<Appointment | null>(null)
  const [motivo, setMotivo] = React.useState('')
  const [guardando, setGuardando] = React.useState(false)

  const idsVistos = React.useRef<Set<string> | null>(null)

  /* --- Catálogos: una sola vez --- */
  React.useEffect(() => {
    Promise.all([getServicesAction(), getProfessionalsAction(), getClientsAction()]).then(
      ([s, p, c]) => {
        if (s.ok) setServicios(s.data)
        if (p.ok) setEquipo(p.data)
        if (c.ok) setClientas(c.data)
        setCargando(false)
      }
    )
  }, [])

  /* --- Citas: sondeo continuo --- */
  const refrescar = React.useCallback(async (silencioso = true) => {
    const res = await getCitasAction()
    if (!res.ok) {
      if (!silencioso) toast.error('No se pudo actualizar la agenda')
      return
    }

    const previos = idsVistos.current
    const actuales = new Set(res.data.map((c) => c.id))

    if (previos) {
      const nuevas = res.data.filter((c) => !previos.has(c.id))
      if (nuevas.length > 0) {
        setRecienLlegadas((prev) => {
          const next = new Set(prev)
          nuevas.forEach((c) => next.add(c.id))
          return next
        })
        window.setTimeout(() => {
          setRecienLlegadas((prev) => {
            const next = new Set(prev)
            nuevas.forEach((c) => next.delete(c.id))
            return next
          })
        }, 9000)

        for (const cita of nuevas) {
          const canal = ORIGEN_META[cita.origen]?.label ?? 'la web'
          toast.success('Nueva cita', {
            description: `${fechaHoraCorta(cita.inicioUtc)} · entró por ${canal}`,
          })
        }
        getClientsAction().then((c) => c.ok && setClientas(c.data))
      }
    }

    idsVistos.current = actuales
    setCitas(res.data)
  }, [])

  React.useEffect(() => {
    refrescar()
    const id = window.setInterval(refrescar, REFRESCO_MS)
    return () => window.clearInterval(id)
  }, [refrescar])

  /* --- Derivados --- */
  const citasDelDia = React.useMemo(() => {
    const clave = claveDia(dia)
    return citas
      .filter((c) => claveDia(new Date(c.inicioUtc)) === clave)
      .sort((a, b) => new Date(a.inicioUtc).getTime() - new Date(b.inicioUtc).getTime())
  }, [citas, dia])

  const visibles = React.useMemo(() => {
    if (filtro === 'pendientes') return citasDelDia.filter((c) => c.estado === 'pendiente')
    if (filtro === 'activas')
      return citasDelDia.filter((c) => c.estado === 'agendada' || c.estado === 'confirmada')
    return citasDelDia
  }, [citasDelDia, filtro])

  const pendientes = citasDelDia.filter((c) => c.estado === 'pendiente').length
  const activas = citasDelDia.filter(
    (c) => c.estado === 'agendada' || c.estado === 'confirmada'
  ).length

  const ingresoPrevisto = citasDelDia
    .filter((c) => c.estado !== 'cancelada' && c.estado !== 'no_asistio')
    .reduce((total, c) => total + c.precioCentavos, 0)

  const esHoy = claveDia(dia) === claveDia(new Date())

  /* --- Acciones --- */
  async function transicion(
    cita: Appointment,
    accion: () => Promise<{ ok: boolean; error?: string }>,
    exito: string
  ) {
    const res = await accion()
    if (res.ok) {
      toast.success(exito)
      refrescar(false)
    } else {
      toast.error(res.error ?? 'No se pudo aplicar el cambio')
    }
  }

  async function confirmarCancelacion() {
    if (!cancelando) return
    setGuardando(true)
    const res = await cancelarCitaAction(
      cancelando.id,
      motivo.trim() || 'Cancelada desde el panel',
      'admin'
    )
    setGuardando(false)

    if (res.ok) {
      toast.success('Cita cancelada', { description: 'El cupo vuelve a estar libre.' })
      setCancelando(null)
      setMotivo('')
      refrescar(false)
    } else {
      toast.error(res.error ?? 'No se pudo cancelar')
    }
  }

  function moverDia(delta: number) {
    setDia((actual) => {
      const d = new Date(actual)
      d.setDate(d.getDate() + delta)
      return startOfDay(d)
    })
  }

  /* Citas filtradas para la vista móvil */
  const citasMovil = React.useMemo(() => {
    if (profesionalMovil === 'todas') return visibles
    return visibles.filter((c) => c.professionalId === profesionalMovil)
  }, [visibles, profesionalMovil])

  return (
    <>
      <AdminHeader
        title="Agenda del día"
        subtitle={<LivePulse label="En vivo · se actualiza sola cada 3 segundos" />}
      >
        <Segmented
          ariaLabel="Filtrar citas"
          size="sm"
          value={filtro}
          onChange={setFiltro}
          className="w-full sm:w-auto"
          options={[
            { value: 'todas', label: 'Todas', count: citasDelDia.length },
            { value: 'activas', label: 'En pie', count: activas },
            { value: 'pendientes', label: 'Por confirmar', count: pendientes },
          ]}
        />
      </AdminHeader>

      {/* ---------- Navegador de fecha + resumen (100% fluido) ---------- */}
      <Surface material="frost" radius="lg" pad="sm" className="mb-[var(--spacing-fib-3)]">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <Button
            variant="glass"
            size="icon-sm"
            aria-label="Día anterior"
            className="h-9 w-9 shrink-0"
            onClick={() => moverDia(-1)}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </Button>

          <div className="min-w-0 flex-1 px-1 text-center">
            <p className="truncate font-display text-[15px] sm:text-[18px] font-semibold leading-tight text-ink-900 first-letter:uppercase">
              {fechaLarga(dia)}
            </p>
            <p className="tnum truncate text-[11px] sm:text-[12px] text-ink-400">
              {citasDelDia.length} cita{citasDelDia.length === 1 ? '' : 's'} ·{' '}
              {formatCurrencyFromCents(ingresoPrevisto)} previstos
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!esHoy && (
              <Button
                variant="soft"
                size="sm"
                className="h-8 px-2 text-[11px] sm:h-9 sm:px-3 sm:text-xs"
                onClick={() => setDia(startOfDay(new Date()))}
              >
                Hoy
              </Button>
            )}
            <Button
              variant="glass"
              size="icon-sm"
              aria-label="Día siguiente"
              className="h-9 w-9 shrink-0"
              onClick={() => moverDia(1)}
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </Button>
          </div>
        </div>
      </Surface>

      {/* ---------- Pestañas de Profesional (Móvil: < md) ---------- */}
      <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none md:hidden">
        <button
          type="button"
          onClick={() => setProfesionalMovil('todas')}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all',
            profesionalMovil === 'todas'
              ? 'bg-malva-600 text-white shadow-[var(--shadow-malva)]'
              : 'border border-ink-100 bg-white/80 text-ink-600 hover:bg-white'
          )}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Todo el equipo</span>
          <span
            className={cn(
              'rounded-full px-1.5 py-px text-[10px] tnum',
              profesionalMovil === 'todas' ? 'bg-white/20 text-white' : 'bg-ink-100 text-ink-600'
            )}
          >
            {visibles.length}
          </span>
        </button>

        {equipo.map((prof) => {
          const count = visibles.filter((c) => c.professionalId === prof.id).length
          const active = profesionalMovil === prof.id

          return (
            <button
              key={prof.id}
              type="button"
              onClick={() => setProfesionalMovil(prof.id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all',
                active
                  ? 'bg-malva-600 text-white shadow-[var(--shadow-malva)]'
                  : 'border border-ink-100 bg-white/80 text-ink-600 hover:bg-white'
              )}
            >
              <span
                className={cn(
                  'grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold',
                  active ? 'bg-white/25 text-white' : 'bg-malva-100 text-malva-700'
                )}
              >
                {prof.nombre.charAt(0)}
              </span>
              <span>{prof.nombre.split(' ')[0]}</span>
              {count > 0 && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-px text-[10px] tnum',
                    active ? 'bg-white/20 text-white' : 'bg-malva-100 text-malva-700'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ---------- Vista Móvil: Línea de Tiempo / Lista Fluida (< md) ---------- */}
      <div className="block md:hidden">
        {cargando ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-[var(--radius-lg)]" />
            ))}
          </div>
        ) : citasMovil.length === 0 ? (
          <Surface radius="lg" pad="md" className="text-center py-10">
            <Calendar className="mx-auto h-8 w-8 text-ink-300" strokeWidth={1.5} />
            <p className="mt-2 text-[14px] font-semibold text-ink-900">Sin citas para este día</p>
            <p className="mt-1 text-[12px] text-ink-400">
              {profesionalMovil === 'todas'
                ? 'No hay reservas registradas en el estudio.'
                : 'Esta profesional no tiene citas en esta fecha.'}
            </p>
          </Surface>
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence initial={false} mode="popLayout">
              {citasMovil.map((cita) => (
                <TarjetaCita
                  key={cita.id}
                  cita={cita}
                  servicio={servicios.find((s) => s.id === cita.serviceId)}
                  clienta={clientas.find((c) => c.id === cita.clientId)}
                  profesional={equipo.find((p) => p.id === cita.professionalId)}
                  mostrarProfesional={profesionalMovil === 'todas'}
                  nueva={recienLlegadas.has(cita.id)}
                  onConfirmar={() =>
                    transicion(cita, () => confirmarCitaAction(cita.id), 'Cita confirmada')
                  }
                  onCompletar={() =>
                    transicion(
                      cita,
                      () => marcarCompletadaAction(cita.id),
                      'Servicio marcado como realizado'
                    )
                  }
                  onNoAsistio={() =>
                    transicion(
                      cita,
                      () => marcarNoAsistioAction(cita.id),
                      'Registrada como no-show'
                    )
                  }
                  onCancelar={() => {
                    setCancelando(cita)
                    setMotivo('')
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ---------- Vista Escritorio: Columnas por Profesional (≥ md) ---------- */}
      <div className="hidden md:block">
        {cargando ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-[var(--radius-lg)]" />
            ))}
          </div>
        ) : equipo.length === 0 ? (
          <EmptyState
            title="No hay profesionales configuradas"
            description="Añade al equipo desde la sección Equipo para poder ver su agenda."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {equipo.map((prof) => {
              const suyas = visibles.filter((c) => c.professionalId === prof.id)
              return (
                <Surface
                  key={prof.id}
                  radius="lg"
                  pad="sm"
                  className="flex min-h-[220px] flex-col"
                >
                  <div className="flex items-center gap-2.5 border-b border-malva-100 pb-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-malva-500 to-malva-700 font-display text-sm font-semibold text-white">
                      {prof.nombre.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[13.5px] font-semibold text-ink-900">
                        {prof.nombre}
                      </h2>
                      <p className="truncate text-[11px] text-ink-400">{prof.cargo}</p>
                    </div>
                    <Badge tone={suyas.length ? 'malva' : 'neutral'} size="sm">
                      {suyas.length}
                    </Badge>
                  </div>

                  <div className="mt-2.5 flex-1 space-y-2">
                    {suyas.length === 0 && (
                      <p className="rounded-[var(--radius-sm)] border border-dashed border-malva-200 py-6 text-center text-[11.5px] text-ink-400">
                        Sin citas
                      </p>
                    )}

                    <AnimatePresence initial={false} mode="popLayout">
                      {suyas.map((cita) => (
                        <TarjetaCita
                          key={cita.id}
                          cita={cita}
                          servicio={servicios.find((s) => s.id === cita.serviceId)}
                          clienta={clientas.find((c) => c.id === cita.clientId)}
                          profesional={prof}
                          mostrarProfesional={false}
                          nueva={recienLlegadas.has(cita.id)}
                          onConfirmar={() =>
                            transicion(cita, () => confirmarCitaAction(cita.id), 'Cita confirmada')
                          }
                          onCompletar={() =>
                            transicion(
                              cita,
                              () => marcarCompletadaAction(cita.id),
                              'Servicio marcado como realizado'
                            )
                          }
                          onNoAsistio={() =>
                            transicion(
                              cita,
                              () => marcarNoAsistioAction(cita.id),
                              'Registrada como no-show'
                            )
                          }
                          onCancelar={() => {
                            setCancelando(cita)
                            setMotivo('')
                          }}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </Surface>
              )
            })}
          </div>
        )}
      </div>

      {/* ---------- Cancelación con motivo ---------- */}
      <Sheet
        open={!!cancelando}
        onOpenChange={(abierto) => !abierto && setCancelando(null)}
        title="Cancelar la cita"
        description="Queda registrado en el historial de la clienta y el cupo se libera de inmediato."
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="glass" full onClick={() => setCancelando(null)} disabled={guardando}>
              Volver
            </Button>
            <Button variant="danger" full loading={guardando} onClick={confirmarCancelacion}>
              Cancelar la cita
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {cancelando && (
            <Surface material="solid" radius="md" pad="sm">
              <p className="text-[13px] font-semibold text-ink-900">
                {servicios.find((s) => s.id === cancelando.serviceId)?.nombre}
              </p>
              <p className="tnum text-[12px] text-ink-500">
                {fechaHoraLarga(cancelando.inicioUtc)}
              </p>
            </Surface>
          )}

          <Field
            label="Motivo"
            placeholder="La clienta llamó para cambiar la fecha"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            hint="Se guarda en el historial. Si lo dejas vacío queda como “Cancelada desde el panel”."
          />
        </div>
      </Sheet>
    </>
  )
}

/* ========================================================================
   Tarjeta de cita (Adaptativa para Móvil y Desktop)
   ===================================================================== */
function TarjetaCita({
  cita,
  servicio,
  clienta,
  profesional,
  mostrarProfesional = false,
  nueva,
  onConfirmar,
  onCompletar,
  onNoAsistio,
  onCancelar,
}: {
  cita: Appointment
  servicio?: Service
  clienta?: Client
  profesional?: Professional
  mostrarProfesional?: boolean
  nueva: boolean
  onConfirmar: () => void
  onCompletar: () => void
  onNoAsistio: () => void
  onCancelar: () => void
}) {
  const meta = APPOINTMENT_STATE[cita.estado] ?? APPOINTMENT_STATE.agendada
  const Origen = ORIGEN_META[cita.origen]?.icon ?? Globe
  const terminada =
    cita.estado === 'completada' || cita.estado === 'cancelada' || cita.estado === 'no_asistio'

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: tween.fast }}
      transition={spring.gentle}
      className={cn(
        'relative overflow-hidden rounded-[var(--radius-md)] border border-ink-100/80 pl-2.5',
        meta.surface,
        terminada && 'opacity-65'
      )}
    >
      {/* Barra de estado a la izquierda */}
      <span className={cn('absolute inset-y-0 left-0 w-1', meta.accent)} aria-hidden />

      {/* Halo de nueva llegada */}
      <AnimatePresence>
        {nueva && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.45, 1, 0.45] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.4, times: [0, 0.15, 0.4, 0.65, 1] }}
            className="pointer-events-none absolute inset-0 rounded-[var(--radius-md)] ring-2 ring-malva-500"
            aria-hidden
          />
        )}
      </AnimatePresence>

      <div className="space-y-2 p-2.5 sm:p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="tnum inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-900">
            <Clock className="h-3.5 w-3.5 text-malva-500" strokeWidth={2} />
            {hora(cita.inicioUtc)}
          </span>

          <div className="flex items-center gap-1.5">
            {mostrarProfesional && profesional && (
              <span className="inline-flex items-center gap-1 rounded-full bg-malva-100 px-2 py-0.5 text-[11px] font-semibold text-malva-700">
                <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-malva-600 text-[8.5px] font-bold text-white">
                  {profesional.nombre.charAt(0)}
                </span>
                <span className="truncate max-w-[80px] sm:max-w-none">
                  {profesional.nombre.split(' ')[0]}
                </span>
              </span>
            )}
            <StatusPill estado={cita.estado} />
          </div>
        </div>

        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-ink-900">
            {servicio?.nombre ?? 'Servicio'}
          </p>
          <p className="truncate text-[11.5px] text-ink-500">
            {clienta?.nombre ?? 'Clienta'}
            {clienta?.telefonoE164 && (
              <span className="tnum text-ink-400"> · {clienta.telefonoE164}</span>
            )}
          </p>
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <span className="inline-flex items-center gap-1 text-[11px] text-ink-400">
            <Origen className="h-3.5 w-3.5" strokeWidth={1.75} />
            {ORIGEN_META[cita.origen]?.label ?? 'Web'}
          </span>
          <span className="tnum text-[13px] font-semibold text-malva-700">
            {formatCurrencyFromCents(cita.precioCentavos)}
          </span>
        </div>

        {!terminada && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-black/[0.06] pt-2">
            {(cita.estado === 'agendada' || cita.estado === 'pendiente') && (
              <Button
                variant="success"
                size="sm"
                onClick={onConfirmar}
                className="!h-8 !px-3 text-[12px]"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                Confirmar
              </Button>
            )}

            {cita.estado === 'confirmada' && (
              <>
                <Button
                  variant="soft"
                  size="sm"
                  onClick={onCompletar}
                  className="!h-8 !px-3 text-[12px]"
                >
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
                  Realizada
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNoAsistio}
                  className="!h-8 !px-2.5 !text-warning text-[12px]"
                >
                  <UserX className="h-3.5 w-3.5" strokeWidth={2} />
                  No vino
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelar}
              className="!h-8 !px-2.5 !text-ink-400 hover:!text-danger ml-auto"
              aria-label="Cancelar la cita"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </Button>
          </div>
        )}
      </div>
    </motion.article>
  )
}
