import Link from 'next/link'
import { Calendar, ArrowLeft, Sparkles } from 'lucide-react'

export default function ReservarPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center space-y-6">
      <Link href="/inicio" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B6268] hover:text-[#7B4B6E]">
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Volver a inicio</span>
      </Link>

      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F3EAF0] text-[#7B4B6E] mx-auto">
        <Calendar className="h-8 w-8 stroke-[1.5]" />
      </div>

      <h1 className="text-3xl font-semibold text-[#1A1618]">Agendamiento en Línea</h1>
      <p className="text-sm text-[#6B6268] max-w-md mx-auto">
        El asistente interactivo de agendamiento estará habilitado en la siguiente fase. Puedes explorar el catálogo de servicios.
      </p>

      <div className="pt-4">
        <Link
          href="/servicios"
          className="inline-flex items-center gap-2 rounded-xl bg-[#7B4B6E] px-6 py-3 text-sm font-semibold text-white hover:bg-[#683d5d] transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          <span>Ver catálogo de servicios</span>
        </Link>
      </div>
    </div>
  )
}
