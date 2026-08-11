import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Casa Malva · Estudio de belleza',
    short_name: 'Casa Malva',
    description: 'Estudio de belleza en Laureles, Medellín',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF8F9',
    theme_color: '#7B4B6E',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
