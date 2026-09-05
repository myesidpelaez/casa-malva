import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import './globals.css'
import { SonnerToaster } from '@/components/ui/sonner'
import { RevealProvider } from '@/components/common/Reveal'

/**
 * Dos familias, cada una con un trabajo:
 *   - Fraunces (serif suave) para titulares. Es lo femenino y lo cálido.
 *   - Inter para toda la interfaz. Es lo neutro y lo legible a 12px.
 *
 * Una sola familia para ambas cosas era la decisión original de DISENO.md §2;
 * se cambió porque Fraunces a tamaño de interfaz se lee peor y arrastraba
 * toda la app hacia lo "editorial" en vez de hacia lo "producto".
 * Ver docs/adr/0001-estetica-vidrio-y-movimiento.md
 */
// Sin `weight`: se carga como fuente variable y quedan disponibles todos los
// pesos y los ejes SOFT/WONK que usa `.font-display` en globals.css.
// (`weight` y `axes` juntos son incompatibles en next/font.)
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Casa Malva · Estudio de belleza',
    template: '%s · Casa Malva',
  },
  description:
    'Estudio de belleza de demostración en Medellín. Uñas, cabello, maquillaje y cejas. Reserva tu cita en línea.',
  applicationName: 'Casa Malva',
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#faf8f9',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${fraunces.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="antialiased selection:bg-malva-200 selection:text-malva-900">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const urlTema = new URLSearchParams(window.location.search).get('tema');
                const guardado = urlTema || localStorage.getItem('cm:tema');
                if (guardado === 'dark' || (!guardado && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                } else {
                  document.documentElement.setAttribute('data-theme', 'light');
                }
              } catch (e) {}
            `,
          }}
        />
        {/* Telón de fondo. Sin esto, el vidrio no tiene nada que refractar. */}
        <div className="aurora" aria-hidden>
          <div className="aurora-core" />
        </div>
        {children}
        <RevealProvider />
        <SonnerToaster />
      </body>
    </html>
  )
}
