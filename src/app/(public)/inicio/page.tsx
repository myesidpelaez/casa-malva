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

            <p className="mt-5 max-w-xl text-[16px] sm:text-[19px] leading-relaxed text-ink-600 dark:text-ink-300 font-sans font-normal">
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
                  'w-full sm:w-auto border-white/60 dark:border-ink-700 shadow-sm hover:border-malva-300'
                )}
              >
                <span>Explorar Lookbook</span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
              </Link>
            </div>

            {/* Badges de Confianza y Calidad con Glassmorphism */}
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-malva-100/70 dark:border-ink-800/80 pt-6 text-left">
              <div className="flex items-center gap-2.5 rounded-xl bg-white/40 dark:bg-ink-900/30 p-2 border border-white/60 dark:border-ink-800 backdrop-blur-xs">
                <CheckCircle2 className="h-4 w-4 text-malva-600 shrink-0" />
                <span className="text-[12.5px] text-ink-700 dark:text-ink-300 font-medium">Sin Esperas</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-white/40 dark:bg-ink-900/30 p-2 border border-white/60 dark:border-ink-800 backdrop-blur-xs">
                <Sparkles className="h-4 w-4 text-[#C5A059] shrink-0" />
                <span className="text-[12.5px] text-ink-700 dark:text-ink-300 font-medium">Alta Costura</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-white/40 dark:bg-ink-900/30 p-2 border border-white/60 dark:border-ink-800 backdrop-blur-xs">
                <MapPin className="h-4 w-4 text-malva-600 shrink-0" />
                <span className="text-[12.5px] text-ink-700 dark:text-ink-300 font-medium">El Poblado</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-white/40 dark:bg-ink-900/30 p-2 border border-white/60 dark:border-ink-800 backdrop-blur-xs">
                <ShieldCheck className="h-4 w-4 text-success shrink-0" />
                <span className="text-[12.5px] text-ink-700 dark:text-ink-300 font-medium">100% Botánico</span>
              </div>
            </div>
          </Reveal>

          {/* Columna Visual (Hero Showpiece Editorial con Glassmorphism) */}
          <Reveal className="lg:col-span-5" variant="pop">
            <div className="group relative mx-auto w-full max-w-lg lg:max-w-none">
              
              {/* Aura luminosa de fondo */}
              <div className="absolute -inset-2 rounded-[3rem] bg-gradient-to-tr from-malva-500/20 via-[var(--color-oro-editorial)]/15 to-malva-300/20 blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-700" />

              {/* Marco arqueado con estética de salón boutique */}
              <div className="relative aspect-[4/5] sm:aspect-[1/1.18] overflow-hidden rounded-[2.75rem] border border-white/70 dark:border-malva-700/30 bg-malva-50/50 shadow-[0_20px_50px_rgba(61,20,56,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
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

                {/* Badge flotante inferior con Glassmorphism Cristalino y Alto Contraste */}
                <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/80 bg-white/95 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)] backdrop-blur-xl dark:bg-ink-950/95 dark:border-white/15 transition-all">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-malva-50 dark:bg-malva-950/80 border border-malva-200/50 dark:border-malva-800">
                        <Marca size={28} animate="breathe" className="text-malva-600 dark:text-malva-300 shrink-0" />
                      </div>
                      <div>
                        <p className="font-display text-[15.5px] font-semibold text-ink-900 dark:text-ink-50">
                          Casa Malva Estudio
                        </p>
                        <p className="text-[12px] font-medium text-ink-600 dark:text-ink-400">
                          {REGLAS_NEGOCIO.sede.direccion}
                        </p>
                      </div>
                    </div>
                    
                    <span className="rounded-full bg-malva-700 dark:bg-malva-600 px-3.5 py-1.5 text-[11.5px] font-semibold text-white shrink-0 shadow-sm">
                      {professionals.length} Especialistas
                    </span>
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
            const Icon = look.icon

            return (
              <RevealItem key={cat.id} variant="pop">
                <Link href={`/servicios#${cat.id}`} className="group block h-full">
                  <div
                    className={cn(
                      'glass-card-editorial flex h-full flex-col overflow-hidden rounded-[26px] transition-all duration-300',
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
                      
                      {/* Badge con Icono flotante con Glassmorphism */}
                      <span
                        className={cn(
                          'absolute right-3.5 top-3.5 grid h-9 w-9 place-items-center rounded-xl backdrop-blur-md shadow-md border border-white/40 text-white',
                          look.tile
                        )}
                      >
                        <Icon className="h-4.5 w-4.5" strokeWidth={1.8} />
                      </span>

                      {/* Contador de servicios */}
                      <span className="absolute bottom-3 left-3.5 rounded-full bg-white/90 dark:bg-ink-900/90 px-3 py-0.5 text-[11px] font-semibold text-ink-800 dark:text-ink-200 backdrop-blur-md border border-white/60 dark:border-ink-700 shadow-xs">
                        {catServices.length} {catServices.length === 1 ? 'servicio' : 'servicios'}
                      </span>
                    </div>

                    {/* Cuerpo de la Card */}
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="font-display text-[20px] font-semibold text-ink-900 dark:text-ink-50 group-hover:text-malva-700 dark:group-hover:text-malva-300 transition-colors">
                        {cleanCategoryName(cat.nombre)}
                      </h3>
                      
                      <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-ink-600 dark:text-ink-400 font-sans line-clamp-2">
                        {look.claim}
                      </p>

                      <div className="mt-5 flex items-center justify-between border-t border-malva-100/70 dark:border-ink-800/80 pt-3.5">
                        <span className="text-[12.5px] font-medium text-ink-400">Desde</span>
                        {desde !== null && (
                          <span className="tnum text-[16px] font-semibold text-malva-700 dark:text-malva-300">
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
          <div className="glass-banner-editorial rounded-[32px] p-8 sm:p-12 lg:p-16 text-center text-white relative">
            
            {/* Destello decorativo de fondo */}
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--color-oro-editorial)]/20 blur-3xl pointer-events-none" />
            <div className="absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-malva-400/25 blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3.5 py-1 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur-md mb-4 shadow-xs">
                <Sparkles className="h-3.5 w-3.5 text-[#C5A059]" />
                Tu cita en Medellín
              </span>

              <h2 className="font-display text-[34px] sm:text-[48px] font-semibold leading-[1.08] tracking-tight text-white drop-shadow-sm">
                Vive la experiencia Casa Malva
              </h2>

              <p className="mt-4 text-[16px] sm:text-[18px] leading-relaxed text-white/90 font-sans max-w-xl mx-auto">
                Reserva en menos de un minuto con confirmación inmediata por WhatsApp y atención 100% personalizada.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/reservar"
                  className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-white px-8 py-4 text-[16px] font-bold text-ink-900 dark:text-ink-900 shadow-[0_10px_30px_rgba(0,0,0,0.35),0_0_20px_rgba(255,255,255,0.4)] hover:bg-white/95 hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <CalendarPlus className="h-5 w-5 text-malva-800" strokeWidth={2} />
                  <span className="tracking-tight">Agendar Cita Ahora</span>
                </Link>
              </div>

              {/* Indicadores de confianza al pie del banner */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[13px] text-white/80 font-medium pt-6 border-t border-white/15">
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
