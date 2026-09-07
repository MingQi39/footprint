export function ok<T>(data: T) {
  return { code: 0, data }
}

export function fail(message: string, code = 400) {
  return { code, message }
}

export function parseDateInput(input?: string): Date | undefined {
  if (!input) return undefined
  const date = new Date(input)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}
