const fs = require('fs')
const path = require('path')
const { manifest } = require('../lib/pwa-manifest')

function readPngSize(filePath) {
  const buffer = fs.readFileSync(filePath)
  if (buffer.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error(`Not a PNG: ${filePath}`)
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  }
}

describe('PWA manifest icons', () => {
  it('declares square 192 and 512 icons for installability', () => {
    expect(manifest.name).toBe('TNS Track')
    expect(manifest.start_url).toBe('/operacion')
    expect(manifest.display).toBe('standalone')

    const icon192 = manifest.icons.find((icon) => icon.sizes === '192x192')
    const icon512 = manifest.icons.find((icon) => icon.sizes === '512x512')

    expect(icon192).toBeDefined()
    expect(icon512).toBeDefined()
    expect(icon192.type).toBe('image/png')
    expect(icon512.type).toBe('image/png')
    expect(icon192.purpose).toContain('any')
    expect(icon512.purpose).toContain('any')

    for (const icon of [icon192, icon512]) {
      const filePath = path.join(__dirname, '..', 'public', icon.src)
      expect(fs.existsSync(filePath)).toBe(true)
      const { width, height } = readPngSize(filePath)
      expect(width).toBe(height)
      expect(width).toBe(Number(icon.sizes.split('x')[0]))
    }
  })
})
