# Prism Pop — Prompt Chain Studio

A superadmin studio for the lines Prism Pop writes on photos. Sign in with Google, compose a prompt chain, try it on a still, and set how often each chain gets the picture.

This app is separate from the members club (`vercel-genai`) and the superadmin console (`vercel-genai-admin`). It reuses the same Supabase project. It does not create a new database.

## What it does

- Google login against the existing Supabase Auth setup
- Superadmin-only access via `profiles.is_superadmin` (no self-serve promote)
- Compose and reorder chain steps, each with its own model
- Run a chain against a photo and inspect every step
- Weight chains in the traffic mix
- Review recent studio runs

## Local setup

Copy env vars from the admin console's `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`

```bash
npm install
npm run dev
```

Add this origin to the Supabase Auth redirect allow-list:

- `http://localhost:3000/auth/callback`
- `https://<your-vercel-domain>/auth/callback`
