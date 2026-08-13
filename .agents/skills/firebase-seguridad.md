---
description: Autenticación con Firebase Auth y reglas de seguridad de Firestore en Next.js (Server Actions, cookies de sesión, withAuth). Úsala SIEMPRE antes de tocar login, permisos, reglas de seguridad o cualquier Server Action que lea o escriba datos.
---

# Firebase — autenticación y seguridad

> Fuente: documentación oficial de Firebase Authentication y Firestore Security Rules.
> Anti-patrón que esta skill previene: `04-BIBLIOTECA/patrones/guardianes-que-no-guardan`.

## 1. La regla que más se rompe

> **En Next.js, una Server Action es un endpoint HTTP público.**

Cualquiera que descubra su identificador puede invocarla con un POST. El middleware protege las
**pantallas**; no protege las **acciones**. Una aplicación con middleware y sin verificación en las
acciones **no tiene seguridad**: tiene la apariencia de tenerla, que es peor.

**Toda Server Action que lea o escriba datos verifica la sesión en su primera línea. Sin excepción.**

## 2. El flujo correcto

```
1. Navegador: login con Firebase Auth        → devuelve un ID token
2. Server Action: canjea el ID token         → createSessionCookie() del Admin SDK
   por una cookie de sesión httpOnly            (duración entre 5 min y 14 días)
3. CADA Server Action: verifySessionCookie() → uid + custom claims (el rol)
4. Middleware: solo comprueba que la cookie existe → comodidad, NO seguridad
```

**La trampa técnica:** el middleware de Next.js corre en *edge runtime*, donde **el Admin SDK no
funciona**. Verificar ahí produce una verificación que no verifica. La frontera real es el
`withAuth()` de cada acción, en runtime Node.

## 3. El envoltorio obligatorio

```ts
// src/lib/withAuth.ts
export function withAuth<T, A extends unknown[]>(
  rolesPermitidos: Rol[],
  accion: (ctx: { uid: string; rol: Rol }, ...args: A) => Promise<T>,
) {
  return async (...args: A): Promise<ActionResult<T>> => {
    const cookie = (await cookies()).get('__session')?.value;
    if (!cookie) return { ok: false, error: 'no_autenticado' };

    try {
      const claims = await getAuth().verifySessionCookie(cookie, true); // true = revocación
      const rol = claims.rol as Rol | undefined;
      if (!rol || !rolesPermitidos.includes(rol)) {
        return { ok: false, error: 'sin_permiso' };
      }
      return { ok: true, data: await accion({ uid: claims.uid, rol }, ...args) };
    } catch {
      return { ok: false, error: 'sesion_invalida' };
    }
  };
}
```

Los roles viven en **custom claims** (`admin`, `recepcion`, `profesional`), se asignan con
`setCustomUserClaims()` desde el servidor y viajan dentro del token. **Nunca se leen de un campo
que el cliente pueda enviar.**

## 4. Reglas de seguridad de Firestore

Las reglas son la **segunda muralla**, no la primera. Aplican al SDK de cliente; el Admin SDK
**las salta por completo**. Si toda la escritura pasa por Server Actions con Admin SDK, la regla
correcta para las colecciones sensibles es **negar todo acceso directo**:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Catálogo público: lectura libre, escritura solo por el servidor
    match /services/{id}   { allow read: if true;  allow write: if false; }
    match /categories/{id} { allow read: if true;  allow write: if false; }

    // Todo lo demás: nadie entra por el cliente. Solo Admin SDK.
    match /{document=**} { allow read, write: if false; }
  }
}
```

**Prueba de que las reglas guardan de verdad:** intenta leer `clients` desde el SDK de cliente sin
sesión y comprueba que devuelve `permission-denied`. Una regla que nunca has visto rechazar algo no
está protegiendo nada.

## 5. Secretos

- ❌ Nunca en el repositorio, ni en el chat, ni en un archivo de configuración versionado.
- ✅ En **Cloud Secret Manager**, referenciados desde `apphosting.yaml`.
- ❌ **Prohibido el valor por defecto en un secreto.** `process.env.X ?? 'clave-local'` convierte
  un fallo ruidoso en una brecha silenciosa. Si falta la variable, la aplicación **no arranca**:

```ts
const secreto = process.env.SESSION_SECRET;
if (!secreto) throw new Error('Falta SESSION_SECRET. La aplicación no arranca sin él.');
```

- La API key web de Firebase **no es un secreto** — es pública por diseño y se protege con reglas,
  no ocultándola. Lo que sí es secreto: claves de cuentas de servicio y credenciales de terceros.

## 6. Datos personales (Colombia, Ley 1581 de 2012)

Cuando entren datos reales de personas —nombre, teléfono, historial— aplica el régimen de Habeas
Data. Antes de la primera clienta real:

- Autorización expresa al agendar, con finalidad declarada.
- Política de tratamiento accesible desde el sitio.
- Solo los datos necesarios: si no se usa para dar el servicio, no se pide.

## 7. Antes de declarar terminado

1. ¿**Todas** las Server Actions pasan por `withAuth`? Cuéntalas contra la lista de archivos.
2. ¿Probaste llamar una acción administrativa **sin sesión** y devolvió error? Enséñalo.
3. ¿Las reglas de Firestore niegan el acceso directo del cliente a colecciones sensibles?
4. ¿Algún secreto tiene valor por defecto? Debe romper, no continuar.
5. ¿Los roles vienen de custom claims y no de algo que el cliente envía?
