import type { FastifyInstance } from 'fastify'
import { prisma, serializeBigInt } from '../utils/prisma.js'
import { endOfDay, ok, parseDateInput, startOfDay } from '../utils/response.js'

function formatCheckinListItem(checkin: {
  id: bigint
  name: string
  city: string
  province: string
  checkinAt: Date
  photos: { url: string }[]
}) {
  return {
    id: checkin.id.toString(),
    name: checkin.name,
    city: checkin.city,
    province: checkin.province,
    checkinAt: checkin.checkinAt,
    coverPhoto: checkin.photos[0]?.url ?? '',
    photoCount: checkin.photos.length,
  }
}

export async function checkinRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] }

  fastify.post('/v1/checkins', auth, async (request, reply) => {
    const userId = BigInt(request.user.userId)
    const body = request.body as {
      name?: string
      address?: string
      lat?: number
      lng?: number
      country?: string
      province?: string
      city?: string
      district?: string
      checkinAt?: string
      note?: string
      photoUrls?: string[]
    }

    if (!body.name || body.lat == null || body.lng == null) {
      return reply.code(400).send({ code: 400, message: '缺少地点名称或坐标' })
    }

    const checkin = await prisma.checkin.create({
      data: {
        userId,
        name: body.name,
        address: body.address ?? '',
        lat: body.lat,
        lng: body.lng,
        country: body.country ?? '中国',
        province: body.province ?? '',
        city: body.city ?? '',
        district: body.district ?? '',
        checkinAt: parseDateInput(body.checkinAt) ?? new Date(),
        note: body.note,
        photos: {
          create: (body.photoUrls ?? []).map((url, index) => ({
            url,
            sortOrder: index,
          })),
        },
      },
      include: { photos: true },
    })

    return ok(serializeBigInt(checkin))
  })

  fastify.get('/v1/checkins', auth, async (request) => {
    const userId = BigInt(request.user.userId)
    const query = request.query as {
      year?: string
      month?: string
      date?: string
      page?: string
      pageSize?: string
    }

    const page = Math.max(Number(query.page ?? 1), 1)
    const pageSize = Math.min(Math.max(Number(query.pageSize ?? 20), 1), 100)

    const where: {
      userId: bigint
      checkinAt?: { gte?: Date; lte?: Date }
    } = { userId }

    if (query.date) {
      const day = parseDateInput(query.date)
      if (day) {
        where.checkinAt = { gte: startOfDay(day), lte: endOfDay(day) }
      }
    } else if (query.year && query.month) {
      const year = Number(query.year)
      const month = Number(query.month)
      where.checkinAt = {
        gte: new Date(year, month - 1, 1),
        lte: new Date(year, month, 0, 23, 59, 59, 999),
      }
    }

    const [total, list] = await Promise.all([
      prisma.checkin.count({ where }),
      prisma.checkin.findMany({
        where,
        include: { photos: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { checkinAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return ok({
      total,
      page,
      pageSize,
      list: list.map(formatCheckinListItem),
    })
  })

  fastify.get('/v1/checkins/calendar', auth, async (request) => {
    const userId = BigInt(request.user.userId)
    const query = request.query as { year?: string; month?: string }

    const year = Number(query.year ?? new Date().getFullYear())
    const month = Number(query.month ?? new Date().getMonth() + 1)

    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59, 999)

    const checkins = await prisma.checkin.findMany({
      where: {
        userId,
        checkinAt: { gte: start, lte: end },
      },
      select: { checkinAt: true },
    })

    const counter = new Map<string, number>()
    for (const item of checkins) {
      const key = item.checkinAt.toISOString().slice(0, 10)
      counter.set(key, (counter.get(key) ?? 0) + 1)
    }

    return ok({
      dates: [...counter.entries()].map(([date, count]) => ({ date, count })),
    })
  })

  fastify.get('/v1/checkins/:id', auth, async (request, reply) => {
    const userId = BigInt(request.user.userId)
    const { id } = request.params as { id: string }

    const checkin = await prisma.checkin.findFirst({
      where: { id: BigInt(id), userId },
      include: { photos: { orderBy: { sortOrder: 'asc' } } },
    })

    if (!checkin) {
      return reply.code(404).send({ code: 404, message: '记录不存在' })
    }

    return ok(serializeBigInt(checkin))
  })

  fastify.delete('/v1/checkins/:id', auth, async (request, reply) => {
    const userId = BigInt(request.user.userId)
    const { id } = request.params as { id: string }

    const existing = await prisma.checkin.findFirst({
      where: { id: BigInt(id), userId },
    })

    if (!existing) {
      return reply.code(404).send({ code: 404, message: '记录不存在' })
    }

    await prisma.checkin.delete({ where: { id: BigInt(id) } })
    return ok({ deleted: true })
  })
}
