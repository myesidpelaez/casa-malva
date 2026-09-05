import Link from 'next/link'
import { Clock, MapPin, Phone, MessageCircle, Send } from 'lucide-react'
import { REGLAS_NEGOCIO } from '@/lib/reglas'
import { Marca } from '@/components/brand'
import { InstagramIcon, TikTokIcon } from '@/components/icons/SocialIcons'

/**
 * Pie del sitio público de ultra-lujo (Estilo LUMIÈRE).
 *
 * Fondo en ciruela profundo (#3D142C) con tipografía en marfil y detalles en oro editorial.
 * Conserva el aviso de maqueta obligatorio ([[04-BIBLIOTECA/patrones/fallos-silenciosos]]).
 */
export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-[#54243F] bg-[#3D142C] text-[#F9EDF3] dark:border-white/10 dark:bg-[#180C15]">
      {/* Contenedor Principal */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
          
          {/* Columna 1: Marca & Filosofía (4 cols) */}
          <div className="space-y-4 lg:col-span-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 border border-white/20">
                <Marca size={28} className="text-[#C5A059]" />
              </div>
              <span className="font-display text-2xl font-semibold tracking-tight text-white">
                Casa Malva
              </span>
            </div>

            <p className="max-w-sm text-sm leading-relaxed text-[#D8C2CE]">
              Estudio de belleza de autor en El Poblado, Medellín. Un refugio donde la técnica de alta gama se une al bienestar y al cuidado consciente.
            </p>

            {/* Redes Sociales */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-[#C5A059] hover:text-ink-950 transition-all"
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noreferrer"
                aria-label="TikTok"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-[#C5A059] hover:text-ink-950 transition-all"
              >
                <TikTokIcon className="h-4 w-4" />
              </a>
              <a
                href="https://wa.me"
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-[#C5A059] hover:text-ink-950 transition-all"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Columna 2: Enlaces Rápidos (2 cols) */}
          <div className="space-y-3 lg:col-span-2">
            <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-[#C5A059]">
              Navegación
            </h4>
            <ul className="space-y-2.5 text-sm text-[#D8C2CE]">
              <li>
                <Link href="/inicio" className="hover:text-white transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/servicios" className="hover:text-white transition-colors">
                  Servicios & Precios
                </Link>
              </li>
              <li>
                <Link href="/reservar" className="hover:text-white transition-colors">
                  Reservar Cita
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-white transition-colors">
                  Panel del Estudio
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Especialidades (3 cols) */}
          <div className="space-y-3 lg:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-[#C5A059]">
              Especialidades
            </h4>
            <ul className="space-y-2.5 text-sm text-[#D8C2CE]">
              <li>
                <Link href="/servicios" className="hover:text-white transition-colors">
                  Manicura Rusa & Uñas Gel
                </Link>
              </li>
              <li>
                <Link href="/servicios" className="hover:text-white transition-colors">
                  Diseño de Cejas & Lash Lifting
                </Link>
              </li>
              <li>
                <Link href="/servicios" className="hover:text-white transition-colors">
                  Colorimetría & Balayage
                </Link>
              </li>
              <li>
                <Link href="/servicios" className="hover:text-white transition-colors">
                  Terapia Capilar Orgánica
                </Link>
              </li>
              <li>
                <Link href="/servicios" className="hover:text-white transition-colors">
                  Pedicura Spa Podal
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 4: Contacto & Newsletter (3 cols) */}
          <div className="space-y-4 lg:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-[#C5A059]">
              Contacto & Sede
            </h4>
            <div className="space-y-2.5 text-xs text-[#D8C2CE]">
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#C5A059]" />
                <span>{REGLAS_NEGOCIO.sede.direccion}</span>
              </p>
              <p className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#C5A059]" />
                <span>
                  Lun a Sáb {REGLAS_NEGOCIO.horarioEstudio.horaApertura}–{REGLAS_NEGOCIO.horarioEstudio.horaCierre}
                </span>
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-[#C5A059]" />
                <span>+57 300 912 3456</span>
              </p>
            </div>

            {/* Newsletter Input Box */}
            <div className="pt-2">
              <span className="block text-xs font-semibold text-white mb-2">
                Club Casa Malva · Novedades
              </span>
              <div className="relative flex items-center">
                <input
                  type="email"
                  placeholder="Tu correo electrónico"
                  className="w-full rounded-full bg-white/10 border border-white/20 px-4 py-2 text-xs text-white placeholder-white/50 focus:border-[#C5A059] focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                />
                <button
                  type="button"
                  aria-label="Suscribirme"
                  className="absolute right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#C5A059] text-ink-950 hover:bg-white transition-colors"
                >
                  <Send className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Separador */}
        <div className="my-10 border-t border-white/15" />

        {/* Aviso de Maqueta Obligatorio & Créditos Legales */}
        <div className="flex flex-col gap-4 text-xs text-[#C8B0BE] sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl leading-relaxed">
            <strong className="text-white">Demostración:</strong> Casa Malva es un negocio ficticio desarrollado con fines de exhibición por MeJorÍA. Servicios, precios y profesionales son datos de maqueta.
          </p>
          <p className="shrink-0 text-white/60">
            © 2026 Casa Malva. Todos los derechos reservados.
          </p>
        </div>

      </div>
    </footer>
  )
}
