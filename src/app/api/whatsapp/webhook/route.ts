/**
 * El oído del sistema (Spec 28 · D3, D4, D5).
 *
 * Es el ÚNICO archivo que sabe cómo es un webhook de WhatsApp por dentro. Traduce el sobre de
 * Meta, se lo pasa al agente, y devuelve la respuesta por el mismo canal.
 *
 * El orden de este archivo no es casual:
 *   1. firma  → sin ella, cualquiera que descubra la URL le dicta citas al salón (D5)
 *   2. wamid  → sin ella, un reintento de Meta duplica la cita (D3)
 *   3. 200 ya → Meta corta a los pocos segundos, y el modelo tarda más (D4)
 */

import { NextResponse } from 'next/server'
import { verificarFirmaMeta, resolverVerificacion } from '@/lib/whatsapp/firma'
import { extraerMensajes, type MensajeEntrante } from '@/lib/whatsapp/entrante'
import { sendWhatsAppMessage, sanitizePhoneForMeta } from '@/lib/whatsapp/client'
import { normalizePhoneE164 } from '@/lib/utils'
import { almacenFirestore } from '@/lib/agente/idempotencia'
import { atender } from '@/lib/agente/atender'
import {
  idConversacion,
  leerHistorial,
  marcarConversacion,
  registrarMensaje,
  resolverContacto,
  estaEnManosDeUnHumano,
} from '@/lib/agente/conversacion'
import { TURNOS_DE_MEMORIA } from '@/lib/agente/prompt'

// El webhook lee cabeceras y cuerpo crudo: nunca puede ser estático.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Alta del webhook: Meta llama una vez con el token y espera su `challenge` de vuelta. */
export async function GET(req: Request): Promise<Response> {
  const params = new URL(req.url).searchParams
  const res = resolverVerificacion(params, process.env.WHATSAPP_VERIFY_TOKEN)

  if (!res.ok) {
    console.warn('[WEBHOOK] verificación rechazada')
    return new NextResponse('Forbidden', { status: 403 })
  }

  return new NextResponse(res.challenge, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  })
}

export async function POST(req: Request): Promise<Response> {
  // 1 · El cuerpo se lee CRUDO. `req.json()` reserializa y la firma deja de cuadrar.
  const cuerpoCrudo = await req.text()

  const firma = verificarFirmaMeta(
    cuerpoCrudo,
    req.headers.get('x-hub-signature-256'),
    process.env.WHATSAPP_APP_SECRET
  )

  if (!firma.ok) {
    console.warn('[WEBHOOK] firma rechazada:', firma.motivo)
    return new NextResponse('Unauthorized', { status: 401 })
  }

  let cuerpo: unknown
  try {
    cuerpo = JSON.parse(cuerpoCrudo)
  } catch {
    // Firma válida pero cuerpo ilegible: se acusa recibo para que Meta no reintente en vano.
    console.error('[WEBHOOK] cuerpo con firma válida pero JSON inválido')
    return NextResponse.json({ ok: true })
  }

  const mensajes = extraerMensajes(cuerpo)

  // 2 y 3 · Se responde 200 de inmediato y el trabajo lento sigue por detrás.
  // Esto solo es seguro porque `apphosting.yaml` mantiene `minInstances: 1` (Spec 28 · D8):
  // con escala a cero, la instancia se congelaría y mataría este trabajo a media frase.
  for (const m of mensajes) {
    procesarMensaje(m).catch((err) => {
      console.error('[WEBHOOK] fallo procesando', m.wamid, err)
    })
  }

  return NextResponse.json({ ok: true })
}

async function procesarMensaje(m: MensajeEntrante): Promise<void> {
  // Idempotencia ANTES de nada: si Meta reintenta, aquí se corta.
  const esNuevo = await almacenFirestore().marcarSiEsNuevo(m.wamid)
  if (!esNuevo) {
    console.log('[WEBHOOK] mensaje repetido, ignorado:', m.wamid)
    return
  }

  const telefonoE164 = normalizePhoneE164(m.de)
  const convId = idConversacion(telefonoE164)

  // Si una persona está atendiendo, el bot se calla. Se guarda lo que dijo la clienta
  // para que el humano lo vea, y nada más.
  if (await estaEnManosDeUnHumano(convId)) {
    await registrarMensaje(convId, 'cliente', m.texto || `(${m.tipo})`, { id: m.wamid })
    return
  }

  const { ctx, conocida } = await resolverContacto(telefonoE164, m.nombrePerfil)
  const historial = await leerHistorial(convId, TURNOS_DE_MEMORIA)

  await registrarMensaje(convId, 'cliente', m.texto || `(${m.tipo})`, { id: m.wamid })

  const resultado = await atender({ ctx, conocida, historial, mensaje: m.texto, tipo: m.tipo })

  await registrarMensaje(convId, 'agente', resultado.texto, {
    herramientaUsada: resultado.herramientaUsada,
  })

  await marcarConversacion(
    convId,
    resultado.escalado ? 'escalada' : 'abierta',
    'whatsapp',
    ctx.clientId
  )

  const envio = await sendWhatsAppMessage({
    messaging_product: 'whatsapp',
    to: sanitizePhoneForMeta(telefonoE164),
    type: 'text',
    text: { preview_url: false, body: resultado.texto },
  })

  if (!envio.ok) {
    // No se traga en silencio (regla 3): si la respuesta no salió, la clienta se quedó
    // esperando y alguien tiene que enterarse.
    console.error('[WEBHOOK] la respuesta no se pudo entregar:', envio.error)
  }
}
