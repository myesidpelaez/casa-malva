import type { Metadata } from 'next'
import { FlyerContent } from './FlyerContent'

export const metadata: Metadata = {
  title: 'Carta de Presentación & Flyer Comercial | Casa Malva & MeJorÍA',
  description:
    'Plataforma integral de reservas 24/7 y catálogo digital Lookbook para centros de estética, peluquerías y spas en Medellín. Desarrollado por MeJorÍA.',
}

export default function FlyerPage() {
  return <FlyerContent />
}
