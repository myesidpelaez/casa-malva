"use client"

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarPlus,
  Clock,
  Info,
  Sparkles,
  Check,
  ShieldCheck,
} from 'lucide-react'
import { formatCurrencyFromCents } from '@/lib/currency'
import { REGLAS_NEGOCIO } from '@/lib/reglas'
import {
  categoryLook,
  cleanCategoryName,
  humanDuration,
  getServiceImage,
  getProfessionalAvatar,
  getSpecialistsForCategory,
  servicesOf,
} from '@/lib/catalogo-ui'
import { buttonClass } from '@/components/ui/button-variants'
import { Surface } from '@/components/ui/surface'
import { TituloEditorial } from '@/components/brand'
import { EmptyState } from '@/components/common/EmptyState'
import { Reveal } from '@/components/common/Reveal'
import { cn } from '@/lib/utils'
import { InstagramIcon, FacebookIcon, TikTokIcon } from '@/components/icons/SocialIcons'
import { REDES_SOCIALES } from '@/lib/brand'
import type { Category, Professional, Service } from '@/types'


type Props = {
  categories: Category[]
  services: Service[]
  professionals: Professional[]
  estado?: React.ReactNode
}

export function CatalogoLookbook({ categories, services, professionals, estado }: Props) {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = React.useState<string>('todas')

  const categoriasConServicios = React.useMemo(
    () => categories.filter((c) => servicesOf(services, c).length > 0),
    [categories, services]
  )
  const hayServicios = categoriasConServicios.length > 0

  const serviciosFiltrados = React.useMemo(() => {
    if (categoriaSeleccionada === 'todas') {
      return services.filter((s) => s.activo)
    }
    return services.filter((s) => s.categoryId === categoriaSeleccionada && s.activo)
  }, [categoriaSeleccionada, services])

  const totalServicios = services.filter((s) => s.activo).length
  const categoriaActivaObj = categories.find((c) => c.id === categoriaSeleccionada)

  return (
    <div className="relative overflow-hidden">
      {/* =========================================================================
          ATMÓSFERA Y AURORA ORGÁNICA DE FONDO (SUAVE, FEMENINA, DE ALTA COSTURA)
         ========================================================================= */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[450px] w-[800px] rounded-full bg-gradient-to-br from-malva-200/35 via-blush/25 to-champagne/20 blur-[110px] dark:from-malva-950/40 dark:via-malva-900/20 dark:to-transparent" />
        <div className="absolute top-[600px] -right-32 h-[500px] w-[500px] rounded-full bg-gradient-to-bl from-malva-300/20 via-blush/20 to-transparent blur-[120px] dark:from-malva-900/15 dark:to-transparent" />
        <div className="absolute top-[1200px] -left-32 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-champagne/25 via-malva-200/20 to-transparent blur-[120px] dark:from-malva-950/20 dark:to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-8 py-[var(--spacing-fib-4)] sm:py-[var(--spacing-fib-5)]">
        
        {/* =========================================================================
            1. CABECERA EDITORIAL Y REDES SOCIALES
           ========================================================================= */}
        <Reveal className="flex flex-col items-center text-center">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {estado}
            
            {/* Canales Oficiales Redes Sociales */}
            <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-malva-200/80 bg-[var(--card)]/90 px-3 py-1.5 shadow-xs backdrop-blur-md">
              <span className="text-[11.5px] font-semibold text-ink-500 mr-1">Síguenos:</span>
              <a
                href={REDES_SOCIALES.instagram.url}
                target="_blank"
                rel="noreferrer"
                aria-label={REDES_SOCIALES.instagram.label}
                className="grid h-6 w-6 place-items-center rounded-full bg-malva-50 hover:bg-malva-100 text-malva-700 transition-colors"
                title={`Instagram ${REDES_SOCIALES.instagram.handle}`}
              >
                <InstagramIcon className="h-3.5 w-3.5" />
              </a>
              <a
                href={REDES_SOCIALES.tiktok.url}
                target="_blank"
                rel="noreferrer"
                aria-label={REDES_SOCIALES.tiktok.label}
                className="grid h-6 w-6 place-items-center rounded-full bg-malva-50 hover:bg-malva-100 text-malva-700 transition-colors"
                title={`TikTok ${REDES_SOCIALES.tiktok.handle}`}
              >
                <TikTokIcon className="h-3.5 w-3.5" />
              </a>
              <a
                href={REDES_SOCIALES.facebook.url}
                target="_blank"
                rel="noreferrer"
                aria-label={REDES_SOCIALES.facebook.label}
                className="grid h-6 w-6 place-items-center rounded-full bg-malva-50 hover:bg-malva-100 text-malva-700 transition-colors"
                title={`Facebook ${REDES_SOCIALES.facebook.handle}`}
              >
                <FacebookIcon className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <TituloEditorial
            as="h1"
            size="seccion"
            resalte="en manos expertas."
            className="mt-4"
          >
            El arte del cuidado,
          </TituloEditorial>
          <p className="mt-4 max-w-2xl text-[16px] sm:text-[18px] leading-relaxed text-ink-600 font-sans">
            Cada ritual es una experiencia personalizada realizada por especialistas
            apasionadas por realzar tu bienestar, con técnicas de alta precisión y cosmética botánica.
          </p>
        </Reveal>

        {!hayServicios ? (
          <EmptyState
            className="mt-[var(--spacing-fib-4)]"
            title="El catálogo está vacío"
            description="Todavía no hay servicios publicados. El estudio los configura desde su panel."
          />
        ) : (
          <div className="mt-8 sm:mt-12 space-y-9 sm:space-y-14">
            
            {/* =========================================================================
                2. SELECTOR VISUAL DE ESPECIALIDADES (CARDS AMPLIADAS)
               ========================================================================= */}
            <Reveal>
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-malva-700">
                      Selecciona una especialidad
                    </span>
                    <span className="text-[11.5px] text-ink-400">· Toca para filtrar</span>
                  </div>
                  {categoriaSeleccionada !== 'todas' ? (
                    <button
                      onClick={() => setCategoriaSeleccionada('todas')}
                      className="text-[12.5px] font-semibold text-malva-700 hover:text-malva-900 underline underline-offset-4 transition-colors cursor-pointer"
                    >
                      Ver todas ({totalServicios})
                    </button>
                  ) : (
                    <span className="text-[12px] font-medium text-ink-500 hidden sm:inline">
                      {totalServicios} servicios en catálogo
                    </span>
                  )}
                </div>

                {/* Rejilla de 4 columnas en desktop / carrusel horizontal en móvil */}
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 sm:pb-0 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4">
                  {categoriasConServicios.map((cat) => {
                    const look = categoryLook(cat.id)
                    const activa = categoriaSeleccionada === cat.id
                    const conteo = servicesOf(services, cat).filter((s) => s.activo).length
                    const especialistas = getSpecialistsForCategory(professionals, cat, services)

                    return (
                      <button
                        key={cat.id}
                        onClick={() => setCategoriaSeleccionada(activa ? 'todas' : cat.id)}
                        className={cn(
                          'group relative flex flex-col text-left rounded-[22px] overflow-hidden transition-all duration-300 cursor-pointer',
                          'bg-[var(--card)] border',
                          activa
                            ? 'border-malva-500 ring-2 ring-malva-600/90 shadow-xl shadow-malva-900/10 scale-[1.01]'
                            : 'border-ink-200/80 hover:border-malva-300 hover:shadow-md hover:shadow-malva-900/5 hover:-translate-y-0.5',
                          'flex-shrink-0 w-[240px] sm:w-auto'
                        )}
                      >
                        {/* Fotografía limpia de la especialidad */}
                        <div className="relative aspect-[16/11] sm:aspect-[4/3] w-full overflow-hidden bg-malva-100">
                          <Image
                            src={look.image}
                            alt={cleanCategoryName(cat.nombre)}
                            fill
                            sizes="(max-width: 640px) 240px, 320px"
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                          {activa && (
                            <div className="absolute top-2.5 right-2.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-malva-700/90 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm border border-white/20">
                                <Check className="h-3 w-3" strokeWidth={2.8} />
                                Activa
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Bloque Informativo de la Card */}
                        <div className="p-4 flex flex-col justify-between flex-1 space-y-3 bg-[var(--card)]">
                          <div>
                            <h3 className="font-display text-[17px] sm:text-[18px] font-semibold text-ink-900 group-hover:text-malva-700 transition-colors leading-tight">
                              {cleanCategoryName(cat.nombre)}
                            </h3>
                            <p className="text-[12px] font-medium text-ink-500 mt-1">
                              {conteo} servicio{conteo > 1 ? 's' : ''} disponibles
                            </p>
                          </div>

                          {/* Especialistas asignadas */}
                          {especialistas.length > 0 && (
                            <div className="pt-2.5 border-t border-ink-100/90 flex items-center gap-2">
                              <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                                {especialistas.slice(0, 3).map((prof) => {
                                  const avatar = getProfessionalAvatar(prof)
                                  return (
                                    <div
                                      key={prof.id}
                                      className="relative h-6 w-6 rounded-full border-2 border-[var(--card)] bg-malva-100 overflow-hidden shadow-2xs"
                                      title={`${prof.nombre} (${prof.cargo || 'Especialista'})`}
                                    >
                                      {avatar ? (
                                        <Image
                                          src={avatar}
                                          alt={prof.nombre}
                                          fill
                                          sizes="24px"
                                          className="object-cover"
                                        />
                                      ) : (
                                        <span className="grid h-full w-full place-items-center text-[10px] font-bold text-malva-700">
                                          {prof.nombre.charAt(0)}
                                        </span>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                              <span className="text-[11.5px] font-medium text-ink-600 truncate">
                                {especialistas.map((p) => p.nombre.split(' ')[0]).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </Reveal>

            {/* =========================================================================
                3. GRILLA DE SERVICIOS (TARJETAS REDISEÑADAS, FOTO LIMPIA Y METADATOS INTEGRADOS)
               ========================================================================= */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-malva-100/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-5 w-5 text-malva-600" />
                  <h2 className="font-display text-[21px] sm:text-[23px] font-semibold text-ink-900">
                    {categoriaSeleccionada === 'todas'
                      ? 'Todos los servicios de autor'
                      : `Especialidad: ${cleanCategoryName(categoriaActivaObj?.nombre ?? '')}`}
                  </h2>
                </div>
                <span className="text-[13px] font-semibold text-ink-500">
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
                  className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
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
                        className="group flex flex-col justify-between rounded-[22px] border border-ink-200/80 bg-[var(--card)] shadow-xs transition-all duration-300 hover:border-malva-300 hover:shadow-xl hover:shadow-malva-900/10 overflow-hidden"
                      >
                        {/* Cabecera con Fotografía 100% Limpia (sin badges flotantes) */}
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-malva-100">
                          <Image
                            src={imageUrl}
                            alt={service.nombre}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-40 group-hover:opacity-20 transition-opacity" />
                        </div>

                        {/* Cuerpo de la Tarjeta con Metadatos Integrados */}
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-3">
                            {/* Fila 1: Título y Precio */}
                            <div className="flex items-start justify-between gap-2.5">
                              <h3 className="font-display text-[18px] sm:text-[19px] font-semibold text-ink-900 group-hover:text-malva-700 transition-colors leading-snug">
                                {service.nombre}
                              </h3>
                              <span className="tnum font-display text-[18px] sm:text-[19px] font-bold text-malva-700 dark:text-malva-300 shrink-0">
                                {formatCurrencyFromCents(service.precioCentavos)}
                              </span>
                            </div>

                            {/* Fila 2: Duración y Badge de Confirmación si aplica */}
                            <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-500 font-medium">
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-ink-100/70 px-2 py-0.5 text-ink-700">
                                <Clock className="h-3.5 w-3.5 text-malva-600 shrink-0" strokeWidth={2} />
                                {humanDuration(service.duracionMin)}
                              </span>

                              {requiereConfirmacion && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11.5px] font-semibold text-amber-700 dark:text-amber-300">
                                  <Info className="h-3 w-3 shrink-0" />
                                  Confirmación previa
                                </span>
                              )}
                            </div>

                            {/* Fila 3: Profesionales asignadas con avatar real */}
                            {profsQueLoPrestan.length > 0 && (
                              <div className="flex items-center gap-2 pt-2 border-t border-ink-100/80 dark:border-ink-800/80">
                                <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                                  {profsQueLoPrestan.slice(0, 3).map((p) => {
                                    const avatar = getProfessionalAvatar(p)
                                    return (
                                      <div
                                        key={p.id}
                                        className="relative h-6 w-6 rounded-full border-2 border-[var(--card)] bg-malva-100 overflow-hidden shadow-2xs"
                                        title={`${p.nombre} (${p.cargo || 'Especialista'})`}
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
                                          <span className="grid h-full w-full place-items-center text-[10px] font-bold text-malva-700">
                                            {p.nombre.charAt(0)}
                                          </span>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                                <span className="text-[12px] text-ink-600 font-medium truncate">
                                  {profsQueLoPrestan.map((p) => p.nombre.split(' ')[0]).join(', ')}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Botón de Agendamiento Directo (Ancho Completo, Cero Espacio Muerto) */}
                          <div className="pt-2">
                            <Link
                              href={`/reservar?serviceId=${service.id}`}
                              className={buttonClass({
                                variant: 'primary',
                                size: 'lg',
                                full: true,
                              })}
                            >
                              <CalendarPlus className="h-4.5 w-4.5" strokeWidth={1.75} />
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

        {/* =========================================================================
            4. BLOQUE INFORMATIVO DE REGLAS DE RESERVA
           ========================================================================= */}
        <Reveal className="mt-[var(--spacing-fib-5)]">
          <Surface material="frost" pad="lg" radius="xl" className="border border-malva-200/60 dark:border-ink-800">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-malva-700 shrink-0" />
              <h3 className="text-[15px] font-semibold text-ink-900">
                Garantías y Políticas de tu Reserva
              </h3>
            </div>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-[13px] leading-relaxed text-ink-600">
              <li className="flex items-start gap-2">
                <span className="text-malva-600 font-bold">·</span>
                <span>
                  Reservamos con un mínimo de{' '}
                  <strong className="font-semibold text-ink-800">
                    {REGLAS_NEGOCIO.minAntelacionMin / 60} horas
                  </strong>{' '}
                  de antelación y hasta {REGLAS_NEGOCIO.maxAntelacionDias} días a futuro.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-malva-600 font-bold">·</span>
                <span>
                  Cancelaciones con menos de{' '}
                  <strong className="font-semibold text-ink-800">
                    {REGLAS_NEGOCIO.cancelacionNoShowHoras} horas
                  </strong>{' '}
                  se registran en tu historial. Avísanos con antelación para reprogramar sin costo.
                </span>
              </li>
            </ul>
          </Surface>
        </Reveal>
      </div>
    </div>
  )
}
