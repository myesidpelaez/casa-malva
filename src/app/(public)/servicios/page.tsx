import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function ServiciosPage() {
  const catalog = [
    {
      categoria: 'Uñas 💅',
      servicios: [
        { nombre: 'Manicure tradicional', duracion: '40 min', precio: '$28.000' },
        { nombre: 'Manicure semipermanente', duracion: '60 min', precio: '$55.000' },
        { nombre: 'Pedicure spa', duracion: '60 min', precio: '$45.000' },
        { nombre: 'Uñas acrílicas', duracion: '120 min', precio: '$130.000' },
        { nombre: 'Retiro de semipermanente', duracion: '30 min', precio: '$20.000' },
      ],
    },
    {
      categoria: 'Cabello ✂️',
      servicios: [
        { nombre: 'Corte y peinado', duracion: '60 min', precio: '$65.000' },
        { nombre: 'Cepillado', duracion: '45 min', precio: '$38.000' },
        { nombre: 'Hidratación profunda', duracion: '60 min', precio: '$85.000' },
        { nombre: 'Color de raíz', duracion: '120 min', precio: '$180.000' },
        { nombre: 'Balayage', duracion: '240 min', precio: '$420.000', requiereConfirmacion: true },
        { nombre: 'Keratina', duracion: '180 min', precio: '$290.000', requiereConfirmacion: true },
      ],
    },
    {
      categoria: 'Maquillaje 💄',
      servicios: [
        { nombre: 'Social', duracion: '60 min', precio: '$110.000' },
        { nombre: 'Novia', duracion: '120 min', precio: '$320.000', requiereConfirmacion: true },
      ],
    },
    {
      categoria: 'Cejas y pestañas 👁️',
      servicios: [
        { nombre: 'Diseño de cejas', duracion: '30 min', precio: '$35.000' },
        { nombre: 'Laminado de cejas', duracion: '60 min', precio: '$95.000' },
        { nombre: 'Lifting de pestañas', duracion: '75 min', precio: '$130.000' },
      ],
    },
  ]

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8">
      <div className="flex items-center justify-between border-b border-[#F3EAF0] pb-4">
        <div>
          <Link href="/inicio" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B6268] hover:text-[#7B4B6E] mb-2">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Volver a inicio</span>
          </Link>
          <h1 className="text-3xl font-semibold text-[#1A1618]">Catálogo de Servicios</h1>
          <p className="text-sm text-[#6B6268]">Precios y tiempos calibrados para Laureles, Medellín</p>
        </div>
      </div>

      <div className="space-y-8">
        {catalog.map((cat) => (
          <div key={cat.categoria} className="space-y-4">
            <h2 className="text-xl font-semibold text-[#7B4B6E] flex items-center gap-2">
              <span>{cat.categoria}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cat.servicios.map((srv) => (
                <div
                  key={srv.nombre}
                  className="p-4 rounded-xl border border-[#F3EAF0] bg-white flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-semibold text-sm text-[#1A1618]">{srv.nombre}</h3>
                    <p className="text-xs text-[#6B6268]">{srv.duracion}</p>
                    {srv.requiereConfirmacion && (
                      <span className="inline-block mt-1 text-[10px] font-semibold text-[#7B4B6E] bg-[#F3EAF0] px-2 py-0.5 rounded-full">
                        Requiere confirmación
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-base text-[#1A1618]">{srv.precio}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
