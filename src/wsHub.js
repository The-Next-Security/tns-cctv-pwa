class WsHub {
  constructor() {
    this.clients = new Set();
  }

  register(ws) {
    const context = { ws, filters: null };
    this.clients.add(context);
    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        ws.send(JSON.stringify({ type: 'error', data: { code: 'INVALID_JSON' } }));
        return;
      }
      if (msg.type === 'subscribe.filters') {
        context.filters = msg.data;
        ws.send(JSON.stringify({ type: 'subscribed', data: { ok: true } }));
      } else if (msg.type === 'presence.heartbeat') {
        ws.send(JSON.stringify({ type: 'presence.ack', data: { ts: new Date().toISOString() } }));
      }
    });
    ws.on('close', () => this.clients.delete(context));
  }

  publishEventPopup(event, requestId) {
    for (const c of this.clients) {
      const { ws, filters } = c;
      if (filters?.site_ids?.length && !filters.site_ids.includes(event.site_id)) continue;
      if (filters?.event_states?.length && !filters.event_states.includes(event.state)) continue;
      if (filters?.critical_only && !event.is_critical) continue;

      ws.send(
        JSON.stringify({
          type: 'event.popup',
          data: {
            event_id: event.event_id,
            tenant_id: event.tenant_id,
            site_id: event.site_id,
            severity: event.severity,
            is_critical: event.is_critical,
            occurred_at: event.occurred_at,
          },
          request_id: requestId,
        }),
      );
    }
  }
}

module.exports = { WsHub };