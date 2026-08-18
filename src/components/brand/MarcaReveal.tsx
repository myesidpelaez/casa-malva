'use client'

import * as React from 'react'
import { decidirRevelacion } from '@/lib/marca'
import { Marca, type MarcaProps } from './Marca'

const CLAVE_SESION_REVELADA = 'cm:marca-revelada'

/**
 * Decisión cacheada para toda la carga de página.
 *
 * `getSnapshot` de `useSyncExternalStore` **tiene que ser idempotente**: React lo
 * llama varias veces por render y compara el resultado consigo mismo. La versión
 * anterior leía y ESCRIBÍA `sessionStorage` dentro de `getSnapshot`, así que
 * devolvía `true` la primera llamada y `false` en todas las siguientes.
 *
 * Consecuencia medida en navegador el 2026-08-18: la bandera de sesión se
 * marcaba, la clase `.marca-reveal` **nunca llegaba al DOM** y la revelación no
 * corría jamás. El gate no lo vio porque solo cubre el módulo puro.
 *
 * Aquí el efecto ocurre **una sola vez** y el valor queda cacheado: a partir de
 * ahí `getSnapshot` devuelve siempre lo mismo.
 */
let decisionCacheada: boolean | null = null

function decidirUnaVez(): boolean {
  if (decisionCacheada !== null) return decisionCacheada

  try {
    const yaRevelada = sessionStorage.getItem(CLAVE_SESION_REVELADA) !== null
    const prefiereReducido =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    decisionCacheada = decidirRevelacion(yaRevelada, prefiereReducido)

    if (decisionCacheada) {
      sessionStorage.setItem(CLAVE_SESION_REVELADA, '1')
    }
  } catch {
    // `sessionStorage` bloqueado (modo privado, cookies de terceros denegadas).
    // Falla ABIERTO: la marca se queda visible y estática. Nunca invisible (D3).
    decisionCacheada = false
  }

  return decisionCacheada
}

/** La decisión no cambia durante la carga: no hay nada a lo que suscribirse. */
function suscribir() {
  return () => {}
}

function getSnapshot(): boolean {
  return decidirUnaVez()
}

function getServerSnapshot(): boolean {
  return false
}

/**
 * Renderiza la marca ejecutando la revelación **una sola vez por sesión** (D4).
 * En recargas posteriores y en navegaciones internas se pinta estática y
 * visible (D3).
 */
export function MarcaReveal(props: MarcaProps) {
  const animar = React.useSyncExternalStore(suscribir, getSnapshot, getServerSnapshot)

  return <Marca {...props} animate={animar ? 'reveal' : props.animate} />
}

/** Solo para pruebas: olvida la decisión cacheada de esta carga de página. */
export function __reiniciarDecisionRevelacion() {
  decisionCacheada = null
}
