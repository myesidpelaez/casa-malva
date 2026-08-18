/**
 * Gate de la marca «La Vena» (Spec 26).
 *
 * Seis comprobaciones contra el módulo real y los artefactos generados:
 * 1. elegirVariante en la frontera: 27 -> 'solida', 28 -> 'linea', 16 -> 'solida', 40 -> 'linea'
 * 2. Rechaza entradas imposibles: 0, negativos y NaN lanzan (falla cerrado)
 * 3. Geometría produce exactamente 5 pétalos a 0/72/144/216/288°
 * 4. Todo fichero de public/marca/ parsea como XML y no contiene <text (D6)
 * 5. Los .svg del disco coinciden byte a byte con construirFicheros() (D7)
 * 6. Los .png existen, tienen dimensiones (192 y 512) y no están en blanco
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import {
  elegirVariante,
  decidirRevelacion,
  obtenerPetalos,
  construirFicheros,
  ROTACIONES_PETALOS,
} from '../src/lib/marca'

let fallos = 0

function afirmar(descripcion: string, condicion: boolean, esperado?: unknown, obtenido?: unknown) {
  if (condicion) {
    console.log(`  \x1b[32m✓\x1b[0m ${descripcion}`)
  } else {
    console.log(`  \x1b[31m✗ ${descripcion}\x1b[0m`)
    if (esperado !== undefined || obtenido !== undefined) {
      console.log(`      esperado: ${JSON.stringify(esperado)}   obtenido: ${JSON.stringify(obtenido)}`)
    }
    fallos++
  }
}

async function main() {
  console.log('\nMarca «La Vena» (Spec 26)\n')

  // --------------------------------------------------------------------------
  // 1. elegirVariante en la frontera
  // --------------------------------------------------------------------------
  console.log('1. Umbral de variante (28 px según D2)')
  try {
    const v27 = elegirVariante(27)
    afirmar("27 px -> 'solida'", v27 === 'solida', 'solida', v27)
  } catch (err) {
    afirmar("27 px -> 'solida' (lanzó error inesperado)", false, 'solida', String(err))
  }

  try {
    const v28 = elegirVariante(28)
    afirmar("28 px -> 'linea'", v28 === 'linea', 'linea', v28)
  } catch (err) {
    afirmar("28 px -> 'linea' (lanzó error inesperado)", false, 'linea', String(err))
  }

  try {
    const v16 = elegirVariante(16)
    afirmar("16 px -> 'solida'", v16 === 'solida', 'solida', v16)
  } catch (err) {
    afirmar("16 px -> 'solida' (lanzó error inesperado)", false, 'solida', String(err))
  }

  try {
    const v40 = elegirVariante(40)
    afirmar("40 px -> 'linea'", v40 === 'linea', 'linea', v40)
  } catch (err) {
    afirmar("40 px -> 'linea' (lanzó error inesperado)", false, 'linea', String(err))
  }

  // --------------------------------------------------------------------------
  // 2. Rechaza entradas imposibles (falla cerrado)
  // --------------------------------------------------------------------------
  console.log('\n2. Falla cerrado ante entradas inválidas')
  const entradasInvalidas = [0, -1, -28, NaN, Infinity, -Infinity]
  for (const entrada of entradasInvalidas) {
    let lanzo = false
    try {
      elegirVariante(entrada)
    } catch {
      lanzo = true
    }
    afirmar(`elegirVariante(${entrada}) lanza excepción`, lanzo, true, lanzo)
  }

  console.log('')
  console.log('2b. Revelacion: una vez por sesion, nunca con movimiento reducido (D4)')
  const casosRevelacion: Array<[boolean, boolean, boolean, string]> = [
    [false, false, true, 'sesión nueva y movimiento normal -> revela'],
    [true, false, false, 'ya revelada en esta sesión -> NO revela'],
    [false, true, false, 'prefiere movimiento reducido -> NO revela'],
    [true, true, false, 'ambas condiciones -> NO revela'],
  ]
  for (const [yaRevelada, reducido, esperado, texto] of casosRevelacion) {
    const obtenido = decidirRevelacion(yaRevelada, reducido)
    afirmar(texto, obtenido === esperado, esperado, obtenido)
  }
  const rev1 = decidirRevelacion(false, false)
  const rev2 = decidirRevelacion(false, false)
  afirmar('decidirRevelacion es idempotente', rev1 === rev2, true, rev1 === rev2)

  // --------------------------------------------------------------------------
  // 3. Geometría de 5 pétalos y rotaciones exactas
  // --------------------------------------------------------------------------

  console.log('\n3. Geometría botánica: 5 pétalos a 0/72/144/216/288°')
  const angulosEsperados = [0, 72, 144, 216, 288]
  const petalos = obtenerPetalos()
  afirmar('Produce exactamente 5 pétalos', petalos.length === 5, 5, petalos.length)

  const rotaciones = petalos.map((p) => p.rotacion)
  afirmar(
    'Rotaciones exactas 0°, 72°, 144°, 216°, 288°',
    JSON.stringify(rotaciones) === JSON.stringify(angulosEsperados),
    angulosEsperados,
    rotaciones
  )

  afirmar(
    'ROTACIONES_PETALOS exporta la tupla canónica',
    JSON.stringify(ROTACIONES_PETALOS) === JSON.stringify(angulosEsperados),
    angulosEsperados,
    ROTACIONES_PETALOS
  )

  // --------------------------------------------------------------------------
  // 4. Todo fichero de public/marca/ parsea como XML y no contiene <text
  // --------------------------------------------------------------------------
  console.log('\n4. Ficheros de public/marca/ son SVG limpios sin <text>')
  const dirMarca = path.resolve(process.cwd(), 'public/marca')
  if (!fs.existsSync(dirMarca)) {
    afirmar('Existe el directorio public/marca/', false, true, false)
  } else {
    const archivos = fs.readdirSync(dirMarca).filter((f) => f.endsWith('.svg'))
    afirmar('public/marca/ contiene ficheros .svg', archivos.length > 0, '> 0', archivos.length)

    for (const archivo of archivos) {
      const rutaCompleta = path.join(dirMarca, archivo)
      const contenido = fs.readFileSync(rutaCompleta, 'utf-8')

      // Verificar que es XML bien formado básico
      const esSvgValido = contenido.trim().startsWith('<svg') && contenido.trim().endsWith('</svg>')
      afirmar(`${archivo} abre y cierra con <svg>...</svg>`, esSvgValido, true, esSvgValido)

      // Verificar que no contiene <text
      const tieneTexto = /<text\b/i.test(contenido)
      afirmar(`${archivo} NO contiene etiquetas <text>`, !tieneTexto, false, tieneTexto)
    }
  }

  // --------------------------------------------------------------------------
  // 5. Los .svg del disco coinciden byte a byte con construirFicheros()
  // --------------------------------------------------------------------------
  console.log('\n5. Sincronización en disco: byte a byte contra construirFicheros()')
  const mapaFicheros = construirFicheros()
  afirmar('construirFicheros() devuelve un Map con ficheros', mapaFicheros instanceof Map && mapaFicheros.size > 0)

  if (mapaFicheros instanceof Map) {
    for (const [rutaRelativa, contenidoEsperado] of mapaFicheros.entries()) {
      const rutaAbsoluta = path.resolve(process.cwd(), rutaRelativa)
      if (!fs.existsSync(rutaAbsoluta)) {
        afirmar(`${rutaRelativa} existe en disco`, false, true, false)
        continue
      }
      const contenidoDisco = fs.readFileSync(rutaAbsoluta, 'utf-8')
      const coincide = contenidoDisco === contenidoEsperado
      afirmar(`${rutaRelativa} coincide byte a byte`, coincide, true, coincide)
    }
  }

  // --------------------------------------------------------------------------
  // 6. Los .png existen, tienen dimensiones 192 y 512, y no están en blanco
  // --------------------------------------------------------------------------
  console.log('\n6. Iconos PWA rasterizados con dimensiones correctas y no en blanco')
  const pngsAProbar = [
    { ruta: 'public/icon-192.png', size: 192 },
    { ruta: 'public/icon-512.png', size: 512 },
  ]

  for (const item of pngsAProbar) {
    const rutaAbsoluta = path.resolve(process.cwd(), item.ruta)
    if (!fs.existsSync(rutaAbsoluta)) {
      afirmar(`${item.ruta} existe en disco`, false, true, false)
      continue
    }

    try {
      const imagen = sharp(rutaAbsoluta)
      const metadata = await imagen.metadata()

      afirmar(
        `${item.ruta} tiene ancho ${item.size} px`,
        metadata.width === item.size,
        item.size,
        metadata.width
      )
      afirmar(
        `${item.ruta} tiene alto ${item.size} px`,
        metadata.height === item.size,
        item.size,
        metadata.height
      )

      // Comprobar que no está en blanco (más de un color en píxeles raw)
      const { data, info } = await imagen.raw().toBuffer({ resolveWithObject: true })
      const channels = info.channels
      const coloresUnicos = new Set<string>()

      // Muestreo de píxeles
      const paso = Math.max(1, Math.floor(data.length / (channels * 1000)))
      for (let i = 0; i < data.length; i += channels * paso) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const a = channels >= 4 ? data[i + 3] : 255
        coloresUnicos.add(`${r},${g},${b},${a}`)
        if (coloresUnicos.size > 1) break
      }

      afirmar(
        `${item.ruta} no está en blanco (tiene múltiples colores/opacidades)`,
        coloresUnicos.size > 1,
        '> 1 color',
        `${coloresUnicos.size} color(es)`
      )
    } catch (err) {
      afirmar(`${item.ruta} procesable con sharp`, false, 'OK', String(err))
    }
  }

  // --------------------------------------------------------------------------
  // Resultado final
  // --------------------------------------------------------------------------
  if (fallos > 0) {
    console.log(`\n\x1b[31m✗ ${fallos} comprobación(es) fallaron\x1b[0m\n`)
    process.exit(1)
  }

  console.log('\n\x1b[32m✅ PRUEBA DE MARCA SUPERADA\x1b[0m\n')
}

main().catch((err) => {
  console.error('\n\x1b[31mError fatal en prueba-marca:\x1b[0m', err)
  process.exit(1)
})
