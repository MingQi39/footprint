import type { FastifyInstance } from 'fastify'
import { config } from '../config/index.js'
import { prisma, serializeBigInt } from '../utils/prisma.js'
import { ok } from '../utils/response.js'
import { canUseWxLogin, code2Session } from '../services/wechat.service.js'

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/v1/auth/wx-login', async (request, reply) => {
    const body = request.body as { code?: string }
    if (!body.code) {
      return reply.code(400).send({ code: 400, message: '缺少 code' })
    }

    if (!canUseWxLogin()) {
      return reply
        .code(400)
        .send({ code: 400, message: '未配置微信 AppID/Secret，请使用 dev-login' })
    }

    const session = await code2Session(body.code)
    if (!session.openid) {
      return reply.code(400).send({
        code: 400,
        message: session.errmsg ?? '微信登录失败',
      })
    }

    const user = await prisma.user.upsert({
      where: { openid: session.openid },
      update: { unionid: session.unionid ?? undefined },
      create: {
        openid: session.openid,
        unionid: session.unionid,
      },
    })

    const token = fastify.jwt.sign({ userId: user.id.toString() })
    return ok({
      token,
      user: serializeBigInt(user),
    })
  })

  fastify.post('/v1/auth/dev-login', async (request, reply) => {
    if (!config.devMode) {
      return reply.code(403).send({ code: 403, message: '开发登录已关闭' })
    }

    const body = request.body as { nickname?: string; openid?: string }
    const openid = body.openid ?? `dev_${Date.now()}`

    const user = await prisma.user.upsert({
      where: { openid },
      update: {
        nickname: body.nickname ?? '开发用户',
      },
      create: {
        openid,
        nickname: body.nickname ?? '开发用户',
      },
    })

    const token = fastify.jwt.sign({ userId: user.id.toString() })
    return ok({
      token,
      user: serializeBigInt(user),
    })
  })

  fastify.get(
    '/v1/auth/me',
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const userId = BigInt(request.user.userId)
      const user = await prisma.user.findUnique({ where: { id: userId } })
      return ok(serializeBigInt(user))
    },
  )
}
