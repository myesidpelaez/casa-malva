import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarPlus, Clock, Info } from 'lucide-react'
import { getCategoriesAction, getServicesAction } from '@/actions/catalogo'
import { formatCurrencyFromCents } from '@/lib/currency'
import { REGLAS_NEGOCIO } from '@/lib/reglas'
import {
  categoryLook,
  cleanCategoryName,
  humanDuration,
  servicesOf,
} from '@/lib/catalogo-ui'
import { buttonClass } from '@/components/ui/button-variants'
import { Badge } from '@/components/ui/badge'
import { Surface, SectionHeading } from '@/components/ui/surface'
import { Reveal, RevealGroup, RevealItem } from '@/components/common/Reveal'
import { EmptyState } from '@/components/common/EmptyState'
import { cn } from '@/lib/utils'

export const revalidate = 0

export const metadata: Metadata = {
  title: 'Servicios y precios',
  description:
    'Catálogo completo de Casa Malva: uñas, cabello, maquillaje, cejas y pestañas. Precio y duración de cada servicio.',
}

export default async function ServiciosPage() {
  const [catRes, srvRes] = await Promise.all([getCategoriesAction(), getServicesAction()])

  const categories = (catRes.ok ? catRes.data : []).filter((c) => c.activa)
  const services = srvRes.ok ? srvRes.data : []
  const hayServicios = categories.some((c) => servicesOf(services, c).length > 0)

  return (
    <div className="mx-auto max-w-5xl px-4 py-[var(--spacing-fib-4)] sm:px-6 sm:py-[var(--spacing-fib-5)]">
      <Reveal>
        <SectionHeading
          align="center"
          eyebrow="Catálogo completo"
          title="Servicios y precios"
          subtitle="Lo que ves es lo que pagas. La duración incluye el tiempo real en la silla; el tiempo de preparación lo reserva el estudio por su cuenta."
          className="mx-auto"
        />
      </Reveal>

      {!hayServicios ? (
        <EmptyState
          className="mt-[var(--spacing-fib-4)]"
          title="El catálogo está vacío"
          description="Todavía no hay servicios publicados. El estudio los configura desde su panel."
        />
      ) : (
        <div className="mt-[var(--spacing-fib-5)] space-y-[var(--spacing-fib-5)]">
          {categories.map((cat) => {
            const catServices = servicesOf(services, cat)
            if (catServices.length === 0) return null

            const look = categoryLook(cat.id)
            const Icon = look.icon

            return (
              <section key={cat.id} id={cat.id} className="scroll-mt-24">
                <Reveal className="flex items-center gap-3 border-b border-malva-100 pb-3">
                  <span
                    className={cn('grid h-11 w-11 place-items-center rounded-[14px]', look.tile)}
                  >
                    <Icon className="h-[21px] w-[21px]" strokeWidth={1.6} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-[22px] font-semibold text-ink-900">
                      {cleanCategoryName(cat.nombre)}
                    </h2>
                    <p className="text-[12.5px] text-ink-400">{look.claim}</p>
                  </div>
                  <span className="tnum shrink-0 text-[12px] text-ink-400">
                    {catServices.length} servicios
                  </span>
                </Reveal>

                <RevealGroup className="mt-4 grid gap-3 md:grid-cols-2">
                  {catServices.map((service) => {
                    const requiereConfirmacion =
                      service.requiereConfirmacion ||
                      service.precioCentavos > REGLAS_NEGOCIO.umbralConfirmacionCentavos

                    return (
                      <RevealItem key={service.id} variant="pop">
                        <Surface
                          pad="md"
                          radius="lg"
                          className={cn(
                            'flex h-full flex-col',
                            !service.activo && 'opacity-55'
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h3
                              className={cn(
                                'text-[15px] font-semibold leading-snug text-ink-900',
                                !service.activo && 'line-through decoration-ink-300'
                              )}
                            >
                              {service.nombre}
                            </h3>
                            <span className="tnum shrink-0 font-display text-[17px] font-semibold text-malva-700">
                              {formatCurrencyFromCents(service.precioCentavos)}
                            </span>
                          </div>

                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            <Badge tone="glass" size="sm">
                              <Clock className="h-3 w-3" strokeWidth={2} />
                              {humanDuration(service.duracionMin)}
                            </Badge>

                            {requiereConfirmacion && service.activo && (
                              <Badge tone="warning" size="sm">
                                <Info className="h-3 w-3" strokeWidth={2} />
                                Confirmamos por WhatsApp
                              </Badge>
                            )}

                            {!service.activo && (
                              <Badge tone="neutral" size="sm">
                                No disponible
                              </Badge>
                            )}
                          </div>

                          <div className="mt-auto pt-4">
                            {service.activo ? (
                              <Link
                                href={`/reservar?serviceId=${service.id}`}
                                className={buttonClass({
                                  variant: 'soft',
                                  size: 'sm',
                                  full: true,
                                })}
                              >
                                <CalendarPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
                                Agendar este servicio
                              </Link>
                            ) : (
                              <p className="rounded-[var(--radius-xs)] bg-ink-50 py-2 text-center text-[12px] text-ink-400">
                                Pausado por el estudio
                              </p>
                            )}
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

      <Reveal className="mt-[var(--spacing-fib-5)]">
        <Surface material="frost" pad="md" radius="lg">
          <h3 className="text-[14px] font-semibold text-ink-900">
            Antes de reservar, dos cosas
          </h3>
          <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-500">
            <li>
              · Reservamos con un mínimo de{' '}
              <strong className="font-semibold text-ink-700">
                {REGLAS_NEGOCIO.minAntelacionMin / 60} horas
              </strong>{' '}
              de antelación y hasta {REGLAS_NEGOCIO.maxAntelacionDias} días.
            </li>
            <li>
              · Cancelar con menos de{' '}
              <strong className="font-semibold text-ink-700">
                {REGLAS_NEGOCIO.cancelacionNoShowHoras} horas
              </strong>{' '}
              queda registrado en tu ficha. Avísanos con tiempo y no pasa nada.
            </li>
          </ul>
        </Surface>
      </Reveal>
    </div>
  )
}
