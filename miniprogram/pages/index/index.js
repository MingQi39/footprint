const api = require('../../utils/api')
const {
  collectCountriesFromMarkers,
  effectiveCountryFromMarker,
} = require('../../utils/country')

Page({
  data: {
    latitude: 35.86166,
    longitude: 104.195397,
    scale: 4,
    markers: [],
    countries: [],
    countryText: '',
    provinces: [],
    provinceText: '',
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    this.bootstrap()
  },

  onReady() {
    this.mapCtx = wx.createMapContext('footprintMap', this)
  },

  async bootstrap() {
    const app = getApp()
    try {
      await app.ensureLogin()
      await this.centerOnUserLocation()
      await this.loadMarkers()
      this.moveMapToUserLocation()
    } catch (error) {
      wx.showToast({ title: error.message || '加载失败', icon: 'none' })
    }
  },

  centerOnUserLocation() {
    return new Promise((resolve) => {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          this.setData({
            latitude: res.latitude,
            longitude: res.longitude,
            scale: 14,
          })
          resolve(true)
        },
        fail: () => resolve(false),
      })
    })
  },

  moveMapToUserLocation() {
    if (!this.mapCtx) return
    this.mapCtx.moveToLocation({
      fail: () => {},
    })
  },

  fitAllFootprints() {
    const { markers } = this.data
    if (!markers.length) {
      wx.showToast({ title: '还没有足迹', icon: 'none' })
      return
    }
    if (!this.mapCtx) {
      this.mapCtx = wx.createMapContext('footprintMap', this)
    }
    const points = markers.map((item) => ({
      latitude: item.latitude,
      longitude: item.longitude,
    }))
    this.mapCtx.includePoints({
      points,
      padding: [72, 48, 220, 48],
      fail: () => {
        wx.showToast({ title: '无法调整地图视野', icon: 'none' })
      },
    })
  },

  markerCalloutLabel(item) {
    const country = effectiveCountryFromMarker(item)
    const place =
      country && country !== '中国' ? `${item.name}（${country}）` : item.name
    return `${place} · ${item.checkinCount}次`
  },

  async loadMarkers() {
    const data = await api.getMapMarkers()
    const markers = (data.markers || []).map((item, index) => ({
      id: index + 1,
      latitude: item.lat,
      longitude: item.lng,
      title: item.name,
      width: 32,
      height: 32,
      callout: {
        content: this.markerCalloutLabel(item),
        display: 'BYCLICK',
        padding: 8,
        borderRadius: 8,
      },
      _raw: item,
    }))

    const rawMarkers = data.markers || []
    let countries = data.countries || []
    if (!countries.length && rawMarkers.length) {
      countries = collectCountriesFromMarkers(rawMarkers)
    }
    const provinces = data.provinces || []

    this.setData({
      markers,
      countries,
      countryText: countries.join('、'),
      provinces,
      provinceText: provinces.join('、'),
    })
  },

  onMarkerTap(e) {
    const marker = this.data.markers.find((item) => item.id === e.markerId)
    if (!marker) return
    wx.navigateTo({
      url: `/pages/search/search?city=${encodeURIComponent(marker._raw.city || marker._raw.name)}`,
    })
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  goCheckin() {
    wx.navigateTo({ url: '/pages/checkin/checkin' })
  },
})
