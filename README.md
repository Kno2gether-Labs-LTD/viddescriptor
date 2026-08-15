# Viddescriptor

**An open-source, white-label landing page + signup funnel for selling an AI Media Studio subscription — deploy your own branded version of it in about five minutes.**

Type a sentence, get back a finished, film-grade video — no crew, no editing timeline. Viddescriptor is the marketing site and signup flow in front of that product: visitors land on the page, sign up for free credits, get a one-time "double your credits" upsell, and log into your white-label portal to start generating. Every dollar and every credit flows through **your** Knotie partner account and **your** Stripe Connect balance.

Live reference deployment: **https://viddescriptor.kno2gether.com**

![Viddescriptor](docs/screenshot.png)

---

## What it is

- A single **Cloudflare Worker** that serves a **Vite + React + TypeScript SPA** (edge-cached static assets) and hosts a small **Hono** JSON API in the same Worker.
- The SPA is a faithful, honesty-audited port of a premium landing-page design: sticky top bar + offer banner, hero video wall, marquee, gallery, image-to-video before/after slider, a real 53-recipe catalog grid, an interactive "director controls" demo, pricing (pay-as-you-go / plans), a compare table, and a 3-step signup modal.
- The API proxies exactly three calls to the Knotie partner platform — signup (customer onboarding), checkout (mint a Stripe payment link), and verify (poll payment status) — so your partner API key **never reaches the browser**.
- No telemetry, no analytics beacons, no third-party trackers baked in. What you see is what ships.

## Quickstart (5 minutes)

```bash
git clone https://github.com/kno2gether/viddescriptor.git
cd viddescriptor
npm install

cp .env.example .env          # fill in the VITE_* vars you want to override
```

Then, in order:

1. **Edit the `routes` block in `wrangler.jsonc`** — point `pattern` at your own custom domain, or delete the `routes` block entirely to deploy on your account's free `*.workers.dev` subdomain instead.
2. **`npx wrangler login`** — authenticate to your own Cloudflare account.
3. **`npm run deploy`** — `vite build && wrangler deploy`. The Worker is now live (signup/checkout will still fail until the next step — that's expected).
4. **`npx wrangler secret put PARTNER_API_KEY`** — paste your `pkt_…` key when prompted. Secrets apply immediately; **no redeploy is needed**.

Everything else (brand name, tagline, pricing copy, credit amounts) ships with sane Viddescriptor defaults baked into `src/config.ts`, so nothing above is strictly required beyond the partner API key.

Before you go live, work through the **Knotie partner checklist** below — the app will deploy without it, but signup and checkout will fail against a partner account that isn't fully wired up.

## Knotie partner checklist

This app talks to your Knotie partner account, not ours. Before the signup/checkout flow can work end to end:

1. **Have a partner account with Stripe Connect connected.** Payment links mint against your Connect balance — the platform's payment-links API needs a connected Stripe account on file for your partner.
2. **Mint a partner API key with `customers:write`, `payments:write`, and `payments:read` scopes.** This is the key you'll `wrangler secret put PARTNER_API_KEY` below — it's the only credential the Worker holds, and the SPA never sees it.
3. **Register your landing domain in Settings → approved redirect domains.** The checkout flow builds `successUrl`/`cancelUrl` from `SITE_URL`, and they must be `https://` URLs on a domain you've approved — an unapproved domain will fail to mint a payment link.
4. **Enable the `media_studio` experience and have a white-label portal subdomain ready.** Set `VITE_PORTAL_URL` to it — the post-signup "log in" CTA links to `{VITE_PORTAL_URL}/login`.
5. **Set the Worker secret:** `npx wrangler secret put PARTNER_API_KEY` (production) or add it to `.dev.vars` (local dev — see below).
6. **Confirm the platform's payment-link webhook grants credits before enabling the upsell.** As of this writing, the partner platform's payment-link webhook does **not** grant `features.initialAiCredits` on payment (see `docs/notes/upsell-grant.md`) — so this template ships with `UPSELL_CREDITS` set to `0` in `wrangler.jsonc` (and `VITE_UPSELL_CREDITS=0` in your local `.env`), which skips the "double my credits" upsell step entirely. **Leave `UPSELL_CREDITS=0` to disable the upsell** until your platform has the grant webhook deployed (knotie media_studio_v5+) — only then set both `UPSELL_CREDITS` (in `wrangler.jsonc`) and `VITE_UPSELL_CREDITS` (in `.env`) to your real top-up amount (e.g. `500`) and redeploy.

If any of these are missing, the Worker degrades gracefully — signup/checkout return a friendly "temporarily unavailable" error rather than leaking partner API details, and the failure is logged server-side for you to diagnose.

## Local development

```bash
cp .dev.vars.example .dev.vars   # fill in PARTNER_API_KEY for local calls to the partner API
npx wrangler dev                 # full stack: Worker + Hono API + static assets, matches prod
# — or —
npm run dev                      # SPA only (vite dev), faster iteration, /api/* calls will 404
```

`.dev.vars` is gitignored and loaded automatically by `wrangler dev` — never commit real secrets to `.env` or anywhere else in the repo.

## Testing

```bash
npx vitest run     # 142 tests: worker endpoints (mocked partner API) + component + unit
npx vitest          # watch mode
npm run typecheck   # tsc --noEmit
```

Worker tests mock the partner API entirely (Nock-style fetch mocking) — no test ever calls a real Knotie or Stripe endpoint.

## Architecture

```
                         ┌─────────────────────────────────────────┐
                         │            Cloudflare Worker             │
                         │                                           │
  Browser  ── GET / ───▶ │  ASSETS binding → dist/ (Vite build)     │
                         │  React SPA: Hero, Recipes, Pricing, ...  │
                         │                                           │
  Browser  ── POST ────▶ │  Hono API (worker/index.ts)              │
           /api/signup   │    ├─ /api/signup   → partner /onboard   │──▶  Knotie Partner
           /api/checkout │    ├─ /api/checkout → partner /payment-  │     Platform API
           /api/verify   │    │                    links (mint)     │     (your account,
                         │    └─ /api/verify   → partner /payment-  │      your Stripe
                         │                          links/{id} (GET)│      Connect balance)
                         │                                           │
                         │  x-api-key: PARTNER_API_KEY (Worker secret│
                         │  — set via `wrangler secret put`, never   │
                         │  bundled into client JS, never sent to    │
                         │  the browser)                             │
                         │                                           │
                         │  Per-IP fixed-window rate limiter         │
                         │  (in-memory, per isolate) on all 3 routes │
                         └─────────────────────────────────────────┘
```

- **The Worker is the only thing that ever holds `PARTNER_API_KEY`.** The SPA calls same-origin `/api/*` routes; the Worker attaches the key server-side via `worker/partnerApi.ts` before calling out to `PARTNER_API_BASE`.
- **Payment verification is never trusted from the redirect URL.** `/api/checkout` returns an `intentId` the client stashes client-side; after the Stripe redirect back, the client calls `GET /api/verify?intent=…`, which re-reads the authoritative status from the partner platform (backed by its own webhook-confirmed truth) — not from query-string state.
- **The upsell credit grant is platform-side.** When `UPSELL_CREDITS` (Worker var) is greater than zero, `/api/checkout` includes `features.initialAiCredits` on the payment-link mint request; the partner platform's payment-link webhook applies the grant once the payment is confirmed. Keep `UPSELL_CREDITS` (Worker var, `wrangler.jsonc`) and `VITE_UPSELL_CREDITS` (SPA display copy) in sync — one is what you say, the other is what actually gets granted.
- **Static assets are served straight off Cloudflare's edge** via the Workers `ASSETS` binding (`not_found_handling: single-page-application` — client-side routing works, unknown paths fall back to `index.html`).

## Configuration reference

Everything is `.env`-driven. Public `VITE_*` vars are build-time only — they get bundled into the client JS by Vite, so never put a secret in one. Worker vars live in `wrangler.jsonc` under `vars` (plain, non-secret config baked into the deployed Worker). Worker secrets are set with `wrangler secret put` (production) or `.dev.vars` (local) and are never bundled into anything the browser can read.

### Public build-time config (`VITE_*`, set in `.env`)

| Variable | Default | Purpose |
|---|---|---|
| `VITE_BRAND_NAME` | `Viddescriptor` | Wordmark, `<title>`, copy substitutions |
| `VITE_BRAND_ACCENT_SPLIT` | `VID,DESCRIPTOR` | Two comma-separated parts for the split-color wordmark; falls back to default unless exactly two non-empty parts are given |
| `VITE_TAGLINE` | *(bundled Viddescriptor line)* | Hero subtitle / one-line pitch |
| `VITE_LOGO_URL` | *(unset — text wordmark)* | Optional logo image URL |
| `VITE_SITE_URL` | `https://viddescriptor.kno2gether.com` | Canonical URL; also used to build the Worker's payment success/cancel redirect target (see `SITE_URL` below — keep these in sync) |
| `VITE_SUPPORT_EMAIL` | `support@kno2gether.com` | Footer + error-state contact address |
| `VITE_PORTAL_URL` | `https://viddescriptor.kno2gether.com` *(placeholder)* | White-label portal base URL; the post-signup "log in" CTA links to `{VITE_PORTAL_URL}/login` — **set this before going live** |
| `VITE_GITHUB_URL` | `https://github.com/kno2gether/viddescriptor` *(placeholder)* | Open-source backlink; point at your own fork |
| `VITE_SOCIALS_JSON` | `[]` | JSON array of extra footer social links, e.g. `[{"label":"X","href":"https://x.com/you"}]` |
| `VITE_FREE_CREDITS` | `300` | Free credits granted on signup — shown in copy *and* sent as the onboarding grant amount; keep equal to the Worker's `FREE_CREDITS` |
| `VITE_UPSELL_AMOUNT_LABEL` | `$9` | Upsell price display copy |
| `VITE_UPSELL_CREDITS` | `500` (**`0` in this deploy's `.env`**) | Upsell credit amount display copy; keep equal to the Worker's `UPSELL_CREDITS` (the value actually granted). `<= 0` skips the upsell step entirely — see the partner checklist above |
| `VITE_UPSELL_FROM_TO` | `300 → 800` | Upsell "before/after" credits copy |
| `VITE_OFFER_ENDS_AT` | *(unset)* | ISO 8601 date/time; when unset, all countdown/urgency UI stays hidden — no fabricated urgency ships by default |
| `VITE_BANNER_TEXT` | `OPEN SOURCE · {freeCredits} FREE CREDITS ON SIGNUP` | Top-bar / sticky-CTA banner line; `{freeCredits}` is interpolated with the resolved `VITE_FREE_CREDITS` |
| `VITE_PRICING_JSON` | *(bundled pricing cards)* | Optional JSON blob that fully replaces the default pay-as-you-go + plan cards: `{"payg":[{"kicker","price","per?","lines":[...],"cta","featured?"}],"plans":[...]}`; invalid JSON is ignored and the default is used instead |
| `VITE_SHOW_SAMPLE_SOCIAL_PROOF` | `false` | Gates the FreeFilm/OpenSource stat blocks — enable only with real, owner-supplied numbers |
| `VITE_TESTIMONIALS_JSON` | `[]` | JSON array of real, owner-supplied Compare-section testimonial quotes, e.g. `[{"quote":"...","attribution":"A REAL CUSTOMER"}]`; the testimonial cards render only when this is non-empty — never fabricated |

### Worker vars (non-secret, `wrangler.jsonc` → `vars`)

| Variable | Default | Purpose |
|---|---|---|
| `PARTNER_API_BASE` | `https://app.knotie-ai.pro` | Base URL of the Knotie partner platform API |
| `EXPERIENCE_TYPE` | `media_studio` | Experience passed on customer onboarding |
| `FREE_CREDITS` | `300` | Credits granted on signup (server-side truth — keep equal to `VITE_FREE_CREDITS`) |
| `UPSELL_AMOUNT_CENTS` | `900` | Upsell price in cents, sent to the payment-link mint call |
| `UPSELL_CURRENCY` | `usd` | Upsell currency |
| `UPSELL_CREDITS` | `500` default in `src/config.ts` (**set to `0` in this repo's `wrangler.jsonc`**) | Credits actually granted by the upsell (server-side truth — keep equal to `VITE_UPSELL_CREDITS`); `0` omits the grant entirely and the client skips the upsell step. Leave at `0` until the platform payment-link webhook grants credits (see `docs/notes/upsell-grant.md`) |
| `SITE_URL` | `https://viddescriptor.kno2gether.com` | Used to build the payment-link `successUrl`/`cancelUrl` — must be an approved redirect domain on your partner account |

To change the deployed domain, edit the `routes` block in `wrangler.jsonc`:

```jsonc
"routes": [{ "pattern": "yourdomain.com", "custom_domain": true }]
```

### Worker secrets (never in `.env` — `wrangler secret put`, or `.dev.vars` locally)

| Variable | Purpose |
|---|---|
| `PARTNER_API_KEY` | `pkt_…` key with `customers:write`, `payments:write`, `payments:read` scopes — the only credential that authenticates the Worker to your partner account |
| `FREE_PLAN_ID` | Optional: plan id applied at onboarding, if you want signups to land on a specific plan rather than the platform default |

## Media

The clips bundled under `public/media/` are AI-generated originals shipped with this template so the default deployment looks finished out of the box. They're free to use, modify, or replace as part of your deployment, but are not licensed for standalone resale as stock footage — see [`LICENSE-MEDIA.md`](LICENSE-MEDIA.md) for the exact terms. Swap in your own media any time; nothing in the app hard-codes these files.

## We can deploy and manage it for you

Don't want to run your own Cloudflare Worker? We'll deploy, brand, and operate Viddescriptor for you on your domain. Reach out: **support@kno2gether.com**.

## License

Code is [MIT licensed](LICENSE) — copyright 2026 Kno2gether / Knolabs. Bundled media is licensed separately under [`LICENSE-MEDIA.md`](LICENSE-MEDIA.md).
