/**
 * El puerto del modelo (Spec 28 · D7).
 *
 * Una interfaz, una implementación. El resto del agente no sabe qué modelo hay detrás, y
 * cambiar de proveedor es escribir otra función de este archivo — no tocar el cerebro.
 *
 * Proveedor decidido por Mario el 2026-08-20: **DeepSeek**, por su API compatible con OpenAI.
 * Se llama con `fetch` plano a propósito: cero dependencias nuevas en `package.json`.
 */

export type MensajeLLM = {
  rol: 'sistema' | 'usuario' | 'asistente'
  contenido: string
}

export type RespuestaLLM =
  | { ok: true; texto: string }
  | { ok: false; error: string }

export interface ModeloLLM {
  /** Devuelve el texto crudo del modelo. Quien llama decide si es un plan válido. */
  completar(mensajes: MensajeLLM[]): Promise<RespuestaLLM>
}

const ENDPOINT = 'https://api.deepseek.com/chat/completions'
const MODELO = 'deepseek-chat'
const TIEMPO_LIMITE_MS = 20_000

const ROLES: Record<MensajeLLM['rol'], string> = {
  sistema: 'system',
  usuario: 'user',
  asistente: 'assistant',
}

/**
 * DeepSeek en **modo JSON**, no en *function calling* (Spec 28 · D7).
 *
 * El modelo devuelve un `PlanDelAgente` serializado y nada más. Si el JSON no valida, el plan
 * se descarta en `parsearPlan` y el agente escala. Es lo que hace que el diseño no dependa de
 * lo bien que un modelo concreto llame herramientas.
 */
export function modeloDeepSeek(): ModeloLLM {
  return {
    async completar(mensajes: MensajeLLM[]): Promise<RespuestaLLM> {
      const apiKey = process.env.DEEPSEEK_API_KEY?.trim()

      // Falla cerrado (regla 3): sin llave NO se inventa una respuesta plausible.
      if (!apiKey) {
        return { ok: false, error: 'DEEPSEEK_API_KEY ausente' }
      }

      const control = new AbortController()
      const reloj = setTimeout(() => control.abort(), TIEMPO_LIMITE_MS)

      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: MODELO,
            messages: mensajes.map((m) => ({ role: ROLES[m.rol], content: m.contenido })),
            response_format: { type: 'json_object' },
            temperature: 0.3,
            max_tokens: 700,
          }),
          signal: control.signal,
        })

        if (!res.ok) {
          const detalle = await res.text().catch(() => '')
          return { ok: false, error: `[${res.status}] ${detalle.slice(0, 300)}` }
        }

        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>
        }
        const texto = data.choices?.[0]?.message?.content

        if (typeof texto !== 'string' || texto.trim().length === 0) {
          return { ok: false, error: 'el modelo devolvió una respuesta vacía' }
        }

        return { ok: true, texto }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return { ok: false, error: `el modelo tardó más de ${TIEMPO_LIMITE_MS / 1000}s` }
        }
        return { ok: false, error: err instanceof Error ? err.message : 'error de red con DeepSeek' }
      } finally {
        clearTimeout(reloj)
      }
    },
  }
}

/** Modelo de mentira para pruebas: devuelve lo que se le diga, en orden. */
export function modeloDeGuion(respuestas: string[]): ModeloLLM {
  let i = 0
  return {
    async completar(): Promise<RespuestaLLM> {
      if (i >= respuestas.length) return { ok: false, error: 'guion agotado' }
      return { ok: true, texto: respuestas[i++] }
    },
  }
}

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

/**
 * Google Gemini 1.5 Flash en modo JSON estructurado.
 * Menos de 600ms de latencia, tier gratuito de 1M tokens/min y costo ínfimo ($0.075 / 1M).
 */
export function modeloGemini(): ModeloLLM {
  return {
    async completar(mensajes: MensajeLLM[]): Promise<RespuestaLLM> {
      const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()

      if (!apiKey || apiKey === 'pendiente-configuracion') {
        return { ok: false, error: 'GEMINI_API_KEY ausente o no configurada' }
      }

      const control = new AbortController()
      const reloj = setTimeout(() => control.abort(), TIEMPO_LIMITE_MS)

      try {
        const url = `${GEMINI_ENDPOINT}?key=${apiKey}`
        const systemInstruction = mensajes.find((m) => m.rol === 'sistema')?.contenido
        const contents = mensajes
          .filter((m) => m.rol !== 'sistema')
          .map((m) => ({
            role: m.rol === 'usuario' ? 'user' : 'model',
            parts: [{ text: m.contenido }],
          }))

        const payload: Record<string, unknown> = {
          contents,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3,
            maxOutputTokens: 700,
          },
        }

        if (systemInstruction) {
          payload.systemInstruction = {
            parts: [{ text: systemInstruction }],
          }
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: control.signal,
        })

        if (!res.ok) {
          const detalle = await res.text().catch(() => '')
          return { ok: false, error: `[Gemini ${res.status}] ${detalle.slice(0, 300)}` }
        }

        const data = (await res.json()) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> }
          }>
        }

        const texto = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (typeof texto !== 'string' || texto.trim().length === 0) {
          return { ok: false, error: 'Gemini devolvió una respuesta vacía' }
        }

        return { ok: true, texto }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return { ok: false, error: `Gemini tardó más de ${TIEMPO_LIMITE_MS / 1000}s` }
        }
        return { ok: false, error: err instanceof Error ? err.message : 'error de red con Gemini' }
      } finally {
        clearTimeout(reloj)
      }
    },
  }
}

/**
 * Modelo por defecto: Detecta automáticamente si hay GEMINI_API_KEY o DEEPSEEK_API_KEY.
 * Si hay Gemini configurado, usa Gemini; si hay DeepSeek válido, usa DeepSeek.
 */
export function modeloPorDefecto(): ModeloLLM {
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()
  const deepseekKey = (process.env.DEEPSEEK_API_KEY || '').trim()

  if (geminiKey && geminiKey !== 'pendiente-configuracion') {
    return modeloGemini()
  }
  if (deepseekKey && deepseekKey !== 'pendiente-configuracion') {
    return modeloDeepSeek()
  }

  return {
    async completar(mensajes: MensajeLLM[]): Promise<RespuestaLLM> {
      const g = await modeloGemini().completar(mensajes)
      if (g.ok) return g
      return await modeloDeepSeek().completar(mensajes)
    },
  }
}
