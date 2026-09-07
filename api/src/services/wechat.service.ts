import { config } from '../config/index.js'

interface WxSessionResponse {
  openid?: string
  session_key?: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

export async function code2Session(code: string): Promise<WxSessionResponse> {
  const url = new URL('https://api.weixin.qq.com/sns/jscode2session')
  url.searchParams.set('appid', config.wxAppId)
  url.searchParams.set('secret', config.wxSecret)
  url.searchParams.set('js_code', code)
  url.searchParams.set('grant_type', 'authorization_code')

  const res = await fetch(url)
  return (await res.json()) as WxSessionResponse
}

export function canUseWxLogin(): boolean {
  return Boolean(config.wxAppId && config.wxSecret)
}
