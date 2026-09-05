import { NextResponse } from 'next/server'
import { createSession } from '@/lib/auth'

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 })
  }

  await createSession({
    id: 'usr_admin_1',
    email: 'admin@casamalva.co',
    nombre: 'Dueña Casa Malva',
    rol: 'admin',
  })

  const url = new URL('/admin/catalogo', request.url)
  return NextResponse.redirect(url)
}
