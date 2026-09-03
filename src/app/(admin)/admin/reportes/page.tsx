import * as React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getReporteAction } from '@/actions/reportes'
import { AdminHeader } from '@/components/layout/AdminShell'
import { EmptyState } from '@/components/common/EmptyState'
import { formatCurrencyFromCents } from '@/lib/currency'
import { startOfDay } from '@/lib/disponibilidad'
import { getServices, getProfessionals, getChargesEnRango, getClientsRecientes } from '@/lib/db'
import {
  Banknote,
  Users,
  Calendar,
  TrendingUp,
  Share2,
  CalendarClock
} from 'lucide-react'

// Utilidad para resolver rangos en zona horaria local sin librerías externas
function resolvePeriodo(periodo: string | undefined) {
  const hoy = new Date()
  const p = periodo || 'hoy'
  const msPorDia = 24 * 3600 * 1000
  
  if (p === 'semana') {
    const d = startOfDay(hoy)
    const d7 = new Date(d.getTime() - 6 * msPorDia)
    return { desdeIso: d7.toISOString(), hastaIso: new Date(d.getTime() + msPorDia).toISOString(), label: 'Esta semana' }
  }
  
  if (p === 'mes') {
    const d = startOfDay(hoy)
    const d30 = new Date(d.getTime() - 29 * msPorDia)
    return { desdeIso: d30.toISOString(), hastaIso: new Date(d.getTime() + msPorDia).toISOString(), label: 'Este mes' }
  }
  
  if (p === 'mes_pasado') {
    const d = startOfDay(hoy)
    const h = new Date(d.getTime() - 29 * msPorDia)
    const d60 = new Date(h.getTime() - 30 * msPorDia)
    return { desdeIso: d60.toISOString(), hastaIso: h.toISOString(), label: 'Mes pasado' }
  }
  
  // default hoy
  const d = startOfDay(hoy)
  return { desdeIso: d.toISOString(), hastaIso: new Date(d.getTime() + msPorDia).toISOString(), label: 'Hoy' }
}

const DIAS_NOMBRES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Record<string, string>
}) {
  const periodo = searchParams.periodo
  const { desdeIso, hastaIso, label } = resolvePeriodo(periodo)
  
  const result = await getReporteAction(desdeIso, hastaIso)
  
  if (!result.ok) {
    if (result.error === 'no_autenticado') redirect('/admin/login')
    if (result.error === 'sin_permiso') redirect('/admin')
    return <div className="p-4 text-red-500">Error al cargar reportes: {result.error}</div>
  }
  
  const rep = result.data

  // Fetch adicionales ligeros para mostrar nombres en la lista de servicios crudos
  // La acción sólo nos dio los agregados
  const [cobrosCrudos, profesionales, servicios] = await Promise.all([
    getChargesEnRango(desdeIso, hastaIso),
    getProfessionals(),
    getServices(),
  ])
  
  // Necesitamos las citas para saber a quién se atendió, porque cobros tienen clientId y appointmentId
  // pero para los nombres necesitamos clientes
  const clientes = await getClientsRecientes(300)
  
  const mapProf = new Map(profesionales.map(p => [p.id, p.nombre]))
  const mapSvc = new Map(servicios.map(s => [s.id, s.nombre]))
  const mapCli = new Map(clientes.map(c => [c.id, c.nombre]))
  
  return (
    <div className="space-y-6 pb-10">
      <AdminHeader
        title="Reportes del estudio"
        subtitle={`Datos de ${label.toLowerCase()} (${desdeIso.split('T')[0]} a ${new Date(new Date(hastaIso).getTime() - 1000).toISOString().split('T')[0]})`}
      >
        <div className="flex bg-[var(--glass-tint)] rounded-md border border-ink-200 shadow-sm p-1">
          {['hoy', 'semana', 'mes', 'mes_pasado'].map((p) => {
            const isActive = (periodo || 'hoy') === p
            const labels: Record<string, string> = {
              hoy: 'Hoy',
              semana: 'Esta semana',
              mes: 'Este mes',
              mes_pasado: 'Mes pasado'
            }
            return (
              <Link
                key={p}
                href={`/admin/reportes?periodo=${p}`}
                className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
                  isActive 
                    ? 'bg-malva-500 text-white font-semibold shadow-sm' 
                    : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100/50'
                }`}
              >
                {labels[p]}
              </Link>
            )
          })}
        </div>
      </AdminHeader>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 1. La caja del periodo */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-ink-900 flex items-center gap-2">
            <Banknote className="h-4 w-4 text-malva-600" />
            La caja del periodo
          </h2>
          {rep.caja.servicios === 0 ? (
            <EmptyState title="Cero servicios" description="No hay cobros en este periodo." icon={Banknote} compact />
          ) : (
            <div className="bg-[var(--card)] rounded-[var(--radius-lg)] border border-ink-100 p-4 shadow-sm space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-ink-500 mb-1">Ingreso total</div>
                  <div className="text-2xl font-bold text-ink-900">{formatCurrencyFromCents(rep.caja.ingresoCentavos)}</div>
                </div>
                <div>
                  <div className="text-xs text-ink-500 mb-1">Servicios</div>
                  <div className="text-2xl font-bold text-ink-900">{rep.caja.servicios}</div>
                </div>
                <div>
                  <div className="text-xs text-ink-500 mb-1">Ticket Promedio</div>
                  <div className="text-2xl font-bold text-ink-900">{formatCurrencyFromCents(rep.caja.ticketPromedioCentavos)}</div>
                </div>
              </div>
              <div className="border-t border-ink-100 pt-4">
                <div className="text-xs font-semibold text-ink-700 mb-3">Por método de pago</div>
                <div className="space-y-2">
                  {Object.entries(rep.caja.porMetodo).sort((a, b) => b[1].centavos - a[1].centavos).map(([metodo, stats]) => (
                    stats.n > 0 && (
                      <div key={metodo} className="flex items-center justify-between text-sm">
                        <span className="capitalize text-ink-600">{metodo} ({stats.n})</span>
                        <span className="font-medium">{formatCurrencyFromCents(stats.centavos)}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
              {rep.caja.propinaCentavos > 0 && (
                <div className="border-t border-ink-100 pt-4 flex justify-between items-center bg-ink-100/30 -mx-4 -mb-4 p-4 rounded-b-[var(--radius-lg)]">
                  <div className="text-sm font-semibold text-ink-700">Propinas (del equipo, no del negocio)</div>
                  <div className="font-bold text-malva-700">{formatCurrencyFromCents(rep.caja.propinaCentavos)}</div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 2. Ranking de profesionales */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-ink-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-malva-600" />
            Ranking de profesionales
          </h2>
          {rep.profesionales.filter(p => p.servicios > 0 || p.minutosDisponibles > 0).length === 0 ? (
            <EmptyState title="Sin datos del equipo" description="No hubo actividad ni horarios en este periodo." icon={Users} compact />
          ) : (
            <div className="bg-[var(--card)] rounded-[var(--radius-lg)] border border-ink-100 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-ink-100/40 text-ink-500 border-b border-ink-100 text-xs">
                  <tr>
                    <th className="px-4 py-2 font-medium">Profesional</th>
                    <th className="px-4 py-2 font-medium text-right">Ingreso</th>
                    <th className="px-4 py-2 font-medium text-right">Ticket</th>
                    <th className="px-4 py-2 font-medium text-right">Ocupación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100/60">
                  {rep.profesionales.filter(p => p.servicios > 0 || p.minutosDisponibles > 0).map((p) => (
                    <tr key={p.professionalId} className="hover:bg-ink-100/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-ink-900">{mapProf.get(p.professionalId) || p.professionalId}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold text-ink-900">{formatCurrencyFromCents(p.ingresoCentavos)}</div>
                        <div className="text-2xs text-ink-400">{p.porcentajeDelTotal.toFixed(1)}% del total</div>
                      </td>
                      <td className="px-4 py-3 text-right text-ink-600">{formatCurrencyFromCents(p.ticketPromedioCentavos)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-medium text-ink-700">{p.ocupacionPorcentaje.toFixed(0)}%</span>
                          <div className="w-12 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                            <div className="h-full bg-malva-500 rounded-full" style={{ width: `${Math.min(100, p.ocupacionPorcentaje)}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 4. Qué deja más */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-ink-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-malva-600" />
            Qué deja más (Ingreso por hora)
          </h2>
          {rep.servicios.length === 0 ? (
            <EmptyState title="Sin servicios" description="No hay servicios para evaluar." icon={TrendingUp} compact />
          ) : (
            <div className="bg-[var(--card)] rounded-[var(--radius-lg)] border border-ink-100 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-ink-100/40 text-ink-500 border-b border-ink-100 text-xs">
                  <tr>
                    <th className="px-4 py-2 font-medium">Servicio</th>
                    <th className="px-4 py-2 font-medium text-right">Veces</th>
                    <th className="px-4 py-2 font-medium text-right text-malva-700">Rendimiento ($/h)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100/60">
                  {rep.servicios.map((s) => (
                    <tr key={s.serviceId} className="hover:bg-ink-100/30 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-ink-900">{mapSvc.get(s.serviceId) || s.serviceId}</td>
                      <td className="px-4 py-2.5 text-right text-ink-600">{s.veces}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-malva-700">{formatCurrencyFromCents(s.ingresoPorHoraCentavos)}/h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 6. De dónde vienen las citas */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-ink-900 flex items-center gap-2">
            <Share2 className="h-4 w-4 text-malva-600" />
            De dónde vienen las citas
          </h2>
          {rep.origen.web === 0 && rep.origen.admin === 0 && rep.origen.whatsapp === 0 ? (
            <EmptyState title="Sin orígenes" description="No hay citas en este periodo." icon={Share2} compact />
          ) : (
            <div className="bg-[var(--card)] rounded-[var(--radius-lg)] border border-ink-100 p-4 shadow-sm">
              <div className="space-y-3">
                {Object.entries(rep.origen).sort((a, b) => b[1] - a[1]).map(([origen, total]) => {
                  const max = Math.max(rep.origen.web, rep.origen.admin, rep.origen.whatsapp, 1)
                  const pct = Math.round((total / max) * 100)
                  return (
                    <div key={origen} className="flex items-center gap-3">
                      <div className="w-20 text-xs font-semibold uppercase tracking-wider text-ink-500">{origen}</div>
                      <div className="flex-1 h-3 bg-ink-100 rounded-full overflow-hidden">
                        <div className="h-full bg-malva-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-8 text-right text-sm font-bold text-ink-900">{total}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* 5. Horas muertas */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-ink-900 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-malva-600" />
            Concentración de citas (Horas muertas)
          </h2>
          {rep.franjas.length === 0 ? (
            <EmptyState title="Sin franjas" description="No hay suficientes citas para graficar concentración." icon={CalendarClock} compact />
          ) : (
            <div className="bg-[var(--card)] rounded-[var(--radius-lg)] border border-ink-100 p-4 shadow-sm overflow-x-auto">
              <div className="min-w-xl">
                <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-1">
                  <div className="col-span-1" />
                  {/* Días 1 a 7 (Lunes a Domingo), en el reporte 0 es Dom pero se convierte al pintar */}
                  {[1, 2, 3, 4, 5, 6, 0].map(dia => (
                    <div key={dia} className="text-center text-xs font-semibold text-ink-500 py-1">{DIAS_NOMBRES[dia]}</div>
                  ))}
                  
                  {Array.from({ length: 13 }, (_, i) => i + 8).map(hora => (
                    <React.Fragment key={hora}>
                      <div className="text-right text-xs text-ink-400 pr-3 py-1.5 flex items-center justify-end border-r border-ink-100">
                        {hora}:00
                      </div>
                      {[1, 2, 3, 4, 5, 6, 0].map(dia => {
                        const franja = rep.franjas.find(f => f.diaSemana === dia && f.hora === hora)
                        const maxServ = Math.max(...rep.franjas.map(f => f.servicios), 1)
                        const opacidad = franja ? 0.2 + (0.8 * franja.servicios / maxServ) : 0
                        return (
                          <div 
                            key={`${dia}-${hora}`} 
                            className="h-8 rounded-sm transition-colors border border-transparent hover:border-malva-400 flex items-center justify-center text-2xs font-bold text-ink-900"
                            style={{ backgroundColor: `rgba(188, 143, 169, ${opacidad})` }}
                            title={`${franja?.servicios || 0} servicios`}
                          >
                            {franja && franja.servicios > 0 ? franja.servicios : ''}
                          </div>
                        )
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
        
        {/* 3. Servicios prestados (lista cruda) */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-ink-900 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-malva-600" />
            Servicios prestados ({cobrosCrudos.length})
          </h2>
          {cobrosCrudos.length === 0 ? (
            <EmptyState title="Sin historial" description="No hay servicios prestados en este periodo." icon={Calendar} compact />
          ) : (
            <div className="bg-[var(--card)] rounded-[var(--radius-lg)] border border-ink-100 shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-2xl">
                <thead className="bg-ink-100/40 text-ink-500 border-b border-ink-100 text-xs">
                  <tr>
                    <th className="px-4 py-2 font-medium">Fecha</th>
                    <th className="px-4 py-2 font-medium">Hora</th>
                    <th className="px-4 py-2 font-medium">Clienta</th>
                    <th className="px-4 py-2 font-medium">Servicio</th>
                    <th className="px-4 py-2 font-medium">Profesional</th>
                    <th className="px-4 py-2 font-medium">Método</th>
                    <th className="px-4 py-2 font-medium text-right">Cobrado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100/60">
                  {cobrosCrudos.sort((a, b) => new Date(b.fechaUtc).getTime() - new Date(a.fechaUtc).getTime()).map(c => {
                    const d = new Date(c.fechaUtc)
                    const hm = d.toISOString().split('T')[1].substring(0, 5)
                    return (
                      <tr key={c.id} className="hover:bg-ink-100/30 transition-colors">
                        <td className="px-4 py-2 text-ink-600">{d.toISOString().split('T')[0]}</td>
                        <td className="px-4 py-2 text-ink-600">{hm}</td>
                        <td className="px-4 py-2 font-medium text-ink-900">{mapCli.get(c.clientId) || c.clientId}</td>
                        <td className="px-4 py-2 text-ink-800">{mapSvc.get(c.serviceId) || c.serviceId}</td>
                        <td className="px-4 py-2 text-ink-600">{mapProf.get(c.professionalId) || c.professionalId}</td>
                        <td className="px-4 py-2 text-ink-500 capitalize">{c.metodoPago}</td>
                        <td className="px-4 py-2 text-right font-semibold text-ink-900">{formatCurrencyFromCents(c.cobradoCentavos)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
