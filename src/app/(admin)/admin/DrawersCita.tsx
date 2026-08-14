'use client'

import * as React from 'react'
import { Sheet } from '@/components/ui/sheet'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Surface } from '@/components/ui/surface'
import { toast } from 'sonner'
import { 
  crearCitaAdminAction, 
  reagendarCitaAction, 
  registrarCobroAction, 
  franjasDelDiaAction 
} from '@/actions/citas'
import type { Appointment, Client, Professional, Service, MetodoPago } from '@/types'
import { formatCurrencyFromCents } from '@/lib/currency'
import { fechaHoraCorta } from '@/lib/fechas'

type Franja = { inicioUtc: string; professionalId: string; professionalNombre: string }

// --- Drawer: Cobrar ---
export function DrawerCobro({
  cita,
  servicio,
  onClose,
  onSuccess
}: {
  cita: Appointment | null
  servicio?: Service
  onClose: () => void
  onSuccess: () => void
}) {
  const [descuento, setDescuento] = React.useState('0')
  const [propina, setPropina] = React.useState('0')
  const [metodo, setMetodo] = React.useState<MetodoPago>('efectivo')
  const [nota, setNota] = React.useState('')
  const [cargando, setCargando] = React.useState(false)

  if (!cita || !servicio) return null

  const precio = cita.precioCentavos
  const desc = parseInt(descuento) || 0
  const prop = parseInt(propina) || 0
  const totalACobrar = precio - desc
  const totalRecibido = totalACobrar + prop

  async function handleCobrar() {
    if (desc > precio) {
      toast.error('El descuento no puede ser mayor al precio')
      return
    }
    setCargando(true)
    const res = await registrarCobroAction(cita!.id, {
      descuentoCentavos: desc,
      propinaCentavos: prop,
      metodoPago: metodo,
      nota
    })
    setCargando(false)
    if (!res.ok) {
      toast.error(res.error)
    } else {
      toast.success('Cobro registrado y cita completada')
      onSuccess()
      onClose()
    }
  }

  const metodos: { id: MetodoPago; label: string }[] = [
    { id: 'efectivo', label: 'Efectivo' },
    { id: 'nequi', label: 'Nequi' },
    { id: 'daviplata', label: 'Daviplata' },
    { id: 'tarjeta', label: 'Tarjeta' },
    { id: 'transferencia', label: 'Transferencia' }
  ]

  return (
    <Sheet
      open={!!cita}
      onOpenChange={(op) => !op && onClose()}
      title="Cobrar servicio"
      description="Registra el pago para cerrar la cita."
      size="md"
      footer={
        <div className="flex gap-2">
          <Button variant="glass" full onClick={onClose} disabled={cargando}>Cancelar</Button>
          <Button variant="primary" full loading={cargando} onClick={handleCobrar}>
            Cobrar {formatCurrencyFromCents(totalRecibido)}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Surface material="frost" radius="md" pad="sm" className="flex justify-between items-center">
          <span className="text-sm text-ink-600">Precio de lista:</span>
          <span className="font-semibold text-ink-900">{formatCurrencyFromCents(precio)}</span>
        </Surface>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Descuento ($)"
            type="number"
            value={descuento}
            onChange={(e) => setDescuento(e.target.value)}
          />
          <Field
            label="Propina ($)"
            type="number"
            value={propina}
            onChange={(e) => setPropina(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-ink-700 mb-2 block">Método de pago</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {metodos.map(m => (
              <Button
                key={m.id}
                variant={metodo === m.id ? 'primary' : 'glass'}
                onClick={() => setMetodo(m.id)}
                className="h-12"
              >
                {m.label}
              </Button>
            ))}
          </div>
        </div>

        <Field
          label="Nota (opcional)"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
      </div>
    </Sheet>
  )
}

// --- Drawer: Reagendar ---
export function DrawerReagendar({
  cita,
  onClose,
  onSuccess
}: {
  cita: Appointment | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [fechaStr, setFechaStr] = React.useState(() => new Date().toISOString().split('T')[0])
  const [franjas, setFranjas] = React.useState<Franja[]>([])
  const [seleccionada, setSeleccionada] = React.useState('')
  const [cargando, setCargando] = React.useState(false)
  const [buscando, setBuscando] = React.useState(false)

  React.useEffect(() => {
    if (!cita || !fechaStr) return
    const buscar = async () => {
      setBuscando(true)
      const res = await franjasDelDiaAction(cita.serviceId, fechaStr, cita.professionalId)
      setBuscando(false)
      if (res.ok) setFranjas(res.data)
      else setFranjas([])
      setSeleccionada('')
    }
    buscar()
  }, [cita, fechaStr])

  async function handleReagendar() {
    if (!seleccionada) return
    setCargando(true)
    const res = await reagendarCitaAction(cita!.id, seleccionada)
    setCargando(false)
    if (!res.ok) {
      toast.error(res.error)
    } else {
      toast.success('Cita reagendada')
      onSuccess()
      onClose()
    }
  }

  return (
    <Sheet
      open={!!cita}
      onOpenChange={(op) => !op && onClose()}
      title="Reagendar cita"
      description="Selecciona una nueva fecha y hora para la cita."
      size="sm"
      footer={
        <div className="flex gap-2">
          <Button variant="glass" full onClick={onClose} disabled={cargando}>Cancelar</Button>
          <Button variant="primary" full loading={cargando} disabled={!seleccionada} onClick={handleReagendar}>
            Reagendar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field
          label="Nueva Fecha"
          type="date"
          value={fechaStr}
          onChange={(e) => setFechaStr(e.target.value)}
        />
        <div>
          <label className="text-sm font-medium text-ink-700 mb-2 block">Horas disponibles</label>
          {buscando ? (
            <div className="text-sm text-ink-500">Buscando...</div>
          ) : franjas.length === 0 ? (
            <div className="text-sm text-ink-500">No hay disponibilidad este día</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {franjas.map(f => (
                <Button
                  key={f.inicioUtc}
                  variant={seleccionada === f.inicioUtc ? 'primary' : 'glass'}
                  onClick={() => setSeleccionada(f.inicioUtc)}
                >
                  {new Date(f.inicioUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  )
}

// --- Drawer: Nueva Cita ---
export function DrawerNuevaCita({
  open,
  onClose,
  onSuccess,
  clientas,
  servicios,
  profesionales
}: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  clientas: Client[]
  servicios: Service[]
  profesionales: Professional[]
}) {
  const [step, setStep] = React.useState(1)
  const [telefono, setTelefono] = React.useState('')
  const [nombre, setNombre] = React.useState('')
  const [serviceId, setServiceId] = React.useState('')
  const [professionalId, setProfessionalId] = React.useState('')
  const [fechaStr, setFechaStr] = React.useState(() => new Date().toISOString().split('T')[0])
  const [inicioUtc, setInicioUtc] = React.useState('')
  
  const [franjas, setFranjas] = React.useState<Franja[]>([])
  const [buscando, setBuscando] = React.useState(false)
  const [cargando, setCargando] = React.useState(false)

  React.useEffect(() => {
    if (step === 4 && serviceId && professionalId && fechaStr) {
      const buscar = async () => {
        setBuscando(true)
        const res = await franjasDelDiaAction(serviceId, fechaStr, professionalId)
        setBuscando(false)
        if (res.ok) setFranjas(res.data)
        else setFranjas([])
      }
      buscar()
    }
  }, [step, serviceId, professionalId, fechaStr])

  const clienteExistente = clientas.find(c => c.telefonoE164.includes(telefono))

  async function handleConfirmar() {
    setCargando(true)
    const res = await crearCitaAdminAction({
      clientId: clienteExistente?.id,
      clienteTelefono: telefono,
      clienteNombre: nombre,
      serviceId,
      professionalId,
      inicioUtc,
      origen: 'admin',
      creadaPor: 'Recepción'
    })
    setCargando(false)
    if (!res.ok) {
      toast.error(res.error)
    } else {
      toast.success('Cita agendada exitosamente')
      onSuccess()
      onClose()
      setTimeout(() => setStep(1), 300)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(op) => !op && onClose()}
      title="Nueva cita"
      description={`Paso ${step} de 5`}
      size="md"
      footer={
        <div className="flex gap-2">
          {step > 1 && (
            <Button variant="glass" onClick={() => setStep(s => s - 1)}>Atrás</Button>
          )}
          <Button variant="glass" className="flex-1" onClick={onClose}>Cancelar</Button>
          {step < 5 ? (
            <Button 
              variant="primary" 
              className="flex-1"
              onClick={() => setStep(s => s + 1)}
              disabled={
                (step === 1 && !telefono) ||
                (step === 2 && !serviceId) ||
                (step === 3 && !professionalId) ||
                (step === 4 && !inicioUtc)
              }
            >
              Siguiente
            </Button>
          ) : (
            <Button variant="primary" className="flex-1" loading={cargando} onClick={handleConfirmar}>
              Confirmar
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {step === 1 && (
          <div className="space-y-3">
            <Field
              label="Teléfono de la clienta"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej: 3001234567"
            />
            {clienteExistente ? (
              <Surface pad="sm" material="frost" radius="md">
                <span className="text-sm font-semibold">{clienteExistente.nombre}</span>
              </Surface>
            ) : telefono.length >= 10 ? (
              <Field
                label="Nombre (Clienta nueva)"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            ) : null}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Selecciona un servicio</label>
            <div className="space-y-1">
              {servicios.filter(s => s.activo).map(s => (
                <div key={s.id} onClick={() => setServiceId(s.id)} className="cursor-pointer">
                  <Surface
                    material={serviceId === s.id ? 'solid' : 'frost'}
                    radius="md"
                    pad="sm"
                    className="w-full text-left"
                  >
                    <div className="font-medium">{s.nombre}</div>
                    <div className="text-xs text-ink-500">{formatCurrencyFromCents(s.precioCentavos)} - {s.duracionMin} min</div>
                  </Surface>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Selecciona profesional</label>
            <div className="space-y-1">
              {profesionales.filter(p => p.activo && p.serviceIds.includes(serviceId)).map(p => (
                <div key={p.id} onClick={() => setProfessionalId(p.id)} className="cursor-pointer">
                  <Surface
                    material={professionalId === p.id ? 'solid' : 'frost'}
                    radius="md"
                    pad="sm"
                    className="w-full text-left"
                  >
                    <div className="font-medium">{p.nombre}</div>
                  </Surface>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <Field
              label="Día"
              type="date"
              value={fechaStr}
              onChange={(e) => setFechaStr(e.target.value)}
            />
            <div>
              <label className="text-sm font-medium mb-2 block">Franja libre</label>
              {buscando ? (
                <div className="text-sm text-ink-500">Buscando...</div>
              ) : franjas.length === 0 ? (
                <div className="text-sm text-ink-500">No hay disponibilidad</div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {franjas.map(f => (
                    <Button
                      key={f.inicioUtc}
                      variant={inicioUtc === f.inicioUtc ? 'primary' : 'glass'}
                      onClick={() => setInicioUtc(f.inicioUtc)}
                    >
                      {new Date(f.inicioUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <Surface material="frost" radius="md" pad="sm" className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-ink-500">Clienta:</span>
                <span className="text-sm font-medium">{clienteExistente?.nombre || nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-ink-500">Servicio:</span>
                <span className="text-sm font-medium">{servicios.find(s => s.id === serviceId)?.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-ink-500">Profesional:</span>
                <span className="text-sm font-medium">{profesionales.find(p => p.id === professionalId)?.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-ink-500">Cuándo:</span>
                <span className="text-sm font-medium">{inicioUtc ? fechaHoraCorta(inicioUtc) : ''}</span>
              </div>
            </Surface>
          </div>
        )}
      </div>
    </Sheet>
  )
}
