'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  LogOut,
  BookOpen,
  Users,
  UserCheck,
} from 'lucide-react'
import { getServicesAction } from '@/actions/catalogo'
import { getProfessionalsAction } from '@/actions/profesionales'
import { getClientsAction } from '@/actions/clientes'
import {
  getCitasAction,
  confirmarCitaAction,
  cancelarCitaAction,
  marcarCompletadaAction,
  marcarNoAsistioAction,
} from '@/actions/citas'
import { logoutAction, sesionActualAction } from '@/actions/auth'
import { formatCurrencyFromCents } from '@/lib/currency'
import type { Appointment, Professional, Service, Client } from '@/types'

export default function AdminPage() {
  const router = useRouter()
  const [authed, setAuthed] = React.useState(false)

  // Selected Date state
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date())

  // Data state
  const [appointments, setAppointments] = React.useState<Appointment[]>([])
  const [services, setServices] = React.useState<Service[]>([])
  const [professionals, setProfessionals] = React.useState<Professional[]>([])
  const [clients, setClients] = React.useState<Client[]>([])
  const [loading, setLoading] = React.useState(true)

  // Auth Guard
  React.useEffect(() => {
    async function checkAuth() {
      const res = await sesionActualAction()
      if (!res.ok || !res.data) {
        const isAuth = localStorage.getItem('casa_malva_admin_session')
        if (!isAuth) {
          router.push('/admin/login')
          return
        }
      }
      setAuthed(true)
    }
    checkAuth()
  }, [router])

  // Initial load for catalogs & professionals & clients
  React.useEffect(() => {
    async function loadMasterData() {
      const [sRes, pRes, cRes] = await Promise.all([
        getServicesAction(),
        getProfessionalsAction(),
        getClientsAction(),
      ])
      if (sRes.ok) setServices(sRes.data)
      if (pRes.ok) setProfessionals(pRes.data)
      if (cRes.ok) setClients(cRes.data)
      setLoading(false)
    }
    loadMasterData()
  }, [])

  // Poll appointments every 3 seconds so mobile bookings show up under 5 seconds
  React.useEffect(() => {
    async function fetchAppts() {
      const res = await getCitasAction()
      if (res.ok) {
        setAppointments(res.data)
      }
    }
    fetchAppts()
    const interval = setInterval(fetchAppts, 3000)
    return () => clearInterval(interval)
  }, [])

  // Filter appointments for selected day
  const dayAppointments = React.useMemo(() => {
    const dayStart = new Date(selectedDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    return appointments
      .filter((a) => {
        const d = new Date(a.inicioUtc)
        return d >= dayStart && d < dayEnd
      })
      .sort((a, b) => new Date(a.inicioUtc).getTime() - new Date(b.inicioUtc).getTime())
  }, [appointments, selectedDate])

  // Handlers for Appointment Actions
  async function refreshAppointments() {
    const res = await getCitasAction()
    if (res.ok) setAppointments(res.data)
  }

  async function handleConfirm(id: string) {
    const res = await confirmarCitaAction(id)
    if (!res.ok) alert(res.error)
    else refreshAppointments()
  }

  async function handleComplete(id: string) {
    const res = await marcarCompletadaAction(id)
    if (!res.ok) alert(res.error)
    else refreshAppointments()
  }

  async function handleNoShow(id: string) {
    const res = await marcarNoAsistioAction(id)
    if (!res.ok) alert(res.error)
    else refreshAppointments()
  }

  async function handleCancel(id: string) {
    const motivo = prompt('Motivo de la cancelación:') || 'Cancelada por admin'
    const res = await cancelarCitaAction(id, motivo, 'admin')
    if (!res.ok) alert(res.error)
    else refreshAppointments()
  }

  async function handleLogout() {
    await logoutAction()
    localStorage.removeItem('casa_malva_admin_session')
    router.push('/admin/login')
  }

  if (!authed) return null

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">
      {/* Top Header & Sub-navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F3EAF0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-[#7B4B6E]">En línea · SQLite Local</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1A1618]">Agenda del Día</h1>
        </div>

        {/* Module Nav Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7B4B6E] text-white text-xs font-semibold"
          >
            <CalendarIcon className="h-3.5 w-3.5" />
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#F3EAF0] bg-white text-[#1A1618] text-xs font-semibold hover:bg-[#F3EAF0]"
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Clientas</span>
          </Link>
          <button
            onClick={handleLogout}
            title="Cerrar Sesión"
            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-rose-600 ml-2"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Date Navigator Bar */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-[#F3EAF0] bg-white shadow-sm">
        <button
          onClick={() => {
            const prev = new Date(selectedDate)
            prev.setDate(prev.getDate() - 1)
            setSelectedDate(prev)
          }}
          className="p-2 rounded-lg border border-[#F3EAF0] hover:bg-[#F3EAF0] transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-[#1A1618]" />
        </button>

        <div className="text-center">
          <h2 className="font-bold text-base text-[#1A1618]">
            {selectedDate.toLocaleDateString('es-CO', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h2>
          <span className="text-xs text-[#6B6268]">
            {dayAppointments.length} cita(s) agendada(s) hoy
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate(new Date())}
            className="px-3 py-1.5 rounded-lg border border-[#7B4B6E] text-[#7B4B6E] text-xs font-semibold hover:bg-[#F3EAF0]"
          >
            Hoy
          </button>
          <button
            onClick={() => {
              const next = new Date(selectedDate)
              next.setDate(next.getDate() + 1)
              setSelectedDate(next)
            }}
            className="p-2 rounded-lg border border-[#F3EAF0] hover:bg-[#F3EAF0] transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-[#1A1618]" />
          </button>
        </div>
      </div>

      {/* Agenda Columns / Grid by Professional */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#6B6268]">Cargando agenda del día...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {professionals.map((prof) => {
            const profAppts = dayAppointments.filter((a) => a.professionalId === prof.id)

            return (
              <div
                key={prof.id}
                className="rounded-2xl border border-[#F3EAF0] bg-white p-4 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[#F3EAF0] pb-2">
                    <div>
                      <h3 className="font-bold text-sm text-[#1A1618]">{prof.nombre}</h3>
                      <p className="text-[11px] text-[#6B6268]">{prof.rol}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#F3EAF0] text-[#7B4B6E] text-[10px] font-bold">
                      {profAppts.length} citas
                    </span>
                  </div>

                  {profAppts.length > 0 ? (
                    <div className="space-y-3">
                      {profAppts.map((appt) => {
                        const svc = services.find((s) => s.id === appt.serviceId)
                        const cli = clients.find((c) => c.id === appt.clientId)
                        const startTime = new Date(appt.inicioUtc).toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })

                        return (
                          <div
                            key={appt.id}
                            className={`p-3 rounded-xl border space-y-2 text-xs transition-all ${
                              appt.estado === 'pendiente'
                                ? 'bg-amber-50/60 border-amber-200'
                                : appt.estado === 'agendada'
                                ? 'bg-[#FAF8F9] border-[#F3EAF0]'
                                : appt.estado === 'confirmada'
                                ? 'bg-emerald-50/40 border-emerald-200'
                                : appt.estado === 'completada'
                                ? 'bg-gray-50 border-gray-200 opacity-75'
                                : 'bg-rose-50/40 border-rose-200 opacity-60'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span className="text-[#7B4B6E] flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {startTime}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider ${
                                  appt.estado === 'pendiente'
                                    ? 'bg-amber-100 text-amber-800'
                                    : appt.estado === 'agendada'
                                    ? 'bg-blue-100 text-blue-800'
                                    : appt.estado === 'confirmada'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : appt.estado === 'completada'
                                    ? 'bg-gray-200 text-gray-700'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {appt.estado}
                              </span>
                            </div>

                            <div>
                              <p className="font-bold text-[#1A1618]">{svc?.nombre || 'Servicio'}</p>
                              <p className="text-[#6B6268]">{cli?.nombre || 'Clienta'} ({cli?.telefonoE164 || ''})</p>
                              <p className="font-semibold text-[#7B4B6E] mt-0.5">
                                {formatCurrencyFromCents(appt.precioCentavos)}
                              </p>
                            </div>

                            {/* State Transition Actions */}
                            <div className="pt-2 border-t border-black/5 flex flex-wrap gap-1">
                              {(appt.estado === 'agendada' || appt.estado === 'pendiente') && (
                                <>
                                  <button
                                    onClick={() => handleConfirm(appt.id)}
                                    className="px-2 py-1 rounded bg-emerald-600 text-white font-semibold text-[10px] hover:bg-emerald-700"
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    onClick={() => handleCancel(appt.id)}
                                    className="px-2 py-1 rounded bg-rose-600 text-white font-semibold text-[10px] hover:bg-rose-700"
                                  >
                                    Cancelar
                                  </button>
                                </>
                              )}

                              {appt.estado === 'confirmada' && (
                                <>
                                  <button
                                    onClick={() => handleComplete(appt.id)}
                                    className="px-2 py-1 rounded bg-blue-600 text-white font-semibold text-[10px] hover:bg-blue-700"
                                  >
                                    Completada
                                  </button>
                                  <button
                                    onClick={() => handleNoShow(appt.id)}
                                    className="px-2 py-1 rounded bg-amber-600 text-white font-semibold text-[10px] hover:bg-amber-700"
                                  >
                                    No asistió
                                  </button>
                                  <button
                                    onClick={() => handleCancel(appt.id)}
                                    className="px-2 py-1 rounded bg-rose-600 text-white font-semibold text-[10px] hover:bg-rose-700"
                                  >
                                    Cancelar
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-[11px] text-[#6B6268] border border-dashed border-gray-200 rounded-xl">
                      Sin citas agendadas
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
