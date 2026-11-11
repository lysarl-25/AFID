import { normalizeHeading } from './math'

const formatterCache = new Map<number, Intl.NumberFormat>()

function getFormatter(decimals: number): Intl.NumberFormat {
  const existing = formatterCache.get(decimals)
  if (existing) return existing

  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  })
  formatterCache.set(decimals, formatter)
  return formatter
}

export function formatNumber(value: number, decimals = 0): string {
  return getFormatter(decimals).format(value)
}

export function formatSigned(value: number, decimals = 0): string {
  const rounded = Number(value.toFixed(decimals))
  const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : ''
  return `${sign}${formatNumber(Math.abs(rounded), decimals)}`
}

export function formatHeading(degrees: number): string {
  const rounded = Math.round(normalizeHeading(degrees)) % 360
  return `${rounded.toString().padStart(3, '0')}°`
}
