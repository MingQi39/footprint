const api = require('../../utils/api')
const { formatDateTime, formatPlaceMeta } = require('../../utils/format')

Page({
  data: {
    detail: null,
  },

  onLoad(options) {
    this.id = options.id
    this.loadDetail()
  },

  async loadDetail() {
    wx.showLoading({ title: '加载中' })
    try {
      const app = getApp()
      await app.ensureLogin()
      const detail = await api.getCheckinDetail(this.id)
      this.setData({
        detail: {
          ...detail,
          checkinAtText: formatDateTime(detail.checkinAt),
          placeMeta: formatPlaceMeta(detail),
        },
      })
    } catch (error) {
      wx.showToast({ title: error.message || '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  previewPhoto(e) {
    const current = e.currentTarget.dataset.url
    const urls = (this.data.detail.photos || []).map((item) => item.url)
    wx.previewImage({ current, urls })
  },

  removeRecord() {
    wx.showModal({
      title: '删除记录',
      content: '确定删除这条足迹吗？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await api.deleteCheckin(this.id)
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 500)
        } catch (error) {
          wx.showToast({ title: error.message || '删除失败', icon: 'none' })
        }
      },
    })
  },
})
