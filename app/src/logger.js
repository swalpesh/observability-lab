const pino = require('pino');

// No LOKI_URL (e.g. on your Mac or in tests): just print JSON logs to the terminal.
if (!process.env.LOKI_URL) {
  module.exports = pino();
} else {
  // With LOKI_URL: send logs to Loki AND still print them (so `docker logs` works).
  const transport = pino.transport({
    targets: [
      {
        target: 'pino-loki',
        options: {
          host: process.env.LOKI_URL,
          batching: true,
          interval: 2,                     // send a batch every 2 seconds
          labels: { app: 'orders-api' },   // pino-loki also adds a "level" label
        },
      },
      { target: 'pino/file', options: { destination: 1 } }, // 1 = stdout
    ],
  });
  module.exports = pino(transport);
}