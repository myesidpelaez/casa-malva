/**
 * El endpoint del chat web (Spec 29 · D1, D3, D4, D5; Spec 29b · Hallazgo 1).
 *
 * Adaptador que traduce petición HTTP → EntradaAtencion, llama a `atender()`,
 * y devuelve la respuesta en JSON.
 *
 * Sigue el patrón de puerto/adaptador de `src/lib/agente/idempotencia.ts`:
 * un solo camino de ejecución unificado con almacenamiento desacoplado detrás
 * de la interfaz `AlmacenConversacion`.
 */

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { atender } from '@/lib/agente/atender'
import {
  idConversacionWeb,
  leerHistorial,
  registrarMensaje,
  marcarConversacion,
} from '@/lib/agente/conversacion'
import { decidirLimite, TOPE_MENSAJES_TOTAL, type EstadoLimite } from '@/lib/agente/limite'
import { TURNOS_DE_MEMORIA } from '@/lib/agente/prompt'
import type { ResultadoAgente, TurnoConversacion } from '@/lib/agente/tipos'
import type { Conversation, MessageRole } from '@/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CONVERSACIONES = 'conversations'

export type EstadoConversacionWeb = EstadoLimite & {
  estado: string
}

export interface AlmacenConversacion {
  leerEstado(convId: string): Promise<EstadoConversacionWeb>
  actualizarLimite(
    convId: string,
    nuevoEstado: {
      mensajesEnVentana: number
      ventanaAbiertaEn: string
      mensajesTotales: number
    }
  ): Promise<void>
  marcarEstado(convId: string, estado: Conversation['estado']): Promise<void>
  registrarMensaje(
    convId: string,
    rol: MessageRole,
    texto: string,
    extra?: { herramientaUsada?: string; id?: string }
  ): Promise<void>
  leerHistorial(convId: string, limite: number): Promise<TurnoConversacion[]>
}

/**
 * Adaptador de producción: Cloud Firestore.
 */
export function almacenConversacionFirestore(): AlmacenConversacion {
  return {
    async leerEstado(convId: string) {
      const snap = await getDb().collection(CONVERSACIONES).doc(convId).get()
      if (!snap.exists) {
        return {
          estado: 'abierta',
          mensajesEnVentana: 0,
          ventanaAbiertaEn: null,
          mensajesTotales: 0,
        }
      }
      const data = snap.data() as Conversation & EstadoLimite
      return {
        estado: data.estado || 'abierta',
        mensajesEnVentana: data.mensajesEnVentana ?? 0,
        ventanaAbiertaEn: data.ventanaAbiertaEn ?? null,
        mensajesTotales: data.mensajesTotales ?? 0,
      }
    },
    async actualizarLimite(convId, nuevoEstado) {
      await getDb()
        .collection(CONVERSACIONES)
        .doc(convId)
        .set(
          {
            id: convId,
            canal: 'web',
            actualizadaEn: new Date().toISOString(),
            ...nuevoEstado,
          },
          { merge: true }
        )
    },
    async marcarEstado(convId, estado) {
      await marcarConversacion(convId, estado, 'web')
    },
    async registrarMensaje(convId, rol, texto, extra) {
      await registrarMensaje(convId, rol, texto, extra)
    },
    async leerHistorial(convId, limite) {
      return await leerHistorial(convId, limite)
    },
  }
}

/**
 * Adaptador en memoria para pruebas locales sin Firestore.
 */
export function almacenConversacionEnMemoria(): AlmacenConversacion & {
  obtener(convId: string):
    | (EstadoLimite & {
        estado: string
        mensajes: Array<{
          rol: MessageRole
          texto: string
          extra?: { herramientaUsada?: string; id?: string }
        }>
      })
    | undefined
} {
  const convs = new Map<
    string,
    EstadoLimite & {
      estado: string
      mensajes: Array<{
        rol: MessageRole
        texto: string
        extra?: { herramientaUsada?: string; id?: string }
      }>
    }
  >()

  return {
    async leerEstado(convId: string) {
      const c = convs.get(convId)
      if (!c) {
        return {
          estado: 'abierta',
          mensajesEnVentana: 0,
          ventanaAbiertaEn: null,
          mensajesTotales: 0,
        }
      }
      return {
        estado: c.estado,
        mensajesEnVentana: c.mensajesEnVentana,
        ventanaAbiertaEn: c.ventanaAbiertaEn,
        mensajesTotales: c.mensajesTotales,
      }
    },
    async actualizarLimite(convId, nuevoEstado) {
      const c = convs.get(convId) || {
        estado: 'abierta',
        mensajesEnVentana: 0,
        ventanaAbiertaEn: null,
        mensajesTotales: 0,
        mensajes: [],
      }
      convs.set(convId, { ...c, ...nuevoEstado })
    },
    async marcarEstado(convId, estado) {
      const c = convs.get(convId) || {
        estado: 'abierta',
        mensajesEnVentana: 0,
        ventanaAbiertaEn: null,
        mensajesTotales: 0,
        mensajes: [],
      }
      c.estado = estado
      convs.set(convId, c)
    },
    async registrarMensaje(convId, rol, texto, extra) {
      let c = convs.get(convId)
      if (!c) {
        c = {
          estado: 'abierta',
          mensajesEnVentana: 0,
          ventanaAbiertaEn: null,
          mensajesTotales: 0,
          mensajes: [],
        }
        convs.set(convId, c)
      }
      c.mensajes.push({ rol, texto, extra })
    },
    async leerHistorial(convId, limite) {
      const c = convs.get(convId)
      if (!c) return []
      const ultimos = c.mensajes.slice(-limite)
      const turnos: TurnoConversacion[] = []
      for (const m of ultimos) {
        if (m.rol === 'cliente') turnos.push({ rol: 'cliente', texto: m.texto })
        else if (m.rol === 'agente' || m.rol === 'humano')
          turnos.push({ rol: 'agente', texto: m.texto })
      }
      return turnos
    },
    obtener(convId: string) {
      return convs.get(convId)
    },
  }
}

export type DependenciasChat = {
  atender?: typeof atender
  almacen?: AlmacenConversacion
}

function extraerSesionIdDeCookie(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie')
  if (!cookieHeader) return null
  const match = cookieHeader.match(/(?:^|;\s*)sesionId=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export async function manejarChat(
  req: Request,
  deps: DependenciasChat = {}
): Promise<Response> {
  let cuerpo: unknown
  try {
    const texto = await req.text()
    if (!texto.trim()) {
      return NextResponse.json({ error: 'Cuerpo vacío' }, { status: 400 })
    }
    cuerpo = JSON.parse(texto)
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (typeof cuerpo !== 'object' || cuerpo === null) {
    return NextResponse.json({ error: 'El cuerpo debe ser un objeto' }, { status: 400 })
  }

  const { mensaje } = cuerpo as Record<string, unknown>
  if (typeof mensaje !== 'string' || mensaje.trim().length === 0) {
    return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 })
  }

  if (mensaje.length > 1000) {
    return NextResponse.json(
      { error: 'El mensaje supera el límite de 1000 caracteres' },
      { status: 400 }
    )
  }

  // Cookie de sesión
  let sesionId = extraerSesionIdDeCookie(req)
  let esSesionNueva = false

  if (!sesionId) {
    sesionId = crypto.randomUUID()
    esSesionNueva = true
  }

  const convId = idConversacionWeb(sesionId)
  const almacen = deps.almacen ?? almacenConversacionFirestore()

  const convActual = await almacen.leerEstado(convId)

  // Si ya la tiene un humano, no llamamos al bot
  if (convActual.estado === 'en_atencion') {
    await almacen.registrarMensaje(convId, 'cliente', mensaje.trim())
    const resp = NextResponse.json(
      {
        texto: 'Un integrante de nuestro equipo te está atendiendo. En breve responderá tu mensaje.',
        escalado: true,
      },
      { status: 200 }
    )
    if (esSesionNueva) {
      resp.cookies.set('sesionId', sesionId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 3600,
        path: '/',
      })
    }
    return resp
  }

  const estadoLimite: EstadoLimite = {
    mensajesEnVentana: convActual.mensajesEnVentana,
    ventanaAbiertaEn: convActual.ventanaAbiertaEn,
    mensajesTotales: convActual.mensajesTotales,
  }

  const decision = decidirLimite(estadoLimite, new Date())
  if (!decision.permitir) {
    if ((estadoLimite.mensajesTotales ?? 0) >= TOPE_MENSAJES_TOTAL) {
      await almacen.marcarEstado(convId, 'escalada')
    }
    const resp = NextResponse.json(
      {
        error: 'demasiados_mensajes',
        texto: 'Has alcanzado el límite de mensajes permitidos. Un asesor humano te contactará en breve.',
        escalado: true,
      },
      { status: 429 }
    )
    if (esSesionNueva) {
      resp.cookies.set('sesionId', sesionId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 3600,
        path: '/',
      })
    }
    return resp
  }

  // Actualizamos contadores de límite
  await almacen.actualizarLimite(convId, decision.nuevoEstado)

  // Registramos el mensaje entrante del cliente
  await almacen.registrarMensaje(convId, 'cliente', mensaje.trim())

  // Leemos el historial de turnos
  const historial = await almacen.leerHistorial(convId, TURNOS_DE_MEMORIA)
  const fnAtender = deps.atender ?? atender

  const resultado: ResultadoAgente = await fnAtender({
    ctx: {
      canal: 'web',
      telefonoE164: null,
      nombre: '',
      conversacionId: convId,
    },
    conocida: false,
    historial,
    mensaje: mensaje.trim(),
    tipo: 'text',
  })

  // Registramos la respuesta del agente
  await almacen.registrarMensaje(convId, 'agente', resultado.texto, {
    herramientaUsada: resultado.herramientaUsada,
  })

  // Actualizamos el estado de la conversación
  await almacen.marcarEstado(convId, resultado.escalado ? 'escalada' : 'abierta')

  const resp = NextResponse.json(
    { texto: resultado.texto, escalado: resultado.escalado },
    { status: 200 }
  )

  if (esSesionNueva) {
    resp.cookies.set('sesionId', sesionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 3600,
      path: '/',
    })
  }

  return resp
}

export async function POST(req: Request): Promise<Response> {
  return manejarChat(req)
}

