function pad(n) {
  return String(n).padStart(2, '0')
}

function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateTime(value) {
  const date = toDate(value)
  if (!date) return value ? String(value) : ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDate(value) {
  const date = toDate(value)
  if (!date) return value ? String(value) : ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatPlaceMeta(place) {
  if (!place) return ''
  const country = (place.country || '').trim()
  const isChina = !country || country === '中国'
  if (!isChina) {
    return [country, place.city].filter(Boolean).join(' · ')
  }
  return [place.province, place.city, place.district].filter(Boolean).join(' ')
}

module.exports = {
  formatDateTime,
  formatDate,
  formatPlaceMeta,
}
