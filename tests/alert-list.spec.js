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

const { sortAlertsByMostRecent, sortAlerts, ALERT_SORT_OPTIONS, ALERT_SORT_LABELS, isSlaOverdue, SLA_WINDOW_MS } = loadAlertListModule()

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

describe('sortAlerts', () => {
  const baseAlerts = [
    { id: 1, criticality: 'baja',    status: 'pendiente',   timestamp: '2026-06-09T08:00:00.000Z', zone_id: 3 },
    { id: 2, criticality: 'critica', status: 'en_revision', timestamp: '2026-06-09T12:00:00.000Z', zone_id: 1 },
    { id: 3, criticality: 'alta',    status: 'pendiente',   timestamp: '2026-06-09T10:00:00.000Z', zone_id: 2 },
    { id: 4, criticality: 'media',   status: 'resuelta',    timestamp: '2026-06-09T11:00:00.000Z', zone_id: 1 },
  ]

  it('expone una etiqueta por cada opción de ordenamiento', () => {
    expect(ALERT_SORT_OPTIONS).toEqual(['recientes', 'antiguas', 'criticidad', 'sin_atender', 'zona'])
    for (const option of ALERT_SORT_OPTIONS) {
      expect(typeof ALERT_SORT_LABELS[option]).toBe('string')
    }
  })

  it('no muta el arreglo original con ningún criterio', () => {
    for (const option of ALERT_SORT_OPTIONS) {
      sortAlerts(baseAlerts, option)
    }
    expect(baseAlerts.map(alert => alert.id)).toEqual([1, 2, 3, 4])
  })

  it('recientes: equivale al orden actual por defecto', () => {
    expect(sortAlerts(baseAlerts, 'recientes').map(a => a.id)).toEqual([2, 4, 3, 1])
  })

  it('antiguas: invierte el orden cronológico', () => {
    expect(sortAlerts(baseAlerts, 'antiguas').map(a => a.id)).toEqual([1, 3, 4, 2])
  })

  it('criticidad: ordena crítica → baja con desempate por fecha más reciente', () => {
    const alerts = [
      ...baseAlerts,
      { id: 5, criticality: 'critica', status: 'pendiente', timestamp: '2026-06-09T09:00:00.000Z' },
    ]
    // critica (2 más reciente que 5), alta (3), media (4), baja (1)
    expect(sortAlerts(alerts, 'criticidad').map(a => a.id)).toEqual([2, 5, 3, 4, 1])
  })

  it('sin_atender: pendientes más antiguas primero, luego el resto por más recientes', () => {
    expect(sortAlerts(baseAlerts, 'sin_atender').map(a => a.id)).toEqual([1, 3, 2, 4])
  })

  it('zona: A→Z usando el mapa de nombres, con desempate por criticidad', () => {
    const zoneNames = { 1: 'Entrada Principal', 2: 'Bodegas', 3: 'Perímetro Sur' }
    // Bodegas (3), Entrada Principal (2 critica antes que 4 media), Perímetro Sur (1)
    expect(sortAlerts(baseAlerts, 'zona', zoneNames).map(a => a.id)).toEqual([3, 2, 4, 1])
  })

  it('zona: usa la relación expandida zone.name y deja las alertas sin zona al final', () => {
    const alerts = [
      { id: 1, criticality: 'baja', status: 'pendiente', timestamp: '2026-06-09T08:00:00.000Z' },
      { id: 2, criticality: 'baja', status: 'pendiente', timestamp: '2026-06-09T09:00:00.000Z', zone: { id: 9, name: 'Acceso Norte', active: true } },
    ]
    expect(sortAlerts(alerts, 'zona').map(a => a.id)).toEqual([2, 1])
  })

  it('fechas inválidas: no rompe el ordenamiento y las trata como las más antiguas', () => {
    const alerts = [
      { id: 1, criticality: 'baja', status: 'pendiente', timestamp: 'no-es-fecha' },
      { id: 2, criticality: 'baja', status: 'pendiente', timestamp: '2026-06-09T09:00:00.000Z' },
    ]
    expect(sortAlerts(alerts, 'recientes').map(a => a.id)).toEqual([2, 1])
    expect(sortAlerts(alerts, 'antiguas').map(a => a.id)).toEqual([1, 2])
  })
})

// D12: ciclo de vida — una alerta abierta >48h está vencida; las cerradas nunca.
describe('isSlaOverdue', () => {
  const NOW = Date.parse('2026-06-12T12:00:00.000Z')
  const hoursAgo = h => new Date(NOW - h * 60 * 60 * 1000).toISOString()

  it('exporta la ventana SLA de 48 horas', () => {
    expect(SLA_WINDOW_MS).toBe(48 * 60 * 60 * 1000)
  })

  it.each(['pendiente', 'en_revision', 'escalada'])(
    'alerta %s con más de 48h está vencida',
    status => {
      expect(isSlaOverdue({ status, timestamp: hoursAgo(49) }, NOW)).toBe(true)
    }
  )

  it('alerta abierta con menos de 48h no está vencida', () => {
    expect(isSlaOverdue({ status: 'pendiente', timestamp: hoursAgo(47) }, NOW)).toBe(false)
  })

  it('exactamente 48h aún no está vencida (el corte es estricto)', () => {
    expect(isSlaOverdue({ status: 'pendiente', timestamp: hoursAgo(48) }, NOW)).toBe(false)
  })

  it.each(['resuelta', 'descartada'])(
    'alerta %s antigua nunca se marca vencida',
    status => {
      expect(isSlaOverdue({ status, timestamp: hoursAgo(200) }, NOW)).toBe(false)
    }
  )

  it('usa created_at como respaldo cuando timestamp no viene informado', () => {
    expect(isSlaOverdue({ status: 'pendiente', timestamp: '', created_at: hoursAgo(72) }, NOW)).toBe(true)
  })

  it('sin fecha válida no se marca vencida', () => {
    expect(isSlaOverdue({ status: 'pendiente', timestamp: 'no-es-fecha' }, NOW)).toBe(false)
  })
})
