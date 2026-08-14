# Spec 25 — Reportes: las preguntas del dueño

**Estado:** plano cerrado · **Depende de:** Spec 24 (colección `charges`)
**Arquitecto:** ClaudeCode/claude-opus-5 · **Fecha:** 2026-08-13
**Implementa:** Antigravity CLI (`agy`)

---

## 1. El problema

El día de la demo, el dueño va a preguntar —con estas palabras o parecidas—:

> *"Ajá, ¿y dónde están los servicios prestados esta semana? ¿Cuál profesional hizo más?"*

Hoy no hay respuesta. Solo existe la agenda de **un día**, navegando día por día. No hay
semana, no hay mes, no hay ranking, no hay totales.

Y hay una segunda razón, comercial, que pesa más que la primera: **este módulo es lo que
justifica que el cliente siga pagando el mes cuatro.** Agendar lo hace un cuaderno. Decirle
a un dueño en qué franja está perdiendo plata y cuál de sus profesionales produce el doble
que la otra, no.

---

## 2. Decisiones de diseño

### D1 · Todo se calcula en un módulo puro: `src/lib/reportes.ts`

Las Server Actions leen Firestore y **le pasan los documentos a funciones puras** que hacen
la aritmética. Nada de agregar dentro de la acción.

**Por qué:** es la única forma de que el gate se pueda escribir sin Firestore. Ya se pagó
caro el error contrario en este proyecto: cuando la lógica vive donde no se puede probar,
la prueba acaba siendo una copia de la lógica que se prueba a sí misma.

### D2 · Cero métricas derivadas inventadas

Si el panel dice "23 servicios", hay 23 documentos en `charges`. Ninguna cifra estimada,
proyectada, redondeada "para que se vea mejor" ni sembrada al azar.

**Por qué:** `04-BIBLIOTECA/patrones/fallos-silenciosos`. En el seed de este mismo proyecto
ya hubo un `Math.random() > 0.6` pintando un badge de contrato en media tabla. Un número
inventado en un panel de dirección es peor que no tener el panel.

### D3 · El ingreso sale de `charges`, la operación de `appointments`

| Pregunta | Colección |
|---|---|
| Cuánto entró, con qué método, cuánto se descontó | `charges` |
| Cuántas citas hubo, cuántas se cancelaron, no-shows, **origen** | `appointments` |
| Ocupación (horas vendidas vs. disponibles) | las dos |

**Nunca** se suma dinero desde `appointments`: ahí está el precio *previsto*, y confundirlo
con el cobrado es exactamente el error que hoy comete la agenda al mostrar *"$X previstos"*.

### D4 · El rango máximo consultable es 92 días

Si se pide más, la acción devuelve error. **Por qué:** un reporte "de todo el histórico" es
una consulta sin techo, y este proyecto ya casi se ahoga una vez por leer sin límite
(hallazgo F10, y el sondeo de 67 días del commit `e8ecc0e`). Un trimestre cubre todo lo que
un dueño de spa mira de verdad.

### D5 · La propina nunca aparece en el ingreso

Sale en su propia fila, etiquetada *"propinas (del equipo, no del negocio)"*. Decisión D4 de
la Spec 24, aquí se hace visible.

---

## 3. Qué se construye

### 3.1 `src/lib/reportes.ts` — puro, sin Firestore, sin React

```ts
export type Rango = { desdeUtc: string; hastaUtc: string }

export type ResumenCaja = {
  servicios: number
  ingresoCentavos: number          // Σ cobradoCentavos
  descuentoCentavos: number
  propinaCentavos: number          // aparte, NUNCA sumado al ingreso
  ticketPromedioCentavos: number   // ingreso / servicios, 0 si no hay
  porMetodo: Record<MetodoPago, { n: number; centavos: number }>
}

export type FilaProfesional = {
  professionalId: string
  servicios: number
  ingresoCentavos: number
  ticketPromedioCentavos: number
  porcentajeDelTotal: number       // 0–100, un decimal
  minutosVendidos: number
  minutosDisponibles: number
  ocupacionPorcentaje: number      // vendidos / disponibles
}

export type FilaServicio = {
  serviceId: string
  veces: number
  ingresoCentavos: number
  minutosOcupados: number
  ingresoPorHoraCentavos: number   // ingreso / (minutos/60) — el que de verdad importa
}

export type CeldaFranja = { diaSemana: number; hora: number; servicios: number }

export type ResumenOrigen = Record<'web' | 'admin' | 'whatsapp', number>

export function resumenCaja(cobros: Charge[]): ResumenCaja
export function rankingProfesionales(cobros, servicios, profesionales, rango): FilaProfesional[]
export function rankingServicios(cobros, servicios): FilaServicio[]
export function mapaDeFranjas(cobros, citas): CeldaFranja[]
export function citasPorOrigen(citas: Appointment[]): ResumenOrigen
export function minutosDisponibles(prof: Professional, rango: Rango): number
```

**Reglas de la aritmética, que son las que se prueban:**

- Enteros de centavos en todo. Ninguna división que produzca decimales de dinero: el ticket
  promedio se redondea **al entero de centavo más cercano**, y se documenta.
- `ingresoPorHoraCentavos` usa `duracionMin + bufferMin` (el tiempo que el servicio **bloquea
  de verdad** en la agenda), no solo la duración. Un balayage de $420.000 que ocupa cuatro
  horas y veinte minutos rinde menos por hora que tres manicures semipermanentes.
- `ocupacionPorcentaje` = minutos vendidos / minutos disponibles del horario del profesional
  en el rango, descontando domingos, almuerzo y sus `excepciones`. Si `minutosDisponibles`
  es 0 → ocupación 0, **nunca** división por cero.
- Todo lo que agrupa por día u hora usa `claveDia` y las funciones de zona de
  `src/lib/disponibilidad.ts`. **Nada de `getHours()` ni `toISOString().split('T')[0]`**: eso
  agrupa en la zona del servidor y en Colombia mueve un día entero de servicios al día
  anterior. Es el hallazgo F2, que ya apareció una vez y solo se vio desplegado.

### 3.2 Server Action

`getReporteAction(desdeIso, hastaIso)` — `withAuth('cobro:leer')` (solo `admin`).

1. Valida el rango: `desde < hasta` y ≤ 92 días. Si no, `{ ok: false, error: 'rango_invalido' }`.
2. Lee `charges` por `fechaUtc` en rango, y `appointments` con `getAppointmentsEnRango`.
3. Lee servicios y profesionales (colecciones pequeñas).
4. Devuelve el objeto completo ya agregado por las funciones puras.

Una sola acción, un solo viaje. La pantalla no hace aritmética.

### 3.3 Pantalla `/admin/reportes`

Nueva entrada en `ADMIN_ITEMS` de `AdminShell.tsx` (icono `BarChart3`), y en
`RUTAS_PROTEGIDAS` de `src/lib/rutas.ts` con permiso `cobro:leer` — **acuérdate de añadir el
caso a `scripts/prueba-rutas.ts`**: recepción y profesional no entran.

Selector de rango: **Hoy · Esta semana · Este mes · Mes pasado**. Nada de calendario libre en
esta versión.

Secciones, en este orden (es el orden en que un dueño las mira):

1. **La caja del periodo** — cifras grandes: ingreso, nº de servicios, ticket promedio.
   Debajo, el desglose por método de pago y, aparte y etiquetada, la propina.
2. **Ranking de profesionales** — tabla ordenada por ingreso: servicios, ingreso, ticket,
   % del total y **ocupación**. La ocupación es la columna que nadie más le muestra.
3. **Servicios prestados** — la lista cruda: fecha, hora, clienta, servicio, profesional,
   cobrado, método. Es la respuesta literal a *"¿dónde están los servicios de esta semana?"*.
4. **Qué deja más** — servicios ordenados por **ingreso por hora ocupada**, no por precio.
5. **Horas muertas** — rejilla día × hora. Es la materia prima de las promociones: el dueño
   ve el martes de 10 a 12 en blanco y decide él qué hacer con esa franja.
6. **De dónde vienen las citas** — WhatsApp / web / mostrador. **Esta es la sección que
   renueva el contrato**: enseña cuántas citas trajo el asistente.

Cada sección con su `EmptyState` propio cuando no hay datos. Un cero se muestra como cero,
nunca se oculta la sección.

---

## 4. Lo que NO entra

- **A2 · Altas** (Spec 26), **A7 · fusión de fichas** (Spec 27), **A6 · drawer** (Spec 28).
- **Clientas que no vuelven hace 60 días.** La quiero, pero exige una consulta por clienta
  que revienta el presupuesto de lecturas. Necesita un campo `ultimaVisitaUtc` mantenido al
  cobrar. Va en su propia spec.
- **Exportar a Excel/PDF.** Después.
- **Comisiones por profesional.** Necesita el % por persona en su ficha: fase siguiente.
- **Gráficos de librería externa.** Rejilla y barras con CSS. Nada de dependencias nuevas.
- **El sondeo de la agenda y el middleware** — cerrados en `e8ecc0e`. No tocar.

---

## 5. Gate de terminado

| # | Gate | Comando |
|---|---|---|
| G1 | Tipos, lint, pruebas y build | `npm run verificar` |
| G2 | La aritmética de los reportes | `npm run prueba:reportes` |
| G3 | Las rutas, con `/admin/reportes` cubierta | `npm run prueba:rutas` |
| G4 | El rojo de G2 **antes** del verde | pegar salida y código de salida |

### G2 · `scripts/prueba-reportes.ts` (entra en la cadena de `verificar`)

Con un conjunto de cobros y citas de juguete **escritos a mano en el propio script**, y los
resultados calculados a mano en un comentario. Casos que no pueden faltar:

1. Tres cobros de 55.000, 28.000 y 45.000 → ingreso 128.000, ticket 42.667 (redondeo documentado)
2. Un cobro con 10.000 de propina → **el ingreso no cambia**; la propina sale en su fila
3. Un cobro con descuento → ingreso = cobrado, y el descuento aparece en su total
4. Ranking: dos profesionales, una con el doble de ingreso → orden y porcentajes correctos
5. `ingresoPorHora`: un servicio de $420.000 que ocupa 260 min **rinde menos** que uno de
   $55.000 que ocupa 70 min. La prueba lo afirma explícitamente
6. Ocupación con `minutosDisponibles = 0` → 0, sin `NaN` ni `Infinity`
7. Un cobro a las 19:00 hora de Bogotá **cae en ese día**, no en el siguiente (F2)
8. Sin datos → todo en cero, sin excepciones lanzadas

### G4 · Enseña el rojo primero

Corre G2 contra una implementación equivocada a propósito —la más fácil: sumar la propina al
ingreso, o usar solo `duracionMin` sin el buffer en el ingreso por hora— y **pega la salida
en rojo con su código de salida**. Después el verde.

### No firmes lo que no puedas correr

`verificar:nube` y `seed` los corre el arquitecto. Si te falta un dato o una credencial,
**dilo tal cual**; no reinterpretes el criterio del gate para poder cerrarlo.

---

## 6. Si algo de este plano está mal, detente y dilo

Escrito sin ejecutar el código. Si `Charge` no quedó como dice la Spec 24, si
`minutosDisponibles` choca con cómo están guardadas las `excepciones`, o si el rango de 92
días rompe algo que no vi: **para y repórtalo**. Un "esto no se puede" vale mil veces más que
un verde inventado.
