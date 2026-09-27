# AISEO by Ritesh Sharma

A production-grade AI Visibility Audit SaaS. AISEO allows brands to submit their sites for visibility audits across modern AI search engines (ChatGPT, Perplexity, Gemini). 

Built with **Next.js 15 (App Router)**, **Supabase** (Auth, DB, RPCs), **Groq/Gemini** (LLM pipelines), and **Razorpay** (Monetization).

## 🚀 Key Features & Performance
- **Human-in-the-Loop (HITL) Audits:** User submits a request → Atomic credit reservation → Admin reviews generated audit via Discord webhook → One-click publish to a public URL.
- **Native AI Assistant:** Built-in floating chat widget powered by Groq (Primary) and Gemini (Fallback) with a strict system prompt and conversational memory.
- **Monetization Engine:** Razorpay Standard Checkout integrated with server-side HMAC-SHA256 signature verification and atomic database credit fulfillment.
- **Edge-Optimized Performance:** 
  - Landing page forced to static (`force-static`) with optimized middleware routing to bypass Edge auth checks, achieving sub-second TTFB (Time To First Byte).
  - Dashboard navigation utilizes `<Link prefetch>` and `loading.tsx` UI skeletons for instant client-side route transitions.
  - Brotli/Gzip compression enabled with zero render-blocking assets.

## 🛠 Setup

- **Node 18+**, **Yarn**
- Copy env (see table below) into `.env.local`
- Supabase: run [supabase/schema.sql](supabase/schema.sql) in the new project. Set `profiles.is_admin = true` for the admin account.

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Gemini API key (server-side audit & fallback chat). |
| `GROQ_API_KEY` | No | Primary API key for report generation and AI Assistant. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon (publishable) key for Auth. |
| `NEXT_PRIVATE_SERVICE_ROLE_API_KEY` | Yes | Supabase service role key; server-only. |
| `RAZORPAY_KEY_ID` | Yes for billing | Razorpay server key ID. |
| `RAZORPAY_KEY_SECRET` | Yes for billing | Razorpay server secret; never expose to the browser. |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Yes for billing | Razorpay Checkout public key ID. |
| `DISCORD_WEBHOOK_URL` | Yes | Discord webhook for approval requests and user feedback. |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL | Used for Discord review and public report links. |
| `NEXT_PUBLIC_CONTACT_EMAIL`| No | Support email used in UI and AI widget failsafe. |
| `GROQ_MODEL` | No | Primary Groq model (default: `openai/gpt-oss-120b`). |
| `GEMINI_MODEL` | No | Gemini backup model (default: `gemini-3.1-flash-lite`). |

## 💻 Commands

- `yarn dev` — Dev server
- `yarn build` / `yarn start` — Production
- `yarn lint` — ESLint
- `yarn validate-gemini` — Validate API key(s) in `.env.local`

## 🔄 Core Flows

1. **Audit Flow:** Audit form → atomic credit reservation via Supabase RPC (`reserve_audit_slot`) → `POST /api/audit` creates draft. User confirms details → `POST /api/request-approval` sets `pending_approval` and sends a Discord review link. Authenticated admin opens `/admin/review/[reportId]`, approves generation, reviews Groq/Gemini output, and publishes. 
2. **Report State Machine:** `draft` → `pending_approval` → `generating` → `in_review` → `published` (or `rejected`). Admin rejections trigger an atomic credit refund.
3. **Billing Flow:** `POST /api/billing/order` creates a Razorpay order → Client pays via Checkout Modal → `POST /api/billing/verify` checks signature and atomically fulfills credits via `fulfill_payment` RPC.
4. **Support Flow:** Native AI widget answers basic queries via `POST /api/chat`. Complex user feedback pipes to Discord via `POST /api/feedback`.

## 📁 Code Structure

- **app/** — Next.js 15 App Router: 
  - `page.tsx` (Edge-cached static home)
  - `login`/`register`
  - `dashboard/*` (Protected dashboard, billing, reports, loading skeletons)
  - `report/[reportId]` (Auth-aware layout for published reports)
  - `admin/review/[reportId]` (Admin-protected review UI)
  - `api/*` (audit, billing, chat, feedback, approve, deny, publish, rerun).
- **components/** — `AuditTool`, `AIChatWidget` (Native bot), `Navbar` (with Cal.com scheduling), Studio-style Footer.
- **lib/** — `supabase/server` (auth), `supabase/client` (browser), `supabaseServer` (service-role + profiles), `adminServer`, `auditServer`, `discordServer`.
- **middleware** — Supabase SSR auth. Heavily optimized to only intercept `/dashboard/*` and `/admin/*` routes, bypassing static assets and the landing page to preserve max TTFB performance. Also verifies `profiles.is_admin` server-side for protected routes.

## 🗄 Database

`supabase/schema.sql` is the canonical schema for a fresh Supabase project. It defines:
- The HITL `report_status` state machine, ownership, and admin notes.
- Atomic audit-credit RPCs (`reserve_audit_slot`, `refund_audit_slot`, `fulfill_payment`).
- The `payment_orders` table and `profiles` tracking (`credits_remaining`, `plan`).
- Free accounts start with 2 credits. Pro Pack adds 3 audits (₹99); Agency Pack adds 10 audits (₹299).

## 🔍 SEO & AIEO Tracking

- **Indexability:** Fully optimized with global `sitemap.ts`, restricted `robots.ts`, `<link rel="icon">` SVGs, and dynamic OpenGraph generation. JSON-LD explicitly scoped only to the landing page.
- **Verification checklist:** See [docs/SEO-AIEO-TRACKING.md](docs/SEO-AIEO-TRACKING.md) to verify production pre-flight and track AI engine visibility.
- **Google Search Console:** Set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` to add the verification meta tag.

## 🚀 Deploy (Vercel)

Import repo, set the env vars above for Production, deploy, and run `supabase/schema.sql` once in the new Supabase project. Make sure `compress: true` is enabled in `next.config.mjs`. Do not commit `.next` (build output). If `.next` was ever committed, run `git rm -r --cached .next` from the root, then commit.
