/**
 * Traductor del sobre de Meta a algo que el agente entienda (Spec 28 · D6).
 *
 * Puro: recibe el JSON ya parseado y devuelve mensajes normalizados. El adaptador es el
 * único punto del sistema que sabe cómo es un webhook de WhatsApp por dentro.
 */

export type MensajeEntrante = {
  /** `wamid...` — el id de Meta. Es la llave de idempotencia (Spec 28 · D3). */
  wamid: string
  /** Teléfono de quien escribe, en dígitos, tal como lo manda Meta. */
  de: string
  /** Nombre del perfil de WhatsApp, si Meta lo incluye. */
  nombrePerfil?: string
  texto: string
  /** Tipo original. Si no es 'text', `texto` va vacío y hay que responder con honestidad. */
  tipo: string
  /** Epoch en segundos, tal como lo manda Meta. */
  timestamp: number
}

type Json = Record<string, unknown>

function obj(v: unknown): Json | null {
  return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Json) : null
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

/**
 * Saca los mensajes de clienta de un webhook de Meta.
 *
 * Devuelve `[]` —sin lanzar— para todo lo que no sea un mensaje entrante: los avisos de
 * estado (`statuses`: entregado, leído) llegan por la misma URL y son ruido para el agente.
 */
export function extraerMensajes(cuerpo: unknown): MensajeEntrante[] {
  const raiz = obj(cuerpo)
  if (!raiz) return []
  if (raiz.object !== 'whatsapp_business_account') return []

  const salida: MensajeEntrante[] = []

  for (const entryRaw of arr(raiz.entry)) {
    const entry = obj(entryRaw)
    if (!entry) continue

    for (const changeRaw of arr(entry.changes)) {
      const change = obj(changeRaw)
      if (!change) continue

      const value = obj(change.value)
      if (!value) continue

      // Los avisos de estado no son mensajes: se ignoran en silencio.
      const mensajes = arr(value.messages)
      if (mensajes.length === 0) continue

      const perfiles = new Map<string, string>()
      for (const contactoRaw of arr(value.contacts)) {
        const contacto = obj(contactoRaw)
        if (!contacto) continue
        const waId = str(contacto.wa_id)
        const nombre = str(obj(contacto.profile)?.nombre ?? obj(contacto.profile)?.name)
        if (waId && nombre) perfiles.set(waId, nombre)
      }

      for (const mensajeRaw of mensajes) {
        const m = obj(mensajeRaw)
        if (!m) continue

        const wamid = str(m.id)
        const de = str(m.from)
        const tipo = str(m.type) ?? 'desconocido'
        if (!wamid || !de) continue

        const texto = tipo === 'text' ? (str(obj(m.text)?.body) ?? '') : ''
        const ts = Number(m.timestamp)

        salida.push({
          wamid,
          de,
          nombrePerfil: perfiles.get(de),
          texto,
          tipo,
          timestamp: Number.isFinite(ts) ? ts : Math.floor(Date.now() / 1000),
        })
      }
    }
  }

  return salida
}

// El paso a E.164 NO se reimplementa aquí: se usa `normalizePhoneE164` de `@/lib/utils`,
// que ya es la que usa el resto del sistema para guardar `Client.telefonoE164`.
