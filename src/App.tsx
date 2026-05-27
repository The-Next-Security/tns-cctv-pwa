import { useMemo, useState } from 'react';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM';
type Status = 'OPEN' | 'ACKNOWLEDGED' | 'CLOSED';

type Alert = {
  id: string;
  type: string;
  severity: Severity;
  zone: string;
  plate?: string;
  occurredAt: string;
  status: Status;
  evidence: { snapshotUrl?: string; clipUrl?: string };
  timeline: string[];
};

const seedAlerts: Alert[] = [
  {
    id: 'alt_9001',
    type: 'INTRUSION',
    severity: 'CRITICAL',
    zone: 'acceso_norte',
    plate: 'ZXCV99',
    occurredAt: '2026-05-27T13:05:11Z',
    status: 'OPEN',
    evidence: { snapshotUrl: 'https://evidence/snap-1.jpg' },
    timeline: ['OPEN por sistema']
  },
  {
    id: 'alt_9002',
    type: 'SPEEDING',
    severity: 'HIGH',
    zone: 'acceso_sur',
    plate: 'ABCD12',
    occurredAt: '2026-05-27T13:08:22Z',
    status: 'OPEN',
    evidence: { clipUrl: 'https://evidence/clip-2.m3u8' },
    timeline: ['OPEN por sistema']
  }
];

const order: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };

const toCsv = (alerts: Alert[]) => {
  const header = 'id,type,severity,status,zone,plate,occurredAt';
  const lines = alerts.map((a) => [a.id, a.type, a.severity, a.status, a.zone, a.plate ?? '', a.occurredAt].join(','));
  return [header, ...lines].join('\n');
};

export function App() {
  const [alerts, setAlerts] = useState(seedAlerts);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(seedAlerts[0]);
  const [plateFilter, setPlateFilter] = useState('');
  const [appliedPlate, setAppliedPlate] = useState('');
  const [csv, setCsv] = useState('');

  const queue = useMemo(() => [...alerts].sort((a, b) => order[a.severity] - order[b.severity]), [alerts]);

  const filtered = useMemo(() => {
    return alerts.filter((a) => !appliedPlate || (a.plate ?? '').toLowerCase().includes(appliedPlate.toLowerCase()));
  }, [alerts, appliedPlate]);

  const updateStatus = (id: string, nextStatus: Status) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: nextStatus,
              timeline: [...a.timeline, `${nextStatus} por Operador Frontend @ ${new Date().toISOString()}`]
            }
          : a
      )
    );
  };

  return (
    <main>
      <h1>TNS CCTV PWA MVP</h1>
      <section>
        <h2>Cola de eventos en tiempo real</h2>
        {queue.map((alert) => (
          <article key={alert.id} data-testid="event-row">
            <strong>{alert.severity}</strong> - {alert.id} - {alert.zone}
            <button onClick={() => setSelectedAlert(alert)}>Atender</button>
          </article>
        ))}
      </section>

      {selectedAlert && (
        <section role="dialog" aria-label="Operación alerta">
          <h2>Popup operativo</h2>
          <p>Alerta: {selectedAlert.id}</p>
          <p>Modo streaming: WEBRTC (fallback HLS/snapshot)</p>
          <p>Evidencia: {selectedAlert.evidence.clipUrl ?? selectedAlert.evidence.snapshotUrl ?? 'No disponible'}</p>
        </section>
      )}

      <section>
        <h2>Historial</h2>
        <label>
          Patente
          <input aria-label="Patente" value={plateFilter} onChange={(e) => setPlateFilter(e.target.value)} />
        </label>
        <button onClick={() => setAppliedPlate(plateFilter)}>Aplicar filtros</button>
        <button onClick={() => setCsv(toCsv(filtered))}>Exportar CSV</button>
        <pre data-testid="csv-output">{csv}</pre>

        {filtered.map((alert) => (
          <article key={alert.id}>
            <h3>{alert.id}</h3>
            <label htmlFor={`state-${alert.id}`}>Estado {alert.id}</label>
            <select
              id={`state-${alert.id}`}
              aria-label={`Estado ${alert.id}`}
              value={alert.status}
              onChange={(e) => updateStatus(alert.id, e.target.value as Status)}
            >
              <option value="OPEN">OPEN</option>
              <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
            <ul>
              {alert.timeline.map((entry, idx) => (
                <li key={`${alert.id}-${idx}`}>{entry}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
