'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  UserCheck,
  Calendar,
  BookOpen,
  Users,
  Search,
  ChevronRight,
  Phone,
  X,
} from 'lucide-react'
import { getClientsAction, getClientDetailAction } from '@/actions/clientes'
import { getServicesAction } from '@/actions/catalogo'
import { getProfessionalsAction } from '@/actions/profesionales'
import { formatCurrencyFromCents } from '@/lib/currency'
import type { Client, Appointment, Service, Professional } from '@/types'

export default function AdminClientasPage() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [clients, setClients] = React.useState<Client[]>([])
  const [services, setServices] = React.useState<Service[]>([])
  const [professionals, setProfessionals] = React.useState<Professional[]>([])
  const [search, setSearch] = React.useState('')

  // Detail Modal State
  const [selectedClientDetail, setSelectedClientDetail] = React.useState<{
    client: Client
    appointments: Appointment[]
    totalSpentCentavos: number
    totalAppointments: number
    noShowCount: number
  } | null>(null)

  // Auth Guard
  React.useEffect(() => {
    const isAuth = localStorage.getItem('casa_malva_admin_session')
    if (!isAuth) router.push('/admin/login')
  }, [router])

  React.useEffect(() => {
    async function init() {
      const [cRes, sRes, pRes] = await Promise.all([
        getClientsAction(),
        getServicesAction(),
        getProfessionalsAction(),
      ])
      if (cRes.ok) setClients(cRes.data)
      if (sRes.ok) setServices(sRes.data)
      if (pRes.ok) setProfessionals(pRes.data)
      setLoading(false)
    }
    init()
  }, [])

  async function openClientDetail(clientId: string) {
    const res = await getClientDetailAction(clientId)
    if (res.ok) {
      setSelectedClientDetail(res.data)
    } else {
      alert(res.error)
    }
  }

  const filteredClients = clients.filter(
    (c) =>
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      c.telefonoE164.includes(search)
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F3EAF0] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1618]">Ficha de Clientas</h1>
          <p className="text-xs text-[#6B6268]">Base de datos, métricas calculadas e historial cronológico</p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#F3EAF0] bg-white text-[#1A1618] text-xs font-semibold hover:bg-[#F3EAF0]"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Agenda</span>
          </Link>
          <Link
            href="/admin/catalogo"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#F3EAF0] bg-white text-[#1A1618] text-xs font-semibold hover:bg-[#F3EAF0]"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Catálogo</span>
          </Link>
          <Link
            href="/admin/profesionales"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#F3EAF0] bg-white text-[#1A1618] text-xs font-semibold hover:bg-[#F3EAF0]"
          >
            <Users className="h-3.5 w-3.5" />
            <span>Equipo</span>
          </Link>
          <Link
            href="/admin/clientas"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7B4B6E] text-white text-xs font-semibold"
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Clientas</span>
          </Link>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400 stroke-[1.5]" />
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-[#F3EAF0] pl-10 pr-4 py-2.5 text-xs focus:border-[#7B4B6E] focus:outline-none bg-white"
        />
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#6B6268]">Cargando clientas...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((cli) => (
            <div
              key={cli.id}
              onClick={() => openClientDetail(cli.id)}
              className="p-4 rounded-xl border border-[#F3EAF0] bg-white hover:border-[#7B4B6E]/40 cursor-pointer transition-all flex items-center justify-between shadow-xs"
            >
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-[#1A1618]">{cli.nombre}</h3>
                <p className="text-xs text-[#6B6268] flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {cli.telefonoE164}
                </p>
                {cli.notas && <p className="text-[11px] text-[#7B4B6E] truncate max-w-[200px]">{cli.notas}</p>}
              </div>

              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          ))}
        </div>
      )}

      {/* Client Detail Drawer / Modal */}
      {selectedClientDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 space-y-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#F3EAF0] pb-3">
              <div>
                <h3 className="font-bold text-lg text-[#1A1618]">{selectedClientDetail.client.nombre}</h3>
                <p className="text-xs text-[#6B6268]">{selectedClientDetail.client.telefonoE164}</p>
              </div>
              <button onClick={() => setSelectedClientDetail(null)} className="p-1 rounded text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Calculated Metrics Cards (CERO INVENTADAS) */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-[#F3EAF0] bg-[#FAF8F9] text-center space-y-0.5">
                <span className="text-[11px] text-[#6B6268] block">Total Citas</span>
                <span className="text-lg font-bold text-[#1A1618]">{selectedClientDetail.totalAppointments}</span>
              </div>

              <div className="p-3 rounded-xl border border-[#F3EAF0] bg-[#FAF8F9] text-center space-y-0.5">
                <span className="text-[11px] text-[#6B6268] block">Ticket Total Real</span>
                <span className="text-sm font-bold text-[#7B4B6E]">
                  {formatCurrencyFromCents(selectedClientDetail.totalSpentCentavos)}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-[#F3EAF0] bg-[#FAF8F9] text-center space-y-0.5">
                <span className="text-[11px] text-[#6B6268] block">No-Shows</span>
                <span className={`text-lg font-bold ${selectedClientDetail.noShowCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {selectedClientDetail.noShowCount}
                </span>
              </div>
            </div>

            {/* Chronological History */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-[#1A1618]">Historial de Citas</h4>

              {selectedClientDetail.appointments.length > 0 ? (
                <div className="space-y-3">
                  {selectedClientDetail.appointments.map((appt) => {
                    const svc = services.find((s) => s.id === appt.serviceId)
                    const prof = professionals.find((p) => p.id === appt.professionalId)
                    const dateStr = new Date(appt.inicioUtc).toLocaleDateString('es-CO', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })

                    return (
                      <div key={appt.id} className="p-3.5 rounded-xl border border-[#F3EAF0] bg-white space-y-2 text-xs">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-[#1A1618]">{svc?.nombre || 'Servicio'}</span>
                          <span className="text-[#7B4B6E]">{formatCurrencyFromCents(appt.precioCentavos)}</span>
                        </div>

                        <div className="flex items-center justify-between text-[#6B6268]">
                          <span>{dateStr} · {prof?.nombre || 'Profesional'}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              appt.estado === 'completada'
                                ? 'bg-emerald-100 text-emerald-800'
                                : appt.estado === 'confirmada'
                                ? 'bg-blue-100 text-blue-800'
                                : appt.estado === 'no_asistio'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {appt.estado}
                          </span>
                        </div>

                        {/* Audit log entries */}
                        {appt.historial && appt.historial.length > 0 && (
                          <div className="pt-1 border-t border-gray-100 space-y-1 text-[11px] text-[#6B6268]">
                            {appt.historial.map((h, i) => (
                              <p key={i}>
                                • <strong>{h.estado}</strong> ({new Date(h.fechaUtc).toLocaleDateString('es-CO')}): {h.nota}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-[#6B6268]">Sin citas registradas aún.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
