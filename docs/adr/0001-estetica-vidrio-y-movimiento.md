# ADR 0001 — Estética de vidrio y movimiento

- **Fecha:** 2026-08-12
- **Estado:** aceptada
- **Decide:** Mario Peláez
- **Redacta:** ClaudeCode/claude-opus-5
- **Sustituye a:** la sección "Paleta y estética" de `DISENO.md §2` (bóveda MEMORIA)

## Contexto

`DISENO.md §2` fijó la estética el 2026-08-11 con tres prohibiciones explícitas:

> Cero gradientes decorativos, cero sombras difusas, cero iconos de relleno.
> Tipografía: una sola familia con dos pesos.

El 2026-08-12 Mario pidió lo contrario: *"que todo se vea más Apple, aplicar el
glassmorphism, que se sienta muy premium, muy femenino"*, manteniendo la paleta.

**Esto es una contradicción con una decisión escrita, y se registra como tal.**

## Decisión

Se adopta una estética de **vidrio y movimiento** con estas reglas:

1. **La paleta de marca no cambia.** `#7B4B6E` sigue siendo el acento. Lo que se
   añade es una *escala* completa (malva 50→900) y neutros cálidos con punto de
   rosa, para poder construir jerarquía sin meter colores nuevos.
2. **Se levanta la prohibición de sombras difusas y gradientes**, pero con
   límites: sombras siempre en capas de baja opacidad (nunca una sola dura), y
   gradientes solo en tres sitios — el titular de portada, los avatares del
   equipo y el fondo *aurora*.
3. **Dos familias tipográficas, no una.** Fraunces (variable, ejes SOFT/WONK)
   para titulares; Inter para toda la interfaz. Se rompe la regla de "una sola
   familia" porque Fraunces a 12–13px se lee mal y arrastraba el panel de
   administración hacia lo editorial en vez de hacia lo utilitario.
4. **Se conserva la escala Fibonacci** (8/13/21/34/55/89) como espaciado.
5. **Movimiento con muelles, no con duraciones.** Un único módulo
   (`src/lib/motion.ts`) define toda la física. Nada de curvas inventadas por
   componente.

## Por qué esto NO contradice el espíritu de la decisión original

La decisión original buscaba **disciplina**, no ausencia de material. El
glassmorphism bien hecho es exactamente eso: un solo acento, mucho aire, y
profundidad conseguida con translucidez en vez de con adornos. Lo que se
prohibía —iconos de relleno, sombras aleatorias, gradientes decorativos por
gusto— sigue prohibido.

Se conserva íntegra la razón económica que registró `ESTADO.md`:

> En un spa, lo visual ES el producto. Un dueño que vive de la estética juzga el
> software por cómo se ve.

## Consecuencias

**A favor**

- Un dueño de spa juzga en tres segundos. El vidrio y el muelle compran esos
  tres segundos.
- Los tokens quedan centralizados: cambiar la marca entera es editar
  `globals.css`. En el mockup había hexadecimales repetidos en 11 archivos.

**En contra, y asumido**

- `backdrop-filter` cuesta GPU. En un móvil de gama baja con muchos paneles a la
  vez puede bajar de 60fps. Mitigación: el vidrio se usa en superficies grandes
  y contadas, nunca en listas largas — ahí se usa `material="solid"`.
- Hay un `@supports not (backdrop-filter)` que cae a un sólido opaco legible.
- Dos fuentes en vez de una son ~40KB más. Se acepta: ambas son variables y se
  cargan con `display: swap`.

## Alternativas descartadas

- **Mantener la estética original tal cual.** Descartada por petición explícita
  de Mario, que es quien vende.
- **Modo oscuro.** Descartado para v1: un spa es una marca de luz, y sostener
  dos temas duplica la superficie de error a cinco días de la venta. El sistema
  de tokens no lo impide más adelante.
- **Una sola familia (solo Inter).** Descartada: pierde por completo el carácter
  femenino, que es la mitad del encargo.
