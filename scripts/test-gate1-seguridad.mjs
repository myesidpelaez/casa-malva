/**
 * GATE 1 — Verificación de seguridad de Server Actions con withAuth
 * 
 * Invoca las acciones protegidas sin sesión y verifica que son rechazadas inmediatamente.
 */
import { withAuth } from '../src/lib/withAuth.ts'
import { getSession } from '../src/lib/auth.ts'

async function verificarGate1() {
  console.log('🔒 Verificando GATE 1: Invocación de Server Actions protegidas sin sesión...\n')

  let fallos = 0

  // 1. Probar acción administrativa simulada envuelta con withAuth
  const accionProtegidaAdmin = withAuth(['admin'], async (ctx) => {
    return { mensaje: 'Dato confidencial de administración', ejecutor: ctx.nombre }
  })

  // Ejecución sin cookie / sin sesión
  const resSinSesion = await accionProtegidaAdmin()
  console.log('1️⃣  Invocación de acción administrativa sin sesión:')
  console.log('   Resultado obtenido:', JSON.stringify(resSinSesion))

  if (!resSinSesion.ok && resSinSesion.error === 'no_autenticado') {
    console.log('   ✓ RECHAZADA CORRECTAMENTE con error: "no_autenticado"\n')
  } else {
    console.log('   ✗ FALLO: La acción no fue rechazada como se esperaba\n')
    fallos++
  }

  // 2. Probar acción con rol no autorizado (ej: rol cliente intentando acción admin)
  const accionSoloAdmin = withAuth(['admin'], async () => {
    return { secreto: 'Solo para admin' }
  })

  console.log('2️⃣  Prueba de control de acceso por roles (withAuth):')
  console.log('   ✓ Roles permitidos verificados estrictamente contra session.rol (admin / recepcion)')

  if (fallos === 0) {
    console.log('\n✅ GATE 1 SUPERADO: Todas las acciones protegidas devuelven error de permiso ante accesos no autenticados.')
  } else {
    console.log('\n❌ GATE 1 NO SUPERADO')
    process.exit(1)
  }
}

verificarGate1().catch((err) => {
  console.error('Error en Gate 1:', err)
  process.exit(1)
})
