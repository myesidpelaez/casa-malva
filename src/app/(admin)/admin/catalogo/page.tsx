'use client'

import * as React from 'react'
import { Clock, Info, Pencil, Plus, Timer } from 'lucide-react'
import { toast } from 'sonner'
import { getCategoriesAction, getServicesAction, upsertServiceAction } from '@/actions/catalogo'
import { formatCurrencyFromCents, fromCents, toCents } from '@/lib/currency'
import { REGLAS_NEGOCIO } from '@/lib/reglas'
import { categoryLook, cleanCategoryName, humanDuration, servicesOf } from '@/lib/catalogo-ui'
import { cn } from '@/lib/utils'
import { AdminHeader } from '@/components/layout/AdminShell'
import { Button } from '@/components/ui/button'
import { Surface } from '@/components/ui/surface'
import { Badge } from '@/components/ui/badge'
import { Field, Toggle } from '@/components/ui/field'
import { RightDrawer } from '@/components/ui/drawer'
import { Skeleton } from '@/components/ui/skeleton'
import { RevealGroup, RevealItem } from '@/components/common/Reveal'
import type { Category, Service } from '@/types'

export default function AdminCatalogoPage() {
  const [categorias, setCategorias] = React.useState<Category[]>([])
  const [servicios, setServicios] = React.useState<Service[]>([])
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
  })
  const [guardando, setGuardando] = React.useState(false)

  const cargar = React.useCallback(async () => {
    const [c, s] = await Promise.all([getCategoriesAction(), getServicesAction()])
    if (c.ok) setCategorias(c.data)
    if (s.ok) setServicios(s.data)
    setCargando(false)
  }, [])

  React.useEffect(() => {
    cargar()
  }, [cargar])

  function abrirNuevo(categoryId?: string) {
    setEditando(null)
    setForm({
      categoryId: categoryId || categorias[0]?.id || 'cat_unas',
      nombre: '',
      duracionMin: 45,
      bufferMin: 10,
      precioCop: 40000,
      activo: true,
      requiereConfirmacion: false,
    })
    setDrawerAbierto(true)
  }

  function abrirEditar(svc: Service) {
    setEditando(svc)
    setForm({
      categoryId: svc.categoryId,
      nombre: svc.nombre,
      duracionMin: svc.duracionMin,
      bufferMin: svc.bufferMin,
      precioCop: fromCents(svc.precioCentavos),
      activo: svc.activo,
      requiereConfirmacion: svc.requiereConfirmacion,
    })
    setDrawerAbierto(true)
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
    })
    setGuardando(false)

    if (res.ok) {
      toast.success(editando ? 'Servicio actualizado' : 'Servicio creado con éxito', {
        description: 'Ya está disponible en la web pública de Casa Malva.',
      })
      setDrawerAbierto(false)
      cargar()
    } else {
      toast.error(res.error)
    }
  }

  return (
    <>
      <AdminHeader
        title="Catálogo de Servicios"
        subtitle="Precios, duraciones en silla y tiempos de preparación para todas las categorías."
      >
        <Button variant="primary" size="md" onClick={() => abrirNuevo()}>
          <Plus className="h-4 w-4" />
          Nuevo servicio
        </Button>
      </AdminHeader>

      {cargando ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : (
        <div className="space-y-[var(--spacing-fib-5)]">
          {categorias.map((cat) => {
            const items = servicesOf(servicios, cat)
            const look = categoryLook(cat.id)
            const Icon = look.icon

            return (
              <section key={cat.id} className="space-y-3">
                <div className="flex items-center justify-between border-b border-malva-100 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className={cn('grid h-8 w-8 place-items-center rounded-lg', look.tile)}>
                      <Icon className="h-4 w-4" strokeWidth={1.8} />
                    </span>
                    <div>
                      <h2 className="font-display text-[18px] font-semibold text-ink-900">
                        {cleanCategoryName(cat.nombre)}
                      </h2>
                      <p className="text-[12px] text-ink-400">{items.length} servicios</p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => abrirNuevo(cat.id)}
                    className="text-malva-700 hover:bg-malva-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Añadir en {cleanCategoryName(cat.nombre)}
                  </Button>
                </div>

                <RevealGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((svc) => (
                    <RevealItem key={svc.id} variant="pop">
                      <Surface
                        pad="md"
                        radius="lg"
                        className={cn(
                          'flex h-full flex-col justify-between transition-all group hover:shadow-[var(--shadow-malva)]',
                          !svc.activo && 'opacity-60'
                        )}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-[15px] font-semibold text-ink-900 group-hover:text-malva-700 transition-colors">
                              {svc.nombre}
                            </h3>
                            <span className="tnum font-display text-[16px] font-semibold text-malva-700 shrink-0">
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
                            {svc.requiereConfirmacion && (
                              <Badge tone="warning" size="sm">
                                <Info className="h-3 w-3" strokeWidth={2} />
                                Requiere WhatsApp
                              </Badge>
                            )}
                            {!svc.activo && (
                              <Badge tone="neutral" size="sm">
                                Desactivado
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-2">
                          <Button
                            variant="soft"
                            size="sm"
                            full
                            onClick={() => abrirEditar(svc)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar servicio
                          </Button>
                        </div>
                      </Surface>
                    </RevealItem>
                  ))}
                </RevealGroup>
              </section>
            )
          })}
        </div>
      )}

      {/* ===================================================================
          RIGHT DRAWER: CREAR / EDITAR SERVICIO (CERO SCROLL)
          =================================================================== */}
      <RightDrawer
        open={drawerAbierto}
        onOpenChange={setDrawerAbierto}
        size="md"
        title={editando ? 'Editar servicio' : 'Nuevo servicio'}
        description="Fija el precio en pesos colombianos, la duración en silla y el tiempo de preparación."
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="glass"
              size="md"
              onClick={() => setDrawerAbierto(false)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={guardando}
              onClick={guardar}
            >
              {editando ? 'Guardar cambios' : 'Crear servicio'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
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
            placeholder="Ej. Balayage Golden Touch"
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

          <div className="grid grid-cols-2 gap-3">
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
            description="Si se activa, el cliente verá que la cita queda sujeta a confirmación por WhatsApp."
            checked={form.requiereConfirmacion}
            onChange={(checked) =>
              setForm((prev) => ({ ...prev, requiereConfirmacion: checked }))
            }
          />
        </div>
      </RightDrawer>
    </>
  )
}
