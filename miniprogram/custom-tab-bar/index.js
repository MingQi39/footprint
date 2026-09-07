Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/index/index', text: '地图', icon: '🗺️' },
      { pagePath: '/pages/timeline/timeline', text: '足迹', icon: '📍' },
      { pagePath: '/pages/calendar/calendar', text: '日历', icon: '📅' },
      { pagePath: '/pages/stats/stats', text: '统计', icon: '📊' },
      { pagePath: '/pages/mine/mine', text: '我的', icon: '👤' },
    ],
  },

  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index
      const item = this.data.list[index]
      wx.switchTab({ url: item.pagePath })
      this.setData({ selected: index })
    },
  },
})
