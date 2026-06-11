#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const OUT_DIR = path.join(__dirname, '..', 'public', 'brand', 'pwa')
const BG = { r: 18, g: 18, b: 18, a: 255 }
const PANEL = { r: 9, g: 14, b: 30, a: 255 }
const ACCENT = { r: 249, g: 115, b: 22, a: 255 }
const ACCENT_SOFT = { r: 249, g: 115, b: 22, a: 72 }
const WHITE = { r: 248, g: 250, b: 252, a: 255 }

const GLYPHS = {
  T: [
    '11111',
    '00100',
    '00100',
    '00100',
    '00100',
    '00100',
    '00100',
  ],
  N: [
    '10001',
    '11001',
    '10101',
    '10011',
    '10001',
    '10001',
    '10001',
  ],
  S: [
    '01111',
    '10000',
    '10000',
    '01110',
    '00001',
    '00001',
    '11110',
  ],
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function rgba(color) {
  return [color.r, color.g, color.b, color.a]
}

function setPixel(buffer, width, height, x, y, color) {
  if (x < 0 || y < 0 || x >= width || y >= height) return
  const index = (y * width + x) * 4
  buffer[index] = color.r
  buffer[index + 1] = color.g
  buffer[index + 2] = color.b
  buffer[index + 3] = color.a
}

function blendPixel(buffer, width, height, x, y, color) {
  if (x < 0 || y < 0 || x >= width || y >= height) return
  const index = (y * width + x) * 4
  const srcA = color.a / 255
  const dstA = buffer[index + 3] / 255
  const outA = srcA + dstA * (1 - srcA)
  if (outA === 0) return
  buffer[index] = Math.round((color.r * srcA + buffer[index] * dstA * (1 - srcA)) / outA)
  buffer[index + 1] = Math.round((color.g * srcA + buffer[index + 1] * dstA * (1 - srcA)) / outA)
  buffer[index + 2] = Math.round((color.b * srcA + buffer[index + 2] * dstA * (1 - srcA)) / outA)
  buffer[index + 3] = Math.round(outA * 255)
}

function fill(buffer, width, height, color) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      setPixel(buffer, width, height, x, y, color)
    }
  }
}

function fillRect(buffer, width, height, x, y, w, h, color) {
  const x1 = Math.max(0, Math.floor(x))
  const y1 = Math.max(0, Math.floor(y))
  const x2 = Math.min(width, Math.ceil(x + w))
  const y2 = Math.min(height, Math.ceil(y + h))
  for (let yy = y1; yy < y2; yy += 1) {
    for (let xx = x1; xx < x2; xx += 1) {
      setPixel(buffer, width, height, xx, yy, color)
    }
  }
}

function fillCircle(buffer, width, height, cx, cy, radius, color) {
  const r2 = radius * radius
  const x1 = Math.max(0, Math.floor(cx - radius))
  const y1 = Math.max(0, Math.floor(cy - radius))
  const x2 = Math.min(width - 1, Math.ceil(cx + radius))
  const y2 = Math.min(height - 1, Math.ceil(cy + radius))
  for (let y = y1; y <= y2; y += 1) {
    for (let x = x1; x <= x2; x += 1) {
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      if (dx * dx + dy * dy <= r2) {
        blendPixel(buffer, width, height, x, y, color)
      }
    }
  }
}

function drawRoundedRect(buffer, width, height, x, y, w, h, radius, color) {
  fillRect(buffer, width, height, x + radius, y, w - radius * 2, h, color)
  fillRect(buffer, width, height, x, y + radius, radius, h - radius * 2, color)
  fillRect(buffer, width, height, x + w - radius, y + radius, radius, h - radius * 2, color)

  for (let yy = 0; yy < radius; yy += 1) {
    for (let xx = 0; xx < radius; xx += 1) {
      const dx = xx - radius + 0.5
      const dy = yy - radius + 0.5
      if (dx * dx + dy * dy <= radius * radius) {
        setPixel(buffer, width, height, x + xx, y + yy, color)
        setPixel(buffer, width, height, x + w - 1 - xx, y + yy, color)
        setPixel(buffer, width, height, x + xx, y + h - 1 - yy, color)
        setPixel(buffer, width, height, x + w - 1 - xx, y + h - 1 - yy, color)
      }
    }
  }
}

function drawRing(buffer, width, height, cx, cy, outerRadius, innerRadius, color) {
  const outer = outerRadius * outerRadius
  const inner = innerRadius * innerRadius
  const x1 = Math.max(0, Math.floor(cx - outerRadius))
  const y1 = Math.max(0, Math.floor(cy - outerRadius))
  const x2 = Math.min(width - 1, Math.ceil(cx + outerRadius))
  const y2 = Math.min(height - 1, Math.ceil(cy + outerRadius))
  for (let y = y1; y <= y2; y += 1) {
    for (let x = x1; x <= x2; x += 1) {
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      const d2 = dx * dx + dy * dy
      if (d2 <= outer && d2 >= inner) {
        blendPixel(buffer, width, height, x, y, color)
      }
    }
  }
}

function drawGlyph(buffer, width, height, glyph, startX, startY, scale, color) {
  glyph.forEach((row, rowIndex) => {
    for (let col = 0; col < row.length; col += 1) {
      if (row[col] === '1') {
        fillRect(buffer, width, height, startX + col * scale, startY + rowIndex * scale, scale, scale, color)
      }
    }
  })
}

function drawLetter(buffer, width, height, letter, startX, startY, scale, color) {
  const glyph = GLYPHS[letter]
  if (!glyph) throw new Error(`Unsupported glyph: ${letter}`)
  drawGlyph(buffer, width, height, glyph, startX, startY, scale, color)
}

function createIcon(size, { maskable = false } = {}) {
  const buffer = Buffer.alloc(size * size * 4)
  fill(buffer, size, size, BG)

  drawRing(buffer, size, size, size / 2, size / 2, size * 0.42, size * 0.31, ACCENT_SOFT)
  drawRoundedRect(buffer, size, size, size * 0.08, size * 0.08, size * 0.84, size * 0.84, size * 0.1, PANEL)
  drawRing(buffer, size, size, size / 2, size / 2, size * 0.29, size * 0.16, { ...ACCENT, a: 38 })

  const scale = maskable ? Math.max(12, Math.floor(size * 0.7 / 19)) : Math.max(10, Math.floor(size / 19))
  const glyphWidth = 5 * scale
  const glyphHeight = 7 * scale
  const gap = Math.max(4, Math.floor(scale * 0.8))
  const totalWidth = glyphWidth * 3 + gap * 2
  const totalHeight = glyphHeight
  const startX = Math.floor((size - totalWidth) / 2)
  const startY = Math.floor((size - totalHeight) / 2)

  drawLetter(buffer, size, size, 'T', startX, startY, scale, ACCENT)
  drawLetter(buffer, size, size, 'N', startX + glyphWidth + gap, startY, scale, WHITE)
  drawLetter(buffer, size, size, 'S', startX + (glyphWidth + gap) * 2, startY, scale, ACCENT)

  return buffer
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i]
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1)
      crc = (crc >>> 1) ^ (0xedb88320 & mask)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type)
  const lengthBuffer = Buffer.alloc(4)
  lengthBuffer.writeUInt32BE(data.length, 0)
  const crcBuffer = Buffer.alloc(4)
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0)
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer])
}

function encodePng(width, height, rgbaBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    const rawRow = y * (stride + 1)
    raw[rawRow] = 0
    rgbaBuffer.copy(raw, rawRow + 1, y * stride, y * stride + stride)
  }

  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

function writeIcon(fileName, size, options = {}) {
  const outPath = path.join(OUT_DIR, fileName)
  const pixels = createIcon(size, options)
  const png = encodePng(size, size, pixels)
  fs.writeFileSync(outPath, png)
  return outPath
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const files = [
    writeIcon('icon-192.png', 192),
    writeIcon('icon-512.png', 512),
    writeIcon('icon-512-maskable.png', 512, { maskable: true }),
  ]
  console.log(files.join('\n'))
}

if (require.main === module) {
  main()
}
