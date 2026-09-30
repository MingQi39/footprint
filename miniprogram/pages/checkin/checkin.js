const api = require('../../utils/api')
const { formatPlaceMeta } = require('../../utils/format')

function formatDateTimeLocal(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

Page({
  data: {
    location: null,
    note: '',
    photos: [],
    checkinDate: '',
    checkinTime: '',
    submitting: false,
  },

  onLoad(options) {
    const now = new Date()
    this.setData({
      checkinDate: now.toISOString().slice(0, 10),
      checkinTime: now.toTimeString().slice(0, 5),
    })

    if (options.location) {
      try {
        const location = JSON.parse(decodeURIComponent(options.location))
        location.placeMeta = formatPlaceMeta(location)
        this.setData({ location })
      } catch (_error) {
        wx.showToast({ title: '地点数据无效', icon: 'none' })
      }
    }
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  onDateChange(e) {
    this.setData({ checkinDate: e.detail.value })
  },

  onTimeChange(e) {
    this.setData({ checkinTime: e.detail.value })
  },

  choosePhotos() {
    wx.chooseMedia({
      count: 9 - this.data.photos.length,
      mediaType: ['image'],
      success: (res) => {
        const photos = this.data.photos.concat(
          res.tempFiles.map((item) => item.tempFilePath),
        )
        this.setData({ photos })
      },
    })
  },

  removePhoto(e) {
    const index = e.currentTarget.dataset.index
    const photos = [...this.data.photos]
    photos.splice(index, 1)
    this.setData({ photos })
  },

  goPickLocation() {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  async submit() {
    if (!this.data.location) {
      wx.showToast({ title: '请先选择地点', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '提交中' })

    try {
      const app = getApp()
      await app.ensureLogin()

      const photoUrls = []
      for (const filePath of this.data.photos) {
        const url = await api.uploadPhoto(filePath)
        photoUrls.push(url)
      }

      const checkinAt = new Date(`${this.data.checkinDate}T${this.data.checkinTime}:00`).toISOString()
      const { location } = this.data

      await api.createCheckin({
        name: location.name,
        address: location.address,
        lat: location.lat,
        lng: location.lng,
        country: location.country || '',
        province: location.province,
        city: location.city,
        district: location.district,
        checkinAt,
        note: this.data.note,
        photoUrls,
      })

      wx.hideLoading()
      wx.showToast({ title: '打卡成功', icon: 'success' })
      setTimeout(() => {
        wx.switchTab({ url: '/pages/timeline/timeline' })
      }, 500)
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: error.message || '提交失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },
})
