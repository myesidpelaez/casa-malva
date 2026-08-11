'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { loginAction } from '@/actions/auth'
import { Shield, Lock, Mail, AlertCircle, Info } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState('admin@casamalva.co')
  const [password, setPassword] = React.useState('admin123')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await loginAction(email, password)
      if (res.ok) {
        localStorage.setItem('casa_malva_admin_session', 'true')
        router.push('/admin')
        router.refresh()
      } else {
        setError(res.error || 'Credenciales incorrectas.')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-[#F3EAF0] bg-white p-8 shadow-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3EAF0] text-[#7B4B6E]">
          <Shield className="h-7 w-7 stroke-[1.5]" />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#1A1618]">Panel de Administración</h1>
          <p className="text-xs text-[#6B6268]">Ingresa tus credenciales para acceder a la agenda local</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#1A1618] block">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400 stroke-[1.5]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#F3EAF0] pl-10 pr-4 py-3 text-sm focus:border-[#7B4B6E] focus:outline-none bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#1A1618] block">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400 stroke-[1.5]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[#F3EAF0] pl-10 pr-4 py-3 text-sm focus:border-[#7B4B6E] focus:outline-none bg-white"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 stroke-[2]" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#7B4B6E] py-3.5 text-sm font-semibold text-white hover:bg-[#683d5d] disabled:opacity-50 transition-colors touch-target shadow-sm"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="pt-4 border-t border-[#F3EAF0] space-y-3">
          <div className="p-3 rounded-xl bg-[#FAF8F9] border border-[#F3EAF0] text-left text-xs text-[#6B6268] space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-[#7B4B6E]">
              <Info className="h-3.5 w-3.5 stroke-[2]" />
              <span>Credenciales Locales (SQLite)</span>
            </div>
            <p>Email: <strong className="text-[#1A1618]">admin@casamalva.co</strong></p>
            <p>Password: <strong className="text-[#1A1618]">admin123</strong></p>
          </div>
        </div>
      </div>
    </div>
  )
}
