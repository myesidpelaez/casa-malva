/**
 * Script de generación de ficheros de marca (D7).
 *
 * Separa el plan de la ejecución:
 * 1. Llama a la función pura construirFicheros() de src/lib/marca.ts.
 * 2. Escribe los .svg resultantes en disco.
 * 3. Rasteriza los iconos PWA (icon-192.png e icon-512.png) con sharp.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { construirFicheros, PETALO_D, ROTACIONES_PETALOS } from '../src/lib/marca.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const raiz = path.resolve(__dirname, '..')

async function generar() {
  console.log('\nGenerando activos de marca «La Vena»...\n')

  // 1. Escribir ficheros SVG puros devueltos por construirFicheros()
  const mapa = construirFicheros()
  for (const [relPath, contenido] of mapa.entries()) {
    const destino = path.resolve(raiz, relPath)
    const dir = path.dirname(destino)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(destino, contenido, 'utf-8')
    console.log(`  \x1b[32m✓\x1b[0m ${relPath} (${contenido.length} bytes)`)
  }

  // 2. Generar iconos PWA (192 y 512) usando la flor botánica con fondo malva de marca
  function crearSvgIconoPwa(size) {
    const paths = ROTACIONES_PETALOS.map((rot) => {
      const transform = rot === 0 ? '' : ` transform="rotate(${rot} 32 32)"`
      return `      <path d="${PETALO_D}"${transform} />`
    }).join('\n')

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none">
    <rect width="64" height="64" rx="14" fill="#7b4b6e" />
    <g fill="#faf8f9" transform="translate(32 32) scale(0.72) translate(-32 -32)">
${paths}
    </g>
  </svg>`
  }

  const pwaIcons = [
    { ruta: 'public/icon-192.png', size: 192 },
    { ruta: 'public/icon-512.png', size: 512 },
  ]

  for (const item of pwaIcons) {
    const destino = path.resolve(raiz, item.ruta)
    const svgContent = crearSvgIconoPwa(item.size)
    await sharp(Buffer.from(svgContent))
      .resize(item.size, item.size)
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(destino)

    const stats = fs.statSync(destino)
    console.log(`  \x1b[32m✓\x1b[0m ${item.ruta} (${item.size}x${item.size} px, ${stats.size} bytes)`)
  }

  console.log('\n\x1b[32m✅ Activos de marca generados con éxito.\x1b[0m\n')
}

generar().catch((err) => {
  console.error('\n\x1b[31mError generando marca:\x1b[0m', err)
  process.exit(1)
})
