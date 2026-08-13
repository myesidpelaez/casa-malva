import Link from 'next/link'
import { ArrowRight, CalendarPlus, Clock, MapPin, ShieldCheck, Sparkles } from 'lucide-react'
import { getCategoriesAction, getServicesAction } from '@/actions/catalogo'
import { getProfessionalsAction } from '@/actions/profesionales'
import { formatCurrencyFromCents } from '@/lib/currency'
import { categoryLook, cleanCategoryName, priceFrom, servicesOf } from '@/lib/catalogo-ui'
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
      {/* ================= PORTADA ================= */}
      <section className="relative py-[var(--spacing-fib-5)] sm:py-[var(--spacing-fib-6)]">
        <Reveal className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-malva-200/70 bg-white/60 px-4 py-1.5 text-[12px] font-semibold text-malva-700 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
            Laureles · Medellín
          </span>

          <h1 className="mt-[var(--spacing-fib-3)] font-display text-[42px] font-semibold leading-[1.05] tracking-[-0.02em] text-ink-900 sm:text-[68px]">
            Tu momento
            <br />
            <span className="bg-gradient-to-br from-malva-600 via-malva-500 to-blush bg-clip-text text-transparent">
              de cuidado.
            </span>
          </h1>

          <p className="mx-auto mt-[var(--spacing-fib-3)] max-w-xl text-[15px] leading-relaxed text-ink-500 sm:text-[17px]">
            Un estudio pequeño, con las manos de siempre y la agenda al día.
            Elige tu servicio, tu profesional y tu hora — sin llamadas, sin
            esperar respuesta.
          </p>

          <div className="mt-[var(--spacing-fib-4)] flex flex-col items-center justify-center gap-3 sm:flex-row">
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
        </Reveal>

        {/* Tres promesas. Cada una responde a una objeción real del sector. */}
        <RevealGroup className="mx-auto mt-[var(--spacing-fib-5)] grid max-w-4xl gap-3 sm:grid-cols-3">
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

      {/* ================= ESPECIALIDADES ================= */}
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

        <RevealGroup className="mt-[var(--spacing-fib-4)] grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat) => {
            const catServices = servicesOf(services, cat)
            const look = categoryLook(cat.id)
            const desde = priceFrom(catServices)
            const Icon = look.icon

            return (
              <RevealItem key={cat.id} variant="pop">
                <Link href={`/servicios#${cat.id}`} className="block h-full">
                  <Surface interactive pad="md" radius="lg" className="flex h-full flex-col">
                    <span
                      className={cn(
                        'grid h-11 w-11 place-items-center rounded-[14px]',
                        look.tile
                      )}
                    >
                      <Icon className="h-[21px] w-[21px]" strokeWidth={1.6} />
                    </span>

                    <h3 className="mt-3.5 font-display text-[19px] font-semibold text-ink-900">
                      {cleanCategoryName(cat.nombre)}
                    </h3>
                    <p className="mt-1 flex-1 text-[13px] leading-relaxed text-ink-500">
                      {look.claim}
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t border-malva-100 pt-3">
                      <span className="text-[12px] text-ink-400">
                        {catServices.length} servicio
                        {catServices.length === 1 ? '' : 's'}
                      </span>
                      {desde !== null && (
                        <span className="tnum text-[13px] font-semibold text-malva-700">
                          desde {formatCurrencyFromCents(desde)}
                        </span>
                      )}
                    </div>
                  </Surface>
                </Link>
              </RevealItem>
            )
          })}
        </RevealGroup>
      </section>

      {/* ================= EQUIPO ================= */}
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
            {professionals.map((prof) => (
              <RevealItem key={prof.id} variant="pop">
                <Surface pad="md" radius="lg" className="h-full text-center">
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-malva-500 to-malva-700 font-display text-2xl font-semibold text-white shadow-[var(--shadow-malva)]">
                    {prof.nombre.charAt(0)}
                  </span>
                  <h3 className="mt-3 text-[15px] font-semibold text-ink-900">
                    {prof.nombre}
                  </h3>
                  <p className="text-[12.5px] text-ink-500">{prof.rol}</p>
                  <p className="mt-2 text-[11.5px] text-ink-400">
                    {prof.serviceIds.length} servicios habilitados
                  </p>
                </Surface>
              </RevealItem>
            ))}
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
            className="overflow-hidden text-center"
          >
            <h2 className="font-display text-[28px] font-semibold leading-tight text-white sm:text-[38px]">
              ¿Lista para tu próxima cita?
            </h2>
            <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-white/75">
              Reservar toma menos de un minuto y el cupo queda bloqueado al
              instante.
            </p>
            <Link
              href="/reservar"
              className={cn(
                buttonClass({ size: 'lg' }),
                'mt-[var(--spacing-fib-3)] !bg-white !text-malva-700 hover:!bg-white/90'
              )}
            >
              <CalendarPlus className="h-[18px] w-[18px]" strokeWidth={1.75} />
              Reservar ahora
            </Link>
          </Surface>
        </Reveal>
      </section>
    </div>
  )
}
