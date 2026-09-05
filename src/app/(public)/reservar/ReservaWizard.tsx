'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Clock,
  Info,
  Mail,
  Phone,
  Sparkles,
  Sun,
  Sunset,
  TriangleAlert,
  User,
  ShieldCheck,
} from 'lucide-react'
import { crearCitaAction, franjasDelDiaAction, diasConCuposAction } from '@/actions/citas'
import { formatCurrencyFromCents } from '@/lib/currency'
import { REGLAS_NEGOCIO } from '@/lib/reglas'
import { claveDia, isSunday, startOfDay } from '@/lib/disponibilidad'
import { fechaLarga, hora as horaCorta } from '@/lib/fechas'
import {
  humanDuration,
  cleanCategoryName,
  getProfessionalAvatar,
  getServiceImage,
} from '@/lib/catalogo-ui'
import { normalizePhoneE164 } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { spring, tween } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { buttonClass } from '@/components/ui/button-variants'
import { Surface } from '@/components/ui/surface'
import { Badge, StatusPill } from '@/components/ui/badge'
import { Field } from '@/components/ui/field'
import { Stepper } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { Marca, TituloEditorial } from '@/components/brand'
import type { Appointment, Category, Professional, Service } from '@/types'

type Franja = { inicioUtc: string; professionalId: string; professionalNombre: string }

const PASOS = ['Servicio', 'Especialista', 'Fecha y hora', 'Tus datos', 'Confirmar'] as const
const DIAS_VISIBLES = 14

export function ReservaWizard({
  serviceIdInicial,
  professionalIdInicial,
  categories,
  services,
  professionals,
  estado,
}: {
  serviceIdInicial: string | null
  professionalIdInicial?: string | null
  categories: Category[]
  services: Service[]
  professionals: Professional[]
  /**
   * Píldora de «Abierto ahora», ya renderizada desde page.tsx
   */
  estado?: React.ReactNode
}) {
  // Si llega con ?serviceId, arranca directamente en el paso del profesional.
  const [paso, setPaso] = React.useState(() =>
    serviceIdInicial && services.some((s) => s.id === serviceIdInicial) ? 1 : 0
  )
  const [direccion, setDireccion] = React.useState(1)

  const [servicio, setServicio] = React.useState<Service | null>(
    () => services.find((s) => s.id === serviceIdInicial) ?? null
  )
  const [profesional, setProfesional] = React.useState<Professional | null>(
    () => professionals.find((p) => p.id === professionalIdInicial) ?? null
  )
  const [dia, setDia] = React.useState<Date>(() => startOfDay(new Date()))
  const [franja, setFranja] = React.useState<Franja | null>(null)

  const [nombre, setNombre] = React.useState('')
  const [telefono, setTelefono] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [errores, setErrores] = React.useState<Record<string, string>>({})

  const [franjas, setFranjas] = React.useState<Franja[]>([])
  const [cargandoFranjas, setCargandoFranjas] = React.useState(false)
  const [cuposPorDia, setCuposPorDia] = React.useState<Record<string, number>>({})

  const [enviando, setEnviando] = React.useState(false)
  const [errorReserva, setErrorReserva] = React.useState<string | null>(null)
  const [exito, setExito] = React.useState<Appointment | null>(null)

  const irA = React.useCallback((destino: number) => {
    setDireccion(destino > paso ? 1 : -1)
    setPaso(destino)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [paso])

  const profesionalesDelServicio = React.useMemo(
    () =>
      servicio ? professionals.filter((p) => (p.serviceIds ?? []).includes(servicio.id)) : [],
    [servicio, professionals]
  )

  const tira = React.useMemo(() => {
    const hoy = startOfDay(new Date())
    return Array.from({ length: DIAS_VISIBLES }, (_, i) => {
      const d = new Date(hoy)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [])

  /* --- Disponibilidad: se pide al servidor --- */
  React.useEffect(() => {
    if (!servicio) return
    let vivo = true
    void Promise.resolve().then(() => {
      if (vivo) {
        setCargandoFranjas(true)
        setFranja(null)
      }
    })

    franjasDelDiaAction(servicio.id, dia.toISOString(), profesional?.id)
      .then((res) => {
        if (!vivo) return
        setFranjas(res.ok ? res.data : [])
      })
      .finally(() => vivo && setCargandoFranjas(false))

    return () => {
      vivo = false
    }
  }, [servicio, profesional, dia])

  React.useEffect(() => {
    if (!servicio) return
    let vivo = true
    diasConCuposAction(
      servicio.id,
      startOfDay(new Date()).toISOString(),
      DIAS_VISIBLES,
      profesional?.id
    ).then((res) => {
      if (vivo && res.ok) setCuposPorDia(res.data)
    })
    return () => {
      vivo = false
    }
  }, [servicio, profesional, exito])

  const { manana, tarde } = React.useMemo(() => {
    const manana: Franja[] = []
    const tarde: Franja[] = []
    for (const f of franjas) {
      if (new Date(f.inicioUtc).getHours() < 13) manana.push(f)
      else tarde.push(f)
    }
    return { manana, tarde }
  }, [franjas])

  function validarDatos(): boolean {
    const e: Record<string, string> = {}
    if (nombre.trim().length < 3) e.nombre = 'Escribe tu nombre y apellido completo.'
    const soloDigitos = telefono.replace(/\D/g, '')
    if (soloDigitos.length < 10) e.telefono = 'Necesitamos 10 dígitos para contactarte por WhatsApp.'
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
      e.email = 'Ese correo electrónico no parece válido.'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function confirmar() {
    if (!servicio || !franja) return
    setEnviando(true)
    setErrorReserva(null)

    const res = await crearCitaAction({
      serviceId: servicio.id,
      professionalId: franja.professionalId,
      inicioUtc: franja.inicioUtc,
      clienteNombre: nombre.trim(),
      clienteTelefono: telefono.trim(),
      clienteEmail: email.trim(),
      origen: 'web',
      creadaPor: 'web_client',
    })

    setEnviando(false)

    if (res.ok) {
      setExito(res.data)
      return
    }

    if (res.error === 'cupo_ocupado') {
      setErrorReserva(
        'Ese cupo se acaba de ocupar. Elige otra hora — abajo están las siguientes disponibles.'
      )
      const nuevas = await franjasDelDiaAction(servicio.id, dia.toISOString(), profesional?.id)
      if (nuevas.ok) setFranjas(nuevas.data)
      setFranja(null)
      irA(2)
    } else {
      setErrorReserva(res.error)
    }
  }

  /* ======================= PANTALLA DE ÉXITO ======================= */
  if (exito) {
    return (
      <Confirmacion
        cita={exito}
        servicio={servicio}
        onNueva={() => {
          setExito(null)
          setServicio(null)
          setProfesional(null)
          setFranja(null)
          setNombre('')
          setTelefono('')
          setEmail('')
          setPaso(0)
        }}
      />
    )
  }

  return (
    <div className="relative min-h-[80vh] overflow-hidden pb-16">
      {/* Aura ambiental orgánica de fondo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-112 w-200 rounded-full bg-gradient-to-br from-malva-200/30 via-blush/20 to-champagne/15 blur-[110px] dark:from-malva-950/40 dark:via-malva-900/20 dark:to-transparent" />
        <div className="absolute top-[500px] -right-32 h-112 w-112 rounded-full bg-gradient-to-bl from-malva-300/20 via-blush/15 to-transparent blur-[120px] dark:from-malva-900/15 dark:to-transparent" />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-[var(--spacing-fib-3)] sm:py-[var(--spacing-fib-4)]">
        
        {/* --------- Cabecera con paso y resumen vivo --------- */}
        <div className="sticky top-[68px] z-30 mb-[var(--spacing-fib-4)]">
          <Surface
            material="frost"
            radius="xl"
            pad="sm"
            className="border border-malva-200/80 bg-[var(--card)]/90 shadow-md backdrop-blur-md dark:border-ink-800"
          >
            <div className="flex items-center gap-3">
              {paso > 0 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Volver al paso anterior"
                  onClick={() => irA(paso - 1)}
                  className="shrink-0 text-malva-700 hover:bg-malva-100"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
                </Button>
              )}
              <div className="min-w-0 flex-1">
                <Stepper steps={[...PASOS]} current={paso} onStepClick={irA} />
              </div>
            </div>

            {servicio && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex flex-wrap items-center gap-2 border-t border-malva-100/90 dark:border-ink-800/80 pt-2.5 mt-2"
              >
                <Badge tone="malva" size="sm" className="font-medium">
                  {servicio.nombre}
                </Badge>
                {profesional ? (
                  <Badge tone="glass" size="sm" className="font-medium">
                    {profesional.nombre}
                  </Badge>
                ) : paso >= 2 ? (
                  <Badge tone="glass" size="sm" className="font-medium text-ink-500">
                    Cualquier especialista
                  </Badge>
                ) : null}
                {franja && (
                  <Badge tone="glass" size="sm" className="font-medium text-malva-700 dark:text-malva-200 font-bold">
                    {fechaLarga(franja.inicioUtc)} · {horaCorta(franja.inicioUtc)}
                  </Badge>
                )}
                <span className="tnum ml-auto font-display text-sm sm:text-base font-bold text-malva-700 dark:text-malva-200 font-bold">
                  {formatCurrencyFromCents(servicio.precioCentavos)}
                </span>
              </motion.div>
            )}
          </Surface>
        </div>

        {errorReserva && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={tween.base}
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-[var(--radius-lg)] border border-danger/25 bg-danger-soft p-4 text-sm text-danger shadow-sm"
          >
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2} />
            <p className="font-medium">{errorReserva}</p>
          </motion.div>
        )}

        {/* --------- Contenedor de Pasos con Transición Editorial --------- */}
        <AnimatePresence mode="wait">
          <motion.div
            key={paso}
            initial={{ opacity: 0, x: direccion * 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direccion * 18 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            {paso === 0 && (
              <PasoServicio
                categories={categories}
                services={services}
                estado={estado}
                seleccionado={servicio}
                onSelect={(s) => {
                  setServicio(s)
                  setProfesional(null)
                  setFranja(null)
                  irA(1)
                }}
              />
            )}

            {paso === 1 && servicio && (
              <PasoProfesional
                servicio={servicio}
                opciones={profesionalesDelServicio}
                seleccionado={profesional}
                onSelect={(p) => {
                  setProfesional(p)
                  setFranja(null)
                  irA(2)
                }}
              />
            )}

            {paso === 2 && servicio && (
              <PasoFechaHora
                tira={tira}
                dia={dia}
                onDia={setDia}
                cuposPorDia={cuposPorDia}
                cargando={cargandoFranjas}
                manana={manana}
                tarde={tarde}
                franja={franja}
                onFranja={setFranja}
                mostrarProfesional={!profesional}
                onContinuar={() => irA(3)}
              />
            )}

            {paso === 3 && (
              <PasoDatos
                nombre={nombre}
                telefono={telefono}
                email={email}
                errores={errores}
                onNombre={setNombre}
                onTelefono={setTelefono}
                onEmail={setEmail}
                onContinuar={() => {
                  if (validarDatos()) irA(4)
                }}
              />
            )}

            {paso === 4 && servicio && franja && (
              <PasoConfirmar
                servicio={servicio}
                franja={franja}
                nombre={nombre}
                telefono={telefono}
                enviando={enviando}
                onConfirmar={confirmar}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ========================================================================
   PASO 1 — Selección de Servicio con Filtros por Especialidad
   ===================================================================== */
function PasoServicio({
  categories,
  services,
  seleccionado,
  onSelect,
  estado,
}: {
  categories: Category[]
  services: Service[]
  seleccionado: Service | null
  onSelect: (s: Service) => void
  estado?: React.ReactNode
}) {
  const [categoriaFiltro, setCategoriaFiltro] = React.useState<string>('todas')

  const categoriasConServicios = React.useMemo(
    () => categories.filter((c) => services.some((s) => s.categoryId === c.id && s.activo)),
    [categories, services]
  )

  const serviciosVisibles = React.useMemo(() => {
    if (categoriaFiltro === 'todas') return services.filter((s) => s.activo)
    return services.filter((s) => s.categoryId === categoriaFiltro && s.activo)
  }, [categoriaFiltro, services])

  return (
    <section className="space-y-6 sm:space-y-8">
      <header className="text-center sm:text-left space-y-2">
        <div className="flex items-center justify-center sm:justify-start gap-2">
          {estado}
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-malva-700">
            Paso 1 · Catálogo de autor
          </span>
        </div>
        <TituloEditorial as="h1" size="seccion" resalte="te vas a regalar?" className="mt-2">
          ¿Qué ritual
        </TituloEditorial>
        <p className="text-base sm:text-base text-ink-600 font-sans">
          Elige el servicio que deseas para consultar la disponibilidad en tiempo real.
        </p>
      </header>

      {/* Selector de pestañas por categoría */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          type="button"
          onClick={() => setCategoriaFiltro('todas')}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-semibold transition-all shrink-0 cursor-pointer',
            categoriaFiltro === 'todas'
              ? 'bg-malva-700 text-white shadow-sm'
              : 'bg-[var(--card)] border border-ink-200/80 text-ink-600 hover:border-malva-300 hover:text-ink-900'
          )}
        >
          Todos ({services.filter((s) => s.activo).length})
        </button>
        {categoriasConServicios.map((cat) => {
          const conteo = services.filter((s) => s.categoryId === cat.id && s.activo).length
          const activa = categoriaFiltro === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoriaFiltro(cat.id)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-semibold transition-all shrink-0 cursor-pointer',
                activa
                  ? 'bg-malva-700 text-white shadow-sm'
                  : 'bg-[var(--card)] border border-ink-200/80 text-ink-600 hover:border-malva-300 hover:text-ink-900'
              )}
            >
              {cleanCategoryName(cat.nombre)} ({conteo})
            </button>
          )
        })}
      </div>

      {/* Grilla editorial de servicios */}
      <div className="grid gap-4 sm:grid-cols-2">
        {serviciosVisibles.map((s) => {
          const activo = seleccionado?.id === s.id
          const imageUrl = getServiceImage(s)
          const requiereConfirmacion =
            s.requiereConfirmacion || s.precioCentavos > REGLAS_NEGOCIO.umbralConfirmacionCentavos

          return (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(s)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(s)
                }
              }}
              className={cn(
                'group relative flex flex-col justify-between rounded-lg border p-4 transition-all duration-300 cursor-pointer overflow-hidden',
                'bg-[var(--card)] shadow-2xs hover:shadow-lg hover:shadow-malva-900/5 hover:-translate-y-0.5',
                activo
                  ? 'border-malva-600 ring-2 ring-malva-600/90 shadow-md'
                  : 'border-ink-200/80 hover:border-malva-300'
              )}
            >
              <div className="flex gap-4">
                {/* Miniatura fotográfica */}
                <div className="relative h-20 w-20 sm:h-22 sm:w-22 shrink-0 rounded-sm overflow-hidden bg-malva-100 shadow-2xs">
                  <Image
                    src={imageUrl}
                    alt={s.nombre}
                    fill
                    sizes="88px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                {/* Contenido textual */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-base sm:text-lg font-semibold text-ink-900 group-hover:text-malva-700 transition-colors leading-snug">
                      {s.nombre}
                    </h3>
                  </div>

                  <span className="tnum block font-display text-base sm:text-lg font-bold text-malva-700 dark:text-malva-200 font-bold">
                    {formatCurrencyFromCents(s.precioCentavos)}
                  </span>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-ink-500">
                    <span className="inline-flex items-center gap-1 rounded-md bg-ink-100/80 dark:bg-ink-900/90 px-2 py-0.5 font-medium text-ink-800 dark:text-ink-200 border border-transparent dark:border-ink-700/60">
                      <Clock className="h-3 w-3 text-malva-600" />
                      {humanDuration(s.duracionMin)}
                    </span>
                    {requiereConfirmacion && (
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                        · Confirmación previa
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ========================================================================
   PASO 2 — Selección de Especialista (Retratos de Alta Costura)
   ===================================================================== */
function PasoProfesional({
  servicio,
  opciones,
  seleccionado,
  onSelect,
}: {
  servicio: Service
  opciones: Professional[]
  seleccionado: Professional | null
  onSelect: (p: Professional | null) => void
}) {
  return (
    <section className="space-y-6 sm:space-y-8">
      <header className="text-center sm:text-left space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-malva-700">
          Paso 2 · Equipo de especialistas
        </span>
        <TituloEditorial as="h1" size="seccion" resalte="confías tu ritual?" className="mt-2">
          ¿En manos de quién
        </TituloEditorial>
        <p className="text-base sm:text-base text-ink-600 font-sans">
          Mostrando únicamente las profesionales certificadas para{' '}
          <strong className="font-semibold text-ink-900">{servicio.nombre}</strong>.
        </p>
      </header>

      {opciones.length === 0 ? (
        <EmptyState
          title="Sin profesionales asignadas"
          description="El estudio está configurando la asignación de este servicio. Por favor selecciona otro servicio o consúltanos."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Opción VIP: Primera disponible */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelect(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(null)
              }
            }}
            className={cn(
              'sm:col-span-2 group relative flex items-center gap-4 rounded-lg border p-5 transition-all duration-300 cursor-pointer overflow-hidden',
              'bg-gradient-to-r from-malva-50/70 via-[var(--card)] to-blush/30 dark:from-malva-950/40 dark:to-transparent',
              seleccionado === null
                ? 'border-malva-600 ring-2 ring-malva-600/90 shadow-md'
                : 'border-ink-200/80 hover:border-malva-300 hover:shadow-md'
            )}
          >
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-malva-600 to-malva-800 text-white shadow-xs">
              <Sparkles className="h-6 w-6 text-malva-200" strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-semibold text-ink-900 group-hover:text-malva-700 transition-colors">
                  Cualquier especialista libre
                </h3>
                <span className="rounded-full bg-malva-100 px-2 py-0.5 text-xs font-bold text-malva-700">
                  Más horarios
                </span>
              </div>
              <p className="text-sm text-ink-500 mt-0.5">
                Te asignamos la primera especialista disponible para que elijas entre la mayor cantidad de horas libres.
              </p>
            </div>
          </div>

          {/* Cards de Especialistas */}
          {opciones.map((p) => {
            const avatar = getProfessionalAvatar(p)
            const activo = seleccionado?.id === p.id

            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(p)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(p)
                  }
                }}
                className={cn(
                  'group relative flex items-center gap-4 rounded-lg border p-4.5 transition-all duration-300 cursor-pointer overflow-hidden',
                  'bg-[var(--card)] shadow-2xs hover:shadow-lg hover:shadow-malva-900/5 hover:-translate-y-0.5',
                  activo
                    ? 'border-malva-600 ring-2 ring-malva-600/90 shadow-md'
                    : 'border-ink-200/80 hover:border-malva-300'
                )}
              >
                {/* Avatar fotográfico */}
                <div className="relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden border-2 border-malva-200/80 shadow-2xs bg-malva-100">
                  {avatar ? (
                    <Image
                      src={avatar}
                      alt={p.nombre}
                      fill
                      sizes="64px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span className="grid h-full w-full place-items-center font-display text-xl font-semibold text-malva-700">
                      {p.nombre.charAt(0)}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg font-semibold text-ink-900 group-hover:text-malva-700 transition-colors leading-tight">
                    {p.nombre}
                  </h3>
                  <p className="text-sm font-medium text-ink-500 mt-1">
                    {p.cargo || 'Especialista en Belleza'}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-malva-600 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-malva-500" />
                    Disponible para este ritual
                  </div>
                </div>

                {activo && (
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-malva-700 text-white shadow-xs shrink-0">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.8} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

/* ========================================================================
   PASO 3 — Calendario y Franja Horaria
   ===================================================================== */
function PasoFechaHora({
  tira,
  dia,
  onDia,
  cuposPorDia,
  cargando,
  manana,
  tarde,
  franja,
  onFranja,
  mostrarProfesional,
  onContinuar,
}: {
  tira: Date[]
  dia: Date
  onDia: (d: Date) => void
  cuposPorDia: Record<string, number>
  cargando: boolean
  manana: Franja[]
  tarde: Franja[]
  franja: Franja | null
  onFranja: (f: Franja) => void
  mostrarProfesional: boolean
  onContinuar: () => void
}) {
  const total = manana.length + tarde.length

  return (
    <section className="space-y-6 sm:space-y-8">
      <header className="text-center sm:text-left space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-malva-700">
          Paso 3 · Agenda y horario
        </span>
        <TituloEditorial as="h1" size="seccion" resalte="te queda mejor?" className="mt-2">
          ¿Qué día y hora
        </TituloEditorial>
        <p className="text-base sm:text-base text-ink-600 font-sans">
          Abierto de lunes a sábado. Horario continuo con reserva previa garantizada.
        </p>
      </header>

      {/* Carrusel de días */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-ink-500">
            Próximos 14 días disponibles
          </span>
          <span className="text-xs text-ink-400">Desliza para ver más días →</span>
        </div>

        <div
          className="scrollbar-none -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2 pt-1 sm:mx-0 sm:px-0"
          role="group"
          aria-label="Elegir día de cita"
        >
          {tira.map((d) => {
            const domingo = isSunday(d)
            const cupos = cuposPorDia[claveDia(d)]
            const sinCupos = cupos === 0
            const activo = startOfDay(dia).getTime() === d.getTime()
            const deshabilitado = domingo || sinCupos

            return (
              <motion.button
                key={d.toISOString()}
                type="button"
                disabled={deshabilitado}
                onClick={() => onDia(d)}
                whileTap={deshabilitado ? undefined : { scale: 0.95 }}
                aria-pressed={activo}
                className={cn(
                  'flex w-17.5 sm:w-19 shrink-0 flex-col items-center gap-1 rounded-md border p-3 transition-all duration-200 cursor-pointer',
                  activo
                    ? 'border-malva-700 bg-malva-700 text-white shadow-md shadow-malva-900/20 scale-[1.02]'
                    : deshabilitado
                      ? 'cursor-not-allowed border-ink-100 bg-ink-50/60 text-ink-300 dark:border-ink-800 dark:bg-ink-900/40'
                      : 'border-ink-200/80 bg-[var(--card)] text-ink-900 hover:border-malva-300 hover:shadow-xs'
                )}
              >
                <span
                  className={cn(
                    'text-xs font-bold uppercase tracking-wider',
                    activo ? 'text-malva-100' : 'text-ink-400'
                  )}
                >
                  {d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '')}
                </span>
                <span className="tnum font-display text-xl font-bold leading-none">
                  {d.getDate()}
                </span>
                <span
                  className={cn(
                    'text-2xs font-medium leading-tight',
                    activo ? 'text-malva-200' : 'text-ink-500'
                  )}
                >
                  {domingo
                    ? 'Cerrado'
                    : cupos === undefined
                      ? d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')
                      : sinCupos
                        ? 'Lleno'
                        : `${cupos} libre${cupos > 1 ? 's' : ''}`}
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Grilla de Horas */}
      <div className="space-y-5">
        {cargando ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          </div>
        ) : total === 0 ? (
          <EmptyState
            compact
            icon={Clock}
            title="Sin cupos disponibles para esta fecha"
            description="Elige otro día en la barra superior. Si requieres un horario especial, consúltanos por chat."
          />
        ) : (
          <div className="space-y-6">
            <BloqueHoras
              titulo="Jornada Mañana"
              icono={Sun}
              franjas={manana}
              seleccionada={franja}
              onSelect={onFranja}
              mostrarProfesional={mostrarProfesional}
            />
            <BloqueHoras
              titulo="Jornada Tarde"
              icono={Sunset}
              franjas={tarde}
              seleccionada={franja}
              onSelect={onFranja}
              mostrarProfesional={mostrarProfesional}
            />
          </div>
        )}
      </div>

      {/* Botón flotante para continuar tras seleccionar hora */}
      <AnimatePresence>
        {franja && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={spring.gentle}
            className="pt-4"
          >
            <Button size="xl" full onClick={onContinuar}>
              <CalendarCheck2 className="h-5 w-5" strokeWidth={1.8} />
              Continuar · {horaCorta(franja.inicioUtc)} con {franja.professionalNombre}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function BloqueHoras({
  titulo,
  icono: Icono,
  franjas,
  seleccionada,
  onSelect,
  mostrarProfesional,
}: {
  titulo: string
  icono: typeof Sun
  franjas: Franja[]
  seleccionada: Franja | null
  onSelect: (f: Franja) => void
  mostrarProfesional: boolean
}) {
  if (franjas.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 border-b border-ink-100/90 dark:border-ink-800 pb-2">
        <Icono className="h-4 w-4 text-malva-600" strokeWidth={2} />
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-700">
          {titulo}
        </h3>
        <span className="tnum ml-auto text-xs font-semibold text-ink-500">
          {franjas.length} franja{franjas.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 md:grid-cols-6">
        {franjas.map((f) => {
          const activa = seleccionada?.inicioUtc === f.inicioUtc
          return (
            <motion.button
              key={f.inicioUtc}
              type="button"
              onClick={() => onSelect(f)}
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.96 }}
              transition={spring.snappy}
              aria-pressed={activa}
              className={cn(
                'tnum flex h-13 flex-col items-center justify-center rounded-md border p-1 transition-all duration-200 cursor-pointer',
                activa
                  ? 'border-malva-700 bg-malva-700 text-white shadow-md shadow-malva-900/20 font-bold'
                  : 'border-ink-200/80 bg-[var(--card)] text-ink-900 hover:border-malva-400 hover:bg-malva-50/50'
              )}
            >
              <span className="font-display text-base font-semibold leading-tight">
                {horaCorta(f.inicioUtc)}
              </span>
              {mostrarProfesional && (
                <span
                  className={cn(
                    'text-2xs font-medium truncate max-w-[90%]',
                    activa ? 'text-malva-200' : 'text-ink-500'
                  )}
                >
                  {f.professionalNombre.split(' ')[0]}
                </span>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/* ========================================================================
   PASO 4 — Datos de la Clienta (Sin fricción ni registros)
   ===================================================================== */
function PasoDatos({
  nombre,
  telefono,
  email,
  errores,
  onNombre,
  onTelefono,
  onEmail,
  onContinuar,
}: {
  nombre: string
  telefono: string
  email: string
  errores: Record<string, string>
  onNombre: (v: string) => void
  onTelefono: (v: string) => void
  onEmail: (v: string) => void
  onContinuar: () => void
}) {
  return (
    <section className="space-y-6 sm:space-y-8 max-w-xl mx-auto">
      <header className="text-center space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-malva-700">
          Paso 4 · Contacto de confirmación
        </span>
        <TituloEditorial as="h1" size="seccion" resalte="tus datos?" className="mt-2">
          ¿A nombre de quién
        </TituloEditorial>
        <p className="text-base text-ink-600 font-sans">
          Sin crear contraseñas. Con tu número nos comunicamos para confirmar y recordarte la cita.
        </p>
      </header>

      <Surface
        material="frost"
        radius="xl"
        pad="lg"
        className="border border-malva-200/80 bg-[var(--card)] shadow-md dark:border-ink-800 space-y-5"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            onContinuar()
          }}
        >
          <Field
            label="Nombre y apellido completo"
            required
            icon={User}
            autoComplete="name"
            placeholder="Ej: Valentina Restrepo"
            value={nombre}
            error={errores.nombre}
            onChange={(e) => onNombre(e.target.value)}
          />

          <Field
            label="Celular (WhatsApp para confirmación)"
            required
            icon={Phone}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="300 123 4567"
            value={telefono}
            error={errores.telefono}
            hint={
              telefono.replace(/\D/g, '').length >= 10
                ? `Formato internacional: ${normalizePhoneE164(telefono)}`
                : 'Te enviaremos los detalles y recordatorios a este número.'
            }
            onChange={(e) => onTelefono(e.target.value)}
          />

          <Field
            label="Correo electrónico (opcional para recibo)"
            icon={Mail}
            type="email"
            autoComplete="email"
            placeholder="valentina@ejemplo.com"
            value={email}
            error={errores.email}
            onChange={(e) => onEmail(e.target.value)}
          />

          <div className="pt-2">
            <Button type="submit" size="xl" full>
              Revisar resumen y confirmar
            </Button>
          </div>
        </form>

        <div className="flex items-center gap-2 pt-2 border-t border-ink-100 dark:border-ink-800 text-xs text-ink-500">
          <ShieldCheck className="h-4 w-4 text-malva-600 shrink-0" />
          <span>Tus datos son 100% privados y nunca enviamos publicidad no deseada.</span>
        </div>
      </Surface>
    </section>
  )
}

/* ========================================================================
   PASO 5 — Resumen Editorial & Confirmación Transaccional
   ===================================================================== */
function PasoConfirmar({
  servicio,
  franja,
  nombre,
  telefono,
  enviando,
  onConfirmar,
}: {
  servicio: Service
  franja: Franja
  nombre: string
  telefono: string
  enviando: boolean
  onConfirmar: () => void
}) {
  const requiereConfirmacion =
    servicio.requiereConfirmacion ||
    servicio.precioCentavos > REGLAS_NEGOCIO.umbralConfirmacionCentavos

  return (
    <section className="space-y-6 sm:space-y-8 max-w-xl mx-auto">
      <header className="text-center space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-malva-700">
          Paso 5 · Resumen de reserva
        </span>
        <TituloEditorial as="h1" size="seccion" resalte="tu cita?" className="mt-2">
          ¿Confirmamos
        </TituloEditorial>
        <p className="text-base text-ink-600 font-sans">
          Revisa que todo esté correcto. El cupo queda apartado inmediatamente al presionar el botón.
        </p>
      </header>

      {/* Ticket Editorial de Alta Costura */}
      <Surface
        material="frost"
        radius="xl"
        pad="lg"
        className="border border-malva-300/80 bg-[var(--card)] shadow-xl dark:border-ink-800 space-y-5"
      >
        {/* Cabecera del ticket */}
        <div className="flex items-start justify-between gap-4 border-b border-malva-100/90 dark:border-ink-800 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-malva-600">
              Ritual Seleccionado
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-ink-900 mt-0.5">
              {servicio.nombre}
            </h2>
            <p className="text-sm text-ink-500 font-medium mt-0.5">
              Duración estimada: {humanDuration(servicio.duracionMin)}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-ink-400">
              Inversión
            </span>
            <span className="tnum block font-display text-2xl sm:text-2xl font-bold text-malva-700 dark:text-malva-200 font-bold leading-tight">
              {formatCurrencyFromCents(servicio.precioCentavos)}
            </span>
          </div>
        </div>

        {/* Desglose de Datos */}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Dato
            etiqueta="Fecha y hora"
            valor={`${fechaLarga(franja.inicioUtc)}, ${horaCorta(franja.inicioUtc)}`}
          />
          <Dato etiqueta="Especialista" valor={franja.professionalNombre} />
          <Dato etiqueta="Clienta" valor={nombre} />
          <Dato etiqueta="WhatsApp" valor={normalizePhoneE164(telefono)} />
        </dl>

        {requiereConfirmacion && (
          <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" strokeWidth={2.2} />
            <p>
              Por ser un servicio de alta especialización, queda registrado como{' '}
              <strong className="font-semibold">por confirmar</strong> y te escribiremos directamente
              para afinar los detalles de tu preparación.
            </p>
          </div>
        )}

        <div className="pt-2">
          <Button
            size="xl"
            full
            loading={enviando}
            loadingText="Apartando tu cupo..."
            onClick={onConfirmar}
          >
            <CalendarCheck2 className="h-5 w-5" strokeWidth={1.8} />
            Confirmar y apartar cupo
          </Button>
        </div>

        <p className="text-center text-xs text-ink-500">
          Al confirmar, aceptas nuestras políticas de reserva y puntualidad.
        </p>
      </Surface>
    </section>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink-400">{etiqueta}</dt>
      <dd className="font-semibold text-ink-900 first-letter:uppercase text-sm leading-snug">
        {valor}
      </dd>
    </div>
  )
}

/* ========================================================================
   PANTALLA DE ÉXITO (Ticket de Cita Confirmada)
   ===================================================================== */
function Confirmacion({
  cita,
  servicio,
  onNueva,
}: {
  cita: Appointment
  servicio: Service | null
  onNueva: () => void
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-[var(--spacing-fib-5)] sm:px-6">
      <div className="relative mx-auto flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...spring.gentle, delay: 0.05 }}
          className="relative grid place-items-center"
        >
          <Marca size={84} animate="bloom" halo className="text-malva-600 drop-shadow-md" />
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 450, damping: 18, delay: 0.45 }}
            className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--card)] bg-emerald-600 text-white shadow-sm"
          >
            <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
          </motion.span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...tween.base, delay: 0.18 }}
          className="mt-6"
        >
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-malva-700">
            Reserva completada con éxito
          </span>
          <h1 className="font-display text-4xl sm:text-4xl font-semibold leading-tight text-ink-900 mt-1">
            {cita.estado === 'pendiente' ? 'Cupo apartado' : '¡Tu cita está lista!'}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-base leading-relaxed text-ink-600">
            {cita.estado === 'pendiente'
              ? 'Te escribiremos por WhatsApp para terminar de confirmarla.'
              : 'Te esperamos en Casa Malva para brindarte una experiencia memorable.'}
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.gentle, delay: 0.26 }}
        className="mt-8"
      >
        <Surface
          material="frost"
          radius="xl"
          pad="lg"
          className="border border-malva-300/80 bg-[var(--card)] shadow-xl dark:border-ink-800 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-malva-100 pb-3">
            <span className="text-xs uppercase tracking-[0.14em] font-bold text-ink-400">
              Código de cita
            </span>
            <span className="tnum font-mono text-sm font-bold text-malva-700 dark:text-malva-200 font-bold bg-malva-50 dark:bg-malva-950/60 px-2.5 py-0.5 rounded-md border border-malva-200/60">
              {cita.id}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <Dato etiqueta="Servicio" valor={servicio?.nombre ?? 'Ritual de Belleza'} />
            <Dato
              etiqueta="Fecha y hora"
              valor={`${fechaLarga(cita.inicioUtc)}, ${horaCorta(cita.inicioUtc)}`}
            />
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink-400">
                Inversión congelada
              </dt>
              <dd className="tnum mt-0.5 font-display text-base font-bold text-malva-700 dark:text-malva-200 font-bold">
                {formatCurrencyFromCents(cita.precioCentavos)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink-400">
                Estado
              </dt>
              <dd className="mt-0.5">
                <StatusPill estado={cita.estado} size="md" />
              </dd>
            </div>
          </dl>
        </Surface>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.38 }}
        className="mt-6 flex flex-col gap-3 sm:flex-row"
      >
        <Button variant="glass" size="lg" full onClick={onNueva}>
          Agendar otro ritual
        </Button>
        <Link href="/inicio" className={buttonClass({ variant: 'soft', size: 'lg', full: true })}>
          Volver a la portada
        </Link>
      </motion.div>
    </div>
  )
}
