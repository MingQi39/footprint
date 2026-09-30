const CHINA_BBOX = {
  minLat: 18,
  maxLat: 54,
  minLng: 73,
  maxLng: 135,
}

export function isInChinaBBox(lat: number, lng: number): boolean {
  return (
    lat >= CHINA_BBOX.minLat &&
    lat <= CHINA_BBOX.maxLat &&
    lng >= CHINA_BBOX.minLng &&
    lng <= CHINA_BBOX.maxLng
  )
}

/** 坐标粗判国家（逆地理失败或历史数据缺 country 时用） */
export function inferCountryFromCoordinates(
  lat: number,
  lng: number,
): string {
  if (isInChinaBBox(lat, lng)) return '中国'
  if (lat >= 33 && lat <= 39.5 && lng >= 124 && lng <= 132.5) return '韩国'
  if (lat >= 24 && lat <= 46.5 && lng >= 122 && lng <= 154) return '日本'
  return ''
}

/** 从逆地理/选点结果推断国家或地区（空字符串表示未知） */
export function inferCountry(options: {
  nation?: string
  province?: string
  lat: number
  lng: number
}): string {
  const nation = options.nation?.trim()
  if (nation) return nation
  if (options.province?.trim()) return '中国'
  const byCoords = inferCountryFromCoordinates(options.lat, options.lng)
  if (byCoords) return byCoords
  return ''
}

export function resolveCheckinCountry(body: {
  country?: string
  province?: string
  lat: number
  lng: number
}): string {
  const explicit = body.country?.trim()
  if (explicit) return explicit
  return inferCountry({
    province: body.province,
    lat: body.lat,
    lng: body.lng,
  })
}

type CheckinCountryFields = {
  country: string
  province: string
  lat: number | string | { toString(): string }
  lng: number | string | { toString(): string }
}

/** 展示/统计用：修正库内误标「中国」或空 country 的海外打卡 */
export function effectiveCheckinCountry(item: CheckinCountryFields): string {
  const lat = Number(item.lat)
  const lng = Number(item.lng)
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return (item.country ?? '').trim()
  }

  const stored = (item.country ?? '').trim()
  const byCoords = inferCountryFromCoordinates(lat, lng)

  if (stored && stored !== '中国') return stored
  if (byCoords && byCoords !== '中国') return byCoords
  if (stored === '中国' && item.province?.trim() && isInChinaBBox(lat, lng)) {
    return '中国'
  }
  if (byCoords) return byCoords
  if (stored) return stored
  return inferCountry({ province: item.province, lat, lng })
}
