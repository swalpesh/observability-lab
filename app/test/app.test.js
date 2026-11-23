const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

app.chaos.errorRate = 0; // no random failures during tests

test('GET /health says ok', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: 'ok' });
});

test('create an order, then fetch it', async () => {
  const created = await request(app).post('/api/orders').send({ item: 'keyboard', quantity: 2 });
  assert.equal(created.status, 201);

  const fetched = await request(app).get(`/api/orders/${created.body.id}`);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.body.item, 'keyboard');
});

test('bad input is rejected with 400', async () => {
  const res = await request(app).post('/api/orders').send({ item: 'keyboard' });
  assert.equal(res.status, 400);
});

test('/metrics uses the route pattern, not the real URL', async () => {
  await request(app).get('/api/orders/abc123');
  const res = await request(app).get('/metrics');
  assert.match(res.text, /route="\/api\/orders\/:id"/);
  assert.doesNotMatch(res.text, /abc123/);
});