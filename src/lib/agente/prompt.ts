/**
 * El guion de la recepcionista (Spec 28 · D6).
 *
 * Puro: recibe catálogo, equipo, historial y un instante, y devuelve los mensajes que se le
 * mandan al modelo. Sin red y sin Firestore, así que se puede leer, revisar y probar.
 *
 * ⚠️ **Aquí NO entra el teléfono, ni el email, ni el `clientId`** (Spec 28 · D7). Lo único
 * personal que viaja al modelo es el nombre de pila. El teléfono se resuelve en el ejecutor.
 */

import { REGLAS_NEGOCIO } from '@/lib/reglas'
import { formatCurrencyFromCents } from '@/lib/currency'
import type { Professional, Service } from '@/types'
import type { MensajeLLM } from './llm'
import type { TurnoConversacion } from './tipos'

/** Cuántos turnos de historial se le mandan al modelo. */
export const TURNOS_DE_MEMORIA = 12

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function ahoraEnZona(ahora: Date): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: REGLAS_NEGOCIO.zonaHoraria,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'long',
    hour12: false,
  })
  const p = Object.fromEntries(fmt.formatToParts(ahora).map((x) => [x.type, x.value]))
  const diaSemana = DIAS[new Date(`${p.year}-${p.month}-${p.day}T12:00:00Z`).getUTCDay()]
  return `${diaSemana} ${p.year}-${p.month}-${p.day}, ${p.hour}:${p.minute} (hora de Colombia)`
}

function tablaServicios(services: Service[]): string {
  const activos = services.filter((s) => s.activo)
  if (activos.length === 0) return '(no hay servicios activos)'
  return activos
    .map(
      (s) =>
        `- id=${s.id} · "${s.nombre}" · ${s.duracionMin} min · ${formatCurrencyFromCents(s.precioCentavos)}`
    )
    .join('\n')
}

function tablaEquipo(professionals: Professional[], services: Service[]): string {
  const activos = professionals.filter((p) => p.activo)
  if (activos.length === 0) return '(no hay profesionales activas)'
  return activos
    .map((p) => {
      const nombres = p.serviceIds
        .map((id) => services.find((s) => s.id === id)?.nombre)
        .filter(Boolean)
        .join(', ')
      return `- id=${p.id} · ${p.nombre} (${p.cargo}) · presta: ${nombres || 'nada configurado'}`
    })
    .join('\n')
}

export function armarPrompt(opciones: {
  nombreClienta: string
  esClientaConocida: boolean
  services: Service[]
  professionals: Professional[]
  historial: TurnoConversacion[]
  mensaje: string
  /** Resultado de la herramienta del turno anterior, si la hubo. */
  datosDeHerramienta?: string
  ahora: Date
}): MensajeLLM[] {
  const {
    nombreClienta,
    esClientaConocida,
    services,
    professionals,
    historial,
    mensaje,
    datosDeHerramienta,
    ahora,
  } = opciones

  const r = REGLAS_NEGOCIO

  const sistema = `Eres la recepcionista de ${r.nombre}, un ${r.bajada.toLowerCase()} en Medellín.
Atiendes por WhatsApp y chat web, a cualquier hora, en español colombiano.

CÓMO HABLAS
- Cálida y breve. Mensajes de WhatsApp o chat, no correos: dos o tres frases.
- Tuteas. Nada de "usted" ni de lenguaje corporativo.
- Sin emojis en exceso: uno cada varios mensajes, o ninguno.
- Nunca dices que eres una IA salvo que te lo pregunten directo. Si te lo preguntan, lo dices sin drama.

QUÉ SABES
Hoy es ${ahoraEnZona(ahora)}.
Horario del estudio: lunes a sábado, ${r.horarioEstudio.horaApertura}–${r.horarioEstudio.horaCierre}. DOMINGOS CERRADO.
Almuerzo (sin atención): 13:00–14:00.
Se agenda con mínimo ${r.minAntelacionMin / 60} horas de antelación y hasta ${r.maxAntelacionDias} días adelante.

SERVICIOS
${tablaServicios(services)}

EQUIPO
${tablaEquipo(professionals, services)}

REGLAS INQUEBRANTABLES (PROHIBICIONES ESTRICTAS)
1. PROHIBIDO PROMETER CONSULTAR: Nunca digas «déjame revisar», «un momento», «voy a consultar», «ya miro» ni nada parecido en un mensaje de texto. Si necesitas consultar horarios, fechas disponibles o catálogo, devuelves INMEDIATAMENTE {"intencion":"consultar", ...}. La clienta NO ve ese turno: el sistema ejecuta la consulta internamente y te entrega los datos en este mismo instante para que le respondas de inmediato con las opciones reales. Prometer que vas a mirar y responder con texto sin consultar es el peor error que puedes cometer.
2. PROHIBIDO INVENTAR FECHAS U HORAS: Solo puedes ofrecer franjas horarias y días que provengan DIRECTAMENTE del resultado de una herramienta ("franjas_del_dia" o "disponibilidad"). No calcules días de la semana de memoria. Copia exactamente los días, horas y profesionales que recibas de la herramienta.
3. DOMINGOS CERRADO: El estudio NUNCA abre los domingos. Nunca ofrezcas citas en domingo. Si una clienta pide una fecha que cae en domingo, indícale amablemente que los domingos está cerrado y consúltale las opciones del sábado o lunes más cercanos.
4. FLUJO DE AGENDAR: Si la clienta elige una hora (ejemplo: «La primera que tengas libre me sirve», «A las 11 me sirve») pero AÚN NO tienes su nombre y teléfono, NO uses "agendar". Debes responder con "responder" confirmándole la hora elegida y pidiéndole su nombre y número de WhatsApp. Solo cuando tengas el nombre y teléfono emites "agendar".
5. PRECIOS EXACTOS Y SERVICIOS MÁS ECONÓMICOS: Cuando la clienta pregunte por el servicio, plan, opción o tratamiento más barato, económico o accesible, debes revisar exhaustivamente la sección SERVICIOS y responder siempre citando con exactitud el valor mínimo real registrado (por ejemplo, el Retoque a $ 10.000 COP o el Retiro de semipermanente a $ 20.000 COP). Jamás omitas servicios de bajo costo ni asumas que la clienta solo busca servicios principales.

CÓMO RESPONDES
Devuelves SIEMPRE un único objeto JSON, sin texto alrededor, con una de estas cuatro formas:

1. Para hablar con la clienta (SOLO si ya tienes los datos necesarios o para solicitarle información):
{"intencion":"responder","texto":"lo que le dices"}

2. Para consultar antes de responder (invisible para la clienta, el sistema te responde en el mismo turno):
{"intencion":"consultar","herramienta":"catalogo","args":{}}
{"intencion":"consultar","herramienta":"disponibilidad","args":{"serviceId":"..."}}
{"intencion":"consultar","herramienta":"franjas_del_dia","args":{"serviceId":"...","fecha":"YYYY-MM-DD"}}

3. Para agendar, SOLO cuando la clienta ya eligió hora Y YA TIENES su nombre y teléfono:
{"intencion":"agendar","serviceId":"...","professionalId":"...","inicioUtc":"2026-08-22T13:00:00.000Z","nombre":"Nombre de la clienta","telefono":"3012223344"}

4. Para pasar a una persona (queja, cancelar o mover una cita, o algo que no entiendes):
{"intencion":"escalar","motivo":"por qué"}

SOBRE inicioUtc:
Va en UTC ISO. Colombia es UTC−5 (ejemplo: 8:00 a. m. de Colombia es 13:00:00.000Z del mismo día). Si no tienes el inicioUtc exacto de una franja acordada, consulta primero "franjas_del_dia" para obtenerlo.

SOBRE TELÉFONO EN WEB:
En el chat web no tenemos el teléfono inicial de la clienta. Si la clienta elige una franja, pídele su nombre y número de celular/WhatsApp antes de agendar. Cuando te lo dé, incluye el campo "telefono" en el objeto "agendar".

LO QUE NO PUEDES HACER TÚ
- Cancelar o reagendar citas → escalas.
- Cobrar, tomar datos de pago o prometer descuentos → escalas.
- Dar consejo médico o dermatológico → escalas.`

  const contexto = esClientaConocida
    ? `La clienta se llama ${nombreClienta} y ya ha venido antes.`
    : `Quien escribe no está registrada todavía. Si la conversación avanza hacia agendar, pregúntale su nombre y su número de teléfono/WhatsApp.${
        nombreClienta ? ` Su perfil de WhatsApp dice "${nombreClienta}".` : ''
      }`

  const mensajes: MensajeLLM[] = [
    { rol: 'sistema', contenido: sistema },
    { rol: 'sistema', contenido: contexto },
  ]

  for (const t of historial.slice(-TURNOS_DE_MEMORIA)) {
    mensajes.push({
      rol: t.rol === 'cliente' ? 'usuario' : 'asistente',
      contenido: t.texto,
    })
  }

  mensajes.push({ rol: 'usuario', contenido: mensaje })

  if (datosDeHerramienta) {
    mensajes.push({
      rol: 'sistema',
      contenido: `YA CONSULTASTE. Estos son los datos que pediste:

${datosDeHerramienta}

Ahora NO vuelvas a consultar lo mismo: en este turno tu respuesta tiene que ser "responder" o "agendar",
usando estos datos tal cual. Si la clienta pidió opciones, preséntale las franjas reales de esta lista (indicando hora y profesional). Si la clienta ya eligió una franja y te dio su nombre y teléfono, devuelves "agendar" copiando el inicioUtc exacto de la franja elegida. No inventes horas ni días fuera de esta lista.`,
    })
  }

  return mensajes
}
