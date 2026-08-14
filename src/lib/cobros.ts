export type BorradorCobro = {
  precioListaCentavos: number
  descuentoCentavos: number
  propinaCentavos: number
}

export type ResultadoCobro =
  | { ok: true; cobradoCentavos: number; totalRecibidoCentavos: number }
  | { ok: false; error: 'descuento_negativo' | 'descuento_mayor_que_precio' | 'propina_negativa' | 'precio_invalido' }

export function calcularCobro(borrador: BorradorCobro): ResultadoCobro {
  if (borrador.precioListaCentavos < 0) return { ok: false, error: 'precio_invalido' }
  if (borrador.descuentoCentavos < 0) return { ok: false, error: 'descuento_negativo' }
  if (borrador.propinaCentavos < 0) return { ok: false, error: 'propina_negativa' }
  if (borrador.descuentoCentavos > borrador.precioListaCentavos) return { ok: false, error: 'descuento_mayor_que_precio' }

  const cobradoCentavos = borrador.precioListaCentavos - borrador.descuentoCentavos;
  const totalRecibidoCentavos = cobradoCentavos + borrador.propinaCentavos;

  return { ok: true, cobradoCentavos, totalRecibidoCentavos }
}

export function idCobro(appointmentId: string): string {
  return `chg_${appointmentId}`
}
