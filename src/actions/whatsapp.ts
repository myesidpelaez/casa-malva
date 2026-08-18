'use server'

import { sendWhatsAppMessage, sanitizePhoneForMeta } from '@/lib/whatsapp/client'
import { formatearFechaCitaEspañol } from '@/lib/whatsapp/notifications'
import type { EnvioWhatsAppResult } from '@/lib/whatsapp/types'
import { withAuth } from '@/lib/withAuth'

export interface ProbarWhatsAppInput {
  telefono: string
  nombre?: string
}

export interface WhatsAppConfigStatus {
  configurado: boolean
  phoneNumberId: string
  hasAccessToken: boolean
  templateName: string | null
}

/**
 * Server Action para que el administrador envíe un mensaje de prueba
 * a su propio WhatsApp y verifique la conexión con Meta Cloud API.
 */
export const probarEnvioWhatsAppAction = withAuth<EnvioWhatsAppResult, [input: ProbarWhatsAppInput]>(
  'catalogo:editar',
  async (_ctx, input) => {
    const telefono = sanitizePhoneForMeta(input.telefono)
    const nombre = input.nombre || 'Mario'
    const { fechaTexto, horaTexto } = formatearFechaCitaEspañol(new Date().toISOString())

    const cuerpo = `✨ *CASA MALVA — Mensaje de Prueba de Sistema* ✨

Hola *${nombre}*, la conexión con *Meta WhatsApp Cloud API* está operando correctamente en tu plataforma.

📅 *Fecha de prueba:* ${fechaTexto}
⏰ *Hora de prueba:* ${horaTexto}
⚡ *Estado:* Conexión activa y lista para confirmaciones automáticas de clientas.

_Mensaje generado automáticamente desde el panel de administración de Casa Malva (MeJorÍA)._`

    return sendWhatsAppMessage({
      messaging_product: 'whatsapp',
      to: telefono,
      type: 'text',
      text: {
        preview_url: false,
        body: cuerpo,
      },
    })
  }
)

/**
 * Consulta el estado actual de la configuración de WhatsApp (Protegido)
 */
export const getWhatsAppConfigStatusAction = withAuth<WhatsAppConfigStatus, []>(
  'agenda:leer',
  async () => {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || ''
    const hasAccessToken = !!process.env.WHATSAPP_ACCESS_TOKEN?.trim()
    const templateName = process.env.WHATSAPP_TEMPLATE_CONFIRMACION?.trim() || null

    return {
      configurado: !!(phoneNumberId && hasAccessToken),
      phoneNumberId: phoneNumberId ? `...${phoneNumberId.slice(-4)}` : '',
      hasAccessToken,
      templateName,
    }
  }
)
