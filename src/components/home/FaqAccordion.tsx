'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FaqItem {
  id: string
  pregunta: string
  respuesta: string
}

const FAQS_DEFECTO: FaqItem[] = [
  {
    id: 'faq-1',
    pregunta: '¿Cómo sé cuál tratamiento capilar o de cejas es el ideal para mí?',
    respuesta:
      'Al iniciar cada cita realizamos un diagnóstico sensorial personalizado sin costo adicional. Analizamos la condición de tu fibra capilar o la morfología de tu rostro para recomendarte el protocolo exacto que potenciará tu belleza natural.',
  },
  {
    id: 'faq-2',
    pregunta: '¿Los esmaltes y productos que utilizan son seguros y libres de tóxicos?',
    respuesta:
      'Absolutamente. Toda nuestra carta de manicura, tratamientos capilares y tintes utiliza fórmulas 10-Free, veganas y libres de crueldad animal, cuidando la salud de tus uñas y cuero cabelludo sin químicos agresivos.',
  },
  {
    id: 'faq-3',
    pregunta: '¿Cuánto tiempo dura una sesión de manicura rusa o esculpido?',
    respuesta:
      'Una manicura rusa con esmaltado semipermanente toma aproximadamente 75 a 90 minutos. El esculpido de uñas en gel o polygel requiere entre 100 y 120 minutos, dedicando el tiempo necesario para una arquitectura perfecta y duradera.',
  },
  {
    id: 'faq-4',
    pregunta: '¿Cómo puedo reagendar o cancelar mi cita si surge un imprevisto?',
    respuesta:
      'Puedes gestionar tu cita directamente desde el enlace de confirmación en WhatsApp o en nuestra plataforma hasta con 4 horas de anticipación sin ninguna penalización.',
  },
  {
    id: 'faq-5',
    pregunta: '¿Ofrecen atención personalizada para eventos especiales o novias?',
    respuesta:
      'Sí, contamos con paquetes exclusivos de preparación previa y el día del evento (maquillaje HD, peinado de autor y spa de manos) tanto en nuestro estudio de El Poblado como a domicilio bajo reserva previa.',
  },
]

export function FaqAccordion({ items = FAQS_DEFECTO }: { items?: FaqItem[] }) {
  const [abierta, setAbierta] = React.useState<string | null>(items[0]?.id || null)

  const toggle = (id: string) => {
    setAbierta((actual) => (actual === id ? null : id))
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const estaAbierta = abierta === item.id

        return (
          <div
            key={item.id}
            className={cn(
              'overflow-hidden rounded-2xl border transition-all duration-300',
              estaAbierta
                ? 'border-malva-300/80 bg-white/95 dark:border-[#C5A059]/40 dark:bg-[#1C141B] shadow-[0_4px_20px_rgba(61,20,44,0.06)]'
                : 'border-malva-100/70 bg-white/60 dark:border-white/10 dark:bg-[#160E15]/60 hover:border-malva-200'
            )}
          >
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors"
              aria-expanded={estaAbierta}
            >
              <span className="font-sans text-base font-semibold text-ink-950 dark:text-[#FAF5F8]">
                {item.pregunta}
              </span>
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-transform duration-300',
                  estaAbierta
                    ? 'border-malva-700 bg-malva-900 text-white dark:border-[#C5A059] dark:bg-[#C5A059] dark:text-ink-950 rotate-45'
                    : 'border-malva-200 text-ink-600 dark:border-white/20 dark:text-white/80'
                )}
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              </span>
            </button>

            <AnimatePresence initial={false}>
              {estaAbierta && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="border-t border-malva-100/60 px-5 pb-5 pt-3 dark:border-white/10">
                    <p className="text-sm leading-relaxed text-ink-600 dark:text-[#E2D5DF]">
                      {item.respuesta}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
