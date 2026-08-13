/**
 * Prueba del gate de DONE: **dos reservas sobre el mismo cupo, solo una vive.**
 *
 * Ejercita la Server Action real (`crearCitaAction`), no una copia de su lógica:
 * si mañana alguien quita la validación de solape, esta prueba se pone roja.
 * Esa es la condición que exige [[04-BIBLIOTECA/patrones/guardianes-que-no-guardan]]
 * — una prueba que no puede fallar no es una prueba.
 *
 * Ejecutar:  npm run prueba:doble-reserva
 *
 * Escribe en `casa-malva.db` y limpia lo que crea al terminar.
 */
import { crearCitaAction } from '../src/actions/citas'
import { getDb, getProfessionals, getServices } from '../src/lib/db'
import { franjasDisponibles } from '../src/lib/disponibilidad'
import { getAppointments } from '../src/lib/db'

const VERDE = '\x1b[32m'
const ROJO = '\x1b[31m'
const GRIS = '\x1b[90m'
const FIN = '\x1b[0m'

const creadas: string[] = []
let fallos = 0

function comprobar(nombre: string, condicion: boolean, detalle = '') {
  if (condicion) {
    console.log(`  ${VERDE}✓${FIN} ${nombre}`)
  } else {
    fallos++
    console.log(`  ${ROJO}✗ ${nombre}${FIN}${detalle ? `\n    ${GRIS}${detalle}${FIN}` : ''}`)
  }
}

async function main() {
  console.log('\n🔒 Prueba anti-doble-reserva — Casa Malva\n')

  const servicios = getServices()
  const equipo = getProfessionals()

  // Servicio y profesional que de verdad se puedan combinar.
  const prof = equipo.find((p) => p.activo && p.serviceIds.length > 0)
  if (!prof) throw new Error('No hay profesionales activas con servicios asignados')
  const svc = servicios.find((s) => s.activo && prof.serviceIds.includes(s.id))
  if (!svc) throw new Error('No hay servicio activo para esa profesional')

  // Primer cupo libre a partir de mañana (evita el mínimo de antelación).
  let cupo: Date | null = null
  for (let i = 1; i <= 20 && !cupo; i++) {
    const dia = new Date()
    dia.setDate(dia.getDate() + i)
    dia.setHours(0, 0, 0, 0)
    const libres = franjasDisponibles(svc.id, prof.id, dia, getAppointments(), servicios, equipo)
    if (libres.length > 0) cupo = libres[0]
  }
  if (!cupo) throw new Error('No se encontró ningún cupo libre en 20 días')

  console.log(
    `${GRIS}  Escenario: ${svc.nombre} con ${prof.nombre}\n` +
      `  Cupo en disputa: ${cupo.toISOString()}${FIN}\n`
  )

  const peticion = {
    serviceId: svc.id,
    professionalId: prof.id,
    inicioUtc: cupo.toISOString(),
    origen: 'web' as const,
    creadaPor: 'prueba_doble_reserva',
  }

  // --- Las dos clientas piden el mismo cupo -------------------------------
  const [primera, segunda] = await Promise.all([
    crearCitaAction({ ...peticion, clienteNombre: 'Prueba Uno', clienteTelefono: '3001110001' }),
    crearCitaAction({ ...peticion, clienteNombre: 'Prueba Dos', clienteTelefono: '3001110002' }),
  ])

  if (primera.ok) creadas.push(primera.data.id)
  if (segunda.ok) creadas.push(segunda.data.id)

  const ganadoras = [primera, segunda].filter((r) => r.ok)
  const perdedoras = [primera, segunda].filter((r) => !r.ok)

  comprobar(
    'exactamente una de las dos reservas sobrevive',
    ganadoras.length === 1,
    `sobrevivieron ${ganadoras.length}: ${JSON.stringify([primera, segunda])}`
  )

  comprobar(
    'la rechazada informa "cupo_ocupado"',
    perdedoras.length === 1 && !perdedoras[0].ok && perdedoras[0].error === 'cupo_ocupado',
    `error recibido: ${perdedoras.map((p) => (!p.ok ? p.error : '')).join(', ')}`
  )

  comprobar(
    'la rechazada ofrece horas alternativas',
    perdedoras.length === 1 && !perdedoras[0].ok && (perdedoras[0].alternativas?.length ?? 0) > 0,
    'no llegaron alternativas'
  )

  // --- En la base de datos hay UNA sola cita en ese instante ---------------
  const enEseCupo = getAppointments().filter(
    (a) =>
      a.professionalId === prof.id &&
      a.inicioUtc === cupo!.toISOString() &&
      a.estado !== 'cancelada' &&
      a.estado !== 'no_asistio'
  )
  comprobar(
    'en la base de datos queda una sola cita viva en ese cupo',
    enEseCupo.length === 1,
    `hay ${enEseCupo.length}`
  )

  // --- Un tercer intento sobre el mismo cupo también se rechaza ------------
  const tercera = await crearCitaAction({
    ...peticion,
    clienteNombre: 'Prueba Tres',
    clienteTelefono: '3001110003',
  })
  if (tercera.ok) creadas.push(tercera.data.id)
  comprobar(
    'un intento posterior sobre el mismo cupo se rechaza',
    !tercera.ok && tercera.error === 'cupo_ocupado'
  )

  // --- El cupo ya no se ofrece como libre ---------------------------------
  const libresAhora = franjasDisponibles(
    svc.id,
    prof.id,
    cupo,
    getAppointments(),
    servicios,
    equipo
  )
  comprobar(
    'el cupo desaparece de la lista de horas libres',
    !libresAhora.some((f) => f.getTime() === cupo!.getTime())
  )
}

function limpiar() {
  if (creadas.length === 0) return
  const db = getDb()
  for (const id of creadas) {
    db.prepare('DELETE FROM appointments WHERE id = ?').run(id)
  }
  db.prepare("DELETE FROM clients WHERE telefonoE164 IN ('+573001110001','+573001110002','+573001110003')").run()
  console.log(`\n${GRIS}  Limpieza: ${creadas.length} cita(s) de prueba eliminadas${FIN}`)
}

main()
  .catch((err) => {
    fallos++
    console.error(`\n${ROJO}Error inesperado:${FIN}`, err)
  })
  .finally(() => {
    limpiar()
    if (fallos > 0) {
      console.log(`\n${ROJO}✗ ${fallos} comprobación(es) fallidas${FIN}\n`)
      process.exit(1)
    }
    console.log(`\n${VERDE}✓ Todas las comprobaciones pasaron${FIN}\n`)
  })
