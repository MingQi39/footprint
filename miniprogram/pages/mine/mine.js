Page({
  data: {
    user: null,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 })
    }
    const user = wx.getStorageSync('user')
    this.setData({ user })
  },

  async relogin() {
    const app = getApp()
    try {
      await app.login()
      this.setData({ user: wx.getStorageSync('user') })
      wx.showToast({ title: '登录成功', icon: 'success' })
    } catch (error) {
      wx.showToast({ title: error.message || '登录失败', icon: 'none' })
    }
  },

  logout() {
    wx.removeStorageSync('token')
    wx.removeStorageSync('user')
    this.setData({ user: null })
    wx.showToast({ title: '已退出', icon: 'none' })
  },

  goCheckin() {
    wx.navigateTo({ url: '/pages/checkin/checkin' })
  },
})
