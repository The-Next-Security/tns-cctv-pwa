// Web Push real con VAPID (decisión D9). Claves por entorno:
//   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (generar: npx web-push generate-vapid-keys)
// Sin claves configuradas el push queda deshabilitado (se loggea, no se cae).
const webpush = require('web-push');

function createPushService({ store, env = process.env, log = console, webpushImpl = webpush }) {
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  const enabled = Boolean(publicKey && privateKey);

  if (enabled) {
    webpushImpl.setVapidDetails(
      env.VAPID_SUBJECT || 'mailto:soporte@thenextsecurity.cl',
      publicKey,
      privateKey
    );
  } else {
    log.warn('[push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY no configuradas — push deshabilitado');
  }

  // Notifica a todos los usuarios suscritos con alguno de los roles indicados.
  // Cada intento queda registrado en ale_notificacion (channel PUSH).
  async function notifyRoles({ tenantId, roles, title, body, url, eventId = null }) {
    if (!enabled) return { sent: 0, disabled: true };
    if (typeof store.listPushSubscriptionsByRoles !== 'function') return { sent: 0 };

    const subscriptions = await store.listPushSubscriptionsByRoles(tenantId, roles);
    let sent = 0;
    for (const sub of subscriptions) {
      const payload = JSON.stringify({ title, body, url });
      let status = 'SENT';
      let errorMessage = null;
      try {
        await webpushImpl.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_secret } },
          payload
        );
        sent += 1;
      } catch (error) {
        status = 'FAILED';
        errorMessage = error.message;
        // 404/410: la suscripción ya no existe en el push service — desactivarla.
        if (error.statusCode === 404 || error.statusCode === 410) {
          await store.deactivatePushSubscription?.(sub.endpoint);
        }
        log.warn(`[push] fallo hacia ${sub.id_usuario}: ${error.message}`);
      }
      await store.recordPushNotification?.({
        tenantId,
        eventId,
        userId: sub.id_usuario,
        body,
        status,
        errorMessage,
      });
    }
    return { sent };
  }

  return { enabled, publicKey: publicKey ?? null, notifyRoles };
}

module.exports = { createPushService };
