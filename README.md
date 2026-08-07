# Fishing Frenzy

A field guide to notable fishing lakes across all fifty US states. Pick a lake to see exactly
which fish species you can catch there, how and when to target them, and what the access looks
like — or start from a species and find every lake in the guide that holds it.

**273 lakes · 50 states · 69 species · 2,558 lake–species records**

## Stack

| Piece | Choice |
| --- | --- |
| Frontend | React 19 + TypeScript + Vite |
| Routing | React Router 7 |
| Data | Supabase (Postgres + PostgREST), read-only via row level security |
| Map | Mapbox GL JS, clustered GeoJSON layer |
| Illustrations | Hand-written inline SVG, no image assets |
| Hosting | Vercel (SPA rewrites configured in `vercel.json`) |

## Running it locally

```bash
npm install
cp .env.example .env.local     # then fill in your Mapbox token
npm run dev
```

The app reads three environment variables. Vite only exposes variables prefixed with `VITE_`.

| Variable | What it is |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key |
| `VITE_MAPBOX_TOKEN` | Mapbox **public** access token, starts with `pk.` |

The Supabase URL and publishable key are already filled in inside `.env.example`. They are safe
to ship in the browser bundle: every table has row level security enabled with a `SELECT`-only
policy, so an anonymous key can read the guide and nothing else.

Without a Mapbox token the app still works — the map panel shows a short "add a token" notice and
the searchable lake list below it behaves normally.

### Getting a Mapbox token

1. Create a free account at <https://account.mapbox.com/>.
2. Go to **Access tokens** → the **Default public token** (or **Create a token**).
3. Copy the value beginning `pk.` — this is a public token and is meant to be exposed in a browser.
4. Optionally restrict it: on the token's page add a **URL restriction** for your Vercel domain so
   nobody else can bill map loads to your account.

The free tier covers 50,000 map loads per month.

## Deploying to Vercel

1. Push this branch to GitHub (already done).
2. In Vercel, **Add New → Project** and import the repository.
3. Vercel detects Vite automatically; `vercel.json` pins the framework, build command, output
   directory, and the SPA rewrite that makes `/lakes/:slug` deep links work on refresh.
4. Under **Settings → Environment Variables**, add all three variables above for
   **Production**, **Preview** and **Development**.
5. Deploy. Every later push to this branch triggers a new deployment automatically.

If the map is blank after deploying, the token is almost always the cause: confirm
`VITE_MAPBOX_TOKEN` is set for the Production environment and redeploy, since Vite bakes env
vars in at build time rather than reading them at runtime.

## Database

Schema and seed data live in Supabase migrations (project `qebhahxvlopomvkbykeb`).

```
fish_species   69 rows   name, description, identification, bait and lures,
                         season, time of day, typical and record size
lakes         273 rows   name, state, county, coordinates, size, depth, elevation,
                         description, access notes, ramps, shore, marinas, camping, facilities
lake_fish    2558 rows   join table, with an abundance rating per pairing
```

All three tables are `SELECT`-only for the `anon` and `authenticated` roles. There is no write
path from the client.

## About the data

This is a **curated** guide, not an exhaustive one. There are roughly 2.6 million lakes and ponds
in the United States, and no public dataset links them to fish species — species records live with
fifty separate state wildlife agencies in fifty different formats.

So rather than import a huge list of lakes with no species data attached, the guide covers notable
fishing lakes in every state, each with a researched species list. Every lake in the app is one you
could actually plan a trip around. The schema scales to more lakes whenever you want to add them.

Species lists are a reference for planning, not a legal document. Seasons, limits, slot rules and
licence requirements change every year and vary by water — always check your state wildlife agency
before fishing.
