Here's the full rewritten requirements doc with pause support, history, and a complete schema:

---

# Time Tracker App — Requirements

## Tech Stack
- **Framework:** Next.js (App Router)
- **Auth:** NextAuth v5 (Google OAuth only)
- **Database:** PostgreSQL (via Docker)
- **ORM:** Prisma
- **Styling:** Tailwind CSS

---

## Database Schema

### `User`
Managed by NextAuth. Define explicitly in Prisma schema.

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[]
  sessions      Session[]
  timerSessions TimerSession[]
}
```

### `Account`, `Session`, `VerificationToken`
Standard NextAuth v5 Prisma adapter models — include all four as-is.

### `TimerSession`
One row represents one timer lifecycle: from the first Start, through any number of pause/resume cycles, to the final Stop.

```prisma
model TimerSession {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  status          TimerStatus @default(RUNNING)

  // Accumulated ms from all completed run segments (updated on every Pause)
  totalElapsedMs  Int       @default(0)

  // Set when timer starts or resumes; null when paused or stopped
  lastResumedAt   DateTime?

  // Set once when the session is fully stopped; null if active
  stoppedAt       DateTime?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([userId, status])
  @@index([userId, createdAt])
}

enum TimerStatus {
  RUNNING
  PAUSED
  STOPPED
}
```

**How elapsed time is computed at any point:**
- If `RUNNING`: `totalElapsedMs + (now - lastResumedAt)`
- If `PAUSED` or `STOPPED`: `totalElapsedMs`

This means `totalElapsedMs` is the source of truth for all completed segments. It gets updated on every Pause and on Stop.

---

## Authentication

- Google OAuth is the only sign-in method.
- Unauthenticated users are redirected to `/login`.
- `/login` shows a centered "Sign in with Google" button.
- After sign-in, redirect to `/dashboard`.
- Use NextAuth v5 with the Prisma adapter.

---

## Dashboard — Timer (`/dashboard`)

### Layout
- Top section: large timer display + control buttons
- Bottom section: history log grouped by day

### Timer Display
Format: `HH:MM:SS` — updates every second via `setInterval` on the client.

Elapsed time is always derived from DB values, never from client-only state:
- On page load, fetch the active session (status `RUNNING` or `PAUSED`) for the current user.
- If `RUNNING`: start the interval, seed it with `totalElapsedMs + (now - lastResumedAt)`
- If `PAUSED`: display `totalElapsedMs`, no interval running
- If no active session: display `00:00:00`

---

## Timer States & Transitions

### Idle
- Display: `00:00:00`
- Button: **Start**
- On Start:
  - Create a new `TimerSession` with `status = RUNNING`, `lastResumedAt = now()`, `totalElapsedMs = 0`

### Running
- Display: ticking elapsed time
- Buttons: **Pause**, **Stop**
- On Pause:
  - Compute `elapsed = now - lastResumedAt`
  - Update session: `totalElapsedMs += elapsed`, `lastResumedAt = null`, `status = PAUSED`
- On Stop:
  - Compute `elapsed = now - lastResumedAt`
  - Update session: `totalElapsedMs += elapsed`, `lastResumedAt = null`, `status = STOPPED`, `stoppedAt = now()`
  - Timer resets to `00:00:00`, state returns to Idle

### Paused
- Display: frozen at paused time
- Buttons: **Resume**, **Stop**
- On Resume:
  - Update session: `lastResumedAt = now()`, `status = RUNNING`
- On Stop:
  - `totalElapsedMs` is already up to date (was saved on Pause)
  - Update session: `status = STOPPED`, `stoppedAt = now()`
  - Timer resets to `00:00:00`, state returns to Idle

---

## Persistence Across Page Reloads / Tab Closes

On every dashboard load, after auth:
1. Query for the user's active session where `status IN (RUNNING, PAUSED)`
2. If `RUNNING` → rehydrate elapsed from `totalElapsedMs + (now - lastResumedAt)` and resume ticking
3. If `PAUSED` → show frozen elapsed from `totalElapsedMs`
4. If none → show Idle state

The timer is always correct even if the user was away for hours — no client state is persisted in localStorage or cookies.

---

## History Log

Displayed below the timer on the dashboard.

### Grouping Logic
- Fetch all `STOPPED` sessions for the current user
- Group by the **calendar date of `createdAt`** (i.e., the day the session was started)
- For each day, sum `totalElapsedMs` across all sessions that day
- Display as `Xh Ym` (e.g. `5h 33m`)

### Display
```
26 May 2026       5h 33m
25 May 2026       2h 10m
24 May 2026       8h 01m
```

- Show the most recent day first
- If a day has multiple sessions (user stopped and started again), they are merged into one row showing total for that day
- Dates with zero logged time are not shown

---

## API Routes (Server Actions or Route Handlers)

| Action | What it does |
|---|---|
| `GET /api/timer/active` | Returns the user's active session (RUNNING or PAUSED), or null |
| `POST /api/timer/start` | Creates a new RUNNING session |
| `POST /api/timer/pause` | Saves elapsed, sets status to PAUSED |
| `POST /api/timer/resume` | Sets lastResumedAt = now(), status = RUNNING |
| `POST /api/timer/stop` | Saves final elapsed, sets status = STOPPED |
| `GET /api/timer/history` | Returns grouped daily totals for the user |

All routes must validate the session — reject unauthenticated requests with 401.

---

## Out of Scope (for now)
- Manual time editing
- Per-session labels or tags
- Notifications or reminders
