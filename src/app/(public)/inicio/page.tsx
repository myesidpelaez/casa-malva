import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  CalendarPlus,
  Sparkles,
  ShieldCheck,
  Leaf,
  Award,
  Star,
  Users,
  Clock,
  Play,
  Check,
  Sparkle,
} from 'lucide-react'
import { Reveal, RevealGroup, RevealItem } from '@/components/common/Reveal'
import { FaqAccordion } from '@/components/home/FaqAccordion'

export const revalidate = 0

const ESPECIALIDADES_ELABORADAS = [
  {
    id: 'unas-gel',
    categoriaId: 'cat_unas',
    badge: 'MANOS & UÑAS',
    rating: '4.9',
    reviews: '128',
    duracion: '90 min',
    eyebrow: 'ARQUITECTURA DE UÑAS',
    titulo: 'Manicura Rusa & Nivelación Gel',
    descripcion: 'Limpieza milimétrica de cutículas con torno diamantado, nivelación de uña natural con rubber base y esmaltado de máxima durabilidad.',
    tags: ['Cutícula Rusa', 'Fórmula 10-Free', 'Brillo Espejo'],
    precio: '$95.000',
    imagen: '/images/details.jpg',
  },
  {
    id: 'cejas-lashes',
    categoriaId: 'cat_cejas',
    badge: 'MIRADA & CEJAS',
    rating: '5.0',
    reviews: '94',
    duracion: '75 min',
    eyebrow: 'VISAGISMO & LIFTING',
    titulo: 'Diseño de Cejas & Lash Lifting',
    descripcion: 'Mapeo facial con calibre, laminado orgánico con aminoácidos, tintura botánica y curvado natural de pestañas con keratina pura.',
    tags: ['Laminado HD', 'Lifting Keratina', 'Efecto Rímel'],
    precio: '$85.000',
    imagen: '/images/novia_2_ojos.jpg',
  },
  {
    id: 'balayage',
    categoriaId: 'cat_cabello',
    badge: 'COLOR & CORTE',
    rating: '4.9',
    reviews: '145',
    duracion: '180 min',
    eyebrow: 'ALTA PELUQUERÍA',
    titulo: 'Colorimetría & Balayage de Autor',
    descripcion: 'Iluminación multidimensional a mano alzada, babylights sin efecto raíz y sellado de cutícula con gloss tonificante libre de amoníaco.',
    tags: ['Sin Daño Térmico', 'Matización Pro', 'Caída Natural'],
    precio: '$260.000',
    imagen: '/images/hair.jpg',
  },
  {
    id: 'botox-capilar',
    categoriaId: 'cat_cabello',
    badge: 'SALUD CAPILAR',
    rating: '4.8',
    reviews: '89',
    duracion: '90 min',
    eyebrow: 'NUTRICIÓN INTENSIVA',
    titulo: 'Bótox Capilar & Nutrición Botánica',
    descripcion: 'Terapia regenerativa profunda de ácido hialurónico y colágeno vegetal. Elimina el frizz, recupera elasticidad y sella las puntas abiertas.',
    tags: ['Antifrizz Orgánico', 'Ácido Hialurónico', 'Brillo Seda'],
    precio: '$140.000',
    imagen: '/images/cat_cabello.jpg',
  },
  {
    id: 'pedicura-spa',
    categoriaId: 'cat_unas',
    badge: 'RITUAL PODAL',
    rating: '4.9',
    reviews: '112',
    duracion: '60 min',
    eyebrow: 'BIENESTAR PODAL',
    titulo: 'Pedicura Spa & Exfoliación Mineral',
    descripcion: 'Inmersión en sales de Epsom con aromaterapia, remoción de asperezas, exfoliación con azúcar orgánica, masaje podal y esmalte pro.',
    tags: ['Sales de Epsom', 'Masaje Podal', 'Larga Duración'],
    precio: '$75.000',
    imagen: '/images/cat_unas.jpg',
  },
  {
    id: 'maquillaje-novias',
    categoriaId: 'cat_maquillaje',
    badge: 'HAUTE BEAUTY',
    rating: '5.0',
    reviews: '78',
    duracion: '90 min',
    eyebrow: 'EVENTOS & NOVIAS',
    titulo: 'Maquillaje Social & Bridal Glow',
    descripcion: 'Preparación dermatológica de la piel, técnica de piel blindada HD resistente al agua y lágrimas, visagismo armónico y pestañas pelo a pelo.',
    tags: ['Piel Blindada HD', 'Fijación 16 Horas', 'Pestañas Pelo a Pelo'],
    precio: '$180.000',
    imagen: '/images/novia_3_glow.jpg',
  },
]

export default async function InicioPage() {


  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-24 sm:space-y-32 pb-20">
      
      {/* ================= 1. HERO BOUTIQUE EDITORIAL (INSPIRADO EN LUMIÈRE) ================= */}
      <section className="relative my-4 sm:my-6 overflow-hidden rounded-3xl bg-[#FAF6F3] dark:bg-[#160E15] border border-[#EFE4E0] dark:border-white/10 shadow-[0_12px_40px_rgba(61,20,44,0.06)]">
        <div className="grid items-center gap-10 lg:grid-cols-12 p-6 sm:p-10 lg:p-14">
          
          {/* Columna Izquierda: Copywriting de Autor */}
          <Reveal className="text-center lg:col-span-7 lg:text-left">
            <span className="inline-block text-xs sm:text-xs font-bold uppercase tracking-[0.24em] text-malva-700 dark:text-[#E8829F]">
              CUIDADO DE AUTOR · BELLEZA CONSCIENTE · MEDELLÍN
            </span>

            <h1 className="mt-4 font-display text-4xl sm:text-6xl xl:text-7xl font-semibold tracking-tight text-ink-900 dark:text-white leading-[1.06]">
              Cuidado Experto,<br />
              <span className="font-display italic font-normal text-malva-800 dark:text-[#E8829F]">Resultados Impecables.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-ink-700 dark:text-[#E2D5DF] font-sans">
              Estudio de belleza boutique en El Poblado especializado en manicura de autor, diseño de cejas, pestañas y salud capilar. Una experiencia sensorial creada para tu bienestar.
            </p>

            {/* Trío de Insignias de Confianza con Micro-iconos */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto lg:mx-0">
              <div className="flex items-center gap-2.5 rounded-2xl bg-white/90 dark:bg-white/5 border border-malva-100 dark:border-white/10 p-3 shadow-2xs">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-malva-100/80 dark:bg-malva-900/50 text-malva-800 dark:text-white">
                  <Award className="h-4 w-4" strokeWidth={2} />
                </div>
                <span className="text-xs font-semibold text-ink-900 dark:text-white leading-tight">
                  Especialistas Certificadas
                </span>
              </div>

              <div className="flex items-center gap-2.5 rounded-2xl bg-white/90 dark:bg-white/5 border border-malva-100 dark:border-white/10 p-3 shadow-2xs">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-malva-100/80 dark:bg-malva-900/50 text-malva-800 dark:text-white">
                  <Leaf className="h-4 w-4" strokeWidth={2} />
                </div>
                <span className="text-xs font-semibold text-ink-900 dark:text-white leading-tight">
                  Fórmulas Libres de Tóxicos
                </span>
              </div>

              <div className="flex items-center gap-2.5 rounded-2xl bg-white/90 dark:bg-white/5 border border-malva-100 dark:border-white/10 p-3 shadow-2xs">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-malva-100/80 dark:bg-malva-900/50 text-malva-800 dark:text-white">
                  <Sparkles className="h-4 w-4" strokeWidth={2} />
                </div>
                <span className="text-xs font-semibold text-ink-900 dark:text-white leading-tight">
                  Protocolos a Medida
                </span>
              </div>
            </div>

            {/* Doble CTA Estilo LUMIÈRE */}
            <div className="mt-8 flex flex-col items-stretch justify-start gap-4 sm:flex-row sm:items-center">
              <Link
                href="/reservar"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#3D142C] hover:bg-[#270B1C] text-white px-8 py-4 text-xs sm:text-sm font-bold tracking-widest uppercase transition-all shadow-[0_8px_25px_rgba(61,20,44,0.28)] hover:shadow-[0_12px_32px_rgba(61,20,44,0.4)] hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>RESERVAR CITA</span>
                <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
              </Link>

              <Link
                href="#nosotros"
                className="inline-flex items-center justify-center gap-2.5 rounded-full bg-white dark:bg-white/10 hover:bg-[#FAF4F7] text-ink-900 dark:text-white px-7 py-4 text-xs sm:text-sm font-bold tracking-widest uppercase border border-malva-200 dark:border-white/20 transition-all shadow-xs hover:-translate-y-0.5 active:translate-y-0"
              >
                <Play className="h-3.5 w-3.5 fill-current text-malva-700 dark:text-white" />
                <span>CONOCER EL ESTUDIO</span>
              </Link>
            </div>
          </Reveal>

          {/* Columna Derecha: Fotografía de Alta Definición */}
          <Reveal className="lg:col-span-5" variant="pop">
            <div className="group relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/90 dark:border-white/10 shadow-[0_20px_45px_rgba(61,20,44,0.14)] dark:shadow-[0_20px_45px_rgba(0,0,0,0.6)]">
                <Image
                  src="/images/hero_nails_luxury.jpg"
                  alt="Tratamiento de alta gama en Casa Malva"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 500px"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= 2. MATRIZ DE ESPECIALIDADES (ELABORADA CON FOTOGRAFÍA & CHIPS) ================= */}
      <section className="space-y-12">
        <Reveal className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-[0.24em] text-malva-700 dark:text-[#E8829F]">
            CARTA DE SERVICIOS DE AUTOR
          </span>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-ink-900 dark:text-white">
            Nuestras Especialidades
          </h2>
          <p className="mt-3 text-sm sm:text-base text-ink-600 dark:text-[#D8C2CE]">
            Procedimientos no invasivos de máxima precisión técnica, diseñados con fórmulas botánicas y cosmética europea de alta fidelidad.
          </p>
        </Reveal>

        {/* Grilla de 6 Especialidades de Ultra-Lujo con Fotografía */}
        <RevealGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ESPECIALIDADES_ELABORADAS.map((item) => (
            <RevealItem key={item.id} variant="pop">
              <Link
                href={`/reservar?categoria=${item.categoriaId}`}
                className="group flex flex-col h-full overflow-hidden rounded-2xl bg-white dark:bg-[#1A1218] border border-malva-100/90 dark:border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_45px_rgba(61,20,44,0.14)] dark:hover:shadow-[0_20px_45px_rgba(0,0,0,0.7)] hover:-translate-y-1.5 transition-all duration-500"
              >
                {/* Cabecera con Fotografía Editorial */}
                <div className="relative aspect-[16/11] w-full overflow-hidden bg-malva-100 dark:bg-malva-950">
                  <Image
                    src={item.imagen}
                    alt={item.titulo}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Badge de Categoría Superior Izquierdo (Alto Contraste Claro/Oscuro) */}
                  <span className="absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-white/95 dark:bg-[#1C121A]/95 px-3 py-1 text-2xs font-bold uppercase tracking-wider text-malva-950 dark:text-[#F5E8C8] backdrop-blur-md border border-white/80 dark:border-[#C5A059]/40 shadow-xs">
                    <Sparkle className="h-2.5 w-2.5 fill-current text-[#C5A059]" />
                    {item.badge}
                  </span>

                  {/* Rating Superior Derecho (Alto Contraste Claro/Oscuro) */}
                  <span className="absolute top-3.5 right-3.5 inline-flex items-center gap-1 rounded-full bg-white/95 dark:bg-[#1C121A]/95 text-malva-950 dark:text-[#F5E8C8] px-2.5 py-1 text-xs font-bold backdrop-blur-md border border-white/80 dark:border-[#C5A059]/40 shadow-xs">
                    <Star className="h-3 w-3 fill-[#C5A059] text-[#C5A059]" />
                    <span>{item.rating}</span>
                    <span className="text-2xs text-ink-500 dark:text-white/70 font-normal">({item.reviews})</span>
                  </span>

                  {/* Duración Inferior Izquierdo (Alto Contraste Claro/Oscuro) */}
                  <span className="absolute bottom-3 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-white/95 dark:bg-[#1C121A]/95 px-3 py-1 text-xs font-semibold text-malva-950 dark:text-[#F5E8C8] backdrop-blur-md border border-white/80 dark:border-[#C5A059]/30 shadow-xs">
                    <Clock className="h-3 w-3 text-malva-700 dark:text-[#E8829F]" />
                    <span>{item.duracion}</span>
                  </span>
                </div>

                {/* Cuerpo de la Card */}
                <div className="flex flex-1 flex-col p-6">
                  <span className="text-2xs font-bold uppercase tracking-[0.2em] text-malva-700 dark:text-[#E8829F]">
                    {item.eyebrow}
                  </span>

                  <h3 className="mt-1 font-display text-xl font-semibold text-ink-900 dark:text-white group-hover:text-malva-800 dark:group-hover:text-[#E8829F] transition-colors leading-snug">
                    {item.titulo}
                  </h3>

                  <p className="mt-2.5 flex-1 text-xs sm:text-sm leading-relaxed text-ink-600 dark:text-[#D8C2CE] font-sans line-clamp-2">
                    {item.descripcion}
                  </p>

                  {/* Chips de Beneficios Técnicos */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {item.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="rounded-md bg-malva-50 dark:bg-white/5 px-2 py-0.5 text-xs font-medium text-ink-700 dark:text-[#E2D5DF] border border-malva-100/70 dark:border-white/10"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Footer de la Card: Precio & Botón */}
                  <div className="mt-5 flex items-center justify-between border-t border-malva-100/80 dark:border-white/10 pt-4">
                    <div>
                      <span className="block text-2xs uppercase tracking-wider text-ink-400 dark:text-white/60 font-semibold">
                        Desde
                      </span>
                      <span className="font-display text-base sm:text-lg font-bold text-malva-950 dark:text-[#F0D48F] tnum">
                        {item.precio} COP
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-malva-50 dark:bg-white/10 text-malva-800 dark:text-white group-hover:bg-[#3D142C] group-hover:text-white px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs">
                      <span>Reservar</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>

        {/* CTA General Inferior */}
        <div className="text-center pt-4">
          <Link
            href="/servicios"
            className="inline-flex items-center gap-2 rounded-full bg-[#3D142C] hover:bg-[#270B1C] text-white px-9 py-4 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all shadow-[0_8px_25px_rgba(61,20,44,0.22)] hover:scale-[1.02]"
          >
            <span>EXPLORAR CATÁLOGO COMPLETO</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ================= 3. RESULTADOS REALES & COMPARATIVA ANTES/DESPUÉS ================= */}
      <section className="rounded-3xl bg-[#FAF6F3] dark:bg-[#160E15] border border-[#EFE4E0] dark:border-white/10 p-6 sm:p-10 lg:p-14">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          
          {/* Columna 1: Motivos de Consulta / Deseos (4 cols) */}
          <div className="space-y-6 lg:col-span-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.24em] text-malva-700 dark:text-[#E8829F]">
                RESULTADOS QUE SE SIENTEN
              </span>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold text-ink-900 dark:text-white leading-tight">
                La Belleza Consciente Transforma Vidas.
              </h2>
            </div>

            <ul className="space-y-3.5">
              {[
                'Uñas frágiles, quebradizas o mordidas',
                'Cejas despobladas o sin definición armónica',
                'Cabello reseco, sensibilizado o sin brillo',
                'Estrés, fatiga y necesidad de desconexión',
                'Pestañas rectas y sin curvatura natural',
              ].map((deseo, idx) => (
                <li key={idx} className="flex items-center gap-3 text-sm font-semibold text-ink-800 dark:text-[#FAF5F8]">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-malva-200 dark:bg-malva-900/80 text-malva-900 dark:text-[#E8829F]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </div>
                  <span>{deseo}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna 2: Tarjeta Comparativa Antes / Después (5 cols) con Split Dual */}
          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#1E141C] border border-malva-200/80 dark:border-white/10 shadow-[0_12px_36px_rgba(61,20,44,0.1)]">
              {/* Header con Pestañas ANTES y DESPUÉS */}
              <div className="grid grid-cols-2 text-center text-xs font-bold uppercase tracking-widest border-b border-malva-100 dark:border-white/10">
                <div className="py-3 bg-[#FAF5F8] dark:bg-white/5 text-ink-600 dark:text-white/60">
                  DIAGNÓSTICO PREVIO
                </div>
                <div className="py-3 bg-[#3D142C] text-white">
                  RESULTADO FINAL
                </div>
              </div>

              {/* Comparación Fotográfica Lado a Lado (Estilo LUMIÈRE) */}
              <div className="grid grid-cols-2 divide-x divide-white/20">
                <div className="relative aspect-[3/4] w-full">
                  <Image
                    src="/images/novia_1_prep.jpg"
                    alt="Antes del tratamiento en Casa Malva"
                    fill
                    sizes="(max-width: 1024px) 50vw, 250px"
                    className="object-cover"
                  />
                  <span className="absolute bottom-2 left-2 rounded-md bg-black/75 px-2 py-0.5 text-2xs font-bold text-white uppercase tracking-wider backdrop-blur-xs">
                    Antes
                  </span>
                </div>

                <div className="relative aspect-[3/4] w-full">
                  <Image
                    src="/images/novia_3_glow.jpg"
                    alt="Después del tratamiento en Casa Malva"
                    fill
                    sizes="(max-width: 1024px) 50vw, 250px"
                    className="object-cover"
                  />
                  <span className="absolute bottom-2 right-2 rounded-md bg-[#3D142C] px-2 py-0.5 text-2xs font-bold text-white uppercase tracking-wider shadow-xs">
                    Después
                  </span>
                </div>
              </div>

              {/* Pie de Foto */}
              <div className="p-4 text-center text-xs text-ink-500 dark:text-[#D8C2CE]">
                Resultados reales y duraderos logrados por nuestras artistas en cabina.
              </div>
            </div>
          </div>

          {/* Columna 3: Testimonio de Clienta (3 cols) */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl bg-white dark:bg-[#1E141C] border border-malva-200/80 dark:border-white/10 p-6 sm:p-7 shadow-[0_8px_24px_rgba(61,20,44,0.06)] space-y-4">
              <span className="font-display text-4xl text-malva-600 dark:text-[#E8829F] leading-none select-none">
                “
              </span>
              <p className="text-sm italic leading-relaxed text-ink-700 dark:text-[#E2D5DF]">
                Por fin siento mis uñas fuertes y mis cejas con un marco natural. El trato y la delicadeza del equipo en Casa Malva es una experiencia que renueva tu energía.
              </p>
              <div className="border-t border-malva-100 dark:border-white/10 pt-3">
                <p className="text-xs font-bold text-ink-900 dark:text-white">
                  — Mariana Vélez
                </p>
                <p className="text-xs text-ink-500 dark:text-[#D8C2CE]">
                  Clienta habitual en El Poblado
                </p>
                <div className="flex gap-1 text-[#C5A059] pt-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ================= 4. SOBRE EL ESTUDIO & MÉTRICAS DE AUTORIDAD ================= */}
      <section id="nosotros" className="space-y-8">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          
          {/* Foto de Arquitectura Interior del Salón (4 cols) */}
          <div className="lg:col-span-4">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-malva-200/80 dark:border-white/10 shadow-[0_16px_40px_rgba(61,20,44,0.1)]">
              <Image
                src="/images/salon_interior_luxury.jpg"
                alt="Interiorismo del estudio Casa Malva en El Poblado"
                fill
                sizes="(max-width: 1024px) 100vw, 400px"
                className="object-cover"
              />
              <span className="absolute bottom-3 left-3 rounded-full bg-black/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md border border-white/15">
                Sede El Poblado · Medellín
              </span>
            </div>
          </div>

          {/* Texto de Filosofía (5 cols) */}
          <div className="space-y-5 lg:col-span-5">
            <span className="text-xs font-bold uppercase tracking-[0.24em] text-malva-700 dark:text-[#E8829F]">
              NUESTRO ESTUDIO
            </span>

            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-ink-900 dark:text-white leading-[1.12]">
              Donde la Técnica se Encuentra con la Calidez
            </h2>

            <p className="text-sm sm:text-base leading-relaxed text-ink-700 dark:text-[#E2D5DF]">
              En Casa Malva creamos un refugio en el corazón de El Poblado. Integramos técnicas avanzadas de belleza europea con fórmulas veganas y libres de tóxicos. Cuidamos cada segundo de tu cita con hospitalidad cálida, aromaterapia y atención exclusiva sin prisas.
            </p>

            <div className="pt-2">
              <Link
                href="/servicios"
                className="inline-flex items-center gap-2 rounded-full bg-[#3D142C] hover:bg-[#270B1C] text-white px-7 py-3 text-xs font-bold uppercase tracking-widest transition-all shadow-md hover:scale-[1.02]"
              >
                <span>CONOCER NUESTRA CARTA</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* 3 Métricas de Impacto Apiladas (3 cols) */}
          <div className="space-y-4 lg:col-span-3">
            <div className="flex items-center gap-4 rounded-2xl bg-white dark:bg-[#1A1218] border border-malva-100 dark:border-white/10 p-5 shadow-xs">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-malva-100/70 dark:bg-malva-900/40 text-malva-800 dark:text-[#E8829F]">
                <Users className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <div>
                <span className="block text-2xl font-bold tracking-tight text-ink-900 dark:text-white tnum">
                  +3,500
                </span>
                <span className="text-xs font-medium text-ink-500 dark:text-[#D8C2CE]">
                  Clientas Satisfechas
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl bg-white dark:bg-[#1A1218] border border-malva-100 dark:border-white/10 p-5 shadow-xs">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-malva-100/70 dark:bg-malva-900/40 text-malva-800 dark:text-[#E8829F]">
                <Award className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <div>
                <span className="block text-2xl font-bold tracking-tight text-ink-900 dark:text-white tnum">
                  6+
                </span>
                <span className="text-xs font-medium text-ink-500 dark:text-[#D8C2CE]">
                  Años de Maestría
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl bg-white dark:bg-[#1A1218] border border-malva-100 dark:border-white/10 p-5 shadow-xs">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-malva-100/70 dark:bg-malva-900/40 text-malva-800 dark:text-[#E8829F]">
                <ShieldCheck className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <div>
                <span className="block text-2xl font-bold tracking-tight text-ink-900 dark:text-white tnum">
                  100%
                </span>
                <span className="text-xs font-medium text-ink-500 dark:text-[#D8C2CE]">
                  Libres de Tóxicos
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ================= 5. ESPECIALISTAS DE AUTOR (ROSTER DE EQUIPO) ================= */}
      <section className="space-y-10">
        <Reveal className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-[0.24em] text-malva-700 dark:text-[#E8829F]">
            NUESTRO EQUIPO
          </span>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-ink-900 dark:text-white">
            Conoce a Nuestras Artistas
          </h2>
          <p className="mt-3 text-sm sm:text-base text-ink-600 dark:text-[#D8C2CE]">
            Profesionales apasionadas dedicadas a realzar tu armonía natural con máxima precisión.
          </p>
        </Reveal>

        <RevealGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              id: 'pro_camila',
              nombre: 'Camila Restrepo',
              titulo: 'Master Lash & Brow Artist',
              especialidad: 'Arquitectura de Cejas & Lifting',
              foto: '/images/pro_camila.jpg',
            },
            {
              id: 'pro_daniela',
              nombre: 'Daniela Mesa',
              titulo: 'Colorista de Autor',
              especialidad: 'Balayage & Colorimetría HD',
              foto: '/images/pro_daniela.jpg',
            },
            {
              id: 'pro_valentina',
              nombre: 'Valentina Gómez',
              titulo: 'Especialista en Uñas',
              especialidad: 'Manicura Rusa & Escultura Gel',
              foto: '/images/pro_valentina.jpg',
            },
            {
              id: 'pro_sara',
              nombre: 'Sara López',
              titulo: 'Terapeuta Capilar',
              especialidad: 'Spa Botánico & Bótox Orgánico',
              foto: '/images/pro_sara.jpg',
            },
          ].map((pro) => (
            <RevealItem key={pro.id} variant="pop">
              <div className="group overflow-hidden rounded-2xl bg-white dark:bg-[#1A1218] border border-malva-100 dark:border-white/10 shadow-xs hover:shadow-[0_12px_32px_rgba(61,20,44,0.1)] transition-all duration-300">
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-malva-100">
                  <Image
                    src={pro.foto}
                    alt={pro.nombre}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                </div>

                <div className="p-5 text-center">
                  <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-white">
                    {pro.nombre}
                  </h3>
                  <p className="text-xs font-bold uppercase tracking-wider text-malva-700 dark:text-[#E8829F] mt-1">
                    {pro.titulo}
                  </p>
                  <p className="text-xs text-ink-500 dark:text-[#D8C2CE] mt-1">
                    {pro.especialidad}
                  </p>

                  <div className="mt-4 pt-3 border-t border-malva-100 dark:border-white/10">
                    <Link
                      href={`/reservar?profesional=${pro.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-malva-800 dark:text-[#E8829F] hover:underline"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      <span>Agendar con ella</span>
                    </Link>
                  </div>
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* ================= 6. CONVERSIÓN & PREGUNTAS FRECUENTES (FAQ SPLIT) ================= */}
      <section className="grid items-start gap-10 lg:grid-cols-12 pt-6">
        
        {/* Columna Izquierda: Tarjeta de Reserva Directa (5 cols) */}
        <div className="lg:col-span-5 rounded-3xl bg-[#FAF6F3] dark:bg-[#160E15] border border-[#EFE4E0] dark:border-white/10 p-7 sm:p-9 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.24em] text-malva-700 dark:text-[#E8829F]">
              RESERVA TU ESPACIO
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink-900 dark:text-white leading-tight">
              Inicia tu Experiencia en Casa Malva
            </h2>
            <p className="text-sm text-ink-600 dark:text-[#D8C2CE] leading-relaxed">
              Reserva tu cita en menos de dos minutos. Sin esperas, con confirmación inmediata y atención personalizada.
            </p>
          </div>

          {/* Imagen Decorativa del Estudio */}
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/80 dark:border-white/10 shadow-xs">
            <Image
              src="/images/editorial_still_life.jpg"
              alt="Detalle estético Casa Malva"
              fill
              sizes="(max-width: 1024px) 100vw, 400px"
              className="object-cover"
            />
          </div>

          <ul className="space-y-2.5 text-xs sm:text-sm text-ink-700 dark:text-[#E2D5DF]">
            <li className="flex items-center gap-2.5">
              <Check className="h-4 w-4 text-malva-700 dark:text-[#E8829F]" strokeWidth={2.5} />
              <span>Diagnóstico sensorial previo sin costo</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="h-4 w-4 text-malva-700 dark:text-[#E8829F]" strokeWidth={2.5} />
              <span>Café de origen o infusión aromática de bienvenida</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="h-4 w-4 text-malva-700 dark:text-[#E8829F]" strokeWidth={2.5} />
              <span>Garantía de satisfacción y cuidado posterior</span>
            </li>
          </ul>

          <div className="pt-2">
            <Link
              href="/reservar"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#3D142C] hover:bg-[#270B1C] text-white py-4 text-xs sm:text-sm font-bold tracking-widest uppercase transition-all shadow-[0_8px_25px_rgba(61,20,44,0.3)] hover:scale-[1.01]"
            >
              <CalendarPlus className="h-4 w-4" />
              <span>AGENDAR MI CITA AHORA</span>
            </Link>
          </div>
        </div>

        {/* Columna Derecha: Acordeón FAQ (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.24em] text-malva-700 dark:text-[#E8829F]">
              PREGUNTAS FRECUENTES
            </span>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold text-ink-900 dark:text-white">
              Todo lo que Necesitas Saber
            </h2>
          </div>

          <FaqAccordion />
        </div>

      </section>

    </div>
  )
}
