/**
 * Comprueba, contra la API de Meta, si las credenciales de WhatsApp sirven.
 *
 * No es un gate de la cadena `verificar`: necesita red y credenciales. Es la herramienta que
 * evita el peor rato de esta integración — desplegar, dar de alta el webhook, escribirle al bot
 * y descubrir media hora después que el token estaba vencido.
 *
 *   npm run prueba:meta
 *
 * NUNCA imprime el valor de un secreto: solo si está, cuánto mide y si Meta lo acepta.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

const API = 'https://graph.facebook.com/v24.0'

function leerEnvLocal(): Record<string, string> {
  const p = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(p)) return {}
  const salida: Record<string, string> = {}
  for (const linea of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const l = linea.trim()
    if (!l || l.startsWith('#')) continue
    const i = l.indexOf('=')
    if (i < 0) continue
    salida[l.slice(0, i).trim()] = l.slice(i + 1).trim()
  }
  return salida
}

function ok(m: string) { console.log(`  ✅ ${m}`) }
function mal(m: string) { console.log(`  ❌ ${m}`) }
function aviso(m: string) { console.log(`  ⚠️  ${m}`) }

async function main() {
  const env = { ...leerEnvLocal(), ...process.env } as Record<string, string>

  const phoneNumberId = (env.WHATSAPP_PHONE_NUMBER_ID || '').trim()
  const token = (env.WHATSAPP_ACCESS_TOKEN || '').trim()
  const appSecret = (env.WHATSAPP_APP_SECRET || '').trim()
  const verifyToken = (env.WHATSAPP_VERIFY_TOKEN || '').trim()

  console.log('\n── Qué hay configurado ──')
  for (const [nombre, valor] of [
    ['WHATSAPP_PHONE_NUMBER_ID', phoneNumberId],
    ['WHATSAPP_ACCESS_TOKEN', token],
    ['WHATSAPP_APP_SECRET', appSecret],
    ['WHATSAPP_VERIFY_TOKEN', verifyToken],
    ['DEEPSEEK_API_KEY', (env.DEEPSEEK_API_KEY || '').trim()],
  ] as Array<[string, string]>) {
    console.log(`  ${nombre.padEnd(26)} ${valor ? `presente (${valor.length} caracteres)` : '— VACÍA —'}`)
  }

  let fallos = 0

  console.log('\n── El token, contra Meta ──')
  if (!token || !phoneNumberId) {
    mal('faltan WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID: no hay nada que comprobar')
    fallos++
  } else {
    const res = await fetch(
      `${API}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = (await res.json()) as Record<string, unknown> & {
      error?: { message?: string; code?: number; error_subcode?: number }
    }

    if (res.ok) {
      ok(`el token sirve y el número existe`)
      console.log(`     número     ${data.display_phone_number ?? '(sin dato)'}`)
      console.log(`     nombre     ${data.verified_name ?? '(sin dato)'}`)
      console.log(`     calidad    ${data.quality_rating ?? '(sin dato)'}`)
    } else {
      const e = data.error
      mal(`Meta rechazó la consulta [${e?.code ?? res.status}] ${e?.message ?? ''}`)
      if (e?.code === 190) {
        aviso('código 190 = token inválido o VENCIDO. Los tokens temporales del panel duran 24 h.')
        aviso('Para algo que dure, hay que generar un token de Usuario del Sistema en Business Settings.')
      }
      if (e?.code === 100) {
        aviso('código 100 = el PHONE_NUMBER_ID probablemente está mal. Ojo: NO es el número de teléfono,')
        aviso('es el identificador largo que aparece justo debajo, en la pestaña de API Setup.')
      }
      fallos++
    }
  }

  console.log('\n── Cuánto le queda de vida al token ──')
  if (token) {
    // debug_token necesita un token de app: APP_ID|APP_SECRET. Sin app id no se puede pedir,
    // así que se intenta y, si no, se dice por qué (regla 3: nada de fingir que se comprobó).
    const appId = (env.WHATSAPP_APP_ID || env.META_APP_ID || '').trim()
    if (!appId || !appSecret) {
      aviso('no se pudo consultar la expiración: hace falta WHATSAPP_APP_ID y WHATSAPP_APP_SECRET')
      aviso('(no es bloqueante — solo significa que no sabemos cuándo vence)')
    } else {
      const res = await fetch(
        `${API}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`
      )
      const d = (await res.json()) as { data?: { expires_at?: number; is_valid?: boolean; scopes?: string[] } }
      if (d.data?.is_valid === false) {
        mal('Meta dice que el token NO es válido')
        fallos++
      } else if (d.data?.expires_at === 0) {
        ok('el token NO vence (es de Usuario del Sistema). Es el que se quiere en producción.')
      } else if (d.data?.expires_at) {
        const cuando = new Date(d.data.expires_at * 1000)
        const horas = Math.round((cuando.getTime() - Date.now()) / 3600000)
        if (horas <= 0) { mal(`el token venció el ${cuando.toISOString()}`); fallos++ }
        else if (horas < 48) aviso(`el token vence en ~${horas} h (${cuando.toISOString()}). Sirve para el demo, no para dejarlo puesto.`)
        else ok(`el token vence el ${cuando.toISOString()}`)
      }
    }
  }

  console.log('\n── El resto de piezas ──')
  if (appSecret.includes('solo-para-pruebas') || verifyToken.includes('local')) {
    mal('WHATSAPP_APP_SECRET / WHATSAPP_VERIFY_TOKEN siguen con los valores de MENTIRA de las pruebas')
    aviso('el APP SECRET real sale de developers.facebook.com → tu app → Configuración → Básica')
    fallos++
  } else if (!appSecret) {
    mal('falta WHATSAPP_APP_SECRET: sin él el webhook rechaza TODO por diseño (Spec 28 · D5)')
    fallos++
  } else {
    ok('WHATSAPP_APP_SECRET tiene un valor propio')
  }

  if (!verifyToken) {
    mal('falta WHATSAPP_VERIFY_TOKEN: sin él Meta no puede dar de alta el webhook')
    fallos++
  }

  if (!(env.DEEPSEEK_API_KEY || '').trim()) {
    mal('falta DEEPSEEK_API_KEY: el agente escalaría a humano en cada mensaje')
    fallos++
  } else {
    ok('DEEPSEEK_API_KEY presente')
  }

  console.log(
    fallos === 0
      ? '\n✅ Todo listo. Se puede desplegar y dar de alta el webhook.\n'
      : `\n❌ ${fallos} cosa(s) por resolver antes de desplegar.\n`
  )
  process.exit(fallos === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
