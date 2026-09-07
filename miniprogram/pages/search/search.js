const api = require('../../utils/api')

Page({
  data: {
    keyword: '',
    list: [],
    loading: false,
  },

  onLoad(options) {
    if (options.city) {
      this.setData({ keyword: decodeURIComponent(options.city) })
      this.onSearch()
    }
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  async onSearch() {
    if (!this.data.keyword.trim()) {
      wx.showToast({ title: '请输入关键词', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    try {
      const app = getApp()
      await app.ensureLogin()
      const data = await api.searchLocations(this.data.keyword)
      this.setData({ list: data.list || [] })
    } catch (error) {
      wx.showToast({ title: error.message || '搜索失败', icon: 'none' })
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

  useCurrentLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: async (res) => {
        try {
          const app = getApp()
          await app.ensureLogin()
          const location = await api.reverseLocation(res.latitude, res.longitude)
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
