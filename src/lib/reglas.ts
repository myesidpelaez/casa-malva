export const REGLAS_NEGOCIO = {
  nombre: 'Casa Malva',
  bajada: 'Estudio de belleza',

  /**
   * La sede. **Única fuente de verdad de la ubicación** (decisión de Mario, 2026-08-21).
   *
   * Antes de hoy había DOS direcciones inventadas y contradictorias escritas a mano en el
   * código: la web decía «Circular 4ª con Carrera 76, Laureles» y la confirmación de WhatsApp
   * decía «Cra. 37 #8A-42, Vía Provenza» — dos barrios al otro lado de la ciudad, ninguno
   * marcado como maqueta, y ambos son coordenadas REALES de Medellín a las que alguien podía
   * presentarse. Además `notifications.ts` inventaba una por defecto con un `||`.
   *
   * 🔴 **Casa Malva es un negocio ficticio.** Su dirección se declara como lo que es. Cuando
   * este sistema se instale en un cliente real, esto sale de su ficha, no de aquí — y
   * `esDemostracion` pasa a `false` para que nada siga anunciándose como maqueta.
   */
  sede: {
    nombre: 'Casa Malva · Sede de demostración',
    ciudad: 'Medellín, Colombia',
    direccion: 'Sede de demostración · Medellín',
    esDemostracion: true,
  },

  minAntelacionMin: 120,
  maxAntelacionDias: 60,
  almuerzo: { desde: 780, hasta: 840 }, // 13:00–14:00 (en minutos)
  pasoMin: 15,
  umbralConfirmacionCentavos: 20000000,
  cancelacionNoShowHoras: 4,
  recordatorioHoras: 24,
  horarioEstudio: {
    diasApertura: [1, 2, 3, 4, 5, 6], // Lunes a Sábado (1=Lunes ... 6=Sábado)
    horaApertura: '09:00',
    horaCierre: '19:00',
  },
  zonaHoraria: 'America/Bogota',
} as const
