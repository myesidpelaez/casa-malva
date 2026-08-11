export const REGLAS_NEGOCIO = {
  nombre: 'Casa Malva',
  bajada: 'Estudio de belleza',
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
