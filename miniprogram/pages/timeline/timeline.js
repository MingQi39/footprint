const api = require('../../utils/api')
const { formatDateTime } = require('../../utils/format')

const PAGE_SIZE = 20

function mapListItem(item) {
  return {
    ...item,
    checkinAtText: formatDateTime(item.checkinAt),
  }
}

Page({
  data: {
    list: [],
    loading: false,
    loadingMore: false,
    hasMore: true,
    page: 1,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    this.loadData(true)
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading && !this.data.loadingMore) {
      this.loadData(false)
    }
  },

  async loadData(reset) {
    if (reset) {
      this.setData({ loading: true, page: 1, hasMore: true })
    } else {
      this.setData({ loadingMore: true })
    }

    try {
      const app = getApp()
      await app.ensureLogin()
      const page = reset ? 1 : this.data.page + 1
      const data = await api.getCheckins({ page, pageSize: PAGE_SIZE })
      const incoming = (data.list || []).map(mapListItem)
      const list = reset ? incoming : this.data.list.concat(incoming)
      this.setData({
        list,
        page,
        hasMore: list.length < (data.total || 0),
      })
    } catch (error) {
      wx.showToast({ title: error.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false, loadingMore: false })
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
