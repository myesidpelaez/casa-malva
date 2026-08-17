'use client'

import * as React from 'react'
import Image from 'next/image'
import { Clock, Info, Pencil, Plus, Timer, Users, AlertTriangle, Check } from 'lucide-react'
import { toast } from 'sonner'
import { getCategoriesAction, getServicesAction, upsertServiceAction } from '@/actions/catalogo'
import { getProfessionalsAction } from '@/actions/profesionales'
import { formatCurrencyFromCents, fromCents, toCents } from '@/lib/currency'
import { REGLAS_NEGOCIO } from '@/lib/reglas'
import { categoryLook, cleanCategoryName, humanDuration, servicesOf, getProfessionalAvatar } from '@/lib/catalogo-ui'
import { cn } from '@/lib/utils'
import { AdminHeader } from '@/components/layout/AdminShell'
import { Button } from '@/components/ui/button'
import { Surface } from '@/components/ui/surface'
import { Badge } from '@/components/ui/badge'
import { Field, Toggle } from '@/components/ui/field'
import { RightDrawer } from '@/components/ui/drawer'
import { Skeleton } from '@/components/ui/skeleton'
import { RevealGroup, RevealItem } from '@/components/common/Reveal'
import type { Category, Professional, Service } from '@/types'

export default function AdminCatalogoPage() {
  const [categorias, setCategorias] = React.useState<Category[]>([])
  const [servicios, setServicios] = React.useState<Service[]>([])
  const [equipo, setEquipo] = React.useState<Professional[]>([])
  const [cargando, setCargando] = React.useState(true)

  // Drawer state
  const [drawerAbierto, setDrawerAbierto] = React.useState(false)
  const [editando, setEditando] = React.useState<Service | null>(null)
  
  // Form fields
  const [form, setForm] = React.useState({
    categoryId: 'cat_unas',
    nombre: '',
    duracionMin: 40,
    bufferMin: 10,
    precioCop: 35000,
    activo: true,
    requiereConfirmacion: false,
    assignedProfessionalIds: [] as string[],
  })
  const [guardando, setGuardando] = React.useState(false)

  const cargar = React.useCallback(async () => {
    const [c, s, p] = await Promise.all([
      getCategoriesAction(), 
      getServicesAction(),
      getProfessionalsAction()
    ])
    if (c.ok) setCategorias(c.data)
    if (s.ok) setServicios(s.data)
    if (p.ok) setEquipo(p.data)
    setCargando(false)
  }, [])

  React.useEffect(() => {
    cargar()
  }, [cargar])

  function abrirNuevo(categoryId?: string) {
    setEditando(null)
    const targetCatId = categoryId || categorias[0]?.id || 'cat_unas'
    
    // Auto-asignar a las profesionales que ya atienden servicios en esa categoría por defecto
    const svcsDeEstaCat = servicios.filter(s => s.categoryId === targetCatId).map(s => s.id)
    const profsDeEstaCat = equipo
      .filter(p => (p.serviceIds ?? []).some(id => svcsDeEstaCat.includes(id)))
      .map(p => p.id)

    setForm({
      categoryId: targetCatId,
      nombre: '',
      duracionMin: 30,
      bufferMin: 10,
      precioCop: 25000,
      activo: true,
      requiereConfirmacion: false,
      assignedProfessionalIds: profsDeEstaCat.length > 0 ? profsDeEstaCat : equipo.map(p => p.id),
    })
    setDrawerAbierto(true)
  }

  function abrirEditar(svc: Service) {
    setEditando(svc)
    
    const profsConEsteServicio = equipo
      .filter((p) => (p.serviceIds ?? []).includes(svc.id))
      .map((p) => p.id)

    setForm({
      categoryId: svc.categoryId,
      nombre: svc.nombre,
      duracionMin: svc.duracionMin,
      bufferMin: svc.bufferMin,
      precioCop: fromCents(svc.precioCentavos),
      activo: svc.activo,
      requiereConfirmacion: svc.requiereConfirmacion,
      assignedProfessionalIds: profsConEsteServicio,
    })
    setDrawerAbierto(true)
  }

  function alternarProfesional(profId: string) {
    setForm((prev) => {
      const exists = prev.assignedProfessionalIds.includes(profId)
      return {
        ...prev,
        assignedProfessionalIds: exists
          ? prev.assignedProfessionalIds.filter((id) => id !== profId)
          : [...prev.assignedProfessionalIds, profId],
      }
    })
  }

  function asignarTodoElEquipo() {
    setForm((prev) => ({
      ...prev,
      assignedProfessionalIds: equipo.map((p) => p.id),
    }))
    toast.success('Servicio asignado a todo el equipo')
  }

  function asignarEspecialistasCategoria() {
    const svcsDeEstaCat = servicios.filter(s => s.categoryId === form.categoryId).map(s => s.id)
    const profsDeEstaCat = equipo
      .filter(p => (p.serviceIds ?? []).some(id => svcsDeEstaCat.includes(id)))
      .map(p => p.id)

    setForm((prev) => ({
      ...prev,
      assignedProfessionalIds: profsDeEstaCat,
    }))
    toast.success('Asignado a las especialistas de esta categoría')
  }

  function desmarcarTodas() {
    setForm((prev) => ({
      ...prev,
      assignedProfessionalIds: [],
    }))
  }

  async function guardar() {
    if (form.nombre.trim().length < 3) {
      toast.error('El nombre del servicio debe tener al menos 3 caracteres')
      return
    }

    setGuardando(true)
    const precioCentavos = toCents(form.precioCop)

    const res = await upsertServiceAction({
      id: editando?.id,
      categoryId: form.categoryId,
      nombre: form.nombre.trim(),
      duracionMin: form.duracionMin,
      bufferMin: form.bufferMin,
      precioCentavos,
      requiereConfirmacion:
        form.requiereConfirmacion || precioCentavos > REGLAS_NEGOCIO.umbralConfirmacionCentavos,
      activo: form.activo,
      assignedProfessionalIds: form.assignedProfessionalIds,
    })
    setGuardando(false)

    if (res.ok) {
      toast.success(editando ? 'Servicio actualizado' : 'Servicio creado con éxito', {
        description: `Asignado a ${form.assignedProfessionalIds.length} profesional(es).`,
      })
      setDrawerAbierto(false)
      cargar()
    } else {
      toast.error(res.error)
    }
  }

  return (
    <div className="pb-8">
      <AdminHeader
        title="Catálogo de Servicios"
        subtitle="Precios, duraciones en silla y asignación directa de profesionales que realizan cada servicio."
      >
        <Button variant="primary" size="md" onClick={() => abrirNuevo()} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Nuevo servicio
        </Button>
      </AdminHeader>

      {cargando ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : (
        <div className="space-y-[var(--spacing-fib-4)] sm:space-y-[var(--spacing-fib-5)]">
          {categorias.map((cat) => {
            const items = servicesOf(servicios, cat)
            const look = categoryLook(cat.id)
            const Icon = look.icon

            return (
              <section key={cat.id} className="space-y-3">
                {/* Header de Categoría Responsivo */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-malva-100 pb-2.5 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', look.tile)}>
                      <Icon className="h-4 w-4" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-display text-[17px] sm:text-[18px] font-semibold text-ink-900 truncate">
                        {cleanCategoryName(cat.nombre)}
                      </h2>
                      <p className="text-[11.5px] text-ink-400">{items.length} servicios</p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => abrirNuevo(cat.id)}
                    className="text-malva-700 hover:bg-malva-50 self-start sm:self-auto text-xs sm:text-sm px-2.5 sm:px-3 py-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Añadir servicio</span>
                  </Button>
                </div>

                <RevealGroup className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((svc) => {
                    const profsQueLoPrestan = equipo.filter((p) =>
                      (p.serviceIds ?? []).includes(svc.id)
                    )
                    const tieneProfesionales = profsQueLoPrestan.length > 0

                    return (
                      <RevealItem key={svc.id} variant="pop">
                        <Surface
                          pad="md"
                          radius="lg"
                          className={cn(
                            'flex h-full flex-col justify-between transition-all group hover:shadow-[var(--shadow-malva)] p-4 sm:p-5',
                            !svc.activo && 'opacity-60',
                            !tieneProfesionales && 'border-amber-200/80 bg-amber-50/20'
                          )}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-[14.5px] sm:text-[15px] font-semibold text-ink-900 group-hover:text-malva-700 transition-colors leading-snug break-words">
                                {svc.nombre}
                              </h3>
                              <span className="tnum font-display text-[15px] sm:text-[16px] font-semibold text-malva-700 shrink-0 whitespace-nowrap">
                                {formatCurrencyFromCents(svc.precioCentavos)}
                              </span>
                            </div>

                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              <Badge tone="glass" size="sm">
                                <Clock className="h-3 w-3" strokeWidth={2} />
                                {humanDuration(svc.duracionMin)}
                              </Badge>
                              <Badge tone="neutral" size="sm">
                                <Timer className="h-3 w-3" strokeWidth={2} />
                                +{svc.bufferMin}m buffer
                              </Badge>
                              
                              {tieneProfesionales ? (
                                <Badge tone="glass" size="sm" className="bg-malva-50/60 text-malva-700 border-malva-200/50">
                                  <Users className="h-3 w-3" />
                                  {profsQueLoPrestan.length} profesional{profsQueLoPrestan.length > 1 ? 'es' : ''}
                                </Badge>
                              ) : (
                                <Badge tone="warning" size="sm" className="bg-amber-100/70 text-amber-800 border-amber-300">
                                  <AlertTriangle className="h-3 w-3" />
                                  Sin profesionales
                                </Badge>
                              )}

                              {svc.requiereConfirmacion && (
                                <Badge tone="warning" size="sm">
                                  <Info className="h-3 w-3" strokeWidth={2} />
                                  WhatsApp
                                </Badge>
                              )}
                              {!svc.activo && (
                                <Badge tone="neutral" size="sm">
                                  Desactivado
                                </Badge>
                              )}
                            </div>

                            {tieneProfesionales && (
                              <div className="mt-3 flex items-center gap-1.5 pt-2 border-t border-malva-100/60 text-[11.5px] text-ink-500">
                                <div className="flex -space-x-1.5 overflow-hidden">
                                  {profsQueLoPrestan.slice(0, 4).map((p) => {
                                    const avatar = getProfessionalAvatar(p)
                                    return (
                                      <div
                                        key={p.id}
                                        className="relative h-5 w-5 rounded-full border border-white bg-malva-100 overflow-hidden shadow-xs"
                                        title={p.nombre}
                                      >
                                        {avatar ? (
                                          <Image src={avatar} alt={p.nombre} fill sizes="20px" className="object-cover" />
                                        ) : (
                                          <span className="grid h-full w-full place-items-center text-[9px] font-semibold text-malva-700">
                                            {p.nombre.charAt(0)}
                                          </span>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                                <span className="truncate">
                                  {profsQueLoPrestan.map((p) => p.nombre.split(' ')[0]).join(', ')}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 pt-2">
                            <Button
                              variant="soft"
                              size="sm"
                              full
                              onClick={() => abrirEditar(svc)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar servicio y equipo
                            </Button>
                          </div>
                        </Surface>
                      </RevealItem>
                    )
                  })}
                </RevealGroup>
              </section>
            )
          })}
        </div>
      )}

      {/* RIGHT DRAWER: CREAR / EDITAR SERVICIO (100% RESPONSIVO) */}
      <RightDrawer
        open={drawerAbierto}
        onOpenChange={setDrawerAbierto}
        size="lg"
        title={editando ? 'Editar servicio y asignación' : 'Nuevo servicio'}
        description="Fija el precio, la duración en silla y selecciona qué profesionales pueden realizarlo."
        footer={
          <div className="flex items-center justify-end gap-2.5 sm:gap-3">
            <Button
              variant="glass"
              size="md"
              onClick={() => setDrawerAbierto(false)}
              disabled={guardando}
              className="flex-1 sm:flex-initial"
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={guardando}
              onClick={guardar}
              className="flex-1 sm:flex-initial"
            >
              {editando ? 'Guardar cambios' : 'Crear servicio'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5 sm:space-y-6">
          {/* Bloque 1: Datos del Servicio */}
          <div className="space-y-3.5 sm:space-y-4">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-malva-700">
              1. Detalles del servicio
            </h3>

            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-ink-700">
                Categoría
              </label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                className="w-full bg-white/70 backdrop-blur-sm text-ink-900 border border-ink-200/80 rounded-[var(--radius-sm)] p-2.5 text-sm focus:outline-none focus:border-malva-500 focus:bg-white"
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {cleanCategoryName(c.nombre)}
                  </option>
                ))}
              </select>
            </div>

            <Field
              label="Nombre del servicio"
              type="text"
              value={form.nombre}
              onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej. Retoque de semipermanente"
            />

            <div>
              <Field
                label="Precio en COP"
                type="number"
                step={1000}
                min={0}
                value={form.precioCop}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, precioCop: Number(e.target.value) || 0 }))
                }
                className="tnum"
              />
              <p className="mt-1 text-[11.5px] text-ink-400">
                Equivale a {formatCurrencyFromCents(toCents(form.precioCop))} en el sitio web.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Duración en silla (min)"
                type="number"
                step={5}
                min={10}
                max={480}
                value={form.duracionMin}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, duracionMin: Number(e.target.value) || 0 }))
                }
                className="tnum"
              />

              <Field
                label="Buffer / Preparación (min)"
                type="number"
                step={5}
                min={0}
                max={60}
                value={form.bufferMin}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, bufferMin: Number(e.target.value) || 0 }))
                }
                className="tnum"
              />
            </div>

            <Toggle
              label="Servicio activo"
              description="Aparecerá en el catálogo público para agendamiento."
              checked={form.activo}
              onChange={(checked) => setForm((prev) => ({ ...prev, activo: checked }))}
            />

            <Toggle
              label="Requiere confirmación previa"
              description="Si se activa, la clienta verá que la cita queda sujeta a confirmación por WhatsApp."
              checked={form.requiereConfirmacion}
              onChange={(checked) =>
                setForm((prev) => ({ ...prev, requiereConfirmacion: checked }))
              }
            />
          </div>

          {/* Bloque 2: Asignación de Profesionales */}
          <div className="space-y-4 border-t border-malva-100 pt-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-malva-700">
                  2. ¿Quiénes realizan este servicio?
                </h3>
                <p className="text-[12.5px] text-ink-500">
                  {form.assignedProfessionalIds.length} de {equipo.length} profesional(es) asignadas.
                </p>
              </div>

              {/* Atajos de asignación responsive */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={asignarEspecialistasCategoria}
                  className="rounded-md bg-malva-100 px-2 py-1 text-[11px] font-medium text-malva-800 hover:bg-malva-200 transition-colors"
                >
                  Especialistas de categoría
                </button>
                <button
                  type="button"
                  onClick={asignarTodoElEquipo}
                  className="rounded-md bg-malva-100 px-2 py-1 text-[11px] font-medium text-malva-800 hover:bg-malva-200 transition-colors"
                >
                  Todo el equipo
                </button>
                <button
                  type="button"
                  onClick={desmarcarTodas}
                  className="rounded-md bg-ink-100 px-2 py-1 text-[11px] font-medium text-ink-600 hover:bg-ink-200 transition-colors"
                >
                  Desmarcar
                </button>
              </div>
            </div>

            {form.assignedProfessionalIds.length === 0 && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-[12.5px] text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Atención:</strong> Si no asignas ninguna profesional, las clientas no podrán reservar este servicio en línea.
                </span>
              </div>
            )}

            <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2">
              {equipo.map((prof) => {
                const asignada = form.assignedProfessionalIds.includes(prof.id)
                const avatar = getProfessionalAvatar(prof)

                return (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => alternarProfesional(prof.id)}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-all touch-target',
                      asignada
                        ? 'border-malva-500 bg-white text-ink-900 shadow-sm ring-1 ring-malva-500'
                        : 'border-malva-200/60 bg-white/70 text-ink-600 hover:bg-white hover:border-malva-300 opacity-75'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-malva-200 shadow-xs">
                        {avatar ? (
                          <Image src={avatar} alt={prof.nombre} fill sizes="40px" className="object-cover" />
                        ) : (
                          <span className="grid h-full w-full place-items-center bg-malva-600 text-xs font-semibold text-white">
                            {prof.nombre.charAt(0)}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold text-ink-900 leading-tight">
                          {prof.nombre}
                        </p>
                        <p className="truncate text-[11.5px] text-ink-400">
                          {prof.cargo}
                        </p>
                      </div>
                    </div>

                    <div
                      className={cn(
                        'grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors',
                        asignada
                          ? 'border-malva-600 bg-malva-600 text-white'
                          : 'border-ink-300 bg-white'
                      )}
                    >
                      {asignada && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </RightDrawer>
    </div>
  )
}
