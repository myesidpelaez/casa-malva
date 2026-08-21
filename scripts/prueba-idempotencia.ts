/**
 * Gate G2 de la Spec 28 — que un reintento de Meta no duplique una cita.
 *
 * ⚠️ **Lo que esta prueba SÍ demuestra:** que el contrato de `AlmacenProcesados` es correcto
 * —un id solo puede ser "nuevo" una vez, incluso con entregas simultáneas— y que el agente
 * atiende una sola vez el mismo `wamid`.
 *
 * ⚠️ **Lo que esta prueba NO demuestra:** que Firestore honre ese contrato. `almacenFirestore`
 * se apoya en que `create()` es atómico, y eso solo se comprueba contra la base real.
 * No confundas este verde con aquel.
 */

import * as assert from 'node:assert'
import { almacenEnMemoria, type AlmacenProcesados } from '../src/lib/agente/idempotencia'
import { atender } from '../src/lib/agente/atender'
import { modeloDeGuion } from '../src/lib/agente/llm'
import type { Professional, Service } from '../src/types'

console.log('🧪 Iniciando prueba-idempotencia.ts...')

const ctxFalso = { telefonoE164: '+573006707219', nombre: 'Ana' }

/** Catálogo de mentira: el agente no debe necesitar Firestore para fallar cerrado. */
const catalogoFalso = async (): Promise<{ services: Service[]; professionals: Professional[] }> => ({
  services: [
    {
      id: 'svc_mani',
      categoryId: 'cat_1',
      nombre: 'Manicure',
      duracionMin: 45,
      bufferMin: 15,
      precioCentavos: 5000000,
      requiereConfirmacion: false,
      activo: true,
    },
  ],
  professionals: [
    {
      id: 'prof_ana',
      nombre: 'Ana',
      cargo: 'Manicurista',
      serviceIds: ['svc_mani'],
      horario: { 1: [9, 19], 2: [9, 19], 3: [9, 19], 4: [9, 19], 5: [9, 19], 6: [9, 19] },
      excepciones: [],
      activo: true,
    },
  ],
})

async function main() {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. El contrato del almacén
  // ───────────────────────────────────────────────────────────────────────────
  console.log('1. Probando el contrato de AlmacenProcesados...')

  {
    const almacen = almacenEnMemoria()
    const wamid = 'wamid.HBgMNTczMDA2NzA3MjE5'

    assert.strictEqual(await almacen.marcarSiEsNuevo(wamid), true, 'la primera vez es nuevo')
    assert.strictEqual(await almacen.marcarSiEsNuevo(wamid), false, 'la segunda vez NO es nuevo')
    assert.strictEqual(await almacen.marcarSiEsNuevo(wamid), false, 'ni la tercera')
    assert.strictEqual(await almacen.marcarSiEsNuevo('wamid.OTRO'), true, 'otro id sí es nuevo')
  }

  // Entregas simultáneas del mismo id: exactamente UNA puede ganar.
  {
    const almacen = almacenEnMemoria()
    const resultados = await Promise.all(
      Array.from({ length: 8 }, () => almacen.marcarSiEsNuevo('wamid.SIMULTANEO'))
    )
    const ganadores = resultados.filter(Boolean).length
    assert.strictEqual(ganadores, 1, `exactamente 1 entrega debe ganar, ganaron ${ganadores}`)
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. El uso real: el mismo mensaje entregado dos veces se atiende una sola
  // ───────────────────────────────────────────────────────────────────────────
  console.log('2. Probando que un reintento no vuelve a atender...')

  {
    const almacen: AlmacenProcesados = almacenEnMemoria()
    let vecesAtendido = 0

    // Réplica de la guarda del route: idempotencia ANTES de cualquier trabajo.
    async function procesar(wamid: string): Promise<void> {
      if (!(await almacen.marcarSiEsNuevo(wamid))) return
      vecesAtendido++
    }

    const wamid = 'wamid.REINTENTO'
    await procesar(wamid)
    await procesar(wamid) // el reintento de Meta
    await procesar(wamid) // y el segundo reintento

    assert.strictEqual(vecesAtendido, 1, `se atendió ${vecesAtendido} veces, debía ser 1`)
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. El agente ante un modelo que se porta mal: escala, nunca improvisa
  // ───────────────────────────────────────────────────────────────────────────
  console.log('3. Probando que el agente falla cerrado...')

  // 3.1 · Un mensaje que no es texto ni siquiera llega al modelo (ni gasta un centavo).
  {
    const r = await atender(
      { ctx: ctxFalso, conocida: false, historial: [], mensaje: '', tipo: 'audio' },
      { modelo: modeloDeGuion([]), cargarCatalogo: catalogoFalso }
    )
    assert.strictEqual(r.escalado, true, 'un audio se escala')
    assert.ok(r.texto.length > 0, 'siempre se le responde algo a la clienta')
  }

  // 3.2 · Un modelo que devuelve basura NO puede producir una respuesta inventada.
  {
    const r = await atender(
      { ctx: ctxFalso, conocida: false, historial: [], mensaje: 'hola', tipo: 'text' },
      { modelo: modeloDeGuion(['esto no es un JSON de plan']), cargarCatalogo: catalogoFalso }
    )
    assert.strictEqual(r.escalado, true, 'un plan ilegible se escala')
  }

  // 3.3 · Un modelo caído tampoco: se escala, no se improvisa.
  {
    const r = await atender(
      { ctx: ctxFalso, conocida: false, historial: [], mensaje: 'hola', tipo: 'text' },
      { modelo: modeloDeGuion([]), cargarCatalogo: catalogoFalso }
    )
    assert.strictEqual(r.escalado, true, 'si el modelo falla, se escala')
  }

  // 3.4 · Un modelo que responde bien, responde bien. (Si no, las de arriba no valdrían:
  //       una prueba que solo ve rojos no distingue "falla cerrado" de "siempre falla".)
  {
    const r = await atender(
      { ctx: ctxFalso, conocida: true, historial: [], mensaje: 'hola', tipo: 'text' },
      {
        modelo: modeloDeGuion(['{"intencion":"responder","texto":"¡Hola Ana! ¿En qué te ayudo?"}']),
        cargarCatalogo: catalogoFalso,
      }
    )
    assert.strictEqual(r.escalado, false, 'una respuesta válida NO se escala')
    assert.strictEqual(r.texto, '¡Hola Ana! ¿En qué te ayudo?')
  }

  console.log('✅ Todas las pruebas de idempotencia y fallo cerrado pasaron exitosamente.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
