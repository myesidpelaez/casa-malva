'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  Calendar,
  Users,
  UserCheck,
  Edit2,
  X,
} from 'lucide-react'
import { getCategoriesAction, getServicesAction, upsertServiceAction } from '@/actions/catalogo'
import { formatCurrencyFromCents, toCents, fromCents } from '@/lib/currency'
import type { Category, Service } from '@/types'

export default function AdminCatalogoPage() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [categories, setCategories] = React.useState<Category[]>([])
  const [services, setServices] = React.useState<Service[]>([])

  // Edit Modal State
  const [editingService, setEditingService] = React.useState<Service | null>(null)
  const [nombre, setNombre] = React.useState('')
  const [duracionMin, setDuracionMin] = React.useState(40)
  const [bufferMin, setBufferMin] = React.useState(10)
  const [precioCop, setPrecioCop] = React.useState(30000)
  const [activo, setActivo] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  // Auth Guard
  React.useEffect(() => {
    const isAuth = localStorage.getItem('casa_malva_admin_session')
    if (!isAuth) router.push('/admin/login')
  }, [router])

  const refreshData = React.useCallback(async () => {
    const [cRes, sRes] = await Promise.all([getCategoriesAction(), getServicesAction()])
    if (cRes.ok) setCategories(cRes.data)
    if (sRes.ok) setServices(sRes.data)
  }, [])

  React.useEffect(() => {
    async function init() {
      const [cRes, sRes] = await Promise.all([getCategoriesAction(), getServicesAction()])
      if (cRes.ok) setCategories(cRes.data)
      if (sRes.ok) setServices(sRes.data)
      setLoading(false)
    }
    init()
  }, [])

  function openEdit(svc: Service) {
    setEditingService(svc)
    setNombre(svc.nombre)
    setDuracionMin(svc.duracionMin)
    setBufferMin(svc.bufferMin)
    setPrecioCop(fromCents(svc.precioCentavos))
    setActivo(svc.activo)
  }

  async function handleSaveService(e: React.FormEvent) {
    e.preventDefault()
    if (!editingService) return

    setSaving(true)
    const precioCentavos = toCents(precioCop)
    const res = await upsertServiceAction({
      id: editingService.id,
      categoryId: editingService.categoryId,
      nombre,
      duracionMin,
      bufferMin,
      precioCentavos,
      requiereConfirmacion: precioCentavos > 20000000,
      activo,
    })

    setSaving(false)
    if (res.ok) {
      setEditingService(null)
      refreshData()
    } else {
      alert(res.error)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F3EAF0] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1618]">Gestión del Catálogo</h1>
          <p className="text-xs text-[#6B6268]">Configuración de precios, duraciones y estado de servicios</p>
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7B4B6E] text-white text-xs font-semibold"
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
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#6B6268]">Cargando catálogo...</div>
      ) : (
        <div className="space-y-8">
          {categories.map((cat) => {
            const catServices = services.filter((s) => s.categoryId === cat.id)

            return (
              <div key={cat.id} className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#F3EAF0] pb-2">
                  <h2 className="text-lg font-bold text-[#1A1618]">{cat.nombre}</h2>
                  <span className="text-xs text-[#6B6268]">{catServices.length} servicios</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catServices.map((svc) => (
                    <div
                      key={svc.id}
                      className={`p-4 rounded-xl border bg-white flex flex-col justify-between space-y-3 transition-all ${
                        !svc.activo ? 'opacity-60 border-gray-200 bg-gray-50' : 'border-[#F3EAF0] hover:border-[#7B4B6E]/30'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-sm text-[#1A1618]">{svc.nombre}</h3>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              svc.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {svc.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>

                        <p className="text-base font-bold text-[#7B4B6E]">
                          {formatCurrencyFromCents(svc.precioCentavos)}
                        </p>

                        <div className="flex gap-3 text-xs text-[#6B6268] pt-1">
                          <span>⏱️ {svc.duracionMin} min</span>
                          <span>Buffer: {svc.bufferMin} min</span>
                        </div>
                      </div>

                      <button
                        onClick={() => openEdit(svc)}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#7B4B6E] bg-white py-2 text-xs font-semibold text-[#7B4B6E] hover:bg-[#F3EAF0] transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Editar Servicio</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#F3EAF0] pb-3">
              <h3 className="font-bold text-base text-[#1A1618]">Editar Servicio</h3>
              <button onClick={() => setEditingService(null)} className="p-1 rounded text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#1A1618]">Nombre del Servicio</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full rounded-lg border border-[#F3EAF0] px-3 py-2 text-sm focus:border-[#7B4B6E] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#1A1618]">Duración (Minutos)</label>
                  <input
                    type="number"
                    required
                    min={10}
                    step={5}
                    value={duracionMin}
                    onChange={(e) => setDuracionMin(parseInt(e.target.value, 10))}
                    className="w-full rounded-lg border border-[#F3EAF0] px-3 py-2 text-sm focus:border-[#7B4B6E] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#1A1618]">Buffer (Minutos)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={5}
                    value={bufferMin}
                    onChange={(e) => setBufferMin(parseInt(e.target.value, 10))}
                    className="w-full rounded-lg border border-[#F3EAF0] px-3 py-2 text-sm focus:border-[#7B4B6E] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#1A1618]">Precio (COP)</label>
                <input
                  type="number"
                  required
                  min={0}
                  step={1000}
                  value={precioCop}
                  onChange={(e) => setPrecioCop(parseInt(e.target.value, 10))}
                  className="w-full rounded-lg border border-[#F3EAF0] px-3 py-2 text-sm focus:border-[#7B4B6E] focus:outline-none"
                />
                <p className="text-[11px] text-[#6B6268]">
                  Precio formateado: <strong>{formatCurrencyFromCents(toCents(precioCop))}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#7B4B6E]"
                />
                <label htmlFor="activo" className="font-semibold text-[#1A1618]">
                  Servicio Activo en Catálogo
                </label>
              </div>

              <div className="pt-3 border-t border-[#F3EAF0] flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
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
