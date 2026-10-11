# Admin account created automatically on first start
ADMIN_EMAIL=sakthi@gmail.com
ADMIN_PASSWORD=sakthi123

# Bulk Mail App (MERN)

Send one email to many recipients, keep a history of every send, and sign in as an admin.

**Stack:** React (Vite) · Node.js + Express · MongoDB (Mongoose) · Nodemailer · JWT auth

## Features
- Compose page: subject, message, multiple recipients (type, paste, or drop in a comma/line-separated list)
- Client and server validation (required fields, email format, duplicates removed, 500-recipient cap)
- Each recipient gets their own copy (addresses are not exposed to each other)
- Per-recipient status (sent / failed + error) stored in MongoDB
- Status messages: success, partial success, failure
- History page: pagination, message preview, per-recipient results, delete
- Admin login with hashed password (bcrypt) and JWT; all mail routes protected
- Request logging (morgan) and error logging in the server console

## Setup

### Prerequisites
Node 18+, MongoDB running locally (or an Atlas connection string), and an SMTP account.

### 1. Backend
```bash
cd server
npm install
cp .env.example .env     # then edit .env
npm run dev
```
Fill in `.env`:
- `MONGO_URI`: your MongoDB connection string
- `JWT_SECRET`: any long random string
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`: the admin account is created automatically on first start
- `SMTP_*`: for Gmail, turn on 2-Step Verification, create an App Password
  (https://myaccount.google.com/apppasswords) and use it as `SMTP_PASS`

### 2. Frontend
```bash
cd client
npm install
npm run dev
```
Open http://localhost:5173 and sign in with your admin credentials.
The Vite dev server proxies `/api` to `http://localhost:5000`.

## API
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` returns `{ token, user }` |
| GET | `/api/auth/me` | current admin |
| POST | `/api/mails/send` | `{ subject, body, recipients[] }` sends and stores the record |
| GET | `/api/mails?page=1&limit=10` | paginated history |
| GET | `/api/mails/:id` | one record |
| DELETE | `/api/mails/:id` | delete a record |

All `/api/mails` routes need `Authorization: Bearer <token>`.

## Mail document
```js
{
  subject, body,
  recipients: [{ email, status: 'pending|sent|failed', error }],
  status: 'sending | sent | partial | failed',
  sentCount, failedCount, sentBy, createdAt, updatedAt
}
```

## Notes
- Sends run in batches of 10 in parallel. The API replies when all are done, which is fine for a few hundred recipients. For larger lists, move sending to a job queue (e.g. BullMQ).
- Gmail limits free accounts to roughly 500 emails per day.
- Change the default admin password before deploying anywhere public.
