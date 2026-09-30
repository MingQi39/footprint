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
    if (options.editId) {
      this.editId = options.editId
    }
    if (options.city) {
      this.setData({ keyword: decodeURIComponent(options.city) })
      this.onSearch()
    }
  },

  checkinPageUrl(location) {
    const encoded = encodeURIComponent(JSON.stringify(location))
    if (this.editId) {
      return `/pages/checkin/checkin?id=${this.editId}&location=${encoded}`
    }
    return `/pages/checkin/checkin?location=${encoded}`
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
    wx.navigateTo({ url: this.checkinPageUrl(item) })
  },

  pickOnMap() {
    wx.chooseLocation({
      success: async (res) => {
        wx.showLoading({ title: '解析地点…' })
        try {
          const app = getApp()
          await app.ensureLogin()
          let location = await api.reverseLocation(res.latitude, res.longitude)
          if (!location) {
            location = {
              name: res.name || res.address || '地图选点',
              address: res.address,
              lat: res.latitude,
              lng: res.longitude,
              country: '',
              province: '',
              city: '',
              district: '',
            }
          } else if (res.name && res.name !== location.name) {
            location = { ...location, name: res.name }
          }
          wx.navigateTo({ url: this.checkinPageUrl(location) })
        } catch (error) {
          wx.showToast({ title: error.message || '解析失败', icon: 'none' })
        } finally {
          wx.hideLoading()
        }
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
          wx.navigateTo({ url: this.checkinPageUrl(location) })
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
