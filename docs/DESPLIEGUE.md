# Poner Casa Malva en línea

Los tres pasos que faltan para el enlace público. **Los tres los ejecuta Mario**: requieren
autenticarse con Google, y eso ningún agente lo hace por él.

Estado del código a 2026-08-13: `npm run verificar` pasa entero (tipos, estilo, reloj,
permisos, ocupación y `next build`). Lo único pendiente es lo que necesita credenciales.

---

## Paso 1 · La clave de servicio

Es lo que bloquea los pasos 1 y 2 a la vez. El `.env.local` ya apunta a la ruta correcta:

```
GOOGLE_APPLICATION_CREDENTIALS=C:\hermes-data\secrets\casa-malva-demo-sa.json
```

pero **ese archivo no existe** en este equipo. Para generarlo:

1. Firebase Console → proyecto `casa-malva-demo` → ⚙️ **Configuración del proyecto**
2. Pestaña **Cuentas de servicio** → **Generar nueva clave privada**
3. Guardar el `.json` descargado **exactamente** en `C:\hermes-data\secrets\casa-malva-demo-sa.json`
   (crea la carpeta si no está)

> ⚠️ Ese archivo es una credencial: no entra en el repositorio ni en la bóveda. Vive solo en
> disco, y `.gitignore` ya cubre `.env.*`.

**Alternativa sin archivo**, si prefieres tu propia cuenta: instalar el SDK de Google Cloud y
correr `gcloud auth application-default login`. Entonces sobra la variable.

---

## Paso 2 · Sembrar los datos y los tres usuarios

Añade al final de `.env.local` las tres contraseñas. **Elígelas tú**: el seed falla si faltan,
a propósito — ya no inventa `admin123`.

```
SEED_ADMIN_PASS=...
SEED_RECEPCION_PASS=...
SEED_PROFESIONAL_PASS=...
```

Luego:

```bash
npm run seed
```

Crea el catálogo, el equipo, las clientas de maqueta y **tres cuentas**, una por rol:

| Email | Rol | Ve |
|---|---|---|
| `admin@casamalva.co` | `admin` | Todo, incluidos precios y equipo |
| `recepcion@casamalva.co` | `recepcion` | Agenda y clientas; no toca catálogo ni equipo |
| `marcela@casamalva.co` | `profesional` | **Solo su propia agenda** |

Entra con las tres y comprueba que la tercera **no** ve `/admin/catalogo` ni `/admin/clientas`:
es la prueba de navegación que el modelo de roles no pudo verificar sin un navegador.

---

## Paso 3 · La prueba que no se puede correr en seco

```bash
npm run verificar:nube
```

Lanza dos reservas simultáneas sobre el mismo cupo contra Firestore de verdad y comprueba que
**solo una sobrevive**. Es la única garantía del sistema que no se puede demostrar sin base de
datos: todo lo demás ya está cubierto por `npm run verificar`.

Si falla, **para y avisa** — significa que la técnica de slots no está protegiendo la agenda.

---

## Paso 4 · Desplegar en App Hosting

`apphosting.yaml` ya está listo: escala a cero (`minInstances: 0`) y tiene techo de gasto
(`maxInstances: 2`).

**Antes de desplegar**, el secreto de sesión tiene que existir en la nube. `apphosting.yaml` lo
referencia como `session-secret`, y si no está, **el despliegue arranca pero la app no levanta**:

```bash
firebase login
firebase apphosting:secrets:set session-secret --project casa-malva-demo
```

Pega ahí un valor largo y aleatorio (no el mismo de `.env.local`). Después, en Firebase Console
→ **App Hosting** → *Crear backend*, conecta el repositorio `myesidpelaez/casa-malva` y la rama
`main`. A partir de ese momento cada `git push` despliega solo.

### Qué mirar en el primer despliegue

El fallo que más probable es que aparezca **solo en producción** ya está cerrado (el reloj
corrido cinco horas), pero vale confirmarlo desde el enlace público:

- La agenda de `/admin/agenda` muestra el día correcto de Bogotá, no el de UTC.
- El wizard de `/reservar` ofrece franjas entre las 09:00 y las 19:00, y **ninguna entre
  13:00 y 14:00**.
- La cookie de sesión viaja con `Secure` (se ve en las herramientas del navegador).

---

## Lo que queda pendiente después

- **F10** — `crearCitaAction` lee cuatro colecciones enteras por reserva. No rompe nada, pero
  con tráfico real agota la capa gratuita de Firestore (50.000 lecturas/día) alrededor de las
  25 reservas diarias. Es lo siguiente que conviene arreglar.
- Canal de WhatsApp y campaña de Meta Ads, en ese orden.

Detalle de todo lo cerrado: `D:\MEMORIA\01-PROYECTOS\spa-demo\revision-migracion-firestore.md`.
