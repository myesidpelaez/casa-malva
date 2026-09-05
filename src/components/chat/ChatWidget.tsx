'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Sparkles,
  Send,
  CalendarCheck2,
  User,
  Clock,
  AlertCircle,
  RefreshCw,
  HeartHandshake,
  ArrowUpRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { RightDrawer } from '@/components/ui/drawer'
import { Marca } from '@/components/brand/Marca'
import { getServiceImage, getProfessionalAvatar } from '@/lib/catalogo-ui'
import type { Service, Professional } from '@/types'

type MensajeChat = {
  id: string
  rol: 'cliente' | 'agente'
  texto: string
  servicioRecomendado?: Service
  especialistaRecomendada?: Professional
}

const CHIPS_SUGERENCIAS = [
  { label: '💅 Ver rituales de Uñas', prompt: '¿Qué servicios de uñas tienen disponibles y cuáles son sus precios?' },
  { label: '✂️ Balayage & Colorimetría', prompt: 'Quiero información sobre colorimetría, balayage y cuidado capilar.' },
  { label: '👁️ Diseño de Cejas', prompt: '¿Qué incluye el diseño de cejas y el laminado con visagismo?' },
  { label: '💎 Tratamiento Novias & Eventos', prompt: '¿Tienen paquetes especiales para novias o eventos sociales?' },
]

function formatCurrencyFromCents(centavos: number): string {
  const pesos = Math.round(centavos / 100)
  return `$ ${pesos.toLocaleString('es-CO')}`
}

function humanDuration(minutos: number): string {
  if (minutos < 60) return `${minutos} min`
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}



let contadorMensajes = 0
function generarIdMensaje(prefijo: 'usr' | 'agt'): string {
  contadorMensajes += 1
  return `${prefijo}_${Date.now()}_${contadorMensajes}`
}

export function ChatWidget() {
  const [abierto, setAbierto] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('chat') === 'open'
    }
    return false
  })
  const [mensajes, setMensajes] = React.useState<MensajeChat[]>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('demo') === 'chat') {
        return [
          {
            id: 'init_1',
            rol: 'agente',
            texto:
              '¿En qué puedo consentirte hoy? Puedo orientarte sobre nuestros rituales de autor, recomendarte a la especialista ideal o ayudarte a reservar tu cita en tiempo real.',
          },
          {
            id: 'demo_user',
            rol: 'cliente',
            texto: '¿Qué servicios de uñas tienen disponibles y cuáles son sus precios?',
          },
          {
            id: 'demo_agent',
            rol: 'agente',
            texto:
              '¡Hola! Para uñas tenemos: Manicure tradicional ($ 28.000, 40 min), Manicure semipermanente ($ 55.000, 60 min), Uñas acrílicas ($ 130.000, 120 min), Pedicure spa ($ 45.000, 60 min) y Retiro de semipermanente ($ 20.000, 30 min). ¿Te gustaría agendar alguno?',
            servicioRecomendado: {
              id: 'srv_manicure_semi',
              nombre: 'Manicure Semipermanente',
              duracionMin: 60,
              precioCentavos: 5500000,
              categoryId: 'cat_unas',
              activo: true,
              bufferMin: 0,
              requiereConfirmacion: false,
            },
          },
        ]
      }
    }
    return [
      {
        id: 'init_1',
        rol: 'agente',
        texto:
          'Bienvenida a Casa Malva. Soy tu Concierge de belleza. ¿En qué ritual de autor puedo consentirte hoy? Puedo orientarte sobre especialidades, recomendarte a tu maestra ideal o ayudarte a reservar en tiempo real.',
      },
    ]
  })
  const [inputTexto, setInputTexto] = React.useState('')
  const [cargando, setCargando] = React.useState(false)
  const [errorRed, setErrorRed] = React.useState<string | null>(null)
  const [ultimoMensajeFallido, setUltimoMensajeFallido] = React.useState<string | null>(null)
  const [escalado, setEscalado] = React.useState(false)

  const [sessionId] = React.useState(() => {
    if (typeof window === 'undefined') return 'init'
    const stored = sessionStorage.getItem('cm_chat_session')
    if (stored) return stored
    const nuevo = `ses_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    sessionStorage.setItem('cm_chat_session', nuevo)
    return nuevo
  })

  const [catalogoServicios, setCatalogoServicios] = React.useState<Service[]>([])
  const [catalogoProfesionales, setCatalogoProfesionales] = React.useState<Professional[]>([])

  React.useEffect(() => {
    async function cargarContexto() {
      try {
        const [resServ, resProf] = await Promise.all([
          fetch('/api/servicios').then((r) => (r.ok ? r.json() : [])),
          fetch('/api/profesionales').then((r) => (r.ok ? r.json() : [])),
        ])
        setCatalogoServicios(resServ)
        setCatalogoProfesionales(resProf)
      } catch {
        // Silencioso: funciona con fallback
      }
    }
    cargarContexto()
  }, [])

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
      id: generarIdMensaje('usr'),
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
        id: generarIdMensaje('agt'),
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

  function detectarRecomendaciones(texto: string): {
    servicio?: Service
    especialista?: Professional
  } {
    const textoLower = texto.toLowerCase()

    const serv = catalogoServicios.find((s) =>
      textoLower.includes(s.nombre.toLowerCase())
    )

    const prof = catalogoProfesionales.find((p) =>
      textoLower.includes(p.nombre.toLowerCase())
    )

    return { servicio: serv, especialista: prof }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviarMensaje(inputTexto)
    }
  }

  return (
    <>
      {/* Botón Flotante Concierge Haute Couture (Estilo LUMIÈRE) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir asistente de belleza Malva Concierge"
          className="group flex items-center gap-3.5 rounded-full bg-[#2A1525]/92 dark:bg-[#160D15]/95 backdrop-blur-2xl px-3 py-2 sm:pr-5 text-white shadow-[0_10px_35px_rgba(61,20,44,0.4)] border border-[#C5A059]/50 hover:border-[#C5A059] hover:scale-[1.03] hover:shadow-[0_14px_45px_rgba(197,160,89,0.3)] active:scale-95 transition-all duration-300 cursor-pointer"
        >
          {/* Avatar con Flor Canónica de Casa Malva y Aura Dorada */}
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3D2036] to-[#160D15] border border-[#C5A059]/60 shadow-inner">
            <Marca size={22} className="text-[#C5A059]" />
          </div>

          <div className="hidden flex-col pr-1 sm:flex text-left">
            <span className="font-display text-sm font-semibold tracking-tight text-white group-hover:text-[#F7E9B0] transition-colors leading-tight">
              Malva · Concierge
            </span>
            <span className="text-2xs font-medium text-[#D8C2CE] dark:text-[#C5A059]/90 tracking-wide mt-0.5">
              Asistente de Belleza 24/7
            </span>
          </div>
        </button>
      </div>

      {/* Drawer del Chat Concierge UX/UI PRO MAX */}
      <RightDrawer
        open={abierto}
        onOpenChange={setAbierto}
        title={
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2D1A29] via-[#1A1218] to-[#100A0F] border border-[#C5A059]/50 shadow-md">
              <Marca size={26} className="text-[#C5A059]" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-display font-bold text-ink-950 dark:text-[#FBF7FA] leading-tight">
                Malva · Concierge de Belleza
              </div>
              <div className="text-xs text-ink-600 dark:text-[#C5A059] font-sans mt-0.5 font-medium">
                Atención de autor · Casa Malva Medellín
              </div>
            </div>
          </div>
        }
        description={undefined}
        size="md"
        className="flex flex-col h-full"
      >
        <div className="flex flex-col gap-4 py-2 min-h-full justify-between">
          
          {/* Flujo de Mensajes */}
          <div className="flex flex-col gap-4 overflow-y-auto pr-1">
            {mensajes.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'flex flex-col max-w-[90%] rounded-lg p-4 text-sm leading-relaxed shadow-sm transition-all',
                  m.rol === 'cliente'
                    ? 'self-end bg-[#5c3451] dark:bg-[#48203c] border border-malva-400/40 dark:border-[#c5a059]/35 text-white rounded-br-xs'
                    : 'self-start bg-white dark:bg-[#20171e] border border-malva-200/90 dark:border-[#c5a059]/30 text-ink-950 dark:text-[#fbf7fa] rounded-bl-xs shadow-md shadow-black/5 dark:shadow-black/30'
                )}
              >
                {/* Tag de autor si es el concierge */}
                {m.rol === 'agente' && (
                  <div className="flex items-center gap-1.5 mb-1.5 text-xs font-bold tracking-wider uppercase text-[#c5a059]">
                    <Sparkles className="h-3 w-3 text-[#c5a059]" />
                    <span>Malva Concierge</span>
                  </div>
                )}

                <p className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-inherit">
                  {m.texto}
                </p>

                {/* Rich Component: Tarjeta Interactiva de Servicio (UX/UI PRO MAX) */}
                {m.servicioRecomendado && (
                  <div className="mt-3.5 rounded-2xl border border-malva-200 dark:border-[#c5a059]/40 bg-malva-50/80 dark:bg-[#150e14] p-3.5 text-ink-950 dark:text-[#fbf7fa] shadow-sm space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-15 w-15 shrink-0 rounded-xl overflow-hidden bg-malva-100 dark:bg-malva-950/80 border border-malva-200/80 dark:border-[#c5a059]/30 shadow-xs">
                        <Image
                          src={getServiceImage(m.servicioRecomendado)}
                          alt={m.servicioRecomendado.nombre}
                          fill
                          sizes="60px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-2xs font-bold tracking-wider uppercase text-[#c5a059] block">
                          Ritual Recomendado
                        </span>
                        <h4 className="font-display font-bold text-base leading-snug truncate text-ink-950 dark:text-white">
                          {m.servicioRecomendado.nombre}
                        </h4>
                        <div className="flex items-center gap-2.5 mt-1 text-xs text-ink-600 dark:text-[#d4c5cf]">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 text-[#c5a059]" />
                            {humanDuration(m.servicioRecomendado.duracionMin)}
                          </span>
                          <span className="font-bold text-malva-800 dark:text-[#f0d48f]">
                            {formatCurrencyFromCents(m.servicioRecomendado.precioCentavos)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/reservar?serviceId=${m.servicioRecomendado.id}`}
                      onClick={() => setAbierto(false)}
                      className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#c5a059] hover:bg-[#d8b56f] text-[#140e13] font-bold py-2.5 text-sm shadow-sm hover:shadow-md transition-all active:scale-98 cursor-pointer"
                    >
                      <CalendarCheck2 className="h-4 w-4 text-[#140e13]" />
                      <span>Agendar este ritual</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-[#140e13]" />
                    </Link>
                  </div>
                )}

                {/* Rich Component: Tarjeta Interactiva de Especialista */}
                {m.especialistaRecomendada && !m.servicioRecomendado && (
                  <div className="mt-3.5 rounded-2xl border border-malva-200 dark:border-[#c5a059]/40 bg-malva-50/80 dark:bg-[#150e14] p-3.5 text-ink-950 dark:text-[#fbf7fa] shadow-sm space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-13 w-13 shrink-0 rounded-full overflow-hidden border-2 border-[#c5a059]/50 bg-malva-100 dark:bg-[#251822] shadow-xs">
                        {getProfessionalAvatar(m.especialistaRecomendada) ? (
                          <Image
                            src={getProfessionalAvatar(m.especialistaRecomendada)!}
                            alt={m.especialistaRecomendada.nombre}
                            fill
                            sizes="52px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="grid h-full w-full place-items-center font-bold text-[#c5a059]">
                            {m.especialistaRecomendada.nombre.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-2xs font-bold tracking-wider uppercase text-[#c5a059] block">
                          Maestra de Autor
                        </span>
                        <h4 className="font-display font-bold text-base leading-snug text-ink-950 dark:text-white">
                          {m.especialistaRecomendada.nombre}
                        </h4>
                        <p className="text-xs text-ink-600 dark:text-[#d4c5cf] truncate">
                          {m.especialistaRecomendada.cargo}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/reservar?professionalId=${m.especialistaRecomendada.id}`}
                      onClick={() => setAbierto(false)}
                      className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#c5a059] hover:bg-[#d8b56f] text-[#140e13] font-bold py-2.5 text-sm shadow-sm hover:shadow-md transition-all active:scale-98 cursor-pointer"
                    >
                      <User className="h-4 w-4 text-[#140e13]" />
                      <span>Ver agenda de {m.especialistaRecomendada.nombre.split(' ')[0]}</span>
                    </Link>
                  </div>
                )}
              </div>
            ))}

            {/* Estado: Malva está consultando... */}
            {cargando && (
              <div className="self-start flex items-center gap-2.5 rounded-2xl bg-white dark:bg-[#20171e] border border-malva-200/80 dark:border-[#c5a059]/30 px-4 py-3 text-sm text-ink-800 dark:text-[#ede4eb] shadow-sm rounded-bl-xs">
                <Sparkles className="h-4 w-4 text-[#c5a059] animate-spin" />
                <span className="font-medium">Malva está consultando el estudio…</span>
                <span className="flex gap-1 ml-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#c5a059] animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#c5a059] animate-bounce [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#c5a059] animate-bounce [animation-delay:0.4s]" />
                </span>
              </div>
            )}

            {/* Error con reintento */}
            {errorRed && (
              <div className="self-center w-full my-2 flex items-center justify-between gap-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3.5 text-sm text-rose-800 dark:text-rose-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{errorRed}</span>
                </div>
                <button
                  type="button"
                  onClick={() => ultimoMensajeFallido && enviarMensaje(ultimoMensajeFallido)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 text-xs font-bold shrink-0 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  Reintentar
                </button>
              </div>
            )}

            {/* Escalado a equipo humano */}
            {escalado && (
              <div className="self-center w-full my-2 flex items-center gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 p-3.5 text-xs text-amber-900 dark:text-amber-200">
                <HeartHandshake className="h-5 w-5 shrink-0 text-[#c5a059]" />
                <div>
                  <span className="font-bold">Te conectamos con recepción: </span>
                  <span>Una integrante de Casa Malva te responderá directamente.</span>
                </div>
              </div>
            )}

            {mensajes.length <= 1 && (
              <div className="flex flex-col gap-2 pt-1">
                <span className="text-2xs uppercase tracking-wider font-bold text-[#c5a059]">Sugerencias rápidas</span>
                <div className="flex flex-wrap gap-1.5">
                  {CHIPS_SUGERENCIAS.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => enviarMensaje(chip.prompt)}
                      className="text-xs px-3 py-1.5 rounded-xl border border-malva-200 dark:border-white/10 hover:border-[#c5a059] bg-white/70 dark:bg-white/5 text-ink-800 dark:text-[#ede4eb] transition-all hover:scale-101 cursor-pointer text-left shadow-2xs"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div ref={finalMensajesRef} />
          </div>

          {/* Formulario de Entrada Simplificado y Limpio (Sin doble contorno) */}
          <div className="space-y-2 pt-3 border-t border-malva-100 dark:border-white/10">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                enviarMensaje(inputTexto)
              }}
              className="relative flex items-center rounded-2xl border border-malva-300/80 dark:border-[#C5A059]/40 bg-white dark:bg-[#180E17] shadow-xs focus-within:border-[#C5A059] focus-within:ring-2 focus-within:ring-[#C5A059]/25 transition-all p-1.5"
            >
              <textarea
                ref={inputRef}
                value={inputTexto}
                onChange={(e) => setInputTexto(e.target.value.slice(0, 1000))}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Escribe tu consulta a Malva..."
                disabled={cargando}
                className="w-full resize-none border-0 border-none bg-transparent px-3 py-2 text-sm text-ink-950 dark:text-[#FBF7FA] placeholder:text-ink-400 dark:placeholder:text-white/40 outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none disabled:opacity-50 min-h-10 max-h-32"
              />
              <button
                type="submit"
                disabled={cargando || !inputTexto.trim()}
                aria-label="Enviar mensaje a Malva"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#C5A059] hover:bg-[#D8B56F] text-[#140E13] disabled:opacity-30 disabled:hover:bg-[#C5A059] transition-all cursor-pointer shadow-xs"
              >
                <Send className="h-4.5 w-4.5 text-[#140E13]" strokeWidth={2.2} />
              </button>
            </form>

            <div className="flex justify-between px-2 text-xs text-ink-500 dark:text-[#d4c5cf]">
              <span>Enter envía · Shift+Enter salta línea</span>
              <span>{inputTexto.length}/1000</span>
            </div>
          </div>
        </div>
      </RightDrawer>
    </>
  )
}
