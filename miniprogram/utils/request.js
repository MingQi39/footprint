const config = require('../config')

function request(url, options = {}) {
  const token = wx.getStorageSync('token')
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${config.baseUrl}${url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.header || {}),
      },
      success(res) {
        if (res.statusCode === 401) {
          wx.removeStorageSync('token')
          reject(new Error('未登录或登录已过期'))
          return
        }
        const body = res.data
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (body && body.code === 0) {
            resolve(body.data)
            return
          }
          reject(body || new Error('请求失败'))
          return
        }
        reject(body || new Error('请求失败'))
      },
      fail: reject,
    })
  })
}

function get(url, data) {
  return request(url, { method: 'GET', data })
}

function post(url, data) {
  return request(url, { method: 'POST', data })
}

function del(url) {
  return request(url, { method: 'DELETE' })
}

function uploadFile(presign, filePath) {
  const token = wx.getStorageSync('token')
  const header = token ? { Authorization: `Bearer ${token}` } : {}

  if (presign.method === 'POST' && presign.uploadUrl.includes('/upload/local/')) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: presign.uploadUrl,
        filePath,
        name: 'file',
        header,
        success(res) {
          try {
            const body = JSON.parse(res.data)
            if (body.code === 0) {
              resolve(body.data.fileUrl)
              return
            }
            reject(body)
          } catch (error) {
            reject(error)
          }
        },
        fail: reject,
      })
    })
  }

  return Promise.reject(new Error('当前环境请使用 local 上传模式'))
}

module.exports = {
  request,
  get,
  post,
  del,
  uploadFile,
}
