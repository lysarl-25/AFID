export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount
}

export function normalizeHeading(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

export function shortestAngleDiff(from: number, to: number): number {
  const delta = normalizeHeading(to - from)
  return delta > 180 ? delta - 360 : delta
}

export function mapRange(
  value: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number,
): number {
  if (inputMax === inputMin) return outputMin
  const ratio = clamp((value - inputMin) / (inputMax - inputMin), 0, 1)
  return outputMin + ratio * (outputMax - outputMin)
}

export function smoothFactor(deltaSeconds: number, timeConstant: number): number {
  if (timeConstant <= 0) return 1
  return 1 - Math.exp(-Math.max(0, deltaSeconds) / timeConstant)
}

export function roundToStep(value: number, step: number, decimals = 0): number {
  const stepped = Math.round(value / step) * step
  return Number(stepped.toFixed(decimals))
}
