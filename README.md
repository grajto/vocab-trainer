# Vocab Trainer

A private vocabulary trainer with SRS (Spaced Repetition System) built with Next.js, Payload CMS v3, and Neon Postgres.

## Features

- **Decks & Cards**: Organize vocabulary into decks with flashcards (front/back)
- **SRS (4 levels)**: Spaced repetition with anti-grind protection
- **Learning modes**: Translate (typed answer), ABCD (multiple choice), Sentence (AI-validated), Mixed
- **CSV Import**: Bulk import cards from CSV files
- **Statistics**: Global stats, per-deck level distribution, session history
- **Admin Panel**: Full Payload CMS admin at `/admin`

## Tech Stack

- Next.js (App Router) + TypeScript
- Payload CMS v3 (admin panel + auth + server-side API)
- Neon Postgres (via `@payloadcms/db-postgres`)
- Tailwind CSS v4

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `PAYLOAD_SECRET` | Yes | Secret for Payload CMS encryption (min 32 chars) |
| `PAYLOAD_PUBLIC_SERVER_URL` | No | `http://localhost:3000` locally. In prod set to your domain (fallback to `VERCEL_URL` if unset) |
| `OPENAI_API_KEY` | No | OpenAI API key for sentence validation (sentence mode works without it using stub) |
| `APP_ACCESS_TOKEN` | Recommended | Shared token for single-user mode; middleware injects it as `x-app-token` to enable UI + `/api/session/*` access without login (admin still requires login). In production set this to avoid 401s for session endpoints. |

### Single-user mode (optional)

Set `APP_ACCESS_TOKEN` to let the middleware inject `x-app-token` for app + custom API requests (`/api/session`, `/api/import`, `/api/check-sentence`, `/api/stats`, `/api/decks`, `/api/cards`), so the UI works without logging in. The Payload Admin panel still uses normal authentication. Single-user mode expects exactly one `owner` user; if the owner is missing or multiple owners exist, app-token mode is disabled and you'll need to log in. When `APP_ACCESS_TOKEN` is set, `/api/session/*` requires the `x-app-token` header (injected by middleware).

## Getting Started

```bash
node -v # requires Node.js 24
pnpm install
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL and PAYLOAD_SECRET
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Create first admin user

Navigate to [http://localhost:3000/admin](http://localhost:3000/admin) — Payload CMS will display a "Create First User" form. After creating the account, set a username and log in at `/login` using your username or email.

## Database Migrations

Migration files live in `src/migrations/`. The initial migration creates all tables:

**Tables:** `users`, `decks`, `decks_tags`, `cards`, `review_states`, `sessions`, `session_items`, plus Payload internal tables (`payload_locked_documents`, `payload_preferences`, `payload_migrations`).

**To apply migrations (required on first setup):**

```bash
pnpm payload migrate
```

**To create a new migration after schema changes:**

```bash
pnpm payload migrate:create
pnpm payload migrate
```

In production (Vercel), Payload auto-creates tables on first boot if the migration table doesn't exist. You can also run `pnpm payload migrate` locally pointing to the prod DATABASE_URL.

## Deploy on Vercel

Set these environment variables in Vercel project settings:
- `DATABASE_URL` — Neon Postgres connection string
- `PAYLOAD_SECRET` — a strong random secret (min 32 chars)
- `PAYLOAD_PUBLIC_SERVER_URL` — `https://www.vocab-trainer.pl`
- `OPENAI_API_KEY` (optional)
- `APP_ACCESS_TOKEN` (recommended for single-user UI access; required for `/api/session/*` without login)

### Production test plan

- Start a session (POST `/api/session/start`) → 200 OK, no 401 Unauthorized.
- Sentence mode check → `/api/check-sentence` returns `ai_used: true` when `OPENAI_API_KEY` is set, and the session UI shows “AI: ON (xx ms)”.

## Project Structure

```
app/
├── (payload)/              # Payload CMS admin & REST API
├── api/                    # Custom API endpoints
│   ├── session/start/      # POST - start learning session  
│   ├── session/answer/     # POST - submit answer
│   ├── import/             # POST - CSV import
│   ├── check-sentence/     # POST - sentence validation
│   ├── stats/              # GET - statistics
│   ├── decks/              # POST - create deck
│   └── cards/              # POST - create card
├── decks/                  # Decks management pages
├── learn/                  # Start learning session
├── session/[id]/           # Active session UI
├── study/                  # Aliases for /learn and /session
├── import/                 # CSV import page
├── stats/                  # Statistics page
├── login/                  # Login page
└── page.tsx                # Dashboard

src/
├── lib/
│   ├── getPayload.ts       # Payload instance helper
│   ├── getUser.ts          # Auth user helper
│   └── srs.ts              # SRS logic (4-level system)
├── payload/
│   ├── access/isOwner.ts   # Shared access control helper
│   ├── hooks/              # Collection hooks
│   ├── collections/        # Payload collection configs
│   └── payload.config.ts
└── migrations/             # Database migration files
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/session/start` | Start a learning session (input: deckId, mode, targetCount) |
| POST | `/api/session/answer` | Submit answer (input: sessionId, cardId, userAnswer, isCorrect) |
| POST | `/api/check-sentence` | Validate sentence with phrase (input: requiredPhrase, sentence) |
| POST | `/api/import` | Import CSV cards (input: deckId, csvText) |
| GET | `/api/stats` | Get global + per-deck statistics |
| POST | `/api/decks` | Create a deck |
| POST | `/api/cards` | Create a card |

## SRS Logic

4 levels with review intervals:
- **L1**: 1 day · **L2**: 3 days · **L3**: 7 days · **L4**: 21 days

Anti-grind rules:
- Max +1 level per day per card
- Requires 2+ correct answers to level up  
- 2+ wrong answers in a day → Level 1
- Daily counts reset lazily based on `lastReviewedAt`
