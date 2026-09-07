import 'dotenv/config'

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (!value) {
    throw new Error(`Missing required env: ${name}`)
  }
  return value
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: required('JWT_SECRET', 'footprint-dev-secret-key-32chars!!'),
  databaseUrl: required('DATABASE_URL'),
  wxAppId: process.env.WX_APPID ?? '',
  wxSecret: process.env.WX_SECRET ?? '',
  devMode: process.env.DEV_MODE === 'true',
  tencentMapKey: process.env.TENCENT_MAP_KEY ?? '',
  uploadMode: (process.env.UPLOAD_MODE ?? 'local') as 'local' | 'oss',
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000',
  oss: {
    region: process.env.OSS_REGION ?? '',
    bucket: process.env.OSS_BUCKET ?? '',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID ?? '',
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET ?? '',
    cdnDomain: process.env.OSS_CDN_DOMAIN ?? '',
  },
}
