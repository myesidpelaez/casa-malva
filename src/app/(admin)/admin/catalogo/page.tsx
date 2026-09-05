'use client'

import * as React from 'react'
import Image from 'next/image'
import {
  Clock,
  Info,
  Pencil,
  Plus,
  Timer,
  Users,
  AlertTriangle,
  Check,
  ChevronDown,
  Search,
  X,
  LayoutGrid,
  List,
} from 'lucide-react'
import { toast } from 'sonner'
import { getCategoriesAction, getServicesAction, upsertServiceAction } from '@/actions/catalogo'
import { getProfessionalsAction } from '@/actions/profesionales'
import { formatCurrencyFromCents, fromCents, toCents } from '@/lib/currency'
import { REGLAS_NEGOCIO } from '@/lib/reglas'
import {
  categoryLook,
  cleanCategoryName,
  humanDuration,
  servicesOf,
  getProfessionalAvatar,
  priceFrom,
} from '@/lib/catalogo-ui'
import { nombreCorto } from '@/lib/personas'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Surface } from '@/components/ui/surface'
import { Badge } from '@/components/ui/badge'
import { Field, Toggle } from '@/components/ui/field'
import { RightDrawer } from '@/components/ui/drawer'
import { Skeleton } from '@/components/ui/skeleton'
import { RevealGroup, RevealItem } from '@/components/common/Reveal'
import type { Category, Professional, Service } from '@/types'

export default function AdminCatalogoPage() {
  const [categorias, setCategorias] = React.useState<Category[]>([])
  const [servicios, setServicios] = React.useState<Service[]>([])
  const [equipo, setEquipo] = React.useState<Professional[]>([])
  const [cargando, setCargando] = React.useState(true)

  // UX Elevación: Galería Power Apps y Cero Scroll
  const [searchQuery, setSearchQuery] = React.useState('')
  const [categoriaActiva, setCategoriaActiva] = React.useState('todas')
  const [modoVista, setModoVista] = React.useState<'grid' | 'lista'>('grid')
  const [categoriasColapsadas, setCategoriasColapsadas] = React.useState<Record<string, boolean>>({})

  // Drawer state
  const [drawerAbierto, setDrawerAbierto] = React.useState(false)
  const [editando, setEditando] = React.useState<Service | null>(null)

  // Form fields
  const [form, setForm] = React.useState({
    categoryId: 'cat_unas',
    nombre: '',
    duracionMin: 40,
    bufferMin: 10,
    precioCop: 35000,
    activo: true,
    requiereConfirmacion: false,
    assignedProfessionalIds: [] as string[],
  })
  const [guardando, setGuardando] = React.useState(false)

  const cargar = React.useCallback(async () => {
    const [c, s, p] = await Promise.all([
      getCategoriesAction(),
      getServicesAction(),
      getProfessionalsAction(),
    ])
    if (c.ok) setCategorias(c.data)
    if (s.ok) setServicios(s.data)
    if (p.ok) setEquipo(p.data)
    setCargando(false)
  }, [])

  React.useEffect(() => {
    let cancelado = false
    void Promise.resolve().then(() => {
      if (!cancelado) cargar()
    })
    return () => {
      cancelado = true
    }
  }, [cargar])

  // Acordeón helpers
  function toggleColapso(catId: string) {
    setCategoriasColapsadas((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }))
  }

  function expandirTodas() {
    setCategoriasColapsadas({})
  }

  function colapsarTodas() {
    const all = Object.fromEntries(categorias.map((c) => [c.id, true]))
    setCategoriasColapsadas(all)
  }

  // Filtrado reactivo en memoria
  const queryLimpia = searchQuery.trim().toLowerCase()

  const categoriasFiltradas = React.useMemo(() => {
    const lista =
      categoriaActiva === 'todas'
        ? categorias
        : categorias.filter((c) => c.id === categoriaActiva)

    return lista
      .map((cat) => {
        const itemsDeCat = servicesOf(servicios, cat)
        const itemsFiltrados = itemsDeCat.filter((svc) => {
          if (!queryLimpia) return true
          const matchNombre = svc.nombre.toLowerCase().includes(queryLimpia)
          const profs = equipo.filter((p) => (p.serviceIds ?? []).includes(svc.id))
          const matchProf = profs.some((p) => p.nombre.toLowerCase().includes(queryLimpia))
          return matchNombre || matchProf
        })
        return {
          cat,
          items: itemsFiltrados,
          totalEnCat: itemsDeCat.length,
          minPrice: priceFrom(itemsFiltrados),
        }
      })
      .filter((grupo) => {
        if (queryLimpia) return grupo.items.length > 0
        return true
      })
  }, [categorias, servicios, equipo, categoriaActiva, queryLimpia])

  const todasColapsadas =
    categorias.length > 0 && categorias.every((c) => categoriasColapsadas[c.id])

  function abrirNuevo(categoryId?: string) {
    setEditando(null)
    const targetCatId =
      categoryId ||
      (categoriaActiva !== 'todas' ? categoriaActiva : categorias[0]?.id) ||
      'cat_unas'

    const svcsDeEstaCat = servicios.filter((s) => s.categoryId === targetCatId).map((s) => s.id)
    const profsDeEstaCat = equipo
      .filter((p) => (p.serviceIds ?? []).some((id) => svcsDeEstaCat.includes(id)))
      .map((p) => p.id)

    setForm({
      categoryId: targetCatId,
      nombre: '',
      duracionMin: 30,
      bufferMin: 10,
      precioCop: 25000,
      activo: true,
      requiereConfirmacion: false,
      assignedProfessionalIds:
        profsDeEstaCat.length > 0 ? profsDeEstaCat : equipo.map((p) => p.id),
    })
    setDrawerAbierto(true)
  }

  function abrirEditar(svc: Service) {
    setEditando(svc)

    const profsConEsteServicio = equipo
      .filter((p) => (p.serviceIds ?? []).includes(svc.id))
      .map((p) => p.id)

    setForm({
      categoryId: svc.categoryId,
      nombre: svc.nombre,
      duracionMin: svc.duracionMin,
      bufferMin: svc.bufferMin,
      precioCop: fromCents(svc.precioCentavos),
      activo: svc.activo,
      requiereConfirmacion: svc.requiereConfirmacion,
      assignedProfessionalIds: profsConEsteServicio,
    })
    setDrawerAbierto(true)
  }

  function alternarProfesional(profId: string) {
    setForm((prev) => {
      const exists = prev.assignedProfessionalIds.includes(profId)
      return {
        ...prev,
        assignedProfessionalIds: exists
          ? prev.assignedProfessionalIds.filter((id) => id !== profId)
          : [...prev.assignedProfessionalIds, profId],
      }
    })
  }

  function asignarTodoElEquipo() {
    setForm((prev) => ({
      ...prev,
      assignedProfessionalIds: equipo.map((p) => p.id),
    }))
    toast.success('Servicio asignado a todo el equipo')
  }

  function asignarEspecialistasCategoria() {
    const svcsDeEstaCat = servicios.filter((s) => s.categoryId === form.categoryId).map((s) => s.id)
    const profsDeEstaCat = equipo
      .filter((p) => (p.serviceIds ?? []).some((id) => svcsDeEstaCat.includes(id)))
      .map((p) => p.id)

    setForm((prev) => ({
      ...prev,
      assignedProfessionalIds: profsDeEstaCat,
    }))
    toast.success('Asignado a las especialistas de esta categoría')
  }

  function desmarcarTodas() {
    setForm((prev) => ({
      ...prev,
      assignedProfessionalIds: [],
    }))
  }

  async function guardar() {
    if (form.nombre.trim().length < 3) {
      toast.error('El nombre del servicio debe tener al menos 3 caracteres')
      return
    }

    setGuardando(true)
    const precioCentavos = toCents(form.precioCop)

    const res = await upsertServiceAction({
      id: editando?.id,
      categoryId: form.categoryId,
      nombre: form.nombre.trim(),
      duracionMin: form.duracionMin,
      bufferMin: form.bufferMin,
      precioCentavos,
      requiereConfirmacion:
        form.requiereConfirmacion || precioCentavos > REGLAS_NEGOCIO.umbralConfirmacionCentavos,
      activo: form.activo,
      assignedProfessionalIds: form.assignedProfessionalIds,
    })
    setGuardando(false)

    if (res.ok) {
      toast.success(editando ? 'Servicio actualizado' : 'Servicio creado con éxito', {
        description: `Asignado a ${form.assignedProfessionalIds.length} profesional(es).`,
      })
      setDrawerAbierto(false)
      cargar()
    } else {
      toast.error(res.error)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* =========================================================================
          ZONA FIJA SUPERIOR (~20-25%): Cabecera y Barra de Control Cero Scroll
         ========================================================================= */}
      <div className="shrink-0 space-y-3 pb-3">
        <header className="flex flex-col gap-2 border-b border-ink-100 dark:border-ink-200/40 pb-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl font-semibold leading-tight text-ink-900">
              Catálogo de Servicios
            </h1>
            <p className="text-xs sm:text-sm text-ink-500 truncate">
              Precios, duraciones en silla y asignación directa de profesionales.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => abrirNuevo()}
            className="w-full sm:w-auto shrink-0 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo servicio</span>
          </Button>
        </header>

        {/* Barra de control con contraste de accesibilidad en Dark Mode */}
        <Surface
          material="glass"
          pad="sm"
          radius="xl"
          className="p-2.5 sm:p-3 space-y-2.5 shadow-xs border border-ink-200/80 dark:border-ink-200/40"
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            {/* Campo de búsqueda interactivo */}
            <div className="relative flex-1 min-w-48 sm:min-w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 dark:text-ink-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por servicio o profesional..."
                className="w-full bg-[var(--card)] text-ink-900 border border-ink-200/80 dark:border-ink-200/50 rounded-lg pl-9 pr-9 py-2 text-sm focus:outline-none focus:border-malva-500 focus:ring-1 focus:ring-malva-500 transition-colors placeholder:text-ink-400 dark:placeholder:text-ink-400 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 dark:hover:text-white p-1 rounded transition-colors"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Atajos de colapso y alternador de vista */}
            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={todasColapsadas ? expandirTodas : colapsarTodas}
                className="text-xs text-ink-600 dark:text-ink-300 hover:text-ink-900 dark:hover:text-white px-2 py-1"
              >
                {todasColapsadas ? 'Expandir todas' : 'Colapsar todas'}
              </Button>

              <div className="flex items-center rounded-lg border border-ink-200/80 dark:border-ink-200/50 bg-[var(--card)] p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setModoVista('grid')}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                    modoVista === 'grid'
                      ? 'bg-malva-600 text-white dark:bg-malva-400 dark:text-malva-950 font-semibold shadow-xs'
                      : 'text-ink-600 dark:text-ink-300 hover:text-ink-900 dark:hover:text-white'
                  )}
                  title="Vista en tarjetas amplias"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Tarjetas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModoVista('lista')}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                    modoVista === 'lista'
                      ? 'bg-malva-600 text-white dark:bg-malva-400 dark:text-malva-950 font-semibold shadow-xs'
                      : 'text-ink-600 dark:text-ink-300 hover:text-ink-900 dark:hover:text-white'
                  )}
                  title="Vista compacta Cero Scroll"
                >
                  <List className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Compacta</span>
                </button>
              </div>
            </div>
          </div>

          {/* Pestañas de categoría (Pills) con contraste perfecto */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            <button
              type="button"
              onClick={() => setCategoriaActiva('todas')}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-all shrink-0 border',
                categoriaActiva === 'todas'
                  ? 'bg-malva-700 text-white border-malva-700 dark:bg-malva-400 dark:text-malva-950 dark:border-malva-400 font-semibold shadow-xs'
                  : 'bg-[var(--card)] text-ink-700 border-ink-200/80 hover:border-malva-400 hover:text-ink-900 dark:border-ink-200/50 dark:text-ink-300 dark:hover:text-white dark:hover:border-malva-600'
              )}
            >
              <span>Todas</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-2xs font-semibold',
                  categoriaActiva === 'todas'
                    ? 'bg-white/25 text-white dark:bg-malva-950/30 dark:text-malva-950'
                    : 'bg-ink-100 text-ink-600 dark:bg-ink-100/70 dark:text-ink-300'
                )}
              >
                {servicios.length}
              </span>
            </button>

            {categorias.map((cat) => {
              const count = servicesOf(servicios, cat).length
              const activa = categoriaActiva === cat.id

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoriaActiva(cat.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-all shrink-0 border',
                    activa
                      ? 'bg-malva-700 text-white border-malva-700 dark:bg-malva-400 dark:text-malva-950 dark:border-malva-400 font-semibold shadow-xs'
                      : 'bg-[var(--card)] text-ink-700 border-ink-200/80 hover:border-malva-400 hover:text-ink-900 dark:border-ink-200/50 dark:text-ink-300 dark:hover:text-white dark:hover:border-malva-600'
                  )}
                >
                  <span>{cleanCategoryName(cat.nombre)}</span>
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-2xs font-semibold',
                      activa
                        ? 'bg-white/25 text-white dark:bg-malva-950/30 dark:text-malva-950'
                        : 'bg-ink-100 text-ink-600 dark:bg-ink-100/70 dark:text-ink-300'
                    )}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </Surface>
      </div>

      {/* =========================================================================
          ZONA DE GALERÍA CON SCROLL INTERNO (~75-80%): Categorías y Servicios
         ========================================================================= */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-2 scrollbar-slim space-y-[var(--spacing-fib-4)] pb-8">
        {cargando ? (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-[var(--radius-lg)]" />
            ))}
          </div>
        ) : categoriasFiltradas.length === 0 ? (
          <Surface material="glass" pad="lg" radius="xl" className="text-center py-12">
            <div className="mx-auto w-12 h-12 rounded-full bg-malva-100 dark:bg-malva-950/80 flex items-center justify-center text-malva-700 dark:text-malva-300 mb-3">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-semibold text-ink-900">
              No se encontraron servicios
            </h3>
            <p className="text-sm text-ink-500 mt-1 max-w-sm mx-auto">
              No hay servicios ni profesionales que coincidan con la búsqueda actual.
            </p>
            <div className="mt-4">
              <Button
                variant="soft"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setCategoriaActiva('todas')
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          </Surface>
        ) : (
          categoriasFiltradas.map(({ cat, items, minPrice }) => {
            const look = categoryLook(cat.id)
            const colapsada = !!categoriasColapsadas[cat.id]

            return (
              <section key={cat.id} className="space-y-3">
                {/* Cabecera de Categoría Elevada con Fotografía Editorial Real */}
                <div
                  onClick={() => toggleColapso(cat.id)}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border border-malva-100/80 dark:border-ink-200/40 bg-[var(--card)] hover:border-malva-300 dark:hover:border-malva-700 transition-all cursor-pointer select-none group shadow-2xs"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleColapso(cat.id)
                    }
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Miniatura Fotográfica Editorial de Alta Resolución */}
                    <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden shadow-xs border border-malva-200/70 dark:border-malva-800/60 shrink-0 bg-malva-50 dark:bg-malva-950">
                      <Image
                        src={look.image}
                        alt={cleanCategoryName(cat.nombre)}
                        fill
                        sizes="64px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-base sm:text-lg font-semibold text-ink-900 group-hover:text-malva-800 dark:group-hover:text-malva-300 transition-colors">
                          {cleanCategoryName(cat.nombre)}
                        </h2>
                        <Badge
                          tone="glass"
                          size="sm"
                          className="bg-malva-50/80 text-malva-800 dark:bg-malva-950/60 dark:text-malva-300 border-malva-200/60 dark:border-malva-800/50"
                        >
                          {items.length} {items.length === 1 ? 'servicio' : 'servicios'}
                        </Badge>
                        {minPrice !== null && (
                          <span className="text-xs font-semibold text-malva-700 dark:text-malva-400 hidden sm:inline tnum">
                            Desde {formatCurrencyFromCents(minPrice)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-400 dark:text-ink-400 hidden sm:block truncate mt-0.5 max-w-md">
                        {look.claim}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        abrirNuevo(cat.id)
                      }}
                      className="text-malva-700 dark:text-malva-400 hover:bg-malva-50 dark:hover:bg-malva-900/30 text-xs px-2.5 py-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Añadir</span>
                    </Button>

                    <div
                      className={cn(
                        'grid h-7 w-7 place-items-center rounded-full bg-malva-50/60 dark:bg-malva-950/60 border border-malva-200/50 dark:border-malva-800/50 text-ink-400 group-hover:text-malva-700 dark:group-hover:text-malva-300 transition-transform duration-200',
                        colapsada ? '-rotate-90' : 'rotate-0'
                      )}
                      aria-label={colapsada ? 'Expandir categoría' : 'Colapsar categoría'}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {!colapsada && (
                  <>
                    {modoVista === 'grid' ? (
                      <RevealGroup className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((svc) => {
                          const profsQueLoPrestan = equipo.filter((p) =>
                            (p.serviceIds ?? []).includes(svc.id)
                          )
                          const tieneProfesionales = profsQueLoPrestan.length > 0

                          return (
                            <RevealItem key={svc.id} variant="pop">
                              <Surface
                                pad="md"
                                radius="lg"
                                className={cn(
                                  'flex h-full flex-col justify-between transition-all group hover:shadow-[var(--shadow-malva)] p-4 sm:p-5',
                                  !svc.activo && 'opacity-60',
                                  !tieneProfesionales && 'border-amber-200/80 bg-amber-50/20'
                                )}
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2">
                                    <h3 className="text-sm sm:text-base font-semibold text-ink-900 group-hover:text-malva-700 dark:group-hover:text-malva-300 transition-colors leading-snug break-words">
                                      {svc.nombre}
                                    </h3>
                                    <span className="tnum font-display text-base font-semibold text-malva-700 dark:text-malva-400 shrink-0 whitespace-nowrap">
                                      {formatCurrencyFromCents(svc.precioCentavos)}
                                    </span>
                                  </div>

                                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                                    <Badge tone="glass" size="sm">
                                      <Clock className="h-3 w-3" strokeWidth={2} />
                                      {humanDuration(svc.duracionMin)}
                                    </Badge>
                                    <Badge tone="neutral" size="sm">
                                      <Timer className="h-3 w-3" strokeWidth={2} />
                                      +{svc.bufferMin}m buffer
                                    </Badge>

                                    {tieneProfesionales ? (
                                      <Badge
                                        tone="glass"
                                        size="sm"
                                        className="bg-malva-50/60 text-malva-700 dark:bg-malva-950/60 dark:text-malva-300 border-malva-200/50 dark:border-malva-800/40"
                                      >
                                        <Users className="h-3 w-3" />
                                        {profsQueLoPrestan.length} profesional
                                        {profsQueLoPrestan.length > 1 ? 'es' : ''}
                                      </Badge>
                                    ) : (
                                      <Badge
                                        tone="warning"
                                        size="sm"
                                        className="bg-amber-100/70 text-amber-800 border-amber-300"
                                      >
                                        <AlertTriangle className="h-3 w-3" />
                                        Sin profesionales
                                      </Badge>
                                    )}

                                    {svc.requiereConfirmacion && (
                                      <Badge tone="warning" size="sm">
                                        <Info className="h-3 w-3" strokeWidth={2} />
                                        WhatsApp
                                      </Badge>
                                    )}
                                    {!svc.activo && (
                                      <Badge tone="neutral" size="sm">
                                        Desactivado
                                      </Badge>
                                    )}
                                  </div>

                                  {tieneProfesionales && (
                                    <div className="mt-3 flex items-center gap-1.5 pt-2 border-t border-malva-100/60 dark:border-ink-200/40 text-xs text-ink-500">
                                      <div className="flex -space-x-1.5 overflow-hidden">
                                        {profsQueLoPrestan.slice(0, 4).map((p) => {
                                          const avatar = getProfessionalAvatar(p)
                                          return (
                                            <div
                                              key={p.id}
                                              className="relative h-5 w-5 rounded-full border border-white dark:border-ink-100 bg-malva-100 dark:bg-malva-950 overflow-hidden shadow-xs"
                                              title={p.nombre}
                                            >
                                              {avatar ? (
                                                <Image
                                                  src={avatar}
                                                  alt={p.nombre}
                                                  fill
                                                  sizes="20px"
                                                  className="object-cover"
                                                />
                                              ) : (
                                                <span className="grid h-full w-full place-items-center text-2xs font-semibold text-malva-700 dark:text-malva-300">
                                                  {p.nombre.charAt(0)}
                                                </span>
                                              )}
                                            </div>
                                          )
                                        })}
                                      </div>
                                      <span className="truncate">
                                        {profsQueLoPrestan
                                          .map((p) => nombreCorto(p.id, equipo))
                                          .join(', ')}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="mt-4 pt-2">
                                  <Button
                                    variant="soft"
                                    size="sm"
                                    full
                                    onClick={() => abrirEditar(svc)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Editar servicio y equipo
                                  </Button>
                                </div>
                              </Surface>
                            </RevealItem>
                          )
                        })}
                      </RevealGroup>
                    ) : (
                      /* VISTA COMPACTA CERO SCROLL (Solid Surface, alta densidad de información) */
                      <div className="space-y-2">
                        {items.map((svc) => {
                          const profsQueLoPrestan = equipo.filter((p) =>
                            (p.serviceIds ?? []).includes(svc.id)
                          )
                          const tieneProfesionales = profsQueLoPrestan.length > 0

                          return (
                            <Surface
                              key={svc.id}
                              material="solid"
                              pad="none"
                              radius="lg"
                              className={cn(
                                'p-3 sm:p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all hover:border-malva-300 dark:hover:border-malva-700 hover:shadow-xs group',
                                !svc.activo && 'opacity-60',
                                !tieneProfesionales && 'border-amber-200/80 bg-amber-50/20'
                              )}
                            >
                              <div className="flex items-start md:items-center gap-3 min-w-0 flex-1">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-sm font-semibold text-ink-900 group-hover:text-malva-700 dark:group-hover:text-malva-300 transition-colors">
                                      {svc.nombre}
                                    </h3>
                                    {!svc.activo && (
                                      <Badge tone="neutral" size="sm">
                                        Desactivado
                                      </Badge>
                                    )}
                                    {!tieneProfesionales && (
                                      <Badge
                                        tone="warning"
                                        size="sm"
                                        className="bg-amber-100/70 text-amber-800 border-amber-300"
                                      >
                                        <AlertTriangle className="h-3 w-3" />
                                        Sin profesionales
                                      </Badge>
                                    )}
                                    {svc.requiereConfirmacion && (
                                      <Badge tone="warning" size="sm">
                                        <Info className="h-3 w-3" strokeWidth={2} />
                                        WhatsApp
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                                    <span className="inline-flex items-center gap-1">
                                      <Clock className="h-3 w-3 text-ink-400" />
                                      {humanDuration(svc.duracionMin)}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-ink-400">
                                      <Timer className="h-3 w-3" />
                                      +{svc.bufferMin}m
                                    </span>
                                    {tieneProfesionales && (
                                      <div className="flex items-center gap-1.5 pl-2 border-l border-ink-200 dark:border-ink-200/40">
                                        <div className="flex -space-x-1 overflow-hidden">
                                          {profsQueLoPrestan.slice(0, 3).map((p) => {
                                            const avatar = getProfessionalAvatar(p)
                                            return (
                                              <div
                                                key={p.id}
                                                className="relative h-4 w-4 rounded-full border border-white dark:border-ink-100 bg-malva-100 dark:bg-malva-950 overflow-hidden shadow-xs"
                                                title={p.nombre}
                                              >
                                                {avatar ? (
                                                  <Image
                                                    src={avatar}
                                                    alt={p.nombre}
                                                    fill
                                                    sizes="16px"
                                                    className="object-cover"
                                                  />
                                                ) : (
                                                  <span className="grid h-full w-full place-items-center text-2xs font-semibold text-malva-700 dark:text-malva-300">
                                                    {p.nombre.charAt(0)}
                                                  </span>
                                                )}
                                              </div>
                                            )
                                          })}
                                        </div>
                                        <span className="truncate max-w-xs">
                                          {profsQueLoPrestan
                                            .map((p) => nombreCorto(p.id, equipo))
                                            .join(', ')}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-ink-100 dark:border-ink-200/40">
                                <span className="tnum font-display text-base font-semibold text-malva-700 dark:text-malva-400 whitespace-nowrap">
                                  {formatCurrencyFromCents(svc.precioCentavos)}
                                </span>
                                <Button
                                  variant="soft"
                                  size="sm"
                                  onClick={() => abrirEditar(svc)}
                                  className="px-2.5 py-1 text-xs"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  <span>Editar</span>
                                </Button>
                              </div>
                            </Surface>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </section>
            )
          })
        )}
      </div>

      {/* =========================================================================
          RIGHT DRAWER: CREAR / EDITAR SERVICIO (100% RESPONSIVO)
         ========================================================================= */}
      <RightDrawer
        open={drawerAbierto}
        onOpenChange={setDrawerAbierto}
        size="lg"
        title={editando ? 'Editar servicio y asignación' : 'Nuevo servicio'}
        description="Fija el precio, la duración en silla y selecciona qué profesionales pueden realizarlo."
        footer={
          <div className="flex items-center justify-end gap-2.5 sm:gap-3">
            <Button
              variant="glass"
              size="md"
              onClick={() => setDrawerAbierto(false)}
              disabled={guardando}
              className="flex-1 sm:flex-initial"
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={guardando}
              onClick={guardar}
              className="flex-1 sm:flex-initial"
            >
              {editando ? 'Guardar cambios' : 'Crear servicio'}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Bloque 1: Datos Base */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-malva-700 dark:text-malva-400">
              1. Detalles del servicio
            </h3>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-ink-700 dark:text-ink-300">
                Categoría
              </label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                className="w-full bg-[var(--glass-tint)] backdrop-blur-sm text-ink-900 border border-ink-200/80 dark:border-ink-200/50 rounded-[var(--radius-sm)] p-2.5 text-sm focus:outline-none focus:border-malva-500 focus:bg-[var(--card)]"
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {cleanCategoryName(c.nombre)}
                  </option>
                ))}
              </select>
            </div>

            <Field
              label="Nombre del servicio"
              type="text"
              value={form.nombre}
              onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej. Retoque de semipermanente"
            />

            <div>
              <Field
                label="Precio en COP"
                type="number"
                step={1000}
                min={0}
                value={form.precioCop}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, precioCop: Number(e.target.value) || 0 }))
                }
                className="tnum"
              />
              <p className="mt-1 text-xs text-ink-400">
                Equivale a {formatCurrencyFromCents(toCents(form.precioCop))} en el sitio web.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Duración en silla (min)"
                type="number"
                step={5}
                min={10}
                max={480}
                value={form.duracionMin}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, duracionMin: Number(e.target.value) || 0 }))
                }
                className="tnum"
              />

              <Field
                label="Buffer / Preparación (min)"
                type="number"
                step={5}
                min={0}
                max={60}
                value={form.bufferMin}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, bufferMin: Number(e.target.value) || 0 }))
                }
                className="tnum"
              />
            </div>

            <Toggle
              label="Servicio activo"
              description="Aparecerá en el catálogo público para agendamiento."
              checked={form.activo}
              onChange={(checked) => setForm((prev) => ({ ...prev, activo: checked }))}
            />

            <Toggle
              label="Requiere confirmación previa"
              description="Si se activa, la clienta verá que la cita queda sujeta a confirmación por WhatsApp."
              checked={form.requiereConfirmacion}
              onChange={(checked) =>
                setForm((prev) => ({ ...prev, requiereConfirmacion: checked }))
              }
            />
          </div>

          {/* Bloque 2: Asignación de Profesionales */}
          <div className="space-y-4 border-t border-malva-100 dark:border-ink-200/40 pt-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-malva-700 dark:text-malva-400">
                  2. ¿Quiénes realizan este servicio?
                </h3>
                <p className="text-xs text-ink-500">
                  {form.assignedProfessionalIds.length} de {equipo.length} profesional(es)
                  asignadas.
                </p>
              </div>

              {/* Atajos de asignación responsive */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={asignarEspecialistasCategoria}
                  className="rounded-md bg-malva-100 dark:bg-malva-950/80 px-2 py-1 text-xs font-medium text-malva-800 dark:text-malva-300 hover:bg-malva-200 dark:hover:bg-malva-900 transition-colors"
                >
                  Especialistas de categoría
                </button>
                <button
                  type="button"
                  onClick={asignarTodoElEquipo}
                  className="rounded-md bg-malva-100 dark:bg-malva-950/80 px-2 py-1 text-xs font-medium text-malva-800 dark:text-malva-300 hover:bg-malva-200 dark:hover:bg-malva-900 transition-colors"
                >
                  Todo el equipo
                </button>
                <button
                  type="button"
                  onClick={desmarcarTodas}
                  className="rounded-md bg-ink-100 dark:bg-ink-200/60 px-2 py-1 text-xs font-medium text-ink-600 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-200 transition-colors"
                >
                  Desmarcar
                </button>
              </div>
            </div>

            {form.assignedProfessionalIds.length === 0 && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Atención:</strong> Si no asignas ninguna profesional, las clientas no
                  podrán reservar este servicio en línea.
                </span>
              </div>
            )}

            <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2">
              {equipo.map((prof) => {
                const asignada = form.assignedProfessionalIds.includes(prof.id)
                const avatar = getProfessionalAvatar(prof)

                return (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => alternarProfesional(prof.id)}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-all touch-target',
                      asignada
                        ? 'border-malva-500 bg-[var(--card)] text-ink-900 shadow-sm ring-1 ring-malva-500'
                        : 'border-ink-200 dark:border-ink-200/50 bg-[var(--glass-tint)] text-ink-600 dark:text-ink-400 hover:bg-[var(--card)] hover:border-malva-300 opacity-75'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-malva-200 dark:border-malva-800 shadow-xs">
                        {avatar ? (
                          <Image
                            src={avatar}
                            alt={prof.nombre}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="grid h-full w-full place-items-center bg-malva-600 text-xs font-semibold text-white">
                            {prof.nombre.charAt(0)}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-900 leading-tight">
                          {prof.nombre}
                        </p>
                        <p className="truncate text-xs text-ink-400">{prof.cargo}</p>
                      </div>
                    </div>

                    <div
                      className={cn(
                        'grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors',
                        asignada
                          ? 'border-malva-600 bg-malva-600 text-white'
                          : 'border-ink-300 dark:border-ink-200/60 bg-[var(--card)]'
                      )}
                    >
                      {asignada && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </RightDrawer>
    </div>
  )
}
