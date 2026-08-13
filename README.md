# Casa Malva — Demo de Gestión y Reservas para Spas

Sistema de gestión y reservas para spas y salones de belleza (Next.js 16 + React 19 + Tailwind CSS 4 + SQLite nativo).

> ⏸️ **Estado:** Proyecto pausado temporalmente (2026-08-13) mientras se construye la línea de producción MejorIA OS. Respaldado en repositorio privado para posterior refactorización y conexión del agente conversacional.

---

## 🛠️ Stack Tecnológico

- **Framework:** Next.js 16.3.0 (App Router) + React 19
- **Estilos:** Tailwind CSS v4 + Radix UI + Framer Motion
- **Persistencia (Demo):** SQLite nativo (`node:sqlite` / `DatabaseSync`) con modo WAL (`casa-malva.db`)
- **Migración planificada:** PostgreSQL vía Firebase SQL Connect (ver `docs/adr/0002-motor-de-datos-sqlite-a-postgresql.md`)

---

## 🚀 Arranque Rápido

### 1. Instalación de dependencias
```bash
npm install
```

### 2. Generar base de datos inicial (Seed)
La base de datos SQLite (`casa-malva.db`) **no está versionada** en Git porque se regenera de forma 100% determinista mediante el script de seed:

```bash
npm run seed
```

> ⚠️ **Nota sobre los datos:** Todos los datos generados por `scripts/seed.mjs` (servicios, clientas, citas y profesionales) son **datos de MAQUETA** creados con fines de demostración comercial y pruebas funcionales.

### 3. Iniciar servidor de desarrollo
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

---

## 📋 Verificación de Calidad

Para ejecutar chequeo de tipos, linter y tests de concurrencia / prevención de doble reserva:

```bash
npm run verificar
```

---

## 📚 Documentación y Decisiones

- **Decisiones de Arquitectura:** Consultar `docs/adr/` (`0001-estetica-vidrio-y-movimiento.md`, `0002-motor-de-datos-sqlite-a-postgresql.md`).
- **Ficha en Bóveda MEMORIA:** `D:\MEMORIA\01-PROYECTOS\spa-demo\`.
