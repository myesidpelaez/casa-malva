# Spec 22 — Que el coste no crezca con la historia

- **Estado:** aprobado para implementar
- **Arquitecto:** `ClaudeCode/claude-opus-5` · **Implementa:** `Antigravity/gemini-3.6-flash`
- **Fecha:** 2026-08-13
- **Cierra:** F10 de `D:\MEMORIA\01-PROYECTOS\spa-demo\revision-migracion-firestore.md`
- **Contexto:** Casa Malva ya está en línea (https://casa-malva--casa-malva-demo.us-central1.hosted.app).
  Esto no rompe nada hoy. Rompe la **factura** el día que haya tráfico.

---

## 1. El problema, con números medidos

Firestore **cobra por documento leído**. `listDocs()` (`src/lib/db.ts:105`) hace
`db.collection(x).get()` sin filtro ni límite: trae la colección entera, siempre.

Documentos hoy en `casa-malva-demo`, contados el 2026-08-13:

| Colección | Docs | ¿Crece? |
|---|---|---|
| `services` | 16 | No — un spa tiene decenas, nunca miles |
| `categories` | 4 | No |
| `professionals` | 5 | No |
| **`appointments`** | **8** | **Sí, sin techo** |
| **`clients`** | **4** | **Sí, sin techo** |

`crearCitaAction` (`citas.ts:46-49`) lee **las cuatro**: hoy son 33 lecturas por reserva.

### Por qué eso se vuelve una factura

Un spa con 4 profesionales y 8 citas al día genera **~10.000 citas al año** y unas 800 clientas.
Entonces cada reserva pasaría a costar `16 + 5 + 10.000 + 800 ≈ 10.800 lecturas`.

La capa gratuita son **50.000 lecturas/día**. Eso da **cuatro reservas diarias**.

**Y lo peor no son las reservas: es mirar.** `franjasDelDiaAction` lee tres colecciones
completas **cada vez que la clienta toca una fecha** en el calendario. Con esa misma historia,
una sola visitante que pruebe cinco fechas y no reserve nada consume ≈ **50.000 lecturas: el
día entero de capa gratuita, sin una sola cita**.

Casa Malva se puso sobre Firestore precisamente por su capa gratuita
([[04-BIBLIOTECA/mejoria-os/00-MANIFIESTO]] §4). Este patrón la anula.

### Los ocho sitios

Leen `appointments` entera: `citas.ts:48, 316, 383, 429, 487, 534` y `clientes.ts:48`.
Leen `clients` entera: `citas.ts:49` y `clientes.ts:24`.

Y hay un detalle revelador: `firestore.indexes.json` **ya declara** los índices compuestos
`professionalId + inicioUtc` y `clientId + inicioUtc`. Están desplegados y **no se usa ninguno**,
porque no hay una sola query con `where` sobre `appointments`. La infraestructura correcta
estaba puesta; el código nunca la llamó.

---

## 2. La decisión

### 2.1 Solo se acota lo que crece

El catálogo (`services`, `categories`, `professionals`) es **acotado por naturaleza**: 25
documentos hoy, quizá 50 en el peor caso. Leerlo entero es correcto y **se queda como está**.

Lo que hay que acotar es lo que no tiene techo: **`appointments` y `clients`**.

### 2.2 Se borran las funciones peligrosas

Ésta es la pieza principal, y no es una prueba: es que **el error deje de ser posible**.

`getAppointments()` y `getClients()` de `db.ts` **se eliminan**. No se marcan como obsoletas ni
se documenta que no se usen: desaparecen. A partir de ahí, cualquier intento de leer esas dos
colecciones enteras **no compila**, y `npm run tsc` —que ya está en `verificar`— se convierte en
el guardián permanente, sin escribir una sola prueba.

> Es más barato hacer imposible lo incorrecto que probar que no ocurre.

`listDocs()` se conserva, pero solo lo usan los tres helpers del catálogo.

### 2.3 Lo que nace en su lugar

```ts
/**
 * Citas cuyo inicio cae en [desdeUtcISO, hastaUtcISO).
 * Con `professionalId` usa el índice compuesto `professionalId + inicioUtc` ya desplegado.
 */
export async function getAppointmentsEnRango(
  desdeUtcISO: string,
  hastaUtcISO: string,
  professionalId?: string
): Promise<Appointment[]>

/** Citas de una clienta. Usa el índice `clientId + inicioUtc` ya desplegado. */
export async function getAppointmentsDeCliente(clientId: string): Promise<Appointment[]>

/** Busca una clienta por teléfono. `where(...).limit(1)`, nunca la colección entera. */
export async function getClientByPhone(telefonoE164: string): Promise<Client | null>

/** Listado del CRM, acotado. `orderBy('creadaEn','desc').limit(limite)`. */
export async function getClientsRecientes(limite = 200): Promise<Client[]>
```

En Firestore el orden importa: **primero las igualdades, después el rango**. Con
`professionalId` es `.where('professionalId','==',id).where('inicioUtc','>=',d).where('inicioUtc','<',h)`.

### 2.4 Qué rango pide cada sitio

Aquí está la trampa que hay que leer despacio.

| Sitio | Rango | Por qué |
|---|---|---|
| `crearCitaAction` | **14 días** desde el inicio pedido, del profesional elegido | `validarReserva` solo necesita ese día, **pero si falla, `proximasFranjas` busca 14 días por delante**. Si traes solo un día, las alternativas salen vacías o falsas |
| `reagendarCitaAction` | 14 días desde la nueva hora, del profesional de la cita | Mismo motivo |
| `franjasDelDiaAction` | Ese día, de cada profesional candidato | — |
| `diasConCuposAction` | Los `dias` pedidos (14 por defecto), por profesional candidato | — |
| `consultarDisponibilidadAction` | 14 días desde `desde`, del profesional si viene | — |
| `getCitasAction` | El día pedido. **Sin fecha: hoy −7 / +60 días** | Hoy devuelve *todas* las citas de la historia. Un panel no necesita eso |
| `getClientDetailAction` | `getAppointmentsDeCliente(clientId)` | — |
| `crearCitaAction` (clienta) | `getClientByPhone` | — |
| `getClientsAction` | `getClientsRecientes(200)` | — |

**Una sola query por profesional y por operación.** No hagas una consulta por día dentro de un
bucle de 14 días: eso cambia 1 lectura grande por 14 pequeñas y no arregla nada.

### 2.5 El contador de lecturas

Para poder **medir** —no afirmar— que esto funciona, `db.ts` lleva un contador:

```ts
let lecturas = 0
export function lecturasRealizadas(): number { return lecturas }
export function reiniciarContadorLecturas(): void { lecturas = 0 }
```

Se incrementa en **todos** los caminos de lectura: `listDocs` (`+snap.size`), `docGet` (`+1`),
`getUserByEmail` (`+snap.size`) y las cuatro funciones nuevas (`+snap.size`). También dentro de
la transacción de `aplicarCambioDeCita` (`+1` por `tx.get`).

Sí, es código de producción que existe para la prueba. Son seis líneas, cuestan cero en
ejecución, y convierten *"creo que ahora lee menos"* en un número. Sin esto, F10 solo se puede
declarar cerrado, no demostrar — y ya sabemos cómo termina eso.

---

## 3. Lo que NO entra

- **Caché del catálogo.** Tentador, pero Next 16 cambió su API de caché (`use cache`,
  `cacheLife`, `cacheTag`) y **no voy a especificar una API que no he verificado** — es
  exactamente el error que cometí en la Spec 20. Son 25 documentos acotados: no es la urgencia.
  Queda para una spec propia, después de comprobar qué API aplica.
- **Paginación real del CRM de clientas.** `getClientsRecientes(200)` es el tope por ahora.
- Cualquier cambio de interfaz que no venga forzado por las firmas nuevas.
- F12 y F16.

---

## 4. Gate de terminado

```bash
npm run verificar          # tiene que pasar ENTERO
npm run verificar:nube     # ahora SÍ se puede: hay credenciales
```

`npm run tsc` dentro de `verificar` es el que demuestra que ya no queda ningún lector sin
acotar: si `getAppointments()` no existe, nadie puede llamarla.

---

## 5. Las pruebas

### 5.1 `scripts/prueba-lecturas.ts` — pura, va en `verificar`

Comprueba la construcción de rangos, sin Firestore:

1. El rango de 14 días de `crearCitaAction` **cubre la ventana que usa `proximasFranjas`**.
   Es el error más fácil de cometer y el más difícil de ver.
2. `desde < hasta` siempre, y el rango es semiabierto `[desde, hasta)`.
3. Los límites de día se calculan con los helpers de zona (`startOfDay`), **no** con
   `setHours` ni `toISOString().slice(0,10)`.

Extrae el cálculo de rangos a funciones puras si hace falta para poder probarlo — es
exactamente lo que funcionó en la Spec 21.

### 5.2 `scripts/prueba-lecturas-nube.ts` — real, va en `verificar:nube`

**Ésta es la que demuestra F10, y ya comprobé que se puede escribir: hay credenciales
funcionando y `count()` responde.**

```
1. reiniciarContadorLecturas() → crear una cita → L1 = lecturasRealizadas()
2. sembrar 200 citas de prueba (marcadas, en un profesional de prueba)
3. reiniciarContadorLecturas() → crear otra cita → L2
4. AFIRMAR:  L2 < L1 * 1.5
5. limpiar las 200 citas y las dos creadas
```

**La propiedad que se prueba no es "lee poco": es que el coste NO crece con la historia.**
Con el código actual, L2 sería del orden de `L1 + 200`. Con el arreglo, L2 ≈ L1.

Deja además un rastro legible en la salida: `L1 = N lecturas · L2 = M lecturas · crecimiento X%`.
Ese número es lo que se pega en el reporte.

### 5.3 El rojo previo

Antes de cambiar nada: añade el contador, escribe `prueba-lecturas-nube.ts` y **córrela contra
el código actual**. Debe **fallar**, con L2 mucho mayor que L1. Pega esa salida.

Esta vez el rojo es fácil y no hay excusa: el contador y la prueba se pueden escribir sin tocar
todavía ninguna de las ocho llamadas.

---

## 6. Orden

1. Contador en `db.ts`.
2. `prueba-lecturas-nube.ts` → correr → **rojo** (guardar salida).
3. Las cuatro funciones nuevas de `db.ts`.
4. **Borrar `getAppointments()` y `getClients()`** → `tsc` señala los 9 sitios rotos.
5. Arreglarlos uno a uno con la tabla de §2.4.
6. `prueba-lecturas.ts` (pura) y añadir ambas a `package.json`.
7. `npm run verificar` y `npm run verificar:nube` → pegar las dos salidas.

---

## 7. Si el plano está mal

Detente y dilo. Lo escribí sin ejecutar el código, aunque esta vez sí medí los números: los
conteos de §1 salen de `count()` contra Firestore real, no de una estimación.

Si al implementar descubres que algún rango de §2.4 deja sin datos a una función —sobre todo
`proximasFranjas`— **eso es un fallo mío y quiero saberlo**, no un parche silencioso.
