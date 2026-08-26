> ## ⚠️ Documento histórico — hallazgos cerrados
>
> Esta auditoría es del **13 de agosto de 2026** y describe el estado del proyecto **en esa
> fecha**. Los hallazgos críticos se corrigieron en el commit `3436dc2` (13-ago-2026) y
> siguientes. En el código actual:
>
> - Las Server Actions **verifican sesión** antes de leer o mutar datos.
> - `SESSION_SECRET` **ya no tiene valor por defecto**: la aplicación se niega a arrancar sin él.
> - El usuario sembrado con contraseña `admin123` **fue eliminado**.
> - Las claves de Firebase se leen **solo de variables de entorno**, sin valores de reserva.
>
> Se publica sin recortar a propósito: el proyecto encargó una auditoría independiente,
> aceptó los hallazgos y los cerró. Eso es la parte que importa.

# AUDITORÍA DE ESTADO REAL — CASA MALVA (spa-demo)
**Fecha:** 2026-08-13  
**Agente auditor:** Antigravity/gemini-3.6-flash  
**Emitida por:** ClaudeCode/claude-opus-5  
**Workspace auditado:** `D:\MeJorIA\Proyectos\casa-malva`  
**Estado del proyecto:** ⏸️ **PAUSADO** (MejorIA OS · E0 retroactiva pendiente)  

---

## RESUMEN EJECUTIVO
Esta auditoría técnica presenta el estado real y verificado del repositorio `casa-malva`, sin modificaciones en el código ni cambios de dependencias. Se levantó para fundamentar la decisión de migración a PostgreSQL bajo MejorIA OS y determinar el gap técnico real frente a una eventual salida a producción.

---

## A. ACOPLAMIENTO A SQLITE

### 1. Librería y Versión
- **Librería utilizada:** `node:sqlite` nativo de Node.js (`import { DatabaseSync } from 'node:sqlite'`).
- **Versión:** No es un paquete de `package.json` ni utiliza `better-sqlite3`, `sqlite3`, `Drizzle` o `Prisma`. Utiliza el módulo síncrono nativo incorporado en Node.js runtime (disponible a partir de Node.js v22.5.0+).
- **Tipos TypeScript:** Ambient declarations customizadas en `src/types/sqlite.d.ts` (L1-17).

### 2. Archivos que interactúan con la Base de Datos
| Archivo | Tipo de interacción | Líneas clave |
|---|---|---|
| `src/lib/db.ts` | **Conexión directa, DDL, transacciones y capa DAO** (`getDb`, `docGet`, `docSet`, `docUpdate`, `docDelete`, `listDocs`, `transaccion`) | L1, L24-48, L144-295, L297-328 |
| `src/lib/auth.ts` | Consulta de usuario por email (`getUserByEmail`) para autenticación | L3, L93 |
| `src/actions/citas.ts` | Lectura y mutación de citas, clientes, catálogo y profesionales; transacciones de agenda | L3, L31, L136, L157, L171, L200, L210, L228, L237, L254, L268, L331, L342, L368 |
| `src/actions/catalogo.ts` | Lectura y mutación de categorías y servicios | L3, L13, L23, L36, L45, L58, L74 |
| `src/actions/clientes.ts` | Lectura y mutación de clientas e historial de citas | L3, L15, L24, L37, L47, L65, L70 |
| `src/actions/profesionales.ts` | Lectura y mutación de equipo profesional y horarios | L3, L9, L21, L38 |
| `scripts/seed.mjs` | Conexión directa `node:sqlite`, DDL y población de datos iniciales | L1, L15-31, L55, L66, L97, L144, L182, L324, L349 |
| `scripts/smoke-fase2.mjs` | Conexión directa `node:sqlite`, validación de catálogo y citas | L1, L9-13, L60-93, L96-103 |
| `scripts/prueba-doble-reserva.ts` | Conexión vía `src/lib/db.ts` y sentencias directas de limpieza | L14, L16, L144-148 |

### 3. Centralización del SQL
- **En la aplicación Next.js (`src/`):** El SQL está **100% centralizado** en `src/lib/db.ts`. Las Server Actions en `src/actions/*` no contienen SQL plano embebido; consumen la API de abstracción (`docGet`, `docSet`, `listDocs`, `transaccion`, etc.).
- **En los componentes y vistas (`src/components/`, `src/app/`):** **Cero SQL**. Ningún componente ni página importa SQLite ni `src/lib/db.ts` directamente.
- **En scripts de soporte (`scripts/`):** `seed.mjs` y `smoke-fase2.mjs` contienen sentencias DDL y DML directas duplicadas para correr de forma aislada sin pasar por Next.js.

### 4. Consultas con Sintaxis Exclusiva de SQLite (vs. PostgreSQL)
A continuación se detalla la lista exacta de sentencias y características no portables directamente a PostgreSQL:

1. **`PRAGMA journal_mode = WAL;`** (Comando administrativo exclusivo de SQLite):
   - `src/lib/db.ts:28`
   - `scripts/seed.mjs:16`
   - `scripts/smoke-fase2.mjs:11`
2. **`INSERT OR REPLACE INTO ...`** (Sintaxis propietaria SQLite; PostgreSQL requiere `INSERT INTO ... ON CONFLICT (...) DO UPDATE ...`):
   - `src/lib/db.ts:160` (`settings`)
   - `src/lib/db.ts:166` (`categories`)
   - `src/lib/db.ts:173` (`services`)
   - `src/lib/db.ts:190` (`professionals`)
   - `src/lib/db.ts:206` (`clients`)
   - `src/lib/db.ts:214` (`appointments`)
   - `src/lib/db.ts:235` (`conversations`)
   - `src/lib/db.ts:243` (`messages`)
   - `src/lib/db.ts:250` (`users`)
   - `scripts/seed.mjs:55, 66, 97, 144, 182, 324, 349`
   - `scripts/smoke-fase2.mjs:70`
3. **`BEGIN IMMEDIATE`** (Nivel de bloqueo exclusivo de SQLite para adquirir lock de escritura inmediatamente):
   - `src/lib/db.ts:286`
   - `scripts/smoke-fase2.mjs:97`
4. **Tipos flexibles y emulación de tipos en DDL:**
   - Booleans almacenados como `INTEGER NOT NULL DEFAULT 1/0` (`categories.activa`, `services.activo`, `services.requiereConfirmacion`, `professionals.activo`, `clients._seed`, `appointments._seed` en `src/lib/db.ts:37-41`). En PostgreSQL deben ser `BOOLEAN DEFAULT true/false`.
   - JSON almacenado como `TEXT NOT NULL` (`professionals.serviceIds`, `professionals.horario`, `professionals.excepciones`, `appointments.historial` en `src/lib/db.ts:39,41`). En PostgreSQL debe ser `JSONB`.
   - Fechas almacenadas como strings ISO en `TEXT NOT NULL` (`clients.creadaEn`, `appointments.inicioUtc`, `appointments.finUtc`, `conversations.actualizadaEn`, `messages.enviadoEn` en `src/lib/db.ts:40-43`). En PostgreSQL debe ser `TIMESTAMPTZ`.
5. **Sintaxis no presentes en el codebase:**
   - `AUTOINCREMENT`: **No se usa**. Los IDs se generan en tiempo de ejecución en JS (`cat_...`, `srv_...`, `pro_...`, `cli_...`, `apt_...`).
   - `strftime` / `datetime('now')`: **No se usan** en SQL. Toda la lógica de fechas se resuelve en JS (`Date`).
   - `||` para concatenar en SQL: **No se usa**.

### 5. Transacciones y Mecanismo Anti-Doble-Reserva
- **Implementación de transacciones:** `src/lib/db.ts:284-295` implementa `transaccion<T>(fn: () => T)` utilizando `db.exec('BEGIN IMMEDIATE')`, `db.exec('COMMIT')` y `db.exec('ROLLBACK')`.
- **Mecanismo Anti-Doble-Reserva en `src/actions/citas.ts` (`crearCitaAction`, L31-127 y `reagendarCitaAction`, L268-333):**
  1. Abre una transacción SQLite exclusiva con `BEGIN IMMEDIATE`.
  2. Lee **todas** las citas de la base de datos a memoria (`getAppointments()`).
  3. Ejecuta la validación lógica en memoria mediante `validarReserva()` (`src/lib/disponibilidad.ts:263-319`), la cual calcula bloques ocupados con `getOccupiedBlocks()` y verifica solapes matemáticos de intervalos `[startMin, startMin + duracionMin + bufferMin]` con `overlaps()`.
  4. Si hay colisión, aborta sin escribir y devuelve `{ ok: false, error: 'cupo_ocupado', alternativas: [...] }`.
  5. Si no hay colisión, persiste la cita (`docSet('appointments', ...)`) y confirma la transacción (`COMMIT`).
- **Diagnóstico crítico:** En SQLite local funciona porque `DatabaseSync` es monohilo síncrono y `BEGIN IMMEDIATE` bloquea el archivo `.db`. **Sin embargo, no existe una restricción de integridad a nivel de base de datos** (ej: `EXCLUDE USING gist (professional_id WITH =, tstzrange(inicio_utc, fin_utc) WITH &&)` en PostgreSQL). Al migrar a PostgreSQL en un entorno con múltiples instancias serverless, este algoritmo en memoria sin locks a nivel de fila (`FOR UPDATE`) causará sobreventas.

---

## B. ESQUEMA DE DATOS

### 6. DDL Actual Completo
Ubicación: `src/lib/db.ts` (L35-48) y `scripts/seed.mjs` (L19-31).

```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY, 
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY, 
  nombre TEXT NOT NULL, 
  orden INTEGER NOT NULL DEFAULT 0, 
  activa INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY, 
  categoryId TEXT NOT NULL, 
  nombre TEXT NOT NULL, 
  duracionMin INTEGER NOT NULL, 
  bufferMin INTEGER NOT NULL, 
  precioCentavos INTEGER NOT NULL, 
  requiereConfirmacion INTEGER NOT NULL DEFAULT 0, 
  activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS professionals (
  id TEXT PRIMARY KEY, 
  nombre TEXT NOT NULL, 
  rol TEXT NOT NULL, 
  serviceIds TEXT NOT NULL, 
  horario TEXT NOT NULL, 
  excepciones TEXT NOT NULL DEFAULT '[]', 
  activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY, 
  nombre TEXT NOT NULL, 
  telefonoE164 TEXT UNIQUE, 
  email TEXT DEFAULT '', 
  notas TEXT DEFAULT '', 
  creadaEn TEXT NOT NULL, 
  _seed INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY, 
  clientId TEXT NOT NULL, 
  professionalId TEXT NOT NULL, 
  serviceId TEXT NOT NULL, 
  inicioUtc TEXT NOT NULL, 
  finUtc TEXT NOT NULL, 
  estado TEXT NOT NULL, 
  origen TEXT NOT NULL, 
  precioCentavos INTEGER NOT NULL, 
  creadaPor TEXT NOT NULL, 
  historial TEXT NOT NULL DEFAULT '[]', 
  _seed INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY, 
  canal TEXT NOT NULL, 
  clienteRef TEXT, 
  estado TEXT NOT NULL, 
  escaladaA TEXT, 
  actualizadaEn TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, 
  conversationId TEXT NOT NULL, 
  rol TEXT NOT NULL, 
  texto TEXT NOT NULL, 
  herramientaUsada TEXT, 
  enviadoEn TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, 
  email TEXT UNIQUE NOT NULL, 
  passwordHash TEXT NOT NULL, 
  nombre TEXT NOT NULL, 
  rol TEXT NOT NULL DEFAULT 'admin'
);

CREATE INDEX IF NOT EXISTS idx_appt_prof_fecha ON appointments (professionalId, inicioUtc);
CREATE INDEX IF NOT EXISTS idx_appt_cliente ON appointments (clientId);
```

### 7. Manejo de Fechas, Horas y Zona Horaria
- **Almacenamiento:** Todo timestamp se almacena en UTC como cadena ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`) en campos `TEXT` (`inicioUtc`, `finUtc`, `creadaEn`, `actualizadaEn`, `enviadoEn`).
- **Zona Horaria del Negocio:** Fijada en `'America/Bogota'` (UTC-5) en `REGLAS_NEGOCIO.zonaHoraria` (`src/lib/reglas.ts:16`) y en `settings/business` (`scripts/seed.mjs:46`).
- **Presentación en UI:** Centralizada en `src/lib/fechas.ts` mediante `Intl.DateTimeFormat` configurado con `timeZone: 'America/Bogota'`, `locale: 'es-CO'` y reloj de 24 horas (`hourCycle: 'h23'`).
- **Cálculo de Días Locales:** `src/lib/disponibilidad.ts:29-34` implementa `claveDia(d: Date)` que extrae año, mes y día en hora local (`d.getFullYear()`, `d.getMonth() + 1`, `d.getDate()`) evitando el desfase de UTC que alteraría los días de bloqueo y excepciones.

### 8. Manejo de Precios y Moneda
- **Almacenamiento:** Enteros en centavos de peso colombiano (`precioCentavos INTEGER NOT NULL`), cumpliendo la directiva `04-BIBLIOTECA/patrones/dinero-en-centavos`.
  - Ejemplo: Un servicio de $28.000 COP se guarda como `2800000`.
- **Formateo y parsing:** Centralizado en `src/lib/currency.ts` (`formatCurrencyFromCents`, `fromCents`, `toCents`, `formatInputNumber`, `parseInputNumber`). Se formatean sin decimales (`minimumFractionDigits: 0, maximumFractionDigits: 0`).

---

## C. AUTENTICACIÓN Y SEGURIDAD

### 9. Autenticación del Administrador y Almacenamiento de Contraseña
- **Ubicación de credenciales:** Tabla `users` en SQLite (`casa-malva.db`).
- **Algoritmo de Hash:** `crypto.scryptSync(password, salt, 64)` con salt criptográfico de 16 bytes generado con `crypto.randomBytes(16)` (`src/lib/auth.ts:8-12`). Se almacena en formato `${salt}:${hash}`.
- **Verificación:** `crypto.timingSafeEqual` para prevenir ataques de timing (`src/lib/auth.ts:14-21`).
- **Sesión:** Cookie `casamalva_session` firmada con HMAC-SHA256 (`src/lib/auth.ts:37-58`).
- **Protección de rutas:** `src/middleware.ts` intercepta `/admin/:path*` (excepto `/admin/login`) y valida la firma HMAC del token usando Web Crypto API antes de permitir el paso.
- **Usuario inicial:** Sembrado por `scripts/seed.mjs:345-352` con email `admin@casamalva.co` y contraseña inicial `admin123`.

### 10. Control de Acceso en Server Actions (Vulnerabilidad Crítica)
- **Diagnóstico:** **FALLO GRAVE DE SEGURIDAD**.
- Las páginas web `/admin/*` están protegidas por el Middleware, pero **las Server Actions de Next.js son endpoints HTTP POST públicos directos**.
- **Ninguna Server Action de mutación o lectura sensible verifica la sesión** (`getSession()` o `withAuth`):
  - `upsertCategoryAction` (`src/actions/catalogo.ts:31`): Cualquier cliente puede crear o alterar categorías.
  - `upsertServiceAction` (`src/actions/catalogo.ts:53`): Cualquier cliente puede alterar servicios y precios.
  - `updateProfessionalAction` (`src/actions/profesionales.ts:17`): Cualquier cliente puede modificar horarios y profesionales.
  - `getClientsAction` (`src/actions/clientes.ts:45`): **Expone nombres, teléfonos y notas de todas las clientas**.
  - `getClientDetailAction` (`src/actions/clientes.ts:55`): **Expone el historial financiero de cualquier clienta**.
  - `confirmarCitaAction`, `cancelarCitaAction`, `marcarCompletadaAction`, `marcarNoAsistioAction`, `reagendarCitaAction` (`src/actions/citas.ts`): Mutaciones ejecutables sin autenticación previa.
  - `getCitasAction` (`src/actions/citas.ts:340`): Devuelve la base completa de citas si se invoca directamente sin parámetros.

### 11. Secretos Hardcodeados en el Repositorio
Se detectaron los siguientes secretos y fallbacks en código fuente:

1. **Clave secreta de sesión (Fallback inseguro):**
   - `src/lib/auth.ts:6`: `const SESSION_SECRET = process.env.SESSION_SECRET || 'casamalva-local-secret-key-2026-xyz'`
   - `src/middleware.ts:5`: `const SESSION_SECRET = process.env.SESSION_SECRET || 'casamalva-local-secret-key-2026-xyz'`
2. **Claves de Firebase API y rutas de usuario en archivos huérfanos/legacy:**
   - `src/lib/firestore-server.ts:5`: `const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAIWpPLXdB_cHtRSHUc3_ujmC_LX4_ffnc'`
   - `src/lib/firebase/client.ts:7`: `apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAIWpPLXdB_cHtRSHUc3_ujmC_LX4_ffnc'`
   - `src/lib/firestore-server.ts:38`: Ruta absoluta local hardcodeada `'C:\\Users\\Mario Peláez'`
   - `src/lib/firebase/admin.ts:25`: Ruta a credenciales de SA `'C:\\hermes-data\\secrets\\casa-malva-demo-sa.json'`

---

## D. PREPARACIÓN PARA PRODUCCIÓN

### 12. Variables de Entorno Requeridas
Variables activas requeridas por la aplicación actual:
- `SESSION_SECRET`: Clave simétrica para firma HMAC-SHA256 de cookies de sesión administrativa.

*(Nota: `.env.example` lista variables de Firebase cliente y `FIREBASE_ADMIN_*`, pero tras el cambio a SQLite en `src/lib/db.ts`, los módulos de Firebase en `src/lib/firebase/` y `src/lib/firestore-server.ts` son código muerto no utilizado).*

### 13. Verificación de `npm run build`
Al intentar ejecutar `npm run build` en el entorno de la terminal, el sandbox reporta:
```
npm : El término 'npm' no se reconoce como nombre de un cmdlet, función, archivo de script o programa ejecutable.
CommandNotFoundException
```
*Causa:* El runtime del agente opera en un sandbox con PATH restringido y sin acceso de ejecución directa a binarios en `C:\Program Files\nodejs`.  
*Comprobación en commit previo:* Según el log del servidor (`server.log:1-12`) y el reporte de Claude Code del 2026-08-13 (commit `6eb9595`), el build compila limpio en la máquina host con Node 22 (`next build` genera `.next/BUILD_ID`).

### 14. Estado de los Tests y `scripts/prueba-doble-reserva.ts`
- **Frameworks de testing:** No existen Jest, Vitest, Cypress ni Playwright en `package.json`.
- **Scripts de verificación existentes:**
  - `npm run tsc` (`tsc --noEmit`)
  - `npm run lint` (`eslint`)
  - `npm run prueba:doble-reserva` (`tsx scripts/prueba-doble-reserva.ts`)
  - `npm run verificar` (`npm run tsc && npm run lint && npm run prueba:doble-reserva`)
- **Qué hace y reporta `scripts/prueba-doble-reserva.ts`:**
  - Ejecuta dos llamadas concurrentes a `crearCitaAction` (`Promise.all`) sobre el mismo cupo horario disponible.
  - Verifica que exactamente una reserva gane (`ganadoras.length === 1`) y la otra sea rechazada con `cupo_ocupado` ofreciendo alternativas.
  - Verifica que en la base de datos quede exactamente 1 registro activo.
  - Comprueba que un tercer intento sea igualmente rechazado y que el cupo desaparezca de la disponibilidad pública.
  - Limpia los registros insertados en `casa-malva.db`.

### 15. Inventario de Documentación (`docs/adr` y `docs/specs`)
- **`docs/adr/0001-estetica-vidrio-y-movimiento.md`**: Formaliza el cambio de estilo visual hacia glassmorphism con paleta malva, dos fuentes tipográficas (Fraunces e Inter) y animaciones basadas en física con Framer Motion.
- **`docs/adr/0002-motor-de-datos-sqlite-a-postgresql.md`**: Documenta la adopción temporal de SQLite embebido (`node:sqlite`) para desarrollo ágil y define la hoja de ruta para migrar a PostgreSQL (Firebase SQL Connect / Cloud SQL) antes de producción.
- **`docs/specs/10-sistema-diseno.md`**: Especificación de componentes de UI, tokens CSS, estados de citas, hojas modales con Radix UI, botones accesibles y reglas de diseño visual.

---

## E. INTEGRACIÓN CON CALENDARIOS

### 16. Integración con Google Calendar
- **Estado:** **INEXISTENTE (0%)**.
- No existe código, cliente OAuth, credenciales de Google Calendar API ni webhooks de sincronización en todo el proyecto.

### 17. Campo de ID de Evento Externo en el Modelo de Datos
- **Estado:** **NO CONTEMPLADO**.
- La interfaz TypeScript `Appointment` (`src/types/index.ts:77-90`) y la tabla SQLite `appointments` (`src/lib/db.ts:41`) **no tienen ninguna columna** para persistir identificadores externos (`googleEventId`, `externalCalendarId` o similar). Cualquier sincronización bidireccional requerirá una migración de esquema.

---

## TABLA DE RIESGOS PARA SALIR A PRODUCCIÓN
*(Ordenados de mayor a menor gravedad)*

| # | Riesgo | Gravedad | Impacto | Mitigación requerida |
|---|---|---|---|---|
| 1 | **Server Actions sin autenticación (`withAuth` ausente)** | 🔴 **CRÍTICA** | Cualquier usuario puede invocar las Server Actions para ver datos personales de clientas, cambiar precios, alterar catálogo o manipular citas. | Implementar wrapper `withAuth(action, rol)` en todas las Server Actions de `src/actions/` y validar sesión server-side. |
| 2 | **Anti-doble-reserva basada en memoria y SQLite monoproceso** | 🔴 **CRÍTICA** | Al desplegar en contenedores múltiples o serverless, no hay exclusión atómica a nivel de BD; ocurrirán sobreventas concurrentes. | Migrar a PostgreSQL e implementar transacciones con nivel `SERIALIZABLE` / `SELECT ... FOR UPDATE` o constraints de rango exclusion (`EXCLUDE USING gist`). |
| 3 | **Falta de soporte para volumen persistente en SQLite** | 🔴 **CRÍTICA** | Si se despliega en Firebase App Hosting o Vercel sin base de datos externa, cada nuevo contenedor reinicia `casa-malva.db` borrando los datos reales. | Ejecutar la migración a PostgreSQL administrado (Firebase SQL Connect / Cloud SQL / Supabase) antes del despliegue productivo. |
| 4 | **Secretos y credenciales de fallback en el código fuente** | 🟡 **ALTA** | La clave de sesión tiene un fallback predecible hardcodeado; existen API keys de Firebase y rutas absolutas en archivos legacy. | Forzar `SESSION_SECRET` obligatorio sin fallback, eliminar archivos legacy (`src/lib/firestore-server.ts`, `src/lib/firebase/`) e higienizar entorno. |
| 5 | **Modelo de datos sin soporte para calendarios externos** | 🟡 **MEDIA** | Imposibilidad de sincronizar citas con Google Calendar de las profesionales sin alterar la tabla `appointments`. | Añadir columna `googleEventId TEXT NULL` en `appointments` y registrar ADR correspondiente. |
| 6 | **Falta de suite de pruebas unitarias automatizadas (CI)** | 🟡 **MEDIA** | Solo existen scripts manuales (`prueba-doble-reserva.ts`, `seed.mjs`); no hay tests de regresión en pipeline automatizado. | Configurar Vitest/Playwright con ejecución en pre-commit / CI. |

---

## CIERRE DE AUDITORÍA
- **ESTACIÓN:** E0 / Diagnóstico (Auditoría de estado real previo a admisión/migración).
- **HECHO:** 
  - Inspección forense y exhaustiva de la totalidad del código, DDL, librerías, seguridad y configuración de `D:\MeJorIA\Proyectos\casa-malva`.
  - Creación del informe completo `docs/AUDITORIA-2026-08-13.md` respondiendo a los 17 puntos requeridos con rutas y números de línea exactos.
  - Ninguna línea de código de producción fue modificada ni se instalaron paquetes.
- **NO HECHO:**
  - Migración a PostgreSQL (requiere diseño de esquema en E3 y aprobación de Mario).
  - Blindaje de Server Actions con `withAuth` (construcción en E4).
  - Ejecución de `npm run build` en host (bloqueado por sandbox local; verificado en logs de host).
- **GATES QUE NO FIRMO:**
  - No firmo paso a E4 (Construcción) ni salida a producción: el proyecto sigue **PAUSADO** y debe surtir la sesión E0 con Mario y Claude Code.
- **DUDAS:**
  - Ninguna. El diagnóstico técnico es concluyente y delimita con precisión el trabajo de migración.
