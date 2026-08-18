import Link from 'next/link'
import { Clock, MapPin } from 'lucide-react'
import { REGLAS_NEGOCIO } from '@/lib/reglas'
import { Marca } from '@/components/brand'

/**
 * Pie del sitio público.
 *
 * Lleva el aviso de maqueta, que NO es opcional:
 * [[04-BIBLIOTECA/patrones/fallos-silenciosos]] — el dato de maqueta se marca
 * como maqueta, siempre y donde se vea.
 */
export function SiteFooter() {
  return (
    <footer className="mt-[var(--spacing-fib-6)] border-t border-malva-100 bg-white/40 backdrop-blur-sm">
      <div className="mx-auto grid max-w-6xl gap-[var(--spacing-fib-3)] px-4 py-[var(--spacing-fib-4)] sm:px-6 md:grid-cols-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <Marca size={36} className="text-malva-600" />
            <span className="font-display text-lg font-semibold text-ink-900">
              Casa Malva
            </span>
          </div>
          <p className="max-w-xs text-[13px] leading-relaxed text-ink-500">
            Estudio de belleza en Laureles. Cuidamos el detalle, empezando por tu
            tiempo.
          </p>
        </div>

        <div className="space-y-2 text-[13px] text-ink-500">
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-malva-500" strokeWidth={1.75} />
            <span>Circular 4ª con Carrera 76 · Laureles, Medellín</span>
          </p>
          <p className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-malva-500" strokeWidth={1.75} />
            <span>
              Lunes a sábado {REGLAS_NEGOCIO.horarioEstudio.horaApertura}–
              {REGLAS_NEGOCIO.horarioEstudio.horaCierre} · Almuerzo 13:00–14:00
              <br />
              Domingos cerrado
            </span>
          </p>
        </div>

        <div className="space-y-3">
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-semibold text-ink-500">
            <Link href="/servicios" className="hover:text-malva-700">
              Servicios
            </Link>
            <Link href="/reservar" className="hover:text-malva-700">
              Reservar
            </Link>
            <Link href="/admin" className="hover:text-malva-700">
              Panel del estudio
            </Link>
          </nav>

          <p className="rounded-[var(--radius-sm)] border border-champagne/60 bg-champagne/20 px-3 py-2 text-[11.5px] leading-relaxed text-ink-500">
            <strong className="font-semibold text-ink-700">Demostración.</strong>{' '}
            Casa Malva es un negocio ficticio construido por MeJorÍA. Servicios,
            precios, equipo y citas son datos de maqueta.
          </p>
        </div>
      </div>
    </footer>
  )
}
