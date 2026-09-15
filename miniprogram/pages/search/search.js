const api = require('../../utils/api')

Page({
  data: {
    keyword: '',
    list: [],
    loading: false,
    searched: false,
    errorMsg: '',
  },

  onLoad(options) {
    if (options.city) {
      this.setData({ keyword: decodeURIComponent(options.city) })
      this.onSearch()
    }
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value, errorMsg: '' })
  },

  async onSearch() {
    if (!this.data.keyword.trim()) {
      wx.showToast({ title: '请输入关键词', icon: 'none' })
      return
    }

    this.setData({ loading: true, searched: true, errorMsg: '', list: [] })
    try {
      const app = getApp()
      await app.ensureLogin()
      const data = await api.searchLocations(this.data.keyword)
      this.setData({ list: data.list || [] })
    } catch (error) {
      const message = error.message || '搜索失败'
      this.setData({ errorMsg: message, list: [] })
      wx.showToast({ title: message, icon: 'none', duration: 3000 })
    } finally {
      this.setData({ loading: false })
    }
  },

  chooseLocation(e) {
    const item = e.currentTarget.dataset.item
    wx.navigateTo({
      url: `/pages/checkin/checkin?location=${encodeURIComponent(JSON.stringify(item))}`,
    })
  },

  pickOnMap() {
    wx.chooseLocation({
      success: (res) => {
        const location = {
          name: res.name || res.address || '地图选点',
          address: res.address,
          lat: res.latitude,
          lng: res.longitude,
          province: '',
          city: '',
          district: '',
        }
        wx.navigateTo({
          url: `/pages/checkin/checkin?location=${encodeURIComponent(JSON.stringify(location))}`,
        })
      },
      fail: (error) => {
        if (error.errMsg?.includes('cancel')) return
        wx.showToast({ title: '请授权位置或地图选点', icon: 'none' })
      },
    })
  },

  useCurrentLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: async (res) => {
        try {
          const app = getApp()
          await app.ensureLogin()
          const location = await api.reverseLocation(res.latitude, res.longitude)
          if (!location.city && !location.province) {
            wx.showToast({
              title: '未解析到城市，请搜索或地图选点',
              icon: 'none',
              duration: 2500,
            })
          }
          wx.navigateTo({
            url: `/pages/checkin/checkin?location=${encodeURIComponent(JSON.stringify(location))}`,
          })
        } catch (error) {
          wx.showToast({ title: error.message || '定位失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '请授权位置信息', icon: 'none' })
      },
    })
  },
})
