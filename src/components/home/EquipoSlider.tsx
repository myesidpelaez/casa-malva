'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Award, Calendar, ChevronLeft, ChevronRight, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react'
import { getProfessionalAvatar } from '@/lib/catalogo-ui'
import { cn } from '@/lib/utils'
import type { Professional } from '@/types'

type BioEspecialista = {
  experiencia: string
  destaque: string
  bioCorta: string
}

const BIO_ESPECIALISTAS: Record<string, BioEspecialista> = {
  pro_daniela: {
    experiencia: '8+ años de trayectoria',
    destaque: 'Balayage & Colorimetría de Autor',
    bioCorta:
      'Colorimetría de alta precisión y cortes con diagnóstico previo para un cabello radiante, sedoso y con caída natural.',
  },
  pro_camila: {
    experiencia: '6+ años de trayectoria',
    destaque: 'Arquitectura de Mirada & Cejas',
    bioCorta:
      'Diseño hiperrealista, lifting y laminado botánico que potencian la armonía de tus facciones sin perder naturalidad.',
  },
  pro_sara: {
    experiencia: '6+ años de trayectoria',
    destaque: 'Terapia & Spa Capilar',
    bioCorta:
      'Rituales de nutrición intensiva, detox y masajes relajantes que devuelven la fuerza, elasticidad y salud a tu fibra capilar.',
  },
  pro_valentina: {
    experiencia: '5+ años de trayectoria',
    destaque: 'Escultura & Spa de Uñas',
    bioCorta:
      'Escultura y esmaltado semipermanente de máxima duración con productos hipoalergénicos y cuidado de cutícula rusa.',
  },
  pro_marcela: {
    experiencia: '7+ años de trayectoria',
    destaque: 'Maquillaje Editorial & Social',
    bioCorta:
      'Técnicas de piel blindada, visagismo y acabados luminosos para novias, eventos de gala y sesiones fotográficas.',
  },
}

const BIO_FALLBACK: BioEspecialista = {
  experiencia: '5+ años de trayectoria',
  destaque: 'Especialista de Autor',
  bioCorta: 'Experta certificada en técnicas avanzadas de belleza y bienestar botánico.',
}

export function EquipoSlider({ professionals }: { professionals: Professional[] }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(true)
  const [activeIndex, setActiveIndex] = React.useState(0)

  const checkScrollability = React.useCallback(() => {
    if (!containerRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current
    setCanScrollLeft(scrollLeft > 10)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)

    const itemWidth = 390
    const currentIndex = Math.round(scrollLeft / itemWidth)
    setActiveIndex(Math.min(Math.max(currentIndex, 0), professionals.length - 1))
  }, [professionals.length])

  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    checkScrollability()
    el.addEventListener('scroll', checkScrollability, { passive: true })
    window.addEventListener('resize', checkScrollability)
    return () => {
      el.removeEventListener('scroll', checkScrollability)
      window.removeEventListener('resize', checkScrollability)
    }
  }, [checkScrollability])

  const scroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return
    const scrollAmount = 400
    containerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  const scrollToIndex = (index: number) => {
    if (!containerRef.current) return
    const itemWidth = 400
    containerRef.current.scrollTo({
      left: index * itemWidth,
      behavior: 'smooth',
    })
  }

  return (
    <div className="relative w-full">
      {/* Controles del Slider */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-malva-100/90 dark:bg-malva-950/80 px-3.5 py-1.5 text-[12.5px] font-bold text-malva-800 dark:text-malva-200 border border-malva-200/80 dark:border-malva-800 shadow-xs">
            <Award className="h-4 w-4 text-[#C5A059]" />
            {professionals.length} Maestras en escena
          </span>
          <span className="hidden text-[13px] text-ink-500 dark:text-ink-400 sm:inline font-medium">
            3 especialistas por vista · Desliza para explorar el equipo
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label="Anterior especialista"
            className={cn(
              'grid h-10 w-10 place-items-center rounded-full border transition-all duration-200 cursor-pointer',
              canScrollLeft
                ? 'border-malva-300 bg-[var(--card)] text-malva-800 shadow-sm hover:bg-malva-50 hover:border-malva-400 active:scale-95 dark:border-ink-700 dark:text-malva-200'
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
              'grid h-10 w-10 place-items-center rounded-full border transition-all duration-200 cursor-pointer',
              canScrollRight
                ? 'border-malva-300 bg-[var(--card)] text-malva-800 shadow-sm hover:bg-malva-50 hover:border-malva-400 active:scale-95 dark:border-ink-700 dark:text-malva-200'
                : 'border-ink-100 bg-ink-50/50 text-ink-300 opacity-40 cursor-not-allowed dark:border-ink-800 dark:bg-ink-950 dark:text-ink-700'
            )}
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Pista deslizable panorámica (3 columnas en desktop) */}
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
              className="w-[330px] sm:w-[380px] lg:w-[calc((100%-48px)/3)] shrink-0 snap-start flex flex-col"
            >
              <div
                className={cn(
                  'group flex h-full flex-col justify-between rounded-[26px] p-6 transition-all duration-300',
                  'bg-[var(--card)] border border-ink-200/90 dark:border-ink-800 shadow-xs',
                  'hover:-translate-y-1.5 hover:shadow-xl hover:shadow-malva-900/10 hover:border-malva-300 dark:hover:border-malva-500/50'
                )}
              >
                {/* Cabecera Panorámica: Retrato + Identidad */}
                <div>
                  <div className="flex items-start gap-4">
                    {/* Retrato de la Maestra */}
                    <div className="relative h-22 w-22 sm:h-24 sm:w-24 shrink-0 rounded-2xl overflow-hidden border-2 border-malva-200/90 dark:border-malva-800 shadow-md bg-malva-100">
                      {avatar ? (
                        <Image
                          src={avatar}
                          alt={prof.nombre}
                          fill
                          sizes="96px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <span className="grid h-full w-full place-items-center font-display text-2xl font-bold text-malva-700">
                          {prof.nombre.charAt(0)}
                        </span>
                      )}
                    </div>

                    {/* Títulos y Especialidad */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <span className="inline-block rounded-md bg-malva-100/90 dark:bg-malva-950/80 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-malva-800 dark:text-malva-200">
                        {copy.experiencia}
                      </span>
                      <h3 className="font-display text-[20px] sm:text-[21px] font-semibold text-ink-900 dark:text-white group-hover:text-malva-700 dark:group-hover:text-malva-300 transition-colors leading-tight">
                        {prof.nombre}
                      </h3>
                      <p className="text-[13px] font-medium text-malva-700 dark:text-malva-300 leading-snug">
                        {prof.cargo || 'Especialista de Autor'}
                      </p>
                    </div>
                  </div>

                  {/* Destaque de Maestría */}
                  <div className="mt-4 rounded-xl bg-malva-50/70 dark:bg-malva-950/40 p-2.5 border border-malva-100/80 dark:border-malva-900/50">
                    <span className="text-[11.5px] font-bold uppercase tracking-wide text-[#C5A059] block">
                      ✦ {copy.destaque}
                    </span>
                  </div>

                  {/* Copywriting de Autor */}
                  <p className="mt-3.5 text-[13.5px] leading-relaxed text-ink-600 dark:text-ink-300 font-sans line-clamp-3">
                    {copy.bioCorta}
                  </p>
                </div>

                {/* Footer de la Card: Metadatos y CTA */}
                <div className="mt-6 border-t border-ink-100/90 dark:border-ink-800/90 pt-4 space-y-3">
                  <div className="flex items-center justify-between text-[12px] font-medium text-ink-500 dark:text-ink-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#C5A059]" />
                      {(prof.serviceIds ?? []).length} tratamientos de autor
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Agenda abierta
                    </span>
                  </div>

                  <Link
                    href={`/reservar?professionalId=${prof.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-malva-700 hover:bg-malva-800 text-white dark:bg-malva-600 dark:hover:bg-malva-500 py-3 text-[13.5px] font-bold shadow-md shadow-malva-900/15 transition-all duration-200 cursor-pointer"
                  >
                    <Calendar className="h-4 w-4" strokeWidth={2} />
                    <span>Agendar con {prof.nombre.split(' ')[0]}</span>
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Indicadores de Paginación Dots */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {professionals.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToIndex(index)}
            aria-label={`Ir a especialista ${index + 1}`}
            className={cn(
              'h-2 rounded-full transition-all duration-300 cursor-pointer',
              activeIndex === index
                ? 'w-7 bg-malva-600 dark:bg-malva-400'
                : 'w-2 bg-malva-200 hover:bg-malva-300 dark:bg-ink-700'
            )}
          />
        ))}
      </div>
    </div>
  )
}
