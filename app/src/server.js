const app = require('./app');
const logger = require('./logger');

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  logger.info(`orders-api listening on port ${port}`);
});