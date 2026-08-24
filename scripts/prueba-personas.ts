import { nombreCorto, posiblesDuplicadas } from '../src/lib/personas'
import { Client } from '../src/types'

let failed = false
function assertEq(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(`❌ [FALLO] ${name}`)
    console.error(`   Esperaba: ${JSON.stringify(expected)}`)
    console.error(`   Obtuvo:   ${JSON.stringify(actual)}`)
    failed = true
  } else {
    console.log(`✅ [OK] ${name}`)
  }
}

// 1. Una sola Camila -> "Camila"
assertEq('Una sola Camila', nombreCorto('1', [{ id: '1', nombre: 'Camila Restrepo' }]), 'Camila')

// 2. Dos Camila con apellido distinto
assertEq('Dos Camila con apellido distinto (R)', nombreCorto('1', [
  { id: '1', nombre: 'Camila Restrepo' },
  { id: '2', nombre: 'Camila Jimenez' }
]), 'Camila R.')

assertEq('Dos Camila con apellido distinto (J)', nombreCorto('2', [
  { id: '1', nombre: 'Camila Restrepo' },
  { id: '2', nombre: 'Camila Jimenez' }
]), 'Camila J.')

// 3. Dos "Camila Restrepo" -> sufijo numérico, orden estable
const dosCamilaRestrepo = [
  { id: 'B', nombre: 'Camila Restrepo' },
  { id: 'A', nombre: 'Camila Restrepo' }
]
assertEq('Dos Camila Restrepo - primera (A)', nombreCorto('A', dosCamilaRestrepo), 'Camila Restrepo')
assertEq('Dos Camila Restrepo - segunda (B)', nombreCorto('B', dosCamilaRestrepo), 'Camila Restrepo (2)')

// 4. Nombre de una sola palabra -> no revienta
assertEq('Nombre una palabra', nombreCorto('1', [{ id: '1', nombre: 'Camila' }]), 'Camila')
assertEq('Dos Nombres de una palabra igual', nombreCorto('1', [
  { id: '1', nombre: 'Camila' },
  { id: '2', nombre: 'Camila' }
]), 'Camila')

// 5. posiblesDuplicadas: "Camila Restrepo" y "camila  restrepo" con teléfonos distintos -> un par
const c1: Client = { id: '1', nombre: 'Camila Restrepo', telefonoE164: '+573000000001', creadaEn: '2026-08-23T00:00:00Z' }
const c2: Client = { id: '2', nombre: 'camila  restrepo', telefonoE164: '+573000000002', creadaEn: '2026-08-23T00:00:00Z' }
assertEq('posiblesDuplicadas distintos teléfonos', posiblesDuplicadas([c1, c2]).length, 1)

// 6. Mismo nombre y mismo teléfono -> no es par
const c3: Client = { id: '3', nombre: 'Camila Restrepo', telefonoE164: '+573000000001', creadaEn: '2026-08-23T00:00:00Z' }
assertEq('Mismo nombre y teléfono', posiblesDuplicadas([c1, c3]).length, 0)

// 7. Con tildes: "María" y "Maria" -> par
const c4: Client = { id: '4', nombre: 'María', telefonoE164: '+573000000004', creadaEn: '2026-08-23T00:00:00Z' }
const c5: Client = { id: '5', nombre: 'Maria', telefonoE164: '+573000000005', creadaEn: '2026-08-23T00:00:00Z' }
assertEq('Con tildes son par', posiblesDuplicadas([c4, c5]).length, 1)

// 8. Una ficha con fusionadaEn no aparece en ningún par
const c6: Client = { id: '6', nombre: 'María', telefonoE164: '+573000000006', fusionadaEn: '4', creadaEn: '2026-08-23T00:00:00Z' }
assertEq('fusionadaEn ignorada', posiblesDuplicadas([c4, c6]).length, 0)

// 9. Lista vacía -> lista vacía, sin excepción
assertEq('Lista vacía', posiblesDuplicadas([]).length, 0)

if (failed) {
  process.exit(1)
} else {
  process.exit(0)
}
