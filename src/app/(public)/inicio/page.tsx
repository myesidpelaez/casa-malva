import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CalendarPlus, Sparkles, Clock, Star, Heart, MapPin, CheckCircle2 } from 'lucide-react'
import { getCategoriesAction, getServicesAction } from '@/actions/catalogo'
import { getProfessionalsAction } from '@/actions/profesionales'
import { formatCurrencyFromCents } from '@/lib/currency'
import { categoryLook, cleanCategoryName, getProfessionalAvatar, priceFrom, servicesOf } from '@/lib/catalogo-ui'
import { buttonClass } from '@/components/ui/button-variants'
import { Surface, SectionHeading } from '@/components/ui/surface'
import { Reveal, RevealGroup, RevealItem } from '@/components/common/Reveal'
import { Marca } from '@/components/brand'
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
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* ================= PORTADA HAUTE COUTURE (HERO EDITORIAL STITCH) ================= */}
      <section className="relative py-8 sm:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          {/* Columna Editorial (Texto y Acciones) */}
          <Reveal className="text-center lg:col-span-7 lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-malva-200/80 bg-[var(--card)]/90 px-3.5 py-1.5 shadow-sm backdrop-blur-md">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-semibold text-ink-700 tracking-wide">
                Abierto hoy · Hasta 7:00 PM · El Poblado
              </span>
            </div>

            <h1 className="mt-4 font-display text-[44px] sm:text-[68px] font-semibold leading-[1.03] tracking-[-0.03em] text-ink-900">
              Santuario de
              <br />
              <span className="bg-gradient-to-r from-malva-700 via-malva-600 to-[#C5A059] bg-clip-text text-transparent">
                belleza botánica.
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-[16px] sm:text-[18px] leading-relaxed text-ink-500 font-sans">
              Peluquería de autor, spa de uñas y diseño de cejas en Medellín. Elige tu especialista y agenda tu cita en tiempo real sin esperas ni llamadas.
            </p>

            <div className="mt-6 flex flex-col items-stretch justify-start gap-3 sm:flex-row sm:items-center">
              <Link
                href="/reservar"
                className={cn(
                  buttonClass({ variant: 'primary', size: 'xl' }),
                  'w-full sm:w-auto shadow-[0_4px_20px_rgba(61,20,56,0.25)] hover:shadow-[0_6px_28px_rgba(61,20,56,0.35)] transition-all'
                )}
              >
                <CalendarPlus className="h-5 w-5" strokeWidth={1.75} />
                Reservar mi cita
              </Link>
              <Link
                href="/servicios"
                className={cn(buttonClass({ variant: 'glass', size: 'xl' }), 'w-full sm:w-auto')}
              >
                Explorar Lookbook
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            </div>

            {/* Badges de Confianza y Calidad */}
            <div className="mt-8 grid grid-cols-3 gap-3 border-t border-ink-100 dark:border-ink-800 pt-5 text-left">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-malva-600 shrink-0" />
                <span className="text-xs text-ink-600 font-medium">100% Sin Esperas</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#C5A059] shrink-0" />
                <span className="text-xs text-ink-600 font-medium">Alta Costura</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-malva-600 shrink-0" />
                <span className="text-xs text-ink-600 font-medium">El Poblado</span>
              </div>
            </div>
          </Reveal>

          {/* Columna Visual (Hero Showpiece Editorial) */}
          <Reveal className="lg:col-span-5" variant="pop">
            <div className="group relative mx-auto max-w-md lg:max-w-none">
              {/* Marco arqueado con estética de salón boutique */}
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] border border-malva-200/60 bg-malva-50/50 shadow-[0_12px_40px_rgba(61,20,56,0.18)]">
                <Image
                  src="/images/hero.jpg"
                  alt="Interior del salón Casa Malva, estudio boutique en El Poblado, Medellín"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 550px"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-ink-950/15 to-transparent" />

                {/* Badge flotante inferior estilo Haute Couture */}
                <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/40 bg-white/80 p-4 shadow-xl backdrop-blur-md dark:bg-ink-900/80 dark:border-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Marca size={36} animate="breathe" className="text-malva-600 shrink-0" />
                      <div>
                        <p className="font-display text-[15px] font-semibold text-ink-900">
                          Casa Malva Estudio
                        </p>
                        <p className="text-[12px] text-ink-500">{REGLAS_NEGOCIO.sede.direccion}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-malva-700 px-3 py-1 text-[11px] font-semibold text-white shrink-0 shadow-sm">
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
      <section className="py-12">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Colección & Carta"
            title="Nuestras especialidades"
            subtitle="Precios y duración claros desde el primer momento. Elige tu tratamiento preferido."
            className="mx-auto"
          />
        </Reveal>

        <RevealGroup className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat) => {
            const catServices = servicesOf(services, cat)
            const look = categoryLook(cat.id)
            const desde = priceFrom(catServices)
            const Icon = look.icon

            return (
              <RevealItem key={cat.id} variant="pop">
                <Link href={`/servicios#${cat.id}`} className="group block h-full">
                  <Surface
                    interactive
                    pad="none"
                    radius="xl"
                    className="flex h-full flex-col overflow-hidden border border-malva-100/80 transition-all duration-300 group-hover:shadow-[0_8px_30px_rgba(61,20,56,0.12)] group-hover:-translate-y-1"
                  >
                    {/* Fotografía de la categoría */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-malva-100">
                      <Image
                        src={look.image}
                        alt={cleanCategoryName(cat.nombre)}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-108"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 via-transparent to-transparent" />
                      
                      {/* Badge con Icono flotante */}
                      <span
                        className={cn(
                          'absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-xl backdrop-blur-md shadow-sm border border-white/30 text-white',
                          look.tile
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.8} />
                      </span>

                      {/* Contador de servicios */}
                      <span className="absolute bottom-2.5 left-3 rounded-full bg-[var(--card)]/90 px-2.5 py-0.5 text-[11px] font-semibold text-ink-700 backdrop-blur-sm border border-[var(--glass-hairline)]">
                        {catServices.length} {catServices.length === 1 ? 'servicio' : 'servicios'}
                      </span>
                    </div>

                    {/* Cuerpo de la Card */}
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="font-display text-[19px] font-semibold text-ink-900 group-hover:text-malva-700 transition-colors">
                        {cleanCategoryName(cat.nombre)}
                      </h3>
                      <p className="mt-1 flex-1 text-[13px] leading-relaxed text-ink-500 line-clamp-2">
                        {look.claim}
                      </p>

                      <div className="mt-4 flex items-center justify-between border-t border-malva-100/70 pt-3">
                        <span className="text-[12px] text-ink-400">Desde</span>
                        {desde !== null && (
                          <span className="tnum text-[15px] font-semibold text-malva-700">
                            {formatCurrencyFromCents(desde)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Surface>
                </Link>
              </RevealItem>
            )
          })}
        </RevealGroup>
      </section>

      {/* ================= EQUIPO Y ESPECIALISTAS ================= */}
      {professionals.length > 0 && (
        <section className="py-12">
          <Reveal>
            <SectionHeading
              align="center"
              eyebrow="El Equipo"
              title="Profesionales de autor"
              subtitle="Especialistas certificadas en cabello, cejas y uñas dedicadas a tu cuidado."
              className="mx-auto"
            />
          </Reveal>

          <RevealGroup className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {professionals.map((prof) => {
              const avatar = getProfessionalAvatar(prof)

              return (
                <RevealItem key={prof.id} variant="pop">
                  <Surface pad="lg" radius="xl" className="h-full text-center group hover:shadow-md transition-all duration-300">
                    <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full border-2 border-malva-300 shadow-[0_4px_16px_rgba(61,20,56,0.15)]">
                      {avatar ? (
                        <Image
                          src={avatar}
                          alt={prof.nombre}
                          fill
                          sizes="96px"
                          className="object-cover transition-transform duration-500 group-hover:scale-108"
                        />
                      ) : (
                        <span className="grid h-full w-full place-items-center bg-gradient-to-br from-malva-600 to-malva-800 font-display text-2xl font-semibold text-white">
                          {prof.nombre.charAt(0)}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 font-display text-[17px] font-semibold text-ink-900">
                      {prof.nombre}
                    </h3>
                    <p className="text-[13px] text-ink-500">{prof.cargo}</p>
                    
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-malva-50 dark:bg-malva-950/40 px-3 py-1 text-[11px] font-medium text-malva-700 dark:text-malva-300 border border-malva-100 dark:border-malva-800">
                      <Sparkles className="h-3 w-3 text-[#C5A059]" />
                      {prof.serviceIds.length} tratamientos
                    </div>
                  </Surface>
                </RevealItem>
              )
            })}
          </RevealGroup>
        </section>
      )}

      {/* ================= BANNER INVITACIÓN EDITORIAL ================= */}
      <section className="pb-16 pt-6">
        <Reveal variant="pop">
          <Surface
            material="deep"
            radius="xl"
            pad="lg"
            className="overflow-hidden text-center relative border border-white/15 shadow-2xl"
          >
            <div className="relative z-10 max-w-xl mx-auto">
              <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white mb-3">
                Tu cita en Medellín
              </span>
              <h2 className="font-display text-[32px] sm:text-[44px] font-semibold leading-tight text-white">
                Vive la experiencia Casa Malva
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-white/80">
                Reserva en menos de un minuto con confirmación inmediata por WhatsApp.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/reservar"
                  className={cn(
                    buttonClass({ size: 'xl' }),
                    '!bg-white !text-malva-800 hover:!bg-white/90 shadow-lg font-semibold border-none'
                  )}
                >
                  <CalendarPlus className="h-5 w-5" strokeWidth={1.75} />
                  Agendar Cita Ahora
                </Link>
              </div>
            </div>
          </Surface>
        </Reveal>
      </section>
    </div>
  )
}
