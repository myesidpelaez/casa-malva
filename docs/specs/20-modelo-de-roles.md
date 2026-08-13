# Spec 20 — Modelo de roles y permisos

- **Estado:** aprobado para implementar
- **Arquitecto:** `ClaudeCode/claude-opus-5` · **Implementa:** `Antigravity/gemini-3.6-flash`
- **Fecha:** 2026-08-14
- **Decisión de negocio de Mario:** un solo negocio (sin `businessId`), producción real con
  clientas reservando de verdad. Roles: *"lo más eficiente, a tu criterio"*.

---

## 1. El problema

Tres cosas rotas a la vez:

1. **`rol` significa dos cosas distintas.** `UserRow.rol` es un permiso (`'admin'`);
   `Professional.rol` es un oficio (`'Manicurista sénior'`). El mismo nombre para dos conceptos
   que no se parecen.
2. **`Professional` y `UserRow` no están vinculados.** Marcela existe como ficha pero no puede
   iniciar sesión: no hay campo que las una.
3. **De cuatro roles declarados, dos existen.** `profesional` y `cliente` aparecen en el tipo y
   en ningún permiso. Un rol declarado y no implementado es una puerta que nadie vigila — de ahí
   salió F6 (`session.rol || 'admin'`).

Y el permiso está **repartido en quince sitios**: cada acción repite su propio
`['admin', 'recepcion']`. Nadie puede responder *"¿qué puede hacer una recepcionista?"* sin leer
los cinco archivos de `src/actions/`.

## 2. La decisión

### 2.1 Tres roles, no cuatro

```ts
export type Rol = 'admin' | 'recepcion' | 'profesional'
```

**`cliente` se elimina.** La clienta nunca inicia sesión: reserva por el enlace público sin
cuenta. Un rol que no se usa solo sirve para que algún día alguien lo acepte por error.

| Rol | Quién es | En una frase |
|---|---|---|
| `admin` | La dueña | Todo, incluido dinero y equipo |
| `recepcion` | Quien atiende el mostrador | Opera la agenda y las clientas; no toca precios ni equipo |
| `profesional` | Marcela, Sara… | **Solo su propia agenda** |

### 2.2 El oficio deja de llamarse `rol`

`Professional.rol` → **`Professional.cargo`**. Toca `src/types/index.ts`, `scripts/seed.mjs` y
las pantallas que lo muestren. No hay datos de producción todavía, así que se regenera con
`npm run seed` y no hace falta migración.

### 2.3 El vínculo va en el usuario, no en la profesional

```ts
export type UserRow = {
  id: string
  email: string
  passwordHash: string
  nombre: string
  rol: Rol
  professionalId?: string   // ← solo si esta cuenta pertenece a una profesional
}
```

**Por qué en `users` y no en `professionals`:** no toda profesional necesita cuenta, y ningún
`admin` o `recepcion` es profesional. Puesto aquí es un campo opcional con **un solo escritor**;
puesto al revés obliga a mantener los dos lados sincronizados — que es exactamente lo que
produjo F3.

`professionalId` viaja en la sesión y llega a las acciones dentro de `AuthContext`.

### 2.4 Un solo sitio para los permisos

Nace `src/lib/permisos.ts`. La matriz completa, en una pantalla:

```ts
export const PERMISOS = {
  'agenda:leer':          ['admin', 'recepcion', 'profesional'],
  'cita:cambiar_estado':  ['admin', 'recepcion', 'profesional'],
  'cita:reagendar':       ['admin', 'recepcion'],
  'clienta:leer':         ['admin', 'recepcion'],
  'catalogo:editar':      ['admin'],
  'equipo:editar':        ['admin'],
} as const satisfies Record<string, readonly Rol[]>

export type Permiso = keyof typeof PERMISOS
```

`withAuth` pasa a recibir un **permiso**, no una lista de roles:

```ts
// antes
export const cancelarCitaAction = withAuth<...>(['admin', 'recepcion'], async (ctx, ...) => …)
// ahora
export const cancelarCitaAction = withAuth<...>('cita:reagendar', async (ctx, ...) => …)
```

Ganancia concreta: cambiar quién puede cancelar una cita pasa de editar cinco archivos a editar
una línea, y la respuesta a *"¿qué puede hacer recepción?"* está en un solo archivo.

### 2.5 El rol no basta: hace falta el filtro de fila

`profesional` puede tocar **sus** citas, no todas. Eso no lo resuelve la matriz. Un único helper
en `permisos.ts`:

```ts
export function puedeTocarCita(ctx: AuthContext, cita: Appointment): boolean {
  if (ctx.rol === 'admin' || ctx.rol === 'recepcion') return true
  if (ctx.rol === 'profesional') return cita.professionalId === ctx.professionalId
  return false
}
```

Se llama **dentro** de cada acción de cita, después de cargarla y antes de escribir. Si devuelve
`false`, la acción responde `sin_permiso` — el mismo error que si no existiera, para no revelar
que la cita existe.

`getCitasAction` además **filtra el listado**: una profesional recibe solo las suyas, nunca la
agenda completa recortada en el navegador.

### 2.6 El middleware también filtra

Hoy `src/middleware.ts` protege `/admin/*` sin mirar el rol: una profesional vería el catálogo,
los precios y las fichas de todas las clientas, aunque las acciones le rebotaran. Se añade el
mapa ruta → permiso:

| Ruta | Permiso |
|---|---|
| `/admin` · `/admin/agenda` | `agenda:leer` |
| `/admin/catalogo` | `catalogo:editar` |
| `/admin/profesionales` | `equipo:editar` |
| `/admin/clientas` | `clienta:leer` |
| `/admin/agente` | `agenda:leer` |

Sin permiso → redirección a `/admin`, no a `/admin/login` (está autenticada, no le falta sesión).

> ⚠️ El middleware es **comodidad de navegación, no seguridad**. La seguridad son las Server
> Actions. Ambas capas se implementan; ninguna sustituye a la otra.

### 2.7 Usuarios del seed

Tres, uno por rol, para poder probar de verdad:

| Email | Rol | Vinculada a |
|---|---|---|
| `admin@casamalva.co` | `admin` | — |
| `recepcion@casamalva.co` | `recepcion` | — |
| `marcela@casamalva.co` | `profesional` | `prof_marcela` (el `id` real del seed) |

**Las contraseñas se leen de variables de entorno**, con `SEED_ADMIN_PASS` etc. Si falta alguna,
el seed **falla**; no inventa una por defecto. La contraseña `admin123` que hay hoy escrita en
`scripts/seed.mjs` desaparece del código.

---

## 3. Lo que NO entra en esta tarea

No lo toques aunque lo veas roto — tienen su propio plano:

- **F1** (`reagendarCitaAction` deja la cita sin slots) y **F3** (dos fuentes de verdad).
- **F10** (colecciones enteras por reserva).
- Cualquier cambio de interfaz que no sea consecuencia directa de `rol` → `cargo` o de ocultar
  una sección por permiso.
- `businessId` / multi-negocio. Mario decidió **un solo negocio**.

---

## 4. Gate de terminado — criterios ejecutables

Ninguno se firma con una afirmación. Cada uno se firma con la salida del comando pegada.

| # | Criterio | Cómo se comprueba |
|---|---|---|
| G1 | Compila y pasa estilo | `npm run tsc` y `npm run lint` sin errores |
| G2 | El reloj sigue sano | `npm run prueba:zona` → 15/15 |
| G3 | **Ninguna Server Action queda sin querer pública** | `npm run prueba:permisos` (ver §5) |
| G4 | La matriz cubre a los tres roles y a nadie más | incluido en `prueba:permisos` |
| G5 | El filtro de fila funciona | incluido en `prueba:permisos` |
| G6 | Despliega | `npm run build` completa |
| G7 | El seed crea los tres usuarios | `npm run seed` y pegar su salida |

## 5. La prueba que hay que escribir: `scripts/prueba-permisos.ts`

Es el corazón de la tarea. **Importa los módulos reales** —`src/actions/*`, `src/lib/permisos`—
y nunca una copia. Debe comprobar:

1. **Inventario de superficie.** Recorre todo lo exportado por `src/actions/*.ts` cuyo nombre
   acabe en `Action`. Cada uno debe estar: (a) envuelto en `withAuth`, o (b) declarado en una
   lista blanca explícita dentro de la propia prueba, con un comentario que diga por qué es
   público. **Si aparece una acción nueva que no está en ninguna de las dos, la prueba falla.**
   Ésta es la prueba que habría cazado F4 y F5.
2. **La lista blanca de acciones públicas es exactamente ésta** — ni una más:
   `loginAction`, `logoutAction`, `sesionActualAction`, `getCategoriesAction`,
   `getServicesAction`, `getProfessionalsAction`, `crearCitaAction`, `franjasDelDiaAction`,
   `diasConCuposAction`, `consultarDisponibilidadAction`.
3. **La matriz no menciona ningún rol fuera de los tres**, y todo permiso tiene al menos un rol.
4. **`puedeTocarCita`** con su tabla de casos: admin sí; recepción sí; profesional con su propia
   cita sí; profesional con cita ajena **no**; profesional sin `professionalId` **no**.
5. **`withAuth` falla cerrado**: rol ausente, rol desconocido y rol válido sin el permiso pedido
   devuelven `sin_permiso`; sin sesión devuelve `no_autenticado`.

Añade `"prueba:permisos": "tsx scripts/prueba-permisos.ts"` a `package.json` y encadénalo en
`verificar`.

**Antes de arreglar nada, haz que la prueba falle.** Escríbela contra el código actual, corre
`npm run prueba:permisos`, y **pega esa salida en rojo** en tu reporte. Un gate que nunca se vio
fallar no demuestra nada — es el error exacto de `scripts/test-gate1-seguridad.mjs`, que prueba
una función que él mismo inventa. Bórralo al terminar y reemplázalo por éste.

## 6. Orden sugerido

1. `prueba-permisos.ts` contra el código actual → **rojo** (guardar salida).
2. `src/lib/permisos.ts`: `Rol`, `PERMISOS`, `Permiso`, `puedeTocarCita`.
3. `withAuth` recibe `Permiso`; `AuthContext` gana `professionalId`.
4. Migrar las 10 acciones envueltas a su permiso; añadir `puedeTocarCita` en las de cita;
   filtrar `getCitasAction`.
5. `UserRow.professionalId`, `SessionData.professionalId`, `createSession`.
6. `Professional.rol` → `cargo` (tipos, seed, pantallas).
7. Middleware con el mapa ruta → permiso.
8. Seed: tres usuarios, contraseñas por variable de entorno.
9. Correr G1–G7 y **pegar todas las salidas**.

## 7. Si algo del plano está mal

Detente y dilo. No lo reinterpretes. Este plano lo escribió el arquitecto sin ejecutar el
código: si al implementarlo descubres que una premisa es falsa, **eso es un hallazgo válido y
quiero saberlo**, no que lo parchees en silencio.
