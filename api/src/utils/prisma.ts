import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()

export function serializeBigInt<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, val) =>
      typeof val === 'bigint' ? val.toString() : val,
    ),
  ) as T
}
