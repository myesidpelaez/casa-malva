/**
 * La memoria de la conversación (Spec 28 · D2, D6).
 *
 * Un documento por teléfono en `conversations/`, y los mensajes en una subcolección.
 *
 * ⚠️ Regla 10 (*el coste no puede crecer con la historia*): los mensajes **nunca** viven en
 * un array dentro del documento. Si vivieran ahí, cada mensaje leería toda la historia de esa
 * clienta, y una clienta fiel de dos años saldría cara cada vez que dice "hola". Se lee solo
 * la última página, ordenada por fecha.
 */

import { getDb, getClientByPhone } from '@/lib/db'
import type { Conversation, Message, MessageRole } from '@/types'
import type { ContextoAgente, TurnoConversacion } from './tipos'

const CONVERSACIONES = 'conversations'
const MENSAJES = 'mensajes'

/** El id del documento es el teléfono sin signos: estable, único y legible en la consola. */
export function idConversacion(telefonoE164: string): string {
  return `wa_${telefonoE164.replace(/\D/g, '')}`
}

/**
 * Resuelve quién escribe. Si la clienta ya existe, se usa su nombre registrado; si no, el de
 * su perfil de WhatsApp, que es lo único que Meta da.
 */
export async function resolverContacto(
  telefonoE164: string,
  nombrePerfil: string | undefined
): Promise<{ ctx: ContextoAgente; conocida: boolean }> {
  const cliente = await getClientByPhone(telefonoE164)
  if (cliente) {
    return {
      ctx: { telefonoE164, nombre: cliente.nombre, clientId: cliente.id },
      conocida: true,
    }
  }
  return {
    ctx: { telefonoE164, nombre: (nombrePerfil ?? '').trim() },
    conocida: false,
  }
}

/** Últimos turnos, en orden cronológico, para dárselos al modelo. */
export async function leerHistorial(
  telefonoE164: string,
  limite: number
): Promise<TurnoConversacion[]> {
  const snap = await getDb()
    .collection(CONVERSACIONES)
    .doc(idConversacion(telefonoE164))
    .collection(MENSAJES)
    .orderBy('enviadoEn', 'desc')
    .limit(limite)
    .get()

  const turnos: TurnoConversacion[] = []
  for (const doc of snap.docs) {
    const m = doc.data() as Message
    // 'sistema' es ruido de auditoría, no conversación: no se le manda al modelo.
    if (m.rol === 'cliente') turnos.push({ rol: 'cliente', texto: m.texto })
    else if (m.rol === 'agente' || m.rol === 'humano') turnos.push({ rol: 'agente', texto: m.texto })
  }
  return turnos.reverse()
}

export async function registrarMensaje(
  telefonoE164: string,
  rol: MessageRole,
  texto: string,
  extra?: { herramientaUsada?: string; id?: string }
): Promise<void> {
  const db = getDb()
  const convId = idConversacion(telefonoE164)
  const ahora = new Date().toISOString()

  const mensajeId = extra?.id ?? `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

  await db
    .collection(CONVERSACIONES)
    .doc(convId)
    .collection(MENSAJES)
    .doc(mensajeId)
    .set({
      id: mensajeId,
      rol,
      texto,
      herramientaUsada: extra?.herramientaUsada,
      enviadoEn: ahora,
    } satisfies Message)
}

/**
 * Crea o actualiza la cabecera de la conversación. Es lo que el panel listará mañana, y lo
 * que dice si el bot sigue al mando o ya la tiene un humano.
 */
export async function marcarConversacion(
  telefonoE164: string,
  estado: Conversation['estado'],
  clienteRef?: string
): Promise<void> {
  const convId = idConversacion(telefonoE164)
  await getDb()
    .collection(CONVERSACIONES)
    .doc(convId)
    .set(
      {
        id: convId,
        canal: 'whatsapp',
        clienteRef,
        estado,
        actualizadaEn: new Date().toISOString(),
      } satisfies Conversation,
      { merge: true }
    )
}

/**
 * ¿La tiene un humano ahora mismo? Si sí, el bot se calla: nada peor que un robot
 * interrumpiendo mientras una persona está atendiendo.
 */
export async function estaEnManosDeUnHumano(telefonoE164: string): Promise<boolean> {
  const db = getDb()
  const snap = await db.collection(CONVERSACIONES).doc(idConversacion(telefonoE164)).get()
  if (!snap.exists) return false
  const conv = snap.data() as Conversation
  return conv.estado === 'en_atencion'
}
