# Xenotrack — Institute Management System

A full-stack, production-grade institute management system for tuition centres, gyms, sports academies, dance classes, and any membership or class-based organisation.

## Features

| Module | Capabilities |
|---|---|
| **Auth** | JWT login, refresh tokens, role-based access (Admin / Staff), bcrypt passwords |
| **Dashboard** | Stats, charts (Recharts), recent activity, attendance trends |
| **Members** | Full CRUD, search, filters, profile, enrollment history |
| **Programs** | Create and manage programs with fee plan defaults |
| **Groups** | Groups with schedules, staff assignments, capacity |
| **Attendance** | Session-based marking, bulk entry, edit window, history |
| **Fee Plans** | Configurable billing cycles, late fees, discounts |
| **Fee Records** | Auto-calculated balances, statuses, overdue tracking |
| **Payments** | Full/partial payments, receipts, reversal audit trail |
| **Reports** | Attendance, collection, outstanding — with CSV export |
| **Settings** | Institute profile, system settings, activity logs |
| **Security** | Rate limiting, parameterized SQL, JWT, RBAC |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, React Router v6 |
| UI | Vanilla CSS (custom design system) + React Icons + Recharts |
| HTTP | Axios with auto token refresh interceptors |
| Backend | Node.js + Express.js |
| Database | MySQL 8 |
| Auth | JWT (access 15m + refresh 7d) + bcryptjs |
| Validation | express-validator |

---

## Prerequisites

- Node.js ≥ 18
- MySQL 8 (or Docker)

---

## Quick Start

### Option A — Docker MySQL (Recommended)

```bash
# Start MySQL with Docker
docker-compose up -d

# Wait ~15 seconds for MySQL to initialise, then proceed below
```

> Docker will automatically run `schema.sql` and `seed.sql`.

### Option B — Existing MySQL

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p xenotrack < database/seed.sql
```

---

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your DB credentials
npm install
npm run dev
```

Backend runs on **http://localhost:5000**

### 2. Frontend Setup

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Frontend runs on **http://localhost:3000**

---

## Demo Credentials (local dev only)

| Role | Email | Password |
|---|---|---|
| **Admin** | admin@xenotrack.local | Admin@1234 |
| **Staff** | staff@xenotrack.local | Staff@1234 |

---

## Project Structure

```
Xenotrack/
├── backend/
│   ├── src/
│   │   ├── app.js              # Express app
│   │   ├── server.js           # Entry point
│   │   ├── config/             # DB pool, JWT utils
│   │   ├── controllers/        # auth, dashboard, member, program, staff, attendance, fee, payment, report, settings
│   │   ├── middleware/         # auth, validate, errorHandler
│   │   ├── routes/             # auth, dashboard, members, programs, staff, attendance, fees, reports, settings
│   │   └── utils/              # activityLogger, helpers
│   ├── __tests__/              # Jest tests
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Routing
│   │   ├── main.jsx            # Entry point
│   │   ├── context/            # AuthContext
│   │   ├── services/           # api.js + all service functions
│   │   ├── layouts/            # AppLayout
│   │   ├── components/         # Sidebar, Topbar, Modal
│   │   ├── pages/              # All page components (18 pages)
│   │   └── styles/             # global.css (design system)
│   ├── .env.example
│   └── package.json
│
├── database/
│   ├── schema.sql              # 17 tables with FK constraints
│   └── seed.sql                # Demo data
│
└── docker-compose.yml          # MySQL 8 container
```

---

## API Endpoints

| Group | Methods |
|---|---|
| `/api/auth` | login, logout, refresh, me, change-password |
| `/api/dashboard` | admin, staff |
| `/api/members` | CRUD + status patch |
| `/api/programs` | CRUD |
| `/api/groups` | CRUD + staff assign/remove |
| `/api/enrollments` | create, update |
| `/api/staff` | CRUD + reset-password |
| `/api/attendance/sessions` | list, create |
| `/api/attendance/records` | bulk save, update |
| `/api/fees/plans` | CRUD |
| `/api/fees/records` | CRUD |
| `/api/fees/payments` | list, create, receipt, reverse |
| `/api/reports` | attendance, collections, outstanding-fees |
| `/api/settings` | get/update, activity-logs |
| `/api/health` | health check |

---

## Running Tests

```bash
cd backend
npm test
```

Tests cover: auth validation, role permissions, fee calculations, member code generation, attendance status validation.

---

## Security Features

- ✅ bcrypt password hashing
- ✅ Short-lived JWT access tokens (15 min) + rotating refresh tokens
- ✅ Login rate limiting (10 req / 15 min)
- ✅ Parameterized MySQL queries (no SQL injection)
- ✅ Role + institute-level authorization on every route
- ✅ Transaction-safe payment recording
- ✅ No permanent deletion of financial records
- ✅ Activity audit trail for all important actions
- ✅ No secrets in frontend code

---

## Environment Variables

### Backend `.env`

| Variable | Default | Description |
|---|---|---|
| `PORT` | 5000 | API server port |
| `DB_HOST` | localhost | MySQL host |
| `DB_USER` | — | MySQL user |
| `DB_PASSWORD` | — | MySQL password |
| `DB_NAME` | xenotrack | Database name |
| `JWT_SECRET` | — | Access token secret (32+ chars) |
| `JWT_EXPIRES_IN` | 15m | Access token expiry |
| `JWT_REFRESH_SECRET` | — | Refresh token secret (32+ chars) |
| `JWT_REFRESH_EXPIRES_IN` | 7d | Refresh token expiry |
| `FRONTEND_URL` | http://localhost:3000 | CORS origin |

### Frontend `.env.local`

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | http://localhost:5000/api | Backend API base URL |

---

## License

MIT
