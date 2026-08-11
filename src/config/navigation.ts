export type NavItem = {
  title: string
  href: string
  iconName: string
  badge?: string
}

export const PUBLIC_NAV: NavItem[] = [
  { title: 'Inicio', href: '/inicio', iconName: 'Home' },
  { title: 'Catálogo', href: '/servicios', iconName: 'Sparkles' },
  { title: 'Reservar', href: '/reservar', iconName: 'CalendarPlus' },
]

export const ADMIN_NAV: NavItem[] = [
  { title: 'Agenda', href: '/admin/agenda', iconName: 'Calendar' },
  { title: 'Catálogo', href: '/admin/catalogo', iconName: 'BookOpen' },
  { title: 'Profesionales', href: '/admin/profesionales', iconName: 'Users' },
  { title: 'Clientas', href: '/admin/clientas', iconName: 'UserCheck' },
  { title: 'Agente IA', href: '/admin/agente', iconName: 'Bot' },
]
