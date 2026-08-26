import type { Metadata } from 'next'
import { getCategoriesAction, getServicesAction } from '@/actions/catalogo'
import { getProfessionalsAction } from '@/actions/profesionales'
import { CatalogoLookbook } from './CatalogoLookbook'
import { BadgeApertura } from '@/components/brand/Apertura'

export const revalidate = 0

export const metadata: Metadata = {
  title: 'Lookbook de Especialidades y Cuidado · Casa Malva',
  description:
    'Catálogo y lookbook de Casa Malva en Medellín: uñas, cabello, maquillaje, cejas y pestañas. Experiencias de autor en manos de especialistas expertas con cosmética botánica.',
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
      estado={<BadgeApertura />}
    />
  )
}
