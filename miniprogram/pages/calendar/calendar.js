const api = require('../../utils/api')
const { formatPlaceMeta } = require('../../utils/format')

function buildCalendar(year, month, markedDates) {
  const firstDay = new Date(year, month - 1, 1)
  const startWeekday = firstDay.getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []

  for (let i = 0; i < startWeekday; i += 1) {
    cells.push({ empty: true })
  }

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({
      day,
      date,
      marked: markedDates.has(date),
      count: markedDates.get(date) || 0,
      isToday: date === todayKey,
    })
  }

  while (cells.length % 7 !== 0) {
    cells.push({ empty: true })
  }

  return cells
}

Page({
  data: {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    cells: [],
    selectedDate: '',
    dayList: [],
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
    this.loadCalendar()
  },

  async loadCalendar() {
    try {
      const app = getApp()
      await app.ensureLogin()
      const data = await api.getCalendar(this.data.year, this.data.month)
      const markedDates = new Map(
        (data.dates || []).map((item) => [item.date, item.count]),
      )
      this.setData({
        cells: buildCalendar(this.data.year, this.data.month, markedDates),
      })
    } catch (error) {
      wx.showToast({ title: error.message || '加载失败', icon: 'none' })
    }
  },

  changeMonth(e) {
    const delta = Number(e.currentTarget.dataset.delta)
    let { year, month } = this.data
    month += delta
    if (month < 1) {
      month = 12
      year -= 1
    } else if (month > 12) {
      month = 1
      year += 1
    }
    this.setData({ year, month, selectedDate: '', dayList: [] })
    this.loadCalendar()
  },

  async selectDay(e) {
    const date = e.currentTarget.dataset.date
    if (!date) return

    this.setData({ selectedDate: date })
    try {
      const data = await api.getCheckins({ date })
      const dayList = (data.list || []).map((item) => ({
        ...item,
        placeMeta: formatPlaceMeta(item),
      }))
      this.setData({ dayList })
    } catch (error) {
      wx.showToast({ title: error.message || '加载失败', icon: 'none' })
    }
  },

  openDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },
})
