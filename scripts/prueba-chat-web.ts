/**
 * Gate G4 de la Spec 29 — Ruta de chat web (/api/chat).
 *
 * Prueba que:
 * - Petición sin cookie crea sesión y la devuelve en Set-Cookie.
 * - Petición con cookie reusa la misma conversación.
 * - Cuerpo sin mensaje o de más de 1000 caracteres → 400.
 * - Superado el tope → 429 sin llamar al modelo.
 */

import * as assert from 'node:assert'
import { manejarChat } from '../src/app/api/chat/route'
import type { ResultadoAgente } from '../src/lib/agente/tipos'

console.log('🧪 Iniciando prueba-chat-web.ts (Spec 29 · G4)...')

// Almacén en memoria para simular conversaciones sin tocar Firestore
type ConvEnMemoria = {
  mensajesEnVentana: number
  ventanaAbiertaEn: string | null
  mensajesTotales: number
  estado: string
  mensajes: Array<{ rol: string; texto: string }>
}

function crearAlmacenTest() {
  const convs = new Map<string, ConvEnMemoria>()

  return {
    async obtenerOIniciar(convId: string) {
      if (!convs.has(convId)) {
        convs.set(convId, {
          mensajesEnVentana: 0,
          ventanaAbiertaEn: null,
          mensajesTotales: 0,
          estado: 'abierta',
          mensajes: [],
        })
      }
      return convs.get(convId)!
    },
    async actualizar(convId: string, data: Partial<ConvEnMemoria>) {
      const actual = convs.get(convId) || {
        mensajesEnVentana: 0,
        ventanaAbiertaEn: null,
        mensajesTotales: 0,
        estado: 'abierta',
        mensajes: [],
      }
      convs.set(convId, { ...actual, ...data })
    },
    async agregarMensaje(convId: string, rol: string, texto: string) {
      const c = convs.get(convId)
      if (c) c.mensajes.push({ rol, texto })
    },
    obtener(convId: string) {
      return convs.get(convId)
    },
  }
}

async function main() {
  const almacen = crearAlmacenTest()
  let llamadasAlModelo = 0

  const mockAtender = async (): Promise<ResultadoAgente> => {
    llamadasAlModelo++
    return {
      texto: 'Hola, soy la recepcionista. ¿En qué te ayudo?',
      escalado: false,
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

  // 2.2 · Segunda petición con cookie: reusa la sesión
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
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Límite de tasa en la ruta: 429 sin llamar al modelo
  // ───────────────────────────────────────────────────────────────────────────
  console.log('3. Probando rate limit (429) sin llamar al modelo...')

  const sesionSpam = 'sesion_spam_test'
  const convSpamId = `web_${sesionSpam}`
  // Simulamos que ya consumió los 20 mensajes de la hora
  await almacen.actualizar(convSpamId, {
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

  console.log('✅ Todas las pruebas de la ruta /api/chat pasaron exitosamente.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
