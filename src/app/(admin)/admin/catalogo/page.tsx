import { BookOpen } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'

export default function AdminCatalogoPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="border-b border-[#F3EAF0] pb-4">
        <h1 className="text-2xl font-semibold text-[#1A1618]">Catálogo de Servicios</h1>
        <p className="text-xs text-[#6B6268]">Categorías, servicios, precios y tiempos de buffer</p>
      </div>

      <EmptyState
        icon={BookOpen}
        title="Módulo de Catálogo (Fase 2)"
        description="Aquí podrás crear, editar y desactivar categorías y servicios. Los datos del seed inicial ya están cargados en Firestore."
      />
    </div>
  )
}
