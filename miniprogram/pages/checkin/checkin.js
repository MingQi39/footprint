const api = require('../../utils/api')
const {
  formatPlaceMeta,
  shouldShowAddress,
  splitImportNoteTag,
  mergeImportNoteTag,
} = require('../../utils/format')

function pad2(n) {
  return String(n).padStart(2, '0')
}

function isRemotePhoto(path) {
  return /^https?:\/\//.test(path)
}

Page({
  data: {
    location: null,
    note: '',
    photos: [],
    checkinDate: '',
    checkinTime: '',
    submitting: false,
    isEdit: false,
    showAddress: false,
  },

  onLoad(options) {
    if (options.id) {
      this.editId = options.id
      this.setData({ isEdit: true })
      wx.setNavigationBarTitle({ title: '编辑足迹' })
      this.loadForEdit(options.id, options.location)
      return
    }

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

  async loadForEdit(id, locationParam) {
    wx.showLoading({ title: '加载中' })
    try {
      const app = getApp()
      await app.ensureLogin()
      const detail = await api.getCheckinDetail(id)
      const dt = new Date(detail.checkinAt)
      let location = {
        name: detail.name,
        address: detail.address,
        lat: Number(detail.lat),
        lng: Number(detail.lng),
        country: detail.country || '',
        province: detail.province,
        city: detail.city,
        district: detail.district,
        placeMeta: formatPlaceMeta(detail),
      }
      if (locationParam) {
        try {
          location = JSON.parse(decodeURIComponent(locationParam))
          location.placeMeta = formatPlaceMeta(location)
        } catch (_error) {
          wx.showToast({ title: '地点数据无效', icon: 'none' })
        }
      }
      const { tag, text } = splitImportNoteTag(detail.note)
      this.importNoteTag = tag
      this.setData({
        location,
        showAddress: shouldShowAddress(location.name, location.address),
        note: text,
        photos: (detail.photos || []).map((item) => item.url),
        checkinDate: `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`,
        checkinTime: `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`,
      })
    } catch (error) {
      wx.showToast({ title: error.message || '加载失败', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 500)
    } finally {
      wx.hideLoading()
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
    const suffix = this.editId ? `?editId=${this.editId}` : ''
    wx.navigateTo({ url: `/pages/search/search${suffix}` })
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
        if (isRemotePhoto(filePath)) {
          photoUrls.push(filePath)
        } else {
          photoUrls.push(await api.uploadPhoto(filePath))
        }
      }

      const checkinAt = new Date(`${this.data.checkinDate}T${this.data.checkinTime}:00`).toISOString()
      const { location } = this.data
      const payload = {
        name: location.name,
        address: location.address,
        lat: location.lat,
        lng: location.lng,
        country: location.country || '',
        province: location.province,
        city: location.city,
        district: location.district,
        checkinAt,
        note: mergeImportNoteTag(this.importNoteTag, this.data.note),
        photoUrls,
      }

      if (this.editId) {
        await api.updateCheckin(this.editId, payload)
      } else {
        await api.createCheckin(payload)
      }

      wx.hideLoading()
      wx.showToast({
        title: this.editId ? '已保存' : '打卡成功',
        icon: 'success',
      })
      setTimeout(() => {
        if (this.editId) {
          wx.navigateBack()
        } else {
          wx.switchTab({ url: '/pages/timeline/timeline' })
        }
      }, 500)
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: error.message || '提交失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },
})
