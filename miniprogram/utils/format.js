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

function shouldShowAddress(name, address) {
  const n = (name || '').trim()
  const a = (address || '').trim()
  if (!a) return false
  if (n === a) return false
  const parts = n.split(/[·｜|]/).map((s) => s.trim()).filter(Boolean)
  if (parts.some((p) => p === a)) return false
  if (parts.length >= 2) {
    const tail = parts.slice(1).join(' ')
    if (tail === a || tail.includes(a) || a.includes(tail)) return false
  }
  return true
}

const IMPORT_NOTE_TAG_RE = /^#chenze-import:/

function splitImportNoteTag(note) {
  if (!note || !String(note).trim()) {
    return { tag: '', text: '' }
  }
  const raw = String(note)
  const lines = raw.split('\n')
  const first = (lines[0] || '').trim()
  if (IMPORT_NOTE_TAG_RE.test(first)) {
    return { tag: first, text: lines.slice(1).join('\n') }
  }
  return { tag: '', text: raw }
}

function mergeImportNoteTag(tag, text) {
  const body = text ?? ''
  if (!tag) return body.trim() ? body : ''
  if (!body.trim()) return tag
  return `${tag}\n${body}`
}

function formatNoteForDisplay(note) {
  if (!note || !String(note).trim()) {
    return { body: '', meta: [], hasContent: false }
  }

  const lines = String(note)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const visible = lines.filter((line) => !IMPORT_NOTE_TAG_RE.test(line))

  const meta = []
  const bodyLines = []
  for (const line of visible) {
    const matched = line.match(/^(时间|同行|标签|来源)[：:](.+)$/)
    if (matched) {
      meta.push({ label: matched[1], value: matched[2].trim() })
    } else {
      bodyLines.push(line)
    }
  }

  return {
    body: bodyLines.join('\n'),
    meta,
    hasContent: bodyLines.length > 0 || meta.length > 0,
  }
}

module.exports = {
  formatDateTime,
  formatDate,
  formatPlaceMeta,
  shouldShowAddress,
  splitImportNoteTag,
  mergeImportNoteTag,
  formatNoteForDisplay,
}
