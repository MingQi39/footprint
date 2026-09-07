const api = require('../../utils/api')

Page({
  data: {
    list: [],
    loading: false,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    this.loadData()
  },

  async loadData() {
    this.setData({ loading: true })
    try {
      const app = getApp()
      await app.ensureLogin()
      const data = await api.getCheckins({ page: 1, pageSize: 50 })
      this.setData({ list: data.list || [] })
    } catch (error) {
      wx.showToast({ title: error.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  openDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  goCheckin() {
    wx.navigateTo({ url: '/pages/checkin/checkin' })
  },
})
