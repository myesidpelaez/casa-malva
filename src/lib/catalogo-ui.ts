import {
  Brush,
  Eye,
  Hand,
  Scissors,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { Category, Service } from '@/types'

/**
 * Presentación de las categorías del catálogo.
 *
 * Por qué existe: el nombre de la categoría lo edita el administrador, así que
 * no puede cargar con la parte visual. El icono y el acento viven aquí, atados
 * al `id`, y el nombre se muestra tal como lo escribió el dueño del estudio
 * — sin emojis dentro del dato.
 */
type CategoryLook = {
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
 * Limpia emojis y espacios sobrantes de un nombre de categoría.
 * Tolera datos antiguos donde el emoji viajaba dentro del nombre.
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
export function humanDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}
