export function now() {
  return new Date()
}

export function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

export function toDate(value: unknown) {
  if (value instanceof Date) {
    return value
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value)
  }

  return new Date('')
}

export function isFutureDate(value: unknown, baseDate = now()) {
  const target = toDate(value)
  return !Number.isNaN(target.getTime()) && target.getTime() > baseDate.getTime()
}

