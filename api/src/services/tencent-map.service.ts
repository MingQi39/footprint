import { config } from '../config/index.js'

export interface LocationItem {
  name: string
  address: string
  lat: number
  lng: number
  province: string
  city: string
  district: string
}

const MOCK_LOCATIONS: LocationItem[] = [
  {
    name: '西湖风景名胜区',
    address: '浙江省杭州市西湖区龙井路1号',
    lat: 30.242865,
    lng: 120.148572,
    province: '浙江省',
    city: '杭州市',
    district: '西湖区',
  },
  {
    name: '故宫博物院',
    address: '北京市东城区景山前街4号',
    lat: 39.916345,
    lng: 116.397155,
    province: '北京市',
    city: '北京市',
    district: '东城区',
  },
  {
    name: '外滩',
    address: '上海市黄浦区中山东一路',
    lat: 31.240384,
    lng: 121.490317,
    province: '上海市',
    city: '上海市',
    district: '黄浦区',
  },
  {
    name: '成都宽窄巷子',
    address: '四川省成都市青羊区金河路口宽窄巷子',
    lat: 30.663874,
    lng: 104.055731,
    province: '四川省',
    city: '成都市',
    district: '青羊区',
  },
  {
    name: '广州塔',
    address: '广东省广州市海珠区阅江西路222号',
    lat: 23.106375,
    lng: 113.324587,
    province: '广东省',
    city: '广州市',
    district: '海珠区',
  },
]

function parseRegion(adInfo?: Record<string, string>) {
  return normalizeRegion({
    province: adInfo?.province ?? '',
    city: adInfo?.city ?? '',
    district: adInfo?.district ?? '',
  })
}

const MUNICIPALITIES = new Set(['北京市', '上海市', '天津市', '重庆市'])

function normalizeRegion(region: {
  province: string
  city: string
  district: string
}) {
  let { province, city, district } = region

  if (!city && province && MUNICIPALITIES.has(province)) {
    city = province
  }

  return { province, city, district }
}

function normalizeLocation(item: LocationItem): LocationItem {
  const region = normalizeRegion({
    province: item.province,
    city: item.city,
    district: item.district,
  })

  let name = item.name
  if (name === '当前位置' && (region.city || region.district)) {
    name = [region.city, region.district].filter(Boolean).join(' ')
  }

  return {
    ...item,
    ...region,
    name,
  }
}

export async function searchLocations(
  keyword: string,
  region = '全国',
): Promise<LocationItem[]> {
  if (!keyword.trim()) return []

  if (!config.tencentMapKey) {
    const list = MOCK_LOCATIONS.filter(
      (item) =>
        item.name.includes(keyword) ||
        item.city.includes(keyword) ||
        item.province.includes(keyword),
    )
    if (!list.length) {
      throw new Error(
        '地图搜索未配置，请在服务端设置 TENCENT_MAP_KEY 并开启 WebServiceAPI',
      )
    }
    return list
  }

  const url = new URL('https://apis.map.qq.com/ws/place/v1/search')
  url.searchParams.set('keyword', keyword)
  url.searchParams.set('boundary', `region(${region},0)`)
  url.searchParams.set('page_size', '20')
  url.searchParams.set('page_index', '1')
  url.searchParams.set('key', config.tencentMapKey)

  const res = await fetch(url)
  const json = (await res.json()) as {
    status: number
    message?: string
    data?: Array<{
      title: string
      address: string
      location: { lat: number; lng: number }
      ad_info?: Record<string, string>
    }>
  }

  if (json.status !== 0 || !json.data) {
    throw new Error(json.message ?? '地点搜索失败')
  }

  return json.data.map((item) =>
    normalizeLocation({
      name: item.title,
      address: item.address,
      lat: item.location.lat,
      lng: item.location.lng,
      ...parseRegion(item.ad_info),
    }),
  )
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<LocationItem | null> {
  if (!config.tencentMapKey) {
    return normalizeLocation({
      name: '当前位置',
      address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      lat,
      lng,
      province: '',
      city: '',
      district: '',
    })
  }

  const url = new URL('https://apis.map.qq.com/ws/geocoder/v1/')
  url.searchParams.set('location', `${lat},${lng}`)
  url.searchParams.set('key', config.tencentMapKey)

  const res = await fetch(url)
  const json = (await res.json()) as {
    status: number
    result?: {
      address: string
      formatted_addresses?: { recommend?: string }
      address_component?: Record<string, string>
      location?: { lat: number; lng: number }
    }
  }

  if (json.status !== 0 || !json.result) return null

  const component = json.result.address_component ?? {}
  return normalizeLocation({
    name:
      json.result.formatted_addresses?.recommend ??
      component.street ??
      '当前位置',
    address: json.result.address,
    lat: json.result.location?.lat ?? lat,
    lng: json.result.location?.lng ?? lng,
    province: component.province ?? '',
    city: component.city ?? '',
    district: component.district ?? '',
  })
}
