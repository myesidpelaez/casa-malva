'use client'

import * as React from 'react'
import { Clock, Info, Pencil, Timer } from 'lucide-react'
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
import { Sheet } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { RevealGroup, RevealItem } from '@/components/common/Reveal'
import type { Category, Service } from '@/types'

/**
 * Catálogo del estudio.
 *
 * El argumento de venta del lunes está en esta pantalla: *"esto lo configuras
 * tú, no dependes de mí"*. Por eso el cambio de precio se ve reflejado en el
 * sitio público de inmediato — nada está escrito a fuego en el código.
 *
 * Spec: docs/specs/02-catalogo.md
 */
export default function AdminCatalogoPage() {
  const [categorias, setCategorias] = React.useState<Category[]>([])
  const [servicios, setServicios] = React.useState<Service[]>([])
  const [cargando, setCargando] = React.useState(true)

  const [editando, setEditando] = React.useState<Service | null>(null)
  const [form, setForm] = React.useState({
    nombre: '',
    duracionMin: 40,
    bufferMin: 10,
    precioCop: 30000,
    activo: true,
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

  function abrir(svc: Service) {
    setEditando(svc)
    setForm({
      nombre: svc.nombre,
      duracionMin: svc.duracionMin,
      bufferMin: svc.bufferMin,
      precioCop: fromCents(svc.precioCentavos),
      activo: svc.activo,
    })
  }

  async function guardar() {
    if (!editando) return
    if (form.nombre.trim().length < 3) {
      toast.error('El nombre del servicio es demasiado corto')
      return
    }

    setGuardando(true)
    const precioCentavos = toCents(form.precioCop)
    const res = await upsertServiceAction({
      id: editando.id,
      categoryId: editando.categoryId,
      nombre: form.nombre.trim(),
      duracionMin: form.duracionMin,
      bufferMin: form.bufferMin,
      precioCentavos,
      requiereConfirmacion: precioCentavos > REGLAS_NEGOCIO.umbralConfirmacionCentavos,
      activo: form.activo,
    })
    setGuardando(false)

    if (res.ok) {
      toast.success('Servicio actualizado', {
        description: 'El cambio ya se ve en el sitio público.',
      })
      setEditando(null)
      cargar()
    } else {
      toast.error(res.error)
    }
  }

  const precioCentavos = toCents(form.precioCop)
  const requiereConfirmacion = precioCentavos > REGLAS_NEGOCIO.umbralConfirmacionCentavos

  return (
    <>
      <AdminHeader
        title="Catálogo"
        subtitle="Precios, duraciones y disponibilidad. Lo que cambies aquí se ve al instante en el sitio."
      />

      {cargando ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : (
        <div className="space-y-[var(--spacing-fib-4)]">
          {categorias.map((cat) => {
            const items = servicesOf(servicios, cat)
            if (items.length === 0) return null
            const look = categoryLook(cat.id)
            const Icon = look.icon

            return (
              <section key={cat.id}>
                <div className="flex items-center gap-2.5 border-b border-malva-100 pb-2.5">
                  <span
                    className={cn('grid h-9 w-9 place-items-center rounded-[12px]', look.tile)}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                  </span>
                  <h2 className="flex-1 font-display text-[18px] font-semibold text-ink-900">
                    {cleanCategoryName(cat.nombre)}
                  </h2>
                  <span className="tnum text-[12px] text-ink-400">
                    {items.filter((s) => s.activo).length}/{items.length} activos
                  </span>
                </div>

                <RevealGroup className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((svc) => (
                    <RevealItem key={svc.id} variant="pop">
                      <Surface
                        pad="sm"
                        radius="lg"
                        className={cn('flex h-full flex-col', !svc.activo && 'opacity-60')}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-[14px] font-semibold leading-snug text-ink-900">
                            {svc.nombre}
                          </h3>
                          <Badge tone={svc.activo ? 'success' : 'neutral'} size="sm">
                            {svc.activo ? 'Activo' : 'Pausado'}
                          </Badge>
                        </div>

                        <p className="tnum mt-1.5 font-display text-[21px] font-semibold text-malva-700">
                          {formatCurrencyFromCents(svc.precioCentavos)}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge tone="glass" size="sm">
                            <Clock className="h-3 w-3" strokeWidth={2} />
                            {humanDuration(svc.duracionMin)}
                          </Badge>
                          <Badge tone="glass" size="sm">
                            <Timer className="h-3 w-3" strokeWidth={2} />
                            +{svc.bufferMin} min
                          </Badge>
                        </div>

                        <div className="mt-auto pt-3">
                          <Button variant="glass" size="sm" full onClick={() => abrir(svc)}>
                            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                            Editar
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

      {/* ---------- Editor ---------- */}
      <Sheet
        open={!!editando}
        onOpenChange={(abierto) => !abierto && setEditando(null)}
        title="Editar servicio"
        description="El precio de las citas ya agendadas no cambia: se congeló al reservar."
        footer={
          <div className="flex gap-2">
            <Button variant="glass" full onClick={() => setEditando(null)} disabled={guardando}>
              Cancelar
            </Button>
            <Button full loading={guardando} loadingText="Guardando…" onClick={guardar}>
              Guardar cambios
            </Button>
          </div>
        }
      >
        <div className="space-y-[var(--spacing-fib-2)]">
          <Field
            label="Nombre del servicio"
            required
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          />

          <Field
            label="Precio"
            required
            type="number"
            min={0}
            step={1000}
            inputMode="numeric"
            suffix="COP"
            value={form.precioCop}
            onChange={(e) =>
              setForm((f) => ({ ...f, precioCop: parseInt(e.target.value, 10) || 0 }))
            }
            hint={`Se mostrará como ${formatCurrencyFromCents(precioCentavos)}`}
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Duración"
              required
              type="number"
              min={10}
              step={5}
              inputMode="numeric"
              suffix="min"
              value={form.duracionMin}
              onChange={(e) =>
                setForm((f) => ({ ...f, duracionMin: parseInt(e.target.value, 10) || 0 }))
              }
            />
            <Field
              label="Preparación"
              required
              type="number"
              min={0}
              step={5}
              inputMode="numeric"
              suffix="min"
              value={form.bufferMin}
              onChange={(e) =>
                setForm((f) => ({ ...f, bufferMin: parseInt(e.target.value, 10) || 0 }))
              }
            />
          </div>

          <Surface material="solid" radius="md" pad="sm" className="space-y-2">
            <p className="text-[12.5px] leading-relaxed text-ink-500">
              La agenda bloquea{' '}
              <strong className="font-semibold text-ink-900">
                {humanDuration(form.duracionMin + form.bufferMin)}
              </strong>{' '}
              por cada cita: {form.duracionMin} min de servicio y {form.bufferMin} de
              limpieza y preparación. Sin ese margen, el estudio se atrasa a media
              mañana.
            </p>
          </Surface>

          {requiereConfirmacion && (
            <div className="flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-warning/25 bg-warning-soft px-3.5 py-3 text-[12.5px] leading-relaxed text-warning">
              <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              <p>
                Por encima de{' '}
                {formatCurrencyFromCents(REGLAS_NEGOCIO.umbralConfirmacionCentavos)} las
                reservas quedan <strong>por confirmar</strong> hasta que alguien del
                estudio las apruebe. El agente nunca bloquea sola una cita de este valor.
              </p>
            </div>
          )}

          <div className="border-t border-malva-100 pt-3">
            <Toggle
              label="Visible en el catálogo"
              description="Al apagarlo desaparece del sitio público y nadie puede reservarlo."
              checked={form.activo}
              onChange={(activo) => setForm((f) => ({ ...f, activo }))}
            />
          </div>
        </div>
      </Sheet>
    </>
  )
}
