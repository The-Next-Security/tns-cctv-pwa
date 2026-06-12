// D9: servicio Web Push — envío por roles, registro en ale_notificacion,
// desactivación de suscripciones muertas (404/410) y modo deshabilitado.
const { createPushService } = require('../src/push');

const silentLog = { warn: () => {} };

function stubStore(subscriptions = []) {
  const calls = { recorded: [], deactivated: [] };
  return {
    calls,
    listPushSubscriptionsByRoles: async () => subscriptions,
    recordPushNotification: async entry => calls.recorded.push(entry),
    deactivatePushSubscription: async endpoint => calls.deactivated.push(endpoint),
  };
}

const VAPID_ENV = {
  VAPID_PUBLIC_KEY: 'clave-publica',
  VAPID_PRIVATE_KEY: 'clave-privada',
};

describe('createPushService (D9)', () => {
  test('sin claves VAPID queda deshabilitado y no envía', async () => {
    const store = stubStore([{ endpoint: 'https://push/x', p256dh: 'a', auth_secret: 'b', id_usuario: 'u1' }]);
    const service = createPushService({ store, env: {}, log: silentLog });

    const result = await service.notifyRoles({ tenantId: 't1', roles: ['supervisor'], title: 't', body: 'b' });

    expect(service.enabled).toBe(false);
    expect(result).toEqual({ sent: 0, disabled: true });
  });

  test('envía a cada suscripción del rol y registra SENT en ale_notificacion', async () => {
    const store = stubStore([
      { endpoint: 'https://push/1', p256dh: 'k1', auth_secret: 's1', id_usuario: 'u1' },
      { endpoint: 'https://push/2', p256dh: 'k2', auth_secret: 's2', id_usuario: 'u2' },
    ]);
    const sentTo = [];
    const webpushImpl = {
      setVapidDetails: () => {},
      sendNotification: async (subscription) => sentTo.push(subscription.endpoint),
    };
    const service = createPushService({ store, env: VAPID_ENV, log: silentLog, webpushImpl });

    const result = await service.notifyRoles({
      tenantId: 't1',
      roles: ['supervisor'],
      title: 'Alerta escalada',
      body: 'detalle',
      eventId: 'evt_1',
    });

    expect(result.sent).toBe(2);
    expect(sentTo).toEqual(['https://push/1', 'https://push/2']);
    expect(store.calls.recorded).toHaveLength(2);
    expect(store.calls.recorded[0]).toEqual(
      expect.objectContaining({ status: 'SENT', userId: 'u1', eventId: 'evt_1' })
    );
  });

  test('una suscripción muerta (410) se desactiva y queda FAILED', async () => {
    const store = stubStore([
      { endpoint: 'https://push/muerta', p256dh: 'k', auth_secret: 's', id_usuario: 'u1' },
    ]);
    const webpushImpl = {
      setVapidDetails: () => {},
      sendNotification: async () => {
        throw Object.assign(new Error('Gone'), { statusCode: 410 });
      },
    };
    const service = createPushService({ store, env: VAPID_ENV, log: silentLog, webpushImpl });

    const result = await service.notifyRoles({ tenantId: 't1', roles: ['supervisor'], title: 't', body: 'b' });

    expect(result.sent).toBe(0);
    expect(store.calls.deactivated).toEqual(['https://push/muerta']);
    expect(store.calls.recorded[0]).toEqual(expect.objectContaining({ status: 'FAILED' }));
  });
});
