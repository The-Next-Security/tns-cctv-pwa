const fs = require('fs')
const path = require('path')

describe('Popover mobile constraints', () => {
  it('adds viewport-safe width and collision padding defaults to the shared popover content', () => {
    const sourcePath = path.join(__dirname, '..', 'components', 'ui', 'popover.tsx')
    const source = fs.readFileSync(sourcePath, 'utf8')

    expect(source).toContain('collisionPadding = 16')
    expect(source).toContain('max-w-[calc(100vw-2rem)]')
    expect(source).toContain('overflow-x-hidden')
  })
})
