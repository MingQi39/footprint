const api = require('../../utils/api')
const { formatDateTime } = require('../../utils/format')

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
      this.setData({
        stats: {
          ...stats,
          firstCheckinAtText: formatDateTime(stats.firstCheckinAt),
          latestCheckinAtText: formatDateTime(stats.latestCheckinAt),
        },
      })
    } catch (error) {
      wx.showToast({ title: error.message || '加载失败', icon: 'none' })
    }
  },
})
