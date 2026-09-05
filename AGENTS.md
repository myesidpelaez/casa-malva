<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Harmony es la bóveda de doctrina — léela antes de tocar código

El *porqué* de este proyecto, las reglas que obedecen **todos** los agentes y la bitácora
de cada sesión viven en **`D:\Harmony`** (desde WSL: `/mnt/d/Harmony`). Aquí va el código;
allá va el porqué. **No copies doctrina a este repositorio: se enlaza.**

**Orden de arranque:** `ARRANQUE.md` → `CONSTITUCION.md` → `ESTADO.md`. Después, solo el
protocolo que tu tarea pida — para código, `protocolos/CODIGO.md`.

| Qué | Dónde |
|---|---|
| Doctrina y reglas | `D:\Harmony\CONSTITUCION.md` |
| Tu bitácora de sesión | `D:\Harmony\agentes\sesiones\` — se escribe **mientras** trabajas |
| Historia anterior del proyecto | `D:\memoria-antigua\01-PROYECTOS\spa-demo\` — **solo lectura** |
| Cómo cerrar | `D:\Harmony\protocolos\CIERRE.md` |

**Cuatro reglas que aplican ya, sin leer nada más:**

1. Ninguna verificación cuenta sin **su comando y su salida**. `Exit code 0` **no es
   evidencia**: comprueba el efecto, no el código de retorno.
2. **`tsc --noEmit` no sustituye a `npm run build`.** Son comprobaciones distintas y la
   rúbrica lleva las dos. Asumir lo contrario ya rompió el despliegue una vez
   (`D:\Harmony\biblioteca\antigravity-lecciones.md`).
3. **Ningún secreto** en el repositorio ni en la bóveda. Se referencia la ruta.
4. Firma tu bitácora con tu **modelo exacto**. Si no lo sabes, pregunta — no lo inventes.

**Al cerrar:** commit y push. Dejar el trabajo sin commitear con la sesión marcada
`cerrada` es el riesgo que costó el formateo del 2026-08-24.
