# Spec 28 — La recepcionista 24/7 por WhatsApp

**Estado:** ✅ plano cerrado, en implementación — decisiones D7, D8 y el alcance de §4 resueltos por Mario el 2026-08-20
**Arquitecto:** ClaudeCode/claude-opus-5 · **Fecha:** 2026-08-20
**Implementa:** por asignar (Antigravity CLI o ClaudeCode)
**Depende de:** Spec 21 (ocupación de franjas), Spec 22 (lecturas acotadas), Spec 24 (ciclo del dinero)

> ℹ️ **Por qué 28 y no 27.** El número 27 estaba **reservado desde antes** para el hueco A7
> (homónimas y fusión de fichas), según `01-PROYECTOS/spa-demo/ESTADO.md`. No existe todavía como
> archivo, pero se respeta la reserva: el hueco de la numeración es intencional, no un descuido.

---

## 1. El problema

Casa Malva **habla, pero no escucha**.

Hoy `src/lib/whatsapp/` sabe *enviar*: hay cliente HTTP contra Meta Cloud API, plantillas de
confirmación y un probador en el panel. Lo que no existe —comprobado, no supuesto— es la otra
mitad: **la carpeta `src/app/api` no existe en el repositorio**. No hay webhook. Ningún mensaje
que una clienta escriba llega jamás al sistema.

Eso convierte el momento que vende —*"el dueño le escribe al bot como si fuera una clienta,
agenda «manicure el jueves a las 3», y ve la cita aparecer en el panel delante de él"*— en el
único momento del demo que **no se puede hacer**. Por eso `PUNTO-DE-RETOMA` lo declaró
*bloqueante comercial*, no solo técnico.

Y hay un problema de negocio detrás del técnico: un salón pierde reservas fuera de horario.
El horario de Casa Malva es lunes a sábado, 09:00–19:00 (`REGLAS_NEGOCIO.horarioEstudio`).
Las otras **118 horas de la semana** no las atiende nadie. Una recepcionista 24/7 no es un
adorno de IA: es el turno de noche que el negocio no puede pagar.

Esta spec construye ese turno:

> la clienta escribe a cualquier hora → el agente entiende, responde y **agenda de verdad** →
> la cita aparece en el mismo panel, en la misma agenda, con `origen: 'whatsapp'`

---

## 2. Lo que ya existe y NO se vuelve a construir

Aplicación de la regla de reutilización (`CLAUDE.md` §9). Auditado en el código el 2026-08-20:

| Pieza | Dónde | Estado |
|---|---|---|
| Envío a Meta Cloud API | `src/lib/whatsapp/client.ts` | ✅ funciona, ya probado desde el panel |
| Normalización de teléfono | `sanitizePhoneForMeta`, `normalizePhoneE164` | ✅ |
| **Crear cita (pública, anti-doble-reserva atómica)** | `crearCitaAction` — `src/actions/citas.ts:192` | ✅ **y su input ya acepta `origen: 'whatsapp'`** |
| Consultar disponibilidad (pública) | `consultarDisponibilidadAction` — `citas.ts:648` | ✅ |
| Franjas libres de un día (pública) | `franjasDelDiaAction` — `citas.ts:539` | ✅ |
| Días con cupo (pública) | `diasConCuposAction` — `citas.ts:598` | ✅ |
| Identificar clienta por teléfono | `getClientByPhone` — `src/lib/db.ts:177` | ✅ *(corregido: el plano la llamaba `getClientByTelefono`, que no existe)* |
| Zona horaria declarada una sola vez | `REGLAS_NEGOCIO.zonaHoraria = 'America/Bogota'` | ✅ regla 4 ya cumplida |
| Catálogo, precios, duraciones | `src/actions/catalogo.ts` | ✅ |

**Traducción:** las cuatro herramientas que el agente necesita para agendar **ya están escritas y
ya tienen pruebas** (`prueba:ocupacion`, `prueba:doble-reserva`). Esta spec **no toca la lógica de
agenda**. Añade una oreja (el webhook) y un cerebro (el agente) encima de lo que ya funciona.

---

## 3. Decisiones de diseño (con su porqué)

### D1 · El LLM **nunca** escribe en Firestore. Solo produce un plan.

El agente no ejecuta: **decide**. Su salida es un objeto tipado, no una acción.

```ts
type PlanDelAgente =
  | { intencion: 'responder';  texto: string }
  | { intencion: 'consultar';  herramienta: NombreHerramienta; args: ArgsHerramienta }
  | { intencion: 'agendar';    serviceId: string; professionalId: string; inicioUtc: string; nombre: string }
  | { intencion: 'escalar';    motivo: string }
```

Un **ejecutor determinista** valida ese plan y llama a las server actions que ya existen.

**Por qué:** es la regla 5 de la línea de producción (*separa el plan de la ejecución*) aplicada
al caso más peligroso posible. Un LLM alucina; `crearCitaAction` no. Si el modelo inventa una
franja ocupada, un servicio inexistente o una hora fuera de horario, **la transacción de slots la
rechaza igual que rechaza al wizard web**. La calidad del agente puede degradarse; la integridad
de la agenda, no.

Corolario: `ejecutarPlan()` es determinista y se prueba entero **sin llamar al LLM ni gastar un
centavo**, alimentándolo con planes escritos a mano.

### D2 · El teléfono E.164 es la identidad. No hay login, no hay código.

`getClientByTelefono(telefonoE164)` resuelve quién escribe. Si no existe, se crea la clienta con
el nombre que ella misma dé.

**Por qué:** WhatsApp ya autenticó el número — es su producto entero. Pedir un código de
verificación encima sería pedirle a la clienta que demuestre lo que Meta ya demostró, y mata la
conversión. **Límite explícito:** por eso mismo la v1 no cancela ni reagenda (ver §4) — leer un
catálogo y crear una cita a tu propio nombre es inofensivo si el número está suplantado; cancelar
la cita de otra persona no lo es.

### D3 · Idempotencia por `message.id`, o el agente duplica citas

Cada mensaje entrante se registra en `mensajes_procesados/{wamid}` **antes** de procesarlo. Si el
documento ya existe, se responde 200 y se termina.

**Por qué:** Meta **reintenta** la entrega si el webhook no contesta 200 rápido. Sin esta guarda,
un reintento sobre *"sí, agéndame esa"* crea dos citas. Y no es teórico: `apphosting.yaml` tiene
`minInstances: 0`, así que el primer mensaje tras un rato de silencio paga arranque en frío —
exactamente el escenario que dispara el reintento.

Es la misma técnica de id determinista que la Spec 24 usó para el cobro (`chg_${appointmentId}`).

### D4 · El webhook contesta 200 **antes** de pensar

`route.ts` hace tres cosas y devuelve: valida la firma, marca el `wamid`, y encola. El trabajo
lento (LLM + Firestore + respuesta) ocurre después.

**Por qué:** Meta corta a los pocos segundos y reintenta. Un LLM tarda más que eso.

⚠️ **Riesgo abierto que el implementador NO puede resolver solo:** Cloud Run puede congelar la
instancia en cuanto la respuesta HTTP sale, y matar el trabajo diferido a media frase. Las dos
salidas son `minInstances: 1` en `apphosting.yaml` (cuesta cómputo permanente) o una cola real
(Cloud Tasks). **Decisión D8, abajo.**

### D5 · Firma verificada con HMAC-SHA256 sobre el cuerpo crudo. Sin firma válida → 401.

`X-Hub-Signature-256` contra `WHATSAPP_APP_SECRET`, comparado en tiempo constante.

**Por qué:** la URL del webhook es pública. Sin verificación de firma, cualquiera que la descubra
le dicta citas al salón. Y **el cuerpo tiene que leerse crudo** (`await req.text()`), porque
`req.json()` reserializa y la firma deja de cuadrar — es el error clásico de esta integración.

Aplicación directa de la regla 3 (*falla cerrado*): sin firma, sin token o sin secreto → se niega.
Nunca se procesa "por si acaso".

### D6 · Un solo cerebro, canales como adaptadores

```
src/lib/agente/            ← no sabe qué es WhatsApp
  ├─ prompt.ts             persona + reglas de negocio + catálogo inyectado
  ├─ herramientas.ts       las 5 herramientas → server actions YA EXISTENTES
  ├─ planificar.ts         mensaje + historial → PlanDelAgente   (impuro: llama al LLM)
  ├─ ejecutar.ts           PlanDelAgente → resultado             (determinista, probable)
  └─ llm.ts                puerto: UNA interfaz, una implementación

src/app/api/whatsapp/webhook/route.ts   ← el adaptador: traduce Meta ↔ agente
```

**Por qué:** es la decisión #5 de `PROYECTO.md`, ya tomada el 2026-08-11. El chat web entra por el
mismo cerebro sin reescribir nada, y el agente se prueba en local sin Meta.

### D7 · El cerebro es **DeepSeek** — decidido por Mario el 2026-08-20

`deepseek-chat` por su API compatible con OpenAI (`https://api.deepseek.com/chat/completions`),
llamada con `fetch` plano: **cero dependencias nuevas** en `package.json`.

Se usa **modo JSON**, no *function calling*. El modelo devuelve un `PlanDelAgente` como JSON y
nada más. Es lo que hace que D1 funcione con cualquier modelo, incluidos los que llaman
herramientas de forma menos fiable: si el JSON no valida contra el esquema, el plan se descarta y
el agente escala. Un plan mal formado nunca llega a Firestore.

> ⚠️ **Riesgo declarado, aceptado por Mario:** DeepSeek es un proveedor chino. Los nombres y
> teléfonos de las clientas salen del país al procesarse. En Colombia eso cae bajo la
> **Ley 1581 de 2012** (transferencia internacional de datos personales), y es una pregunta que un
> spa puede hacer en la venta. Mitigación mínima obligatoria en la v1: **al prompt solo se le envía
> el nombre de pila y el texto de la conversación — nunca el teléfono, el email ni el `clientId`.**
> El teléfono se resuelve fuera del LLM, en el ejecutor. Ver `armarPrompt()`.

### D8 · El "24/7" se sostiene con `minInstances: 1` — decidido por Mario el 2026-08-20

Una línea en `apphosting.yaml`. Siempre hay una instancia despierta, así que el mensaje de la
madrugada se contesta a la primera y el trabajo diferido de D4 no muere con la instancia.

**Lo que cuesta:** se acaba el "escala a cero, sin costo de cómputo" que declaraba el archivo. Pasa
a haber cómputo fijo permanente. Es el precio de poder decirle *24/7* al dueño del spa sin mentir.

---

## 4. Lo que NO entra en esta spec

Sin esta sección, un agente rápido "arregla de paso" lo que ve y mezcla dos trabajos en un commit
que ya nadie puede revisar (regla 1).

- ❌ **Cancelar y reagendar por WhatsApp.** `cancelarCitaAction` y `reagendarCitaAction` están
  protegidas por `withAuth`, y abrirlas al público es una decisión de seguridad propia (ver D2).
  En la v1 el agente **escala a un humano**. Es la funcionalidad más obvia de la v2.
- ❌ **Cobrar, pedir anticipo o tocar dinero.** El ciclo del dinero es de la Spec 24 y vive en el
  panel.
- ❌ **Recordatorios proactivos y campañas.** Salir de la ventana de 24 h exige plantillas
  aprobadas por Meta. Trabajo aparte.
- ❌ **Cambiar la lógica de agenda, disponibilidad, ocupación o zona horaria.** Si el agente
  necesita algo que las acciones actuales no dan, **se para y se dice**; no se retoca `citas.ts`.
- ❌ **Audio, imágenes, ubicación, stickers.** La v1 entiende texto. Otro tipo de mensaje se
  responde con una frase honesta y se escala.
- ❌ **Multi-negocio / multi-tenant.** Un número, un salón. La generalización llega cuando haya
  un segundo cliente pagando.
- ❌ **Número real de producción y verificación de negocio ante Meta.** Se construye contra el
  **número de prueba** (decisión #3 de `PROYECTO.md`): gratis, hasta 5 destinatarios verificados,
  sin verificación de negocio. Cambiar al número real es cambiar variables de entorno, no código.

---

## 5. Gates ejecutables

Un gate es un comando, no un párrafo (regla 2). Todo lo nuevo entra en la cadena `verificar`, que
tiene que pasar **en local y sin credenciales**.

| Gate | Comando | Qué demuestra |
|---|---|---|
| G1 | `npm run prueba:webhook-firma` | Cuerpo con firma válida → 200. Firma alterada, ausente o secreto equivocado → 401. Y el `GET` de verificación devuelve el `hub.challenge` solo con el token correcto |
| G2 | `npm run prueba:idempotencia` | El **mismo `wamid` procesado dos veces crea UNA sola cita.** Cuenta las citas antes y después |
| G3 | `npm run prueba:plan` | `ejecutarPlan()` contra planes escritos a mano, **sin LLM**: plan de agendar válido → cita creada; servicio inexistente → rechazo; franja ocupada → rechazo; hora fuera de `horarioEstudio` → rechazo; domingo → rechazo |
| G4 | `npm run prueba:zona` *(ya existe)* | Sigue en verde: el agente no introdujo ninguna fecha con la hora del servidor (regla 4) |
| G5 | `npm run verificar` | Tipos + estilo + **todas** las pruebas + `next build`, encadenados |

**Las pruebas se corren primero contra el código roto y se guarda esa salida en rojo** (regla 7).
Un gate que nunca estuvo rojo no protege nada.

**Lo que estos gates NO cubren, y hay que decirlo:** ninguno prueba que la conversación sea *buena*.
La calidad de la charla se juzga a ojo, con Mario, escribiéndole al bot desde su celular. Ese es un
gate humano y **lo firma Mario, no el implementador** (regla 9).

---

## 5.bis Lo que se rompió al implementar — 2026-08-20

Se cumple §6: en vez de parchear en silencio, queda escrito.

### Hallazgo 1 · `db.ts` no sobrevivía a una ruta de API — **arreglado**

El webhook devolvía **200 a Meta y moría por dentro** sin escribir nada:

```
Error: Firestore has already been initialized. You can only call settings() once…
    at getDb (src/lib/db.ts:55)
```

`firestoreInstance` es una variable de **módulo**, pero `getFirestore(app)` devuelve un
**singleton del proceso**. Con dos grafos de módulos vivos —una página y una ruta de API— el
segundo entra con la variable en `null` y recibe la instancia ya configurada. `settings()` solo
admite una llamada.

**Estaba latente desde el primer día y nadie lo vio porque el proyecto no tenía ninguna ruta de
API.** `/api/whatsapp/webhook` fue la primera de su historia, y la destapó. Cualquier ruta futura
—pasarela de pago, webhook de Google Calendar, health check— habría chocado con lo mismo.

Arreglado con una bandera en `globalThis` (lo único que sí es único por proceso). El comentario
del porqué queda en `src/lib/db.ts`.

### Hallazgo 2 · El bucle del agente se mordía la cola — **arreglado**

Con *"¿qué horas tienes libres el viernes?"*, el agente consultaba las franjas, recibía los datos,
**y volvía a consultar lo mismo** hasta agotar el tope y escalar. Dos causas:

1. El resultado de la herramienta se **pisaba** en vez de acumularse: al consultar dos veces,
   olvidaba el servicio del que estaba hablando.
2. Al modelo se le daban los datos, pero no la orden de **dejar de consultar**.

Arreglado en `atender.ts` (acumula) y `prompt.ts` (*"YA CONSULTASTE… en este turno NO vuelvas a
consultar"*), y el tope subió de 2 a 3.

### Hallazgo 3 · D1 funcionó en vivo, y no era teoría

Al terminar de agendar, el modelo intentó **reservar otra vez la misma hora** que acababa de
ocupar. El guardián lo paró:

```
[AGENTE] plan de agendar rechazado: franja_no_ofrecida ·
         2026-08-22T15:00:00.000Z no está entre las franjas libres de Valentina Ruiz
```

Sin la barrera de D1, eso habría sido una doble reserva sobre la clienta misma, en el primer día
de vida del agente.

---

## 6. Si el plano está mal, detente y dilo

Este plano asume cosas que se comprobaron el 2026-08-20 en `D:\MeJorIA\Proyectos\casa-malva`. Si al
implementar alguna resulta falsa —las acciones públicas de `citas.ts` no sirven tal cual, la firma
no cuadra, el trabajo diferido muere con la instancia, el número de prueba no acepta el webhook—
**para y dilo. No lo parchees en silencio.**

Un implementador que descubre una premisa falsa y la remienda por su cuenta convierte un plano
malo en un sistema malo que además nadie sabe que está malo (regla 8).

Y el reporte de quien implemente es una **hipótesis** hasta que el arquitecto vuelva a correr los
comandos (regla 9). "No lo hice yo" no es lo mismo que "no está hecho".
