import Link from 'next/link'
import { Sparkles, Calendar, AlertCircle } from 'lucide-react'
import { getCategoriesAction, getServicesAction } from '@/actions/catalogo'
import { formatCurrencyFromCents } from '@/lib/currency'
import type { Category, Service } from '@/types'

export const revalidate = 0

export default async function ServiciosPage() {
  const catRes = await getCategoriesAction()
  const srvRes = await getServicesAction()

  const categories: Category[] = catRes.ok ? catRes.data : []
  const services: Service[] = srvRes.ok ? srvRes.data : []

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10 space-y-8">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F3EAF0] px-3.5 py-1 text-xs font-semibold text-[#7B4B6E]">
          <Sparkles className="h-3.5 w-3.5 stroke-[1.5]" />
          <span>Catálogo de Experiencias</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold text-[#1A1618]">Nuestros Servicios</h1>
        <p className="text-sm text-[#6B6268] max-w-md mx-auto">
          Precios transparentes y tiempos dedicados exclusivamente para ti.
        </p>
      </header>

      {categories.map((category) => {
        const catServices = services.filter((s) => s.categoryId === category.id)
        if (catServices.length === 0) return null

        return (
          <section key={category.id} className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#F3EAF0] pb-2">
              <h2 className="text-xl font-semibold text-[#1A1618] flex items-center gap-2">
                <span>{category.nombre}</span>
              </h2>
              <span className="text-xs text-[#6B6268]">{catServices.length} servicios</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {catServices.map((service) => {
                const isOverThreshold = service.precioCentavos > 20000000 || service.requiereConfirmacion
                const isDisabled = !service.activo || !category.activa

                return (
                  <div
                    key={service.id}
                    className={`p-5 rounded-2xl border bg-white flex flex-col justify-between transition-all ${
                      isDisabled
                        ? 'opacity-60 border-gray-200 bg-gray-50/50'
                        : 'border-[#F3EAF0] hover:border-[#7B4B6E]/40 hover:shadow-sm'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={`font-semibold text-base ${
                            isDisabled ? 'line-through text-gray-400' : 'text-[#1A1618]'
                          }`}
                        >
                          {service.nombre}
                        </h3>
                        <span className="font-bold text-base text-[#7B4B6E] shrink-0">
                          {formatCurrencyFromCents(service.precioCentavos)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B6268]">
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#FAF8F9] px-2 py-1 border border-[#F3EAF0]">
                          ⏱️ {service.duracionMin} min
                        </span>

                        {isOverThreshold && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-amber-700 border border-amber-200 font-medium">
                            <AlertCircle className="h-3 w-3 stroke-[2]" />
                            Requiere confirmación
                          </span>
                        )}

                        {isDisabled && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-gray-500 font-medium">
                            No disponible
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#F3EAF0]/60 flex items-center justify-between">
                      <span className="text-[11px] text-[#6B6268]">
                        Buffer: {service.bufferMin} min
                      </span>

                      {!isDisabled ? (
                        <Link
                          href={`/reservar?serviceId=${service.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#7B4B6E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#683d5d] transition-colors touch-target"
                        >
                          <Calendar className="h-3.5 w-3.5 stroke-[1.5]" />
                          <span>Agendar</span>
                        </Link>
                      ) : (
                        <button
                          disabled
                          className="rounded-lg bg-gray-200 px-4 py-2 text-xs font-semibold text-gray-400 cursor-not-allowed"
                        >
                          Agotado
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
