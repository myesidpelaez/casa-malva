import type { Metadata } from 'next'
import { getCategoriesAction, getServicesAction } from '@/actions/catalogo'
import { getProfessionalsAction } from '@/actions/profesionales'
import { ReservaWizard } from './ReservaWizard'
import { BadgeApertura } from '@/components/brand/Apertura'

export const revalidate = 0

export const metadata: Metadata = {
  title: 'Reservar cita',
  description: 'Reserva tu cita en Casa Malva: elige servicio, profesional, día y hora.',
}

/**
 * El catálogo y el equipo se resuelven en el servidor, así que la pantalla
 * llega ya con contenido. La disponibilidad —lo único que cambia minuto a
 * minuto— se consulta bajo demanda desde el asistente.
 *
 * `serviceId` se lee **aquí**, no con `useSearchParams()` en el cliente: ese
 * hook obliga a Next a renderizar el fallback de Suspense y delegar la página
 * entera en el navegador, y la pantalla se quedaba en el esqueleto de carga.
 *
 * Spec: docs/specs/05-reserva-web.md
 */
export default async function ReservarPage({
  searchParams,
}: {
  searchParams: Promise<{ serviceId?: string }>
}) {
  const [{ serviceId }, catRes, srvRes, profRes] = await Promise.all([
    searchParams,
    getCategoriesAction(),
    getServicesAction(),
    getProfessionalsAction(),
  ])

  return (
    <ReservaWizard
      serviceIdInicial={serviceId ?? null}
      estado={<BadgeApertura />}
      categories={(catRes.ok ? catRes.data : []).filter((c) => c.activa)}
      services={(srvRes.ok ? srvRes.data : []).filter((s) => s.activo)}
      professionals={(profRes.ok ? profRes.data : []).filter((p) => p.activo)}
    />
  )
}
