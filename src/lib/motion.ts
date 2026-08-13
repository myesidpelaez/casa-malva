/**
 * Presets de animación de Casa Malva.
 *
 * Una sola fuente para el movimiento de toda la app. Si un componente inventa
 * su propia duración o su propio easing, la interfaz deja de sentirse como un
 * mismo objeto — que es exactamente lo que se nota (sin saber por qué) al
 * comparar una app de Apple con una que no lo es.
 *
 * Dos familias:
 *   - `spring.*`  para todo lo que responde a un dedo o un cursor (físico).
 *   - `tween.*`   para entradas y salidas de contenido (dirigido).
 *
 * Especificación: docs/specs/10-sistema-diseno.md §4
 */
import type { Transition, Variants } from 'framer-motion'

/** Curva "expo out": arranca rápido y frena largo. Es la firma de iOS. */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const
export const EASE_IN_OUT_SOFT = [0.4, 0, 0.2, 1] as const

export const spring = {
  /** Botones, chips, cualquier cosa que se presiona. Responde y para. */
  snappy: { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 },
  /** Paneles y tarjetas. Con un punto de rebote, sin llegar a ser un juguete. */
  gentle: { type: 'spring', stiffness: 240, damping: 26, mass: 0.9 },
  /** Modales y hojas. Pesado, con presencia. */
  weighty: { type: 'spring', stiffness: 180, damping: 24, mass: 1.1 },
  /** Indicadores que se deslizan entre posiciones (layoutId). */
  glide: { type: 'spring', stiffness: 320, damping: 34, mass: 0.7 },
} satisfies Record<string, Transition>

export const tween = {
  fast: { duration: 0.16, ease: EASE_OUT_EXPO },
  base: { duration: 0.28, ease: EASE_OUT_EXPO },
  slow: { duration: 0.46, ease: EASE_OUT_EXPO },
} satisfies Record<string, Transition>

/* -------------------------------------------------------------------------
   Variantes reutilizables
   ---------------------------------------------------------------------- */

/** Entrada estándar de una sección: sube 14px y aparece. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: tween.base },
  exit: { opacity: 0, y: -8, transition: tween.fast },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: tween.base },
  exit: { opacity: 0, transition: tween.fast },
}

/** Contenedor que escalona a sus hijos. Úsalo con `fadeUp` en cada hijo. */
export const stagger = (each = 0.055, delay = 0.02): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: each, delayChildren: delay },
  },
  exit: {
    transition: { staggerChildren: 0.02, staggerDirection: -1 },
  },
})

/** Tarjeta que aparece con un punto de escala. Para rejillas de servicios. */
export const popIn: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: spring.gentle },
  exit: { opacity: 0, scale: 0.98, transition: tween.fast },
}

/** Hoja modal: entra desde abajo con peso. */
export const sheet: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: spring.weighty },
  exit: { opacity: 0, y: 16, scale: 0.98, transition: tween.fast },
}

export const overlay: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: tween.base },
  exit: { opacity: 0, transition: tween.fast },
}

/**
 * Pasos del asistente de reserva. El sentido de la transición cuenta la
 * historia: hacia adelante entra por la derecha, hacia atrás por la izquierda.
 */
export const step: Variants = {
  hidden: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 34 : -34 }),
  show: { opacity: 1, x: 0, transition: spring.gentle },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir >= 0 ? -34 : 34,
    transition: tween.fast,
  }),
}

/* -------------------------------------------------------------------------
   Física de pulsación — el gesto que hace que un botón se sienta real
   ---------------------------------------------------------------------- */

export const press = {
  whileHover: { scale: 1.02, y: -1 },
  whileTap: { scale: 0.97, y: 0 },
  transition: spring.snappy,
} as const

/** Para superficies grandes (tarjetas): el mismo gesto, más contenido. */
export const pressSubtle = {
  whileHover: { scale: 1.012, y: -2 },
  whileTap: { scale: 0.995 },
  transition: spring.snappy,
} as const

/** Aparecer al entrar en pantalla, una sola vez. */
export const inView = {
  initial: 'hidden',
  whileInView: 'show',
  viewport: { once: true, margin: '-60px' },
} as const
