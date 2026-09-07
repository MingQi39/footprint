import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { config } from '../config/index.js'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string }
    user: { userId: string }
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export default fp(async (fastify) => {
  await fastify.register(jwt, {
    secret: config.jwtSecret,
    sign: { expiresIn: '7d' },
  })

  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify()
      } catch {
        reply.code(401).send({ code: 401, message: '未登录或登录已过期' })
      }
    },
  )
})
