'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Send, RefreshCw, Sparkles, UserCheck, AlertCircle, Bot } from 'lucide-react'
import { RightDrawer } from '@/components/ui/drawer'
import { cn } from '@/lib/utils'

type MensajeUI = {
  id: string
  rol: 'cliente' | 'agente'
  texto: string
  esError?: boolean
}

const MENSAJE_BIENVENIDA: MensajeUI = {
  id: 'msg_welcome',
  rol: 'agente',
  texto: '¡Hola! Soy la recepcionista 24/7 de Casa Malva. ¿En qué te puedo ayudar hoy?',
}

export function ChatWidget() {
  const [abierto, setAbierto] = React.useState(false)
  const [mensajes, setMensajes] = React.useState<MensajeUI[]>([MENSAJE_BIENVENIDA])
  const [inputTexto, setInputTexto] = React.useState('')
  const [cargando, setCargando] = React.useState(false)
  const [errorRed, setErrorRed] = React.useState<string | null>(null)
  const [ultimoMensajeFallido, setUltimoMensajeFallido] = React.useState<string | null>(null)
  const [escalado, setEscalado] = React.useState(false)

  const finalMensajesRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = React.useCallback(() => {
    finalMensajesRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  React.useEffect(() => {
    if (abierto) {
      scrollToBottom()
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [abierto, mensajes, cargando, scrollToBottom])

  async function enviarMensaje(textoAEnviar: string) {
    const textoLimpio = textoAEnviar.trim()
    if (!textoLimpio || cargando) return

    setErrorRed(null)
    setUltimoMensajeFallido(null)

    const mensajeUsuario: MensajeUI = {
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
        body: JSON.stringify({ mensaje: textoLimpio }),
      })

      if (!res.ok) {
        if (res.status === 429) {
          const data = (await res.json().catch(() => ({}))) as { texto?: string }
          setMensajes((prev) => [
            ...prev,
            {
              id: `bot_${Date.now()}`,
              rol: 'agente',
              texto: data.texto || 'Has alcanzado el límite de mensajes por ahora. Te contactaremos pronto.',
            },
          ])
          setEscalado(true)
          return
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
      {/* Botón flotante accesible abajo a la derecha */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40">
        <motion.button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir chat con la recepcionista"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="group relative flex items-center gap-2.5 rounded-full bg-malva-700 hover:bg-malva-800 text-white px-4.5 py-3.5 shadow-xl transition-all border border-malva-500/30 focus:outline-none focus:ring-2 focus:ring-malva-400 focus:ring-offset-2"
        >
          <div className="relative">
            <MessageSquare className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </div>
          <span className="font-sans font-medium text-sm hidden sm:inline-block">
            Chat en vivo
          </span>
        </motion.button>
      </div>

      {/* Panel lateral / modal reutilizando RightDrawer */}
      <RightDrawer
        open={abierto}
        onOpenChange={setAbierto}
        title={
          <div className="flex items-center gap-2.5 text-ink-900">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-malva-100 text-malva-700">
              <Bot className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-display font-semibold">Recepcionista Casa Malva</div>
              <div className="text-xs text-ink-500 font-sans font-normal flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Atención 24/7
              </div>
            </div>
          </div>
        }
        description="Pregúntale por disponibilidad, precios o agenda tu cita al instante."
        size="md"
        className="flex flex-col h-full"
      >
        {/* Contenedor de mensajes (Cero Scroll compliant: flex-1 overflow-y-auto) */}
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
                <span>Escribiendo…</span>
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
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 text-xs font-medium shrink-0 transition-colors"
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
                  <span className="font-semibold">Te paso con una persona: </span>
                  <span>Un miembro de nuestro equipo te contactará directamente para atenderte.</span>
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
                placeholder="Escribe un mensaje... (Enter para enviar)"
                disabled={cargando}
                className="w-full resize-none bg-transparent px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none disabled:opacity-50 min-h-[38px] max-h-32"
              />
              <button
                type="submit"
                disabled={cargando || !inputTexto.trim()}
                aria-label="Enviar mensaje"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-malva-700 hover:bg-malva-800 text-white disabled:opacity-40 disabled:hover:bg-malva-700 transition-all"
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
