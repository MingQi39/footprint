const config = require('./config')

App({
  globalData: {
    user: null,
  },

  onLaunch() {
    const token = wx.getStorageSync('token')
    if (token) {
      this.globalData.user = wx.getStorageSync('user')
    }
  },

  ensureLogin() {
    const token = wx.getStorageSync('token')
    if (token) {
      return Promise.resolve(token)
    }
    return this.login()
  },

  login() {
    if (config.devMode) {
      return this.devLogin()
    }
    return new Promise((resolve, reject) => {
      wx.login({
        success: ({ code }) => {
          if (!code) {
            reject(new Error('微信登录失败'))
            return
          }
          const { post } = require('./utils/request')
          post('/auth/wx-login', { code })
            .then((res) => {
              wx.setStorageSync('token', res.token)
              wx.setStorageSync('user', res.user)
              this.globalData.user = res.user
              resolve(res.token)
            })
            .catch(reject)
        },
        fail: reject,
      })
    })
  },

  devLogin() {
    const { post } = require('./utils/request')
    return post('/auth/dev-login', { nickname: '足迹用户' }).then((res) => {
      wx.setStorageSync('token', res.token)
      wx.setStorageSync('user', res.user)
      this.globalData.user = res.user
      return res.token
    })
  },
})
