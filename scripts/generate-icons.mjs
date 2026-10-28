// Generates the PWA icons into public/icons (no dependencies).
// Usage: node scripts/generate-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BG = [79, 70, 229] // indigo-600
const FG = [255, 255, 255]

function crc32(buf) {
  let c
  let crc = ~0
  for (const byte of buf) {
    c = (crc ^ byte) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return ~crc >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/** Solid background with a check mark; `scale` shrinks the mark for maskable safe zones. */
function icon(size, scale, rounded) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  const s = size * scale
  const o = (size - s) / 2
  const p = (x, y) => [o + x * s, o + y * s]
  const [a1x, a1y] = p(0.27, 0.52)
  const [bx, by] = p(0.44, 0.69)
  const [cx, cy] = p(0.74, 0.33)
  const half = s * 0.065
  const radius = size * 0.22

  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x++) {
      const d = Math.min(
        distToSegment(x + 0.5, y + 0.5, a1x, a1y, bx, by),
        distToSegment(x + 0.5, y + 0.5, bx, by, cx, cy),
      )
      const ink = Math.max(0, Math.min(1, half + 0.5 - d)) // anti-aliased edge
      let alpha = 255
      if (rounded) {
        const qx = Math.max(Math.abs(x + 0.5 - size / 2) - (size / 2 - radius), 0)
        const qy = Math.max(Math.abs(y + 0.5 - size / 2) - (size / 2 - radius), 0)
        alpha = Math.round(255 * Math.max(0, Math.min(1, radius + 0.5 - Math.hypot(qx, qy))))
      }
      const i = row + 1 + x * 4
      for (let k = 0; k < 3; k++) raw[i + k] = Math.round(BG[k] + (FG[k] - BG[k]) * ink)
      raw[i + 3] = alpha
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon-192.png', icon(192, 1, true))
writeFileSync('public/icons/icon-512.png', icon(512, 1, true))
// Maskable icons get cropped by the OS: full-bleed background, mark kept in the safe zone.
writeFileSync('public/icons/icon-maskable-512.png', icon(512, 0.7, false))
// iOS applies its own rounding, so ship a full-bleed square.
writeFileSync('public/icons/apple-touch-icon.png', icon(180, 0.85, false))
console.log('Icons written to public/icons')
