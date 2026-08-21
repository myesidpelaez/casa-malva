/**
 * Gate G1 de la Spec 28 — la puerta del webhook.
 *
 * La URL del webhook es pública. Esta prueba es lo único que garantiza que solo Meta puede
 * hablar por ella. Todo aquí es puro (`node:crypto`): sin red, sin credenciales.
 */

import * as assert from 'node:assert'
import {
  verificarFirmaMeta,
  firmarComoMeta,
  resolverVerificacion,
} from '../src/lib/whatsapp/firma'
import { extraerMensajes } from '../src/lib/whatsapp/entrante'

console.log('🧪 Iniciando prueba-webhook-firma.ts...')

const SECRETO = 'secreto-de-prueba-no-es-el-real'
const CUERPO = JSON.stringify({ object: 'whatsapp_business_account', entry: [] })

// ─────────────────────────────────────────────────────────────────────────────
// 1. La firma
// ─────────────────────────────────────────────────────────────────────────────
console.log('1. Probando verificarFirmaMeta...')

// 1.1 · El caso bueno.
assert.strictEqual(
  verificarFirmaMeta(CUERPO, firmarComoMeta(CUERPO, SECRETO), SECRETO).ok,
  true,
  'una firma legítima debe pasar'
)

// 1.2 · Cuerpo alterado con la firma original: el ataque que esto existe para parar.
{
  const firma = firmarComoMeta(CUERPO, SECRETO)
  const alterado = JSON.stringify({ object: 'whatsapp_business_account', entry: ['inyectado'] })
  const r = verificarFirmaMeta(alterado, firma, SECRETO)
  assert.strictEqual(r.ok, false, 'un cuerpo alterado NO puede pasar')
  assert.strictEqual((r as { motivo?: string }).motivo, 'no_coincide')
}

// 1.3 · Secreto equivocado.
{
  const r = verificarFirmaMeta(CUERPO, firmarComoMeta(CUERPO, 'otro-secreto'), SECRETO)
  assert.strictEqual(r.ok, false, 'una firma hecha con otro secreto NO puede pasar')
}

// 1.4 · Falla cerrado (regla 3): sin secreto configurado NO se procesa "por si acaso".
{
  const r = verificarFirmaMeta(CUERPO, firmarComoMeta(CUERPO, SECRETO), undefined)
  assert.strictEqual(r.ok, false, 'sin WHATSAPP_APP_SECRET no se acepta nada')
  assert.strictEqual((r as { motivo?: string }).motivo, 'sin_secreto')

  assert.strictEqual(verificarFirmaMeta(CUERPO, firmarComoMeta(CUERPO, SECRETO), '   ').ok, false)
}

// 1.5 · Cabecera ausente o con formato raro.
for (const cabecera of [null, '', 'sha1=abc', 'sha256=', 'sha256=no-es-hex', 'abc123']) {
  const r = verificarFirmaMeta(CUERPO, cabecera as string | null, SECRETO)
  assert.strictEqual(r.ok, false, `debió rechazar la cabecera: ${String(cabecera)}`)
}

// 1.6 · La firma depende del cuerpo EXACTO. Reserializar el JSON la rompe: es el motivo por
//       el que el route lee `req.text()` y no `req.json()`.
{
  const firma = firmarComoMeta(CUERPO, SECRETO)
  const reserializado = JSON.stringify(JSON.parse(CUERPO), null, 2) // mismo objeto, otro texto
  assert.notStrictEqual(reserializado, CUERPO)
  assert.strictEqual(
    verificarFirmaMeta(reserializado, firma, SECRETO).ok,
    false,
    'reserializar el cuerpo tiene que romper la firma — por eso se lee crudo'
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. El alta del webhook (GET de verificación)
// ─────────────────────────────────────────────────────────────────────────────
console.log('2. Probando resolverVerificacion...')

const TOKEN = 'token-de-alta'

{
  const p = new URLSearchParams({
    'hub.mode': 'subscribe',
    'hub.verify_token': TOKEN,
    'hub.challenge': '1234567890',
  })
  const r = resolverVerificacion(p, TOKEN)
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.ok && r.challenge, '1234567890')
}

for (const [nombre, params] of [
  ['token equivocado', { 'hub.mode': 'subscribe', 'hub.verify_token': 'otro', 'hub.challenge': 'x' }],
  ['modo equivocado', { 'hub.mode': 'unsubscribe', 'hub.verify_token': TOKEN, 'hub.challenge': 'x' }],
  ['sin challenge', { 'hub.mode': 'subscribe', 'hub.verify_token': TOKEN }],
] as Array<[string, Record<string, string>]>) {
  assert.strictEqual(
    resolverVerificacion(new URLSearchParams(params), TOKEN).ok,
    false,
    `debió rechazar: ${nombre}`
  )
}

// Sin token configurado no se da de alta nada, aunque venga todo bien.
assert.strictEqual(
  resolverVerificacion(
    new URLSearchParams({ 'hub.mode': 'subscribe', 'hub.verify_token': '', 'hub.challenge': 'x' }),
    undefined
  ).ok,
  false
)

// ─────────────────────────────────────────────────────────────────────────────
// 3. La traducción del sobre de Meta
// ─────────────────────────────────────────────────────────────────────────────
console.log('3. Probando extraerMensajes...')

const SOBRE_TEXTO = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '000',
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            contacts: [{ profile: { name: 'Ana' }, wa_id: '573006707219' }],
            messages: [
              {
                from: '573006707219',
                id: 'wamid.ABC123',
                timestamp: '1755730000',
                type: 'text',
                text: { body: 'Hola, quiero una manicure el jueves' },
              },
            ],
          },
        },
      ],
    },
  ],
}

{
  const ms = extraerMensajes(SOBRE_TEXTO)
  assert.strictEqual(ms.length, 1)
  assert.strictEqual(ms[0].wamid, 'wamid.ABC123')
  assert.strictEqual(ms[0].de, '573006707219')
  assert.strictEqual(ms[0].nombrePerfil, 'Ana')
  assert.strictEqual(ms[0].texto, 'Hola, quiero una manicure el jueves')
  assert.strictEqual(ms[0].tipo, 'text')
}

// Los avisos de estado (entregado/leído) llegan por la MISMA URL. Si se colaran como
// mensajes, el bot se respondería a sí mismo en bucle.
{
  const sobreEstado = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '000',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              statuses: [{ id: 'wamid.XYZ', status: 'delivered', timestamp: '1755730001' }],
            },
          },
        ],
      },
    ],
  }
  assert.deepStrictEqual(extraerMensajes(sobreEstado), [], 'un aviso de estado no es un mensaje')
}

// Un audio sí es un mensaje, pero sin texto: el agente tiene que poder decir que no lo lee.
{
  const sobreAudio = JSON.parse(JSON.stringify(SOBRE_TEXTO))
  sobreAudio.entry[0].changes[0].value.messages[0] = {
    from: '573006707219',
    id: 'wamid.AUDIO',
    timestamp: '1755730002',
    type: 'audio',
    audio: { id: 'media_1' },
  }
  const ms = extraerMensajes(sobreAudio)
  assert.strictEqual(ms.length, 1)
  assert.strictEqual(ms[0].tipo, 'audio')
  assert.strictEqual(ms[0].texto, '')
}

// Basura de cualquier forma: se ignora sin lanzar.
for (const basura of [null, undefined, {}, [], 'texto', { object: 'otra_cosa' }, { object: 'whatsapp_business_account' }]) {
  assert.deepStrictEqual(extraerMensajes(basura), [], `debió ignorar: ${JSON.stringify(basura)}`)
}

console.log('✅ Todas las pruebas de firma y webhook pasaron exitosamente.')
