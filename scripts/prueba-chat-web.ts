/**
 * Gate G4 de la Spec 29 (y Spec 29b · Hallazgo 1) — Ruta de chat web (/api/chat).
 *
 * Prueba sobre el código UNIFICADO que:
 * - Petición sin cookie crea sesión y la devuelve en Set-Cookie.
 * - Petición con cookie reusa la misma conversación.
 * - Cuerpo sin mensaje o de más de 1000 caracteres → 400.
 * - Superado el tope → 429 sin llamar al modelo.
 * - En manos de un humano (en_atencion) → mensaje amable sin llamar al modelo.
 * - Lee y pasa historial de turnos al agente.
 * - Registra la herramientaUsada del agente.
 */

import * as assert from 'node:assert'
import { manejarChat, almacenConversacionEnMemoria } from '../src/app/api/chat/route'
import type { EntradaAtencion } from '../src/lib/agente/atender'
import type { ResultadoAgente } from '../src/lib/agente/tipos'

console.log('🧪 Iniciando prueba-chat-web.ts (Spec 29 · G4 / Spec 29b · H1)...')

async function main() {
  const almacen = almacenConversacionEnMemoria()
  let llamadasAlModelo = 0
  let ultimaEntradaAtender: EntradaAtencion | null = null

  const mockAtender = async (entrada: EntradaAtencion): Promise<ResultadoAgente> => {
    llamadasAlModelo++
    ultimaEntradaAtender = entrada
    return {
      texto: 'Hola, soy la recepcionista. ¿En qué te ayudo?',
      escalado: false,
      herramientaUsada: 'catalogo',
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Validaciones del cuerpo (400)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('1. Probando validación del cuerpo (400)...')

  // 1.1 · Sin cuerpo
  {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '',
    })
    const res = await manejarChat(req, { atender: mockAtender, almacen })
    assert.strictEqual(res.status, 400, 'cuerpo vacío debe responder 400')
  }

  // 1.2 · JSON sin campo mensaje
  {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await manejarChat(req, { atender: mockAtender, almacen })
    assert.strictEqual(res.status, 400, 'JSON sin mensaje debe responder 400')
  }

  // 1.3 · Mensaje vacío o con solo espacios
  {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensaje: '   ' }),
    })
    const res = await manejarChat(req, { atender: mockAtender, almacen })
    assert.strictEqual(res.status, 400, 'mensaje vacío debe responder 400')
  }

  // 1.4 · Mensaje de más de 1000 caracteres
  {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensaje: 'a'.repeat(1001) }),
    })
    const res = await manejarChat(req, { atender: mockAtender, almacen })
    assert.strictEqual(res.status, 400, 'mensaje > 1000 caracteres debe responder 400')
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Manejo de cookie y sesión
  // ───────────────────────────────────────────────────────────────────────────
  console.log('2. Probando creación y reuso de sesión vía cookies...')

  let sesionIdGenerado = ''

  // 2.1 · Primera petición sin cookie: crea sesión y devuelve Set-Cookie
  {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensaje: 'Hola estudio' }),
    })
    const res = await manejarChat(req, { atender: mockAtender, almacen })
    assert.strictEqual(res.status, 200, 'petición válida debe responder 200')

    const setCookie = res.headers.get('set-cookie')
    assert.ok(setCookie, 'debe devolver cabecera Set-Cookie')
    assert.ok(setCookie.includes('sesionId='), 'debe contener sesionId')
    assert.ok(setCookie.toLowerCase().includes('httponly'), 'debe ser httpOnly')
    assert.ok(setCookie.toLowerCase().includes('samesite=lax'), 'debe tener sameSite=lax')

    const match = setCookie.match(/sesionId=([^;]+)/)
    assert.ok(match, 'debe poder extraer el sesionId')
    sesionIdGenerado = match[1]
  }

  // 2.2 · Segunda petición con cookie: reusa la sesión y pasa historial
  {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `sesionId=${sesionIdGenerado}`,
      },
      body: JSON.stringify({ mensaje: '¿Tienen citas mañana?' }),
    })
    const res = await manejarChat(req, { atender: mockAtender, almacen })
    assert.strictEqual(res.status, 200)

    const convId = `web_${sesionIdGenerado}`
    const datos = almacen.obtener(convId)
    assert.ok(datos, 'debe existir la conversación en el almacén')
    assert.strictEqual(datos.mensajesTotales, 2, 'debe haber acumulado 2 mensajes en la misma conversación')
    assert.ok(ultimaEntradaAtender !== null, 'atender debió ser llamado')
    const entradaRecibida = ultimaEntradaAtender as EntradaAtencion
    assert.ok(entradaRecibida.historial.length >= 2, 'debe recibir historial de turnos previos')

    // Verificar que herramientaUsada se guardó en el almacén
    const ultimoMensajeAgente = datos.mensajes.filter((m) => m.rol === 'agente').pop()
    assert.strictEqual(ultimoMensajeAgente?.extra?.herramientaUsada, 'catalogo', 'debe guardar la herramientaUsada')
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Límite de tasa en la ruta: 429 sin llamar al modelo
  // ───────────────────────────────────────────────────────────────────────────
  console.log('3. Probando rate limit (429) sin llamar al modelo...')

  const sesionSpam = 'sesion_spam_test'
  const convSpamId = `web_${sesionSpam}`
  // Simulamos que ya consumió los 20 mensajes de la hora
  await almacen.actualizarLimite(convSpamId, {
    mensajesEnVentana: 20,
    ventanaAbiertaEn: new Date().toISOString(),
    mensajesTotales: 20,
  })

  const llamadasAntes = llamadasAlModelo

  const reqSpam = new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `sesionId=${sesionSpam}`,
    },
    body: JSON.stringify({ mensaje: 'Mensaje número 21' }),
  })

  const resSpam = await manejarChat(reqSpam, { atender: mockAtender, almacen })
  assert.strictEqual(resSpam.status, 429, 'debe devolver 429 al superar el límite')
  assert.strictEqual(llamadasAlModelo, llamadasAntes, 'NO debe haber llamado al modelo al devolver 429')

  const cuerpo429 = (await resSpam.json()) as { error?: string; escalado?: boolean }
  assert.strictEqual(cuerpo429.error, 'demasiados_mensajes')
  assert.strictEqual(cuerpo429.escalado, true)

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Conversación en manos de un humano (en_atencion)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('4. Probando conversación en_atencion...')

  const sesionHumano = 'sesion_humano_test'
  const convHumanoId = `web_${sesionHumano}`
  await almacen.marcarEstado(convHumanoId, 'en_atencion')

  const llamadasAntesHumano = llamadasAlModelo
  const reqHumano = new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `sesionId=${sesionHumano}`,
    },
    body: JSON.stringify({ mensaje: '¿Hola, sigue alguien ahí?' }),
  })

  const resHumano = await manejarChat(reqHumano, { atender: mockAtender, almacen })
  assert.strictEqual(resHumano.status, 200)
  assert.strictEqual(llamadasAlModelo, llamadasAntesHumano, 'NO debe llamar al bot si está en manos humanas')
  const cuerpoHumano = (await resHumano.json()) as { texto?: string; escalado?: boolean }
  assert.ok(cuerpoHumano.texto?.includes('atendiendo'), 'debe responder aviso de humano')
  assert.strictEqual(cuerpoHumano.escalado, true)

  console.log('✅ Todas las pruebas de la ruta /api/chat pasaron exitosamente.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

