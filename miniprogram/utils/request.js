const config = require('../config')

function toRequestError(payload, fallback) {
  if (payload instanceof Error) return payload
  if (payload && typeof payload === 'object') {
    const message = payload.message || payload.errMsg
    if (message) return new Error(message)
  }
  return new Error(fallback)
}

function request(url, options = {}) {
  const token = wx.getStorageSync('token')
  const method = options.method || 'GET'
  const hasJsonBody =
    options.data !== undefined &&
    options.data !== null &&
    method !== 'GET'

  const header = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.header || {}),
  }
  if (hasJsonBody) {
    header['Content-Type'] = 'application/json'
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${config.baseUrl}${url}`,
      method,
      data: options.data,
      header,
      success(res) {
        if (res.statusCode === 401 && !options._retried) {
          wx.removeStorageSync('token')
          const app = getApp()
          app
            .login()
            .then(() => request(url, { ...options, _retried: true }))
            .then(resolve)
            .catch(reject)
          return
        }
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
          reject(toRequestError(body, '请求失败'))
          return
        }
        reject(toRequestError(body, '请求失败'))
      },
      fail(err) {
        reject(toRequestError(err, '网络请求失败'))
      },
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
  return request(url, { method: 'DELETE', data: {} })
}

function patch(url, data) {
  return request(url, { method: 'PATCH', data })
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

  if (presign.method === 'POST' && presign.headers) {
    const formData = {
      key: presign.headers.key,
      policy: presign.headers.policy,
      OSSAccessKeyId: presign.headers.OSSAccessKeyId,
      Signature: presign.headers.Signature,
      success_action_status: presign.headers.success_action_status || '200',
    }
    if (presign.headers['Content-Type']) {
      formData['Content-Type'] = presign.headers['Content-Type']
    }

    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: presign.uploadUrl,
        filePath,
        name: 'file',
        formData,
        success(res) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(presign.fileUrl)
            return
          }
          reject(new Error(`OSS 上传失败 (${res.statusCode})`))
        },
        fail: reject,
      })
    })
  }

  return Promise.reject(new Error('不支持的上传模式'))
}

module.exports = {
  request,
  get,
  post,
  patch,
  del,
  uploadFile,
}
