# Little Lake Fishing

A free field guide to notable fishing waters across all fifty US states — lakes, rivers,
tailwaters, bays and sounds. Pick a water to see exactly which fish species you can catch there,
how and when to target them, and what the access looks like, or start from a species and find
every water in the guide that holds it.

No account, no sign-in, no payment.

**374 waters · 50 states · 90 species · 3,337 water–species records**

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

The app reads **one** environment variable. Vite only exposes variables prefixed with `VITE_`.

| Variable | What it is |
| --- | --- |
| `VITE_MAPBOX_TOKEN` | Mapbox **public** access token, starts with `pk.` |

The Supabase URL and anon key are committed in `src/lib/supabase.ts` rather than read from
the environment. That is deliberate: the publishable key is designed to be exposed in a browser,
every table is `SELECT`-only under row level security, and Vite inlines the value into the client
bundle regardless. Sourcing it from an env var buys no security and adds a way for the entire app
to break on a mistyped paste in a hosting dashboard. To target a different project, edit the two
constants at the top of that file.

Without a Mapbox token the app still works — the map panel shows a short "add a token" notice and
the searchable water list below it behaves normally.

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
   directory, and the SPA rewrite that makes `/waters/:slug` deep links work on refresh.
4. Under **Settings → Environment Variables**, add `VITE_MAPBOX_TOKEN` for **Production**,
   **Preview** and **Development**. Nothing else is required.
5. Deploy. Every later push to this branch triggers a new deployment automatically.

If the map is blank after deploying, the token is almost always the cause: confirm
`VITE_MAPBOX_TOKEN` is set for the Production environment and redeploy, since Vite bakes env
vars in at build time rather than reading them at runtime.

## Database

Schema and seed data live in Supabase migrations (project `qebhahxvlopomvkbykeb`).

```
fish_species   90 rows   name, description, identification, bait and lures,
                         season, time of day, typical and record size
waters        374 rows   name, water_type, state, county, coordinates, size, depth,
                         elevation, description, access notes, ramps, shore, marinas,
                         camping, facilities
water_fish   3337 rows   join table, with an abundance rating per pairing
```

All three tables are `SELECT`-only for the `anon` and `authenticated` roles. There is no write
path from the client.

Dormant `profiles`, `subscriptions` and `owner_emails` tables remain from an earlier paid version.
They hold no rows, are unreachable from the browser, and exist only so billing could be switched
back on by swapping three policies. Drop them if you never want that option.

## About the data

This is a **curated** guide, not an exhaustive one. There are roughly 2.6 million lakes and ponds
in the United States, plus millions of river miles, and no public dataset links them to fish
species — species records live with fifty separate state wildlife agencies in fifty different
formats.

So rather than import a huge list of waters with no species data attached, the guide covers notable
fishing waters in every state, each with a researched species list. Every water in the app is one
you could actually plan a trip around. The schema scales to more whenever you want to add them.

Species lists are a reference for planning, not a legal document. Seasons, limits, slot rules and
licence requirements change every year and vary by water — always check your state wildlife agency
before fishing.
