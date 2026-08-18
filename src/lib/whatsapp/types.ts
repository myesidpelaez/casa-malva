/**
 * Tipos para la integración con Meta WhatsApp Business Cloud API (Graph API v24.0)
 */

export interface WhatsAppTextMessage {
  messaging_product: 'whatsapp'
  recipient_type?: 'individual'
  to: string
  type: 'text'
  text: {
    preview_url?: boolean
    body: string
  }
}

export interface WhatsAppTemplateMessage {
  messaging_product: 'whatsapp'
  recipient_type?: 'individual'
  to: string
  type: 'template'
  template: {
    name: string
    language: {
      code: string
    }
    components?: Array<{
      type: 'header' | 'body' | 'button'
      sub_type?: 'url' | 'quick_reply'
      index?: string
      parameters: Array<{
        type: 'text' | 'currency' | 'date_time' | 'image'
        text?: string
        image?: { link: string }
      }>
    }>
  }
}

export type WhatsAppPayload = WhatsAppTextMessage | WhatsAppTemplateMessage

export interface MetaWhatsAppSuccessResponse {
  messaging_product: 'whatsapp'
  contacts: Array<{
    input: string
    wa_id: string
  }>
  messages: Array<{
    id: string
    message_status?: string
  }>
}

export interface MetaWhatsAppErrorResponse {
  error: {
    message: string
    type: string
    code: number
    error_data?: {
      messaging_product?: string
      details?: string
    }
    error_subcode?: number
    fbtrace_id?: string
  }
}

export interface EnvioWhatsAppResult {
  ok: boolean
  mensajeId?: string
  simulado?: boolean
  error?: string
  destinatario: string
  detalles?: unknown
}

export interface CitaWhatsAppPayload {
  citaId: string
  clienteNombre: string
  clienteTelefono: string
  servicioNombre: string
  profesionalNombre: string
  inicioIso: string
  precioCentavos: number
  sedeNombre?: string
  sedeDireccion?: string
}
