const client = require('prom-client');

// A registry is the "list" of every metric this app reports.
const register = new client.Registry();

// Free built-in metrics: CPU, memory, event-loop lag, garbage collection...
client.collectDefaultMetrics({ register });

// COUNTER: a number that only goes up (like a car's odometer).
// Counts every request, split by method, route and status code.
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

// HISTOGRAM: sorts each request's duration into buckets (in seconds),
// so we can later ask "how long did the slowest 5% take?"
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

// A business metric: how many orders were created.
const ordersCreatedTotal = new client.Counter({
  name: 'orders_created_total',
  help: 'Total orders created',
  registers: [register],
});

module.exports = { register, httpRequestsTotal, httpRequestDuration, ordersCreatedTotal };