import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config/index.js'
import jwtPlugin from './plugins/jwt.js'
import { authRoutes } from './routes/auth.js'
import { checkinRoutes } from './routes/checkins.js'
import { locationRoutes } from './routes/locations.js'
import { mapRoutes } from './routes/map.js'
import { statsRoutes } from './routes/stats.js'
import { uploadRoutes } from './routes/upload.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function buildApp() {
  const app = Fastify({ logger: true })

  await app.register(cors, { origin: true })
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })
  await app.register(jwtPlugin)

  await app.register(fastifyStatic, {
    root: path.resolve(config.uploadDir),
    prefix: '/uploads/',
    decorateReply: false,
  })

  await app.register(authRoutes)
  await app.register(checkinRoutes)
  await app.register(locationRoutes)
  await app.register(mapRoutes)
  await app.register(statsRoutes)
  await app.register(uploadRoutes)

  app.get('/health', async () => ({ ok: true }))

  return app
}

const app = await buildApp()

try {
  await app.listen({ port: config.port, host: '0.0.0.0' })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
