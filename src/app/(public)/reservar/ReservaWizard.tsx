'use client'

import * as React from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  CalendarCheck2,
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
} from 'lucide-react'
import { crearCitaAction, franjasDelDiaAction, diasConCuposAction } from '@/actions/citas'
import { formatCurrencyFromCents } from '@/lib/currency'
import { REGLAS_NEGOCIO } from '@/lib/reglas'
import { claveDia, isSunday, startOfDay } from '@/lib/disponibilidad'
import { fechaLarga, hora as horaCorta } from '@/lib/fechas'
import { humanDuration, cleanCategoryName } from '@/lib/catalogo-ui'
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
import type { Appointment, Category, Professional, Service } from '@/types'

type Franja = { inicioUtc: string; professionalId: string; professionalNombre: string }

const PASOS = ['Servicio', 'Profesional', 'Fecha y hora', 'Tus datos', 'Confirmar'] as const
const DIAS_VISIBLES = 14

export function ReservaWizard({
  serviceIdInicial,
  categories,
  services,
  professionals,
}: {
  serviceIdInicial: string | null
  categories: Category[]
  services: Service[]
  professionals: Professional[]
}) {
  // Si llega con ?serviceId, arranca directamente en el paso del profesional.
  const [paso, setPaso] = React.useState(() =>
    serviceIdInicial && services.some((s) => s.id === serviceIdInicial) ? 1 : 0
  )
  const [direccion, setDireccion] = React.useState(1)

  const [servicio, setServicio] = React.useState<Service | null>(
    () => services.find((s) => s.id === serviceIdInicial) ?? null
  )
  const [profesional, setProfesional] = React.useState<Professional | null>(null)
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
  }, [paso])

  const profesionalesDelServicio = React.useMemo(
    () =>
      servicio ? professionals.filter((p) => p.serviceIds.includes(servicio.id)) : [],
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

  /* --- Disponibilidad: se pide al servidor, nunca se calcula en el navegador
         con la tabla de citas de todas las clientas.

     ⚠️ `paso` NO va en las dependencias. Estuvo, y provocaba esto: al avanzar
     del paso 3 al 4 el efecto se volvía a ejecutar, hacía `setFranja(null)` y
     borraba la hora que la clienta acababa de elegir — el paso de confirmación
     se quedaba en blanco. La disponibilidad depende del servicio, de la
     profesional y del día. De nada más.
     ------------------------------------------------------------------------ */
  React.useEffect(() => {
    if (!servicio) return
    let vivo = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCargandoFranjas(true)
    setFranja(null)

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
    if (nombre.trim().length < 3) e.nombre = 'Escribe tu nombre y apellido.'
    const soloDigitos = telefono.replace(/\D/g, '')
    if (soloDigitos.length < 10) e.telefono = 'Necesitamos 10 dígitos para escribirte por WhatsApp.'
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
      e.email = 'Ese correo no parece válido.'
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
        'Ese cupo se acaba de ocupar. Elige otra hora — abajo están las siguientes libres.'
      )
      // Se recargan las horas del día para que la lista refleje la realidad.
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
    return <Confirmacion cita={exito} servicio={servicio} onNueva={() => {
      setExito(null)
      setServicio(null)
      setProfesional(null)
      setFranja(null)
      setNombre('')
      setTelefono('')
      setEmail('')
      setPaso(0)
    }} />
  }

  const puedeAvanzar =
    (paso === 0 && !!servicio) ||
    (paso === 1 && !!servicio) ||
    (paso === 2 && !!franja) ||
    paso === 3 ||
    paso === 4

  return (
    <div className="mx-auto max-w-3xl px-4 py-[var(--spacing-fib-3)] sm:px-6 sm:py-[var(--spacing-fib-4)]">
      {/* --------- Cabecera con paso y resumen vivo --------- */}
      <div className="sticky top-[68px] z-30 -mx-4 mb-[var(--spacing-fib-3)] px-4 py-3 sm:-mx-6 sm:px-6">
        <Surface material="frost" radius="lg" pad="sm" className="space-y-3">
          <div className="flex items-center gap-3">
            {paso > 0 && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Volver al paso anterior"
                onClick={() => irA(paso - 1)}
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={2} />
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <Stepper steps={[...PASOS]} current={paso} onStepClick={irA} />
            </div>
          </div>

          {servicio && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-malva-100 pt-2.5">
              <Badge tone="malva" size="sm">
                {servicio.nombre}
              </Badge>
              {profesional && (
                <Badge tone="glass" size="sm">
                  {profesional.nombre}
                </Badge>
              )}
              {franja && (
                <Badge tone="glass" size="sm">
                  {fechaLarga(franja.inicioUtc)} · {horaCorta(franja.inicioUtc)}
                </Badge>
              )}
              <span className="tnum ml-auto text-[13px] font-semibold text-malva-700">
                {formatCurrencyFromCents(servicio.precioCentavos)}
              </span>
            </div>
          )}
        </Surface>
      </div>

      {errorReserva && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={tween.base}
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-[var(--radius-md)] border border-danger/25 bg-danger-soft px-4 py-3 text-[13px] text-danger"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          <p>{errorReserva}</p>
        </motion.div>
      )}

      {/* --------- Pasos --------- */}
      <div className="relative overflow-hidden">
        <div key={paso} className={direccion >= 0 ? 'paso-adelante' : 'paso-atras'}>
            {paso === 0 && (
              <PasoServicio
                categories={categories}
                services={services}
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
        </div>
      </div>

      {!puedeAvanzar && null}
    </div>
  )
}

/* ========================================================================
   PASO 1 — Servicio
   ===================================================================== */
function PasoServicio({
  categories,
  services,
  seleccionado,
  onSelect,
}: {
  categories: Category[]
  services: Service[]
  seleccionado: Service | null
  onSelect: (s: Service) => void
}) {
  return (
    <section className="space-y-[var(--spacing-fib-3)]">
      <header>
        <h1 className="font-display text-[26px] font-semibold text-ink-900">
          ¿Qué te vas a hacer?
        </h1>
        <p className="text-[13.5px] text-ink-500">
          Elige un servicio para ver las horas libres de verdad.
        </p>
      </header>

      {categories.map((cat) => {
        const items = services.filter((s) => s.categoryId === cat.id)
        if (items.length === 0) return null

        return (
          <div key={cat.id} className="space-y-2.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-malva-600">
              {cleanCategoryName(cat.nombre)}
            </h2>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {items.map((s) => {
                const activo = seleccionado?.id === s.id
                return (
                  <Surface
                    key={s.id}
                    as="div"
                    interactive
                    pad="sm"
                    radius="md"
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
                      'text-left',
                      activo && 'ring-2 ring-malva-500 ring-offset-2 ring-offset-[var(--canvas)]'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[14.5px] font-semibold leading-snug text-ink-900">
                        {s.nombre}
                      </h3>
                      <span className="tnum shrink-0 text-[14px] font-semibold text-malva-700">
                        {formatCurrencyFromCents(s.precioCentavos)}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-400">
                      <Clock className="h-3 w-3" strokeWidth={2} />
                      {humanDuration(s.duracionMin)}
                      {s.precioCentavos > REGLAS_NEGOCIO.umbralConfirmacionCentavos && (
                        <span className="ml-1 text-warning">· confirmamos por WhatsApp</span>
                      )}
                    </p>
                  </Surface>
                )
              })}
            </div>
          </div>
        )
      })}
    </section>
  )
}

/* ========================================================================
   PASO 2 — Profesional
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
    <section className="space-y-[var(--spacing-fib-3)]">
      <header>
        <h1 className="font-display text-[26px] font-semibold text-ink-900">
          ¿Con quién?
        </h1>
        <p className="text-[13.5px] text-ink-500">
          Solo aparecen quienes hacen <strong>{servicio.nombre}</strong>.
        </p>
      </header>

      {opciones.length === 0 ? (
        <EmptyState
          title="Nadie tiene este servicio habilitado"
          description="El estudio asigna qué hace cada profesional desde su panel. Elige otro servicio o escríbenos."
        />
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Surface
            interactive
            pad="sm"
            radius="md"
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
              'sm:col-span-2',
              seleccionado === null &&
                'ring-2 ring-malva-500 ring-offset-2 ring-offset-[var(--canvas)]'
            )}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-malva-100 text-malva-600">
                <Sparkles className="h-5 w-5" strokeWidth={1.6} />
              </span>
              <div>
                <h3 className="text-[14.5px] font-semibold text-ink-900">
                  La primera que esté libre
                </h3>
                <p className="text-[12.5px] text-ink-500">
                  Más horas para elegir. Te decimos quién antes de confirmar.
                </p>
              </div>
            </div>
          </Surface>

          {opciones.map((p) => (
            <Surface
              key={p.id}
              interactive
              pad="sm"
              radius="md"
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
                seleccionado?.id === p.id &&
                  'ring-2 ring-malva-500 ring-offset-2 ring-offset-[var(--canvas)]'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-malva-500 to-malva-700 font-display text-lg font-semibold text-white">
                  {p.nombre.charAt(0)}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-[14.5px] font-semibold text-ink-900">
                    {p.nombre}
                  </h3>
                  <p className="truncate text-[12.5px] text-ink-500">{p.cargo}</p>
                </div>
              </div>
            </Surface>
          ))}
        </div>
      )}
    </section>
  )
}

/* ========================================================================
   PASO 3 — Fecha y hora
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
    <section className="space-y-[var(--spacing-fib-3)]">
      <header>
        <h1 className="font-display text-[26px] font-semibold text-ink-900">
          ¿Cuándo te viene bien?
        </h1>
        <p className="text-[13.5px] text-ink-500">
          Los domingos cerramos y de 13:00 a 14:00 almorzamos.
        </p>
      </header>

      {/* Tira de días */}
      <div
        className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
        role="group"
        aria-label="Elegir día"
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
              whileTap={deshabilitado ? undefined : { scale: 0.94 }}
              transition={spring.snappy}
              aria-pressed={activo}
              aria-label={`${fechaLarga(d)}${
                domingo ? ' (cerrado)' : sinCupos ? ' (sin cupos)' : ''
              }`}
              className={cn(
                'flex w-[62px] shrink-0 flex-col items-center gap-0.5 rounded-[var(--radius-md)] border px-2 py-2.5 transition-colors',
                activo
                  ? 'border-transparent bg-malva-600 text-white shadow-[var(--shadow-malva)]'
                  : deshabilitado
                    ? 'cursor-not-allowed border-ink-100 bg-ink-50 text-ink-300'
                    : 'border-malva-100 bg-white/70 text-ink-900 backdrop-blur-sm hover:border-malva-300'
              )}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                {d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '')}
              </span>
              <span className="tnum text-[19px] font-semibold leading-none">
                {d.getDate()}
              </span>
              <span className="text-[9.5px] opacity-70">
                {domingo
                  ? 'cerrado'
                  : cupos === undefined
                    ? d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')
                    : sinCupos
                      ? 'lleno'
                      : `${cupos} libres`}
              </span>
            </motion.button>
          )
        })}
      </div>

      {/* Horas */}
      <div className="space-y-[var(--spacing-fib-2)]">
        {cargando ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : total === 0 ? (
          <EmptyState
            compact
            icon={Clock}
            title="No queda nada libre ese día"
            description="Prueba con otro día de la tira de arriba: los que están apagados ya están llenos."
          />
        ) : (
          <>
            <BloqueHoras
              titulo="Mañana"
              icono={Sun}
              franjas={manana}
              seleccionada={franja}
              onSelect={onFranja}
              mostrarProfesional={mostrarProfesional}
            />
            <BloqueHoras
              titulo="Tarde"
              icono={Sunset}
              franjas={tarde}
              seleccionada={franja}
              onSelect={onFranja}
              mostrarProfesional={mostrarProfesional}
            />
          </>
        )}
      </div>

      <AnimatePresence>
        {franja && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={spring.gentle}
          >
            <Button size="lg" full onClick={onContinuar}>
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
    <div className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
        <Icono className="h-3.5 w-3.5" strokeWidth={2} />
        {titulo}
        <span className="tnum ml-auto normal-case tracking-normal">
          {franjas.length} cupos
        </span>
      </h3>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {franjas.map((f) => {
          const activa = seleccionada?.inicioUtc === f.inicioUtc
          return (
            <motion.button
              key={f.inicioUtc}
              type="button"
              onClick={() => onSelect(f)}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={spring.snappy}
              aria-pressed={activa}
              className={cn(
                'tnum flex h-11 flex-col items-center justify-center rounded-[var(--radius-sm)] border text-[13.5px] font-semibold transition-colors',
                activa
                  ? 'border-transparent bg-malva-600 text-white shadow-[var(--shadow-malva)]'
                  : 'border-malva-100 bg-white/70 text-ink-900 backdrop-blur-sm hover:border-malva-300'
              )}
            >
              {horaCorta(f.inicioUtc)}
              {mostrarProfesional && (
                <span
                  className={cn(
                    'text-[9.5px] font-normal',
                    activa ? 'text-white/75' : 'text-ink-400'
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
   PASO 4 — Datos
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
    <section className="space-y-[var(--spacing-fib-3)]">
      <header>
        <h1 className="font-display text-[26px] font-semibold text-ink-900">
          ¿Cómo te escribimos?
        </h1>
        <p className="text-[13.5px] text-ink-500">
          No hace falta crear una cuenta. Con tu número basta.
        </p>
      </header>

      <form
        className="max-w-md space-y-[var(--spacing-fib-2)]"
        onSubmit={(e) => {
          e.preventDefault()
          onContinuar()
        }}
      >
        <Field
          label="Nombre y apellido"
          required
          icon={User}
          autoComplete="name"
          placeholder="María Fernanda Gómez"
          value={nombre}
          error={errores.nombre}
          onChange={(e) => onNombre(e.target.value)}
        />

        <Field
          label="Celular (WhatsApp)"
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
              ? `Se guardará como ${normalizePhoneE164(telefono)}`
              : 'Aquí te llega la confirmación y el recordatorio.'
          }
          onChange={(e) => onTelefono(e.target.value)}
        />

        <Field
          label="Correo (opcional)"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="maria@correo.com"
          value={email}
          error={errores.email}
          onChange={(e) => onEmail(e.target.value)}
        />

        <Button type="submit" size="lg" full>
          Revisar la reserva
        </Button>
      </form>
    </section>
  )
}

/* ========================================================================
   PASO 5 — Confirmar
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
    <section className="space-y-[var(--spacing-fib-3)]">
      <header>
        <h1 className="font-display text-[26px] font-semibold text-ink-900">
          Todo listo, ¿confirmamos?
        </h1>
        <p className="text-[13.5px] text-ink-500">
          Revisa los datos. El cupo se bloquea al confirmar.
        </p>
      </header>

      <Surface material="frost" radius="lg" pad="md" className="space-y-[var(--spacing-fib-2)]">
        <div className="flex items-start justify-between gap-3 border-b border-malva-100 pb-3">
          <div>
            <h2 className="font-display text-[19px] font-semibold text-ink-900">
              {servicio.nombre}
            </h2>
            <p className="text-[12.5px] text-ink-400">
              {humanDuration(servicio.duracionMin)} en la silla
            </p>
          </div>
          <span className="tnum shrink-0 font-display text-[22px] font-semibold text-malva-700">
            {formatCurrencyFromCents(servicio.precioCentavos)}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-y-3 text-[13px]">
          <Dato etiqueta="Cuándo" valor={`${fechaLarga(franja.inicioUtc)}, ${horaCorta(franja.inicioUtc)}`} />
          <Dato etiqueta="Con" valor={franja.professionalNombre} />
          <Dato etiqueta="A nombre de" valor={nombre} />
          <Dato etiqueta="Celular" valor={normalizePhoneE164(telefono)} />
        </dl>

        {requiereConfirmacion && (
          <div className="flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-warning/25 bg-warning-soft px-3.5 py-3 text-[12.5px] leading-relaxed text-warning">
            <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
            <p>
              Es un servicio largo, así que lo dejamos{' '}
              <strong className="font-semibold">por confirmar</strong> y te
              escribimos por WhatsApp para cerrarlo. El cupo queda apartado
              mientras tanto.
            </p>
          </div>
        )}
      </Surface>

      <Button size="xl" full loading={enviando} loadingText="Reservando tu cupo…" onClick={onConfirmar}>
        <CalendarCheck2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
        Confirmar mi cita
      </Button>

      <p className="text-center text-[11.5px] text-ink-400">
        Al confirmar aceptas que te escribamos por WhatsApp sobre esta cita.
      </p>
    </section>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.1em] text-ink-400">{etiqueta}</dt>
      <dd className="mt-0.5 font-semibold text-ink-900 first-letter:uppercase">{valor}</dd>
    </div>
  )
}

/* ========================================================================
   Pantalla final
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
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...spring.gentle, delay: 0.05 }}
        className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-success-soft text-success"
      >
        <motion.span
          initial={{ scale: 0, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.2 }}
        >
          <CheckCircle2 className="h-11 w-11" strokeWidth={1.6} />
        </motion.span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...tween.base, delay: 0.18 }}
        className="mt-[var(--spacing-fib-3)] text-center"
      >
        <h1 className="font-display text-[30px] font-semibold leading-tight text-ink-900">
          {cita.estado === 'pendiente' ? 'Cupo apartado' : '¡Cita agendada!'}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-ink-500">
          {cita.estado === 'pendiente'
            ? 'Te escribimos por WhatsApp para confirmarla. Tu cupo queda apartado mientras tanto.'
            : 'Te esperamos en Casa Malva. Si necesitas moverla, escríbenos y la cambiamos.'}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.gentle, delay: 0.26 }}
        className="mt-[var(--spacing-fib-4)]"
      >
        <Surface material="frost" radius="xl" pad="md" className="space-y-[var(--spacing-fib-2)]">
          <div className="flex items-center justify-between border-b border-malva-100 pb-3">
            <span className="text-[11px] uppercase tracking-[0.12em] text-ink-400">
              Código de reserva
            </span>
            <span className="tnum font-mono text-[12.5px] font-semibold text-malva-700">
              {cita.id}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-y-3 text-[13px]">
            <Dato etiqueta="Servicio" valor={servicio?.nombre ?? 'Servicio'} />
            <Dato etiqueta="Cuándo" valor={`${fechaLarga(cita.inicioUtc)}, ${horaCorta(cita.inicioUtc)}`} />
            <div>
              <dt className="text-[11px] uppercase tracking-[0.1em] text-ink-400">
                Precio congelado
              </dt>
              <dd className="tnum mt-0.5 font-semibold text-malva-700">
                {formatCurrencyFromCents(cita.precioCentavos)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.1em] text-ink-400">Estado</dt>
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
        transition={{ delay: 0.4 }}
        className="mt-[var(--spacing-fib-3)] flex flex-col gap-2 sm:flex-row"
      >
        <Button variant="glass" size="lg" full onClick={onNueva}>
          Agendar otra cita
        </Button>
        <Link href="/inicio" className={buttonClass({ variant: 'soft', size: 'lg', full: true })}>
          Volver al inicio
        </Link>
      </motion.div>
    </div>
  )
}
