# SPEC-31: Brief & Directrices de Diseño Editorial y UX Pro Max para Claude Opus

---
tipo: spec
proyecto: casa-malva
rama: antigravity-ide
autor_brief: Antigravity/gemini-3.7-flash-high
destinatario: ClaudeCode/claude-opus-5
fecha: 2026-08-26
---

## 1. Contexto del Entorno y Estado Actual

- **Ubicación del Código:** `~/proyectos/casa-malva` (WSL).
- **Rama de Trabajo:** `antigravity-ide`.
- **Servidor de Desarrollo:** `http://localhost:3201` (`npm run dev -- -p 3201` / Turbopack).
- **Memoria Histórica:** `D:\memoria-antigua\01-PROYECTOS\spa-demo\` (Solo lectura).
- **Bitácora Activa:** `D:\Harmony\agentes\sesiones\2026-08-26-1425-antigravity-rediseno-editorial-servicios.md`.
- **Grafo Técnico:** `graphify-out/` (869 nodos, 66 comunidades).

---

## 2. Decisiones de Arquitectura y Bimodalidad (No Negociables)

1. **Aislamiento de Tema Bimodal:**
   - Tailwind CSS v4 está anclado a `data-theme` mediante:
     ```css
     @custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
     ```
   - **Regla:** Nunca usar `@media (prefers-color-scheme: dark)` ni forzar clases `dark:text-white` directas. Los tokens semánticos de `src/app/globals.css` (`text-ink-900`, `text-ink-700`, `bg-[var(--card)]`, `text-malva-700`) se invierten matemáticamente.

2. **Modelo de Disponibilidad (Firestore):**
   - La disponibilidad **no se almacena**: se calcula como `horario profesional − citas − excepciones`.
   - Fechas en UTC (`inicioUtc`, `finUtc`), visualización en `America/Bogota`.
   - Precios congelados en centavos (`precioCentavos`).

3. **Herramienta UI/UX Pro Max Instalada:**
   - Base de conocimiento de diseño disponible en `.agent/skills/ui-ux-pro-max/`.
   - Consulta de estilos, paletas y UX:
     ```bash
     python3 .agent/skills/ui-ux-pro-max/scripts/search.py "<query>" -d [style|color|typography|ux]
     ```
   - Design System Master: `design-system/casa-malva/MASTER.md`.

---

## 3. Estado de lo Construido en Esta Sesión (`/servicios`)

La ruta `/servicios` (`src/app/(public)/servicios/CatalogoLookbook.tsx`) ya fue refactorizada:
- Ancho de escritorio ampliado (`max-w-7xl`).
- Aura ambiental orgánica con difuminado suave (`blur-[110px]`).
- Selector de especialidades con cards limpias (sin iconos flotantes distractores) y avatares de especialistas asignadas (`getSpecialistsForCategory`).
- Grilla de servicios con fotografía `aspect-[4/3]`, metadatos en el cuerpo (precio, tiempo, confirmación) y botón full-width en la base.
- Asistente virtual transformado en **«Malva · Concierge»** y accesos a redes sociales.

---

## 4. Encargo Específico para Claude Opus 4.6

### Tarea A: Rediseño Editorial y Reducción de Fricción en `/reservar`
- **Archivo principal:** `src/app/(public)/reservar/ReservaWizard.tsx` (1054 líneas) y `src/app/(public)/reservar/page.tsx`.
- **Objetivo:**
  1. **Paso 1 (Servicio):** Conectar armónicamente con la estética del Lookbook y filtros por categoría.
  2. **Paso 2 (Especialista):** Presentar a las profesionales con estética de alta costura, tarjetas tipo retrato con su cargo, especialidad y micro-copy de confianza.
  3. **Paso 3 (Fecha y Hora):** Calendario y grilla de franjas horarias con feedback visual inmediato, estados de ocupación claros y diseño táctil accesible.
  4. **Paso 4 (Datos Clienta):** Formulario minimalista de alta gama (identidad por teléfono E.164, sin registro forzado).
  5. **Paso 5 (Confirmación):** Ticket / resumen editorial tipo tarjeta de cita de lujo con opción de agregar a calendario o abrir chat con Malva.

### Tarea B: Consistencia en Portada (`/inicio`)
- **Archivos:** `src/app/(public)/inicio/page.tsx` y `src/components/home/EquipoSlider.tsx`.
- **Objetivo:** Asegurar que el slider de especialistas, el banner hero y el CTA final compartan la misma atmósfera y tokens del Design System Master.

---

## 5. Rúbrica de Aceptación y Gates de Verificación

```bash
# 1. Comprobación de tipos (Debe dar 0 errores)
$ wsl bash -lc "cd ~/proyectos/casa-malva && npx tsc --noEmit"

# 2. Respuestas HTTP 200 en todas las rutas
$ wsl bash -lc "curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3201/reservar"
$ wsl bash -lc "curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3201/inicio"
$ wsl bash -lc "curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3201/servicios"

# 3. Actualización de Graphify
$ wsl bash -lc "cd ~/proyectos/casa-malva && graphify extract . --code-only && graphify cluster-only ."
```
