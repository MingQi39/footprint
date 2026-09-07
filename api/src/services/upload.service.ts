import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { config } from '../config/index.js'

export interface PresignResult {
  uploadUrl: string
  fileUrl: string
  method: 'PUT' | 'POST'
  expiresIn: number
  headers?: Record<string, string>
}

function buildLocalFileUrl(filename: string): string {
  return `${config.publicBaseUrl}/uploads/${filename}`
}

export async function createUploadTarget(
  filename: string,
  contentType: string,
): Promise<PresignResult> {
  const ext = path.extname(filename) || '.jpg'
  const objectKey = `${randomUUID()}${ext}`

  if (config.uploadMode === 'oss') {
    return createOssPresign(objectKey, contentType)
  }

  await mkdir(config.uploadDir, { recursive: true })

  return {
    uploadUrl: `${config.publicBaseUrl}/v1/upload/local/${objectKey}`,
    fileUrl: buildLocalFileUrl(objectKey),
    method: 'POST',
    expiresIn: 300,
  }
}

async function createOssPresign(
  objectKey: string,
  contentType: string,
): Promise<PresignResult> {
  const { region, bucket, accessKeyId, accessKeySecret, cdnDomain } = config.oss

  if (!region || !bucket || !accessKeyId || !accessKeySecret) {
    throw new Error('OSS 配置不完整，请检查环境变量')
  }

  const host = `${bucket}.${region}.aliyuncs.com`
  const date = new Date()
  date.setSeconds(date.getSeconds() + 300)
  const expiration = date.toISOString()

  const policy = Buffer.from(
    JSON.stringify({
      expiration,
      conditions: [
        ['content-length-range', 0, 10485760],
        { bucket },
        ['eq', '$key', objectKey],
        ['eq', '$Content-Type', contentType],
      ],
    }),
  ).toString('base64')

  const crypto = await import('node:crypto')
  const signature = crypto
    .createHmac('sha1', accessKeySecret)
    .update(policy)
    .digest('base64')

  const fileUrl = cdnDomain
    ? `${cdnDomain.replace(/\/$/, '')}/${objectKey}`
    : `https://${host}/${objectKey}`

  return {
    uploadUrl: `https://${host}`,
    fileUrl,
    method: 'POST',
    expiresIn: 300,
    headers: {
      key: objectKey,
      policy,
      OSSAccessKeyId: accessKeyId,
      Signature: signature,
      'Content-Type': contentType,
      success_action_status: '200',
    },
  }
}

export async function saveLocalUpload(
  objectKey: string,
  buffer: Buffer,
): Promise<string> {
  await mkdir(config.uploadDir, { recursive: true })
  const target = path.join(config.uploadDir, objectKey)
  await writeFile(target, buffer)
  return buildLocalFileUrl(objectKey)
}
