/**
 * Gate de enrutado del panel.
 *
 * Nace de un fallo real: el rol `admin` tenía un desvío de `/admin` a `/admin/catalogo`,
 * y como la Agenda **vive en `/admin`**, la dueña no podía abrirla. Estuvo así en
 * producción y no lo cazó nadie, porque el único gate que existía comprobaba la petición
 * **sin sesión** — se verificó al portero, nunca a la dueña ya adentro.
 *
 * El caso `admin → /admin → seguir` es esa prueba. Si alguien reintroduce el desvío,
 * esto se pone rojo.
 */
import { decidirRuta, type DecisionRuta, type SesionMinima } from '../src/lib/rutas'

let fallos = 0

function caso(
  descripcion: string,
  pathname: string,
  session: SesionMinima,
  esperado: DecisionRuta['tipo']
) {
  const obtenido = decidirRuta(pathname, session).tipo
  if (obtenido === esperado) {
    console.log(`  \x1b[32m✓\x1b[0m ${descripcion}`)
  } else {
    console.log(`  \x1b[31m✗ ${descripcion}\x1b[0m`)
    console.log(`      esperado: ${esperado}   obtenido: ${obtenido}`)
    fallos++
  }
}

const admin: SesionMinima = { rol: 'admin' }
const recepcion: SesionMinima = { rol: 'recepcion' }
const profesional: SesionMinima = { rol: 'profesional' }

console.log('\nRutas del panel\n')

console.log('1. La Agenda vive en /admin y los tres roles entran')
caso('admin abre la Agenda', '/admin', admin, 'seguir')
caso('recepción abre la Agenda', '/admin', recepcion, 'seguir')
caso('profesional abre la Agenda', '/admin', profesional, 'seguir')
caso('/admin/agenda también entra', '/admin/agenda', admin, 'seguir')

console.log('\n2. Sin sesión no se pasa')
caso('sin sesión → login', '/admin', null, 'a_login')
caso('sin sesión en una subruta → login', '/admin/catalogo', null, 'a_login')
caso('el login se ve sin sesión', '/admin/login', null, 'seguir')
caso('con sesión, el login devuelve al panel', '/admin/login', admin, 'a_panel')

console.log('\n3. Los permisos por ruta siguen mordiendo')
caso('admin entra al Catálogo', '/admin/catalogo', admin, 'seguir')
caso('recepción NO entra al Catálogo', '/admin/catalogo', recepcion, 'denegar')
caso('profesional NO entra al Equipo', '/admin/profesionales', profesional, 'denegar')
caso('profesional NO entra a Clientas', '/admin/clientas', profesional, 'denegar')
caso('recepción SÍ entra a Clientas', '/admin/clientas', recepcion, 'seguir')

console.log('\n4. Falla cerrado')
caso('rol desconocido en ruta protegida → denegar', '/admin/catalogo', { rol: 'x' }, 'denegar')
caso('sesión sin rol en ruta protegida → denegar', '/admin/catalogo', {}, 'denegar')

console.log('\n5. Fuera del panel no se toca nada')
caso('la portada pública pasa', '/', null, 'seguir')
caso('el wizard de reserva pasa', '/reservar', null, 'seguir')

if (fallos > 0) {
  console.log(`\n\x1b[31m✗ ${fallos} caso(s) fallaron\x1b[0m\n`)
  process.exit(1)
}

console.log('\n\x1b[32m✅ PRUEBA DE RUTAS SUPERADA\x1b[0m\n')
