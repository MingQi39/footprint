const { get, post, patch, del, uploadFile } = require('./request')

module.exports = {
  devLogin: (data) => post('/auth/dev-login', data),
  wxLogin: (data) => post('/auth/wx-login', data),
  getMe: () => get('/auth/me'),
  updateProfile: (data) => patch('/auth/profile', data),
  searchLocations: (keyword, region = '全国') =>
    get('/locations/search', { keyword, region }),
  reverseLocation: (lat, lng) => get('/locations/reverse', { lat, lng }),
  createCheckin: (data) => post('/checkins', data),
  getCheckins: (params) => get('/checkins', params),
  getCalendar: (year, month) => get('/checkins/calendar', { year, month }),
  getCheckinDetail: (id) => get(`/checkins/${id}`),
  deleteCheckin: (id) => del(`/checkins/${id}`),
  getMapMarkers: () => get('/map/markers'),
  getStats: () => get('/stats/summary'),
  presignUpload: (filename, contentType = 'image/jpeg') =>
    post('/upload/presign', { filename, contentType }),
  uploadPhoto: async (filePath) => {
    const ext = filePath.match(/\.(\w+)$/)?.[1]?.toLowerCase() || 'jpg'
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg'
    const presign = await post('/upload/presign', {
      filename: `photo.${ext}`,
      contentType,
    })
    return uploadFile(presign, filePath)
  },
}
