import type { FastifyInstance } from 'fastify'
import {
  reverseGeocode,
  searchLocations,
} from '../services/tencent-map.service.js'
import { ok } from '../utils/response.js'

export async function locationRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/v1/locations/search',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const query = request.query as { keyword?: string; region?: string }

      if (!query.keyword?.trim()) {
        return reply.code(400).send({ code: 400, message: '请输入搜索关键词' })
      }

      try {
        const list = await searchLocations(query.keyword, query.region ?? '全国')
        return ok({ list })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '地点搜索失败'
        return reply.code(500).send({ code: 500, message })
      }
    },
  )

  fastify.get(
    '/v1/locations/reverse',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const query = request.query as { lat?: string; lng?: string }
      const lat = Number(query.lat)
      const lng = Number(query.lng)

      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return reply.code(400).send({ code: 400, message: '缺少有效坐标' })
      }

      const location = await reverseGeocode(lat, lng)
      if (!location) {
        return reply.code(404).send({ code: 404, message: '无法解析该坐标' })
      }

      return ok(location)
    },
  )
}
