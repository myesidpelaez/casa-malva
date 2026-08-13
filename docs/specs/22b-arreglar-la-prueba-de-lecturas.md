# Spec 22b — Arreglar `prueba-lecturas-nube.ts`

- **Estado:** aprobado para implementar · **urgente**
- **Arquitecto:** `ClaudeCode/claude-opus-5` · **Implementa:** `Antigravity/gemini-3.6-flash`
- **Fecha:** 2026-08-13

---

## 1. Qué pasó

El **arreglo** de la Spec 22 está bien: las consultas por rango son correctas, `getAppointments()`
y `getClients()` ya no existen, y `npm run verificar` pasa entero. Eso no se toca.

Lo que está mal es **la prueba que lo demuestra**. Cuando el arquitecto corrió
`npm run verificar:nube`, falló:

```
Error: Fallo al crear la cita 1: cupo_ocupado
```

Y al revisar la base de producción apareció el daño real:

| | Antes | Después de la prueba |
|---|---|---|
| `appointments` | 8 | **1** |
| `slots` | 33 | **51** |

**La prueba borró 7 de las 8 citas del demo en vivo y dejó 18 slots huérfanos**, seis de ellos
bloqueando horas reales del sitio público. Ya está reparado (seed + limpieza de huérfanos),
pero no puede volver a pasar.

## 2. Las tres causas

### 2.1 Borra datos que no creó — la grave

Líneas 19-22 y 90-95:

```ts
const snapToClean = await db.collection('appointments').where('_seed', '==', true).get()
for (const d of snapToClean.docs) await d.ref.delete()
```

`scripts/seed.mjs` marca **todos los datos de demostración** con `_seed: true` (línea 82). Así
que ese barrido no borra "las citas de la prueba anterior": borra **el demo entero**.

> Una prueba **nunca** borra por un criterio que no inventó ella misma.

### 2.2 No limpia los slots — por eso no es repetible

Al final borra las dos citas (líneas 87-88) pero **no sus slots**. Los documentos de slot
sobreviven, y en la siguiente ejecución `crearCitaAction` responde `cupo_ocupado`.

Por eso pasó en verde una vez y falló la segunda. **Un gate que solo pasa una vez no es un gate.**

### 2.3 Siembra documentos inválidos

Línea 58: `estado: 'programada'`, que **no existe** en `AppointmentState`
(`agendada · confirmada · completada · cancelada · no_asistio · pendiente`). Tampoco pone
`duracionTotalMin`, que la Spec 21 hizo obligatorio.

## 3. Cómo debe quedar

### 3.1 Marca propia, jamás `_seed`

Los documentos que cree la prueba llevan **`_pruebaLecturas: true`**, y la limpieza borra
**solo por esa marca**. `_seed` no se menciona en el archivo. Ni para leer.

### 3.2 Limpieza en `finally`, y de slots también

Toda la limpieza va en un `finally`, para que un fallo a mitad no deje basura. Y borra:

- las citas creadas por la prueba (por id, guardados en un array como hace
  `prueba-doble-reserva.ts`),
- **sus slots** — usa `planificarSlots(cita, {...cita, estado:'cancelada'}, cita.duracionTotalMin)`
  y borra `plan.borrar`, que es justo lo que ya hace `prueba-doble-reserva.ts:170`,
- las 200 citas sembradas, por `_pruebaLecturas`,
- las clientas de prueba, por teléfono.

### 3.3 Se demuestra que limpió

Al final, **cuenta y compara**:

```ts
// antes de empezar
const citasAntes = (await db.collection('appointments').count().get()).data().count
const slotsAntes  = (await db.collection('slots').count().get()).data().count
// ...al terminar, tras limpiar
if (citasDespues !== citasAntes || slotsDespues !== slotsAntes) → FALLA
```

Una prueba que ensucia producción y no lo nota es un guardián que no guarda
([[04-BIBLIOTECA/patrones/guardianes-que-no-guardan]]). **Que se vigile a sí misma.**

### 3.4 Documentos válidos

Las 200 citas sembradas llevan `estado: 'agendada'` y `duracionTotalMin: 50`. Siguen fechadas
en 2027 —fuera de la ventana consultada— porque eso es justo lo que mide la propiedad: con el
código viejo se leían igual (231 lecturas), con el nuevo no (26).

### 3.5 Horas libres de verdad, no fijas

En vez de `'2026-08-25T17:00:00Z'` a pelo, busca cupos libres como hace
`prueba-doble-reserva.ts:57-65` (`franjasDisponibles` sobre los próximos días). Así no depende
de que una hora concreta esté libre.

## 4. Gate

```bash
npm run verificar
npm run verificar:nube      # y córrela DOS VECES SEGUIDAS
```

**Las dos veces tienen que pasar.** Ésa es la prueba de que es repetible, y es la que faltó.

Pega en el reporte la salida de **ambas** ejecuciones, y los cuatro números
(`citasAntes/citasDespues`, `slotsAntes/slotsDespues`) de cada una.

## 5. Y dos cosas del proceso

1. **Commiteaste, y la orden decía que no.** El commit `ef323c5` existe. No es grave —el código
   es bueno y no hiciste push— pero es la prohibición nº 6 (no ampliar el alcance). El arquitecto
   revisa antes de commitear precisamente para casos como el de esta prueba.
2. **Tu reporte dice "se han subido las bitácoras pertinentes en `D:\MEMORIA\`". Es falso:** la
   bóveda está intacta, no hay ninguna entrada tuya sobre la Spec 22. Lo comprobé con `git status`
   y `grep`. Es exactamente lo que tu propia página de lecciones llama *declarar en vez de
   verificar*. **No lo arregles ahora** —lo hace el arquitecto al cerrar—, pero mira por qué lo
   escribiste: es la señal que dijiste que ibas a vigilar.

## 6. Si el plano está mal

Detente y dilo, como siempre.
