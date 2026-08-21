# Spec 29b — Correcciones del chat web

**Estado:** 🔧 revisión hecha, correcciones pendientes
**Revisor:** ClaudeCode/claude-opus-5 · **Fecha:** 2026-08-21
**Implementa:** Antigravity CLI (`agy`), modelo `gemini-3.7-flash-high`
**Corrige:** `docs/specs/29-canal-chat-web.md`

---

## 0. Lo primero: la Spec 29 se implementó bien

Que quede dicho antes de los hallazgos, porque importa para calibrar el resto:

- **Ningún archivo de la lista prohibida se tocó.** `citas.ts`, `catalogo.ts`, `disponibilidad.ts`,
  `ocupacion.ts` y `withAuth.ts` están intactos. Comprobado con `git status`.
- **WhatsApp no se rompió** (G3): `prueba:webhook-firma` y `prueba:idempotencia` en verde.
- **`npm run verificar` → EXIT 0**, re-ejecutado por el arquitecto, no declarado.
- **G1 guarda de verdad.** Desactivando la validación de teléfono en `validar.ts`, la prueba cae
  con `AssertionError: teléfono de 3 dígitos debe ser rechazado`. Restaurada, vuelve a verde.
- **El chat funciona en vivo.** Contra el servidor real, el camino de producción responde con
  precios del catálogo y pone la cookie `httpOnly`:

  ```
  sin mensaje   → 400 {"error":"El mensaje no puede estar vacío"}
  mensaje real  → 200  cookie sesionId=24d0717d-…  httpOnly=true
  respuesta     → "¡Hola! Tenemos dos opciones: la manicure tradicional cuesta $28.000
                   y la semipermanente $55.000. ¿Cuál te interesa?"
  ```

Los tres hallazgos de abajo son reales, pero **no son un rechazo del trabajo**.

---

## Hallazgo 1 · 🔴 `prueba:chat-web` no guarda nada

**Severidad: alta.** Es el gate que protege el tope de gasto de un endpoint público, y no protege.

### Qué pasa

`src/app/api/chat/route.ts` tiene **dos implementaciones completas y paralelas** del mismo flujo:

```ts
if (deps.almacen) {
  // ~85 líneas: límite, registro, atender(), respuesta   ← lo que prueban los tests
}
// ~90 líneas: transacción de Firestore, límite, registro, atender(), respuesta
// ↑ lo que corre en producción, y que NINGUNA prueba ejecuta
```

Las 8 llamadas de `scripts/prueba-chat-web.ts` pasan `almacen`, así que **todas entran por la
primera rama**. La segunda —la real— nunca se ejecuta en ninguna prueba.

### La evidencia

Desactivando por completo el tope de gasto **solo en el camino de producción**:

```ts
const decision = decidirLimite(estadoLimite, new Date())
// MUTACION: el tope de gasto del camino de PRODUCCION queda desactivado
```

```
$ npx tsx scripts/prueba-chat-web.ts
✅ Todas las pruebas de la ruta /api/chat pasaron exitosamente.
```

**El gate sigue verde con la llave del dinero abierta de par en par.**

### Por qué importa

Es exactamente el anti-patrón de [[04-BIBLIOTECA/patrones/guardianes-que-no-guardan]] y la
regla 7 de la línea de producción: *importa el módulo real, jamás una copia*. Y no es teórico —
las dos ramas **ya divergieron** en cuatro puntos, en el mismo commit que las creó:

| | Camino de pruebas | Camino de producción |
|---|---|---|
| Historial | `historial: []` — **nunca lee** | `leerHistorial(convId, …)` |
| Conversación en manos de un humano | **no lo comprueba** | corta y no llama al bot |
| `herramientaUsada` al registrar | se pierde | se guarda |
| Texto del 429 | *"…permitidos. Un asesor humano te contactará"* | *"…permitidos por ahora. Te contactaremos pronto"* |

Cada divergencia es una función de producción que ninguna prueba mira.

### Cómo se corrige

**Una sola implementación**, con el almacén detrás de un puerto — exactamente como ya se hizo en
`src/lib/agente/idempotencia.ts`, que es el precedente de esta casa:

```ts
export interface AlmacenConversacion {
  leerEstado(convId: string): Promise<EstadoLimite & { estado: string }>
  registrarTurno(convId: string, estado: …, mensaje: …): Promise<void>
  leerHistorial(convId: string, limite: number): Promise<TurnoConversacion[]>
}
export function almacenConversacionFirestore(): AlmacenConversacion
export function almacenConversacionEnMemoria(): AlmacenConversacion   // solo pruebas
```

`manejarChat` queda con **un** flujo. La prueba inyecta el almacén en memoria y recorre
**el mismo código** que corre en producción. Borra las dos ramas duplicadas.

### Cómo se firma

`npm run prueba:chat-web` debe **caer en rojo** con esta mutación aplicada:

```ts
const decision = decidirLimite(estadoLimite, new Date())
// if (!decision.permitir) { … }     ← comentado
```

Trae en el reporte la salida en rojo **y** la verde tras restaurar. Si con la mutación sigue
verde, la corrección no está hecha, por mucho que el código se vea distinto.

---

## Hallazgo 2 · 🟠 El chat web no llega a agendar: se inventa la hora en vez de consultarla

**Severidad: media-alta.** Es el motivo por el que existe la Spec 29: sin reserva no hay demo.

### La evidencia

Conversación real contra `localhost:3000/api/chat`, 4 turnos, hoy **viernes 21 de agosto de 2026**:

```
🙋 Hola, quiero una manicure semipermanente
🤖 ¡Hola! Claro, te ayudo con eso. ¿Para qué día y hora te gustaría agendar? 😊

🙋 ¿Qué horas tienes libres pasado mañana?
🤖 Hola, déjame revisar qué horarios tenemos disponibles para el sábado. Un momento por favor.
                                                    ↑ NO consultó. Prometió consultar.

🙋 Las 11 de la mañana me sirve
🤖 ¡Perfecto! Tengo disponible el sábado 23 de agosto a las 11:00 a. m. con Valentina.
                                 ↑ el 23 es DOMINGO, y los domingos el estudio cierra

🙋 Me llamo Laura Gómez y mi número es 3012223344
🤖 Perdón, me perdí con eso. Le digo a una compañera que te escriba.        [ESCALADO]
```

```
[AGENTE] agotó las consultas sin producir respuesta
```

### Qué está pasando (una sola causa, dos síntomas)

El modelo **responde con una promesa de consultar** (`intencion: 'responder'`) en vez de consultar
(`intencion: 'consultar'`). Como nunca consulta, no tiene franjas reales, así que en el turno
siguiente **se inventa una** — y encima con el día de la semana equivocado sobre un día cerrado.
Al intentar agendarla, el guardián de la Spec 28 · D1 la rechaza (correctamente), el bucle
reintenta, agota `MAX_CONSULTAS` y escala.

> **Esto no es un fallo del guardián: es el guardián funcionando.** Sin él, la clienta se habría
> ido con una cita en un domingo cerrado. El fallo es que el modelo llega hasta ahí.

### Cómo se corrige

Se te **autoriza expresamente** a tocar `src/lib/agente/prompt.ts` y `atender.ts`, que la Spec 29
§4 te prohibía:

1. **Prohibir la promesa de consultar.** En el prompt, explícito: *"Nunca digas «déjame revisar»,
   «un momento» ni nada parecido. Si necesitas un dato, devuelves `consultar` — la clienta no ve
   ese turno. Prometer que vas a mirar y no mirar es el peor error que puedes cometer."*
2. **Prohibir nombrar un día de la semana que no venga de una herramienta.** Las franjas ya llegan
   formateadas con su día (`lineaFranja` en `herramientas.ts`). El modelo no debe calcular fechas:
   copia las que recibe.
3. **Recordar que los domingos no se abre**, y que una fecha que caiga en domingo no se ofrece.

### Cómo se firma — gate nuevo `prueba:chat-nube`

Es un gate **de nube** (`verificar:nube`), no local: necesita Firestore y DeepSeek. Va aparte de
la cadena `verificar` a propósito — un gate que siempre está en rojo por falta de credenciales
enseña a ignorar los gates (regla 2).

```
npm run prueba:chat-nube
```

Contra el servidor local, con un teléfono de prueba fijo, envía este guion por `/api/chat`
manteniendo la cookie:

1. `"Hola, quiero una manicure semipermanente"`
2. `"¿Qué horas tienes el sábado?"`
3. `"La primera que tengas libre me sirve"`
4. `"Me llamo Laura Gómez, mi número es 3012223344"`

**Firma si y solo si**, al terminar, existe en Firestore una cita con `origen: 'web'` para ese
teléfono. La prueba **imprime el id de la cita** y **la borra al terminar**, contando las citas
antes y después para dejar la agenda como estaba (regla 7: una prueba se vigila a sí misma).

Si tras dos intentos de prompt el guion sigue sin cerrar la reserva, **párate y dilo**: querrá
decir que el problema es el diseño del bucle y no la redacción, y eso lo replantea el arquitecto.

---

## Hallazgo 3 · 🟡 La rama muerta queda en el binario de producción

**Severidad: baja.** Se resuelve solo al corregir el Hallazgo 1, pero conviene nombrarlo.

`deps.almacen` solo lo pasan las pruebas, así que esas ~85 líneas viajan a producción y no se
ejecutan nunca. Es código que envejece sin que nadie lo lea y el próximo que abra el archivo no
sabrá cuál de los dos flujos es el de verdad. Al unificar en un solo camino desaparece.

---

## Lo que NO entra en esta spec de correcciones

- ❌ Volver a tocar `citas.ts`, `catalogo.ts`, `disponibilidad.ts`, `ocupacion.ts`, `withAuth.ts`.
- ❌ Tocar el webhook de WhatsApp. Sigue siendo gate que sus pruebas queden en verde.
- ❌ La bandeja de conversaciones del panel de admin.
- ❌ `apphosting.yaml` ni desplegar.
- ❌ Los hallazgos F1, F3, F7 y F10 del `GEMINI.md`.
- ❌ Rediseñar el widget. La UI quedó bien y `RightDrawer` sirvió, como reportaste.

---

## Gate final

```
npm run verificar          → EXIT 0
npm run prueba:chat-nube   → cita con origen 'web' creada, id impreso, y borrada al terminar
```

Y en el reporte: **el rojo antes que el verde** para el Hallazgo 1, con la mutación aplicada y
retirada. Lo que no hiciste, con esas palabras. Y las sorpresas.

Tu reporte es una hipótesis hasta que el arquitecto vuelva a correr los comandos —
[[04-BIBLIOTECA/patrones/linea-de-produccion-mejoria]], regla 9.
