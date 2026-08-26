'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Sparkles,
  Send,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Clock,
  CalendarCheck2,
  CheckCircle2,
  ArrowRight,
  User,
  HeartHandshake,
} from 'lucide-react'
import { RightDrawer } from '@/components/ui/drawer'
import { formatCurrencyFromCents } from '@/lib/currency'
import { getServiceImage, getProfessionalAvatar, humanDuration } from '@/lib/catalogo-ui'
import { cn } from '@/lib/utils'

type MensajeChat = {
  id: string
  rol: 'cliente' | 'agente' | 'sistema'
  texto: string
  servicioRecomendado?: {
    id: string
    nombre: string
    precioCentavos: number
    duracionMin: number
  }
  especialistaRecomendada?: {
    id: string
    nombre: string
    cargo: string
  }
}

const CHIPS_SUGERENCIAS = [
  { label: '💅 Ver rituales de Uñas', prompt: '¿Qué servicios de uñas tienen disponibles y cuáles son sus precios?' },
  { label: '✂️ Balayage & Colorimetría', prompt: 'Quiero información y cotización sobre Balayage y cuidado del color.' },
  { label: '👁️ Diseño de Cejas y Mirada', prompt: '¿Qué tratamientos de cejas y pestañas realizan?' },
  { label: '👩‍🎨 Conocer al equipo', prompt: '¿Quiénes son las especialistas y en qué se destaca cada una?' },
  { label: '📅 Consultar horarios libres', prompt: '¿Qué disponibilidad de horarios tienen para agendar esta semana?' },
]

// Base de datos ligera para enriquecer visualmente las menciones en el chat
const SERVICIOS_POPULARES = [
  { id: 'srv_unas_semi', nombre: 'Manicure Semipermanente', precioCentavos: 5500000, duracionMin: 60, keywords: ['manicure', 'semipermanente', 'uñas', 'uña', 'esmalte'] },
  { id: 'srv_cabello_balayage', nombre: 'Balayage de Autor', precioCentavos: 42000000, duracionMin: 240, keywords: ['balayage', 'decoloracion', 'mechas', 'iluminacion'] },
  { id: 'srv_cejas_diseno', nombre: 'Diseño y Laminado de Cejas', precioCentavos: 4500000, duracionMin: 45, keywords: ['cejas', 'ceja', 'laminado', 'mirada', 'lifting'] },
  { id: 'srv_cabello_corte', nombre: 'Corte y Cepillado de Autor', precioCentavos: 6500000, duracionMin: 60, keywords: ['corte', 'cepillado', 'blower', 'peinado'] },
  { id: 'srv_cabello_keratina', nombre: 'Keratina Orgánica', precioCentavos: 29000000, duracionMin: 180, keywords: ['keratina', 'alisado', 'organica', 'aminoacidos'] },
]

const ESPECIALISTAS_INFO = [
  { id: 'pro_daniela', nombre: 'Daniela Ospina', cargo: 'Estilista Sénior · Balayage & Visagismo', keywords: ['daniela', 'ospina', 'colorista'] },
  { id: 'pro_camila', nombre: 'Camila Restrepo', cargo: 'Especialista en Mirada & Cejas', keywords: ['camila', 'restrepo', 'cejas'] },
  { id: 'pro_sara', nombre: 'Sara Jaramillo', cargo: 'Terapeuta Capilar & Spa', keywords: ['sara', 'jaramillo', 'terapia'] },
  { id: 'pro_valentina', nombre: 'Valentina Gómez', cargo: 'Master Nail Artist & Spa', keywords: ['valentina', 'gomez', 'manicurista'] },
  { id: 'pro_marcela', nombre: 'Marcela Duque', cargo: 'Maquilladora Editorial', keywords: ['marcela', 'duque', 'maquillaje'] },
]

function detectarRecomendaciones(texto: string) {
  const norm = texto.toLowerCase()
  const servicio = SERVICIOS_POPULARES.find((s) => s.keywords.some((k) => norm.includes(k)))
  const especialista = ESPECIALISTAS_INFO.find((e) => e.keywords.some((k) => norm.includes(k)))
  return { servicio, especialista }
}

export function ChatWidget() {
  const [abierto, setAbierto] = React.useState(false)
  const [mensajes, setMensajes] = React.useState<MensajeChat[]>([
    {
      id: 'bienvenida_1',
      rol: 'agente',
      texto:
        '¡Hola! Soy Malva, tu Concierge de belleza en Casa Malva. ✨\n\n¿En qué puedo consentirte hoy? Puedo orientarte sobre nuestros rituales de autor, recomendarte a la especialista ideal o ayudarte a reservar tu cita en tiempo real.',
    },
  ])
  const [inputTexto, setInputTexto] = React.useState('')
  const [cargando, setCargando] = React.useState(false)
  const [errorRed, setErrorRed] = React.useState<string | null>(null)
  const [ultimoMensajeFallido, setUltimoMensajeFallido] = React.useState<string | null>(null)
  const [escalado, setEscalado] = React.useState(false)

  const [sessionId] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('casa_malva_chat_session')
      if (stored) return stored
      const nuevo = crypto.randomUUID()
      sessionStorage.setItem('casa_malva_chat_session', nuevo)
      return nuevo
    }
    return 'sesion_temp'
  })

  const finalMensajesRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (abierto) {
      finalMensajesRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [mensajes, abierto, cargando])

  React.useEffect(() => {
    if (abierto) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 150)
    }
  }, [abierto])

  async function enviarMensaje(texto: string) {
    const textoLimpio = texto.trim()
    if (!textoLimpio || cargando) return

    setErrorRed(null)
    setUltimoMensajeFallido(null)

    const mensajeUsuario: MensajeChat = {
      id: `usr_${Date.now()}`,
      rol: 'cliente',
      texto: textoLimpio,
    }

    setMensajes((prev) => [...prev, mensajeUsuario])
    setInputTexto('')
    setCargando(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          mensaje: textoLimpio,
        }),
      })

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Has enviado varios mensajes seguidos. Espera unos segundos.')
        }
        throw new Error('No pudimos conectar con el servidor de Casa Malva.')
      }

      const data = await res.json()
      const { servicio, especialista } = detectarRecomendaciones(data.texto || '')

      const mensajeRespuesta: MensajeChat = {
        id: `agt_${Date.now()}`,
        rol: 'agente',
        texto: data.texto || '¿En qué más te puedo colaborar?',
        servicioRecomendado: servicio,
        especialistaRecomendada: especialista,
      }

      setMensajes((prev) => [...prev, mensajeRespuesta])
      if (data.escalado) setEscalado(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de conexión'
      setErrorRed(msg)
      setUltimoMensajeFallido(textoLimpio)
    } finally {
      setCargando(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviarMensaje(inputTexto)
    }
  }

  function reintentar() {
    if (ultimoMensajeFallido) {
      enviarMensaje(ultimoMensajeFallido)
    }
  }

  return (
    <>
      {/* Botón flotante editorial 'Malva · Concierge' */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40">
        <motion.button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir chat con Malva, tu Concierge de belleza"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.96 }}
          className="group relative flex items-center gap-3 rounded-full bg-gradient-to-r from-malva-900 via-malva-800 to-malva-900 hover:from-malva-800 hover:to-malva-950 text-white px-5 py-3.5 shadow-[0_10px_30px_rgba(102,61,91,0.45)] border border-malva-300/40 focus:outline-none focus:ring-2 focus:ring-malva-400 focus:ring-offset-2 backdrop-blur-xl cursor-pointer"
        >
          <div className="relative">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white shadow-xs">
              <Sparkles className="h-4.5 w-4.5 text-[#F3EAF0]" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white" />
            </span>
          </div>
          <div className="flex flex-col text-left hidden sm:flex">
            <span className="font-display font-bold text-[14px] leading-tight text-white tracking-tight">
              Malva · Concierge
            </span>
            <span className="text-[11px] text-malva-200 font-medium leading-tight">
              Asistente de Belleza 24/7
            </span>
          </div>
        </motion.button>
      </div>

      {/* Panel lateral / modal de Concierge */}
      <RightDrawer
        open={abierto}
        onOpenChange={setAbierto}
        title={
          <div className="flex items-center gap-3 text-ink-950 dark:text-white">
            <div className="relative">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-malva-700 to-malva-950 text-white border border-malva-300/30 shadow-md">
                <Sparkles className="h-5 w-5 text-[#F3EAF0]" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[var(--card)]" />
            </div>
            <div>
              <div className="text-[17px] sm:text-[18px] font-display font-bold text-ink-950 dark:text-white leading-tight">
                Malva · Concierge de Belleza
              </div>
              <div className="text-[12px] text-ink-500 dark:text-ink-300 font-sans flex items-center gap-1.5 mt-0.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Atención continua · Casa Malva Medellín</span>
              </div>
            </div>
          </div>
        }
        description="Orientación de autor, disponibilidad de especialistas y cotización de rituales en tiempo real."
        size="md"
        className="flex flex-col h-full"
      >
        <div className="flex flex-col gap-4 py-3 min-h-full justify-between">
          
          {/* Flujo de Mensajes */}
          <div className="flex flex-col gap-3.5 overflow-y-auto">
            {mensajes.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'flex flex-col max-w-[88%] rounded-[20px] p-4 text-[14px] leading-relaxed shadow-xs transition-all',
                  m.rol === 'cliente'
                    ? 'self-end bg-malva-700 text-white rounded-br-xs'
                    : 'self-start bg-[var(--card)] text-ink-950 dark:text-ink-50 border border-ink-200/80 dark:border-ink-800 rounded-bl-xs'
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.texto}</p>

                {/* Rich Component: Tarjeta Interactiva de Servicio */}
                {m.servicioRecomendado && (
                  <div className="mt-3.5 rounded-2xl border border-malva-200/80 dark:border-ink-700 bg-malva-50/60 dark:bg-ink-900/60 p-3 text-ink-900 dark:text-white shadow-2xs space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-malva-200 shadow-2xs">
                        <Image
                          src={getServiceImage(m.servicioRecomendado)}
                          alt={m.servicioRecomendado.nombre}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-display font-bold text-[14.5px] leading-snug truncate">
                          {m.servicioRecomendado.nombre}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[12px] text-ink-600 dark:text-ink-300">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 text-malva-600 dark:text-malva-300" />
                            {humanDuration(m.servicioRecomendado.duracionMin)}
                          </span>
                          <span className="font-bold text-malva-700 dark:text-malva-200">
                            {formatCurrencyFromCents(m.servicioRecomendado.precioCentavos)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/reservar?serviceId=${m.servicioRecomendado.id}`}
                      onClick={() => setAbierto(false)}
                      className="flex items-center justify-center gap-2 w-full rounded-xl bg-malva-700 hover:bg-malva-800 text-white py-2 text-[12.5px] font-bold shadow-xs transition-all"
                    >
                      <CalendarCheck2 className="h-3.5 w-3.5" />
                      <span>Agendar este ritual</span>
                    </Link>
                  </div>
                )}

                {/* Rich Component: Tarjeta Interactiva de Especialista */}
                {m.especialistaRecomendada && !m.servicioRecomendado && (
                  <div className="mt-3.5 rounded-2xl border border-malva-200/80 dark:border-ink-700 bg-malva-50/60 dark:bg-ink-900/60 p-3 text-ink-900 dark:text-white shadow-2xs space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 rounded-full overflow-hidden border-2 border-malva-300 bg-malva-200 shadow-2xs">
                        {getProfessionalAvatar(m.especialistaRecomendada) ? (
                          <Image
                            src={getProfessionalAvatar(m.especialistaRecomendada)!}
                            alt={m.especialistaRecomendada.nombre}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="grid h-full w-full place-items-center font-bold text-malva-700">
                            {m.especialistaRecomendada.nombre.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-display font-bold text-[14.5px] leading-snug">
                          {m.especialistaRecomendada.nombre}
                        </h4>
                        <p className="text-[11.5px] text-ink-600 dark:text-ink-300 truncate">
                          {m.especialistaRecomendada.cargo}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/reservar?professionalId=${m.especialistaRecomendada.id}`}
                      onClick={() => setAbierto(false)}
                      className="flex items-center justify-center gap-2 w-full rounded-xl bg-malva-700 hover:bg-malva-800 text-white py-2 text-[12.5px] font-bold shadow-xs transition-all"
                    >
                      <User className="h-3.5 w-3.5" />
                      <span>Ver agenda de {m.especialistaRecomendada.nombre.split(' ')[0]}</span>
                    </Link>
                  </div>
                )}
              </div>
            ))}

            {/* Estado: Malva está redactando... */}
            {cargando && (
              <div className="self-start flex items-center gap-2.5 rounded-2xl bg-[var(--card)] border border-ink-200/80 dark:border-ink-800 px-4 py-3 text-[13px] text-ink-600 dark:text-ink-300 shadow-xs rounded-bl-xs">
                <Sparkles className="h-4 w-4 text-malva-600 dark:text-malva-300 animate-spin" />
                <span>Malva está consultando el estudio…</span>
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-malva-500 animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-malva-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-malva-500 animate-bounce [animation-delay:0.4s]" />
                </span>
              </div>
            )}

            {/* Error con reintento */}
            {errorRed && (
              <div className="self-center w-full my-2 flex items-center justify-between gap-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 p-3.5 text-[13px] text-rose-800 dark:text-rose-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{errorRed}</span>
                </div>
                <button
                  type="button"
                  onClick={reintentar}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 text-xs font-bold shrink-0 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  Reintentar
                </button>
              </div>
            )}

            {/* Escalado a equipo humano */}
            {escalado && (
              <div className="self-center w-full my-2 flex items-center gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 p-3.5 text-[12.5px] text-amber-900 dark:text-amber-200">
                <HeartHandshake className="h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <span className="font-bold">Te conectamos con recepción: </span>
                  <span>Una integrante de Casa Malva te responderá directamente.</span>
                </div>
              </div>
            )}

            <div ref={finalMensajesRef} />
          </div>

          {/* Atajos Rápidos / Sugerencias Interactivas */}
          <div className="space-y-3 pt-2 border-t border-ink-100 dark:border-ink-800">
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {CHIPS_SUGERENCIAS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={cargando}
                  onClick={() => enviarMensaje(chip.prompt)}
                  className="whitespace-nowrap rounded-full border border-malva-200 dark:border-ink-700 bg-[var(--card)] hover:bg-malva-50 dark:hover:bg-ink-800 px-3 py-1.5 text-[12px] font-semibold text-ink-800 dark:text-ink-200 shadow-2xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Formulario de Entrada */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                enviarMensaje(inputTexto)
              }}
              className="relative flex items-center rounded-2xl border border-ink-200 dark:border-ink-700 bg-[var(--background)] shadow-sm focus-within:border-malva-500 focus-within:ring-1 focus-within:ring-malva-500 transition-all p-1.5"
            >
              <textarea
                ref={inputRef}
                value={inputTexto}
                onChange={(e) => setInputTexto(e.target.value.slice(0, 1000))}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Escribe tu consulta a Malva..."
                disabled={cargando}
                className="w-full resize-none bg-transparent px-3 py-2 text-[14px] text-ink-950 dark:text-white placeholder:text-ink-400 focus:outline-none disabled:opacity-50 min-h-[40px] max-h-32"
              />
              <button
                type="submit"
                disabled={cargando || !inputTexto.trim()}
                aria-label="Enviar mensaje a Malva"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-malva-700 hover:bg-malva-800 text-white disabled:opacity-40 disabled:hover:bg-malva-700 transition-all cursor-pointer shadow-xs"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </form>

            <div className="flex justify-between px-2 text-[11px] text-ink-400">
              <span>Enter envía · Shift+Enter salta línea</span>
              <span>{inputTexto.length}/1000</span>
            </div>
          </div>
        </div>
      </RightDrawer>
    </>
  )
}
