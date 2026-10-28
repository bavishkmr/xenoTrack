// Vercel serverless entry point for the Express backend.
// Vercel invokes this file as a serverless function for all /api/* routes.
const app = require('../backend/src/app');

module.exports = app;
