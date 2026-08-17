'use client'

import * as React from 'react'
import Image from 'next/image'
import { Pencil, Clock, Check, Sparkles, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { 
  getProfessionalsAction, 
  updateProfessionalAction, 
  createProfessionalAction 
} from '@/actions/profesionales'
import { getCategoriesAction, getServicesAction } from '@/actions/catalogo'
import { categoryLook, cleanCategoryName, getProfessionalAvatar } from '@/lib/catalogo-ui'
import { cn } from '@/lib/utils'
import { AdminHeader } from '@/components/layout/AdminShell'
import { Button } from '@/components/ui/button'
import { Surface } from '@/components/ui/surface'
import { Badge } from '@/components/ui/badge'
import { Field, Toggle } from '@/components/ui/field'
import { RightDrawer } from '@/components/ui/drawer'
import { Skeleton } from '@/components/ui/skeleton'
import { RevealGroup, RevealItem } from '@/components/common/Reveal'
import type { Category, Professional, ProfessionalSchedule, Service } from '@/types'

const DIAS: Array<{ n: number; largo: string; corto: string }> = [
  { n: 1, largo: 'Lunes', corto: 'Lun' },
  { n: 2, largo: 'Martes', corto: 'Mar' },
  { n: 3, largo: 'Miércoles', corto: 'Mié' },
  { n: 4, largo: 'Jueves', corto: 'Jue' },
  { n: 5, largo: 'Viernes', corto: 'Vie' },
  { n: 6, largo: 'Sábado', corto: 'Sáb' },
]

export default function AdminProfesionalesPage() {
  const [equipo, setEquipo] = React.useState<Professional[]>([])
  const [servicios, setServicios] = React.useState<Service[]>([])
  const [categorias, setCategorias] = React.useState<Category[]>([])
  const [cargando, setCargando] = React.useState(true)

  // Drawer state
  const [drawerAbierto, setDrawerAbierto] = React.useState(false)
  const [editando, setEditando] = React.useState<Professional | null>(null)
  
  // Form fields
  const [nombre, setNombre] = React.useState('')
  const [cargo, setCargo] = React.useState('')
  const [serviceIds, setServiceIds] = React.useState<string[]>([])
  const [horario, setHorario] = React.useState<ProfessionalSchedule>({})
  const [activo, setActivo] = React.useState(true)
  const [guardando, setGuardando] = React.useState(false)

  const cargar = React.useCallback(async () => {
    const [p, s, c] = await Promise.all([
      getProfessionalsAction(),
      getServicesAction(),
      getCategoriesAction(),
    ])
    if (p.ok) setEquipo(p.data)
    if (s.ok) setServicios(s.data)
    if (c.ok) setCategorias(c.data)
    setCargando(false)
  }, [])

  React.useEffect(() => {
    cargar()
  }, [cargar])

  function abrirNuevo() {
    setEditando(null)
    setNombre('')
    setCargo('')
    setServiceIds([])
    const standard: ProfessionalSchedule = {}
    for (let i = 1; i <= 6; i++) standard[i] = [9, 18]
    setHorario(standard)
    setActivo(true)
    setDrawerAbierto(true)
  }

  function abrirEditar(prof: Professional) {
    setEditando(prof)
    setNombre(prof.nombre)
    setCargo(prof.cargo)
    setServiceIds(prof.serviceIds ?? [])
    setHorario(prof.horario ?? {})
    setActivo(prof.activo)
    setDrawerAbierto(true)
  }

  function alternarDia(dia: number) {
    setHorario((prev) => {
      const next = { ...prev }
      if (next[dia]) delete next[dia]
      else next[dia] = [9, 18]
      return next
    })
  }

  function cambiarHora(dia: number, indice: 0 | 1, valor: number) {
    setHorario((prev) => {
      const actual = prev[dia] ?? [9, 18]
      const next: [number, number] = [...actual] as [number, number]
      next[indice] = valor
      return { ...prev, [dia]: next }
    })
  }

  function aplicarHorarioEstandar(tipo: 'lun_sab' | 'lun_vie') {
    const nuevo: ProfessionalSchedule = {}
    const maxDia = tipo === 'lun_sab' ? 6 : 5
    for (let i = 1; i <= maxDia; i++) {
      nuevo[i] = [9, 18]
    }
    setHorario(nuevo)
    toast.success(`Horario 9:00–18:00 aplicado (${tipo === 'lun_sab' ? 'Lun–Sáb' : 'Lun–Vie'})`)
  }

  function alternarServicio(serviceId: string) {
    setServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    )
  }

  function toggleCategoriaServicios(catId: string, svcsCat: Service[]) {
    const svcsIds = svcsCat.map((s) => s.id)
    const todosSeleccionados = svcsIds.every((id) => serviceIds.includes(id))

    if (todosSeleccionados) {
      setServiceIds((prev) => prev.filter((id) => !svcsIds.includes(id)))
    } else {
      setServiceIds((prev) => Array.from(new Set([...prev, ...svcsIds])))
    }
  }

  async function guardar() {
    if (nombre.trim().length < 2) {
      toast.error('El nombre de la profesional es obligatorio')
      return
    }

    const invertido = Object.entries(horario).find(([, [inicio, fin]]) => fin <= inicio)
    if (invertido) {
      const dia = DIAS.find((d) => d.n === Number(invertido[0]))
      toast.error(`La salida del ${dia?.largo.toLowerCase()} debe ser posterior a la hora de entrada`)
      return
    }

    setGuardando(true)

    if (editando) {
      const res = await updateProfessionalAction({
        id: editando.id,
        nombre: nombre.trim(),
        cargo: cargo.trim(),
        serviceIds,
        horario,
        activo,
      })
      setGuardando(false)

      if (res.ok) {
        toast.success('Profesional actualizada con éxito')
        setDrawerAbierto(false)
        cargar()
      } else {
        toast.error(res.error)
      }
    } else {
      const res = await createProfessionalAction({
        nombre: nombre.trim(),
        cargo: cargo.trim() || 'Especialista de belleza',
        serviceIds,
        horario,
        activo,
      })
      setGuardando(false)

      if (res.ok) {
        toast.success('Profesional agregada al equipo', {
          description: 'Ya puede recibir citas y gestionar servicios.',
        })
        setDrawerAbierto(false)
        cargar()
      } else {
        toast.error(res.error)
      }
    }
  }

  return (
    <>
      <AdminHeader
        title="Equipo de Profesionales"
        subtitle="Gestiona el talento del estudio, horarios semanales y habilidades multicategoría."
      >
        <Button variant="primary" size="md" onClick={abrirNuevo}>
          <UserPlus className="h-4 w-4" />
          Nueva profesional
        </Button>
      </AdminHeader>

      {cargando ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : (
        <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {equipo.map((prof) => {
            const diasActivos = Object.keys(prof.horario ?? {})
              .map((d) => DIAS.find((item) => item.n === Number(d))?.corto)
              .filter(Boolean)

            const avatar = getProfessionalAvatar(prof)
            
            const categoriasCubiertas = categorias.filter((c) =>
              servicios.some((s) => s.categoryId === c.id && (prof.serviceIds ?? []).includes(s.id))
            )

            return (
              <RevealItem key={prof.id} variant="pop">
                <Surface
                  pad="md"
                  radius="lg"
                  className={cn(
                    'flex h-full flex-col justify-between transition-all group hover:shadow-[var(--shadow-malva)]',
                    !prof.activo && 'opacity-60'
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-malva-200 shadow-sm">
                          {avatar ? (
                            <Image
                              src={avatar}
                              alt={prof.nombre}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          ) : (
                            <span className="grid h-full w-full place-items-center bg-gradient-to-br from-malva-500 to-malva-700 font-display text-xl font-semibold text-white">
                              {prof.nombre.charAt(0)}
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="font-display text-[17px] font-semibold text-ink-900 leading-snug">
                            {prof.nombre}
                          </h3>
                          <p className="text-[13px] text-ink-500">{prof.cargo}</p>
                        </div>
                      </div>

                      <Badge tone={prof.activo ? 'success' : 'neutral'} size="sm">
                        {prof.activo ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {categoriasCubiertas.map((cat) => (
                        <span
                          key={cat.id}
                          className="inline-flex items-center gap-1 rounded-md bg-malva-50 border border-malva-100 px-2 py-0.5 text-[11px] font-medium text-malva-700"
                        >
                          <Sparkles className="h-2.5 w-2.5" />
                          {cleanCategoryName(cat.nombre)}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3.5 space-y-1.5 border-t border-malva-100 pt-3 text-[12.5px] text-ink-500">
                      <p className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-malva-500 shrink-0" />
                        <span>
                          {diasActivos.length > 0
                            ? diasActivos.join(', ')
                            : 'Sin horario asignado'}
                        </span>
                      </p>
                      <p className="text-ink-400">
                        {(prof.serviceIds ?? []).length} servicios habilitados en su perfil
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-2">
                    <Button
                      variant="soft"
                      size="sm"
                      full
                      onClick={() => abrirEditar(prof)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar datos y servicios
                    </Button>
                  </div>
                </Surface>
              </RevealItem>
            )
          })}
        </RevealGroup>
      )}

      {/* ===================================================================
          RIGHT DRAWER: CREAR / EDITAR PROFESIONAL (CERO SCROLL)
          =================================================================== */}
      <RightDrawer
        open={drawerAbierto}
        onOpenChange={setDrawerAbierto}
        size="lg"
        title={editando ? `Editar a ${editando.nombre}` : 'Nueva profesional'}
        description="Configura sus datos de contacto, especialidades integrales y horario de atención."
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="glass"
              size="md"
              onClick={() => setDrawerAbierto(false)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={guardando}
              onClick={guardar}
            >
              {editando ? 'Guardar cambios' : 'Crear profesional'}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Bloque 1: Datos Personales */}
          <div className="space-y-3.5">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-malva-700">
              1. Información básica
            </h3>
            
            <Field
              label="Nombre completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Laura Morales"
            />

            <Field
              label="Cargo o título"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="Ej. Manicurista sénior y Maquilladora"
            />

            <Toggle
              label="Profesional disponible"
              description="Si se desactiva, no aparecerá en el flujo de reservas ni en la agenda."
              checked={activo}
              onChange={setActivo}
            />
          </div>

          {/* Bloque 2: Servicios Multicategoría (Integral) */}
          <div className="space-y-3.5 border-t border-malva-100 pt-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-malva-700">
                  2. Servicios que puede prestar
                </h3>
                <p className="text-[12.5px] text-ink-500">
                  Selecciona los servicios que domina ({serviceIds.length} seleccionados).
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {categorias.map((cat) => {
                const svcsCat = servicios.filter((s) => s.categoryId === cat.id && s.activo)
                if (svcsCat.length === 0) return null

                const look = categoryLook(cat.id)
                const Icon = look.icon
                const svcsIds = svcsCat.map((s) => s.id)
                const todos = svcsIds.every((id) => serviceIds.includes(id))

                return (
                  <div
                    key={cat.id}
                    className="rounded-xl border border-malva-100 bg-malva-50/30 p-3.5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn('grid h-7 w-7 place-items-center rounded-lg text-xs', look.tile)}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="font-display text-[15px] font-semibold text-ink-900">
                          {cleanCategoryName(cat.nombre)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleCategoriaServicios(cat.id, svcsCat)}
                        className="text-[12px] font-semibold text-malva-600 hover:text-malva-800 transition-colors"
                      >
                        {todos ? 'Desmarcar todos' : 'Marcar todos'}
                      </button>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {svcsCat.map((s) => {
                        const marcado = serviceIds.includes(s.id)

                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => alternarServicio(s.id)}
                            className={cn(
                              'flex items-center justify-between gap-2 rounded-lg border p-2.5 text-left text-[13px] transition-all touch-target',
                              marcado
                                ? 'border-malva-500 bg-white text-ink-900 shadow-sm ring-1 ring-malva-500'
                                : 'border-malva-200/60 bg-white/70 text-ink-600 hover:bg-white hover:border-malva-300'
                            )}
                          >
                            <span className="truncate font-medium">{s.nombre}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[11px] text-ink-400">
                                {s.duracionMin}m
                              </span>
                              <div
                                className={cn(
                                  'grid h-4 w-4 place-items-center rounded border transition-colors',
                                  marcado
                                    ? 'border-malva-600 bg-malva-600 text-white'
                                    : 'border-ink-300 bg-white'
                                )}
                              >
                                {marcado && <Check className="h-3 w-3" strokeWidth={3} />}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bloque 3: Horario Semanal */}
          <div className="space-y-3.5 border-t border-malva-100 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-malva-700">
                  3. Horario de atención
                </h3>
                <p className="text-[12.5px] text-ink-500">
                  Define qué días trabaja y sus horas de inicio y fin.
                </p>
              </div>

              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => aplicarHorarioEstandar('lun_sab')}
                  className="rounded-md bg-malva-100 px-2 py-1 text-[11px] font-medium text-malva-800 hover:bg-malva-200 transition-colors"
                >
                  Lun–Sáb (9–18)
                </button>
                <button
                  type="button"
                  onClick={() => aplicarHorarioEstandar('lun_vie')}
                  className="rounded-md bg-malva-100 px-2 py-1 text-[11px] font-medium text-malva-800 hover:bg-malva-200 transition-colors"
                >
                  Lun–Vie (9–18)
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {DIAS.map((d) => {
                const activoDia = Boolean(horario[d.n])
                const [inicio, fin] = horario[d.n] ?? [9, 18]

                return (
                  <div
                    key={d.n}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors',
                      activoDia
                        ? 'border-malva-200 bg-white'
                        : 'border-ink-100 bg-ink-50/60 opacity-60'
                    )}
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={activoDia}
                        onChange={() => alternarDia(d.n)}
                        className="h-4 w-4 rounded border-ink-300 text-malva-600 focus:ring-malva-500"
                      />
                      <span className="text-[14px] font-semibold text-ink-900">
                        {d.largo}
                      </span>
                    </label>

                    {activoDia ? (
                      <div className="flex items-center gap-2 text-[13px]">
                        <select
                          value={inicio}
                          onChange={(e) => cambiarHora(d.n, 0, Number(e.target.value))}
                          className="rounded-md border border-malva-200 bg-white px-2 py-1 font-medium text-ink-900 shadow-sm"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 8).map((h) => (
                            <option key={h} value={h}>
                              {`${String(h).padStart(2, '0')}:00`}
                            </option>
                          ))}
                        </select>
                        <span className="text-ink-400">a</span>
                        <select
                          value={fin}
                          onChange={(e) => cambiarHora(d.n, 1, Number(e.target.value))}
                          className="rounded-md border border-malva-200 bg-white px-2 py-1 font-medium text-ink-900 shadow-sm"
                        >
                          {Array.from({ length: 14 }, (_, i) => i + 9).map((h) => (
                            <option key={h} value={h}>
                              {`${String(h).padStart(2, '0')}:00`}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="text-[12px] text-ink-400">Día libre / No atiende</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </RightDrawer>
    </>
  )
}
