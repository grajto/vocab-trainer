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

Copy `.env.example` to `.env` and fill in the values:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `PAYLOAD_SECRET` | Yes | Secret for Payload CMS encryption |
| `PAYLOAD_PUBLIC_SERVER_URL` | Yes | `http://localhost:3000` locally, `https://www.vocab-trainer.pl` in prod |
| `OPENAI_API_KEY` | No | OpenAI API key for sentence validation (sentence mode works without it using stub) |

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment

```bash
cp .env.example .env
# Edit .env with your DATABASE_URL and PAYLOAD_SECRET
```

### 3. Run development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Create first admin user

Navigate to [http://localhost:3000/admin](http://localhost:3000/admin) and create your first user account.

## Database Bootstrap / Migration

No manual migrations needed; Payload CMS v3 with the Postgres adapter creates tables automatically on startup.

On first run, you will see Payload creating the schema in the console logs:
```
[Payload] info: Connected to Postgres successfully
[Payload] info: Migrating...
```

If you need to regenerate migrations after schema changes:
```bash
pnpm payload migrate:create
pnpm payload migrate
```

For production (Vercel), tables are created/updated automatically on the first deployment with the correct `DATABASE_URL`.

## Deploy on Vercel

1. Set these environment variables in Vercel project settings:
   - `DATABASE_URL` - your Neon Postgres connection string
   - `PAYLOAD_SECRET` - a strong random secret
   - `PAYLOAD_PUBLIC_SERVER_URL` - `https://www.vocab-trainer.pl`
   - `OPENAI_API_KEY` (optional) - for AI sentence validation

2. Deploy. Payload will auto-create tables on first boot.

## Project Structure

```
app/
├── (payload)/           # Payload CMS admin & REST API
│   ├── admin/           # Admin panel pages
│   ├── api/             # Payload REST API routes
│   └── layout.tsx       # Admin layout
├── api/                 # Custom API endpoints
│   ├── session/start/   # POST - start learning session
│   ├── session/answer/  # POST - submit answer
│   ├── import/          # POST - CSV import
│   ├── check-sentence/  # POST - sentence validation
│   ├── stats/           # GET - statistics
│   ├── decks/           # POST - create deck
│   └── cards/           # POST - create card
├── decks/               # Decks management pages
├── learn/               # Start learning session
├── session/[id]/        # Active session UI
├── import/              # CSV import page
├── stats/               # Statistics page
├── login/               # Login page
└── page.tsx             # Dashboard

src/
├── lib/
│   ├── getPayload.ts    # Payload instance helper
│   ├── getUser.ts       # Auth user helper
│   └── srs.ts           # SRS logic (4-level system)
└── payload/
    ├── collections/     # Payload collection configs
    └── payload.config.ts
```

## SRS Logic

The system uses 4 levels with the following review intervals:
- **Level 1**: 1 day
- **Level 2**: 3 days
- **Level 3**: 7 days
- **Level 4**: 21 days

Anti-grind rules:
- Max +1 level increase per day per card
- Requires 2+ correct answers to level up
- 2+ wrong answers in a day drops card to Level 1
- Daily counts reset lazily based on `lastReviewedAt`
