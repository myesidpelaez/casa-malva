import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizePhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (phone.startsWith('+')) return `+${digits}`
  if (digits.length === 10) return `+57${digits}`
  return `+${digits}`
}
