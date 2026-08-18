# Spec 26 — La marca: «La Vena»

**Estado:** plano abierto, **pendiente de aprobación de Mario** · **Depende de:** Spec 10 (sistema de diseño)
**Arquitecto:** ClaudeCode/claude-opus-5 · **Fecha:** 2026-08-18
**Implementa:** Antigravity CLI (`agy` 1.1.13) · modelo `gemini-3.7-flash-high`
**Propuesta visual:** https://claude.ai/code/artifact/9d1b9477-a2d1-4b88-b247-680edaf41861 (dirección **B**, elegida por Mario el 2026-08-18)

---

## 1. El problema

Casa Malva no tiene marca. Tiene un **marcador de posición**: un azulejo malva con la letra
`M` en Fraunces, repetido a mano en tres sitios con tres tamaños distintos —
`TopBar.tsx:56` (40 px), `SiteFooter.tsx:18` (36 px) y `AdminShell.tsx:66` (36 px) —
y `public/` todavía guarda los SVG por defecto de Next.js (`next.svg`, `vercel.svg`,
`window.svg`, `globe.svg`, `file.svg`). Los iconos PWA `icon-192.png` e `icon-512.png`
no llevan ninguna marca.

Esto importa más de lo que parece, y no por estética:

1. **El canal del negocio es WhatsApp.** La foto de perfil de una cuenta de WhatsApp Business
   es lo primero que ve una clienta antes de leer un solo mensaje. Hoy sería una `M`.
2. **La demo se vende a dueños de spa.** Un panel impecable con un logo de relleno resta
   credibilidad justo en la reunión donde se decide la compra.
3. **Tres copias del mismo azulejo ya divergieron**: distinto tamaño, distinto radio
   (`14px` contra `12px`), distinta sombra. Con tres es molesto; con diez es imposible.

---

## 2. Decisiones de diseño

### D1 · Una sola fuente de geometría: `src/lib/marca.ts`

El pétalo es **una constante**, y las cinco posiciones salen de rotarla 72°. Todo lo demás
—variantes, tamaños, los SVG de `public/marca/`, los iconos PWA— se deriva de ahí.

**Por qué:** el problema §1.3 es exactamente esto. Un logo copiado a mano en seis sitios
diverge; ya divergió con tres. Y la generación de los `.svg` y `.png` sale del **mismo módulo**
que dibuja el componente, así que un cambio en la curva no puede dejar los ficheros viejos
apuntando a otra forma.

### D2 · La variante la decide una función pura, no el ojo de quien escribe el JSX

```ts
elegirVariante(px: number): 'linea' | 'solida'
```

**El umbral es 28 px, y sale de una cuenta, no de una impresión.** El trazo se dibuja con
`stroke-width` 2.6 sobre un lienzo de 64, así que en pantalla mide `2.6 × px / 64`:

| Tamaño | Trazo real | |
|---|---|---|
| 40 px (TopBar) | 1.63 px | ✅ línea |
| 36 px (footer, admin) | 1.46 px | ✅ línea |
| **28 px** | **1.14 px** | ✅ línea — el límite |
| 24 px | 0.98 px | ❌ por debajo de un píxel: el navegador lo difumina a gris |
| 16 px | 0.65 px | ❌ desaparece |

**Y no vale con engordar el trazo.** Para que a 24 px siguiera midiendo 1.2 px habría que
subirlo a 3.2, y ahí el trazo se come la **hendidura de la punta** —que tiene 7 unidades de
ancho y 4 de fondo—. La muesca *es* la idea de esta marca: es la firma botánica real de la
*malva sylvestris* y lo único que la separa de una margarita genérica. Engordar el trazo
convierte «La Vena» en la flor de plantilla que se descartó.

Por eso hay dos variantes, y por eso **la elige una función y no una persona**: es la clase
de decisión que se hace bien la primera vez y mal la décima.

*Esta es la debilidad conocida de la dirección B, señalada antes de elegirla y aceptada por
Mario el 2026-08-18. La spec no la esconde: la administra.*

### D3 · La marca se ve aunque no corra un solo fotograma

Estado por defecto: **visible**. La animación solo se añade encima.

**Por qué:** ya se pagó esta factura en este proyecto. `Reveal.tsx` lleva escrito en su
cabecera que la versión anterior arrancaba en `opacity: 0` y dependía de que framer-motion
ejecutara fotogramas; en cualquier entorno donde no corrieran —JS bloqueado, pestaña en
segundo plano al primer pintado, webview rara— **la portada se quedaba en blanco**. La marca
vive en el `TopBar`, encima del pliegue, en todas las páginas. Si se cae, se cae lo primero
que se ve.

Concretamente: nada de `opacity: 0` en el CSS base. El trazado (`stroke-dashoffset`) solo se
aplica bajo una clase que añade el cliente, y con `prefers-reduced-motion` la regla ni existe.

### D4 · La revelación va **una vez por sesión**, no por navegación

Bandera en `sessionStorage`. **Por qué:** el `TopBar` vive en un layout, así que no se
desmonta al navegar — pero sí en cada recarga completa. Un logo que se redibuja cada vez que
vuelves a `/inicio` deja de ser un detalle fino y pasa a ser un tic. El valor de este gesto
está en que ocurra **poco**.

### D5 · La espera de marca **no sustituye a los esqueletos de rejilla**

`<EsperaMarca />` se usa donde hoy no hay nada que mostrar: cargas de página o de sección
completa. Los `<Skeleton />` y `<SkeletonGrid />` **se quedan como están**.

**Por qué:** el trabajo de un esqueleto es enseñar *la forma de lo que viene* para que la
página no salte cuando llegan los datos —está escrito así en `skeleton.tsx` y es correcto—.
Una flor girando no hace eso: informa de que se espera, pero no reserva el hueco. Cambiar
uno por otro sería confundir dos problemas distintos porque ambos se llaman «carga».

### D6 · El lockup usa texto vivo; los SVG sueltos no llevan texto

- **Dentro de la app:** el lockup (marca + «Casa Malva») se compone en React con la Fraunces
  que `next/font` ya carga. Texto real, seleccionable y accesible.
- **Fuera de la app** (`public/marca/*.svg`): **solo la marca, sin una sola etiqueta `<text>`**.

**Por qué:** un SVG con `<text>` se ve distinto en cada máquina según lo que tenga instalado,
y aquí no hay forma de convertir la Fraunces a curvas sin meter una herramienta nueva. Un
fichero que se ve bien en el portátil de Mario y mal en el del cliente es peor que no tenerlo.
El gate comprueba esto (§4).

### D7 · Los iconos se generan, no se dibujan — y la generación es una función pura

`scripts/generar-marca.mjs` produce `public/marca/*.svg`, `src/app/icon.svg` y los
`icon-192.png` / `icon-512.png` con **sharp**, que ya es dependencia del proyecto.

**Y se parte en dos, obligatoriamente** (regla 5, separar el plan de la ejecución):

```ts
// puro: no toca disco, no toca red. Devuelve qué ficheros deberían existir.
construirFicheros(): Map<string /* ruta */, string /* contenido SVG */>
```

El script solo **escribe** lo que esa función devuelve. **Por qué:** sin esta separación, el
gate 5 de §4 —«los ficheros del disco están al día»— es imposible de escribir sin volver a
generar en disco durante la prueba, y una prueba que escribe ficheros no es un gate: es un
efecto secundario. Con la función pura, la prueba compara en memoria y no toca nada.

El favicon usa siempre la **variante sólida**, porque los navegadores lo pintan a 16–32 px (D2).

---

## 3. Lo que NO entra

Fuera de alcance, explícitamente:

- ❌ **No se rediseña el flyer** `casa_malva_flyer_publicitario.svg/.png`. Lleva su propia
  composición y es otro trabajo.
- ❌ **No se tocan `Skeleton` ni `SkeletonGrid`** (D5), ni la clase `.skeleton` de `globals.css`.
- ❌ **No se outlinea la Fraunces** ni se añade ninguna herramienta de fuentes (D6).
- ❌ **No se cambia la paleta, ni los radios, ni las curvas.** Todo sale de `globals.css`.
- ❌ **No se toca Motion** (`mcp.motion.so`) ni se genera vídeo. Decisión de Mario del
  2026-08-18: queda conectado y quieto.
- ❌ **No se borran** `next.svg`, `vercel.svg`, `window.svg`, `globe.svg`, `file.svg` en esta
  spec. Son basura de la plantilla, pero borrar ficheros de `public/` es un cambio con su
  propio riesgo y merece su propio commit.
- ❌ **No se rediseña el `TopBar`** más allá de sustituir el azulejo por la marca.

---

## 4. Gate ejecutable

Comando nuevo en `package.json`, encadenado dentro de `verificar`:

```
npm run prueba:marca
```

`scripts/prueba-marca.ts` comprueba, contra el módulo real (nunca una copia):

| # | Qué |
|---|---|
| 1 | `elegirVariante` en la frontera: `27 → 'solida'`, `28 → 'linea'`, `16 → 'solida'`, `40 → 'linea'` |
| 2 | Rechaza entradas imposibles: `0`, negativos y `NaN` **lanzan**, no devuelven un valor por defecto (regla 3: falla cerrado) |
| 3 | La geometría produce **exactamente 5** pétalos, a 0/72/144/216/288° |
| 4 | Todo fichero de `public/marca/` **parsea como XML y no contiene `<text`** (D6) |
| 5 | Los **`.svg`** del disco coinciden **byte a byte** con lo que devuelve `construirFicheros()` (D7). Si alguien tocó `marca.ts` sin regenerar, el gate se pone rojo |
| 6 | Los **`.png`** existen, tienen las dimensiones declaradas (192 y 512) y no están en blanco (más de un color). **No se comparan byte a byte**: la salida de `sharp` puede cambiar entre versiones de la librería, y un gate que se pone rojo solo porque se actualizó una dependencia enseña a ignorar los gates |

Y la cadena completa `npm run verificar` (tipos + estilo + las siete pruebas anteriores +
`next build`) tiene que seguir en verde.

**La prueba se verá en rojo antes de estar en verde** (regla 7): se corre contra el umbral
puesto a mano en 24 y contra un `public/marca/` desactualizado, se guarda esa salida, y solo
entonces se arregla.

**Comprobado que el gate se puede escribir** (regla 8): las cinco comprobaciones son de
módulo puro y de sistema de ficheros. Ninguna necesita navegador, credenciales ni Firestore.
Es el mismo molde de `scripts/prueba-rutas.ts`.

---

## 5. Si el plano está mal, detente y dilo

Tres sitios donde este plano puede estar equivocado, y qué hacer:

- **Si el umbral de 28 px no aguanta en pantalla real.** La cuenta de D2 es aritmética, pero
  la percepción no lo es: en una pantalla sin HiDPI puede hacer falta subirlo a 32.
  **Mide y cambia el número en la spec**, no lo parchees en el JSX.
- **Si la variante sólida a 16 px se ve como una mancha.** Es el riesgo real de esta
  dirección. Si al verla en la barra del navegador no se distingue de un borrón,
  **para y dilo**: la salida no es engordar más, es reducir a **tres pétalos** en el
  favicon — y eso es una decisión de marca que la toma Mario, no el implementador.
- **Si `sharp` no rasteriza el SVG con la fidelidad suficiente.** No inventes un
  procedimiento alterno ni dejes los PNG viejos en su sitio: repórtalo.

Y la regla que lo cubre todo: **quien construye no firma su propio gate** (regla 9). Los
comandos se vuelven a correr antes de dar esto por cerrado.
