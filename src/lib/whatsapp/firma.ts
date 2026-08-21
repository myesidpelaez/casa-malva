/**
 * Verificación de que un webhook viene de verdad de Meta (Spec 28 · D5).
 *
 * La URL del webhook es pública. Sin esto, cualquiera que la descubra le dicta citas al salón.
 *
 * Puro: solo `crypto`. Ni red, ni Firestore. Se prueba entero en `npm run prueba:webhook-firma`.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

export type ResultadoFirma =
  | { ok: true }
  | { ok: false; motivo: 'sin_secreto' | 'sin_cabecera' | 'formato_invalido' | 'no_coincide' }

/**
 * Compara `X-Hub-Signature-256` contra el HMAC-SHA256 del **cuerpo crudo**.
 *
 * ⚠️ `cuerpoCrudo` tiene que ser el texto exacto que llegó (`await req.text()`).
 * Si se pasa por `JSON.parse` y se vuelve a serializar, la firma deja de cuadrar: es el
 * error clásico de esta integración y cuesta horas de depuración.
 */
export function verificarFirmaMeta(
  cuerpoCrudo: string,
  cabecera: string | null,
  secreto: string | undefined
): ResultadoFirma {
  // Falla cerrado (regla 3): sin secreto configurado NO se procesa "por si acaso".
  if (!secreto || secreto.trim().length === 0) return { ok: false, motivo: 'sin_secreto' }
  if (!cabecera) return { ok: false, motivo: 'sin_cabecera' }

  const prefijo = 'sha256='
  if (!cabecera.startsWith(prefijo)) return { ok: false, motivo: 'formato_invalido' }

  const recibida = cabecera.slice(prefijo.length).trim()
  if (!/^[0-9a-f]{64}$/i.test(recibida)) return { ok: false, motivo: 'formato_invalido' }

  const esperada = createHmac('sha256', secreto).update(cuerpoCrudo, 'utf8').digest('hex')

  const a = Buffer.from(recibida.toLowerCase(), 'hex')
  const b = Buffer.from(esperada, 'hex')
  if (a.length !== b.length) return { ok: false, motivo: 'no_coincide' }

  // Comparación en tiempo constante: un `===` filtra cuánto acertó el atacante.
  return timingSafeEqual(a, b) ? { ok: true } : { ok: false, motivo: 'no_coincide' }
}

/**
 * Firma un cuerpo igual que lo firmaría Meta. **Solo para las pruebas**: es la única forma
 * de fabricar una petición legítima sin depender de la red de Meta.
 */
export function firmarComoMeta(cuerpoCrudo: string, secreto: string): string {
  return `sha256=${createHmac('sha256', secreto).update(cuerpoCrudo, 'utf8').digest('hex')}`
}

/**
 * El apretón de manos de alta: Meta hace un GET con estos tres parámetros y espera que le
 * devuelvan el `challenge` **solo** si el token coincide con el configurado.
 */
export function resolverVerificacion(
  params: URLSearchParams,
  tokenEsperado: string | undefined
): { ok: true; challenge: string } | { ok: false } {
  if (!tokenEsperado || tokenEsperado.trim().length === 0) return { ok: false }

  const modo = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')

  if (modo !== 'subscribe') return { ok: false }
  if (token !== tokenEsperado) return { ok: false }
  if (!challenge) return { ok: false }

  return { ok: true, challenge }
}
