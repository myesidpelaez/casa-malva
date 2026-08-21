# Spec 29 — El chat web sobre el mismo cerebro

**Estado:** ✅ plano cerrado, listo para implementar
**Arquitecto:** ClaudeCode/claude-opus-5 · **Fecha:** 2026-08-20
**Implementa:** Antigravity CLI (`agy`), modelo `gemini-3.7-flash-high`
**Depende de:** **Spec 28 (la recepcionista de WhatsApp) — léela entera antes de tocar nada**

---

## 1. El problema

El agente recepcionista funciona: atiende, consulta la agenda y **crea citas de verdad**. Pero
solo se le puede hablar por WhatsApp, y WhatsApp está **bloqueado por Meta**, no por nosotros:

```
Onboarding failure
Your business is prohibited from advertising, including app sharing.
```

El portafolio Casa Malva arrastra una restricción preventiva desde el 2026-08-17. Activar
WhatsApp exige *app sharing*, que es justo lo que la restricción prohíbe. La apelación lleva
tres días sin respuesta y **no depende de nosotros**.

Consecuencia comercial: el momento que vende —*"escríbele al bot como si fueras una clienta y
mira la cita aparecer en el panel"*— **no se puede enseñar**, aunque el agente ya sepa hacerlo.

La salida estaba prevista en el diseño. La Spec 28 · D6 dejó el cerebro en `src/lib/agente/`
**sin que sepa qué es WhatsApp**, y el webhook como un adaptador encima. Esta spec añade el
segundo adaptador:

```
WhatsApp  ─┐
           ├─→  atender()  →  el MISMO cerebro  →  la MISMA agenda
Chat web  ─┘
```

**Si al implementar hace falta cambiar el cerebro para que el chat web funcione, el diseño está
mal. Párate y dilo** (§6).

---

## 2. Lo que ya existe y NO se vuelve a construir

| Pieza | Dónde | Se usa tal cual |
|---|---|---|
| El cerebro completo | `src/lib/agente/atender.ts` | ✅ **no se reescribe** |
| Validación de planes (pura) | `src/lib/agente/validar.ts` | ✅ |
| Ejecutor y herramientas | `src/lib/agente/ejecutar.ts`, `herramientas.ts` | 🔧 solo lo que nombra D2 |
| Persistencia de conversación | `src/lib/agente/conversacion.ts` | 🔧 solo lo que nombra D3 |
| Tipos `Conversation` / `Message` | `src/types/index.ts` | ✅ **ya contemplan `canal: 'web'`** |
| Crear cita, disponibilidad, catálogo | `src/actions/citas.ts`, `catalogo.ts` | ✅ **prohibido tocarlos** |
| Sistema de diseño y drawers | `src/components/ui/`, `04-BIBLIOTECA/ui/cero-scroll` | ✅ |

---

## 3. Decisiones de diseño (con su porqué)

### D1 · El chat web entra por `atender()`, exactamente igual que WhatsApp

El adaptador web traduce petición HTTP → `EntradaAtencion`, llama a `atender()`, y traduce la
respuesta a JSON. Nada más.

**Por qué:** dos cerebros divergen a la semana. Si el bot web aprende a agendar un caso que el de
WhatsApp no, la dueña del spa recibe dos comportamientos distintos del mismo negocio. Un cerebro,
dos bocas.

### D2 · En web no hay teléfono, así que el agente lo pide — y sin él NO agenda

`ContextoAgente` pasa a ser:

```ts
export type ContextoAgente = {
  canal: 'whatsapp' | 'web'
  /** En WhatsApp llega de Meta. En web es null hasta que la clienta lo dé. */
  telefonoE164: string | null
  nombre: string
  clientId?: string
  /** Llave de la conversación: `wa_<digitos>` o `web_<uuid>`. */
  conversacionId: string
}
```

Y el plan de agendar admite un campo nuevo, **opcional**:

```ts
| { intencion: 'agendar'; serviceId: string; professionalId: string;
    inicioUtc: string; nombre: string; telefono?: string }
```

Regla del ejecutor, **determinista**: para agendar hace falta un teléfono, venga del contexto
(WhatsApp) o del plan (web). Si no hay ninguno, **no se agenda** y se le devuelve al modelo:

> *"No agendé: todavía no tienes el teléfono de la clienta. Pídeselo antes de confirmar."*

**Por qué así y no haciendo el teléfono opcional en la cita:** `crearCitaAction` necesita teléfono
para resolver o crear la clienta, y una cita sin forma de contactar a quien la reservó es basura
operativa — el salón no puede avisar de un cambio. Además una recepcionista de verdad **también**
pide el número. No es una limitación técnica disfrazada: es el comportamiento correcto.

El teléfono que llega en el plan se normaliza con `normalizePhoneE164` (ya existe) y se valida:
**entre 10 y 15 dígitos**. Lo que no valide se rechaza con el motivo `telefono_invalido`, igual que
cualquier otro campo que el modelo se invente.

### D3 · La conversación web se guarda en la misma colección

`conversations/{conversacionId}` con `canal: 'web'`. Las funciones de `conversacion.ts` dejan de
recibir un teléfono y pasan a recibir el `conversacionId` ya calculado.

**Por qué:** la bandeja del panel que se construirá después tiene que ver las dos por igual. Dos
colecciones significan dos consultas, dos formatos y una pantalla que muestra la mitad.

`idConversacion(telefonoE164)` sigue existiendo para WhatsApp; se le añade `idConversacionWeb(sesionId)`.

### D4 · 🔴 El endpoint es público y llama a un LLM: sin tope es una llave de dinero abierta

Esto **no es opcional** y es la parte que más fácil se olvida. `/api/chat` no tiene sesión de
usuario: cualquiera en internet puede pegarle en bucle y gastar la cuenta de DeepSeek.

Dos topes, y la decisión de cortar es una **función pura**:

```ts
// src/lib/agente/limite.ts  — puro, sin red ni Firestore
export function decidirLimite(
  estado: { mensajesEnVentana: number; ventanaAbiertaEn: string | null },
  ahora: Date
): { permitir: true; nuevoEstado: … } | { permitir: false; motivo: 'demasiados_mensajes' }
```

- **20 mensajes por hora** y por conversación.
- **60 mensajes en total** por conversación; superado eso, la conversación se marca `escalada` y
  el bot deja de responder.

El contador vive en el documento de la conversación (`mensajesEnVentana`, `ventanaAbiertaEn`,
`mensajesTotales`) y se actualiza **en la misma transacción** que registra el mensaje. Al superarse,
la ruta responde **429** con un texto amable, sin llamar al modelo.

Que la función sea pura es lo que permite probar los topes **sin Firestore y sin gastar un centavo**.

### D5 · Transporte: `POST /api/chat` con cookie de sesión `httpOnly`

- La primera petición sin cookie crea un `sesionId` (UUID v4) y lo devuelve en una cookie
  `httpOnly`, `sameSite=lax`, `secure` en producción, 30 días.
- Cuerpo: `{ mensaje: string }`. Máximo **1000 caracteres**; más largo → **400**.
- Respuesta: `{ texto: string, escalado: boolean }`.
- `export const runtime = 'nodejs'` y `dynamic = 'force-dynamic'`, como el webhook.

**Por qué cookie y no un id que mande el navegador:** un id que viaja en el cuerpo lo cambia
cualquiera en cada petición, y el tope de D4 deja de servir — te inventas una sesión nueva por
mensaje. `httpOnly` no lo hace inviolable, pero sube el listón lo suficiente.

### D6 · La UI es un botón flotante que abre un panel, con el sistema de diseño de la casa

- Botón flotante abajo a la derecha, en todas las páginas públicas (`(public)`), **no** en `/admin`.
- Al abrir: panel con el historial del turno, campo de texto y envío con Enter.
- Estados obligatorios y visibles: **escribiendo…**, **error de red con reintento**, y
  **"te paso con una persona"** cuando `escalado: true`.
- Respeta [[04-BIBLIOTECA/ui/cero-scroll]] y los tokens del sistema de diseño. **Funciona en modo
  claro y oscuro** — la marca La Vena ya tiene ambos.
- Móvil: ocupa la pantalla; escritorio: panel lateral. Reusa `RightDrawer` si encaja; si no,
  **dilo en el reporte** en vez de duplicar su lógica.

**Lo que NO hace la UI:** no guarda nada en `localStorage`, no muestra el historial de sesiones
anteriores, no tiene indicador de "leído".

---

## 4. Lo que NO entra en esta spec

Sin esta sección, un implementador rápido arregla de paso lo que ve y mezcla dos trabajos en un
commit que ya nadie puede revisar.

- ❌ **Tocar `src/actions/citas.ts`, `catalogo.ts`, `disponibilidad.ts`, `ocupacion.ts` o
  `withAuth.ts`.** Ni una línea. Si crees que hace falta, **párate y dilo**.
- ❌ **Cambiar `prompt.ts`, `llm.ts`, `herramientas.ts` o `validar.ts`** más allá de lo que D2
  nombra explícitamente (el campo `telefono` y su validación).
- ❌ **Romper WhatsApp.** El webhook tiene que seguir funcionando idéntico. Es un gate (§5, G3).
- ❌ **La bandeja de conversaciones en el panel de admin.** Es la spec siguiente. Aquí solo se
  escriben los datos; nadie los lee todavía.
- ❌ **Los cuatro hallazgos abiertos F1, F3, F7 y F10** del `GEMINI.md`. No se arreglan aquí, y
  tampoco se empeoran.
- ❌ Streaming de tokens, voz, adjuntos, subida de imágenes.
- ❌ Autenticación de clientas, verificación del teléfono por código.
- ❌ Tocar `apphosting.yaml` o desplegar.

---

## 5. Gates ejecutables

Un gate es un comando, no un párrafo.

| Gate | Comando | Qué demuestra |
|---|---|---|
| **G1** | `npm run prueba:plan` *(ampliar el existente)* | Plan de agendar **sin teléfono y sin contexto de teléfono → rechazado**; con teléfono válido en el plan → aceptado; teléfono de 3 dígitos, con letras o vacío → `telefono_invalido` |
| **G2** | `npm run prueba:limite` *(nuevo)* | `decidirLimite` puro: mensaje 20 de la hora pasa, el 21 no; pasada la hora la ventana se reinicia; en el mensaje 60 se corta en seco |
| **G3** | `npm run prueba:webhook-firma` y `npm run prueba:idempotencia` | **Siguen en verde.** WhatsApp no se rompió al meter el canal web |
| **G4** | `npm run prueba:chat-web` *(nuevo)* | La ruta: sin cookie crea sesión y la devuelve; con cookie reusa la misma conversación; cuerpo sin `mensaje` o de más de 1000 caracteres → **400**; superado el tope → **429 sin llamar al modelo** |
| **G5** | `npm run verificar` | Todo lo anterior + tipos + estilo + `next build`, encadenado. **EXIT 0** |

> **Las tres pruebas nuevas se corren primero contra el código roto y se guarda esa salida en
> rojo.** El reporte tiene que traer **el rojo antes que el verde**. Un gate que nunca estuvo rojo
> no protege nada, y es el fallo que más se ha repetido en esta casa
> ([[04-BIBLIOTECA/patrones/guardianes-que-no-guardan]]).
>
> Forma barata de conseguir el rojo: escribe la prueba **antes** que la función, o rompe la guarda
> a propósito, guarda la salida, y restáurala.

**Lo que estos gates NO cubren:** que la conversación sea buena y que el widget se vea bien. Eso lo
firma Mario a ojo. **No lo declares tú** ([[04-BIBLIOTECA/patrones/un-gate-verde-no-ve-la-pantalla]]).

---

## 6. Si el plano está mal, detente y dilo

Este plano se escribió **leyendo el código, pero sin ejecutar el canal web**, que no existe. Que
encuentres una premisa falsa no es un fallo tuyo: es información que solo aparece implementando.

Para y dilo si:

- El cambio de `ContextoAgente` (D2) obliga a tocar algo que §4 prohíbe.
- `RightDrawer` no sirve para el widget sin deformarlo.
- El contador de D4 no se puede meter en la misma transacción que el mensaje.
- Cualquier gate de §5 resulta imposible de escribir tal como está redactado. **Ese sería un fallo
  mío, no tuyo** ([[04-BIBLIOTECA/patrones/linea-de-produccion-mejoria]], regla 8): un plano que
  exige una prueba imposible empuja a fingirla. Dilo y lo cambio.

**Y en el reporte:** lo que NO hiciste, con esas palabras, y las sorpresas. Es lo primero que se
pierde al resumir y lo único que evita repetir el error. Tu reporte es una **hipótesis** hasta que
el arquitecto vuelva a correr los comandos.
