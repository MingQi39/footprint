import type { FastifyInstance } from 'fastify'
import { effectiveCheckinCountry } from '../utils/country.js'
import { prisma, serializeBigInt } from '../utils/prisma.js'
import { ok } from '../utils/response.js'

export async function mapRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/v1/map/markers',
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const userId = BigInt(request.user.userId)

      const checkins = await prisma.checkin.findMany({
        where: { userId },
        include: { photos: { orderBy: { sortOrder: 'asc' }, take: 1 } },
        orderBy: { checkinAt: 'desc' },
      })

      const cityMap = new Map<
        string,
        {
          id: string
          name: string
          lat: number
          lng: number
          country: string
          province: string
          city: string
          checkinCount: number
          latestCheckinAt: Date
          coverPhoto: string
        }
      >()

      const provinces = new Set<string>()
      const countries = new Set<string>()

      for (const item of checkins) {
        const country = effectiveCheckinCountry(item)
        if (country) countries.add(country)
        if (country === '中国' && item.province) {
          provinces.add(item.province)
        }

        const key = item.city || item.name
        const lat = Number(item.lat)
        const lng = Number(item.lng)
        const existing = cityMap.get(key)

        if (!existing) {
          cityMap.set(key, {
            id: `city_${key}`,
            name: item.city || item.name,
            lat,
            lng,
            country,
            province: item.province,
            city: item.city,
            checkinCount: 1,
            latestCheckinAt: item.checkinAt,
            coverPhoto: item.photos[0]?.url ?? '',
          })
          continue
        }

        existing.checkinCount += 1
        if (item.checkinAt > existing.latestCheckinAt) {
          existing.latestCheckinAt = item.checkinAt
          existing.coverPhoto = item.photos[0]?.url ?? existing.coverPhoto
        }
      }

      return ok(
        serializeBigInt({
          markers: [...cityMap.values()],
          countries: [...countries],
          provinces: [...provinces],
        }),
      )
    },
  )
}
