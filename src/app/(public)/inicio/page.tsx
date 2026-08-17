import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CalendarPlus, Clock, MapPin, ShieldCheck, Sparkles, Star } from 'lucide-react'
import { getCategoriesAction, getServicesAction } from '@/actions/catalogo'
import { getProfessionalsAction } from '@/actions/profesionales'
import { formatCurrencyFromCents } from '@/lib/currency'
import { categoryLook, cleanCategoryName, getProfessionalAvatar, priceFrom, servicesOf } from '@/lib/catalogo-ui'
import { buttonClass } from '@/components/ui/button-variants'
import { Surface, SectionHeading } from '@/components/ui/surface'
import { Reveal, RevealGroup, RevealItem } from '@/components/common/Reveal'
import { cn } from '@/lib/utils'

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
      {/* ================= PORTADA (HERO EDITORIAL) ================= */}
      <section className="relative py-[var(--spacing-fib-5)] sm:py-[var(--spacing-fib-6)]">
        <div className="grid items-center gap-8 lg:grid-cols-12">
          {/* Columna de texto */}
          <Reveal className="text-center lg:col-span-7 lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-malva-200/70 bg-white/70 px-4 py-1.5 text-[12px] font-semibold text-malva-700 shadow-sm backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
              Laureles · Medellín
            </span>

            <h1 className="mt-[var(--spacing-fib-3)] font-display text-[42px] font-semibold leading-[1.05] tracking-[-0.02em] text-ink-900 sm:text-[62px]">
              Tu momento
              <br />
              <span className="bg-gradient-to-br from-malva-600 via-malva-500 to-blush bg-clip-text text-transparent">
                de cuidado.
              </span>
            </h1>

            <p className="mt-[var(--spacing-fib-3)] max-w-xl text-[15px] leading-relaxed text-ink-500 sm:text-[17px]">
              Un estudio boutique con las manos de siempre y la agenda al día.
              Elige tu servicio, tu profesional y tu hora — sin llamadas, sin
              esperar respuesta.
            </p>

            <div className="mt-[var(--spacing-fib-4)] flex flex-col items-stretch justify-start gap-3 sm:flex-row sm:items-center">
              <Link
                href="/reservar"
                className={cn(buttonClass({ variant: 'primary', size: 'xl' }), 'w-full sm:w-auto')}
              >
                <CalendarPlus className="h-[18px] w-[18px]" strokeWidth={1.75} />
                Reservar mi cita
              </Link>
              <Link
                href="/servicios"
                className={cn(buttonClass({ variant: 'glass', size: 'xl' }), 'w-full sm:w-auto')}
              >
                Ver servicios y precios
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            </div>

            {/* Badges de confianza */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-[12.5px] text-ink-400 lg:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Agenda en vivo
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                Atención 1 a 1 sin esperas
              </span>
            </div>
          </Reveal>

          {/* Columna visual (Hero Showpiece) */}
          <Reveal className="lg:col-span-5" variant="pop">
            <div className="group relative mx-auto max-w-md lg:max-w-none">
              {/* Marco arqueado con estética de salón boutique */}
              <div className="relative aspect-[4/3] sm:aspect-[4/3.5] overflow-hidden rounded-[2rem] border border-malva-200/60 bg-malva-50/50 shadow-[var(--shadow-malva)]">
                <Image
                  src="/images/hero.jpg"
                  alt="Interior del salón Casa Malva en Laureles, Medellín"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 500px"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/40 via-transparent to-transparent" />

                {/* Badge flotante inferior */}
                <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/40 bg-white/80 p-3.5 shadow-lg backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display text-[14.5px] font-semibold text-ink-900">
                        Casa Malva Estudio
                      </p>
                      <p className="text-[12px] text-ink-500">Circular 4ª con Cra 76</p>
                    </div>
                    <span className="rounded-full bg-malva-100 px-2.5 py-1 text-[11px] font-semibold text-malva-700">
                      Lun - Sáb
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Tres promesas. Cada una responde a una objeción real del sector. */}
        <RevealGroup className="mx-auto mt-[var(--spacing-fib-5)] grid max-w-5xl gap-3 sm:grid-cols-3">
          {[
            {
              icon: Clock,
              title: 'Horarios reales',
              body: 'Solo ves lo que está libre de verdad, con el tiempo de preparación ya descontado.',
            },
            {
              icon: ShieldCheck,
              title: 'Sin dobles reservas',
              body: 'Si dos clientas piden el mismo cupo, el sistema solo deja pasar a una.',
            },
            {
              icon: MapPin,
              title: 'Laureles',
              body: 'Circular 4ª con Carrera 76. Lunes a sábado, de 9:00 a 19:00.',
            },
          ].map((item) => (
            <RevealItem key={item.title} variant="pop">
              <Surface pad="md" radius="lg" className="h-full">
                <item.icon
                  className="h-5 w-5 text-malva-500"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <h3 className="mt-2.5 text-[14px] font-semibold text-ink-900">
                  {item.title}
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
                  {item.body}
                </p>
              </Surface>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* ================= ESPECIALIDADES CON FOTOGRAFÍA ================= */}
      <section className="py-[var(--spacing-fib-5)]">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Catálogo"
            title="Nuestras especialidades"
            subtitle="Precio y duración visibles desde el primer momento. Sin “consultar”."
            className="mx-auto"
          />
        </Reveal>

        <RevealGroup className="mt-[var(--spacing-fib-4)] grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
                    radius="lg"
                    className="flex h-full flex-col overflow-hidden transition-all duration-300 group-hover:shadow-[var(--shadow-malva)]"
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
                          'absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-xl backdrop-blur-md shadow-sm border border-white/30',
                          look.tile
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.8} />
                      </span>

                      {/* Contador de servicios */}
                      <span className="absolute bottom-2.5 left-3 rounded-full bg-white/85 px-2.5 py-0.5 text-[11px] font-semibold text-ink-800 backdrop-blur-sm">
                        {catServices.length} {catServices.length === 1 ? 'servicio' : 'servicios'}
                      </span>
                    </div>

                    {/* Cuerpo de la Card */}
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="font-display text-[18px] font-semibold text-ink-900 group-hover:text-malva-700 transition-colors">
                        {cleanCategoryName(cat.nombre)}
                      </h3>
                      <p className="mt-1 flex-1 text-[12.5px] leading-relaxed text-ink-500 line-clamp-2">
                        {look.claim}
                      </p>

                      <div className="mt-3.5 flex items-center justify-between border-t border-malva-100 pt-3">
                        <span className="text-[12px] text-ink-400">Desde</span>
                        {desde !== null && (
                          <span className="tnum text-[14px] font-semibold text-malva-700">
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

      {/* ================= EQUIPO CON FOTOGRAFÍA ================= */}
      {professionals.length > 0 && (
        <section className="py-[var(--spacing-fib-5)]">
          <Reveal>
            <SectionHeading
              eyebrow="El equipo"
              title="Quién te va a atender"
              subtitle="Cada una tiene sus servicios y su horario. Al reservar, solo verás a quien puede hacerte ese servicio ese día."
            />
          </Reveal>

          <RevealGroup className="mt-[var(--spacing-fib-4)] grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {professionals.map((prof) => {
              const avatar = getProfessionalAvatar(prof)

              return (
                <RevealItem key={prof.id} variant="pop">
                  <Surface pad="md" radius="lg" className="h-full text-center group hover:shadow-md transition-shadow">
                    <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full border-2 border-malva-200/80 shadow-[var(--shadow-malva)]">
                      {avatar ? (
                        <Image
                          src={avatar}
                          alt={prof.nombre}
                          fill
                          sizes="96px"
                          className="object-cover transition-transform duration-500 group-hover:scale-108"
                        />
                      ) : (
                        <span className="grid h-full w-full place-items-center bg-gradient-to-br from-malva-500 to-malva-700 font-display text-2xl font-semibold text-white">
                          {prof.nombre.charAt(0)}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3.5 text-[15.5px] font-semibold text-ink-900">
                      {prof.nombre}
                    </h3>
                    <p className="text-[12.5px] text-ink-500">{prof.cargo}</p>
                    
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-malva-50 px-2.5 py-1 text-[11px] font-medium text-malva-700 border border-malva-100">
                      <Sparkles className="h-3 w-3" />
                      {prof.serviceIds.length} servicios
                    </div>
                  </Surface>
                </RevealItem>
              )
            })}
          </RevealGroup>
        </section>
      )}

      {/* ================= CIERRE ================= */}
      <section className="pb-[var(--spacing-fib-5)] pt-[var(--spacing-fib-3)]">
        <Reveal variant="pop">
          <Surface
            material="deep"
            radius="xl"
            pad="lg"
            className="overflow-hidden text-center relative"
          >
            <div className="relative z-10">
              <h2 className="font-display text-[28px] font-semibold leading-tight text-white sm:text-[38px]">
                ¿Lista para tu próxima cita?
              </h2>
              <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-white/80">
                Reservar toma menos de un minuto y el cupo queda bloqueado al
                instante.
              </p>
              <Link
                href="/reservar"
                className={cn(
                  buttonClass({ size: 'lg' }),
                  'mt-[var(--spacing-fib-3)] !bg-white !text-malva-700 hover:!bg-white/90 shadow-md font-semibold'
                )}
              >
                <CalendarPlus className="h-[18px] w-[18px]" strokeWidth={1.75} />
                Reservar ahora
              </Link>
            </div>
          </Surface>
        </Reveal>
      </section>
    </div>
  )
}
