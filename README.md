# Marquee

> A cinematic tracker for everything you watch and play: anime, movies, series, games, or any custom shelf you create.

Marquee replaces scattered notes apps, spreadsheets, and Word documents with one fast, personal, multi-user media library. Sign up, curate your shelves, track progress, and enjoy a rich, movie-theater-inspired dark interface designed for enthusiasts.

---

## Highlights

- **Cinematic Dark Design**: Movie-theater ambiance featuring warm amber accents, subtle film grain, ambient backdrop glows, and 2:3 poster art with automated dominant-color extraction.
- **Smart Metadata Integration**: Search-as-you-add with live covers, release years, episode counts, genres, and community ratings powered by **TMDB** (movies & series), **AniList** (anime), and **IGDB** (games), with a clean manual entry fallback and procedural cover generation.
- **Universal Importer**: Migrate existing watchlists in seconds. Paste raw text or drop `.docx`, `.md`, `.csv`, `.tsv`, `.xlsx`, `.json`, `.html`, or MyAnimeList `.xml` files. Includes inline review, fuzzy duplicate detection, and batch insertion.
- **"Find Covers" Batch Matcher**: Turn plain imported titles into rich media cards with automated fuzzy title matching, similarity scoring, season expansion, and franchise traversal.
- **Command Palette (`Ctrl+K` / `⌘K`)**: Instant search across your entire collection, fast navigation between shelves, quick-add shortcuts, and global actions.
- **Interactive Tracking**: Quick "+1" progress step right from Home, 10-point ratings, status steppers, personal notes, favorite toggles, and automatic start/finish timestamps.
- **Surprise Me Reel**: Cannot decide what to watch next? Spin the marquee slot machine to pick a random planned title from your backlog.
- **Ticket Stamp Animation**: Celebrate completions with an animated "ADMIT ONE" ticket-stamp celebration and mobile haptic feedback.
- **Privacy & Portability First**: Multi-user architecture with Row-Level Security (RLS) ensuring your library remains strictly private. Export your data anytime to JSON or RFC-4180 CSV.
- **Installable PWA**: Responsive from 360px to 4K displays with dedicated mobile bottom sheets, native-like gesture navigation, and standalone PWA installation.
- **Accessibility**: Audited for WCAG 2.2 AA compliance with 100/100 Lighthouse accessibility scores across every screen.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack, React 19 Server Components & Actions) |
| **Styling** | Tailwind CSS v4 (`@theme` CSS tokens in `globals.css`) |
| **Components** | Radix UI primitives & custom styled components (`cmdk`, `sonner`) |
| **Motion** | Motion (`motion/react`) with reduced-motion support |
| **Icons** | Lucide React |
| **Database & Auth** | Supabase (PostgreSQL, Row-Level Security, Auth, Storage, SSR) |
| **Metadata APIs** | TMDB API, AniList GraphQL, IGDB API (via Twitch OAuth) |
| **Validation** | Zod (for server actions and API inputs) |
| **File Parsing** | Mammoth (`.docx`), JSZip (`.xlsx`, `.zip`) |
| **Testing** | Vitest (unit & integration tests), Playwright (E2E testing) |
| **Bot Protection** | Cloudflare Turnstile (invisible captcha) |

---

## Architecture Overview

```
Browser (React Server Components + Interactive Client Islands)
   │
   ├── Server Components ── Direct DB reads via Supabase Server Client (RLS protected)
   ├── Server Actions ───── Type-safe mutations (Zod validated) + optimistic updates
   └── Route Handlers
         ├── /api/search ── Proxied search to TMDB, AniList & IGDB (server-cached)
         └── /api/titles ── Lightweight title indexing for the ⌘K command palette

Supabase
   ├── Auth (Google OAuth + 6-digit email one-time code)
   ├── Postgres Tables (profiles, categories, items) guarded by RLS policies
   ├── Storage Buckets (avatars with client-side WebP cropping)
   └── Triggers (seed default shelves on signup, auto-timestamp completion dates)

proxy.ts ── Session refresh, route protection, and Content-Security-Policy headers
```

---

## Getting Started

### Prerequisites

- **Node.js**: 20.x or higher
- **Package Manager**: `pnpm` (version 9 or higher recommended)
- **Supabase Account**: A Supabase project for Auth, Postgres, and Storage

### 1. Clone & Install

```bash
git clone https://github.com/KarthikAkshaj/Marquee.git
cd Marquee
pnpm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Fill in your configuration settings:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-or-publishable-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase CLI (for generating TypeScript types)
SUPABASE_PROJECT_ID=<your-project-ref>

# Metadata Providers (Optional for initial boot, required for poster lookups)
TMDB_READ_TOKEN=<your-tmdb-api-read-access-token>
TWITCH_CLIENT_ID=<your-twitch-client-id-for-igdb>
TWITCH_CLIENT_SECRET=<your-twitch-client-secret-for-igdb>

# Bot Protection (Optional)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<your-cloudflare-turnstile-site-key>
```

> **Note**: Marquee gracefully handles missing provider keys. If IGDB or TMDB tokens are not supplied, searches will return empty results and allow manual entry without crashing.

### 3. Initialize Database & Storage

Apply the SQL migration scripts located in `supabase/migrations/` to your Supabase project in numerical order:

1. `0001_init.sql`: Core schema (enums, profiles, categories, items, triggers, RLS policies).
2. `0002_avatars.sql`: Storage bucket setup and storage policies for user avatars.
3. `0003_username_available.sql`: Unique username availability checking RPC.
4. `0004_item_metadata.sql`: Genres and community score tracking.
5. `0005_import_titles.sql`: Batch import transaction procedure.

Generate TypeScript types from your schema at any time:

```bash
pnpm db:types
```

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Starts the local development server with Turbopack |
| `pnpm build` | Builds the production bundle |
| `pnpm start` | Runs the built production server |
| `pnpm lint` | Checks source code using ESLint |
| `pnpm typecheck` | Validates Next.js type generation and TypeScript types |
| `pnpm test` | Runs unit and integration test suites using Vitest |
| `pnpm test:watch` | Runs Vitest in interactive watch mode |
| `pnpm test:e2e` | Runs end-to-end browser tests via Playwright |
| `pnpm db:types` | Generates TypeScript database types from Supabase |

---

## Project Structure

```
├── app/
│   ├── (app)/               # Authenticated app shell
│   │   ├── c/[slug]/        # Category shelf views (grid, list, match)
│   │   ├── home/            # Personal dashboard (continue, stats, recent)
│   │   ├── import/          # Bulk import wizard
│   │   └── settings/        # Profile, categories, data export & account
│   ├── (marketing)/         # Public landing, privacy policy, and terms
│   ├── api/                 # Route handlers (/api/search, /api/titles)
│   ├── auth/callback/       # OAuth and OTP authentication callback
│   ├── login/               # Sign-in screen (Google OAuth & Email OTP)
│   ├── globals.css          # Design tokens, themes, grain, and keyframes
│   ├── manifest.ts          # Web app manifest for PWA installation
│   └── layout.tsx           # Root HTML layout and font declarations
├── components/
│   ├── add/                 # Add dialogs, search inputs, and manual entry forms
│   ├── auth/                # Sign-in cards, OTP inputs, and Turnstile captcha
│   ├── category/            # Shelf headers, filter toolbars, grid & list layouts
│   ├── fun/                 # Surprise Me slot reel, Ticket Stamp animations
│   ├── home/                # Continue carousel, category stat cards, recents
│   ├── import/              # Format converter, file dropzone, preview table
│   ├── items/               # PosterCard, ItemSheet, StatusPill, RatingBar
│   ├── match/               # Batch cover matcher, candidate picker, season list
│   ├── palette/             # Global Ctrl+K command palette
│   ├── settings/            # Avatar cropper, category manager, export actions
│   ├── shell/               # Desktop sidebar, mobile navigation, ambient glows
│   └── ui/                  # Reusable UI primitives (dialogs, tooltips, buttons)
├── lib/
│   ├── actions/             # Server actions (items, categories, profile, data)
│   ├── import/              # Document parsers (.docx, .csv, .xlsx, .md, .xml)
│   ├── search/              # API clients for TMDB, AniList, and IGDB
│   ├── supabase/            # Client, server, and proxy Supabase factories
│   ├── status.ts            # Dynamic status labels mapped per category kind
│   ├── palette.ts           # Fuzzy matching algorithm for titles and actions
│   └── security.ts          # Content-Security-Policy and header generators
├── supabase/
│   └── migrations/          # PostgreSQL schemas, RLS policies, and triggers
└── proxy.ts                 # Route guarding, session renewal, and security headers
```

---

## Design System

Marquee is built around the **Cinematic Dark** visual language:

- **Palette**: Pitch-black foundation (`#09090B`) paired with warm slate surfaces (`#111114`, `#18181C`), ivory text (`#EDE9E3`), and incandescent marquee amber (`#F4B650`).
- **Category Colors**: Curated accents for each shelf type (Crimson for Anime, Amber for Movies, Violet for Series, Teal for Games, Sky, Rose, Lime, Sand).
- **Typography**: 
  - **Fraunces** (display serif) for headers, title cards, and branding.
  - **Geist** (sans-serif) for functional interface elements and labels.
  - **Geist Mono** for progress counts, ratings, dates, and keyboard shortcuts.
- **Physicality**: Tactile depth with 1px inner highlights, soft colored glows, and an inline SVG turbulence grain overlay.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + K` or `⌘K` | Open command palette (search titles, jump to shelves, add) |
| `N` | Quick add new title to current shelf |
| `S` | Trigger "Surprise Me" title picker |
| `/` | Focus filter input on shelf view |
| `Esc` | Close active sheet, modal, or palette |

---

## Data Portability & Privacy

- **Your Data Stays Yours**: Your account and library belong to you. Marquee uses strict PostgreSQL Row-Level Security (RLS) so no user can access another user's rows.
- **Full Export**: Export your entire library to JSON or export individual shelves to CSV from **Settings → Data**.
- **Complete Deletion**: Deleting your account completely purges all profile records, uploaded avatars, categories, and item records permanently via a cascading database RPC.

---

## Third-Party Attributions

- Movie and television metadata and poster imagery provided by [The Movie Database (TMDB)](https://www.themoviedb.org/). This product uses the TMDB API but is not endorsed or certified by TMDB.
- Anime metadata provided by [AniList](https://anilist.co/).
- Video game metadata provided by [IGDB](https://www.igdb.com/).

---

## License

This project is private and intended for personal use. All rights reserved.
