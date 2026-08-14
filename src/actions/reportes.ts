'use server'

import { withAuth } from '@/lib/withAuth'
import { getAppointmentsEnRango, getChargesEnRango, getProfessionals, getServices } from '@/lib/db'
import {
  resumenCaja,
  rankingProfesionales,
  rankingServicios,
  mapaDeFranjas,
  citasPorOrigen,
  type Rango,
  type ResumenCaja,
  type FilaProfesional,
  type FilaServicio,
  type CeldaFranja,
  type ResumenOrigen
} from '@/lib/reportes'

export type ReporteCompleto = {
  rango: Rango
  caja: ResumenCaja
  profesionales: FilaProfesional[]
  servicios: FilaServicio[]
  franjas: CeldaFranja[]
  origen: ResumenOrigen
}

export const getReporteAction = withAuth<ReporteCompleto, [desdeIso: string, hastaIso: string]>(
  'cobro:leer',
  async (ctx, desdeIso, hastaIso) => {
    const desde = new Date(desdeIso)
    const hasta = new Date(hastaIso)
    
    if (desde >= hasta) {
      return { ok: false, error: 'rango_invalido' }
    }
    
    const msDiferencia = hasta.getTime() - desde.getTime()
    const diasDiferencia = msDiferencia / (1000 * 3600 * 24)
    
    if (diasDiferencia > 92) {
      return { ok: false, error: 'rango_invalido' }
    }
    
    const [cobros, citas, profesionales, serviciosDb] = await Promise.all([
      getChargesEnRango(desdeIso, hastaIso),
      getAppointmentsEnRango(desdeIso, hastaIso),
      getProfessionals(),
      getServices()
    ])
    
    const rango: Rango = { desdeUtc: desdeIso, hastaUtc: hastaIso }
    
    return {
      rango,
      caja: resumenCaja(cobros),
      profesionales: rankingProfesionales(cobros, citas, profesionales, rango),
      servicios: rankingServicios(cobros, citas, serviciosDb),
      franjas: mapaDeFranjas(cobros, citas),
      origen: citasPorOrigen(citas)
    }
  }
)
