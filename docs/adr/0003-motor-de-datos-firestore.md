# ADR 0003 — Adopción de Cloud Firestore para producción, Firebase Auth y Firebase App Hosting

- **Fecha:** 2026-08-13
- **Estado:** aceptada
- **Decide:** Mario Peláez
- **Redacta:** Antigravity/gemini-3.6-flash
- **Sustituye a:** ADR 0002 (adopción temporal de SQLite embebido y ruta a PostgreSQL)

---

## Contexto

Tras la auditoría de estado real del 2026-08-13 (`docs/AUDITORIA-2026-08-13.md`), se evidenciaron los riesgos de persistencia y concurrencia de SQLite embebido en entornos serverless efímeros (App Hosting / Cloud Run). 

Para la salida a producción y demo comercial de Casa Malva, Mario Peláez tomó la decisión definitiva de unificar el stack sobre el ecosistema nativo de Google Firebase (Cloud Firestore + Firebase Auth + Firebase App Hosting), descartando Postgres, Neon, Supabase y SQLite.

## Decisión

1. **Motor de persistencia principal:** **Cloud Firestore** gestionado a través de `@google-cloud/firestore` / `firebase-admin/firestore` (Admin SDK) en entorno Node.js del servidor.
2. **Autenticación y Sesiones:** **Firebase Auth** + cookies de sesión `httpOnly` verificadas en servidor mediante `withAuth` sobre Server Actions.
3. **Despliegue y Hosting:** **Firebase App Hosting** (Cloud Run gestionado con escalado a cero, `minInstances: 0`, `maxInstances: 2`).
4. **Mecanismo de Concurrencia y Anti-Doble-Reserva:** Se adopta el patrón de unicidad determinista mediante la colección `slots`, donde cada franja horaria ocupada por una cita (incluyendo buffers) se reserva atómicamente con `tx.create(db.doc(\`slots/${professionalId}_${inicioUtcISO}\`))` dentro de transacciones de Firestore. Si el documento slot ya existe, la transacción aborta inmediatamente con error `ALREADY_EXISTS`.
5. **Seguridad y Reglas:** Reglas de seguridad de Firestore restrictivas (`allow read: if true` solo para catálogo público; `allow read, write: if false` para todas las demás colecciones, canalizando todas las mutaciones por Server Actions protegidas con `withAuth`).

## Consecuencias

### A favor
- **Persistencia en la nube sin estado en disco:** Compatible de forma nativa con Firebase App Hosting y contenedores serverless efímeros.
- **Transaccionalidad distribuida real:** La prevención de sobreventa (*anti-doble-reserva*) se apoya en el motor de transacciones de Firestore y en la unicidad de IDs de documentos de slots, eliminando la dependencia de la memoria local de Node.
- **Pila tecnológica unificada:** Auth, Database, Storage, Hosting y Secret Manager bajo un único proyecto de GCP/Firebase, reduciendo la dispersión operativa.
- **Tiempo real disponible:** Capacidad de conectar `onSnapshot` en el panel administrativo para actualización inmediata de la agenda cuando se agende por WhatsApp o web.

### En contra y mitigaciones
- **Ausencia de JOINs relacionales:** Las consultas de disponibilidad y detalles de clientas deben optimizarse o desnormalizar campos clave (como el nombre del servicio en la cita).
- **Costo por lecturas:** Mitigado aplicando filtros directos en consultas, límites de documentos y evitando traer colecciones enteras a memoria.

## Alternativas descartadas

- **PostgreSQL / Neon / Supabase:** Descartados por decisión estratégica de Mario para consolidar la infraestructura en Firebase / GCP sin proveedores externos adicionales.
- **SQLite en producción:** Descartado definitivamente por incompatibilidad con el ciclo de vida de instancias efímeras en App Hosting.
