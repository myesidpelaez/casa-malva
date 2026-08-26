"use client"

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Sparkles,
  Send,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Bot,
  CalendarCheck,
} from 'lucide-react'
import { RightDrawer } from '@/components/ui/drawer'
import { cn } from '@/lib/utils'

type MensajeChat = {
  id: string
  rol: 'cliente' | 'agente' | 'sistema'
  texto: string
}

export function ChatWidget() {
  const [abierto, setAbierto] = React.useState(false)
  const [mensajes, setMensajes] = React.useState<MensajeChat[]>([
    {
      id: 'bienvenida_1',
      rol: 'agente',
      texto:
        '¡Hola! Soy Malva, tu Concierge de belleza en Casa Malva. ¿En qué puedo consentirte hoy? Puedo ayudarte a consultar disponibilidad de especialistas, resolver dudas sobre rituales o agendar tu cita.',
    },
  ])
  const [inputTexto, setInputTexto] = React.useState('')
  const [cargando, setCargando] = React.useState(false)
  const [errorRed, setErrorRed] = React.useState<string | null>(null)
  const [ultimoMensajeFallido, setUltimoMensajeFallido] = React.useState<string | null>(null)
  const [escalado, setEscalado] = React.useState(false)

  // Generamos un ID de sesión estable por pestaña/sesión de navegador
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

  // Auto-scroll al final con cada nuevo mensaje
  React.useEffect(() => {
    if (abierto) {
      finalMensajesRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [mensajes, abierto, cargando])

  // Focus en el input cuando se abre el drawer
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
          throw new Error('Has enviado muchos mensajes seguidos. Espera un momento.')
        }
        throw new Error(`Error de servidor (${res.status})`)
      }

      const data = (await res.json()) as { texto: string; escalado: boolean }
      setMensajes((prev) => [
        ...prev,
        {
          id: `bot_${Date.now()}`,
          rol: 'agente',
          texto: data.texto,
        },
      ])

      if (data.escalado) {
        setEscalado(true)
      }
    } catch {
      setErrorRed('Hubo un problema de conexión al enviar tu mensaje.')
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
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.96 }}
          className="group relative flex items-center gap-2.5 rounded-full bg-gradient-to-r from-malva-800 via-malva-700 to-malva-800 hover:from-malva-700 hover:to-malva-900 text-white px-4.5 py-3 shadow-[0_8px_25px_rgba(102,61,91,0.35)] transition-all border border-malva-300/30 focus:outline-none focus:ring-2 focus:ring-malva-400 focus:ring-offset-2 backdrop-blur-md cursor-pointer"
        >
          <div className="relative">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-white/15 text-white">
              <Sparkles className="h-4 w-4 text-malva-200" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </div>
          <div className="flex flex-col text-left hidden sm:flex">
            <span className="font-display font-semibold text-[13.5px] leading-tight text-white tracking-tight">
              Malva · Concierge
            </span>
            <span className="text-[10px] text-malva-200/90 font-sans leading-tight">
              Atención 24/7
            </span>
          </div>
        </motion.button>
      </div>

      {/* Panel lateral / modal reutilizando RightDrawer */}
      <RightDrawer
        open={abierto}
        onOpenChange={setAbierto}
        title={
          <div className="flex items-center gap-2.5 text-ink-900">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-malva-100 dark:bg-malva-950/60 text-malva-700 dark:text-malva-300 border border-malva-200/60">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-display font-semibold text-ink-900">
                Malva · Concierge de Belleza
              </div>
              <div className="text-xs text-ink-500 font-sans font-normal flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Asistente inteligente · Casa Malva 24/7
              </div>
            </div>
          </div>
        }
        description="Consulta disponibilidad de especialistas, cotiza rituales o agenda tu cita al instante."
        size="md"
        className="flex flex-col h-full"
      >
        {/* Contenedor de mensajes */}
        <div className="flex flex-col gap-3 py-2 min-h-full justify-between">
          <div className="flex flex-col gap-3">
            {mensajes.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'flex flex-col max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
                  m.rol === 'cliente'
                    ? 'self-end bg-malva-700 text-white rounded-br-xs'
                    : 'self-start bg-[var(--card)] text-ink-900 border border-ink-100 dark:border-ink-800 rounded-bl-xs'
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.texto}</p>
              </div>
            ))}

            {/* Estado: escribiendo... */}
            {cargando && (
              <div className="self-start flex items-center gap-2 rounded-2xl bg-[var(--card)] border border-ink-100 dark:border-ink-800 px-4 py-2.5 text-xs text-ink-500 shadow-sm rounded-bl-xs">
                <Sparkles className="h-3.5 w-3.5 text-malva-500 animate-spin" />
                <span>Malva está redactando…</span>
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-malva-400 animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-malva-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-malva-400 animate-bounce [animation-delay:0.4s]" />
                </span>
              </div>
            )}

            {/* Estado: error de red con reintento */}
            {errorRed && (
              <div className="self-center w-full my-2 flex items-center justify-between gap-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-800 dark:text-rose-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{errorRed}</span>
                </div>
                <button
                  type="button"
                  onClick={reintentar}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 text-xs font-medium shrink-0 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  Reintentar
                </button>
              </div>
            )}

            {/* Estado: te paso con una persona */}
            {escalado && (
              <div className="self-center w-full my-2 flex items-center gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-900 dark:text-amber-200">
                <UserCheck className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <span className="font-semibold">Te contacto con recepción: </span>
                  <span>Una especialista de nuestro equipo te responderá directamente.</span>
                </div>
              </div>
            )}

            <div ref={finalMensajesRef} />
          </div>

          {/* Área fija de entrada */}
          <div className="sticky bottom-0 pt-3 bg-gradient-to-t from-[var(--card)] via-[var(--card)] to-transparent">
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
                placeholder="Pregúntale a Malva... (Enter para enviar)"
                disabled={cargando}
                className="w-full resize-none bg-transparent px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none disabled:opacity-50 min-h-[38px] max-h-32"
              />
              <button
                type="submit"
                disabled={cargando || !inputTexto.trim()}
                aria-label="Enviar mensaje a Malva"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-malva-700 hover:bg-malva-800 text-white disabled:opacity-40 disabled:hover:bg-malva-700 transition-all cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <div className="flex justify-between px-2 pt-1 text-[10px] text-ink-400">
              <span>Enter envía · Shift+Enter salta línea</span>
              <span>{inputTexto.length}/1000</span>
            </div>
          </div>
        </div>
      </RightDrawer>
    </>
  )
}
