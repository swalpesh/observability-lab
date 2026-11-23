const express = require('express');
const crypto = require('node:crypto');
const { register, httpRequestsTotal, httpRequestDuration, ordersCreatedTotal } = require('./metrics');
const logger = require('./logger');

const app = express();
app.use(express.json());

const orders = new Map();

// "Chaos" settings: lets us break the app on purpose to test our alerts.
const chaos = { errorRate: 0.01, extraLatencyMs: 0 }; // 1% of requests fail by default

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Pretend to talk to a database: wait 10-80 ms (plus any chaos delay).
const simulateWork = () => sleep(10 + Math.random() * 70 + chaos.extraLatencyMs);

// MIDDLEWARE: runs for EVERY request. Starts a timer, and when the response
// is finished, records the duration + counts the request + prints a log line.
app.use((req, res, next) => {
  const stopTimer = httpRequestDuration.startTimer();
  res.on('finish', () => {
    // Use the route PATTERN (/api/orders/:id), never the real URL (/api/orders/7f3a...).
    const route = req.route ? req.route.path : 'unmatched';
    const labels = { method: req.method, route, status: String(res.statusCode) };
    const seconds = stopTimer(labels);
    httpRequestsTotal.inc(labels);
    if (route !== '/metrics') {
      const level = res.statusCode >= 500 ? 'error' : 'info';
      logger[level]({ ...labels, durationMs: Math.round(seconds * 1000) }, `${req.method} ${route} ${res.statusCode}`);
    }
  });
  next();
});

// Randomly fail some requests, based on the chaos setting.
const maybeFail = (req, res, next) => {
  if (Math.random() < chaos.errorRate) {
    return res.status(500).json({ error: 'simulated failure' });
  }
  next();
};

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Prometheus reads this page every 15 seconds.
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

app.get('/api/orders', maybeFail, async (req, res) => {
  await simulateWork();
  res.json({ count: orders.size, orders: [...orders.values()].slice(-20) });
});

app.post('/api/orders', maybeFail, async (req, res) => {
  const { item, quantity } = req.body;
  if (typeof item !== 'string' || !Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ error: 'item (text) and quantity (whole number >= 1) are required' });
  }
  await simulateWork();
  const order = { id: crypto.randomUUID(), item, quantity, createdAt: new Date().toISOString() };
  orders.set(order.id, order);
  ordersCreatedTotal.inc();
  res.status(201).json(order);
});

app.get('/api/orders/:id', maybeFail, async (req, res) => {
  await simulateWork();
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'order not found' });
  res.json(order);
});

// Chaos control panel.
app.get('/admin/chaos', (req, res) => res.json(chaos));
app.post('/admin/chaos', (req, res) => {
  const { errorRate, extraLatencyMs } = req.body;
  if (errorRate !== undefined) chaos.errorRate = Math.min(Math.max(Number(errorRate) || 0, 0), 1);
  if (extraLatencyMs !== undefined) chaos.extraLatencyMs = Math.max(Number(extraLatencyMs) || 0, 0);
  res.json(chaos);
});

module.exports = app;
module.exports.chaos = chaos;