const { get, post, del, uploadFile } = require('./request')

module.exports = {
  devLogin: (data) => post('/auth/dev-login', data),
  wxLogin: (data) => post('/auth/wx-login', data),
  getMe: () => get('/auth/me'),
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
    const presign = await post('/upload/presign', {
      filename: 'photo.jpg',
      contentType: 'image/jpeg',
    })
    return uploadFile(presign, filePath)
  },
}
