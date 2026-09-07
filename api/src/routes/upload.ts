import type { FastifyInstance } from 'fastify'
import { createUploadTarget, saveLocalUpload } from '../services/upload.service.js'
import { ok } from '../utils/response.js'

export async function uploadRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/v1/upload/presign',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = request.body as {
        filename?: string
        contentType?: string
      }

      if (!body.filename) {
        return reply.code(400).send({ code: 400, message: '缺少 filename' })
      }

      try {
        const result = await createUploadTarget(
          body.filename,
          body.contentType ?? 'image/jpeg',
        )
        return ok(result)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '生成上传凭证失败'
        return reply.code(500).send({ code: 500, message })
      }
    },
  )

  fastify.post('/v1/upload/local/:objectKey', async (request, reply) => {
    const { objectKey } = request.params as { objectKey: string }
    const data = await request.file()

    if (!data) {
      return reply.code(400).send({ code: 400, message: '缺少文件' })
    }

    const buffer = await data.toBuffer()
    const fileUrl = await saveLocalUpload(objectKey, buffer)
    return ok({ fileUrl })
  })
}
