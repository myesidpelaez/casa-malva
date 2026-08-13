---
description: Desplegar Next.js en Firebase App Hosting con secretos, índices y reglas. Úsala SIEMPRE antes de configurar apphosting.yaml, crear secretos, desplegar reglas o índices de Firestore, o publicar un proyecto de MeJorÍA en línea.
---

# Firebase — despliegue en App Hosting

> Fuente: documentación oficial de Firebase App Hosting y Firebase CLI.

## 1. Qué es y cómo funciona

App Hosting despliega Next.js con renderizado en servidor conectándose a un repositorio de GitHub:
cada push a la rama configurada dispara compilación y despliegue. La configuración vive en
`apphosting.yaml`, **versionada en el repositorio**.

## 2. `apphosting.yaml`

```yaml
runConfig:
  minInstances: 0          # escala a cero: sin tráfico, sin costo de cómputo
  maxInstances: 2          # techo de gasto ante un pico inesperado
  concurrency: 80
  cpu: 1
  memoryMiB: 512

env:
  # Público: puede verse en el navegador
  - variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID
    value: casa-malva
    availability: [BUILD, RUNTIME]

  # Secreto: solo la referencia, jamás el valor
  - variable: FIREBASE_SERVICE_ACCOUNT
    secret: firebase-service-account
    availability: [RUNTIME]
```

- `availability: [BUILD]` → disponible al compilar. `[RUNTIME]` → al ejecutar. Por defecto, ambos.
- ⚠️ **Todo lo que empieza por `NEXT_PUBLIC_` se expone al navegador.** Ahí solo van valores que
  pueden ser públicos.
- **`maxInstances` es tu freno de gasto.** Sin techo, un pico de tráfico o un bucle es una factura.

## 3. Secretos

```bash
firebase apphosting:secrets:set NOMBRE_DEL_SECRETO
firebase apphosting:secrets:grantaccess NOMBRE_DEL_SECRETO --backend <id-del-backend>
firebase apphosting:secrets:access NOMBRE_DEL_SECRETO      # verificar
```

Van a Cloud Secret Manager. `grantaccess` es obligatorio: sin él la aplicación compila pero falla
al arrancar, y el error no dice claramente que faltan permisos.

## 4. Orden de despliegue (importa)

```bash
# 1. Reglas e índices ANTES que la aplicación
firebase deploy --only firestore:rules,firestore:indexes

# 2. Verifica que los índices terminaron de construirse (pueden tardar minutos)
#    Consola → Firestore → Índices → estado "Habilitado"
# 3. La aplicación
git push origin main        # App Hosting compila y despliega solo
```

Desplegar la aplicación antes que los índices produce una versión en línea cuyas consultas fallan.
Los índices tardan en construirse: con datos, minutos.

## 5. Verificación posterior (el gate real)

Un despliegue sin error **no es un despliegue funcionando**. Comprueba, sobre la URL pública:

1. La portada carga.
2. **El flujo completo de reserva termina** y el dato aparece en la consola de Firestore.
3. Una Server Action administrativa **sin sesión** devuelve error de permiso.
4. Los registros de Cloud Run no muestran errores en el arranque.
5. La aplicación **abre en un celular ajeno**, no solo en tu equipo.

## 6. Costos y vigilancia

- `minInstances: 0` evita pagar cómputo sin tráfico.
- Firestore cobra por documento leído: un panel que sondea cada pocos segundos genera facturas
  invisibles. Usa `onSnapshot` en tiempo real, no sondeo.
- **Configura un presupuesto con alerta** en Google Cloud (Facturación → Presupuestos) desde el
  primer día. Cuesta nada y avisa antes, no después.

## 7. Reversión

Si un despliegue rompe producción, se vuelve a la versión anterior desde la consola de App Hosting
(Rollouts → versión previa). **Sabe cómo revertir antes de desplegar**, no durante el incidente.

## 8. Antes de declarar terminado

1. ¿`maxInstances` tiene un techo razonable?
2. ¿Los secretos están en Secret Manager, con `grantaccess` dado y ningún valor en el repositorio?
3. ¿Reglas e índices desplegados **antes** que la aplicación, y los índices en estado habilitado?
4. ¿Ejecutaste el flujo completo **contra la URL pública**, no contra localhost?
5. ¿Probaste desde un dispositivo ajeno?
6. ¿Sabes cómo revertir?
