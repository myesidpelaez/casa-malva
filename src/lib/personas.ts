import { Client } from '../types'

export function normalizarNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function nombreCorto(id: string, todas: Array<{ id: string; nombre: string }>): string {
  const me = todas.find(p => p.id === id)
  if (!me) return ''

  const nombreLimpio = me.nombre.trim().replace(/\s+/g, ' ')
  const partes = nombreLimpio.split(' ')
  const miPrimerNombre = partes[0]

  const coincidenPrimerNombre = todas.filter(p => {
    const suPrimerNombre = p.nombre.trim().replace(/\s+/g, ' ').split(' ')[0]
    return p.id !== me.id && suPrimerNombre === miPrimerNombre
  })

  if (coincidenPrimerNombre.length === 0) {
    return miPrimerNombre
  }

  const coincidenExacto = todas.filter(p => p.nombre.trim().replace(/\s+/g, ' ') === nombreLimpio)
  if (coincidenExacto.length > 1) {
    const exactasOrdenadas = coincidenExacto.sort((a, b) => a.id.localeCompare(b.id))
    const miIndice = exactasOrdenadas.findIndex(p => p.id === me.id)
    if (miIndice === 0) {
      return nombreLimpio
    }
    return `${nombreLimpio} (${miIndice + 1})`
  }

  const miApellido = partes[1]
  if (miApellido) {
    return `${miPrimerNombre} ${miApellido.charAt(0)}.`
  }

  return miPrimerNombre
}

export function posiblesDuplicadas(clientas: Client[]): Array<[Client, Client]> {
  const activas = clientas.filter(c => !c.fusionadaEn)
  const pares: Array<[Client, Client]> = []
  
  for (let i = 0; i < activas.length; i++) {
    for (let j = i + 1; j < activas.length; j++) {
      const c1 = activas[i]
      const c2 = activas[j]
      
      if (normalizarNombre(c1.nombre) === normalizarNombre(c2.nombre) && c1.telefonoE164 !== c2.telefonoE164) {
        pares.push([c1, c2])
      }
    }
  }
  
  return pares
}
