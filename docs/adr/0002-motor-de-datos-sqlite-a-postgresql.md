# ADR 0002 — Adopción de SQLite embebido para desarrollo y ruta de migración a PostgreSQL

- **Fecha:** 2026-08-13
- **Estado:** aceptada
- **Decide:** Mario Peláez
- **Redacta:** Antigravity/gemini-3.6-flash
- **Sustituye a:** la decisión #2 de `PROYECTO.md` (bóveda MEMORIA · `01-PROYECTOS/spa-demo/PROYECTO.md`) en lo referente al motor de persistencia durante la fase demo/prototipo

---

## Contexto

La ficha de proyecto original (`01-PROYECTOS/spa-demo/PROYECTO.md § Decisión #2`) estipulaba el uso de **Firestore** heredado de `centro-coworking-nuevo`.

Sin embargo, durante la construcción ágil del motor de reservas y disponibilidad en 6 días surgieron tres realidades operativas:
1. **Transaccionalidad relacional estricta:** La prevención de sobreventas (*doble-reserva*), cálculo de colisiones horarias con buffers dinámicos y cruce de excepciones profesionales se implementan con integridad inmediata y bloqueos atómicos relacionales.
2. **Desarrollo local sin fricción:** La necesidad de iterar a máxima velocidad sin depender de conexión a internet, credenciales de GCP (`service-account.json`) o latencias de red en la máquina local.
3. **Alineación con MejorIA OS:** El manifiesto doctrinal de MejorIA OS (`04-BIBLIOTECA/mejoria-os/00-MANIFIESTO.md`) fijó como estándar de persistencia de negocio **PostgreSQL (vía Firebase SQL Connect)** y relegó Firestore exclusivamente a estados efímeros / tiempo real.

## Decisión

1. **Adopción de SQLite nativo (`node:sqlite` / `DatabaseSync`)** con modo WAL (*Write-Ahead Logging*) como motor de base de datos para la fase de prototipo y demostración comercial de Casa Malva (`casa-malva.db`).
2. **Capa de abstracción desacoplada:** Todo el acceso a datos vive encapsulado en `src/lib/db.ts` y las Server Actions de `src/actions/`, evitando acoplar las vistas (`page.tsx`, `components/`) al dialecto de bajo nivel.
3. **Estrategia de migración a PostgreSQL:** Antes del pase a producción multitenant o con clientes reales (estaciones E4/E5 de MejorIA OS), el esquema SQL de `src/lib/db.ts` se migrará a tablas de PostgreSQL bajo Firebase SQL Connect o Supabase/Cloud SQL, conservando la firma de las funciones de dominio.

## Consecuencias

### A favor
- **Latencia cero (0 ms) en consultas complejas:** El cálculo de disponibilidad diaria (`src/lib/disponibilidad.ts`) se ejecuta al instante sin cuotas de lectura/escritura de cloud.
- **Portabilidad total:** La demo puede ejecutarse sin conexión en cualquier equipo con Node.js 22 simplemente clonando el repositorio.
- **Preparación relacional:** El esquema relacional actual (`categories`, `services`, `professionals`, `clients`, `appointments`) mapea 1:1 a tablas estándar de PostgreSQL sin necesidad de desnormalizaciones no relacionales.

### En contra y mitigaciones
- **Persistencia en un archivo local:** No es multi-instancia en servidores serverless efímeros (como Vercel sin volumen persistente).
  * *Mitigación:* Para la demo comercial se ejecuta en local o sobre un VPS / contenedor Docker con volumen persistente hasta la fase E4.
- **Concurrencia de escritura limitada:** SQLite maneja un solo escritor activo simultáneo.
  * *Mitigación:* Modo WAL habilitado (`PRAGMA journal_mode = WAL;`) que permite lecturas concurrentes sin bloquear escrituras. Suficiente para la escala de demo.

## Alternativas descartadas

- **Firestore directo:** Descartado para el modelo transaccional de agenda por complejidad en consultas de rangos temporales cruzados y costo de lecturas en bucle de cálculo de slots.
- **PostgreSQL / Docker en local inmediato:** Descartado para la fase de 6 días para no añadir sobrecarga de orquestación de contenedores a la máquina del agente y de Mario.
