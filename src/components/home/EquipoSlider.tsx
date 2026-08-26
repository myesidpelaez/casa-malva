'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
// framer-motion
import { ChevronLeft, ChevronRight, Sparkles, Calendar, Award } from 'lucide-react'
import type { Professional } from '@/types'
import { getProfessionalAvatar } from '@/lib/catalogo-ui'
import { cn } from '@/lib/utils'

interface CopywritingEspecialista {
  destaque: string
  bioCorta: string
  experiencia: string
}

const BIO_ESPECIALISTAS: Record<string, CopywritingEspecialista> = {
  pro_camila: {
    destaque: 'Arquitectura de Mirada',
    bioCorta: 'Diseño hiperrealista, lifting y laminado orgánico que potencian la armonía de tus facciones sin perder naturalidad.',
    experiencia: '6+ años exp.',
  },
  pro_daniela: {
    destaque: 'Balayage & Visagismo',
    bioCorta: 'Colorimetría de autor y cortes de precisión con diagnóstico previo para un cabello radiante, sedoso y con caída natural.',
    experiencia: '8+ años exp.',
  },
  prof_marcela: {
    destaque: 'Maquillaje & Novias',
    bioCorta: 'Técnicas editoriales de alta definición y peinados de alfombra roja diseñados para durar impecables en tus eventos clave.',
    experiencia: '7+ años exp.',
  },
  pro_valentina: {
    destaque: 'Spa & Nail Art',
    bioCorta: 'Escultura de uñas y esmaltado semipermanente de máxima duración con productos hipoalergénicos de grado premium.',
    experiencia: '5+ años exp.',
  },
  pro_sara: {
    destaque: 'Terapia & Spa Capilar',
    bioCorta: 'Rituales de desintoxicación, nutrición intensiva y masajes relajantes que devuelven la fuerza y salud a tu fibra capilar.',
    experiencia: '6+ años exp.',
  },
}

const BIO_FALLBACK: CopywritingEspecialista = {
  destaque: 'Especialista de Autor',
  bioCorta: 'Atención personalizada y técnicas botánicas para una experiencia de belleza inolvidable y resultados excepcionales.',
  experiencia: 'Certificada',
}

export function EquipoSlider({ professionals }: { professionals: Professional[] }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(true)
  const [activeIndex, setActiveIndex] = React.useState(0)

  const checkScroll = React.useCallback(() => {
    if (!containerRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current
    setCanScrollLeft(scrollLeft > 10)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    
    // Calcular índice aproximado
    const itemWidth = 320 + 20 // card width + gap
    const newIndex = Math.round(scrollLeft / itemWidth)
    setActiveIndex(Math.min(newIndex, professionals.length - 1))
  }, [professionals.length])

  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [checkScroll])

  const scroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return
    const scrollAmount = 340
    containerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  const scrollToIndex = (index: number) => {
    if (!containerRef.current) return
    const itemWidth = 340
    containerRef.current.scrollTo({
      left: index * itemWidth,
      behavior: 'smooth',
    })
  }

  return (
    <div className="relative w-full">
      {/* Controles del Slider en Desktop / Tablet */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-malva-100/80 dark:bg-malva-950/60 px-3 py-1 text-[12px] font-semibold text-malva-700 dark:text-malva-300 border border-malva-200/50 dark:border-malva-800/60">
            <Award className="h-3.5 w-3.5 text-[#C5A059]" />
            {professionals.length} Maestras en escena
          </span>
          <span className="hidden text-xs text-ink-400 sm:inline">
            Desliza para conocer a cada especialista
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label="Anterior especialista"
            className={cn(
              'grid h-10 w-10 place-items-center rounded-full border transition-all duration-200',
              canScrollLeft
                ? 'border-malva-200/80 bg-white/90 text-malva-800 shadow-sm hover:bg-malva-50 hover:border-malva-300 active:scale-95 dark:bg-ink-900/80 dark:border-ink-700 dark:text-malva-200'
                : 'border-ink-100 bg-ink-50/50 text-ink-300 opacity-40 cursor-not-allowed dark:border-ink-800 dark:bg-ink-950 dark:text-ink-700'
            )}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            aria-label="Siguiente especialista"
            className={cn(
              'grid h-10 w-10 place-items-center rounded-full border transition-all duration-200',
              canScrollRight
                ? 'border-malva-200/80 bg-white/90 text-malva-800 shadow-sm hover:bg-malva-50 hover:border-malva-300 active:scale-95 dark:bg-ink-900/80 dark:border-ink-700 dark:text-malva-200'
                : 'border-ink-100 bg-ink-50/50 text-ink-300 opacity-40 cursor-not-allowed dark:border-ink-800 dark:bg-ink-950 dark:text-ink-700'
            )}
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Pista deslizable con Snap y soporte táctil */}
      <div
        ref={containerRef}
        className="no-scrollbar flex gap-6 overflow-x-auto scroll-smooth pb-6 pt-2 snap-x snap-mandatory focus:outline-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {professionals.map((prof) => {
          const avatar = getProfessionalAvatar(prof)
          const copy = BIO_ESPECIALISTAS[prof.id] ?? BIO_FALLBACK

          return (
            <div
              key={prof.id}
              className="w-[285px] sm:w-[320px] shrink-0 snap-start flex flex-col"
            >
              <div
                className={cn(
                  'glass-card-editorial group flex h-full flex-col justify-between rounded-[24px] p-6 transition-all duration-300',
                  'hover:-translate-y-1.5 hover:shadow-[0_16px_36px_rgba(61,20,56,0.12)] dark:hover:shadow-[0_16px_36px_rgba(0,0,0,0.5)]'
                )}
              >
                {/* Cabecera de la Card: Foto + Badges */}
                <div>
                  <div className="relative mx-auto mb-4 h-28 w-28">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-malva-500 via-[var(--color-oro-editorial)] to-malva-300 p-[2.5px] shadow-[0_6px_20px_rgba(102,61,91,0.22)]">
                      <div className="relative h-full w-full overflow-hidden rounded-full bg-white dark:bg-ink-950">
                        {avatar ? (
                          <Image
                            src={avatar}
                            alt={prof.nombre}
                            fill
                            sizes="112px"
                            className="object-cover transition-transform duration-500 group-hover:scale-108"
                          />
                        ) : (
                          <span className="grid h-full w-full place-items-center bg-gradient-to-br from-malva-600 to-malva-800 font-display text-3xl font-semibold text-white">
                            {prof.nombre.charAt(0)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Badge flotante de experiencia */}
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/80 bg-white/95 px-2.5 py-0.5 text-[10.5px] font-semibold text-malva-800 shadow-sm backdrop-blur-md dark:border-ink-700 dark:bg-ink-900/90 dark:text-malva-200">
                      {copy.experiencia}
                    </span>
                  </div>

                  {/* Nombre y Cargo */}
                  <div className="text-center mt-2">
                    <h3 className="font-display text-[20px] font-semibold text-ink-900 group-hover:text-malva-700 transition-colors">
                      {prof.nombre}
                    </h3>
                    <p className="text-[13px] font-medium text-malva-600 dark:text-malva-400">
                      {prof.cargo}
                    </p>
                    <span className="inline-block mt-1 text-[11px] font-semibold tracking-wide text-[#C5A059] uppercase">
                      {copy.destaque}
                    </span>
                  </div>

                  {/* Copywriting persuasivo de venta */}
                  <p className="mt-3 text-center text-[13px] leading-relaxed text-ink-600 dark:text-ink-400 font-sans line-clamp-3">
                    {copy.bioCorta}
                  </p>
                </div>

                {/* Footer de la Card: Cantidad de Tratamientos + CTA */}
                <div className="mt-6 border-t border-malva-100/70 dark:border-malva-900/60 pt-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs text-ink-500">
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-[#C5A059]" />
                      {prof.serviceIds.length} tratamientos
                    </span>
                    <span className="text-[11px] font-medium text-ink-400">
                      Cita previa
                    </span>
                  </div>

                  <Link
                    href={`/reservar?professionalId=${prof.id}`}
                    className="glass-button-primary flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold shadow-sm"
                  >
                    <Calendar className="h-4 w-4" strokeWidth={1.8} />
                    <span>Agendar con {prof.nombre.split(' ')[0]}</span>
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Indicadores de Paginación Dots */}
      <div className="mt-4 flex items-center justify-center gap-1.5">
        {professionals.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToIndex(index)}
            aria-label={`Ir a especialista ${index + 1}`}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              activeIndex === index
                ? 'w-6 bg-malva-600 dark:bg-malva-400'
                : 'w-2 bg-malva-200 hover:bg-malva-300 dark:bg-ink-700'
            )}
          />
        ))}
      </div>
    </div>
  )
}
