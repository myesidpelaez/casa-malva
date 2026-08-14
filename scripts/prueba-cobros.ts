import { calcularCobro, idCobro } from '../src/lib/cobros'

let failed = false;

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(`❌ FALLO: ${message}\n   Esperado: ${JSON.stringify(expected)}\n   Recibido: ${JSON.stringify(actual)}`);
    failed = true;
  } else {
    console.log(`✅ OK: ${message}`);
  }
}

console.log("=== Corriendo pruebas de cobros ===");

// 1. 55.000 sin descuento ni propina
assertEqual(
  calcularCobro({ precioListaCentavos: 55000, descuentoCentavos: 0, propinaCentavos: 0 }),
  { ok: true, cobradoCentavos: 55000, totalRecibidoCentavos: 55000 },
  "55.000 sin descuento ni propina"
);

// 2. 55.000 con 5.000 de descuento -> cobrado 50.000
assertEqual(
  calcularCobro({ precioListaCentavos: 55000, descuentoCentavos: 5000, propinaCentavos: 0 }),
  { ok: true, cobradoCentavos: 50000, totalRecibidoCentavos: 50000 },
  "55.000 con 5.000 de descuento"
);

// 3. 55.000 con 10.000 de propina -> cobrado 55.000 y recibido 65.000
assertEqual(
  calcularCobro({ precioListaCentavos: 55000, descuentoCentavos: 0, propinaCentavos: 10000 }),
  { ok: true, cobradoCentavos: 55000, totalRecibidoCentavos: 65000 },
  "55.000 con 10.000 de propina"
);

// 4. descuento mayor que el precio
assertEqual(
  calcularCobro({ precioListaCentavos: 55000, descuentoCentavos: 60000, propinaCentavos: 0 }),
  { ok: false, error: 'descuento_mayor_que_precio' },
  "Descuento mayor que el precio"
);

// 5. descuento negativo y propina negativa -> error
assertEqual(
  calcularCobro({ precioListaCentavos: 55000, descuentoCentavos: -1000, propinaCentavos: 0 }),
  { ok: false, error: 'descuento_negativo' },
  "Descuento negativo"
);
assertEqual(
  calcularCobro({ precioListaCentavos: 55000, descuentoCentavos: 0, propinaCentavos: -1000 }),
  { ok: false, error: 'propina_negativa' },
  "Propina negativa"
);
assertEqual(
  calcularCobro({ precioListaCentavos: -1000, descuentoCentavos: 0, propinaCentavos: 0 }),
  { ok: false, error: 'precio_invalido' },
  "Precio negativo"
);

// 6. idCobro('apt_123') === 'chg_apt_123'
assertEqual(
  idCobro('apt_123'),
  'chg_apt_123',
  "idCobro es determinista"
);

if (failed) {
  process.exit(1);
} else {
  console.log("=== Todas las pruebas pasaron ===");
  process.exit(0);
}
