import { sendWhatsAppMessage, sanitizePhoneForMeta } from './client'
import type { CitaWhatsAppPayload, EnvioWhatsAppResult, WhatsAppPayload } from './types'
import { formatCurrencyFromCents } from '@/lib/currency'

/**
 * Formatea una fecha ISO a texto natural en español para Medellín (UTC-5)
 * Ej: 'Viernes 22 de Agosto de 2026 a las 3:00 PM'
 */
export function formatearFechaCitaEspañol(isoString: string): {
  fechaTexto: string
  horaTexto: string
  fechaHoraCompleta: string
} {
  const d = new Date(isoString)

  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]

  // En horario de Colombia (America/Bogota)
  const diaNombre = dias[d.getDay()]
  const diaNum = d.getDate()
  const mesNombre = meses[d.getMonth()]

  let horas = d.getHours()
  const minutos = d.getMinutes().toString().padStart(2, '0')
  const ampm = horas >= 12 ? 'PM' : 'AM'
  horas = horas % 12
  horas = horas ? horas : 12

  const fechaTexto = `${diaNombre} ${diaNum} de ${mesNombre}`
  const horaTexto = `${horas}:${minutos} ${ampm}`
  const fechaHoraCompleta = `${fechaTexto}, ${horaTexto}`

  return { fechaTexto, horaTexto, fechaHoraCompleta }
}

/**
 * Envía el mensaje de confirmación de cita oficial de Casa Malva.
 * Si se define una plantilla en Meta (WHATSAPP_TEMPLATE_CONFIRMACION), usa template.
 * Por defecto usa mensaje de texto directo enriquecido.
 */
export async function enviarConfirmacionCitaWhatsApp(
  cita: CitaWhatsAppPayload
): Promise<EnvioWhatsAppResult> {
  const telefonoDestino = sanitizePhoneForMeta(cita.clienteTelefono)
  const { fechaTexto, horaTexto } = formatearFechaCitaEspañol(cita.inicioIso)
  const precioCOP = formatCurrencyFromCents(cita.precioCentavos)
  const sedeNombre = cita.sedeNombre || 'Casa Malva • El Poblado'
  const direccion = cita.sedeDireccion || 'Cra. 37 #8A-42, Vía Provenza, Medellín'

  const templateName = process.env.WHATSAPP_TEMPLATE_CONFIRMACION?.trim()

  let payload: WhatsAppPayload

  if (templateName) {
    // Si el usuario configuró una plantilla aprobada en Meta
    payload = {
      messaging_product: 'whatsapp',
      to: telefonoDestino,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'es' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: cita.clienteNombre },
              { type: 'text', text: cita.servicioNombre },
              { type: 'text', text: cita.profesionalNombre },
              { type: 'text', text: `${fechaTexto} a las ${horaTexto}` },
              { type: 'text', text: sedeNombre },
              { type: 'text', text: precioCOP },
            ],
          },
        ],
      },
    }
  } else {
    // Mensaje de texto formateado con estética de lujo Casa Malva
    const mensajeTexto = `✨ *CASA MALVA — Confirmación de Cita* ✨

Hola *${cita.clienteNombre}*, tu cita ha sido reservada con éxito:

💅 *Servicio:* ${cita.servicioNombre}
👩‍🎨 *Especialista:* ${cita.profesionalNombre}
📅 *Fecha:* ${fechaTexto}
⏰ *Hora:* ${horaTexto}
📍 *Sede:* ${sedeNombre} (${direccion})
💳 *Valor:* ${precioCOP}

🌿 *Recomendación:* Te esperamos 5 minutos antes para brindarte una experiencia relajante con una infusión de cortesía.

Si necesitas modificar o reprogramar tu cita, puedes responder directamente a este mensaje de WhatsApp. ¡Nos vemos pronto!`

    payload = {
      messaging_product: 'whatsapp',
      to: telefonoDestino,
      type: 'text',
      text: {
        preview_url: false,
        body: mensajeTexto,
      },
    }
  }

  return sendWhatsAppMessage(payload)
}
