/* eslint-disable @typescript-eslint/no-require-imports */
const { logger } = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");

exports.health = onRequest((request, response) => {
  logger.info("Casa Malva Functions Healthcheck", { structuredData: true });
  response.send("OK - Casa Malva Functions");
});
