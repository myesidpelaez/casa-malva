/**
 * La guarda que impide que un reintento de Meta duplique una cita (Spec 28 · D3).
 *
 * Meta **reintenta** la entrega si el webhook no contesta 200 a tiempo. Sin esto, un reintento
 * sobre "sí, agéndame esa" crea dos citas. Y no es hipotético: hasta esta spec, `apphosting.yaml`
 * tenía `minInstances: 0`, así que el primer mensaje tras un rato de silencio pagaba arranque en
 * frío — justo el escenario que dispara el reintento.
 *
 * El puerto existe para poder probar la decisión sin Firestore. La implementación de Firestore
 * es deliberadamente delgada: toda la lógica que merece prueba está en quien la consume.
 */

import { getDb } from '@/lib/db'

export interface AlmacenProcesados {
  /**
   * Registra el id y dice si era **nuevo**.
   * `true` → hay que procesarlo. `false` → ya se procesó, hay que ignorarlo.
   *
   * Tiene que ser atómico: dos entregas simultáneas del mismo `wamid` no pueden recibir
   * ambas `true`.
   */
  marcarSiEsNuevo(id: string): Promise<boolean>
}

/** Para pruebas locales sin credenciales. NO sirve en producción: muere con el proceso. */
export function almacenEnMemoria(): AlmacenProcesados {
  const vistos = new Set<string>()
  return {
    async marcarSiEsNuevo(id: string) {
      if (vistos.has(id)) return false
      vistos.add(id)
      return true
    },
  }
}

const COLECCION = 'mensajes_procesados'

/**
 * La de verdad. Usa `create()`, que **falla** si el documento ya existe: es la operación
 * atómica de Firestore para "solo si no está". Un `get` seguido de `set` tendría una ventana
 * de carrera entre ambas llamadas justo del tamaño de un reintento de Meta.
 */
export function almacenFirestore(): AlmacenProcesados {
  return {
    async marcarSiEsNuevo(id: string) {
      try {
        await getDb()
          .collection(COLECCION)
          .doc(id)
          .create({ procesadoEn: new Date().toISOString() })
        return true
      } catch (err: unknown) {
        // code 6 = ALREADY_EXISTS. Es el caso esperado de un reintento, no un fallo.
        const code = (err as { code?: number })?.code
        if (code === 6) return false
        // Cualquier otro error es real y no se traga (regla 3: nada de `catch {}` mudo).
        throw err
      }
    },
  }
}
