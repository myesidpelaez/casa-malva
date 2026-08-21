/**
 * El endpoint del chat web (Spec 29 · D1, D3, D4, D5).
 *
 * Adaptador que traduce petición HTTP → EntradaAtencion, llama a `atender()`,
 * y devuelve la respuesta en JSON.
 *
 * Características:
 *   - Cookie `sesionId` (httpOnly, sameSite=lax, 30 días) para identificar la conversación.
 *   - Límite de tasa con `decidirLimite` (20 msgs/hora, 60 msgs total).
 *   - Validación estricta: máximo 1000 caracteres.
 */

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { atender } from '@/lib/agente/atender'
import { idConversacionWeb, leerHistorial, registrarMensaje, marcarConversacion } from '@/lib/agente/conversacion'
import { decidirLimite, TOPE_MENSAJES_TOTAL, type EstadoLimite } from '@/lib/agente/limite'
import { TURNOS_DE_MEMORIA } from '@/lib/agente/prompt'
import type { ResultadoAgente } from '@/lib/agente/tipos'
import type { Conversation } from '@/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CONVERSACIONES = 'conversations'

export type AlmacenChatWeb = {
  obtenerOIniciar(convId: string): Promise<{
    mensajesEnVentana: number
    ventanaAbiertaEn: string | null
    mensajesTotales: number
    estado: string
  }>
  actualizar(
    convId: string,
    data: Partial<{
      mensajesEnVentana: number
      ventanaAbiertaEn: string | null
      mensajesTotales: number
      estado: string
    }>
  ): Promise<void>
  agregarMensaje(convId: string, rol: string, texto: string): Promise<void>
}

export type DependenciasChat = {
  atender?: typeof atender
  almacen?: AlmacenChatWeb
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
    return NextResponse.json({ error: 'El mensaje supera el límite de 1000 caracteres' }, { status: 400 })
  }

  // Cookie de sesión
  let sesionId = extraerSesionIdDeCookie(req)
  let esSesionNueva = false

  if (!sesionId) {
    sesionId = crypto.randomUUID()
    esSesionNueva = true
  }

  const convId = idConversacionWeb(sesionId)

  // Almacén en memoria (para pruebas) o Firestore (producción)
  if (deps.almacen) {
    const convActual = await deps.almacen.obtenerOIniciar(convId)
    const estadoLimite: EstadoLimite = {
      mensajesEnVentana: convActual.mensajesEnVentana,
      ventanaAbiertaEn: convActual.ventanaAbiertaEn,
      mensajesTotales: convActual.mensajesTotales,
    }

    const decision = decidirLimite(estadoLimite, new Date())
    if (!decision.permitir) {
      if ((estadoLimite.mensajesTotales ?? 0) >= TOPE_MENSAJES_TOTAL) {
        await deps.almacen.actualizar(convId, { estado: 'escalada' })
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

    await deps.almacen.actualizar(convId, {
      mensajesEnVentana: decision.nuevoEstado.mensajesEnVentana,
      ventanaAbiertaEn: decision.nuevoEstado.ventanaAbiertaEn,
      mensajesTotales: decision.nuevoEstado.mensajesTotales,
    })

    await deps.almacen.agregarMensaje(convId, 'cliente', mensaje.trim())

    const fnAtender = deps.atender ?? atender
    const resultado = await fnAtender({
      ctx: {
        canal: 'web',
        telefonoE164: null,
        nombre: '',
        conversacionId: convId,
      },
      conocida: false,
      historial: [],
      mensaje: mensaje.trim(),
      tipo: 'text',
    })

    await deps.almacen.agregarMensaje(convId, 'agente', resultado.texto)
    if (resultado.escalado) {
      await deps.almacen.actualizar(convId, { estado: 'escalada' })
    }

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

  // --- Ruta de Producción con Firestore ---
  const db = getDb()
  const convRef = db.collection(CONVERSACIONES).doc(convId)

  // Transacción para verificar límites e incrementar contadores atómicamente
  const txResult = await db.runTransaction(async (tx) => {
    const docSnap = await tx.get(convRef)
    const data = docSnap.exists ? (docSnap.data() as Conversation & EstadoLimite) : null

    // Si ya la tiene un humano, no llamamos al bot
    if (data?.estado === 'en_atencion') {
      return { continuar: false as const, motivo: 'en_atencion' as const }
    }

    const estadoLimite: EstadoLimite = {
      mensajesEnVentana: data?.mensajesEnVentana ?? 0,
      ventanaAbiertaEn: data?.ventanaAbiertaEn ?? null,
      mensajesTotales: data?.mensajesTotales ?? 0,
    }

    const decision = decidirLimite(estadoLimite, new Date())
    if (!decision.permitir) {
      if ((estadoLimite.mensajesTotales ?? 0) >= TOPE_MENSAJES_TOTAL) {
        tx.set(convRef, { estado: 'escalada', actualizadaEn: new Date().toISOString() }, { merge: true })
      }
      return { continuar: false as const, motivo: 'demasiados_mensajes' as const }
    }

    // Actualizamos la cabecera con el nuevo estado de límite
    tx.set(
      convRef,
      {
        id: convId,
        canal: 'web',
        estado: data?.estado || 'abierta',
        actualizadaEn: new Date().toISOString(),
        mensajesEnVentana: decision.nuevoEstado.mensajesEnVentana,
        ventanaAbiertaEn: decision.nuevoEstado.ventanaAbiertaEn,
        mensajesTotales: decision.nuevoEstado.mensajesTotales,
      },
      { merge: true }
    )

    return { continuar: true as const }
  })

  if (!txResult.continuar) {
    if (txResult.motivo === 'en_atencion') {
      await registrarMensaje(convId, 'cliente', mensaje.trim())
      return NextResponse.json(
        {
          texto: 'Un integrante de nuestro equipo te está atendiendo. En breve responderá tu mensaje.',
          escalado: true,
        },
        { status: 200 }
      )
    }

    const resp = NextResponse.json(
      {
        error: 'demasiados_mensajes',
        texto: 'Has alcanzado el límite de mensajes permitidos por ahora. Te contactaremos pronto.',
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

  // Registramos el mensaje entrante del cliente
  await registrarMensaje(convId, 'cliente', mensaje.trim())

  const historial = await leerHistorial(convId, TURNOS_DE_MEMORIA)
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
  await registrarMensaje(convId, 'agente', resultado.texto, {
    herramientaUsada: resultado.herramientaUsada,
  })

  await marcarConversacion(
    convId,
    resultado.escalado ? 'escalada' : 'abierta',
    'web'
  )

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
