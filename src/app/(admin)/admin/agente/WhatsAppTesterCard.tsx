'use client'

import { useState, useEffect } from 'react'
import { Send, CheckCircle2, AlertCircle, Smartphone, ShieldCheck, Sparkles, RefreshCw, User, Phone } from 'lucide-react'
import { Surface } from '@/components/ui/surface'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { probarEnvioWhatsAppAction, getWhatsAppConfigStatusAction } from '@/actions/whatsapp'

export function WhatsAppTesterCard() {
  const [telefono, setTelefono] = useState('+57 300 670 7219')
  const [nombre, setNombre] = useState('Mario Peláez')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    ok?: boolean
    simulado?: boolean
    mensajeId?: string
    error?: string
  } | null>(null)

  const [status, setStatus] = useState<{
    configurado: boolean
    phoneNumberId: string
    hasAccessToken: boolean
    templateName: string | null
  }>({
    configurado: false,
    phoneNumberId: '',
    hasAccessToken: false,
    templateName: null,
  })

  useEffect(() => {
    getWhatsAppConfigStatusAction().then((res) => { if (res.ok) setStatus(res.data) })
  }, [])

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const res = await probarEnvioWhatsAppAction({ telefono, nombre })
      if (res.ok) {
        setResult({
          ok: true,
          simulado: res.data.simulado,
          mensajeId: res.data.mensajeId,
        })
      } else {
        setResult({
          ok: false,
          error: res.error || 'Error al procesar el envío',
        })
      }
    } catch (err: unknown) {
      setResult({
        ok: false,
        error: err instanceof Error ? err.message : 'Error inesperado',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Surface pad="lg" radius="xl" material="solid" className="border-2 border-malva-200/80 shadow-sm mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-malva-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
              WhatsApp Business Cloud API
              <Sparkles className="h-4 w-4 text-malva-500" />
            </h3>
            <p className="text-xs text-ink-500">
              Notificaciones transaccionales automáticas para clientas de Casa Malva
            </p>
          </div>
        </div>

        <div>
          {status.configurado ? (
            <Badge tone="success" size="md" className="flex items-center gap-1.5 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Meta Cloud API Conectada ({status.phoneNumberId})
            </Badge>
          ) : (
            <Badge tone="warning" size="md" className="flex items-center gap-1.5 font-semibold">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Modo Simulador de Pruebas (Seguro)
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-5">
        {/* Columna izquierda: Información y Reglas */}
        <div className="space-y-3">
          <div className="rounded-xl bg-malva-50/70 p-3.5 border border-malva-100/70 text-xs text-ink-700 space-y-2">
            <div className="font-semibold text-ink-900 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Arquitectura Oficial de MeJorÍA
            </div>
            <p className="leading-relaxed">
              Cada agendamiento dispara de inmediato una confirmación con fecha, hora, estilista y ubicación en Medellín.
            </p>
            <div className="pt-1.5 border-t border-malva-200/50 flex flex-wrap gap-2 text-xs text-ink-600">
              <span>• Tarifa Meta Utility: <strong>~$3 COP / msg</strong></span>
              <span>• Cero intermediarios</span>
              <span>• 100% automático</span>
            </div>
          </div>

          <div className="text-xs text-ink-500">
            {status.configurado ? (
              <p className="text-emerald-700 font-medium">
                ✅ Credenciales detectadas en <code className="bg-emerald-50 px-1.5 py-0.5 rounded text-xs">.env.local</code>. Los mensajes se envían a la red real de WhatsApp.
              </p>
            ) : (
              <p className="text-amber-800">
                ℹ️ Para conectar tu número real o de pruebas, agrega <code className="bg-amber-100/70 px-1 py-0.5 rounded text-xs">WHATSAPP_ACCESS_TOKEN</code> y <code className="bg-amber-100/70 px-1 py-0.5 rounded text-xs">WHATSAPP_PHONE_NUMBER_ID</code> en <code className="bg-amber-100/70 px-1 py-0.5 rounded text-xs">.env.local</code>.
              </p>
            )}
          </div>
        </div>

        {/* Columna derecha: Formulario de prueba */}
        <form onSubmit={handleTest} className="space-y-3 bg-[var(--card)] p-4 rounded-xl border border-ink-100 shadow-sm">
          <div className="text-xs font-bold text-ink-800 uppercase tracking-wider">
            Probar Envío en Tiempo Real
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Field
              label="Nombre"
              icon={User}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Mario Peláez"
              required
            />
            <Field
              label="WhatsApp / Celular"
              icon={Phone}
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+57 300 670 7219"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10 font-semibold flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Enviando a WhatsApp...
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Disparar Mensaje de Prueba
              </>
            )}
          </Button>

          {result && (
            <div
              className={`p-3 rounded-lg text-xs ${
                result.ok
                  ? result.simulado
                    ? 'bg-amber-50 border border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border border-rose-200 text-rose-900'
              }`}
            >
              {result.ok ? (
                <div className="space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {result.simulado ? 'Mensaje Simulado con Éxito' : '¡Mensaje Entregado a Meta!'}
                  </div>
                  <p className="text-xs opacity-90">
                    {result.simulado
                      ? 'Revisa la consola del servidor para ver el cuerpo exacto del mensaje.'
                      : `ID de mensaje: ${result.mensajeId}`}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    Error en el envío
                  </div>
                  <p className="text-xs opacity-90">{result.error}</p>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </Surface>
  )
}
