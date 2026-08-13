/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'fs';
import * as path from 'path';

// Lista blanca de acciones que pueden ser llamadas sin withAuth
const whitelist = [
  'loginAction',
  'logoutAction',
  'sesionActualAction',
  'getCategoriesAction',
  'getServicesAction',
  'getProfessionalsAction',
  'crearCitaAction',
  'franjasDelDiaAction',
  'diasConCuposAction',
  'consultarDisponibilidadAction'
];

async function main() {
  const actionsDir = path.join(process.cwd(), 'src/actions');
  const files = fs.readdirSync(actionsDir).filter(f => f.endsWith('.ts'));

  let hasErrors = false;
  console.log('=== Iniciando prueba de permisos ===\n');

  for (const file of files) {
    const actionModule = await import(`../src/actions/${file}`);
    for (const [name, func] of Object.entries(actionModule)) {
      if (name.endsWith('Action')) {
        // En el nuevo withAuth le pondremos un tag __isWithAuth = true
        // Si no está, debe estar en la whitelist.
        const isProtected = (func as any).__isWithAuth === true;
        const inWhitelist = whitelist.includes(name);

        if (!isProtected && !inWhitelist) {
          console.error(`❌ Fuga detectada: ${name} en ${file} no está protegida ni en la lista blanca.`);
          hasErrors = true;
        } else if (isProtected && inWhitelist) {
          console.error(`❌ Inconsistencia: ${name} en ${file} está protegida PERO aparece en la lista blanca.`);
          hasErrors = true;
        } else {
          console.log(`✅ ${name} en ${file} está ${isProtected ? 'protegida' : 'en lista blanca (pública)'}.`);
        }
      }
    }
  }

  console.log('\n--- Verificando src/lib/permisos.ts ---');
  try {
    const permisosModule = await import('../src/lib/permisos');
    const { PERMISOS, puedeTocarCita } = permisosModule;

    const allowedRoles = ['admin', 'recepcion', 'profesional'];
    let permisosInvalidos = false;
    for (const [permiso, roles] of Object.entries(PERMISOS)) {
      const arrRoles = roles as unknown as string[];
      if (arrRoles.length === 0) {
        console.error(`❌ Permiso ${permiso} no tiene ningún rol asignado.`);
        permisosInvalidos = true;
      }
      for (const rol of arrRoles) {
        if (!allowedRoles.includes(rol)) {
          console.error(`❌ Permiso ${permiso} incluye el rol inválido: ${rol}`);
          permisosInvalidos = true;
        }
      }
    }
    if (!permisosInvalidos) {
      console.log(`✅ Todos los permisos usan roles válidos.`);
    } else {
      hasErrors = true;
    }

    // Pruebas para puedeTocarCita
    const mockAdminCtx = { rol: 'admin' } as any;
    const mockRecepcionCtx = { rol: 'recepcion' } as any;
    const mockProfMiaCtx = { rol: 'profesional', professionalId: 'p1' } as any;
    const mockProfAjenaCtx = { rol: 'profesional', professionalId: 'p2' } as any;
    const mockProfSinIdCtx = { rol: 'profesional' } as any;
    const mockCita = { professionalId: 'p1' } as any;

    if (!puedeTocarCita(mockAdminCtx, mockCita)) {
      console.error(`❌ puedeTocarCita: admin debería poder tocar cualquier cita.`);
      hasErrors = true;
    }
    if (!puedeTocarCita(mockRecepcionCtx, mockCita)) {
      console.error(`❌ puedeTocarCita: recepcion debería poder tocar cualquier cita.`);
      hasErrors = true;
    }
    if (!puedeTocarCita(mockProfMiaCtx, mockCita)) {
      console.error(`❌ puedeTocarCita: profesional debería poder tocar su propia cita.`);
      hasErrors = true;
    }
    if (puedeTocarCita(mockProfAjenaCtx, mockCita)) {
      console.error(`❌ puedeTocarCita: profesional NO debería poder tocar cita ajena.`);
      hasErrors = true;
    }
    if (puedeTocarCita(mockProfSinIdCtx, mockCita)) {
      console.error(`❌ puedeTocarCita: profesional sin ID NO debería poder tocar citas.`);
      hasErrors = true;
    }

  } catch (error: any) {
    console.error(`❌ Error al cargar/verificar permisos.ts: ${error.message}`);
    hasErrors = true;
  }

  // ── withAuth falla cerrado ──────────────────────────────────────────────────
  //
  // Esto prueba `decidirAcceso`, que es LA MISMA función que `withAuth` usa en producción,
  // importada del módulo real. No es una reimplementación: si cambia, esta prueba cambia con
  // ella. (La versión anterior de este bloque se escribía su propio `verifyPermiso` y se
  // probaba a sí misma — el error exacto del `test-gate1-seguridad.mjs` que reemplazamos.)
  console.log('\n--- Verificando que withAuth falla cerrado ---');

  const { decidirAcceso } = await import('../src/lib/withAuth');

  const sesion = (rol: unknown) =>
    ({ id: 'usr_x', email: 'x@casamalva.co', nombre: 'X', rol, exp: Date.now() + 3600_000 }) as any;

  const casos: Array<[string, any, string, string]> = [
    ['sin sesión',                     null,                    'cita:reagendar',      'no_autenticado'],
    ['rol ausente',                    sesion(undefined),       'cita:reagendar',      'sin_permiso'],
    ['rol desconocido',                sesion('superadmin'),    'cita:reagendar',      'sin_permiso'],
    ['rol válido sin el permiso',      sesion('profesional'),   'cita:reagendar',      'sin_permiso'],
    ['rol válido con el permiso',      sesion('admin'),         'cita:reagendar',      'ok'],
    ['profesional con agenda:leer',    sesion('profesional'),   'agenda:leer',         'ok'],
  ];

  for (const [descripcion, ses, permiso, esperado] of casos) {
    const d = decidirAcceso(ses, permiso as any);
    const obtenido = d.ok ? 'ok' : d.error;
    if (obtenido !== esperado) {
      console.error(`❌ decidirAcceso · ${descripcion}: devolvió "${obtenido}", esperaba "${esperado}"`);
      hasErrors = true;
    } else {
      console.log(`✅ ${descripcion} → ${obtenido}`);
    }
  }

  if (hasErrors) {

    console.error('\n❌ PRUEBA DE PERMISOS FALLIDA');
    process.exit(1);
  } else {
    console.log('\n✅ PRUEBA DE PERMISOS SUPERADA');
  }
}

main().catch(console.error);
