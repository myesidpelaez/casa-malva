# Spec 10 — Sistema de diseño

- **Estado:** implementada
- **Decisión de fondo:** [ADR 0001](../adr/0001-estetica-vidrio-y-movimiento.md)
- **Archivos:** `src/app/globals.css`, `src/lib/motion.ts`, `src/components/ui/*`

## Objetivo

Que las once pantallas de Casa Malva se sientan **un solo objeto**. La forma de
conseguirlo no es "usar los mismos colores": es que ningún componente pueda
inventarse un color, un radio, una sombra ni una duración.

> **Regla dura:** ningún componente escribe un hexadecimal. Si necesitas un
> color que no existe como token, el problema es el token, no el componente.

## 1. Capas

| Capa | Dónde | Ejemplo |
|---|---|---|
| **Primitivas** | `@theme inline` en `globals.css` | `--color-malva-600`, `--radius-lg` |
| **Materiales** | `:root` + clases `.glass*` | `--glass-tint`, `.glass-strong` |
| **Componentes** | `src/components/ui/` | `<Surface material="frost">` |

Las primitivas viven en `@theme inline` porque así Tailwind 4 genera las
utilidades automáticamente: `--color-malva-600` habilita `bg-malva-600`,
`text-malva-600`, `border-malva-600`.

## 2. Color

**Escala malva** 50→900. El 600 (`#7B4B6E`) es el acento histórico de marca y no
se toca. El resto existe para construir jerarquía sin introducir tonos nuevos.

**Neutros cálidos** `ink-50`→`ink-900`. Nunca gris puro: todos llevan un punto de
rosa. Un gris frío junto a un malva cálido se ve sucio.

**Apoyos** `blush`, `champagne`, `sage` — solo para los azulejos de categoría y
avisos. No son colores de interfaz.

**Estados** `success` / `warning` / `danger` / `info`, cada uno con su variante
`-soft` para fondos. El estado de una cita usa **siempre** el mismo par en toda
la app (`APPOINTMENT_STATE` en `components/ui/badge.tsx`). Un mismo hecho, un
mismo color — es la regla de trazabilidad de MeJorÍA aplicada al color.

## 3. Materiales

| Clase | Cuándo |
|---|---|
| `.glass` | Caso por defecto. Tarjetas, paneles. |
| `.glass-strong` | Encima de otro vidrio: hojas modales, cabecera pegajosa. |
| `.glass-deep` | Bloques de acento oscuros sobre fondo claro. |
| `solid` (`Surface material="solid"`) | **Listas largas y densas.** El vidrio en 40 filas cansa la vista y cuesta GPU. |

`.aurora` es el telón de fondo: tres manchas de color muy diluidas, fijas, que se
mueven muy despacio. **Sin ella el vidrio no tiene nada que refractar y se ve
como un gris plano.** Va en `layout.tsx`, una sola vez, a `z-index: -1`.

`.glass-edge` añade el filo de luz de 1px en el borde superior. Es el detalle que
lee como "canto biselado" y no como "div transparente".

> **Trampa de compilación registrada:** no escribir `-webkit-backdrop-filter` a
> mano. Lightning CSS interpreta que la declaración prefijada pisa a la estándar
> y **elimina las dos**: el panel queda con tinte pero sin desenfoque, y en el
> navegador se ve casi bien, así que no salta. Se declara solo la estándar.

## 4. Movimiento

Todo sale de `src/lib/motion.ts`. Dos familias:

- **`spring.*`** — para lo que responde a un dedo o a un cursor. `snappy`
  (botones), `gentle` (tarjetas), `weighty` (modales), `glide` (indicadores que
  se deslizan con `layoutId`).
- **`tween.*`** — para entradas y salidas de contenido. Curva única
  `cubic-bezier(0.16, 1, 0.3, 1)`: arranca rápido y frena largo.

**`prefers-reduced-motion` no es opcional.** `Reveal` y `RevealGroup` detectan la
preferencia y renderizan el contenido **visible y sin animar**. Nunca se esconde
contenido detrás de una animación que no va a ocurrir.

## 5. Botones

`Button` (cliente) y `buttonClass()` (servidor, en `button-variants.ts`).

> **Por qué están separados:** un Server Component no puede invocar una función
> exportada desde un módulo con `'use client'`. Las páginas de servidor visten
> sus `<Link>` con `buttonClass()`; por eso las clases viven en un módulo sin
> directiva de cliente. `button.tsx` **no reexporta** `buttonClass` a propósito.

Siete variantes: `primary` (malva con brillo), `glass`, `soft`, `outline`,
`ghost`, `danger`, `success`. Seis tamaños.

El estado `loading` es de primera clase: bloquea el botón, marca `aria-busy` y
**conserva el ancho**. Un botón que cambia de tamaño al enviar delata un
prototipo.

## 6. Formularios

`Field` gestiona etiqueta, icono, ayuda, error y las relaciones ARIA
(`aria-invalid`, `aria-describedby`). El error entra animando la altura, así que
**no hay salto de layout** cuando aparece.

`Toggle` es un interruptor tipo iOS con `role="switch"` y `aria-checked`.

## 7. Hojas modales

`Sheet` se apoya en Radix Dialog por lo que no se ve: atrapa el foco, cierra con
Escape, bloquea el scroll de fondo, anuncia rol y título. Encima va el material y
el muelle.

En móvil entra desde abajo y **se arrastra para cerrar** (>120px o velocidad
>600). En escritorio es un diálogo centrado.

`ConfirmSheet` existe para no volver a usar `confirm()` del navegador: un diálogo
nativo delante de un cliente rompe la ilusión de producto terminado en un
segundo. Lo mismo con `alert()` → `toast`.

## 8. Navegación

El indicador activo **se desliza** entre posiciones con `layoutId` de
framer-motion, no aparece y desaparece. Es la diferencia entre "se ve bien" y "se
siente bien". Aplica a: `Segmented`, `TopBar`, `BottomNav` y la lateral del panel.

`Stepper` marca el progreso del asistente de reserva y permite volver a los pasos
ya completados.

## 9. Accesibilidad — mínimos que se comprueban

- Área táctil ≥ 44×44 px (`.touch-target`, guía HIG de Apple).
- `:focus-visible` con anillo malva de 2px y 2px de separación, en todo.
- Todo control sin texto lleva `aria-label`.
- Cifras con `.tnum` (tabulares): los precios y las horas no bailan al cambiar.
- Contraste AA en texto sobre vidrio — por eso el tinte mínimo es 62% blanco.

## 10. Qué NO tiene v1

- **Modo oscuro.** Decidido en el ADR 0001.
- **Storybook.** No cabe en el plazo; el inventario vive en esta spec.
- **Test visual de regresión.** Pendiente si el producto pasa de demo a piloto.
