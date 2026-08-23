import type { Metadata } from 'next'
import { getCategoriesAction, getServicesAction } from '@/actions/catalogo'
import { getProfessionalsAction } from '@/actions/profesionales'
import { CatalogoLookbook } from './CatalogoLookbook'

export const revalidate = 0

export const metadata: Metadata = {
  title: 'Lookbook de Servicios y Precios · Casa Malva',
  description:
    'Catálogo visual de Casa Malva, estudio de demostración en Medellín: uñas, cabello, maquillaje, cejas y pestañas con fotografía de acabados reales y reserva en línea.',
}

export default async function ServiciosPage() {
  const [catRes, srvRes, profRes] = await Promise.all([
    getCategoriesAction(),
    getServicesAction(),
    getProfessionalsAction(),
  ])

  const categories = (catRes.ok ? catRes.data : []).filter((c) => c.activa)
  const services = srvRes.ok ? srvRes.data : []
  const professionals = profRes.ok ? profRes.data : []

  return (
    <CatalogoLookbook
      categories={categories}
      services={services}
      professionals={professionals}
    />
  )
}
