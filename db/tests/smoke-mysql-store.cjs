// Smoke test de la capa de acceso MySQL contra tns_cctv.
const { MysqlStore } = require('../../src/mysqlStore.cjs');

(async () => {
  const store = new MysqlStore();

  console.log('1) Login admin@agrolivo.cl / password123');
  const user = await store.auth('admin@agrolivo.cl', 'password123');
  console.log('   ->', user);
  if (!user) throw new Error('login falló');

  console.log('2) Login con password incorrecta (debe ser null)');
  const bad = await store.auth('admin@agrolivo.cl', 'mala');
  console.log('   ->', bad);
  if (bad) throw new Error('login debió fallar');

  console.log('3) Listar eventos (primeros 3)');
  const events = await store.listEvents();
  console.log('   total:', events.length);
  console.log('   muestra:', events.slice(0, 3).map((e) => ({ id: e.event_id, type: e.event_type, state: e.state })));

  const newEvent = events.find((e) => e.state === 'NEW');
  console.log('4) Transición de estado NEW -> IN_REVIEW sobre', newEvent.event_id);
  const r1 = await store.changeState(newEvent.event_id, 'IN_REVIEW', 'TOMAR', 'Smoke test', null);
  console.log('   ->', r1);

  console.log('5) Transición inválida NEW -> CLOSED (debe ser invalid)');
  const otherNew = events.find((e) => e.state === 'NEW' && e.event_id !== newEvent.event_id);
  const r2 = await store.changeState(otherNew.event_id, 'CLOSED', 'X', 'Y', null);
  console.log('   ->', r2);

  console.log('6) Timeline del evento transicionado');
  const tl = await store.getTimeline(newEvent.event_id);
  console.log('   filas:', tl.length);

  console.log('\nOK smoke test');
  await store.pool.end();
  process.exit(0);
})().catch((err) => {
  console.error('FALLO:', err);
  process.exit(1);
});
