'use client'

import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import Image from 'next/image'
import {
  Sparkles,
  CalendarCheck,
  Smartphone,
  MessageCircle,
  Users,
  Printer,
  Share2,
  ExternalLink,
  Phone,
  Mail,
  CheckCircle2,
} from 'lucide-react'

const DEMO_URL = 'https://casa-malva--casa-malva-demo.us-central1.hosted.app'
const CONTACT_PHONE = '+57 300 670 7219'
const CONTACT_PHONE_CLEAN = '573006707219'
const CONTACT_EMAIL = 'myesidpelaez@gmail.com'
const CONTACT_NAME = 'Mario Yesid Peláez Sánchez'
const CONTACT_ROLE = 'Software & AI Engineer • Fundador MeJorÍA'

export function FlyerContent() {
  const [qrSvg, setQrSvg] = useState<string>('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    QRCode.toString(DEMO_URL, {
      type: 'svg',
      margin: 1,
      color: {
        dark: '#3d2537', // Malva 900
        light: '#ffffff',
      },
      width: 180,
    })
      .then((svg) => setQrSvg(svg))
      .catch((err) => console.error('Error generating QR:', err))
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(DEMO_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5eff3] py-6 sm:py-10 px-3 sm:px-6 flex flex-col items-center justify-start print:p-0 print:bg-white">
      {/* Floating Action Toolbar (Hidden in Print) */}
      <aside aria-label="Herramientas del folleto" className="no-print mb-6 w-full max-w-[840px] flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-malva-200/80 bg-white/90 p-4 shadow-lg shadow-malva-900/5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-malva-100 text-malva-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-ink-900">Flyer Comercial • Carta de Presentación B2B</h1>
            <p className="text-xs text-ink-500">Diseñado para prospección comercial en Spas y Salones de Medellín</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl bg-malva-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-malva-600/20 transition-all hover:bg-malva-700 active:scale-95"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir / Guardar PDF</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 rounded-xl border border-malva-200 bg-white px-3.5 py-2 text-xs font-medium text-ink-700 hover:bg-malva-50 transition-all active:scale-95"
          >
            <Share2 className="h-4 w-4 text-malva-600" />
            <span>{copied ? '¡Enlace copiado!' : 'Copiar link'}</span>
          </button>

          <a
            href={`https://wa.me/${CONTACT_PHONE_CLEAN}?text=${encodeURIComponent('Hola Mario, vi la propuesta y demo de Casa Malva y me gustaría agendar una reunión para mi centro de estética.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
          >
            <MessageCircle className="h-4 w-4" />
            <span>WhatsApp</span>
          </a>
        </div>
      </aside>

      {/* =========================================================================
          THE PRINTABLE LUXURY FLYER SHEET (A5 / A4 Ratio - 100% Vectorial Crisp)
          ========================================================================= */}
      <div className="flyer-sheet w-full max-w-[840px] bg-white rounded-[28px] border border-malva-200 shadow-2xl overflow-hidden print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-full print:m-0 text-ink-900">
        {/* Top Decorative Header Accent */}
        <div className="h-3 w-full bg-gradient-to-r from-malva-700 via-malva-500 to-blush" />

        <div className="p-7 sm:p-10 space-y-7 print:p-8 print:space-y-6">
          {/* Header & Brand Identity */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-malva-100 pb-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-malva-200 bg-malva-50/80 px-3 py-1 text-[11px] font-semibold text-malva-700 tracking-wide uppercase">
                <Sparkles className="h-3 w-3 text-malva-600" />
                <span>Solución Digital Exclusiva para Spas & Salones</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-malva-950">
                CASA MALVA
              </h2>
              <p className="text-xs sm:text-sm font-medium text-ink-500">
                Plataforma Integral de Reservas 24/7 & Catálogo Digital Lookbook
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto rounded-2xl bg-malva-50 border border-malva-100 p-3 text-right">
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase font-bold tracking-wider text-malva-600">Medellín • Colombia</p>
                <p className="text-xs font-semibold text-ink-800">Laureles • El Poblado • Envigado</p>
              </div>
            </div>
          </div>

          {/* Main Value Proposition Headline */}
          <div className="space-y-2.5">
            <h3 className="font-display text-xl sm:text-2xl font-bold leading-snug text-ink-900">
              ¿Tus clientas intentan agendar fuera de horario y se van con la competencia?
            </h3>
            <p className="text-sm sm:text-[15px] leading-relaxed text-ink-700">
              Transforma tu negocio con un sistema personalizado que trabaja por ti: <strong>recibe citas automáticas 24/7</strong>, 
              muestra tus trabajos en un <strong>Lookbook editorial de alta gama</strong> y elimina las inasistencias con recordatorios por WhatsApp.
            </p>
          </div>

          {/* 4 Pillars of Transformation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pillar 1 */}
            <div className="rounded-2xl border border-malva-100 bg-malva-50/40 p-4 space-y-2 hover:border-malva-200 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-malva-600 text-white shadow-xs">
                  <Smartphone className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-ink-900">Catálogo Lookbook Interactivo</h4>
              </div>
              <p className="text-xs text-ink-600 leading-relaxed">
                Olvídate de los PDFs estáticos. Muestra tus acabados reales en uñas, cabello, cejas y maquillaje con fotos de alta resolución, duración y tarifas claras en COP.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="rounded-2xl border border-malva-100 bg-malva-50/40 p-4 space-y-2 hover:border-malva-200 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-malva-600 text-white shadow-xs">
                  <CalendarCheck className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-ink-900">Agendamiento 24/7 sin Comisiones</h4>
              </div>
              <p className="text-xs text-ink-600 leading-relaxed">
                Tus clientas reservan solas en 3 pasos directos: eligen servicio, profesional favorita y el horario exacto disponible en tiempo real, sin comisiones por cita.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="rounded-2xl border border-malva-100 bg-malva-50/40 p-4 space-y-2 hover:border-malva-200 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white shadow-xs">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-ink-900">WhatsApp & Cero Inasistencias</h4>
              </div>
              <p className="text-xs text-ink-600 leading-relaxed">
                Confirmación instantánea y recordatorios automáticos previos a la cita. Reduce los &quot;no-shows&quot; y mantén tu agenda llena con clientas puntuales.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="rounded-2xl border border-malva-100 bg-malva-50/40 p-4 space-y-2 hover:border-malva-200 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-malva-600 text-white shadow-xs">
                  <Users className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-ink-900">Control de Estilistas y Métricas</h4>
              </div>
              <p className="text-xs text-ink-600 leading-relaxed">
                Panel administrativo para gestionar profesionales polivalentes, turnos, horarios y consultar ingresos y servicios más vendidos en tiempo real.
              </p>
            </div>
          </div>

          {/* Visual Showcase: Miniature Services Banner */}
          <div className="rounded-2xl border border-malva-200/80 bg-gradient-to-br from-malva-50/60 via-white to-malva-50/30 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-malva-700 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-malva-600" />
                Experiencia 100% Adaptada a tu Salón
              </span>
              <span className="text-[11px] font-medium text-ink-500">Uñas • Cabello • Maquillaje • Cejas</span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="space-y-1">
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-malva-200 shadow-xs">
                  <Image src="/images/categories/unas.jpg" alt="Uñas" fill className="object-cover" />
                </div>
                <p className="text-[11px] font-bold text-ink-800">Manicure Spa</p>
                <p className="text-[10px] text-malva-700 font-semibold">$ 55.000 COP</p>
              </div>

              <div className="space-y-1">
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-malva-200 shadow-xs">
                  <Image src="/images/categories/cabello.jpg" alt="Cabello" fill className="object-cover" />
                </div>
                <p className="text-[11px] font-bold text-ink-800">Balayage & Color</p>
                <p className="text-[10px] text-malva-700 font-semibold">$ 220.000 COP</p>
              </div>

              <div className="space-y-1">
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-malva-200 shadow-xs">
                  <Image src="/images/categories/maquillaje.jpg" alt="Maquillaje" fill className="object-cover" />
                </div>
                <p className="text-[11px] font-bold text-ink-800">Maquillaje Social</p>
                <p className="text-[10px] text-malva-700 font-semibold">$ 120.000 COP</p>
              </div>

              <div className="space-y-1">
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-malva-200 shadow-xs">
                  <Image src="/images/categories/cejas.jpg" alt="Cejas" fill className="object-cover" />
                </div>
                <p className="text-[11px] font-bold text-ink-800">Laminado & Pestañas</p>
                <p className="text-[10px] text-malva-700 font-semibold">$ 75.000 COP</p>
              </div>
            </div>
          </div>

          {/* Interactive QR Demo Callout Box */}
          <div className="rounded-2xl border-2 border-dashed border-malva-300 bg-gradient-to-r from-malva-50/90 to-white p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="space-y-2 text-center sm:text-left flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-malva-100 px-3 py-1 text-xs font-bold text-malva-800">
                <Sparkles className="h-3.5 w-3.5 text-malva-600" />
                <span>Pruébalo ahora en vivo</span>
              </div>
              <h4 className="font-display text-lg sm:text-xl font-bold text-ink-900">
                Escanea el código QR con tu celular
              </h4>
              <p className="text-xs sm:text-sm text-ink-600 leading-relaxed">
                Vive la experiencia exactamente como la verán tus clientas: explora el catálogo interactivo y prueba el asistente de agendamiento en tiempo real.
              </p>
              <div className="pt-1">
                <a
                  href={DEMO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-malva-700 hover:text-malva-900 underline underline-offset-4"
                >
                  <span>{DEMO_URL}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="shrink-0 flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-malva-200 shadow-md">
              {qrSvg ? (
                <div
                  className="w-[140px] h-[140px] sm:w-[155px] sm:h-[155px] flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              ) : (
                <div className="w-[140px] h-[140px] bg-malva-100 animate-pulse rounded-xl" />
              )}
              <span className="text-[10px] font-bold tracking-wider text-malva-800 uppercase">
                Demo Interactiva
              </span>
            </div>
          </div>

          {/* Executive Footer: MeJorIA Brand & Mario's Contact Details */}
          <div className="rounded-2xl border border-malva-200 bg-gradient-to-b from-malva-950 to-malva-900 p-6 text-white space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/15 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-malva-300">
                  Desarrollo de Software a la Medida
                </span>
                <h4 className="font-display text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>MeJorÍA</span>
                  <span className="text-xs font-normal text-malva-200">| Soluciones de IA & Software para PYMEs</span>
                </h4>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs font-medium text-malva-200">Implementación personalizada • Soporte en Medellín</p>
              </div>
            </div>

            {/* Contact Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-malva-300">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-white leading-tight">{CONTACT_NAME}</p>
                  <p className="text-[11px] text-malva-200">{CONTACT_ROLE}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/20 text-emerald-300">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-malva-200">WhatsApp / Teléfono directo</p>
                  <a href={`tel:${CONTACT_PHONE_CLEAN}`} className="font-bold text-white hover:underline">
                    {CONTACT_PHONE}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-malva-300">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-malva-200">Correo electrónico</p>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-white hover:underline truncate block">
                    {CONTACT_EMAIL}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
