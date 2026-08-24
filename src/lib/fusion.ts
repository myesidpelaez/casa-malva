import { docGet, getDb, transaccion } from './db'
import type { Client } from '@/types'

export type ResultadoFusion =
  | { ok: true }
  | { ok: false; error: 'misma_ficha' | 'ficha_no_encontrada' | 'ya_fusionada' | 'demasiados_documentos' }

/** Tope de documentos que se mueven en una fusión. */
export const MAX_DOCS_FUSION = 200

/**
 * Fusiona dos fichas de clienta: la absorbida cede su historial a la superviviente.
 *
 * Vive aquí y no dentro de la Server Action por la misma razón que `decidirAcceso` y
 * `decidirRuta`: `withAuth` necesita `cookies()` de `next/headers`, que solo existe dentro
 * de una petición, así que una fusión envuelta en `withAuth` **no se puede probar desde un
 * script**. Y esto mueve datos de personas reales entre documentos: es lo último que puede
 * quedarse sin gate.
 *
 * No hay copia de esta lógica en ningún sitio: `fusionarClientasAction` llama a esta
 * función, y `scripts/prueba-fusion-nube.ts` llama a esta misma función. Si cambia, cambian
 * las dos a la vez. Ver 04-BIBLIOTECA/patrones/guardianes-que-no-guardan.
 *
 * Garantías:
 * - **Todo o nada.** Citas, cobros y las dos fichas se escriben en una sola transacción.
 *   Una fusión a medias parte el historial en tres en vez de en dos.
 * - **No borra.** La absorbida queda marcada con `fusionadaEn`, así que hay marcha atrás y
 *   las citas viejas que aún la referencien siguen resolviendo un nombre.
 * - **El teléfono viejo sigue encontrando a la clienta**, guardado en `telefonosAlternativos`.
 */
export async function fusionarClientas(
  idSuperviviente: string,
  idAbsorbida: string
): Promise<ResultadoFusion> {
  if (idSuperviviente === idAbsorbida) {
    return { ok: false, error: 'misma_ficha' }
  }

  const superviviente = await docGet<Client>('clients', idSuperviviente)
  const absorbida = await docGet<Client>('clients', idAbsorbida)

  if (!superviviente || !absorbida) {
    return { ok: false, error: 'ficha_no_encontrada' }
  }

  if (superviviente.fusionadaEn || absorbida.fusionadaEn) {
    return { ok: false, error: 'ya_fusionada' }
  }

  const db = getDb()
  const appointmentsSnap = await db.collection('appointments').where('clientId', '==', idAbsorbida).get()
  const chargesSnap = await db.collection('charges').where('clientId', '==', idAbsorbida).get()

  // Una transacción de Firestore topa en 500 escrituras. Fallar a la mitad de mover un
  // historial es peor que no empezar, así que se rechaza antes de tocar nada.
  if (appointmentsSnap.size + chargesSnap.size > MAX_DOCS_FUSION) {
    return { ok: false, error: 'demasiados_documentos' }
  }

  await transaccion(async (tx) => {
    for (const doc of appointmentsSnap.docs) {
      tx.update(doc.ref, { clientId: idSuperviviente })
    }
    for (const doc of chargesSnap.docs) {
      tx.update(doc.ref, { clientId: idSuperviviente })
    }

    const telefonos = new Set(superviviente.telefonosAlternativos || [])
    if (absorbida.telefonoE164 !== superviviente.telefonoE164) {
      telefonos.add(absorbida.telefonoE164)
    }
    for (const t of absorbida.telefonosAlternativos || []) {
      if (t !== superviviente.telefonoE164) telefonos.add(t)
    }

    tx.update(db.doc(`clients/${idSuperviviente}`), {
      telefonosAlternativos: Array.from(telefonos),
    })
    tx.update(db.doc(`clients/${idAbsorbida}`), {
      fusionadaEn: idSuperviviente,
    })
  })

  return { ok: true }
}
