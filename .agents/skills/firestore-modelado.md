---
description: Modelar datos, transacciones, unicidad e índices en Cloud Firestore para proyectos de MeJorÍA. Úsala SIEMPRE antes de diseñar colecciones, escribir consultas o resolver concurrencia en Firestore.
---

# Firestore — modelado, transacciones e índices

> Fuente: documentación oficial de Cloud Firestore. Doctrina de casa:
> `04-BIBLIOTECA/mejoria-os/00-MANIFIESTO` y `04-BIBLIOTECA/patrones/trazabilidad-mejoria`.

## 1. Los límites que deciden el diseño

| Límite | Valor | Consecuencia práctica |
|---|---|---|
| Tamaño de un documento | 1 MiB | Nunca guardes listas que crecen sin techo dentro de un documento |
| Escrituras sostenidas al **mismo** documento | ~1 por segundo | Jamás uses un único documento como contador global de algo concurrido |
| Escrituras por transacción o lote | 500 documentos | Una operación que toque más de 500 se parte en varias |
| Operador `in` / `array-contains-any` | hasta 30 valores | Las consultas por lista se trocean |
| Uniones (JOIN) | **No existen** | Se desnormaliza a propósito, no por descuido |

## 2. Unicidad y concurrencia: el ID de documento es tu única llave

Firestore **no tiene claves únicas ni restricciones**. La única garantía de unicidad que existe
es que **no puede haber dos documentos con el mismo ID en la misma colección**.

**Regla de oro:** toda regla de negocio del tipo *"esto no puede ocurrir dos veces"* se convierte
en un ID de documento determinista.

```ts
// Reserva de agenda: la franja es el documento
const slotId = `${professionalId}_${inicioUtcISO}`;   // determinista

await db.runTransaction(async (tx) => {
  // 1) LECTURAS PRIMERO — siempre, sin excepción
  const servicio = await tx.get(db.doc(`services/${serviceId}`));

  // 2) ESCRITURAS DESPUÉS
  for (const franja of franjasQueOcupa) {          // incluye el buffer
    tx.create(db.doc(`slots/${professionalId}_${franja}`), {
      appointmentId, professionalId, inicioUtc: franja,
    });                                             // ← falla si ya existe
  }
  tx.create(db.doc(`appointments/${appointmentId}`), datosCita);
});
```

`create()` lanza `ALREADY_EXISTS` si el documento existe. Dentro de una transacción, eso aborta
**todas** las escrituras: o entra la cita completa, o no entra nada.

**Reglas invariables de las transacciones:**

1. **Todas las lecturas antes de todas las escrituras.** No se puede leer después de escribir.
2. **La función de la transacción puede ejecutarse varias veces** — Firestore reintenta ante
   conflictos. Por eso **no debe mutar estado externo** (nada de `console` con efectos, contadores
   en memoria, ni llamadas a APIs de terceros dentro).
3. Genera los IDs **fuera** de la transacción, no dentro.

## 3. Cómo se modela

**Colección por entidad, documento por hecho.** Un hecho se escribe una vez y se lee desde muchas
vistas — nunca se copia (`trazabilidad-mejoria`).

- **Desnormaliza solo lo que se muestra en listados** (ej. el nombre del servicio dentro de la
  cita, para pintar la agenda sin N consultas). Y marca en el código que es una copia de lectura.
- **Lo que cambia y debe ser correcto siempre, se lee de su documento fuente** (ej. el precio se
  congela en la cita a propósito; el catálogo vive en `services`).
- **Subcolecciones** para historiales que crecen sin techo (`appointments/{id}/historial`), nunca
  arreglos dentro del documento.
- **Dinero en enteros de centavos** (`04-BIBLIOTECA/patrones/dinero-en-centavos`).
- **Fechas en UTC** con `Timestamp` de Firestore, y la conversión a `America/Bogota` en una sola
  función de presentación.
- **Datos de maqueta marcados** con `_seed: true` (`04-BIBLIOTECA/patrones/fallos-silenciosos`).

## 4. Índices: lo que falla solo cuando ya hay datos

Firestore indexa **cada campo por separado de forma automática**. Necesitas un **índice compuesto**
en cuanto una consulta:

- filtra por dos o más campos distintos, o
- filtra por un campo y ordena por otro, o
- consulta un **grupo de colecciones** (`collectionGroup`).

Los índices se declaran en `firestore.indexes.json`, se versionan en el repositorio y se despliegan:

```bash
firebase deploy --only firestore:indexes
```

**Nunca crees un índice solo desde el enlace del mensaje de error de la consola:** queda fuera del
repositorio y el siguiente despliegue lo pierde. Toma el índice que sugiere el error, escríbelo en
`firestore.indexes.json` y despliégalo desde ahí.

**Antes de dar por terminada una consulta nueva, ejecútala contra datos reales.** Un índice que
falta no rompe en desarrollo con 10 documentos: rompe en producción con 10.000.

## 5. Consultas: lo que Firestore no hace

- **No hay JOIN.** Se resuelve desnormalizando o con varias consultas.
- **Una sola desigualdad por consulta**, y el primer `orderBy` debe ser sobre ese mismo campo.
- **`!=` y `not-in` excluyen los documentos donde el campo no existe.** Esta es la trampa que más
  datos ha hecho desaparecer en silencio en este equipo.
- **La paginación se hace con cursores** (`startAfter`), nunca con `offset`: el offset se cobra
  como lecturas igualmente.

## 6. Costos: se paga por documento leído

Cada documento devuelto por una consulta es una lectura facturada. Consecuencias:

- Nunca traigas la colección completa para filtrar en memoria. Filtra en la consulta.
- Usa `select()` cuando solo necesites unos campos.
- Un panel que refresca cada 5 segundos sobre 200 citas son 2,4 millones de lecturas al mes.
  **Usa `onSnapshot` (tiempo real) en vez de sondeo**: cobra solo los cambios.

## 7. Antes de declarar terminado

1. ¿Cada regla de "no puede pasar dos veces" está en un **ID de documento**, no en una validación?
2. ¿Las transacciones leen todo antes de escribir?
3. ¿Cada consulta con dos filtros tiene su índice **en el archivo del repositorio**?
4. ¿Probaste la concurrencia de verdad — dos peticiones simultáneas al mismo cupo?
5. ¿Los datos de maqueta están marcados?
