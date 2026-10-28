# Students & Marks API

Express 5 + TypeScript + PostgreSQL — configuration, validation/sanitisation, and repository mapping for school records (`Student` + `Mark`).

## 1. Configuration

All env vars are validated by `validateConfig()` in `src/config/env.ts` (Zod). The process **refuses to start** if anything required is missing or malformed.

| Variable | Rules |
|----------|--------|
| `PASS_PERCENTAGE` | Required, `0`–`100`, decimals allowed (e.g. `33.5`) |
| `ACADEMIC_YEAR` | Required, `YYYY-YY` where the second year is first+1 (e.g. `2026-27`) |
| `DB_*` / `PORT` | Database + HTTP port |

```bash
cp .env.example .env   # fill DB_* and the two required vars above
```

## 2. Validation & sanitisation

- Shared helpers live in `src/utils/validators.ts` (`safeText`, `personName`, `idParam`, `pagination`, `tag`, `escapeLike`).
- `rejectDangerousPayload` blocks `__proto__` / oversized arrays before Zod or repositories run.
- DTOs use `z.strictObject` so unknown keys (mass assignment) are rejected at every nesting level.
- Errors use dotted paths (`guardian.phone`, `marks.0.score`) via the central `errorHandler`.

## 3. Repository mapping

SQL and row ↔ domain mapping stay inside repositories:

- `toDomain(row)` — snake_case / NUMERIC strings → camelCase domain
- `toPersistence(changes)` — domain → writable columns (partial-safe)
- Rows never leave the repository file

Modules follow: `controller` → `service` → `repository`.

## Quick start

### Prerequisites

- Node.js ≥ 20
- PostgreSQL running locally

### Database

```bash
pg_isready -h localhost
createdb student_app   # skip if it already exists
```

### Configure `.env`

```env
NODE_ENV=local
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=user
DB_PASSWORD=
DB_NAME=student_app
PASS_PERCENTAGE=40
ACADEMIC_YEAR=2026-27
```

### Install, migrate, test, run

```bash
npm install
npm run db:migrate
npm test
npm run dev
```

| URL | Purpose |
|-----|---------|
| http://localhost:3000/ | API index |
| http://localhost:3000/api/health | Liveness |
| http://localhost:3000/api/docs | Swagger UI |

### Connection troubleshooting

| Symptom | Fix |
|---------|-----|
| `connection refused` | Start Postgres (`brew services start postgresql@…`) |
| `role "postgres" does not exist` | Set `DB_USER` to `whoami` |
| `database "student_app" does not exist` | `createdb student_app` |
| `relation "students" does not exist` | `npm run db:migrate` |
| Server exits on `PASS_PERCENTAGE` / `ACADEMIC_YEAR` | Set both in `.env` (no defaults) |

## Endpoints

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/students` | Create (nested `guardian`) |
| PATCH | `/api/students/:id` | Partial update; `guardian` replaced whole |
| GET | `/api/students` | `className`, `section`, `search`, `limit`, `offset` |
| GET | `/api/students/:id` | One student |
| DELETE | `/api/students/:id` | Cascades marks |
| POST | `/api/students/:id/marks` | Atomic multi-mark insert |
| PATCH | `/api/marks/:id` | `score` and/or `maxScore` |
| DELETE | `/api/marks/:id` | Delete one mark |
| GET | `/api/marks/averages` | `className` required; optional `exam`, `section` |

## Submit

Branch: `assignment/ayush` → PR into `main`.
