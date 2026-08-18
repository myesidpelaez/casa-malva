import type {
  WhatsAppPayload,
  EnvioWhatsAppResult,
  MetaWhatsAppSuccessResponse,
  MetaWhatsAppErrorResponse,
} from './types'

/**
 * Normaliza el número a formato E.164 sin signos '+' ni espacios para Meta Cloud API.
 * Ej: '+57 300 670 7219' -> '573006707219'
 */
export function sanitizePhoneForMeta(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  // Si tiene 10 dígitos (ej. 3006707219 en Colombia), anteponemos el código de país 57
  if (digits.length === 10 && digits.startsWith('3')) {
    return '57' + digits
  }
  return digits
}

/**
 * Cliente oficial de envío para Meta WhatsApp Business Cloud API.
 * Si las credenciales no están configuradas en .env.local, opera en modo simulador seguro.
 */
export async function sendWhatsAppMessage(payload: WhatsAppPayload): Promise<EnvioWhatsAppResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim()

  const destination = payload.to

  // Modo SIMULADOR si faltan credenciales
  if (!phoneNumberId || !accessToken) {
    console.log(
      '\n[WHATSAPP_SIMULATOR] 📱 Mensaje no enviado a red real (falta WHATSAPP_ACCESS_TOKEN o PHONE_NUMBER_ID en .env.local)'
    )
    console.log('[WHATSAPP_SIMULATOR] Destinatario:', destination)
    console.log('[WHATSAPP_SIMULATOR] Payload:', JSON.stringify(payload, null, 2))

    return {
      ok: true,
      simulado: true,
      mensajeId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      destinatario: destination,
    }
  }

  const endpoint = `https://graph.facebook.com/v24.0/${phoneNumberId}/messages`

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      const errData = data as MetaWhatsAppErrorResponse
      const errorMsg = errData.error?.message || 'Error desconocido al contactar Meta Cloud API'
      console.error('[WHATSAPP_API_ERROR] ❌ Falló el envío de WhatsApp:', errData)

      return {
        ok: false,
        destinatario: destination,
        error: `[${errData.error?.code || res.status}] ${errorMsg}`,
        detalles: errData,
      }
    }

    const successData = data as MetaWhatsAppSuccessResponse
    const msgId = successData.messages?.[0]?.id || 'unknown_id'

    console.log('[WHATSAPP_API_SUCCESS] ✅ Mensaje entregado a Meta con ID:', msgId)

    return {
      ok: true,
      simulado: false,
      mensajeId: msgId,
      destinatario: destination,
      detalles: successData,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error de red al conectar con Graph API'
    console.error('[WHATSAPP_NETWORK_ERROR] ❌', errorMsg)
    return {
      ok: false,
      destinatario: destination,
      error: errorMsg,
    }
  }
}
