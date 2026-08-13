'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Entrada de contenido al entrar en pantalla.
 *
 * Está hecho con CSS y un IntersectionObserver, **no con framer-motion**, por
 * una razón concreta: la versión anterior arrancaba en `opacity: 0` y dependía
 * de que la librería ejecutara fotogramas para devolver el contenido. En
 * cualquier entorno donde no corran (JS bloqueado, pestaña en segundo plano al
 * primer pintado, webview rara) la portada se quedaba **en blanco**.
 *
 * Tres redes, en orden:
 *   1. Sin la clase `.js` en <html>, ninguna regla esconde nada.
 *   2. El observador revela cada bloque al asomar.
 *   3. Un temporizador revela TODO a los 1500 ms pase lo que pase.
 *
 * Con `prefers-reduced-motion`, la regla de ocultar ni siquiera existe.
 */

/** Se activa una sola vez por página: enciende el observador y el seguro. */
function useRevelador() {
  React.useEffect(() => {
    const raiz = document.documentElement
    raiz.classList.add('js')

    const bloques = Array.from(document.querySelectorAll<HTMLElement>('.reveal'))

    // Red 3: pase lo que pase, a los 1500 ms se ve todo.
    const seguro = window.setTimeout(() => raiz.classList.add('reveal-todo'), 1500)

    if (!('IntersectionObserver' in window)) {
      raiz.classList.add('reveal-todo')
      return () => window.clearTimeout(seguro)
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            entrada.target.classList.add('is-in')
            observador.unobserve(entrada.target)
          }
        }
      },
      { rootMargin: '0px 0px -60px 0px', threshold: 0.01 }
    )

    bloques.forEach((b) => observador.observe(b))

    return () => {
      window.clearTimeout(seguro)
      observador.disconnect()
    }
  }, [])
}

/** Va una sola vez, en el layout. Enciende el sistema para toda la página. */
export function RevealProvider() {
  useRevelador()
  return null
}

type Etiqueta = 'div' | 'section' | 'article' | 'li' | 'ul' | 'header'

function claseReveal(variant: 'up' | 'pop', delay: number, className?: string) {
  return cn('reveal', variant === 'pop' && 'reveal-pop', className)
}

export function Reveal({
  children,
  className,
  variant = 'up',
  delay = 0,
  as: Comp = 'div',
}: {
  children: React.ReactNode
  className?: string
  variant?: 'up' | 'pop'
  /** Retardo en segundos, para escalonar a mano. */
  delay?: number
  as?: Etiqueta
}) {
  return (
    <Comp
      className={claseReveal(variant, delay, className)}
      style={delay ? ({ '--reveal-delay': `${delay * 1000}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Comp>
  )
}

/**
 * Contenedor que escalona a sus hijos `<RevealItem>`.
 * El escalonado es un `--reveal-delay` calculado por índice: sin estado, sin
 * coordinación entre componentes.
 */
export function RevealGroup({
  children,
  className,
  each = 0.06,
  as: Comp = 'div',
}: {
  children: React.ReactNode
  className?: string
  each?: number
  as?: Etiqueta
}) {
  const hijos = React.Children.toArray(children)

  return (
    <Comp className={className}>
      {hijos.map((hijo, i) =>
        React.isValidElement<{ style?: React.CSSProperties }>(hijo)
          ? React.cloneElement(hijo, {
              key: hijo.key ?? i,
              style: {
                ...(hijo.props.style ?? {}),
                ['--reveal-delay' as string]: `${Math.round(i * each * 1000)}ms`,
              } as React.CSSProperties,
            })
          : hijo
      )}
    </Comp>
  )
}

export function RevealItem({
  children,
  className,
  variant = 'up',
  as: Comp = 'div',
  style,
}: {
  children: React.ReactNode
  className?: string
  variant?: 'up' | 'pop'
  as?: Etiqueta
  style?: React.CSSProperties
}) {
  return (
    <Comp className={claseReveal(variant, 0, className)} style={style}>
      {children}
    </Comp>
  )
}
