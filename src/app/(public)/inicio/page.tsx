import Link from 'next/link'
import { Sparkles, Calendar, MapPin, Clock, Heart, ArrowRight } from 'lucide-react'

export default function InicioPage() {
  const categories = [
    { name: 'Uñas', icon: '💅', desc: 'Manicure tradicional, semipermanente, pedicure spa y acrílicas.' },
    { name: 'Cabello', icon: '✂️', desc: 'Corte, cepillado, balayage, color de raíz e hidratación profunda.' },
    { name: 'Maquillaje', icon: '💄', desc: 'Maquillaje social y novias para momentos inolvidables.' },
    { name: 'Cejas y Pestañas', icon: '👁️', desc: 'Diseño de cejas, laminado y lifting de pestañas.' },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#F3EAF0] px-4 py-1.5 text-xs font-semibold text-[#7B4B6E]">
          <Heart className="h-3.5 w-3.5 fill-[#7B4B6E]" />
          <span>Laureles · Medellín</span>
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-[#1A1618] leading-[1.15]">
          Tu momento de cuidado <br />
          <span className="text-[#7B4B6E]">y conexión personal.</span>
        </h1>
        
        <p className="text-base sm:text-lg text-[#6B6268] max-w-xl mx-auto leading-relaxed">
          En Casa Malva creamos una experiencia cercana y detallista para resaltar tu belleza natural. Reserva tu cita en línea en pocos clics.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/reservar"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#7B4B6E] px-7 py-3.5 text-base font-semibold text-white hover:bg-[#683d5d] active:bg-[#57324d] transition-colors touch-target"
          >
            <Calendar className="h-5 w-5 stroke-[1.5]" />
            <span>Reservar mi cita</span>
          </Link>
          <Link
            href="/servicios"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#7B4B6E] bg-white px-7 py-3.5 text-base font-semibold text-[#7B4B6E] hover:bg-[#F3EAF0] transition-colors touch-target"
          >
            <Sparkles className="h-5 w-5 stroke-[1.5]" />
            <span>Ver servicios</span>
          </Link>
        </div>
      </section>

      {/* Info Badges */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        <div className="flex items-start gap-3.5 p-4 rounded-xl border border-[#F3EAF0] bg-white">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F3EAF0] text-[#7B4B6E]">
            <Clock className="h-5 w-5 stroke-[1.5]" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-[#1A1618]">Horario de atención</h4>
            <p className="text-xs text-[#6B6268] mt-0.5">Lunes a Sábado: 9:00 – 19:00</p>
            <p className="text-[11px] text-[#6B6268]/80 mt-0.5">Almuerzo: 13:00 – 14:00 (Cerrado)</p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 p-4 rounded-xl border border-[#F3EAF0] bg-white">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F3EAF0] text-[#7B4B6E]">
            <MapPin className="h-5 w-5 stroke-[1.5]" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-[#1A1618]">Ubicación</h4>
            <p className="text-xs text-[#6B6268] mt-0.5">Laureles, Medellín</p>
            <p className="text-[11px] text-[#6B6268]/80 mt-0.5">Antioquia, Colombia</p>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#1A1618]">Nuestras especialidades</h2>
          <p className="text-sm text-[#6B6268]">Servicios pensados con la máxima calidad y dedicación</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.name}
              className="p-6 rounded-xl border border-[#F3EAF0] bg-white hover:border-[#7B4B6E]/30 transition-all flex flex-col justify-between"
            >
              <div>
                <span className="text-3xl mb-3 block">{cat.icon}</span>
                <h3 className="font-semibold text-lg text-[#1A1618] mb-1.5">{cat.name}</h3>
                <p className="text-xs text-[#6B6268] leading-relaxed">{cat.desc}</p>
              </div>
              <Link
                href="/servicios"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7B4B6E] hover:underline mt-4 pt-3 border-t border-[#F3EAF0]"
              >
                <span>Explorar</span>
                <ArrowRight className="h-3.5 w-3.5 stroke-[1.5]" />
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
