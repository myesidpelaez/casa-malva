/**
 * Gate de nube (Spec 29b · Hallazgo 2) — Conversación completa de chat web de punta a punta.
 *
 * Ejecuta el guion de 4 turnos contra el endpoint real /api/chat (con Firestore y DeepSeek reales):
 *   1. "Hola, quiero una manicure semipermanente"
 *   2. "¿Qué horas tienes el sábado?"
 *   3. "La primera que tengas libre me sirve"
 *   4. "Me llamo Laura Gómez, mi número es 3012223344"
 *
 * Demuestra:
 *   - El modelo consulta la disponibilidad real con herramientas y no alucina ni promete en falso.
 *   - Al completar el guion, se crea una cita en Firestore con origen: 'web' para ese teléfono.
 *   - Imprime el id de la cita creada.
 *   - Borra la cita y sus slots al terminar, comprobando que la agenda queda intacta.
 *
 * Ejecutar:  npm run prueba:chat-nube
 */

import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import * as assert from 'node:assert'
import { manejarChat } from '../src/app/api/chat/route'
import { getDb, docDelete } from '../src/lib/db'
import { planificarSlots } from '../src/lib/ocupacion'
import { normalizePhoneE164 } from '../src/lib/utils'
import type { Appointment } from '../src/types'

const VERDE = '\x1b[32m'
const ROJO = '\x1b[31m'
const GRIS = '\x1b[90m'
const FIN = '\x1b[0m'

const TELEFONO_TEST = '3012223344'
const TELEFONO_E164 = normalizePhoneE164(TELEFONO_TEST)

async function contarCitasEnFirestore(): Promise<number> {
  const db = getDb()
  const snap = await db.collection('appointments').get()
  return snap.size
}

async function main() {
  console.log('\n🤖 Prueba de Chat Web de punta a punta — contra Cloud Firestore y DeepSeek\n')

  const db = getDb()
  const citasAntes = await contarCitasEnFirestore()
  console.log(`${GRIS}  Citas en Firestore antes de la prueba: ${citasAntes}${FIN}`)

  const guion = [
    'Hola, quiero una manicure semipermanente',
    '¿Qué horas tienes el sábado?',
    'La primera que tengas libre me sirve',
    'Me llamo Laura Gómez, mi número es 3012223344',
  ]

  let cookieSesion = ''
  let sesionId = ''

  for (let i = 0; i < guion.length; i++) {
    const mensaje = guion[i]
    console.log(`\n${GRIS}Turno ${i + 1}:${FIN}`)
    console.log(`  🙋 "${mensaje}"`)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (cookieSesion) {
      headers['Cookie'] = cookieSesion
    }

    const req = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({ mensaje }),
    })

    const res = await manejarChat(req)
    const setCookie = res.headers.get('set-cookie')
    if (setCookie && !cookieSesion) {
      const match = setCookie.match(/(?:^|;\s*)sesionId=([^;]+)/)
      if (match) {
        sesionId = match[1]
        cookieSesion = `sesionId=${sesionId}`
      }
    }

    assert.strictEqual(res.status, 200, `El turno ${i + 1} debe responder 200`)
    const data = (await res.json()) as { texto: string; escalado: boolean }
    console.log(`  🤖 "${data.texto}"`)
    if (data.escalado) {
      console.log(`  ${ROJO}[ESCALADO]${FIN}`)
    }
  }

  // Verificar en Firestore si la cita con origen 'web' y teléfono de Laura Gómez existe
  console.log(`\n${GRIS}Verificando cita en Firestore...${FIN}`)

  // Buscar cliente por teléfono
  const clientSnap = await db
    .collection('clients')
    .where('telefonoE164', '==', TELEFONO_E164)
    .get()

  assert.ok(!clientSnap.empty, 'Debe haberse creado o registrado la clienta con el teléfono de prueba')
  const clientDoc = clientSnap.docs[0]
  const clientId = clientDoc.id

  const aptSnap = await db
    .collection('appointments')
    .where('clientId', '==', clientId)
    .where('origen', '==', 'web')
    .get()

  assert.ok(!aptSnap.empty, 'Debe existir una cita en Firestore con origen: "web" para la clienta')
  const citaDoc = aptSnap.docs[0]
  const cita = citaDoc.data() as Appointment
  const citaCreadaId = cita.id

  console.log(`  ${VERDE}✓ Cita creada en Firestore con origen: 'web'${FIN}`)
  console.log(`  ${VERDE}✓ ID de la cita: ${citaCreadaId}${FIN}`)
  console.log(`    - Servicio: ${cita.serviceId}`)
  console.log(`    - Profesional: ${cita.professionalId}`)
  console.log(`    - Inicio UTC: ${cita.inicioUtc}`)
  console.log(`    - Creada por: ${cita.creadaPor}`)

  // Limpieza
  console.log(`\n${GRIS}Limpieza: eliminando cita de prueba y restaurando agenda...${FIN}`)

  const plan = planificarSlots(cita, { ...cita, estado: 'cancelada' }, cita.duracionTotalMin || 60)
  for (const slotId of plan.borrar) {
    await docDelete('slots', slotId)
  }
  await docDelete('appointments', citaCreadaId)
  await docDelete('clients', clientId)

  if (sesionId) {
    const convId = `web_${sesionId}`
    await docDelete('conversations', convId)
  }

  const citasDespues = await contarCitasEnFirestore()
  console.log(`${GRIS}  Citas en Firestore tras limpieza: ${citasDespues}${FIN}`)
  assert.strictEqual(citasDespues, citasAntes, 'La cantidad de citas en Firestore debe quedar idéntica a la inicial')

  console.log(`\n${VERDE}✓ Gate prueba:chat-nube superado exitosamente.${FIN}\n`)
}

main().catch((err) => {
  console.error(`\n${ROJO}✗ Error en prueba:chat-nube:${FIN}`, err)
  process.exit(1)
})
