const api = require('../../utils/api')

Page({
  data: {
    latitude: 35.86166,
    longitude: 104.195397,
    scale: 4,
    markers: [],
    provinces: [],
    provinceText: '',
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    this.bootstrap()
  },

  async bootstrap() {
    const app = getApp()
    try {
      await app.ensureLogin()
      await this.loadMarkers()
    } catch (error) {
      wx.showToast({ title: error.message || '加载失败', icon: 'none' })
    }
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
        content: `${item.name} · ${item.checkinCount}次`,
        display: 'BYCLICK',
        padding: 8,
        borderRadius: 8,
      },
      _raw: item,
    }))

    this.setData({
      markers,
      provinces: data.provinces || [],
      provinceText: (data.provinces || []).join('、'),
    })

    if (markers.length) {
      this.setData({
        latitude: markers[0].latitude,
        longitude: markers[0].longitude,
        scale: 8,
      })
    }
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
