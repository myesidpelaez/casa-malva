import {
  Brush,
  Eye,
  Hand,
  Scissors,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { Category, Professional, Service } from '@/types'

/**
 * Presentación de las categorías del catálogo.
 */
export type CategoryLook = {
  icon: LucideIcon
  /** Clases de fondo del "azulejo" del icono. */
  tile: string
  /** Frase corta de apoyo, editorial. */
  claim: string
  /** Imagen editorial de alta resolución */
  image: string
}

const LOOKS: Record<string, CategoryLook> = {
  cat_unas: {
    icon: Hand,
    tile: 'bg-malva-100 text-malva-600',
    claim: 'Manos y pies impecables, con acabado que dura.',
    image: '/images/cat_unas.jpg',
  },
  cat_cabello: {
    icon: Scissors,
    tile: 'bg-blush/40 text-malva-700',
    claim: 'Corte, color y tratamiento con diagnóstico previo.',
    image: '/images/cat_cabello.jpg',
  },
  cat_maquillaje: {
    icon: Brush,
    tile: 'bg-champagne/45 text-warning',
    claim: 'Para el día que quieres recordar en fotos.',
    image: '/images/cat_maquillaje.jpg',
  },
  cat_cejas: {
    icon: Eye,
    tile: 'bg-sage/40 text-success',
    claim: 'La mirada primero: diseño, laminado y lifting.',
    image: '/images/cat_cejas.jpg',
  },
}

const FALLBACK: CategoryLook = {
  icon: Sparkles,
  tile: 'bg-malva-100 text-malva-600',
  claim: 'Servicios del estudio.',
  image: '/images/hero.jpg',
}

export function categoryLook(categoryId: string): CategoryLook {
  return LOOKS[categoryId] ?? FALLBACK
}

/** Obtiene la foto de perfil asignada a un profesional */
export function getProfessionalAvatar(prof: { id?: string; nombre?: string }): string | null {
  const norm = `${prof.id ?? ''} ${prof.nombre ?? ''}`.toLowerCase();
  if (norm.includes('valentina')) return '/images/pro_valentina.jpg';
  if (norm.includes('daniela')) return '/images/pro_daniela.jpg';
  if (norm.includes('sara')) return '/images/pro_sara.jpg';
  if (norm.includes('camila')) return '/images/pro_camila.jpg';
  if (norm.includes('marcela')) return '/images/pro_marcela.jpg';
  return null;
}

/**
 * Resuelve la imagen fotográfica editorial adecuada para cada servicio (Lookbook).
 */
export function getServiceImage(service: { id?: string; nombre?: string; categoryId?: string; imagenUrl?: string }): string {
  if (service.imagenUrl && service.imagenUrl.trim().length > 0) {
    return service.imagenUrl;
  }
  
  const norm = `${service.id ?? ''} ${service.nombre ?? ''}`.toLowerCase();
  
  // Uñas
  if (norm.includes('retoque') || norm.includes('mantenimiento')) return '/images/services/retoques.jpg';
  if (norm.includes('semipermanente') || norm.includes('manicure') || norm.includes('acrilic') || norm.includes('nail art')) return '/images/services/manicure_semipermanente.jpg';
  if (norm.includes('pedicure') || norm.includes('pies')) return '/images/services/pedicure_spa.jpg';
  
  // Cabello
  if (norm.includes('balayage') || norm.includes('color') || norm.includes('ilumina')) return '/images/services/cabello_balayage.jpg';
  if (norm.includes('corte') || norm.includes('cepillado') || norm.includes('blower')) return '/images/services/cabello_corte.jpg';
  
  // Maquillaje
  if (norm.includes('maquillaje') || norm.includes('social') || norm.includes('novia') || norm.includes('makeup')) return '/images/services/maquillaje_social.jpg';
  
  // Cejas y Pestañas
  if (norm.includes('cejas') || norm.includes('pestañas') || norm.includes('laminado') || norm.includes('lifting')) return '/images/services/cejas_laminado.jpg';
  
  // Fallback a la imagen de la categoría
  if (service.categoryId && LOOKS[service.categoryId]) {
    return LOOKS[service.categoryId].image;
  }
  
  return '/images/cat_unas.jpg';
}

/**
 * Limpia emojis y espacios sobrantes de un nombre de categoría.
 */
export function cleanCategoryName(nombre: string): string {
  return nombre
    .replace(/[\p{Extended_Pictographic}️‍]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Precio mínimo de una categoría, para el "desde $X" de la portada. */
export function priceFrom(services: Service[]): number | null {
  const active = services.filter((s) => s.activo)
  if (active.length === 0) return null
  return Math.min(...active.map((s) => s.precioCentavos))
}

export function servicesOf(services: Service[], category: Category): Service[] {
  return services.filter((s) => s.categoryId === category.id)
}

/** "1 h 30 min" en vez de "90 minutos": así lo dice una recepcionista. */
export function humanDuration(duracionMin: number): string {
  if (duracionMin < 60) return `${duracionMin} min`
  const h = Math.floor(duracionMin / 60)
  const m = duracionMin % 60
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

/**
 * Retorna la lista de profesionales activas que ofrecen servicios dentro de una categoría.
 */
export function getSpecialistsForCategory(
  professionals: Professional[],
  category: Category,
  services: Service[]
): Professional[] {
  const catServices = servicesOf(services, category).filter((s) => s.activo)
  const catServiceIds = new Set(catServices.map((s) => s.id))
  return professionals.filter(
    (p) => p.activo && (p.serviceIds ?? []).some((sId: string) => catServiceIds.has(sId))
  )
}
