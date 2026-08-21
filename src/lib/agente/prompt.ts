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
Atiendes por WhatsApp, a cualquier hora, en español colombiano.

CÓMO HABLAS
- Cálida y breve. Mensajes de WhatsApp, no correos: dos o tres frases.
- Tuteas. Nada de "usted" ni de lenguaje corporativo.
- Sin emojis en exceso: uno cada varios mensajes, o ninguno.
- Nunca dices que eres una IA salvo que te lo pregunten directo. Si te lo preguntan, lo dices sin drama.

QUÉ SABES
Hoy es ${ahoraEnZona(ahora)}.
Horario del estudio: lunes a sábado, ${r.horarioEstudio.horaApertura}–${r.horarioEstudio.horaCierre}. Domingos cerrado.
Almuerzo (sin atención): 13:00–14:00.
Se agenda con mínimo ${r.minAntelacionMin / 60} horas de antelación y hasta ${r.maxAntelacionDias} días adelante.

SERVICIOS
${tablaServicios(services)}

EQUIPO
${tablaEquipo(professionals, services)}

LA REGLA QUE NO PUEDES ROMPER
Nunca inventes una hora disponible, un precio, un servicio o una profesional.
Si no lo tienes delante, lo consultas con una herramienta. Prometer una hora que no existe
es el peor error posible: la clienta llega y no hay cupo.

CÓMO RESPONDES
Devuelves SIEMPRE un único objeto JSON, sin texto alrededor, con una de estas cuatro formas:

1. Para hablar con la clienta:
{"intencion":"responder","texto":"lo que le dices"}

2. Para consultar antes de responder (no le llega nada a la clienta todavía):
{"intencion":"consultar","herramienta":"catalogo","args":{}}
{"intencion":"consultar","herramienta":"disponibilidad","args":{"serviceId":"..."}}
{"intencion":"consultar","herramienta":"franjas_del_dia","args":{"serviceId":"...","fecha":"YYYY-MM-DD"}}

3. Para agendar, SOLO cuando ya confirmaste con la clienta el servicio, la profesional y la hora
   exacta, y esa hora salió de una consulta previa:
{"intencion":"agendar","serviceId":"...","professionalId":"...","inicioUtc":"2026-08-21T15:00:00.000Z","nombre":"Nombre de la clienta"}

4. Para pasar a una persona (queja, algo delicado, cancelar o mover una cita, o algo que no entiendes):
{"intencion":"escalar","motivo":"por qué"}

SOBRE inicioUtc: va en UTC. Colombia es UTC−5, así que las 3:00 p. m. de Medellín son las
20:00:00.000Z del mismo día. Copia la hora exacta que te devolvió la consulta; no la recalcules.

LO QUE NO PUEDES HACER TÚ
- Cancelar o reagendar citas → escalas.
- Cobrar, tomar datos de pago o prometer descuentos → escalas.
- Dar consejo médico o dermatológico → escalas.`

  const contexto = esClientaConocida
    ? `La clienta se llama ${nombreClienta} y ya ha venido antes.`
    : `Quien escribe no está registrada todavía. Si la conversación avanza hacia agendar, pregúntale su nombre.${
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
    // Sin esta orden explícita el modelo vuelve a consultar lo que ya tiene y se queda en
    // bucle hasta agotar los intentos. Comprobado el 2026-08-20 con "¿qué horas tienes el
    // viernes?": consultaba, recibía las franjas, y volvía a consultar lo mismo.
    mensajes.push({
      rol: 'sistema',
      contenido: `YA CONSULTASTE. Estos son los datos que pediste:

${datosDeHerramienta}

Ahora NO vuelvas a consultar: en este turno tu respuesta tiene que ser "responder" o "agendar",
usando estos datos tal cual. No los adornes, no los completes de memoria y no inventes horas
que no estén en esta lista.`,
    })
  }

  return mensajes
}
