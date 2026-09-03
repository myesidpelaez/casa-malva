import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CalendarPlus, Sparkles, MapPin, CheckCircle2, ShieldCheck, Clock } from 'lucide-react'
import { getCategoriesAction, getServicesAction } from '@/actions/catalogo'
import { getProfessionalsAction } from '@/actions/profesionales'
import { formatCurrencyFromCents } from '@/lib/currency'
import { categoryLook, cleanCategoryName, priceFrom, servicesOf } from '@/lib/catalogo-ui'
import { buttonClass } from '@/components/ui/button-variants'
import { SectionHeading } from '@/components/ui/surface'
import { Reveal, RevealGroup, RevealItem } from '@/components/common/Reveal'
import { Marca, TituloEditorial } from '@/components/brand'
import { BadgeApertura } from '@/components/brand/Apertura'
import { EquipoSlider } from '@/components/home/EquipoSlider'
import { cn } from '@/lib/utils'
import { REGLAS_NEGOCIO } from '@/lib/reglas'

export const revalidate = 0

export default async function InicioPage() {
  const [catRes, srvRes, profRes] = await Promise.all([
    getCategoriesAction(),
    getServicesAction(),
    getProfessionalsAction(),
  ])

  const categories = (catRes.ok ? catRes.data : []).filter((c) => c.activa)
  const services = (srvRes.ok ? srvRes.data : []).filter((s) => s.activo)
  const professionals = (profRes.ok ? profRes.data : []).filter((p) => p.activo)

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* ================= PORTADA HAUTE COUTURE (HERO EDITORIAL EXPANSIVO) ================= */}
      <section className="relative py-8 sm:py-14 lg:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8 xl:gap-14">
          
          {/* Columna Editorial (Texto y Acciones) */}
          <Reveal className="text-center lg:col-span-7 lg:text-left">
            <div className="inline-flex justify-center lg:justify-start">
              <BadgeApertura />
            </div>

            <TituloEditorial className="mt-5" resalte="belleza botánica.">
              Santuario de
            </TituloEditorial>

            <p className="mt-5 max-w-xl text-base sm:text-xl leading-relaxed text-ink-700 dark:text-[#ede4eb] font-sans font-normal">
              Peluquería de autor, spa de uñas y diseño de cejas en El Poblado, Medellín. Elige tu especialista preferida y reserva tu cita en tiempo real sin esperas ni llamadas.
            </p>

            <div className="mt-8 flex flex-col items-stretch justify-start gap-4 sm:flex-row sm:items-center">
              <Link
                href="/reservar"
                className={cn(
                  buttonClass({ variant: 'primary', size: 'xl' }),
                  'w-full sm:w-auto shadow-[0_8px_24px_rgba(102,61,91,0.35)] hover:shadow-[0_12px_32px_rgba(102,61,91,0.48)] transition-all'
                )}
              >
                <CalendarPlus className="h-5 w-5" strokeWidth={1.8} />
                <span>Reservar mi cita</span>
              </Link>

              <Link
                href="/servicios"
                className={cn(
                  buttonClass({ variant: 'glass', size: 'xl' }),
                  'w-full sm:w-auto shadow-sm'
                )}
              >
                <span>Explorar Lookbook</span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
              </Link>
            </div>

            {/* Compromisos Exclusivos de Autor (Signature Pillars) */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-t border-malva-100/70 dark:border-ink-800/80 pt-6 text-left">
              <div className="group flex flex-col gap-1 rounded-2xl bg-white/75 dark:bg-[#1c151b]/80 p-3.5 border border-malva-200/60 dark:border-malva-400/20 shadow-xs backdrop-blur-md transition-all hover:border-[#c5a059]/50 hover:-translate-y-0.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#C5A059] shrink-0" />
                  <span className="text-sm text-ink-950 dark:text-white font-semibold font-display">Atención 1 a 1 de Autor</span>
                </div>
                <p className="text-xs text-ink-600 dark:text-ink-400 leading-snug">
                  Sin citas simultáneas ni prisas. Tu tiempo y bienestar son exclusivos.
                </p>
              </div>

              <div className="group flex flex-col gap-1 rounded-2xl bg-white/75 dark:bg-[#1c151b]/80 p-3.5 border border-malva-200/60 dark:border-malva-400/20 shadow-xs backdrop-blur-md transition-all hover:border-[#c5a059]/50 hover:-translate-y-0.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-malva-600 dark:text-malva-400 shrink-0" />
                  <span className="text-sm text-ink-950 dark:text-white font-semibold font-display">Visagismo & Diagnóstico</span>
                </div>
                <p className="text-xs text-ink-600 dark:text-ink-400 leading-snug">
                  Colorimetría botánica y diseño previo a la medida de tus facciones.
                </p>
              </div>

              <div className="group flex flex-col gap-1 rounded-2xl bg-white/75 dark:bg-[#1c151b]/80 p-3.5 border border-malva-200/60 dark:border-malva-400/20 shadow-xs backdrop-blur-md transition-all hover:border-[#c5a059]/50 hover:-translate-y-0.5">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#C5A059] shrink-0" />
                  <span className="text-sm text-ink-950 dark:text-white font-semibold font-display">Puntualidad Absoluta</span>
                </div>
                <p className="text-xs text-ink-600 dark:text-ink-400 leading-snug">
                  Comenzamos en el minuto exacto agendado. Cero minutos de espera en sala.
                </p>
              </div>

              <div className="group flex flex-col gap-1 rounded-2xl bg-white/75 dark:bg-[#1c151b]/80 p-3.5 border border-malva-200/60 dark:border-malva-400/20 shadow-xs backdrop-blur-md transition-all hover:border-[#c5a059]/50 hover:-translate-y-0.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-sm text-ink-950 dark:text-white font-semibold font-display">Confirmación WhatsApp</span>
                </div>
                <p className="text-xs text-ink-600 dark:text-ink-400 leading-snug">
                  Gestión instantánea en un toque y recordatorios automáticos sin llamadas.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Columna Visual (Hero Showpiece Editorial con Glassmorphism) */}
          <Reveal className="lg:col-span-5" variant="pop">
            <div className="group relative mx-auto w-full max-w-lg lg:max-w-none">
              
              {/* Aura luminosa de fondo */}
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-malva-500/20 via-[var(--color-oro-editorial)]/15 to-malva-300/20 blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-700" />

              {/* Marco arqueado con estética de salón boutique */}
              <div className="relative aspect-[4/5] sm:aspect-[1/1.18] overflow-hidden rounded-3xl border border-white/70 dark:border-malva-700/30 bg-malva-50/50 shadow-[0_20px_50px_rgba(61,20,56,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
                <Image
                  src="/images/hero.jpg"
                  alt="Interior del salón Casa Malva, estudio boutique en El Poblado, Medellín"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 600px"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                
                {/* Degradado para garantizar contraste fotográfico */}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/75 via-ink-950/15 to-transparent" />

                {/* Pasaporte Boutique / Sello de Casa Malva (Alto Contraste Bimodal Garantizado) */}
                <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 rounded-2xl border border-white/90 dark:border-[#c5a059]/30 bg-white/95 dark:bg-[#160f15]/95 p-4 shadow-[0_16px_45px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition-all">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      {/* Monograma oficial botánico de Casa Malva con pistilo en oro */}
                      <div className="grid h-11 w-11 place-items-center rounded-xl border border-[#c5a059]/40 bg-white/90 dark:bg-[#2a1525]/90 shadow-md backdrop-blur-md">
                        <Marca size={28} variant="linea" color="#c5a059" animate="breathe" className="shrink-0 drop-shadow-xs" />
                      </div>
                      <div>
                        <p className="font-display text-base font-bold text-ink-950 dark:text-white leading-tight">
                          Casa Malva Estudio
                        </p>
                        <p className="text-xs font-medium text-ink-600 dark:text-[#ded5da] flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3.5 w-3.5 text-malva-600 dark:text-[#c5a059] shrink-0" />
                          <span>El Poblado · Medellín</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 rounded-full border border-[#c5a059]/40 bg-[#c5a059]/15 dark:bg-[#c5a059]/20 px-3.5 py-1.5 backdrop-blur-md shadow-xs shrink-0">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c5a059] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#c5a059]" />
                      </span>
                      <span className="text-xs font-bold tracking-tight text-[#8c6b2d] dark:text-[#f3d99e]">
                        {professionals.length} Maestras de Autor
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= LOOKBOOK DE ESPECIALIDADES ================= */}
      <section className="py-14 sm:py-20 border-t border-malva-100/60 dark:border-ink-800/60">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Colección & Carta"
            title="Nuestras especialidades"
            subtitle="Precios y duración transparentes desde el primer momento. Elige tu tratamiento preferido."
            className="mx-auto"
          />
        </Reveal>

        <RevealGroup className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat) => {
            const catServices = servicesOf(services, cat)
            const look = categoryLook(cat.id)
            const desde = priceFrom(catServices)
            
            return (
              <RevealItem key={cat.id} variant="pop">
                <Link href={`/servicios#${cat.id}`} className="group block h-full">
                  <div
                    className={cn(
                      'glass-card-editorial flex h-full flex-col overflow-hidden rounded-xl transition-all duration-300',
                      'group-hover:-translate-y-1.5 group-hover:shadow-[0_16px_36px_rgba(61,20,56,0.14)] dark:group-hover:shadow-[0_16px_36px_rgba(0,0,0,0.6)]'
                    )}
                  >
                    {/* Fotografía de la categoría */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-malva-100 dark:bg-malva-950">
                      <Image
                        src={look.image}
                        alt={cleanCategoryName(cat.nombre)}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-600 ease-out group-hover:scale-108"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/65 via-transparent to-transparent" />
                      
                      

                      {/* Contador de servicios */}
                      <span className="absolute bottom-3 left-3.5 rounded-full bg-white/95 dark:bg-[#160f15]/95 px-3 py-1 text-xs font-bold text-ink-900 dark:text-[#fbf7fa] backdrop-blur-md border border-white/70 dark:border-[#c5a059]/40 shadow-xs">
                        {catServices.length} {catServices.length === 1 ? 'servicio' : 'servicios'}
                      </span>
                    </div>

                    {/* Cuerpo de la Card (UX/UI PRO MAX) */}
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="font-display text-xl font-semibold text-ink-950 dark:text-[#fbf7fa] group-hover:text-malva-700 dark:group-hover:text-[#c5a059] transition-colors">
                        {cleanCategoryName(cat.nombre)}
                      </h3>
                      
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600 dark:text-[#ede4eb] font-sans line-clamp-2">
                        {look.claim}
                      </p>

                      <div className="mt-5 flex items-center justify-between border-t border-malva-100/70 dark:border-white/10 pt-3.5">
                        <span className="text-xs font-medium text-ink-500 dark:text-[#d4c5cf]">Desde</span>
                        {desde !== null && (
                          <span className="tnum text-base font-bold text-malva-800 dark:text-[#f0d48f]">
                            {formatCurrencyFromCents(desde)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </RevealItem>
            )
          })}
        </RevealGroup>
      </section>

      {/* ================= EQUIPO Y ESPECIALISTAS (SLIDER INTERACTIVO + COPYWRITING PERSUASIVO) ================= */}
      {professionals.length > 0 && (
        <section className="py-14 sm:py-20 border-t border-malva-100/60 dark:border-ink-800/60">
          <Reveal>
            <SectionHeading
              align="center"
              eyebrow="El Equipo"
              title="Profesionales de autor"
              subtitle="Especialistas certificadas en cabello, cejas y uñas dedicadas a potenciar tu imagen y bienestar."
              className="mx-auto"
            />
          </Reveal>

          <div className="mt-10">
            <EquipoSlider professionals={professionals} />
          </div>
        </section>
      )}

      {/* ================= BANNER INVITACIÓN EDITORIAL CON GLASSMORPHISM ================= */}
      <section className="pb-20 pt-6">
        <Reveal variant="pop">
          <div className="glass-banner-editorial rounded-2xl p-8 sm:p-12 lg:p-16 text-center text-white relative">
            
            {/* Destello decorativo de fondo */}
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--color-oro-editorial)]/20 blur-3xl pointer-events-none" />
            <div className="absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-malva-400/25 blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur-md mb-4 shadow-xs">
                <Sparkles className="h-3.5 w-3.5 text-[#C5A059]" />
                Tu cita en Medellín
              </span>

              <h2 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.08] tracking-tight text-white drop-shadow-sm">
                Vive la experiencia Casa Malva
              </h2>

              <p className="mt-4 text-base sm:text-lg leading-relaxed text-white/90 font-sans max-w-xl mx-auto">
                Reserva en menos de un minuto con confirmación inmediata por WhatsApp y atención 100% personalizada.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/reservar"
                  className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-white px-8 py-4 text-base font-bold text-[#1a1618] shadow-[0_10px_30px_rgba(0,0,0,0.35),0_0_24px_rgba(255,255,255,0.45)] hover:bg-white/95 hover:scale-105 active:scale-95 transition-all duration-200 font-display"
                >
                  <CalendarPlus className="h-5 w-5 text-malva-800" strokeWidth={2.2} />
                  <span className="tracking-tight font-bold text-[#1a1618]">Agendar Cita Ahora</span>
                </Link>
              </div>

              {/* Indicadores de confianza al pie del banner */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/80 font-medium pt-6 border-t border-white/15">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#C5A059]" />
                  Confirmación inmediata
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#C5A059]" />
                  Sin llamadas ni esperas
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[#C5A059]" />
                  El Poblado, Medellín
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
