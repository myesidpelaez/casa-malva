'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Phone,
  Info,
} from 'lucide-react'
import { getCategoriesAction, getServicesAction } from '@/actions/catalogo'
import { getProfessionalsAction } from '@/actions/profesionales'
import { getCitasAction, crearCitaAction } from '@/actions/citas'
import { formatCurrencyFromCents } from '@/lib/currency'
import {
  franjasDisponibles,
  profesionalesPara,
  isSunday,
  startOfDay,
  type SlotInfo,
} from '@/lib/disponibilidad'
import type { Category, Service, Professional, Appointment } from '@/types'

function ReservarContent() {
  const searchParams = useSearchParams()
  const initialServiceId = searchParams.get('serviceId')

  const [loading, setLoading] = React.useState(true)
  const [categories, setCategories] = React.useState<Category[]>([])
  const [services, setServices] = React.useState<Service[]>([])
  const [professionals, setProfessionals] = React.useState<Professional[]>([])
  const [appointments, setAppointments] = React.useState<Appointment[]>([])

  // Form State
  const [step, setStep] = React.useState<1 | 2 | 3 | 4 | 5>(1)
  const [selectedService, setSelectedService] = React.useState<Service | null>(null)
  const [selectedProfessional, setSelectedProfessional] = React.useState<Professional | null>(null)
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date())
  const [selectedTimeSlot, setSelectedTimeSlot] = React.useState<Date | null>(null)
  const [clientName, setClientName] = React.useState('')
  const [clientPhone, setClientPhone] = React.useState('')
  const [clientEmail, setClientEmail] = React.useState('')

  // Submit State
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [bookingSuccess, setBookingSuccess] = React.useState<Appointment | null>(null)
  const [bookingError, setBookingError] = React.useState<string | null>(null)
  const [alternatives, setAlternatives] = React.useState<SlotInfo[]>([])

  React.useEffect(() => {
    let isMounted = true
    async function loadData() {
      try {
        const [cRes, sRes, pRes, aRes] = await Promise.all([
          getCategoriesAction(),
          getServicesAction(),
          getProfessionalsAction(),
          getCitasAction(),
        ])

        if (!isMounted) return

        if (cRes.ok) setCategories(cRes.data.filter((c) => c.activa))
        if (sRes.ok) setServices(sRes.data.filter((s) => s.activo))
        if (pRes.ok) setProfessionals(pRes.data.filter((p) => p.activo))
        if (aRes.ok) setAppointments(aRes.data)

        if (initialServiceId && sRes.ok) {
          const found = sRes.data.find((s) => s.id === initialServiceId && s.activo)
          if (found) {
            setSelectedService(found)
            setStep(2)
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [initialServiceId])

  // Date strip helper (14 days from today)
  const dateStrip = React.useMemo(() => {
    const list: Date[] = []
    const now = new Date()
    for (let i = 0; i < 14; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() + i)
      list.push(startOfDay(d))
    }
    return list
  }, [])

  // Available professionals for selected service
  const availableProfs = React.useMemo(() => {
    if (!selectedService) return []
    return profesionalesPara(selectedService.id, professionals)
  }, [selectedService, professionals])

  // Available slots for selected date & professional
  const availableSlots = React.useMemo(() => {
    if (!selectedService) return []

    if (selectedProfessional) {
      return franjasDisponibles(
        selectedService.id,
        selectedProfessional.id,
        selectedDate,
        appointments,
        services,
        professionals
      )
    } else {
      const allSlots: Date[] = []
      for (const prof of availableProfs) {
        const slots = franjasDisponibles(
          selectedService.id,
          prof.id,
          selectedDate,
          appointments,
          services,
          professionals
        )
        for (const s of slots) {
          if (!allSlots.some((x) => x.getTime() === s.getTime())) {
            allSlots.push(s)
          }
        }
      }
      return allSlots.sort((a, b) => a.getTime() - b.getTime())
    }
  }, [selectedService, selectedProfessional, selectedDate, appointments, services, professionals, availableProfs])

  // Booking submit handler
  async function handleConfirmBooking() {
    if (!selectedService || !selectedTimeSlot || !clientName || !clientPhone) return

    setIsSubmitting(true)
    setBookingError(null)
    setAlternatives([])

    let targetProfId = selectedProfessional?.id
    if (!targetProfId && availableProfs.length > 0) {
      const match = availableProfs.find((p) => {
        const slots = franjasDisponibles(
          selectedService.id,
          p.id,
          selectedDate,
          appointments,
          services,
          professionals
        )
        return slots.some((s) => s.getTime() === selectedTimeSlot.getTime())
      })
      targetProfId = match ? match.id : availableProfs[0].id
    }

    if (!targetProfId) {
      setBookingError('No hay profesional disponible para este servicio.')
      setIsSubmitting(false)
      return
    }

    const res = await crearCitaAction({
      serviceId: selectedService.id,
      professionalId: targetProfId,
      inicioUtc: selectedTimeSlot.toISOString(),
      clienteNombre: clientName.trim(),
      clienteTelefono: clientPhone.trim(),
      clienteEmail: clientEmail.trim(),
      origen: 'web',
      creadaPor: 'web_client',
    })

    setIsSubmitting(false)

    if (res.ok) {
      setBookingSuccess(res.data)
    } else {
      if (res.error === 'cupo_ocupado') {
        setBookingError('El cupo seleccionado ya fue ocupado por otra clienta hace un instante.')
        if (res.alternativas) setAlternatives(res.alternativas)
      } else {
        setBookingError(res.error || 'Error al agendar la cita. Por favor intenta nuevamente.')
      }
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-[#7B4B6E]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#7B4B6E] border-t-transparent"></div>
          <span className="text-sm font-semibold">Cargando disponibilidad...</span>
        </div>
      </div>
    )
  }

  if (bookingSuccess) {
    const isPending = bookingSuccess.estado === 'pendiente'
    return (
      <div className="mx-auto max-w-lg px-4 py-10 space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-10 w-10 stroke-[2]" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-[#1A1618]">
            {isPending ? '¡Cita registrada (Pendiente)!' : '¡Cita agendada con éxito!'}
          </h2>
          <p className="text-sm text-[#6B6268]">
            {isPending
              ? 'Tu servicio supera $200.000 COP. Nuestro equipo confirmará tu cita en breve.'
              : 'Te esperamos en Casa Malva en la fecha y hora seleccionadas.'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#F3EAF0] bg-white p-6 space-y-4 text-left shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F3EAF0] pb-3">
            <span className="text-xs text-[#6B6268]">Código de Reserva</span>
            <span className="font-mono text-sm font-bold text-[#7B4B6E]">{bookingSuccess.id}</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#6B6268]">Servicio:</span>
              <span className="font-semibold text-[#1A1618]">{selectedService?.nombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B6268]">Fecha:</span>
              <span className="font-semibold text-[#1A1618]">
                {new Date(bookingSuccess.inicioUtc).toLocaleDateString('es-CO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B6268]">Hora:</span>
              <span className="font-semibold text-[#1A1618]">
                {new Date(bookingSuccess.inicioUtc).toLocaleTimeString('es-CO', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B6268]">Precio congelado:</span>
              <span className="font-bold text-[#7B4B6E]">
                {formatCurrencyFromCents(bookingSuccess.precioCentavos)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-[#6B6268]">Estado:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isPending
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {bookingSuccess.estado.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setBookingSuccess(null)
            setStep(1)
            setSelectedService(null)
            setSelectedTimeSlot(null)
          }}
          className="w-full rounded-xl bg-[#7B4B6E] py-3.5 text-sm font-semibold text-white hover:bg-[#683d5d] transition-colors touch-target"
        >
          Agendar otra cita
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#7B4B6E] hover:underline"
            >
              <ArrowLeft className="h-4 w-4 stroke-[2]" />
              <span>Atrás</span>
            </button>
          )}
          <span className="text-xs font-bold text-[#7B4B6E] tracking-wider uppercase ml-auto">
            Paso {step} de 5
          </span>
        </div>

        <div className="h-1.5 w-full rounded-full bg-[#F3EAF0] overflow-hidden">
          <div
            className="h-full bg-[#7B4B6E] transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </header>

      {step === 1 && (
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-[#1A1618]">1. Selecciona tu Servicio</h2>
            <p className="text-xs text-[#6B6268]">Elige la experiencia que deseas agendar.</p>
          </div>

          <div className="space-y-6">
            {categories.map((cat) => {
              const catServices = services.filter((s) => s.categoryId === cat.id)
              if (catServices.length === 0) return null

              return (
                <div key={cat.id} className="space-y-3">
                  <h3 className="text-sm font-bold text-[#7B4B6E] uppercase tracking-wider">
                    {cat.nombre}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {catServices.map((service) => {
                      const isSelected = selectedService?.id === service.id
                      return (
                        <div
                          key={service.id}
                          onClick={() => {
                            setSelectedService(service)
                            setSelectedProfessional(null)
                            setStep(2)
                          }}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-[#7B4B6E] bg-[#F3EAF0]/40 ring-1 ring-[#7B4B6E]'
                              : 'border-[#F3EAF0] bg-white hover:border-[#7B4B6E]/40'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold text-sm text-[#1A1618]">{service.nombre}</h4>
                              <span className="font-bold text-sm text-[#7B4B6E] shrink-0">
                                {formatCurrencyFromCents(service.precioCentavos)}
                              </span>
                            </div>
                            <p className="text-xs text-[#6B6268]">⏱️ {service.duracionMin} minutos</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {step === 2 && selectedService && (
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-[#1A1618]">2. Elige la Profesional</h2>
            <p className="text-xs text-[#6B6268]">
              Para: <strong className="text-[#1A1618]">{selectedService.nombre}</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => {
                setSelectedProfessional(null)
                setStep(3)
              }}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                selectedProfessional === null
                  ? 'border-[#7B4B6E] bg-[#F3EAF0]/40 ring-1 ring-[#7B4B6E]'
                  : 'border-[#F3EAF0] bg-white hover:border-[#7B4B6E]/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F3EAF0] text-[#7B4B6E]">
                  <Sparkles className="h-5 w-5 stroke-[1.5]" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-[#1A1618]">Cualquiera disponible</h4>
                  <p className="text-xs text-[#6B6268]">Mayor disponibilidad de horarios</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#6B6268]" />
            </div>

            {availableProfs.map((prof) => {
              const isSelected = selectedProfessional?.id === prof.id
              return (
                <div
                  key={prof.id}
                  onClick={() => {
                    setSelectedProfessional(prof)
                    setStep(3)
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-[#7B4B6E] bg-[#F3EAF0]/40 ring-1 ring-[#7B4B6E]'
                      : 'border-[#F3EAF0] bg-white hover:border-[#7B4B6E]/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7B4B6E] text-white font-bold text-sm">
                      {prof.nombre.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-[#1A1618]">{prof.nombre}</h4>
                      <p className="text-xs text-[#6B6268]">{prof.rol}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#6B6268]" />
                </div>
              )
            })}
          </div>
        </section>
      )}

      {step === 3 && selectedService && (
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-[#1A1618]">3. Fecha y Hora</h2>
            <p className="text-xs text-[#6B6268]">
              {selectedService.nombre} · {selectedProfessional ? selectedProfessional.nombre : 'Cualquiera disponible'}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1A1618] uppercase tracking-wider block">
              Selecciona el día
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {dateStrip.map((d) => {
                const isSun = isSunday(d)
                const isSelected = startOfDay(selectedDate).getTime() === d.getTime()
                const dayName = d.toLocaleDateString('es-CO', { weekday: 'short' })
                const dayNum = d.getDate()
                const monthName = d.toLocaleDateString('es-CO', { month: 'short' })

                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => {
                      if (!isSun) {
                        setSelectedDate(d)
                        setSelectedTimeSlot(null)
                      }
                    }}
                    disabled={isSun}
                    className={`flex flex-col items-center justify-center shrink-0 w-16 py-3 rounded-xl border text-xs transition-all ${
                      isSun
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                        : isSelected
                        ? 'border-[#7B4B6E] bg-[#7B4B6E] text-white font-bold shadow-sm'
                        : 'border-[#F3EAF0] bg-white text-[#1A1618] hover:border-[#7B4B6E]/40'
                    }`}
                  >
                    <span className="uppercase text-[10px] font-semibold">{dayName}</span>
                    <span className="text-base font-bold my-0.5">{dayNum}</span>
                    <span className="text-[10px] opacity-80">{isSun ? 'Cerrado' : monthName}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-[#1A1618] uppercase tracking-wider flex items-center justify-between">
              <span>Horarios disponibles</span>
              <span className="text-[11px] font-normal text-[#6B6268]">
                {availableSlots.length} cupos libres
              </span>
            </label>

            {availableSlots.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {availableSlots.map((slot) => {
                  const isSelected = selectedTimeSlot?.getTime() === slot.getTime()
                  const timeStr = slot.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

                  return (
                    <button
                      key={slot.toISOString()}
                      onClick={() => {
                        setSelectedTimeSlot(slot)
                      }}
                      className={`py-2.5 px-3 rounded-lg border text-xs font-semibold transition-all touch-target ${
                        isSelected
                          ? 'border-[#7B4B6E] bg-[#7B4B6E] text-white shadow-sm'
                          : 'border-[#F3EAF0] bg-white text-[#1A1618] hover:border-[#7B4B6E]/40'
                      }`}
                    >
                      {timeStr}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="p-8 rounded-xl border border-dashed border-gray-300 text-center space-y-2">
                <Clock className="h-8 w-8 text-gray-400 mx-auto stroke-[1.5]" />
                <p className="text-sm font-semibold text-[#1A1618]">Sin cupos disponibles para esta fecha</p>
                <p className="text-xs text-[#6B6268]">Por favor selecciona otro día en la barra superior.</p>
              </div>
            )}
          </div>

          {selectedTimeSlot && (
            <button
              onClick={() => setStep(4)}
              className="w-full rounded-xl bg-[#7B4B6E] py-3.5 text-sm font-semibold text-white hover:bg-[#683d5d] transition-colors touch-target mt-4"
            >
              Continuar a mis datos
            </button>
          )}
        </section>
      )}

      {step === 4 && (
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-[#1A1618]">4. Tus Datos de Contacto</h2>
            <p className="text-xs text-[#6B6268]">Ingresa tu información para registrar la reserva.</p>
          </div>

          <div className="space-y-4 max-w-md">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1A1618] block">Nombre completo *</label>
              <input
                type="text"
                placeholder="Ej: María Fernanda Gómez"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full rounded-xl border border-[#F3EAF0] px-4 py-3 text-sm focus:border-[#7B4B6E] focus:outline-none bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1A1618] block">Teléfono Móvil (WhatsApp) *</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400 stroke-[1.5]" />
                <input
                  type="tel"
                  placeholder="Ej: 3001234567"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full rounded-xl border border-[#F3EAF0] pl-10 pr-4 py-3 text-sm focus:border-[#7B4B6E] focus:outline-none bg-white"
                />
              </div>
              <p className="text-[11px] text-[#6B6268]">Te enviaremos los recordatorios a este número.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1A1618] block">Correo electrónico (Opcional)</label>
              <input
                type="email"
                placeholder="ejemplo@correo.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full rounded-xl border border-[#F3EAF0] px-4 py-3 text-sm focus:border-[#7B4B6E] focus:outline-none bg-white"
              />
            </div>

            {clientName && clientPhone && (
              <button
                onClick={() => setStep(5)}
                className="w-full rounded-xl bg-[#7B4B6E] py-3.5 text-sm font-semibold text-white hover:bg-[#683d5d] transition-colors touch-target pt-3"
              >
                Revisar y Confirmar
              </button>
            )}
          </div>
        </section>
      )}

      {step === 5 && selectedService && selectedTimeSlot && (
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-[#1A1618]">5. Confirmación de Cita</h2>
            <p className="text-xs text-[#6B6268]">Por favor verifica el resumen antes de agendar.</p>
          </div>

          <div className="rounded-2xl border border-[#F3EAF0] bg-white p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#F3EAF0] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#1A1618]">{selectedService.nombre}</h3>
                <p className="text-xs text-[#6B6268]">Duración: {selectedService.duracionMin} min</p>
              </div>
              <span className="text-lg font-bold text-[#7B4B6E]">
                {formatCurrencyFromCents(selectedService.precioCentavos)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[#6B6268] block font-medium">Profesional:</span>
                <span className="font-semibold text-[#1A1618] block text-sm">
                  {selectedProfessional ? selectedProfessional.nombre : 'Asignación automática'}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[#6B6268] block font-medium">Fecha y Hora:</span>
                <span className="font-semibold text-[#1A1618] block text-sm">
                  {selectedTimeSlot.toLocaleDateString('es-CO', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}{' '}
                  a las{' '}
                  {selectedTimeSlot.toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[#6B6268] block font-medium">Clienta:</span>
                <span className="font-semibold text-[#1A1618] block text-sm">{clientName}</span>
              </div>

              <div className="space-y-1">
                <span className="text-[#6B6268] block font-medium">Teléfono:</span>
                <span className="font-semibold text-[#1A1618] block text-sm">{clientPhone}</span>
              </div>
            </div>

            {(selectedService.precioCentavos > 20000000 || selectedService.requiereConfirmacion) && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5 stroke-[2]" />
                <p>
                  <strong>Servicio de alta demanda:</strong> Este servicio requiere confirmación manual de nuestro equipo por WhatsApp tras agendar.
                </p>
              </div>
            )}
          </div>

          {bookingError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-700">
                <AlertTriangle className="h-4 w-4 stroke-[2]" />
                <span>No se pudo completar la reserva</span>
              </div>
              <p>{bookingError}</p>

              {alternatives.length > 0 && (
                <div className="pt-2 border-t border-rose-200 space-y-1">
                  <span className="font-semibold block text-[#1A1618]">Próximas alternativas disponibles:</span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {alternatives.map((alt, i) => {
                      const altDate = new Date(alt.start)
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setSelectedTimeSlot(altDate)
                            setBookingError(null)
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-[11px] font-bold text-[#7B4B6E] hover:bg-[#F3EAF0]"
                        >
                          {altDate.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })}{' '}
                          {altDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            disabled={isSubmitting}
            onClick={handleConfirmBooking}
            className="w-full rounded-xl bg-[#7B4B6E] py-4 text-base font-semibold text-white hover:bg-[#683d5d] disabled:opacity-50 transition-colors touch-target shadow-md flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Confirmando reserva...</span>
              </>
            ) : (
              <span>Confirmar Mi Cita</span>
            )}
          </button>
        </section>
      )}
    </div>
  )
}

export default function ReservarPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-sm font-semibold text-[#7B4B6E]">
          Cargando reserva...
        </div>
      }
    >
      <ReservarContent />
    </React.Suspense>
  )
}
