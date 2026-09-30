function isInChinaBBox(lat, lng) {
  return lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135
}

function inferCountryFromCoordinates(lat, lng) {
  if (isInChinaBBox(lat, lng)) return '中国'
  if (lat >= 33 && lat <= 39.5 && lng >= 124 && lng <= 132.5) return '韩国'
  if (lat >= 24 && lat <= 46.5 && lng >= 122 && lng <= 154) return '日本'
  return ''
}

function effectiveCountryFromMarker(marker) {
  const stored = (marker.country || '').trim()
  const lat = Number(marker.lat)
  const lng = Number(marker.lng)
  if (stored && stored !== '中国') return stored
  const byCoords = inferCountryFromCoordinates(lat, lng)
  if (byCoords && byCoords !== '中国') return byCoords
  if (stored === '中国' && marker.province && isInChinaBBox(lat, lng)) return '中国'
  return byCoords || stored || '中国'
}

function collectCountriesFromMarkers(markers) {
  const set = new Set()
  for (const item of markers || []) {
    const c = effectiveCountryFromMarker(item)
    if (c) set.add(c)
  }
  return [...set]
}

module.exports = {
  collectCountriesFromMarkers,
  effectiveCountryFromMarker,
}
