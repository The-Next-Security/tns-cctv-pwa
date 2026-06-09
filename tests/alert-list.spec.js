const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

function loadAlertListModule() {
  const filename = path.resolve(__dirname, '../lib/alert-list.ts')
  const source = fs.readFileSync(filename, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText

  const module = { exports: {} }
  const execute = new Function('module', 'exports', 'require', compiled)
  execute(module, module.exports, require)
  return module.exports
}

const { sortAlertsByMostRecent } = loadAlertListModule()

describe('sortAlertsByMostRecent', () => {
  it('ordena las alertas desde la mas reciente a la mas antigua usando timestamp', () => {
    const alerts = [
      { id: 1, timestamp: '2026-06-09T10:00:00.000Z' },
      { id: 2, timestamp: '2026-06-09T12:00:00.000Z' },
      { id: 3, timestamp: '2026-06-09T11:00:00.000Z' },
    ]

    const result = sortAlertsByMostRecent(alerts)

    expect(result.map(alert => alert.id)).toEqual([2, 3, 1])
  })

  it('no muta el arreglo original', () => {
    const alerts = [
      { id: 1, timestamp: '2026-06-09T10:00:00.000Z' },
      { id: 2, timestamp: '2026-06-09T12:00:00.000Z' },
    ]

    sortAlertsByMostRecent(alerts)

    expect(alerts.map(alert => alert.id)).toEqual([1, 2])
  })

  it('usa created_at como respaldo cuando timestamp no viene informado', () => {
    const alerts = [
      { id: 1, timestamp: '', created_at: '2026-06-09T10:00:00.000Z' },
      { id: 2, timestamp: '', created_at: '2026-06-09T12:00:00.000Z' },
    ]

    const result = sortAlertsByMostRecent(alerts)

    expect(result.map(alert => alert.id)).toEqual([2, 1])
  })
})
