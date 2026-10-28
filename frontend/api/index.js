// Vercel serverless entry point — wraps the Express backend app.
// Placed in frontend/api/ so Vercel (root=frontend) can discover it.
const path = require('path');

// Point dotenv at the backend .env (only used locally; in prod use Vercel env vars)
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

const app = require('../../backend/src/app');

module.exports = app;
