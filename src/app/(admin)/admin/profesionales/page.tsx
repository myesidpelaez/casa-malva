'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Users,
  Calendar,
  BookOpen,
  UserCheck,
  Edit2,
  X,
} from 'lucide-react'
import { getProfessionalsAction, updateProfessionalAction } from '@/actions/profesionales'
import { getServicesAction } from '@/actions/catalogo'
import type { Professional, Service, ProfessionalSchedule } from '@/types'

export default function AdminProfesionalesPage() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [professionals, setProfessionals] = React.useState<Professional[]>([])
  const [services, setServices] = React.useState<Service[]>([])

  // Edit Modal State
  const [editingProf, setEditingProf] = React.useState<Professional | null>(null)
  const [nombre, setNombre] = React.useState('')
  const [rol, setRol] = React.useState('')
  const [selectedServiceIds, setSelectedServiceIds] = React.useState<string[]>([])
  const [activo, setActivo] = React.useState(true)
  const [horario, setHorario] = React.useState<ProfessionalSchedule>({})
  const [saving, setSaving] = React.useState(false)

  // Auth Guard
  React.useEffect(() => {
    const isAuth = localStorage.getItem('casa_malva_admin_session')
    if (!isAuth) router.push('/admin/login')
  }, [router])

  const refreshData = React.useCallback(async () => {
    const [pRes, sRes] = await Promise.all([getProfessionalsAction(), getServicesAction()])
    if (pRes.ok) setProfessionals(pRes.data)
    if (sRes.ok) setServices(sRes.data)
  }, [])

  React.useEffect(() => {
    async function init() {
      const [pRes, sRes] = await Promise.all([getProfessionalsAction(), getServicesAction()])
      if (pRes.ok) setProfessionals(pRes.data)
      if (sRes.ok) setServices(sRes.data)
      setLoading(false)
    }
    init()
  }, [])

  function openEdit(prof: Professional) {
    setEditingProf(prof)
    setNombre(prof.nombre)
    setRol(prof.rol)
    setSelectedServiceIds(prof.serviceIds || [])
    setActivo(prof.activo)
    setHorario(prof.horario || { 1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18], 6: [9, 18] })
  }

  function toggleServiceId(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSaveProf(e: React.FormEvent) {
    e.preventDefault()
    if (!editingProf) return

    setSaving(true)
    const res = await updateProfessionalAction({
      id: editingProf.id,
      nombre,
      rol,
      serviceIds: selectedServiceIds,
      horario,
      activo,
    })

    setSaving(false)
    if (res.ok) {
      setEditingProf(null)
      refreshData()
    } else {
      alert(res.error)
    }
  }

  const daysLabel: Record<number, string> = {
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
    6: 'Sábado',
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F3EAF0] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1618]">Gestión del Equipo</h1>
          <p className="text-xs text-[#6B6268]">Configuración de horarios laborales y especialidades</p>
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7B4B6E] text-white text-xs font-semibold"
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
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#6B6268]">Cargando profesionales...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {professionals.map((prof) => (
            <div
              key={prof.id}
              className={`p-5 rounded-2xl border bg-white space-y-4 transition-all flex flex-col justify-between ${
                !prof.activo ? 'opacity-60 border-gray-200 bg-gray-50' : 'border-[#F3EAF0] hover:border-[#7B4B6E]/30'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7B4B6E] text-white font-bold">
                      {prof.nombre.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[#1A1618]">{prof.nombre}</h3>
                      <p className="text-xs text-[#6B6268]">{prof.rol}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      prof.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {prof.activo ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                {/* Schedule Summary */}
                <div className="space-y-1 text-xs text-[#6B6268]">
                  <span className="font-semibold text-[#1A1618] block">Horarios asignados:</span>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    {[1, 2, 3, 4, 5, 6].map((day) => {
                      const h = prof.horario?.[day]
                      return (
                        <div key={day} className="flex justify-between border-b border-gray-100 py-0.5">
                          <span>{daysLabel[day]}:</span>
                          <span className="font-semibold text-[#1A1618]">
                            {h ? `${h[0]}:00 - ${h[1]}:00` : 'Libre'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Services offered */}
                <div className="space-y-1 text-xs">
                  <span className="font-semibold text-[#1A1618] block">Servicios ({prof.serviceIds?.length || 0}):</span>
                  <div className="flex flex-wrap gap-1">
                    {prof.serviceIds?.map((sid) => {
                      const s = services.find((x) => x.id === sid)
                      return (
                        <span
                          key={sid}
                          className="px-2 py-0.5 rounded bg-[#FAF8F9] border border-[#F3EAF0] text-[10px] text-[#7B4B6E] font-medium"
                        >
                          {s?.nombre || sid}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>

              <button
                onClick={() => openEdit(prof)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#7B4B6E] bg-white py-2 text-xs font-semibold text-[#7B4B6E] hover:bg-[#F3EAF0] transition-colors"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Editar Profesional</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingProf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#F3EAF0] pb-3">
              <h3 className="font-bold text-base text-[#1A1618]">Editar Profesional</h3>
              <button onClick={() => setEditingProf(null)} className="p-1 rounded text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProf} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#1A1618]">Nombre</label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full rounded-lg border border-[#F3EAF0] px-3 py-2 text-sm focus:border-[#7B4B6E] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#1A1618]">Rol / Cargo</label>
                  <input
                    type="text"
                    required
                    value={rol}
                    onChange={(e) => setRol(e.target.value)}
                    className="w-full rounded-lg border border-[#F3EAF0] px-3 py-2 text-sm focus:border-[#7B4B6E] focus:outline-none"
                  />
                </div>
              </div>

              {/* Schedule editor per day */}
              <div className="space-y-2">
                <label className="font-semibold text-[#1A1618] block">Horarios Semanales (Entrada / Salida)</label>
                <div className="space-y-2 border rounded-xl border-[#F3EAF0] p-3 bg-[#FAF8F9]">
                  {[1, 2, 3, 4, 5, 6].map((day) => {
                    const current = horario[day]
                    return (
                      <div key={day} className="flex items-center justify-between gap-2 border-b border-gray-200/60 pb-1.5 last:border-0">
                        <span className="font-medium text-[#1A1618] w-20">{daysLabel[day]}</span>

                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 text-[11px]">
                            <span>Entrada:</span>
                            <input
                              type="number"
                              min={6}
                              max={20}
                              value={current ? current[0] : 9}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10)
                                setHorario((prev) => ({
                                  ...prev,
                                  [day]: [val, current ? current[1] : 18],
                                }))
                              }}
                              className="w-14 rounded border border-gray-300 px-1.5 py-0.5 text-xs text-center"
                            />
                            <span>:00</span>
                          </label>

                          <label className="flex items-center gap-1 text-[11px]">
                            <span>Salida:</span>
                            <input
                              type="number"
                              min={7}
                              max={22}
                              value={current ? current[1] : 18}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10)
                                setHorario((prev) => ({
                                  ...prev,
                                  [day]: [current ? current[0] : 9, val],
                                }))
                              }}
                              className="w-14 rounded border border-gray-300 px-1.5 py-0.5 text-xs text-center"
                            />
                            <span>:00</span>
                          </label>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Service Assignments */}
              <div className="space-y-2">
                <label className="font-semibold text-[#1A1618] block">Servicios Habilitados</label>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto border border-[#F3EAF0] p-2 rounded-xl bg-white">
                  {services.map((s) => {
                    const isChecked = selectedServiceIds.includes(s.id)
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                          isChecked ? 'bg-[#F3EAF0] text-[#7B4B6E] font-medium' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleServiceId(s.id)}
                          className="h-3.5 w-3.5 rounded accent-[#7B4B6E]"
                        />
                        <span className="text-[11px] truncate">{s.nombre}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activoProf"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#7B4B6E]"
                />
                <label htmlFor="activoProf" className="font-semibold text-[#1A1618]">
                  Profesional Activa para Agendamiento
                </label>
              </div>

              <div className="pt-3 border-t border-[#F3EAF0] flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProf(null)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-300 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg bg-[#7B4B6E] text-white font-semibold hover:bg-[#683d5d] disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
