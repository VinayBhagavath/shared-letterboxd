# Shared Watchlist

A collaborative, dark-mode-first movie watchlist for friend groups — paste a Letterboxd link or search a title, vote on what to watch next, mark things as seen, and chat about each pick. Everything syncs live across all open tabs via Supabase Realtime. No accounts required: pick a display name once and you're in.

Built with **React + Vite + Tailwind**, **Supabase** (Postgres + Realtime + REST), and the **TMDB API** for movie metadata.

## Features

- **Add a movie** by Letterboxd URL (`letterboxd.com/film/the-substance/`) or live title search via TMDB. A confirmation card previews poster, year, director, runtime, genres, and overview before saving.
- **Movie cards** showing poster, title, year, director, genre tags, who suggested it, vote count, and comment count.
- **Voting** — one vote per display name per movie. Cards re-rank by votes in real time.
- **Watched toggle** — grays out the card and moves it to the **Watched** tab.
- **Comments** — expandable thread on every movie.
- **Tabs** — *To Watch* (sorted by votes), *Watched* (most recent first), *All*.
- **Realtime** — new movies, votes, comments, and watched-state changes appear instantly in every browser tab.
- **Display name** lives in `localStorage`; click your avatar in the header to change it.

## Tech stack

| Layer       | Tool                                                    |
| ----------- | ------------------------------------------------------- |
| Frontend    | React 18 + Vite + Tailwind CSS                          |
| Data        | Supabase (Postgres, Row-Level Security, Realtime, REST) |
| Movie data  | The Movie Database (TMDB) v3 API                        |
| Deployment  | Vercel (`vercel.json`) or Netlify (`netlify.toml`)      |

## Getting started

### 1. Clone and install

```bash
git clone <your-repo-url> shared-letterboxd
cd shared-letterboxd
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com), create a free project, and wait for it to provision.
2. In the dashboard, open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and click **Run**.
   - The script creates the `movies`, `votes`, and `comments` tables with indexes, RLS policies (public read/write for this group-of-friends use case), and adds the tables to the `supabase_realtime` publication.
   - It is idempotent — safe to re-run if you tweak the schema.
3. Open **Project Settings → API** and copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

> **Heads up:** because there's no auth, anyone with your project URL + anon key can read and write rows. Share these only with your friend group, or layer in Supabase Auth later if you need stronger protection.

### 3. Get a TMDB API key

1. Create a free account at [themoviedb.org](https://www.themoviedb.org/signup).
2. Go to **Settings → API**, request a free **API Key (v3 auth)**.
3. Copy the key.

### 4. Add environment variables

Copy `.env.example` to `.env` and fill in the three values:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key...
VITE_TMDB_API_KEY=your-tmdb-v3-api-key
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). On first visit you'll be prompted for a display name (stored in `localStorage`), then you can start adding movies.

To verify realtime, open the app in two browser windows side-by-side and add/vote/comment in one — the other should update within a second.

## Deployment

### Vercel

1. Push the repo to GitHub.
2. Import the project on [vercel.com](https://vercel.com/new).
3. Add the three `VITE_*` env vars in **Project Settings → Environment Variables**.
4. Deploy. `vercel.json` handles the SPA fallback.

### Netlify

1. Push the repo to GitHub.
2. Import the project on [app.netlify.com](https://app.netlify.com).
3. Add the three `VITE_*` env vars in **Site settings → Environment variables**.
4. Deploy. `netlify.toml` handles the SPA fallback.

Both configs use `npm run build` and publish the `dist/` directory.

## Project layout

```
.
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── vercel.json
├── netlify.toml
├── supabase/
│   └── schema.sql               # tables, indexes, RLS, realtime publication
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx
    ├── App.jsx                  # composition root, tabs, filters, layout
    ├── styles/index.css         # Tailwind + design tokens
    ├── components/
    │   ├── Header.jsx
    │   ├── NamePrompt.jsx
    │   ├── AddMovie.jsx         # Letterboxd parser + TMDB live search + confirm card
    │   ├── MovieCard.jsx        # poster, votes, watched toggle, comments
    │   ├── EmptyState.jsx
    │   ├── Tabs.jsx
    │   └── Icons.jsx            # inline SVG icons
    └── lib/
        ├── supabase.js          # createClient + config check
        ├── tmdb.js              # search, details, Letterboxd slug → TMDB resolver
        ├── useWatchlist.js      # data hook: queries, realtime, optimistic mutations
        ├── useLocalStorage.js
        └── format.js            # runtime / relative-time / initials helpers
```

## Data model

```
movies
  id, tmdb_id (unique), title, year, poster_url, backdrop_url, director,
  overview, runtime, genres (text[]), letterboxd_url, added_by, added_at,
  watched, watched_at

votes
  id, movie_id (FK → movies), user_name, created_at
  UNIQUE (movie_id, user_name)

comments
  id, movie_id (FK → movies), user_name, body, created_at
```

All three tables have RLS enabled with public `SELECT/INSERT/UPDATE/DELETE` policies, and are added to the `supabase_realtime` publication so client subscriptions receive change events.

## Notes on the Letterboxd → TMDB flow

Letterboxd doesn't expose a public API, so we parse the slug (e.g. `the-substance` from `letterboxd.com/film/the-substance/`), convert it back into a likely title (`"The Substance"`, with trailing year tokens like `the-godfather-part-ii-1974` split off as a year hint), and search TMDB. The result whose normalized slug exactly matches the input wins; otherwise we fall back to the top result. Once resolved, the user sees a confirmation card before the movie is saved, so mismatches are easy to catch.

## License

MIT.
