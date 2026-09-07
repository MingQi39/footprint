import type { FastifyInstance } from 'fastify'
import { prisma } from '../utils/prisma.js'
import { ok } from '../utils/response.js'

export async function statsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/v1/stats/summary',
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const userId = BigInt(request.user.userId)

      const [totalCheckins, cities, provinces, totalPhotos, range] =
        await Promise.all([
          prisma.checkin.count({ where: { userId } }),
          prisma.checkin.findMany({
            where: { userId },
            select: { city: true },
            distinct: ['city'],
          }),
          prisma.checkin.findMany({
            where: { userId },
            select: { province: true },
            distinct: ['province'],
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

      return ok({
        totalCheckins,
        totalCities: cities.filter((item) => item.city).length,
        totalProvinces: provinces.filter((item) => item.province).length,
        totalPhotos,
        firstCheckinAt: range._min.checkinAt,
        latestCheckinAt: range._max.checkinAt,
      })
    },
  )
}
