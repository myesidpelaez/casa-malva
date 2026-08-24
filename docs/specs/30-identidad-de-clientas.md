# Spec 30 — Identidad de clientas: altas sin duplicar y fichas partidas

**Estado:** plano cerrado · **Arquitecto:** ClaudeCode/claude-opus-5 · **Fecha:** 2026-08-23
**Implementa:** Antigravity CLI (`agy`)
**Cierra:** A2 (la parte de clientas) y A7 de la auditoría de huecos

---

## 1. El problema

Dos huecos que son el mismo, mirado desde los dos lados.

**El primero lo dijo Mario sobre un caso real del demo:** hay **una clienta** llamada Camila
Restrepo y **una profesional** llamada Camila Restrepo, y **son dos personas distintas**. No
es dato sucio: es el caso normal de cualquier negocio con clientas. Pero el panel pinta a las
profesionales con **solo la inicial y el primer nombre** (`nombre.charAt(0)` y
`nombre.split(' ')[0]`, en `admin/page.tsx` líneas 364, 366, 467 y 674, y en
`catalogo/page.tsx` líneas 310 y 318). Con dos Camila, la recepcionista no tiene cómo saber a
cuál se le asignó la cita.

**El segundo es el inverso, y es el grave:** la misma persona con dos teléfonos son **dos
fichas**, y su historial queda partido sin que nadie lo note. **No existe fusión de fichas.**
Es la queja número uno contra este software en salones, porque destruye exactamente lo que se
vende: *"aquí está el historial completo de tu clienta"*.

**Y encima no se puede dar de alta una clienta.** `src/actions/clientes.ts` solo tiene lectura
(`getClientsAction`, `getClientDetailAction`). La pantalla de Clientas no tiene ni un botón.
Hoy una clienta solo nace de rebote, cuando alguien agenda.

---

## 2. Decisiones de diseño

### D1 · La identidad de una clienta es su teléfono, nunca su nombre

Ya lo es en el modelo (`getClientByPhone` decide si es nueva o ya existía). Esta spec lo hace
visible en la pantalla, que es donde falta.

**Corolario que no se negocia:** dos clientas con el mismo nombre y **distinto** teléfono son
**dos personas**. El sistema jamás las une solo, ni sugiere unirlas como si fuera obvio.

### D2 · El nombre corto se calcula mirando a los demás, no a la persona

- Si **nadie más** comparte el primer nombre → `"Camila"` (corto y legible, como hoy)
- Si alguien lo comparte → `"Camila R."`, primer nombre más la inicial del apellido
- Si también coincide el apellido → `"Camila Restrepo (2)"`, con orden **estable** por `id`

**Por qué no "siempre nombre y apellido":** en la rejilla de la agenda las columnas son
estrechas, y el apellido de todo el mundo le roba el sitio al servicio y a la hora, que es lo
que la recepcionista lee de un vistazo. Se paga el coste **solo cuando hay ambigüedad real**.

### D3 · Fusionar no borra: marca

La ficha absorbida queda con `fusionadaEn: <id de la superviviente>`. **No se borra el
documento**: si la fusión salió mal hay marcha atrás, y las citas viejas que aún apunten a ese
id siguen resolviendo un nombre en vez de mostrar "Clienta".

### D4 · La fusión mueve las referencias en una sola transacción

Todas las `appointments` y `charges` de la absorbida pasan a la superviviente, y la absorbida
se marca: **todo o nada**. Una fusión a medias parte el historial en tres en vez de en dos.

**Límite duro:** si entre citas y cobros suman **más de 200 documentos**, la acción devuelve
`{ ok: false, error: 'demasiados_documentos' }` sin intentarlo. Una transacción de Firestore
topa en 500 escrituras, y fallar a la mitad es peor que no empezar.

### D5 · El teléfono viejo sigue encontrando a la clienta

La superviviente conserva su teléfono y guarda el de la absorbida en
`telefonosAlternativos: string[]`. Si alguien busca por el número viejo, la encuentra.

### D6 · Dar de alta comprueba el teléfono antes de crear

Si el teléfono ya existe, **no se crea otra ficha**: se abre la que hay. Es la misma regla que
ya aplica `crearCitaAction`; aquí solo se expone en la pantalla.

---

## 3. Modelo de datos

Añadir a `Client` en `src/types/index.ts` — **los tres opcionales**, para no invalidar las
fichas que ya existen:

```ts
export type Client = {
  // …lo que ya hay…
  telefonosAlternativos?: string[]   // D5: números viejos que siguen encontrándola
  fusionadaEn?: string               // D3: id de la superviviente. Si está, esta ficha murió
  ultimaVisitaUtc?: string           // se actualiza al registrar un cobro
}
```

`ultimaVisitaUtc` se escribe en `registrarCobroAction` (Spec 24), junto al cobro.

**Por qué aquí:** es lo que hará posible *"clientas que no vuelven hace 60 días"* —la campaña
de reactivación— **sin** una consulta por clienta que reventaría el presupuesto de lecturas.
Un campo mantenido al escribir cuesta cero al leer.

---

## 4. Qué se construye

### 4.1 `src/lib/personas.ts` — puro, sin Firestore, sin React

```ts
export function nombreCorto(id: string, todas: Array<{ id: string; nombre: string }>): string
export function normalizarNombre(nombre: string): string   // sin tildes, minúsculas, espacios colapsados
export function posiblesDuplicadas(clientas: Client[]): Array<[Client, Client]>
```

`posiblesDuplicadas` empareja por **nombre normalizado igual** y **teléfonos distintos**.
Nunca empareja fichas con el mismo teléfono —eso ya lo impide `getClientByPhone`— ni incluye
fichas con `fusionadaEn`. **Solo sugiere; no decide.**

> Que estas funciones sean puras es lo que permite escribir el gate. Si acaban dentro de un
> componente o de una Server Action, la prueba se vuelve imposible y termina siendo una copia
> de la lógica probándose a sí misma. Ya pasó dos veces en este proyecto.

### 4.2 Dónde se aplica `nombreCorto`

Sustituyendo `nombre.split(' ')[0]`:

- `admin/page.tsx:366` — la etiqueta de profesional en la tarjeta de cita
- `admin/page.tsx` — las pestañas de profesional de la vista móvil
- `catalogo/page.tsx:318` — la lista de quién presta cada servicio

**El avatar de una sola letra no se toca.** Un círculo no desambigua; el texto de al lado, sí.

### 4.3 Server Actions nuevas en `src/actions/clientes.ts`

**`crearClientaAction`** — `withAuth('clienta:crear')`, permiso nuevo con roles `admin` y
`recepcion`. Recibe nombre, teléfono, y email y notas opcionales. Normaliza el teléfono con
`normalizePhoneE164`, busca con `getClientByPhone`, y **si ya existe devuelve esa ficha** con
una marca `yaExistia: true` para que la pantalla lo diga en vez de fingir que creó algo.

**`fusionarClientasAction(idSuperviviente, idAbsorbida)`** — `withAuth('clienta:fusionar')`,
solo rol `admin`: mueve historial de personas reales.

1. Lee las dos fichas. Si alguna falta, o son la misma, o alguna ya tiene `fusionadaEn` → error.
2. Lee `appointments` y `charges` de la absorbida.
3. Si suman más de 200 → `demasiados_documentos`.
4. En **una** transacción: reapunta cada documento a la superviviente, añade el teléfono de la
   absorbida a `telefonosAlternativos`, y marca la absorbida con `fusionadaEn`.

**`getClientsAction` deja fuera las fusionadas.** Una ficha muerta no vuelve a la lista.

### 4.4 Pantallas — todas con `RightDrawer`

⚠️ **`Sheet` ya no existe.** Se eliminó el 2026-08-23: el panel tiene **un solo** componente de
modal, `RightDrawer` de `@/components/ui/drawer`. No lo reintroduzcas ni crees otro.

**Clientas** (`/admin/clientas`):

- Botón **"Nueva clienta"** en el `AdminHeader` → drawer con nombre, teléfono, email y notas.
  Si el teléfono ya existe, el drawer lo dice y ofrece abrir la ficha existente.
- El buscador **también busca por teléfono**, incluidos los `telefonosAlternativos`.
- Aviso discreto arriba cuando `posiblesDuplicadas` devuelve algo: *"2 posibles fichas
  repetidas"* → drawer que muestra las dos **con su teléfono y su historial a la vista**, que
  obliga a elegir cuál sobrevive y avisa de que no se deshace desde la interfaz.

---

## 5. Lo que NO entra

Con nombre, para que nada se arregle de paso:

- **Fusión de profesionales.** Son cuatro y las gestiona la dueña: no vale la complejidad.
- **La sección "clientas que no vuelven"** de los reportes. Aquí solo se crea el campo
  `ultimaVisitaUtc` que la hará posible.
- **Detección por nombres parecidos** (distancia de edición, "Camilla" contra "Camila").
  Falsos positivos garantizados. Solo coincidencia exacta normalizada.
- **Deshacer la fusión desde la interfaz.**
- **Importar clientas desde CSV.**
- **El halo de la cita recién llegada** (`recienLlegadas` en `admin/page.tsx`) y cualquier otra
  cosa de esa pantalla que no sea cambiar `split(' ')[0]` por `nombreCorto`. En el relevo de la
  Spec 24 ese halo se borró sin querer al reescribir la tarjeta, y es el efecto que hace
  visible el momento que vende la demo.
- **Los 3 warnings de imports sin usar** de `(public)/inicio/page.tsx`. Son preexistentes y no
  son de esta tarea.
- Specs 24, 25, 26, 28, 29 y el agente de chat: **quietos**.

---

## 6. Gate de terminado

Con esta numeración exacta. **No la cambies.** Si no puedes firmar uno, escribe cuál y por qué.

| # | Gate | Comando |
|---|---|---|
| G1 | Tipos, lint, pruebas y build | `npm run verificar` |
| G2 | Nombres y duplicadas | `npm run prueba:personas` |
| G3 | Rutas y permisos siguen mordiendo | `npm run prueba:rutas` y `npm run prueba:permisos` |
| G4 | El rojo de G2 **antes** del verde | pegar la salida y su código de salida |

### G2 · `scripts/prueba-personas.ts`, y entra en la cadena de `verificar`

Contra las funciones reales importadas de `src/lib/personas.ts`:

1. Una sola Camila → `"Camila"`
2. **Dos Camila con apellido distinto → `"Camila R."` y `"Camila J."`** ← el caso de Mario
3. Dos "Camila Restrepo" → sufijo numérico, y el orden es **el mismo en dos llamadas seguidas**
4. Nombre de una sola palabra → no revienta
5. `posiblesDuplicadas`: "Camila Restrepo" y "camila  restrepo" con teléfonos distintos → un par
6. Mismo nombre y **mismo** teléfono → **no** es par
7. Con tildes: "María" y "Maria" → par
8. Una ficha con `fusionadaEn` no aparece en ningún par
9. Lista vacía → lista vacía, sin excepción

### G4 · Enseña el rojo primero

Corre G2 contra una implementación equivocada a propósito —la más fácil: `nombreCorto`
devolviendo siempre el primer nombre, que es justo el bug que esta spec arregla— y **pega esa
salida en rojo con su código de salida**. Después el verde.

Una prueba que nunca se vio fallar no es un gate: es una decoración.

### Lo que NO firmas

La fusión contra Firestore real la corre el arquitecto (`verificar:nube`). Si te faltan
credenciales, **dilo tal cual**; no reinterpretes el criterio para poder cerrarlo.

---

## 7. Si algo de este plano está mal, detente y dilo

Escrito leyendo el código del 2026-08-23, pero **sin ejecutarlo**. Si `getAppointmentsDeCliente`
no sirve para la fusión, si el tope de 200 choca con algo, o si el drawer de clientas no se
deja reutilizar: **para y repórtalo**.

Ya pasó en la Spec 25: el plano afirmaba una aritmética falsa y **parar fue lo correcto**. Aquí
se mueven datos de personas reales entre documentos, así que vale doble: prefiero mil veces un
"esto no se puede" que una fusión a medias.
