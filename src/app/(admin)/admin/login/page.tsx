'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Info, Lock, Mail, TriangleAlert } from 'lucide-react'
import { loginAction } from '@/actions/auth'
import { spring, tween } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Surface } from '@/components/ui/surface'
import { Field } from '@/components/ui/field'

/**
 * Entrada al panel.
 *
 * La sesión es una cookie firmada (HMAC) que valida el middleware en cada
 * petición a `/admin/*`. En la versión anterior había además una marca en
 * `localStorage` que cada página comprobaba: no protegía nada — se ponía a
 * mano desde la consola en dos segundos — y hacía creer que sí.
 * Es el anti-patrón [[04-BIBLIOTECA/patrones/guardianes-que-no-guardan]], así
 * que se eliminó por completo.
 */
export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState('admin@casamalva.co')
  const [password, setPassword] = React.useState('admin123')
  const [entrando, setEntrando] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setEntrando(true)
    setError(null)

    const res = await loginAction(email, password)

    if (res.ok) {
      router.push('/admin')
      router.refresh()
      return
    }

    setEntrando(false)
    setError(res.error ?? 'No se pudo iniciar sesión')
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={spring.gentle}
        className="w-full max-w-[400px]"
      >
        <Surface material="frost" radius="xl" pad="lg" className="space-y-[var(--spacing-fib-3)]">
          <div className="text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-[18px] bg-malva-600 font-display text-2xl font-semibold text-white shadow-[var(--shadow-malva)]">
              M
            </span>
            <h1 className="mt-3 font-display text-[24px] font-semibold text-ink-900">
              Panel del estudio
            </h1>
            <p className="text-[13px] text-ink-500">Casa Malva · Laureles, Medellín</p>
          </div>

          <form onSubmit={entrar} className="space-y-[var(--spacing-fib-2)]">
            <Field
              label="Correo"
              type="email"
              required
              icon={Mail}
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Field
              label="Contraseña"
              type="password"
              required
              icon={Lock}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={tween.fast}
                role="alert"
                className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-danger/25 bg-danger-soft px-3 py-2.5 text-[12.5px] text-danger"
              >
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              size="lg"
              full
              loading={entrando}
              loadingText="Entrando…"
            >
              Entrar
            </Button>
          </form>

          <div className="flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-champagne/60 bg-champagne/20 px-3.5 py-3 text-[12px] leading-relaxed text-ink-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" strokeWidth={2} />
            <div>
              <p className="font-semibold text-ink-700">Credenciales de demostración</p>
              <p className="tnum mt-0.5">admin@casamalva.co · admin123</p>
            </div>
          </div>
        </Surface>

        <div className="mt-4 text-center">
          <Link
            href="/inicio"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-400 transition-colors hover:text-malva-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            Volver al sitio
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
