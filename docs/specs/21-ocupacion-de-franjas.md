# Spec 21 — Una sola verdad sobre la ocupación de franjas

- **Estado:** aprobado para implementar
- **Arquitecto:** `ClaudeCode/claude-opus-5` · **Implementa:** `Antigravity/gemini-3.6-flash`
- **Fecha:** 2026-08-13
- **Cierra:** F1 y F3 de `D:\MEMORIA\01-PROYECTOS\spa-demo\revision-migracion-firestore.md`
- **Contexto:** Casa Malva sale a **producción real, con clientas reservando de verdad**. Estos
  dos fallos no molestan: corrompen agendas de personas.

---

## 1. Los dos fallos, y por qué son el mismo

### F1 · Reagendar deja la cita sin candado

`reagendarCitaAction` hace dos operaciones **separadas**:

1. `liberarSlotsCita(...)` — un `batch` que borra los slots viejos.
2. `reservarCitaConSlots(...)` — una transacción **nueva** que intenta crear los nuevos.

Y esa segunda termina en `tx.create(appointmentRef, appointment)`, sobre un documento de cita
que **ya existe**. Firestore rechaza `create` sobre un documento existente, la transacción
aborta entera, y el `catch` traduce el error a `cupo_ocupado` — un mensaje falso, porque el cupo
estaba libre.

**Estado final:** la cita sigue en su hora original y **sin un solo slot que la proteja**. Otra
clienta puede reservar encima. La función que existe para impedir la doble reserva la provoca.

Y aunque se arreglara el `create`, quedaría el fallo de fondo: **entre el paso 1 y el paso 2 hay
una ventana** en la que las franjas están libres. Dos operaciones no son atómicas por estar
seguidas.

### F3 · Dos fuentes de verdad que divergen

- La **disponibilidad** se decide leyendo `appointments` (`getOccupiedBlocks`).
- El **candado** vive en `slots`.

Coinciden solo si *toda* transición de estado actualiza las dos. Y no ocurre:
`marcarNoAsistioAction` cambia el estado a `no_asistio` —con lo que `getOccupiedBlocks` deja de
contar esa cita y la franja aparece libre— pero **nunca borra los slots**.

**Consecuencia:** el sistema ofrece la franja, la clienta la elige, y al confirmar recibe
`cupo_ocupado` sin explicación posible. Cada no-show deja un hueco fantasma permanente.

### Son el mismo fallo

Los dos violan *un escritor por hecho*
([[04-BIBLIOTECA/patrones/trazabilidad-mejoria]]): **que una franja esté ocupada es UN hecho**, y
hoy se escribe en dos sitios con reglas distintas. F1 es ese hecho escrito en dos pasos no
atómicos; F3 es ese hecho escrito en dos colecciones que se desincronizan.

---

## 2. La decisión

### 2.1 Un solo lugar decide si un estado ocupa

Nace `src/lib/ocupacion.ts`. Empieza por lo que hoy está implícito y repartido:

```ts
/** Estados en los que la cita RETIENE su franja. Los demás la liberan. */
export const ESTADOS_QUE_OCUPAN = ['pendiente', 'agendada', 'confirmada', 'completada'] as const

export function ocupaFranja(estado: AppointmentState): boolean {
  return (ESTADOS_QUE_OCUPAN as readonly string[]).includes(estado)
}
```

`cancelada` y `no_asistio` **no** ocupan.

`getOccupiedBlocks` en `disponibilidad.ts` deja de tener su propia lista negra
(`if (a.estado === 'cancelada' || a.estado === 'no_asistio') continue`) y pasa a preguntar
`ocupaFranja(a.estado)`. **A partir de aquí solo hay una respuesta a "¿esto ocupa?".**

### 2.2 El plan se separa de la ejecución

Ésta es la pieza central, y existe por una razón concreta: **una transacción de Firestore no se
puede probar sin credenciales, pero una decisión pura sí**. Así que se parte en dos.

`calcularFranjasSlot` se **mueve** de `db.ts` a `ocupacion.ts` (misma lógica, sin tocar), y a su
lado nace la función que decide qué hacer:

```ts
export type PlanDeSlots = {
  crear: string[]    // ids de slot a crear   (`${professionalId}_${inicioUtcISO}`)
  borrar: string[]   // ids de slot a borrar
}

/**
 * Qué slots hay que crear y cuáles borrar para pasar de `antes` a `despues`.
 * `antes` es null cuando la cita se está creando.
 * Función PURA: sin Firestore, sin red, sin reloj. Por eso se puede probar de verdad.
 */
export function planificarSlots(
  antes: { professionalId: string; inicioUtc: string; estado: AppointmentState } | null,
  despues: { professionalId: string; inicioUtc: string; estado: AppointmentState },
  duracionTotalMin: number
): PlanDeSlots
```

Reglas que debe cumplir, y que la prueba comprobará una por una:

| Caso | Resultado esperado |
|---|---|
| Cita nueva en estado que ocupa | `crear` = todas sus franjas · `borrar` = vacío |
| Cita nueva en estado que NO ocupa | ambos vacíos |
| Cancelar o marcar no-asistió | `crear` vacío · `borrar` = todas las franjas viejas |
| Reagendar sin solapamiento (10:00 → 15:00) | `borrar` = las 4 viejas · `crear` = las 4 nuevas |
| **Reagendar CON solapamiento (10:00 → 10:15)** | **las franjas compartidas NO se borran ni se recrean**: solo se borra 10:00 y solo se crea 11:00 |
| Cambio de profesional a la misma hora | `borrar` las del profesional viejo · `crear` las del nuevo |
| Estado que ocupa → otro estado que ocupa, misma hora | ambos vacíos (no hay nada que hacer) |

> El caso del solapamiento es el que importa. Borrar y recrear una franja compartida abre una
> ventana en la que queda libre — y es exactamente el fallo de F1 en pequeño.

### 2.3 Una sola transacción ejecuta el plan

En `db.ts`, `reservarCitaConSlots` y `liberarSlotsCita` se sustituyen por **una** función:

```ts
/**
 * Aplica el plan y persiste la cita en UNA sola transacción de Firestore.
 * Lecturas primero, escrituras después (lo exige el motor).
 */
export async function aplicarCambioDeCita(
  cita: Appointment,
  plan: PlanDeSlots
): Promise<{ ok: true; data: Appointment } | { ok: false; error: 'cupo_ocupado' }>
```

Dentro, en este orden:

1. **Lecturas.** Todos los slots de `plan.crear`.
2. **Validación.** Si alguno existe **y su `appointmentId` es distinto** al de esta cita → aborta
   con `cupo_ocupado`. Si existe y es de esta misma cita, no es colisión: se deja como está.
3. **Escrituras.** `tx.delete` de `plan.borrar` · `tx.create` de los de `plan.crear` que no
   existían · `tx.set(appointmentRef, cita, { merge: true })`.

**`tx.set` con `merge`, nunca `tx.create`** para el documento de la cita: es el fallo exacto de
F1. `create` solo se usa para los slots, donde la colisión *es* la señal que queremos.

### 2.4 Todas las transiciones pasan por el mismo camino

En `citas.ts`, las cinco acciones que hoy cambian estado a mano —`confirmar`, `cancelar`,
`marcarCompletada`, `marcarNoAsistio`, `reagendar`— pasan a construir la cita actualizada,
llamar a `planificarSlots(antes, despues, duracion)` y luego a `aplicarCambioDeCita`.

`crearCitaAction` usa el mismo camino con `antes = null`.

**Ninguna acción vuelve a tocar slots por su cuenta.** Si alguien añade mañana un estado nuevo,
lo declara en `ESTADOS_QUE_OCUPAN` y todo el sistema se entera a la vez.

### 2.5 La duración se guarda, no se adivina

Hoy, al cancelar, la duración se recalcula desde el servicio actual con
`(svc?.duracionMin ?? 40) + (svc?.bufferMin ?? 10)`. Si el servicio cambió de duración desde que
se agendó la cita, **se borran franjas equivocadas y quedan slots huérfanos bloqueando la agenda
para siempre**.

`Appointment` gana un campo:

```ts
duracionTotalMin: number   // congelado al agendar, igual que precioCentavos
```

Se rellena en `crearCitaAction` y se usa en todas las transiciones. Los `?? 40` y `?? 10` de
`citas.ts` y de `getOccupiedBlocks` **desaparecen**: si falta el dato, es un fallo de integridad
y se reporta, no se inventa (`04-BIBLIOTECA/patrones/fallos-silenciosos`).

Para las citas del seed, `duracionTotalMin` se calcula al sembrar.

---

## 3. Lo que NO entra

- **F10** (colecciones enteras por reserva). Tiene su propio plano.
- **F7** ya está cerrado; no rehagas `prueba-permisos.ts`.
- Multi-negocio / `businessId`. Mario decidió un solo negocio.
- Interfaz: solo lo que rompa por el campo nuevo.

---

## 4. Tarea previa · partir `verificar` en dos

**Hazla primero, es de dos líneas.** `npm run verificar` incluye hoy `prueba:doble-reserva`, que
necesita credenciales de Firestore y **falla siempre en local**. Una cadena que nunca puede pasar
enseña a ignorarla — sería fabricar otro guardián que no guarda. Se parte:

```json
"verificar":      "npm run tsc && npm run lint && npm run prueba:zona && npm run prueba:permisos && npm run prueba:ocupacion && npm run build",
"verificar:nube": "npm run prueba:doble-reserva"
```

`verificar` **tiene que pasar entero en local, siempre**. `verificar:nube` se corre donde haya
credenciales. *(Este hueco lo abrió el arquitecto, no tú: lo detectó tu propio reporte del
2026-08-13 al pegar el error de ADC. Gracias por pegarlo entero.)*

---

## 5. La prueba: `scripts/prueba-ocupacion.ts`

**Se puede escribir. Lo comprobé antes de pedirla** — ésa es la lección de la Spec 20: toda la
lógica que hay que verificar vive en funciones puras de `ocupacion.ts`, sin Firestore ni red.
Si al implementarla descubres que algo **sí** exige credenciales, eso es un error mío de diseño:
**detente y dilo**, no lo simules.

Importa `src/lib/ocupacion.ts` — el módulo real, nunca una copia — y cubre:

1. `ocupaFranja` para los seis estados, uno por uno.
2. `calcularFranjasSlot`: duración exacta, duración no múltiplo de 15, duración menor que el paso.
3. **`planificarSlots`: los siete casos de la tabla de §2.2**, con el del solapamiento como el
   más importante.
4. **La prueba de coherencia que caza F3**, y que es la que de verdad importa:
   para cada uno de los seis estados, comprobar que
   *"¿`ocupaFranja` dice que ocupa?"* y *"¿el plan deja slots creados?"* dan **la misma
   respuesta**. Si algún día divergen, esta prueba lo dice.

### El rojo previo, esta vez sí es posible

Antes de escribir `ocupacion.ts`, escribe una prueba corta contra el **código actual** que
demuestre F3, y pega su salida en rojo:

> Toma una cita en estado `no_asistio`. Comprueba que `getOccupiedBlocks` la considera libre
> (no devuelve bloque) mientras `calcularFranjasSlot` sigue nombrando las franjas que el
> documento de slot mantiene ocupadas. **Esa contradicción es F3**, y es reproducible sin
> Firestore.

Sin ese rojo, el verde final no demuestra nada.

---

## 6. Gate de terminado

Uno solo, y es un comando:

```bash
npm run verificar
```

Tiene que pasar **entero**. Más el rojo previo de §5 pegado en el reporte.

`verificar:nube` y `npm run seed` quedan para el arquitecto, que tiene credenciales: **no los
firmes tú**.

---

## 7. Si el plano está mal

Detente y dilo. Lo escribí sin ejecutar el código. Que encuentres una premisa falsa es el mejor
resultado posible de esta tarea — y esta vez, si te pido una prueba que no se puede escribir,
**la respuesta correcta es decirlo**, no fabricar un doble para que salga verde.
