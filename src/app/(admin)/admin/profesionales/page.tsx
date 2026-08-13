'use client'

import * as React from 'react'
import {
  Check,
  CheckCheck,
  Clock,
  Pencil,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { getProfessionalsAction, updateProfessionalAction } from '@/actions/profesionales'
import { getCategoriesAction, getServicesAction } from '@/actions/catalogo'
import { categoryLook } from '@/lib/catalogo-ui'
import { cn } from '@/lib/utils'
import { AdminHeader } from '@/components/layout/AdminShell'
import { Button } from '@/components/ui/button'
import { Surface } from '@/components/ui/surface'
import { Badge } from '@/components/ui/badge'
import { Field, Toggle } from '@/components/ui/field'
import { Sheet } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { RevealGroup, RevealItem } from '@/components/common/Reveal'
import type { Category, Professional, ProfessionalSchedule, Service } from '@/types'

const DIAS: Array<{ n: number; largo: string; corto: string }> = [
  { n: 1, largo: 'Lunes', corto: 'Lun' },
  { n: 2, largo: 'Martes', corto: 'Mar' },
  { n: 3, largo: 'Miércoles', corto: 'Mié' },
  { n: 4, largo: 'Jueves', corto: 'Jue' },
  { n: 5, largo: 'Viernes', corto: 'Vie' },
  { n: 6, largo: 'Sábado', corto: 'Sáb' },
]

/**
 * Equipo del estudio.
 *
 * Aquí es donde la demo se gana la frase *"esto sí entiende mi negocio"*: no
 * todas hacen todo, y no todas trabajan los mismos días. Esa restricción es lo
 * que hace que la disponibilidad sea un problema real (DISENO.md §4).
 *
 * Spec: docs/specs/03-profesionales.md
 */
export default function AdminProfesionalesPage() {
  const [equipo, setEquipo] = React.useState<Professional[]>([])
  const [servicios, setServicios] = React.useState<Service[]>([])
  const [categorias, setCategorias] = React.useState<Category[]>([])
  const [cargando, setCargando] = React.useState(true)

  const [editando, setEditando] = React.useState<Professional | null>(null)
  const [nombre, setNombre] = React.useState('')
  const [rol, setRol] = React.useState('')
  const [serviceIds, setServiceIds] = React.useState<string[]>([])
  const [horario, setHorario] = React.useState<ProfessionalSchedule>({})
  const [activo, setActivo] = React.useState(true)
  const [guardando, setGuardando] = React.useState(false)

  const cargar = React.useCallback(async () => {
    const [p, s, c] = await Promise.all([
      getProfessionalsAction(),
      getServicesAction(),
      getCategoriesAction(),
    ])
    if (p.ok) setEquipo(p.data)
    if (s.ok) setServicios(s.data)
    if (c.ok) setCategorias(c.data)
    setCargando(false)
  }, [])

  React.useEffect(() => {
    cargar()
  }, [cargar])

  function abrir(prof: Professional) {
    setEditando(prof)
    setNombre(prof.nombre)
    setRol(prof.rol)
    setServiceIds(prof.serviceIds ?? [])
    setHorario(prof.horario ?? {})
    setActivo(prof.activo)
  }

  function alternarDia(dia: number) {
    setHorario((prev) => {
      const next = { ...prev }
      if (next[dia]) delete next[dia]
      else next[dia] = [9, 18]
      return next
    })
  }

  function cambiarHora(dia: number, indice: 0 | 1, valor: number) {
    setHorario((prev) => {
      const actual = prev[dia] ?? [9, 18]
      const next: [number, number] = [...actual] as [number, number]
      next[indice] = valor
      return { ...prev, [dia]: next }
    })
  }

  function aplicarHorarioEstandar(tipo: 'lun_sab' | 'lun_vie') {
    const nuevo: ProfessionalSchedule = {}
    const maxDia = tipo === 'lun_sab' ? 6 : 5
    for (let i = 1; i <= maxDia; i++) {
      nuevo[i] = [9, 18]
    }
    setHorario(nuevo)
    toast.success(`Horario 9:00–18:00 aplicado (${tipo === 'lun_sab' ? 'Lun–Sáb' : 'Lun–Vie'})`)
  }

  function alternarServicio(serviceId: string) {
    setServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    )
  }

  function toggleCategoriaServicios(catId: string, svcsCat: Service[]) {
    const svcsIds = svcsCat.map((s) => s.id)
    const todosSeleccionados = svcsIds.every((id) => serviceIds.includes(id))

    if (todosSeleccionados) {
      // Desmarcar todos los de la categoría
      setServiceIds((prev) => prev.filter((id) => !svcsIds.includes(id)))
    } else {
      // Marcar todos los de la categoría
      setServiceIds((prev) => Array.from(new Set([...prev, ...svcsIds])))
    }
  }

  async function guardar() {
    if (!editando) return
    if (nombre.trim().length < 2) {
      toast.error('El nombre es demasiado corto')
      return
    }

    // Una franja invertida deja al profesional sin horas y sin explicación.
    const invertido = Object.entries(horario).find(([, [inicio, fin]]) => fin <= inicio)
    if (invertido) {
      const dia = DIAS.find((d) => d.n === Number(invertido[0]))
      toast.error(`La salida del ${dia?.largo.toLowerCase()} debe ser después de la entrada`)
      return
    }

    setGuardando(true)
    const res = await updateProfessionalAction({
      id: editando.id,
      nombre: nombre.trim(),
      rol: rol.trim(),
      serviceIds,
      horario,
      activo,
    })
    setGuardando(false)

    if (res.ok) {
      toast.success('Equipo actualizado', {
        description: 'La disponibilidad se recalcula sola en la próxima consulta.',
      })
      setEditando(null)
      cargar()
    } else {
      toast.error(res.error)
    }
  }

  return (
    <>
      <AdminHeader
        title="Equipo"
        subtitle="Quién hace qué y en qué horario. La agenda solo ofrece lo que aquí esté habilitado."
      />

      {cargando ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : (
        <RevealGroup className="grid gap-3 md:grid-cols-2">
          {equipo.map((prof) => (
            <RevealItem key={prof.id} variant="pop">
              <Surface
                pad="md"
                radius="lg"
                className={cn('flex h-full flex-col', !prof.activo && 'opacity-60')}
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-malva-500 to-malva-700 font-display text-lg font-semibold text-white shadow-[var(--shadow-malva)]">
                    {prof.nombre.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-[17px] font-semibold text-ink-900">
                      {prof.nombre}
                    </h2>
                    <p className="truncate text-[12.5px] text-ink-500">{prof.rol}</p>
                  </div>
                  <Badge tone={prof.activo ? 'success' : 'neutral'} size="sm">
                    {prof.activo ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>

                {/* Horario en línea: se lee de un vistazo qué días libra */}
                <div className="mt-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                    Horario
                  </p>
                  <div className="mt-1.5 flex gap-1">
                    {DIAS.map((d) => {
                      const franja = prof.horario?.[d.n]
                      return (
                        <div
                          key={d.n}
                          title={
                            franja
                              ? `${d.largo}: ${franja[0]}:00–${franja[1]}:00`
                              : `${d.largo}: libre`
                          }
                          className={cn(
                            'flex-1 rounded-[var(--radius-xs)] px-1 py-1.5 text-center',
                            franja ? 'bg-malva-100 text-malva-700' : 'bg-ink-50 text-ink-300'
                          )}
                        >
                          <span className="block text-[10px] font-semibold">{d.corto}</span>
                          <span className="tnum block text-[9.5px]">
                            {franja ? `${franja[0]}–${franja[1]}` : '—'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                    Servicios ({prof.serviceIds?.length ?? 0})
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(prof.serviceIds ?? []).slice(0, 6).map((sid) => (
                      <Badge key={sid} tone="glass" size="sm">
                        {servicios.find((s) => s.id === sid)?.nombre ?? sid}
                      </Badge>
                    ))}
                    {(prof.serviceIds ?? []).slice(0, 6).length < (prof.serviceIds?.length ?? 0) && (
                      <Badge tone="neutral" size="sm">
                        +{(prof.serviceIds?.length ?? 0) - 6}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-4">
                  <Button variant="glass" size="sm" full onClick={() => abrir(prof)}>
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Editar
                  </Button>
                </div>
              </Surface>
            </RevealItem>
          ))}
        </RevealGroup>
      )}

      {/* ---------- Editor ---------- */}
      <Sheet
        open={!!editando}
        onOpenChange={(abierto) => !abierto && setEditando(null)}
        title="Editar profesional"
        description="Los cambios afectan a las citas futuras. Las ya agendadas se respetan."
        size="lg"
        footer={
          <div className="flex gap-2.5 sm:gap-3">
            <Button
              variant="glass"
              size="lg"
              className="h-11 flex-1 sm:h-10"
              onClick={() => setEditando(null)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button
              size="lg"
              className="h-11 flex-1 sm:h-10"
              loading={guardando}
              loadingText="Guardando…"
              onClick={guardar}
            >
              Guardar cambios
            </Button>
          </div>
        }
      >
        <div className="space-y-[var(--spacing-fib-3)] pb-4">
          {/* Datos básicos */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Valentina Ruiz"
            />
            <Field
              label="Rol"
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              placeholder="Ej: Manicurista sénior"
            />
          </div>

          {/* Horario semanal */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-malva-600" />
                <p className="text-[13px] font-semibold text-ink-900">Horario semanal</p>
              </div>
              {/* Atajos rápidos */}
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-ink-400">Estándar:</span>
                <button
                  type="button"
                  onClick={() => aplicarHorarioEstandar('lun_sab')}
                  className="rounded px-1.5 py-0.5 font-medium text-malva-700 bg-malva-50 hover:bg-malva-100 transition-colors"
                >
                  Lun–Sáb
                </button>
                <button
                  type="button"
                  onClick={() => aplicarHorarioEstandar('lun_vie')}
                  className="rounded px-1.5 py-0.5 font-medium text-malva-700 bg-malva-50 hover:bg-malva-100 transition-colors"
                >
                  Lun–Vie
                </button>
              </div>
            </div>

            <div className="space-y-2 rounded-[var(--radius-md)] border border-ink-100 bg-white/70 p-2.5 sm:p-3">
              {DIAS.map((d) => {
                const franja = horario[d.n]
                const trabaja = !!franja

                return (
                  <div
                    key={d.n}
                    className={cn(
                      'rounded-[var(--radius-sm)] border p-2 transition-all sm:flex sm:items-center sm:gap-3 sm:border-0 sm:p-1.5',
                      trabaja
                        ? 'border-malva-200/80 bg-malva-50/40 sm:bg-transparent'
                        : 'border-ink-100/70 bg-ink-50/40 sm:bg-transparent'
                    )}
                  >
                    {/* Botón de estado del día */}
                    <div className="flex items-center justify-between sm:justify-start">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={trabaja}
                        onClick={() => alternarDia(d.n)}
                        className={cn(
                          'flex items-center gap-2 rounded-[var(--radius-xs)] px-2.5 py-1.5 text-[13px] font-semibold transition-colors sm:w-[110px] sm:shrink-0 sm:px-2 sm:py-1.5 sm:text-[12.5px]',
                          trabaja
                            ? 'bg-malva-100 text-malva-700'
                            : 'bg-ink-100 text-ink-500 hover:bg-ink-200'
                        )}
                      >
                        <span
                          className={cn(
                            'grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border transition-colors',
                            trabaja
                              ? 'border-malva-600 bg-malva-600 text-white'
                              : 'border-ink-300 bg-white text-transparent'
                          )}
                        >
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                        {d.largo}
                      </button>

                      {/* En móvil: indicador cuando libra */}
                      {!trabaja && (
                        <span className="text-[12px] font-medium text-ink-400 sm:hidden">
                          Día libre
                        </span>
                      )}
                    </div>

                    {/* Selectores de hora: En móvil van en 2 columnas claras con label */}
                    {trabaja ? (
                      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:mt-0 sm:flex sm:flex-1 sm:items-center sm:gap-2">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 sm:hidden">
                            Entrada
                          </span>
                          <HoraSelect
                            label={`Entrada ${d.largo}`}
                            value={franja[0]}
                            desde={6}
                            hasta={20}
                            onChange={(v) => cambiarHora(d.n, 0, v)}
                          />
                        </div>
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 sm:hidden">
                            Salida
                          </span>
                          <HoraSelect
                            label={`Salida ${d.largo}`}
                            value={franja[1]}
                            desde={7}
                            hasta={22}
                            onChange={(v) => cambiarHora(d.n, 1, v)}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="hidden flex-1 text-[12px] text-ink-300 sm:block">
                        Día libre
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-[11.5px] text-ink-400">
              Los domingos el estudio permanece cerrado para todo el equipo.
            </p>
          </div>

          {/* Servicios habilitados (Agrupados por categoría, sin scroll trap) */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between border-b border-ink-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-malva-600" />
                <p className="text-[13px] font-semibold text-ink-900">Servicios que realiza</p>
              </div>
              <Badge tone={serviceIds.length > 0 ? 'primary' : 'neutral'} size="sm">
                {serviceIds.length} de {servicios.length} activos
              </Badge>
            </div>

            {/* Listado agrupado por categorías */}
            <div className="space-y-4">
              {categorias.map((cat) => {
                const svcsCat = servicios.filter((s) => s.categoryId === cat.id)
                if (svcsCat.length === 0) return null

                const look = categoryLook(cat.id)
                const Icon = look.icon
                const marcadosCat = svcsCat.filter((s) => serviceIds.includes(s.id))
                const todosCat = marcadosCat.length === svcsCat.length

                return (
                  <div
                    key={cat.id}
                    className="rounded-[var(--radius-md)] border border-ink-100 bg-white/60 p-3"
                  >
                    {/* Encabezado de la categoría */}
                    <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-ink-100/60 pb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            'grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs',
                            look.tile
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                        </span>
                        <h4 className="truncate text-[13px] font-semibold text-ink-900">
                          {cat.nombre}
                        </h4>
                        <span className="text-[11.5px] text-ink-400">
                          ({marcadosCat.length}/{svcsCat.length})
                        </span>
                      </div>

                      {/* Botón rápido por categoría */}
                      <button
                        type="button"
                        onClick={() => toggleCategoriaServicios(cat.id, svcsCat)}
                        className="shrink-0 text-[11.5px] font-medium text-malva-700 hover:text-malva-900 transition-colors"
                      >
                        {todosCat ? 'Desmarcar' : 'Marcar todos'}
                      </button>
                    </div>

                    {/* Chips de servicios */}
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {svcsCat.map((s) => {
                        const marcado = serviceIds.includes(s.id)
                        return (
                          <button
                            key={s.id}
                            type="button"
                            role="checkbox"
                            aria-checked={marcado}
                            onClick={() => alternarServicio(s.id)}
                            className={cn(
                              'flex min-h-[44px] w-full items-center gap-2.5 rounded-[var(--radius-xs)] border px-3 py-2 text-left text-[12.5px] transition-all',
                              marcado
                                ? 'border-malva-400/80 bg-malva-100/60 font-semibold text-malva-900 shadow-xs'
                                : 'border-ink-100 bg-white text-ink-600 hover:border-ink-200 hover:bg-ink-50/50'
                            )}
                          >
                            <span
                              className={cn(
                                'grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border transition-colors',
                                marcado
                                  ? 'border-malva-600 bg-malva-600 text-white'
                                  : 'border-ink-300 bg-white text-transparent'
                              )}
                            >
                              <Check className="h-3 w-3" strokeWidth={3} />
                            </span>
                            <span className="flex-1 truncate">{s.nombre}</span>
                            {!s.activo && (
                              <Badge tone="neutral" size="sm" className="ml-1 shrink-0 text-[10px]">
                                pausado
                              </Badge>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Toggle de estado activo */}
          <div className="rounded-[var(--radius-md)] border border-ink-100 bg-white/70 p-3">
            <Toggle
              label="Disponible para agendar"
              description="Al apagarlo deja de aparecer en el sitio público. Sus citas ya agendadas siguen en la agenda."
              checked={activo}
              onChange={setActivo}
            />
          </div>
        </div>
      </Sheet>
    </>
  )
}

function HoraSelect({
  label,
  value,
  desde,
  hasta,
  onChange,
}: {
  label: string
  value: number
  desde: number
  hasta: number
  onChange: (v: number) => void
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      className="tnum h-11 w-full rounded-[var(--radius-xs)] border border-ink-200 bg-white px-2.5 text-[13px] font-semibold text-ink-900 focus:border-malva-500 focus:outline-none sm:h-9 sm:text-[12.5px]"
    >
      {Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i).map((h) => (
        <option key={h} value={h}>
          {String(h).padStart(2, '0')}:00
        </option>
      ))}
    </select>
  )
}
