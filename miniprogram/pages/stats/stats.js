const api = require('../../utils/api')

Page({
  data: {
    stats: null,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
    this.loadStats()
  },

  async loadStats() {
    try {
      const app = getApp()
      await app.ensureLogin()
      const stats = await api.getStats()
      this.setData({ stats })
    } catch (error) {
      wx.showToast({ title: error.message || '加载失败', icon: 'none' })
    }
  },
})
