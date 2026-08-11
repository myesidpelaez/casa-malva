export function formatCurrencyFromCents(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function fromCents(cents: number): number {
  return cents / 100
}

export function toCents(amount: number): number {
  return amount * 100
}

export function formatInputNumber(value: string | number): string {
  if (value === '' || value === undefined || value === null) return ''
  const num = typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : value
  if (isNaN(num)) return ''
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export function parseInputNumber(value: string): number {
  const clean = value.replace(/\D/g, '')
  return clean === '' ? 0 : parseInt(clean, 10)
}
