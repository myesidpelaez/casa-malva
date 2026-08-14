# Spec 24 — El ciclo del dinero

**Estado:** plano cerrado, listo para implementar
**Arquitecto:** ClaudeCode/claude-opus-5 · **Fecha:** 2026-08-13
**Implementa:** Antigravity CLI (`agy`)

---

## 1. El problema

Casa Malva **agenda muy bien y no registra nada**. Sabe qué va a pasar; no sabe qué pasó.

Hoy "Realizada" solo cambia un campo `estado` en la cita. No hay cobro, ni método de pago,
ni propina. Por eso el panel muestra *"$X previstos"* sumando citas **agendadas** — que no
es lo que se ganó, es lo que podría entrar — y por eso ninguna pregunta de un dueño de
negocio tiene respuesta.

Y falta la otra mitad: **desde el panel no se puede agendar**. `crearCitaAction` solo la
consume el wizard público, así que la recepcionista que recibe una llamada no tiene dónde
meterla. En un salón real, entre el 40 % y el 60 % de las citas entran por teléfono o
mostrador. El valor `origen: 'admin'` existe en el modelo, la agenda le pinta un icono, y
**nunca se produce**.

Esta spec cierra el recorrido completo:

> entra la cita (por panel, web o WhatsApp) → se presta → **se cobra** → queda registrada

---

## 2. Decisiones de diseño (con su porqué)

### D1 · El cobro es una colección aparte, no un campo de la cita

```
charges/{id}
```

**Por qué:** un cobro y una cita son dos hechos distintos. Mañana habrá venta de producto en
mostrador sin cita, y habrá citas que nunca se cobran (no-show). Meterlo dentro de
`appointments` obliga a leer citas para sumar dinero, que es justo lo que hace caro el
reporte del mes. Con colección propia, los reportes de la Spec 25 consultan **solo** el
rango de fechas que necesitan.

Es la aplicación de `04-BIBLIOTECA/patrones/trazabilidad-mejoria`: un hecho ocurre una vez y
se mira desde varias ventanas, sin copiarlo.

### D2 · El id del cobro es determinista: `chg_${appointmentId}`

**Por qué:** marcar "Realizada" dos veces (doble clic, reintento de red, dos pestañas
abiertas) no puede producir dos cobros. Con id determinista, el segundo intento encuentra el
documento y se rechaza con *"esta cita ya está cobrada"* en vez de duplicar la caja.

### D3 · Completar la cita y registrar el cobro van en **una sola transacción**

**Por qué:** una cita `completada` sin su cobro es un agujero en la caja que nadie ve hasta
fin de mes. Si falla el cobro, la cita **no** queda completada. No se aceptan dos escrituras
sueltas «que casi siempre pasan las dos».

### D4 · La propina no es ingreso del negocio

Se guarda en el cobro, pero **nunca** suma en ningún total de ingresos. Es dinero de la
profesional que pasa por la caja.

**Por qué:** inflar el ingreso con propinas descuadra la caja y, peor, le da al dueño una
cifra falsa de su negocio. Es el tipo de detalle por el que un dueño deja de creerle a un
software.

### D5 · Desde el panel **no** aplica la antelación mínima de 2 horas

La regla 5 del diseño (`REGLAS_NEGOCIO.minAntelacionMin`) existe para que nadie agende una
keratina por WhatsApp para dentro de diez minutos. Pero la clienta que está **de pie en el
mostrador** se agenda ahora.

**Sigue aplicando todo lo demás, sin excepción:** no hay solape, el profesional presta ese
servicio, está dentro de su horario, no es domingo ni almuerzo, y no se agenda en el pasado.

### D6 · El cobrado real puede diferir del precio de lista

`cobradoCentavos = precioListaCentavos − descuentoCentavos`. El descuento se captura
explícito, no se deja escribir un total libre.

**Por qué:** si se permite teclear el total, el reporte de descuentos es imposible y el dueño
nunca sabrá cuánto regaló su equipo. Capturando el descuento, sale gratis.

### D7 · Quién puede cobrar

Permisos nuevos en `src/lib/permisos.ts`:

| Permiso | Roles |
|---|---|
| `cita:crear` | `admin`, `recepcion` |
| `cobro:registrar` | `admin`, `recepcion` |
| `cobro:leer` | `admin` |

La **profesional no cobra** en esta versión. Es discutible —en salones pequeños cobra ella—
pero es una decisión de negocio de Mario, no del implementador: se deja restrictivo y se
anota. Cambiarlo después es una línea.

---

## 3. Modelo de datos

Añadir a `src/types/index.ts`:

```ts
export type MetodoPago = 'efectivo' | 'nequi' | 'daviplata' | 'tarjeta' | 'transferencia'

export type Charge = {
  id: string                    // `chg_${appointmentId}`
  appointmentId: string
  clientId: string
  professionalId: string
  serviceId: string
  fechaUtc: string              // cuándo se cobró (ISO UTC)
  precioListaCentavos: number   // el congelado en la cita
  descuentoCentavos: number     // 0 si no hubo
  cobradoCentavos: number       // lista − descuento. Esto es el ingreso
  propinaCentavos: number       // NO es ingreso del negocio (D4)
  metodoPago: MetodoPago
  cobradoPor: string            // uid de la sesión que cerró
  nota?: string
  _seed?: boolean
}
```

**Los métodos de pago son de Colombia**: Nequi y Daviplata no son un adorno, son cómo cobra
medio Medellín. Un selector que solo tenga "efectivo / tarjeta" delata que el software es
importado.

### Índices (`firestore.indexes.json`)

```json
{ "collectionGroup": "charges", "queryScope": "COLLECTION",
  "fields": [ { "fieldPath": "professionalId", "order": "ASCENDING" },
              { "fieldPath": "fechaUtc", "order": "ASCENDING" } ] }
```

`fechaUtc` a secas lo resuelve el índice automático de campo simple.

---

## 4. Qué se construye

### 4.1 `src/lib/cobros.ts` — la aritmética, pura y probable

```ts
export type BorradorCobro = {
  precioListaCentavos: number
  descuentoCentavos: number
  propinaCentavos: number
}

export type ResultadoCobro =
  | { ok: true; cobradoCentavos: number; totalRecibidoCentavos: number }
  | { ok: false; error: 'descuento_negativo' | 'descuento_mayor_que_precio' | 'propina_negativa' | 'precio_invalido' }

export function calcularCobro(borrador: BorradorCobro): ResultadoCobro
export function idCobro(appointmentId: string): string   // `chg_${appointmentId}`
```

- `cobradoCentavos` = lista − descuento → **es el ingreso del negocio**
- `totalRecibidoCentavos` = cobrado + propina → lo que entra físicamente al cajón
- Enteros de centavos siempre (`04-BIBLIOTECA/patrones/dinero-en-centavos`). Nada de
  decimales, nada de `parseFloat`.

> Este módulo existe **para que el gate se pueda escribir**. Si la aritmética viviera dentro
> de la Server Action, probarla exigiría Firestore y una petición, y la prueba acabaría
> siendo una copia de la lógica — el anti-patrón que esta casa ya cometió dos veces.

### 4.2 `aplicarCambioDeCita` acepta un cobro opcional

En `src/lib/db.ts`, la firma pasa a:

```ts
aplicarCambioDeCita(cita: Appointment, plan: PlanDeSlots, cobro?: Charge)
```

Dentro de la **misma** transacción que ya existe (lecturas primero, escrituras después):

1. Si viene `cobro`: `tx.get(charges/${cobro.id})`. Si ya existe → `throw 'ya_cobrada'`.
2. Al escribir: `tx.set(chargeRef, cobro)` junto al `tx.set(citaRef, cita)`.

El `catch` traduce `ya_cobrada` a `{ ok: false, error: 'ya_cobrada' }`, igual que hace hoy
con `cupo_ocupado`.

### 4.3 Server Actions (`src/actions/citas.ts`)

**`crearCitaAdminAction`** — `withAuth('cita:crear')`

Envuelve la lógica de `crearCitaAction` con dos diferencias: `origen: 'admin'`, y se salta la
antelación mínima (D5). **No dupliques la validación**: extrae el cuerpo común a una función
interna que reciba un flag `omitirAntelacionMinima` y llámala desde las dos. Dos copias de
las reglas de reserva es exactamente cómo aparecen las dos verdades que este proyecto lleva
tres specs eliminando.

**`registrarCobroAction`** — `withAuth('cobro:registrar')`

```
(citaId, { descuentoCentavos, propinaCentavos, metodoPago, nota })
  → valida que la cita existe y que `puedeTocarCita`
  → rechaza si estado es 'cancelada' | 'no_asistio' | 'completada'
  → calcularCobro(...) con el precio congelado de la cita
  → construye el Charge con id determinista y `cobradoPor: ctx.uid`
  → cita.estado = 'completada' + entrada de historial con el monto
  → aplicarCambioDeCita(citaUpdated, plan, cobro)   ← una sola transacción
```

**`marcarCompletadaAction` deja de completar a secas.** Hoy permite cerrar una cita sin
cobro, que es la puerta de atrás por la que se vacía la caja. Se conserva **solo** para el
rol `profesional` (que no puede cobrar) y marca la cita como `completada` con una nota
explícita *"pendiente de cobro"*, para que el reporte pueda listarlas.

### 4.4 Pantallas

Las tres van con el componente `Sheet` **tal como está hoy**. La geometría de drawer es la
Spec 28 y **no se toca aquí**.

**a) Nueva cita** — botón en `AdminHeader` de la agenda (`admin/page.tsx`).
Pasos dentro de un solo drawer: clienta (buscar por teléfono; si no existe, nombre +
teléfono) → servicio → profesional (solo los que prestan ese servicio) → día → franja libre
real (`franjasDelDiaAction`, ya existe) → confirmar con precio y duración a la vista.

**b) Reagendar** — acción nueva en la tarjeta de cita. Elegir día y franja libre, y llamar a
`reagendarCitaAction`, **que ya está escrita, probada y hoy no la llama ninguna pantalla**.

**c) Cobrar** — el botón "Realizada" de la tarjeta abre el drawer de cobro en vez de
completar directo: precio de lista (fijo, no editable), descuento, propina, método de pago
(cinco botones grandes, táctiles), nota. El total a cobrar se recalcula en vivo. Si la cita
ya tiene cobro, la tarjeta muestra el monto y el método, y el botón desaparece.

---

## 5. Lo que NO entra en esta tarea

Nombre y número, para que nada se arregle "de paso":

- **A4 · Reportes y BI** — es la Spec 25. Aquí no se crea ninguna pantalla de reportes ni
  ningún total agregado más allá del que ya muestra la agenda.
- **A2 · Altas de servicio, categoría y profesional** — es la Spec 26. Sí entra el alta de
  **clienta**, porque sin ella no se puede agendar desde el panel.
- **A7 · Homónimas y fusión de fichas** — es la Spec 27.
- **A6 · Geometría del drawer** — es la Spec 28. `Sheet` se usa como está.
- **F12 y F16** — los dos hallazgos cosméticos abiertos. Se quedan quietos.
- **Comisiones, insumos, caja de turno y cierre de caja** — fase siguiente.
- **El sondeo de la agenda** — ya se arregló en el commit `e8ecc0e`. No volver a tocarlo.

---

## 6. Gate de terminado

Ninguno se firma con una afirmación. Cada uno se firma **pegando la salida del comando**.

| # | Gate | Comando |
|---|---|---|
| G1 | Tipos, lint, todas las pruebas y el build | `npm run verificar` |
| G2 | La aritmética del cobro | `npm run prueba:cobros` |
| G3 | El rojo de G2 **antes** del verde | ver abajo |

### G2 · `scripts/prueba-cobros.ts` (nuevo, y entra en la cadena de `verificar`)

Casos mínimos, todos contra `calcularCobro` e `idCobro` **importados del módulo real**:

1. 55.000 sin descuento ni propina → cobrado 55.000, recibido 55.000
2. 55.000 con 5.000 de descuento → cobrado 50.000
3. 55.000 con 10.000 de propina → **cobrado 55.000** y recibido 65.000
   *(este es el caso de D4: la propina no engorda el ingreso)*
4. descuento mayor que el precio → `{ ok: false, error: 'descuento_mayor_que_precio' }`
5. descuento negativo y propina negativa → error, no un número raro
6. `idCobro('apt_123') === 'chg_apt_123'` — dos llamadas dan lo mismo

### G3 · Enseña el rojo primero

**Es la instrucción más importante de este plano.** Antes de la implementación correcta,
corre la prueba contra la aritmética equivocada —por ejemplo, sumando la propina al ingreso—
y **pega esa salida en rojo** en el reporte, con su código de salida. Después el verde.

Una prueba que nunca se vio fallar no es un gate: es una decoración. Ya pasó tres veces en
este proyecto (`04-BIBLIOTECA/patrones/guardianes-que-no-guardan`).

### Lo que NO tienes que firmar

**No corras `npm run seed` ni `npm run verificar:nube`**: necesitan credenciales de Firestore
que probablemente no tengas en el entorno. La prueba de la transacción contra la nube (que el
segundo cobro de la misma cita se rechaza) **la corre el arquitecto**. Si no puedes firmar un
gate, dilo — no lo reinterpretes ni lo declares no aplicable.

---

## 7. Si algo de este plano está mal, detente y dilo

Lo escribí **sin ejecutar el código**. Si encuentras que una premisa es falsa —que
`franjasDelDiaAction` no devuelve lo que digo, que la transacción no admite ese `tx.get`
extra, que `puedeTocarCita` estorba, que el flag de antelación ensucia más de lo que
ahorra— **para y repórtalo antes de improvisar una salida**.

Que encuentres un error mío no es un fallo del relevo: es su mejor resultado posible. La
última vez, un plano exigió una prueba imposible de escribir y el implementador, en vez de
decirlo, escribió una copia de la lógica y la probó a ella. **Prefiero mil veces un "esto
no se puede" que un verde inventado.**

---

## 8. Orden de trabajo

1. `src/lib/cobros.ts` y `scripts/prueba-cobros.ts` — **primero el rojo, luego el verde**
2. Tipos y el índice de `charges`
3. `aplicarCambioDeCita` con el cobro en la misma transacción
4. Permisos nuevos y las Server Actions
5. Las tres pantallas
6. `npm run verificar` completo y reporte con las salidas pegadas

Un solo commit al final, con la firma de Antigravity. No mezcles estos cambios con nada más.
