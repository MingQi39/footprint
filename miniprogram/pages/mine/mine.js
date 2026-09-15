const api = require('../../utils/api')

function syncUser(user) {
  const app = getApp()
  wx.setStorageSync('user', user)
  app.globalData.user = user
  return user
}

Page({
  data: {
    user: null,
    nickname: '',
    avatarPreview: '',
    loading: false,
    saving: false,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 })
    }
    this.loadUser()
  },

  async loadUser() {
    this.setData({ loading: true })
    try {
      const app = getApp()
      await app.ensureLogin()
      const user = await api.getMe()
      syncUser(user)
      this.setData({
        user,
        nickname: user?.nickname || '',
        avatarPreview: '',
      })
    } catch (_error) {
      const user = wx.getStorageSync('user')
      this.setData({
        user: user || null,
        nickname: user?.nickname || '',
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  async onChooseAvatar(e) {
    const tempPath = e.detail.avatarUrl
    if (!tempPath || this.data.saving) return

    this.setData({ avatarPreview: tempPath, saving: true })
    wx.showLoading({ title: '上传头像' })

    try {
      const app = getApp()
      await app.ensureLogin()
      const avatarUrl = await api.uploadPhoto(tempPath)
      const user = await api.updateProfile({ avatarUrl })
      syncUser(user)
      this.setData({ user, avatarPreview: '' })
      wx.showToast({ title: '头像已更新', icon: 'success' })
    } catch (error) {
      this.setData({ avatarPreview: '' })
      wx.showToast({ title: error.message || '头像保存失败', icon: 'none' })
    } finally {
      wx.hideLoading()
      this.setData({ saving: false })
    }
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value })
  },

  async onNicknameBlur(e) {
    const nickname = (e.detail.value || '').trim()
    const current = (this.data.user?.nickname || '').trim()

    if (!nickname || nickname === current || this.data.saving) {
      if (!nickname) {
        this.setData({ nickname: current })
      }
      return
    }

    this.setData({ saving: true })
    wx.showLoading({ title: '保存昵称' })

    try {
      const app = getApp()
      await app.ensureLogin()
      const user = await api.updateProfile({ nickname })
      syncUser(user)
      this.setData({ user, nickname: user.nickname || nickname })
      wx.showToast({ title: '昵称已更新', icon: 'success' })
    } catch (error) {
      this.setData({ nickname: current })
      wx.showToast({ title: error.message || '昵称保存失败', icon: 'none' })
    } finally {
      wx.hideLoading()
      this.setData({ saving: false })
    }
  },

  async relogin() {
    const app = getApp()
    try {
      await app.login()
      await this.loadUser()
      wx.showToast({ title: '登录成功', icon: 'success' })
    } catch (error) {
      wx.showToast({ title: error.message || '登录失败', icon: 'none' })
    }
  },

  logout() {
    wx.removeStorageSync('token')
    wx.removeStorageSync('user')
    getApp().globalData.user = null
    this.setData({ user: null, nickname: '', avatarPreview: '' })
    wx.showToast({ title: '已退出', icon: 'none' })
  },

  goCheckin() {
    wx.navigateTo({ url: '/pages/checkin/checkin' })
  },
})
