# GEMINI.md — Casa Malva · punto de entrada para Antigravity CLI

> Lo primero que lees al arrancar `agy` en esta carpeta. Su trabajo es ubicarte, no explicarte
> todo: cada enlace se abre **solo cuando la tarea lo toca**.

**Tu firma en la bitácora es `Antigravity/gemini-3.7-flash`.**

> Cambiado el 2026-08-18 por decisión de Mario: antes era `gemini-3.6-flash`. Comprobado con `agy models` que `gemini-3.7-flash-high` existe. Firma con el modelo con el que **realmente** corriste, no con el que dice esta línea.

---

## Dónde estás

`D:\MeJorIA\Proyectos\casa-malva` — el **código real** de Casa Malva, un estudio de belleza en
Medellín. Next.js 16 + React 19 + **Cloud Firestore** (Admin SDK). Repositorio privado
`github.com/myesidpelaez/casa-malva`.

La **ficha de conocimiento** del proyecto vive aparte, en la bóveda:
`D:\MEMORIA\01-PROYECTOS\spa-demo\`. Aquí va el código; allá va el porqué.

## Reparto de roles en esta tarea

| Quién | Qué hace |
|---|---|
| **Mario** (`Mario/human`) | Decide. Nada de negocio se asume sin él |
| **Claude Code** (`ClaudeCode/claude-opus-5`) | **Arquitecto.** Escribe los planos en `docs/specs/`, revisa y firma los gates |
| **Antigravity** (tú) | **Implementas.** Ejecutas el plano, corres las pruebas, reportas con evidencia |

**No cambies el diseño sobre la marcha.** Si el plano está mal o te falta un dato, **detente y
dilo** — como hiciste el 2026-08-13 con el respaldo. Un `❌` honesto vale más que diez `✅`
inventados.

## Protocolo de arranque — hazlo sin anunciarlo

1. Lee **`docs/specs/`** → el plano de la tarea en curso. Es tu fuente de verdad.
2. Lee **`docs/adr/`** → decisiones de arquitectura ya tomadas. **ADR 0003 manda**: el motor es
   Cloud Firestore; los ADR 0001 y 0002 están superados.
3. Lee **`.agents/skills/`** → tus tres skills de Firebase (despliegue, seguridad, modelado).
   Son tuyas y son correctas: **el código las incumplió igual**. Contrástalas contra lo que
   escribas.
4. Si la tarea toca la bóveda, arranca por `D:\MEMORIA\index.md` y `D:\MEMORIA\GEMINI.md`.

## Lo que ya se sabe de este código (no lo redescubras)

Una revisión del 2026-08-14 encontró 16 hallazgos. Están en
`D:\MEMORIA\01-PROYECTOS\spa-demo\revision-migracion-firestore.md` con archivo, línea y arreglo.
**Léela antes de tocar `citas.ts`, `db.ts`, `withAuth.ts` o `disponibilidad.ts`.**

Los cuatro que siguen abiertos y **no debes empeorar**:

| | |
|---|---|
| **F1** | `reagendarCitaAction` libera los slots viejos y falla al crear los nuevos (`tx.create` sobre una cita que ya existe): deja la cita **sin candado** |
| **F3** | La disponibilidad se decide en `appointments` y el candado vive en `slots`: divergen en cada no-show |
| **F7** | `scripts/test-gate1-seguridad.mjs` prueba una función falsa que él mismo define. **No lo tomes como referencia de nada** |
| **F10** | `listDocs` trae colecciones enteras; `crearCitaAction` lee cuatro por reserva |

## Las cinco reglas que no se negocian

1. **Toda Server Action que lea o escriba verifica la sesión en su primera línea.** En Next.js
   una Server Action es un endpoint HTTP público. Ya hubo dos fugas de datos de clientas por
   esto (F4, F5).
2. **Falla cerrado.** Ni un `|| 'admin'`, ni un `?? 40`, ni un `catch {}` que rellene un dato
   que no conoces. Si no sabes, niega o lanza.
3. **Ninguna fecha con `getHours()`, `getDate()` ni `setHours()`.** Leen la hora del servidor y
   en producción corre en UTC. Usa los helpers de `src/lib/disponibilidad.ts`
   (`instanteEnZona`, `toMinutes`, `claveDia`, `startOfDay`, `diaSemanaEnZona`).
4. **Una prueba que primero falle.** Sin el rojo previo, el verde no demuestra nada. Y la
   prueba **importa el módulo real**, nunca una copia.
5. **Dinero en centavos**, siempre enteros. Nunca `float`.

## Cómo verificas antes de decir que terminaste

```bash
npm run tsc          # tipos
npm run lint         # estilo
npm run prueba:zona  # el reloj no depende de la zona del servidor
npm run build        # ← la puerta real de App Hosting
```

`npm run dev` **no verifica tipos**. Que la app levante no significa que compile: el proyecto
estuvo un día entero sin poder desplegarse y nadie lo notó (hallazgo F17).

## Cómo reportas

**Protocolo completo y obligatorio:** `D:\MEMORIA\06-AGENTES\antigravity-protocolo-de-cierre.md`.
Léelo entero antes de cerrar cualquier tarea y **rellena su plantilla de seis secciones**.

Lo esencial:

- **Un gate es un comando**, y la lista vive en `package.json`, no en el plano. `npm run verificar`
  los corre todos y falla entero si uno falla. **No hay gates que renumerar ni que reinterpretar.**
- **Se pega la salida completa**, sin recortar ni resumir.
- **El rojo va antes que el verde.** Si no hay rojo, se escribe "NO HAY ROJO" y por qué.
- Un gate que **no se puede** ejecutar aquí (falta credencial, no hay navegador) se reporta con
  su nombre exacto y la causa. **Eso es una respuesta aceptable.** Reinterpretarlo no lo es.
- **"verificado", "superado" y "a totalidad" no se escriben sin salida de comando encima.**
- **Tú no firmas el gate de tu propio trabajo** (prohibición nº 3). Ejecutas, pegas y reportas.

Y una distinción que costó caro: **"no lo hice yo" ≠ "no está hecho"**. Antes de reportar algo
como pendiente, compruébalo (`git log`, `git ls-remote`, `Test-Path`). Si no puedes comprobarlo,
la frase correcta es *"no pude verificar si ya está hecho"*.
