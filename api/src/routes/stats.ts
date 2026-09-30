import type { FastifyInstance } from 'fastify'
import { effectiveCheckinCountry } from '../utils/country.js'
import { prisma } from '../utils/prisma.js'
import { ok } from '../utils/response.js'

export async function statsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/v1/stats/summary',
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const userId = BigInt(request.user.userId)

      const [totalCheckins, cities, geoRows, totalPhotos, range] =
        await Promise.all([
          prisma.checkin.count({ where: { userId } }),
          prisma.checkin.findMany({
            where: { userId },
            select: { city: true },
            distinct: ['city'],
          }),
          prisma.checkin.findMany({
            where: { userId },
            select: { country: true, province: true, lat: true, lng: true },
          }),
          prisma.checkinPhoto.count({
            where: { checkin: { userId } },
          }),
          prisma.checkin.aggregate({
            where: { userId },
            _min: { checkinAt: true },
            _max: { checkinAt: true },
          }),
        ])

      const countrySet = new Set<string>()
      const provinceSet = new Set<string>()
      for (const row of geoRows) {
        const country = effectiveCheckinCountry(row)
        if (country) countrySet.add(country)
        if (country === '中国' && row.province) provinceSet.add(row.province)
      }

      return ok({
        totalCheckins,
        totalCities: cities.filter((item) => item.city).length,
        totalCountries: countrySet.size,
        totalProvinces: provinceSet.size,
        totalPhotos,
        firstCheckinAt: range._min.checkinAt,
        latestCheckinAt: range._max.checkinAt,
      })
    },
  )
}
