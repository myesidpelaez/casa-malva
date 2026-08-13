# Casa Malva — Sistema de Gestión y Reservas para Spas

Sistema de gestión y reservas para spas y salones de belleza (Next.js 16 + React 19 + Tailwind CSS 4 + Cloud Firestore + Firebase App Hosting).

> ⏸️ **Estado:** Proyecto preparado para producción sobre Cloud Firestore (2026-08-13, ADR 0003). Respaldado en repositorio privado para posterior despliegue y conexión del agente conversacional de WhatsApp.

---

## 🛠️ Stack Tecnológico

- **Framework:** Next.js 16.3.0 (App Router) + React 19 (Server Actions protegidas con `withAuth`)
- **Estilos:** Tailwind CSS v4 + Radix UI + Framer Motion (Físicas de muelles)
- **Persistencia:** Cloud Firestore (Admin SDK) con técnica de slots atómica anti-doble-reserva
- **Autenticación:** Firebase Auth + cookies de sesión `httpOnly` verificadas en servidor
- **Despliegue:** Firebase App Hosting (`apphosting.yaml`) + Cloud Secret Manager

---

## 🚀 Arranque Rápido

### 1. Instalación de dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
Crea tu `.env.local` basado en `.env.example`:
```bash
SESSION_SECRET="tu-clave-secreta-de-sesion"
GOOGLE_APPLICATION_CREDENTIALS="ruta-a-tu-service-account.json"
```

### 3. Generar base de datos inicial (Seed en Firestore)
```bash
npm run seed
```

> ⚠️ **Nota sobre los datos:** Todos los datos generados por `scripts/seed.mjs` (servicios, clientas, citas, slots y profesionales) están marcados como datos de MAQUETA (`_seed: true`) creados con fines de demostración comercial y pruebas funcionales.

### 4. Iniciar servidor de desarrollo
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

---

## 📋 Verificación y Pruebas

Para ejecutar chequeo de tipos, linter y prueba de concurrencia anti-doble-reserva contra Firestore:

```bash
npm run verificar
```

---

## 📚 Documentación y Decisiones

- **Decisiones de Arquitectura:** Consultar `docs/adr/` (`0001-estetica-vidrio-y-movimiento.md`, `0002-motor-de-datos-sqlite-a-postgresql.md` [superado], `0003-motor-de-datos-firestore.md`).
- **Auditoría Técnica:** `docs/AUDITORIA-2026-08-13.md`.
- **Ficha en Bóveda MEMORIA:** `D:\MEMORIA\01-PROYECTOS\spa-demo\`.
