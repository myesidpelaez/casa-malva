'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarPlus, Clock, Info, Sparkles, Check, ChevronRight } from 'lucide-react'
import { formatCurrencyFromCents } from '@/lib/currency'
import { REGLAS_NEGOCIO } from '@/lib/reglas'
import {
  categoryLook,
  cleanCategoryName,
  humanDuration,
  getServiceImage,
  getProfessionalAvatar,
  servicesOf,
} from '@/lib/catalogo-ui'
import { buttonClass } from '@/components/ui/button-variants'
import { Badge } from '@/components/ui/badge'
import { Surface, SectionHeading } from '@/components/ui/surface'
import { Reveal, RevealGroup, RevealItem } from '@/components/common/Reveal'
import { EmptyState } from '@/components/common/EmptyState'
import { cn } from '@/lib/utils'
import type { Category, Professional, Service } from '@/types'

type Props = {
  categories: Category[]
  services: Service[]
  professionals: Professional[]
}

export function CatalogoLookbook({ categories, services, professionals }: Props) {
  // 'todas' o el id de una categoría ('cat_unas', 'cat_cabello', etc.)
  const [categoriaSeleccionada, setCategoriaSeleccionada] = React.useState<string>('todas')

  const categoriasConServicios = categories.filter((c) => servicesOf(services, c).length > 0)
  const hayServicios = categoriasConServicios.length > 0

  // Filtrado de servicios según la categoría activa
  const serviciosFiltrados = React.useMemo(() => {
    if (categoriaSeleccionada === 'todas') {
      return services.filter((s) => s.activo)
    }
    return services.filter((s) => s.categoryId === categoriaSeleccionada && s.activo)
  }, [categoriaSeleccionada, services])

  const totalServicios = services.filter((s) => s.activo).length

  return (
    <div className="mx-auto max-w-6xl px-3.5 py-[var(--spacing-fib-4)] sm:px-6 sm:py-[var(--spacing-fib-5)]">
      <Reveal>
        <SectionHeading
          align="center"
          eyebrow="Lookbook Editorial"
          title="Servicios y precios"
          subtitle="Explora nuestras especialidades con fotografía de acabados reales. Precios transparentes y duración en silla garantizada."
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
        <div className="mt-6 sm:mt-8 space-y-7 sm:space-y-10">
          
          {/* =========================================================================
              1. SELECTOR VISUAL DE CATEGORÍAS (TOCA UNA FOTO PARA FILTRAR)
             ========================================================================= */}
          <Reveal>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-malva-700">
                  Selecciona una especialidad
                </span>
                {categoriaSeleccionada !== 'todas' && (
                  <button
                    onClick={() => setCategoriaSeleccionada('todas')}
                    className="text-[12px] font-semibold text-malva-700 hover:text-malva-900 underline underline-offset-4 transition-colors"
                  >
                    Ver todas ({totalServicios})
                  </button>
                )}
              </div>

              {/* Carrusel / Grilla de Categorías con Imagen */}
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 sm:pb-0 pt-1 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4">
                {categoriasConServicios.map((cat) => {
                  const look = categoryLook(cat.id)
                  const Icon = look.icon
                  const activa = categoriaSeleccionada === cat.id
                  const conteo = servicesOf(services, cat).filter((s) => s.activo).length

                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategoriaSeleccionada(activa ? 'todas' : cat.id)}
                      className={cn(
                        'group relative flex-shrink-0 w-[160px] sm:w-auto h-[120px] sm:h-[135px] rounded-2xl overflow-hidden text-left transition-all duration-300 transform',
                        activa
                          ? 'ring-3 ring-malva-600 shadow-lg scale-[1.02]'
                          : 'ring-1 ring-black/5 hover:ring-malva-400 hover:shadow-md opacity-85 hover:opacity-100'
                      )}
                    >
                      {/* Imagen de fondo de categoría */}
                      <Image
                        src={look.image}
                        alt={cleanCategoryName(cat.nombre)}
                        fill
                        sizes="(max-width: 640px) 160px, 300px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {/* Gradiente oscuro para legibilidad */}
                      <div
                        className={cn(
                          'absolute inset-0 transition-colors duration-300',
                          activa
                            ? 'bg-gradient-to-t from-ink-950/90 via-ink-950/50 to-malva-900/30'
                            : 'bg-gradient-to-t from-ink-950/80 via-ink-950/40 to-transparent'
                        )}
                      />

                      {/* Contenido de la píldora visual */}
                      <div className="absolute inset-0 p-3 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              'grid h-7 w-7 place-items-center rounded-lg backdrop-blur-md border border-white/30 text-white',
                              activa ? 'bg-malva-600 text-white' : 'bg-black/30'
                            )}
                          >
                            <Icon className="h-4 w-4" strokeWidth={2} />
                          </span>

                          {activa && (
                            <span className="grid h-5 w-5 place-items-center rounded-full bg-malva-600 text-white shadow-xs">
                              <Check className="h-3 w-3" strokeWidth={3} />
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="font-display text-[15px] sm:text-[16px] font-semibold text-white leading-tight">
                            {cleanCategoryName(cat.nombre)}
                          </h3>
                          <p className="text-[11px] text-white/80 font-medium mt-0.5">
                            {conteo} servicio{conteo > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </Reveal>

          {/* =========================================================================
              2. GRILLA DE SERVICIOS TIPO LOOKBOOK (TARJETAS CON FOTOGRAFÍA)
             ========================================================================= */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-malva-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-malva-600" />
                <h2 className="font-display text-[20px] sm:text-[22px] font-semibold text-ink-900">
                  {categoriaSeleccionada === 'todas'
                    ? 'Todos los servicios disponibles'
                    : cleanCategoryName(
                        categories.find((c) => c.id === categoriaSeleccionada)?.nombre ?? ''
                      )}
                </h2>
              </div>
              <span className="text-[12.5px] font-semibold text-ink-500">
                {serviciosFiltrados.length} servicio{serviciosFiltrados.length > 1 ? 's' : ''}
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={categoriaSeleccionada}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              >
                {serviciosFiltrados.map((service) => {
                  const imageUrl = getServiceImage(service)
                  const profsQueLoPrestan = professionals.filter((p) =>
                    (p.serviceIds ?? []).includes(service.id)
                  )
                  const requiereConfirmacion =
                    service.requiereConfirmacion ||
                    service.precioCentavos > REGLAS_NEGOCIO.umbralConfirmacionCentavos

                  return (
                    <div
                      key={service.id}
                      className="group flex flex-col justify-between rounded-[22px] border border-malva-100 bg-white shadow-sm transition-all duration-300 hover:border-malva-300 hover:shadow-lg hover:shadow-malva-900/5 overflow-hidden"
                    >
                      {/* Cabecera con Fotografía del Servicio */}
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-malva-100">
                        <Image
                          src={imageUrl}
                          alt={service.nombre}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 via-transparent to-transparent" />

                        {/* Badges Flotantes sobre la Imagen */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 rounded-full bg-ink-950/70 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs">
                            <Clock className="h-3 w-3" strokeWidth={2} />
                            {humanDuration(service.duracionMin)}
                          </span>

                          {requiereConfirmacion && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs">
                              <Info className="h-3 w-3" />
                              WhatsApp
                            </span>
                          )}
                        </div>

                        {/* Precio en tag inferior sobre la foto */}
                        <div className="absolute bottom-3 right-3">
                          <span className="tnum inline-block rounded-xl bg-white/95 backdrop-blur-md px-3 py-1 font-display text-[16px] font-semibold text-malva-700 shadow-sm">
                            {formatCurrencyFromCents(service.precioCentavos)}
                          </span>
                        </div>
                      </div>

                      {/* Cuerpo de la Tarjeta */}
                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <h3 className="font-display text-[17px] sm:text-[18px] font-semibold text-ink-900 group-hover:text-malva-700 transition-colors leading-snug">
                            {service.nombre}
                          </h3>

                          {/* Profesionales asignadas con avatar real */}
                          {profsQueLoPrestan.length > 0 && (
                            <div className="flex items-center gap-2 pt-1">
                              <div className="flex -space-x-1.5 overflow-hidden">
                                {profsQueLoPrestan.slice(0, 3).map((p) => {
                                  const avatar = getProfessionalAvatar(p)
                                  return (
                                    <div
                                      key={p.id}
                                      className="relative h-6 w-6 rounded-full border-2 border-white bg-malva-100 overflow-hidden shadow-xs"
                                      title={p.nombre}
                                    >
                                      {avatar ? (
                                        <Image
                                          src={avatar}
                                          alt={p.nombre}
                                          fill
                                          sizes="24px"
                                          className="object-cover"
                                        />
                                      ) : (
                                        <span className="grid h-full w-full place-items-center text-[10px] font-semibold text-malva-700">
                                          {p.nombre.charAt(0)}
                                        </span>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                              <span className="text-[12px] text-ink-500 font-medium truncate">
                                {profsQueLoPrestan.map((p) => p.nombre.split(' ')[0]).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Botón de Agendamiento Directo */}
                        <div className="pt-2 border-t border-malva-100/70">
                          <Link
                            href={`/reservar?serviceId=${service.id}`}
                            className={buttonClass({
                              variant: 'primary',
                              size: 'md',
                              full: true,
                            })}
                          >
                            <CalendarPlus className="h-4 w-4" strokeWidth={1.75} />
                            Agendar cita
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Bloque Informativo de Reglas */}
      <Reveal className="mt-[var(--spacing-fib-5)]">
        <Surface material="frost" pad="md" radius="lg">
          <h3 className="text-[14px] font-semibold text-ink-900">
            Antes de reservar, dos cosas
          </h3>
          <ul className="mt-2 space-y-1.5 text-[12.5px] sm:text-[13px] leading-relaxed text-ink-500">
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
