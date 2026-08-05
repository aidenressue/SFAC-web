# SFAC CRM — Build Brief

Operator app for Shine for a Cause. Solo mobile detailing, northern Colorado
(Fort Collins, Timnath, Loveland). Replaces the current internal app.

This is the only spec file. Everything is here.

---

# PART 1 — HOW TO WORK

Read this part twice. The build order matters more than the feature list.

## The one rule

**Build one screen at a time, completely, then stop and let the owner look at it.**

Complete means: real UI, real Supabase queries, real data on screen, works on a phone.
Not a stub. Not mock data. Not a schema and a promise.

After each screen, stop and say: "Screen X is ready at /path — take a look."
Then wait. Do not start the next screen.

## Why

A previous attempt built the full schema, seven API stubs, auth middleware, and 723
tests before a single page existed. It was technically correct and completely useless —
the owner couldn't see anything for six hours, and every gap surfaced later as a
separate problem. Vertical slices, not horizontal layers.

## Design comes from screenshots

The owner will provide screenshots of Jobber, Housecall Pro, or similar. Match their
layout, density, and hierarchy. Do not invent a visual language from a written
description — that is what produced an unstyled-looking mess last time.

If no screenshots have been provided yet, ask for them before building any UI.

Record what you learn in DESIGN.md and apply it consistently.

## Rules

- No tests until the owner has approved a screen. Then tests for business logic only
  (pricing, availability, finance math). Never test-first on UI.
- `npm run typecheck` must pass before you say a screen is done.
- Never run `npm run build` while the dev server is running. It clobbers `.next` and the
  page renders unstyled. Stop the dev server first.
- Act without asking on anything reversible. Ask only on: destructive migrations,
  anything touching money, anything the owner has to pay for.
- Ambiguity goes in QUESTIONS.md. Pick the simplest reversible option and keep moving.
- Append to PROGRESS.md after each screen.
- Money is **integer cents**. `12500` is $125.00. No floats, ever.
- Timestamps UTC in the database, `America/Denver` for display only.
- Business logic in `lib/`, not in components or route handlers.
- Every price goes through one resolver in `lib/pricing/`. Nothing calculates inline.

## Phone-first, always

This app is used outdoors, one-handed, with wet hands, in direct sun, between jobs.
44px minimum tap targets. High contrast. Few taps to anything that matters. If a screen
needs two hands or careful aim, it is wrong.

---

# PART 2 — STACK

- Next.js App Router + TypeScript
- Supabase (hosted, not local — no Docker on this machine)
- Tailwind
- Resend — email
- Twilio — SMS, gated behind `SMS_ENABLED` flag until A2P 10DLC clears
- Google Calendar API — two-way sync
- Stripe — schema only, not wired
- PWA manifest so it pins to the iOS home screen

Single user. One owner account. RLS locks everything to that user.

---

# PART 3 — BUILD ORDER

Each numbered item is one checkpoint. Build it, stop, wait for approval.

## 0. Shell
Auth (login page that renders), root redirect to /dashboard, nav, design tokens from the
screenshots. **A login page that works and a nav you can tap.** Nothing else.

## 1. Leads
List and detail. Tap-to-call, tap-to-text. Status pipeline. Manual add. Convert to
customer.

## 2. Customers
List with search. Profile: lifetime spend, last booked, total jobs, vehicles, full
service history. Add and edit.

## 3. Services & pricing
Service list, price and duration per size class, addons, service zones with travel fees.
The pricing resolver.

## 4. Quotes
Builder: customer → vehicle → services → addons → live total. PDF. Public link. Send.

## 5. Schedule
Day and week calendar. Availability. Drive time between jobs. Book from inside the CRM.

## 6. Jobs
Start button, timer, complete. SOP behind a button, never auto-opened. Scheduled vs
actual duration report.

## 7. Google Calendar
Two-way sync. CRM wins on conflict.

## 8. Public API
The endpoints the website consumes. See Part 5.

## 9. Payments
Card on file, deposits, payment links, who-paid/who-owes dashboard. Stripe wired for real.

## 10. Finance
Auto-updates when a job completes. Revenue, expenses, mileage, profit, tax set-aside.

## 11. Insights
Profit by service, busiest days, revenue by source, repeat rate, average job value.

## 12. Unified inbox
All client conversations in one thread per customer. SMS and email first.

## 13. Coatings & maintenance plans
System X warranty tracking. Maintenance plan scheduling.

## 14. Notifications
Owner push + SMS. Customer templates behind the flag.

## 15. PWA
Manifest, service worker, home screen install.

---

# PART 4 — DATA MODEL

### leads
`id`, `source` (`website`|`meta`|`google`|`referral`|`phone`|`instagram`|`manual`),
`name`, `phone`, `email`, `vehicle_raw`, `service_interest`, `message`,
`status` (`new`|`contacted`|`quoted`|`booked`|`lost`), `lost_reason`, `page`,
`raw_payload` jsonb, `customer_id`, `created_at`, `contacted_at`

Always store the full raw webhook body. Sources beyond website are stubbed — build the
adapter interface so Meta and Google are a config change later, not a rebuild.

### customers
`id`, `name`, `phone`, `email`, `address`, `city`, `zip`, `zone_id`, `notes`,
`lifetime_value`, `total_jobs`, `first_booked_at`, `last_booked_at`

Derived fields are computed at read time until job completion writes them (step 9).
Do not read empty columns and print `$0` next to a customer with six jobs.

### vehicles
`id`, `customer_id`, `year`, `make`, `model`, `color`, `size_class`, `plate`, `notes`

**Four size classes.** The exact values come from the website booking page, which is
already built against them — read it and match. Do not invent a fifth.

### services
`id`, `name`, `slug`, `description`, `category`, `base_price`,
`base_duration_minutes`, `website_url`, `active`

`website_url` is the matching page on the detailing site, used for quote cross-sell.

### service_pricing
`service_id`, `size_class`, `price`, `duration_minutes` — overrides base per size class.

### addons
`id`, `name`, `price`, `duration_minutes`, `active`

### service_zones
`id`, `name`, `zips` text[], `travel_fee`, `max_drive_minutes`

### quotes
`id`, `lead_id`, `customer_id`, `vehicle_id`,
`status` (`draft`|`sent`|`viewed`|`accepted`|`declined`|`expired`),
`public_token` (unguessable), `subtotal`, `travel_fee`, `discount_code`,
`discount_amount`, `total`, `valid_until`, `pdf_url`, `sent_at`, `viewed_at`,
`accepted_at`, `notes`

### quote_line_items
`quote_id`, `service_id` or `addon_id`, `description`, `price`, `duration_minutes`

### bookings
Bookings and jobs are **one table**. A booking becomes a job when the timer starts.

`id`, `customer_id`, `vehicle_id`, `quote_id`,
`status` (`scheduled`|`confirmed`|`in_progress`|`complete`|`cancelled`|`no_show`),
`scheduled_start`, `scheduled_end`, `actual_start`, `actual_end`, `address`, `zip`,
`zone_id`, `travel_fee`, `subtotal`, `total`, `google_event_id`,
`source` (`crm`|`website`|`quote_accept`), `notes`

### booking_services
`booking_id`, `service_id`, `price`, `duration_minutes`

### coatings
`id`, `customer_id`, `vehicle_id`, `booking_id`, `product`, `applied_date`,
`warranty_years`, `warranty_expires`, `next_maintenance_due`, `last_maintenance_date`,
`registered_with_manufacturer`, `status` (`active`|`due`|`lapsed`|`expired`)

**System X only.** The current app's pricing page shows JADE — that is wrong and does not
carry over.

### maintenance_plans
`id`, `customer_id`, `vehicle_id`, `name`, `interval_days`, `price_per_visit`,
`services` jsonb, `next_due`, `active`

### payments
`id`, `booking_id`, `customer_id`, `amount`,
`kind` (`deposit`|`balance`|`full`|`refund`),
`method` (`cash`|`card`|`zelle`|`venmo`|`stripe`),
`stripe_payment_intent_id`, `status` (`pending`|`paid`|`failed`|`refunded`),
`payment_link_url`, `paid_at`

### payment_methods
`id`, `customer_id`, `stripe_customer_id`, `stripe_payment_method_id`, `brand`,
`last4`, `exp_month`, `exp_year`, `is_default`

Card on file. Never store raw card data — Stripe tokens only.

### message_threads
`id`, `customer_id`, `lead_id`, `last_message_at`, `unread_count`, `archived`

One thread per person, regardless of channel. This is the unified inbox.

### expenses
`id`, `date`, `category`, `vendor`, `amount`, `notes`, `booking_id`

### mileage_logs
`id`, `date`, `booking_id`, `miles`, `purpose`, `deductible`

### messages
`id`, `thread_id`, `customer_id`, `lead_id`, `booking_id`,
`direction` (`in`|`out`), `channel` (`sms`|`email`|`instagram`|`facebook`|`web_form`),
`template_key`, `body`, `status`, `provider_sid`, `read_at`, `sent_at`

Inbound messages matter as much as outbound. Twilio and Resend both post webhooks —
capture replies, don't just send.

### message_templates
`key`, `channel`, `body`, `active` — editable in-app, tokens like `{{first_name}}`,
`{{date}}`, `{{time}}`, `{{service}}`, `{{quote_link}}`

### discount_codes
`code`, `type` (`percent`|`fixed`), `value`, `valid_until`, `uses`, `max_uses`, `active`

Generated and tracked here, redeemed on the website.

---

# PART 5 — FEATURES IN DETAIL

## Leads
One inbound endpoint for every source. Website form posts to it now; Meta Lead Ads and
Google LSA get adapters later without touching the endpoint.

On arrival: insert, then alert the owner immediately — **push and SMS both**. Auto-text
to the lead within 60 seconds once SMS is enabled.

Lead card: tap-to-call, tap-to-text, status, source, what they asked about.

## Customer profile
Above the fold: name, phone (tap to call), address (tap to navigate), vehicles,
**lifetime spend**, **last booked**, **total jobs**. Then full service history newest
first, active coatings with next maintenance due, active maintenance plan, open quotes.

A returning customer booking loads this pre-filled.

## Quotes
Owner picks customer → vehicle → services → addons. Priced by size class plus travel fee
by zone. Optional discount code.

Sends two things together: a **PDF**, and a **link to the quote landing page on the
detailing website** using `public_token`.

The landing page lives on the website, not in this app. This app exposes the data.
It must let the customer see the quote, book it, and click through to the matching
service page (ceramic coating quote → coating page) using `services.website_url`.

Viewing sets `viewed_at`. Owner sees "viewed."

## Scheduling
Bookable from three places: inside the CRM, from the website, from quote acceptance.

Duration comes from service + size class. Availability windows and buffers seeded from
the current Acuity setup. Drive time between consecutive jobs is blocked out — this is
mobile detailing, travel is real. Zone determines travel fee.

Owner alerted on every booking, push and SMS.

## Jobs
Big **Start Job** button, one tap. Live timer that survives backgrounding. **Complete**
ends it. SOP available behind a button, never auto-opened — the owner doesn't read them.

After a few dozen jobs, a report comparing scheduled vs actual duration per service so
durations get tuned from real data.

## Coating warranty — System X
On coating job completion, prompt to create the record.

Daily cron:
- **30 days before `next_maintenance_due`** — alert owner, text customer
- **On the exact anniversary** — alert owner again

Completing the maintenance rolls the due date forward a year. Missing it flips status to
`lapsed` and surfaces it on the dashboard.

## Maintenance plans
Owner creates manually, fills custom details. On save: booking created, customer gets a
confirmation text, then a reminder before the visit. On completion, next visit
auto-schedules at `interval_days`.

## Finance
Marking a booking complete automatically records revenue and recalculates the customer's
lifetime value, job count, and last booked date.

Reports: revenue by day/week/month/year, revenue and job count by service, average job
value, average actual duration, expenses by category, profit, mileage total, tax
set-aside at a configurable percentage.

Manual entry for expenses and mileage. No bank sync.

## Notifications

**To the owner** — push and SMS both, on: new lead, new booking, quote accepted.
Push only, on: quote viewed, coating maintenance due in 30 days, job starting in 1 hour.

**To the customer** — blocked on A2P 10DLC approval. Build the layer behind a
`SMS_ENABLED` flag. When false, outbound customer messages log to `messages` with status
`pending` instead of sending. Owner alerts are never blocked.

Lead auto-response within 60 seconds. Booking confirmation immediately. Reminder 24h
before. "On my way" manual button. Follow-up plus Google review request 2h after
completion. Coating maintenance 30 days before. Maintenance plan booked and reminder.

## Calendar
Week view is the default — the owner needs to see the whole week at a glance, not a day
at a time. Color-coded by service category. Drag to reschedule, which updates the booking
and re-syncs Google Calendar.

**Daily job cap.** A configurable max jobs per day. The scheduler refuses to offer slots
past it, on the website and in the CRM. Overbooking is the failure mode this prevents.

**Buffer times** are configurable per service, separate from drive time.

## Job pipeline
Four states the owner actually cares about, visible as counts on the dashboard:

**Booked → In Progress → Complete → Paid**

"Complete" and "Paid" are different things. A job sitting complete-but-unpaid is the
thing that quietly costs money, so it stays visible until payment lands.

## Payments
Real, not deferred.

- **Card on file** via Stripe. Saved at booking, charged after the job.
- **Deposits** required on jobs over a configurable threshold, and on all ceramic
  coatings. Configurable amount or percentage.
- **Payment links** — one tap after a job sends the customer a Stripe link.
- **Who paid / who owes** — a single list of outstanding balances, oldest first, with a
  one-tap reminder.

Never store raw card data. Stripe tokens only.

## Upsells
At quote and at booking, offer relevant addons inline: "Add ceramic coating for $150?"
Driven by the addon list, not hardcoded. Track which upsells actually convert — that
number is worth knowing.

## Insights
Beyond the finance reports. These answer "what's actually making me money":

- Profit per service, ranked
- Revenue by lead source — which of website, Meta, Google, referral is actually paying
- Busiest days and times
- Average job value, trending
- Repeat customer rate and time between visits
- Quote-to-booking conversion rate
- Scheduled vs actual duration per service, so pricing can be corrected
- Upsell attach rate

Keep it to the numbers that change a decision. A dashboard with 90 metrics gets ignored;
eight that matter get read.

## Unified inbox
One thread per customer, every channel in it. "Where was that message?" is the problem
being solved — the owner should never have to remember whether someone texted, emailed,
or DM'd.

**SMS and email first.** Both are straightforward: Twilio and Resend post inbound
webhooks, messages land in the thread.

**Instagram and Facebook are a separate project.** They need a Meta app, business
verification, and app review that takes weeks and can be rejected. Build the `channel`
enum to include them, leave the adapters unimplemented, and do not block anything on
them. Flag this to the owner rather than quietly attempting it.

Thread view shows the customer's vehicles, last job, and balance owed alongside the
conversation, so the owner can answer without leaving the screen.

## Public API for the website
The website is built and consumes these. Read the website's booking page code and match
what it already expects — do not invent shapes it isn't calling.

- `GET /api/public/services` — catalog and pricing
- `GET /api/public/zones/check?zip=` — coverage and travel fee
- `GET /api/public/availability` — bookable slots
- `POST /api/public/bookings` — create booking
- `POST /api/public/leads` — contact form
- `GET /api/public/quotes/[token]` — quote landing page data
- `POST /api/public/quotes/[token]/accept` — accept and book

Writes require a key header and rate limiting. **Always re-price server-side.** Never
trust a total sent from the client.

---

# PART 6 — AGENTS

Do not use subagents until step 4. The shell, leads, customers, and pricing must exist
and be approved first — parallel agents building against an unproven foundation is how
the last attempt produced 723 tests and one screen.

From step 5 onward, parallel agents are fine for genuinely independent work:

```
agent:scheduling   — calendar, availability, drive time, Google sync
agent:jobs         — timer, SOP, duration reporting
agent:finance      — revenue rollups, expenses, mileage, reports
agent:retention    — coating warranty engine, maintenance plans, cron
```

Two agents never write the same file. Each reads this file and DESIGN.md first, runs
typecheck before reporting done, and appends to PROGRESS.md.

After parallel work, one integration pass: walk the full path end to end — lead arrives →
converted → quoted → viewed → accepted → booked → calendar synced → job started →
completed → finance updated → coating recorded → maintenance scheduled. Fix every seam.

---

# PART 7 — OUT OF SCOPE

Named so they don't creep in:

- Photo capture, before-and-after galleries — **owner explicitly declined this.** The
  reference CRM has "require before photos on heavily soiled vehicles" as a liability
  shield. Do not build it, but flag it once in QUESTIONS.md so the owner can reconsider.
- Product and chemical inventory tracking
- Multi-user, staff accounts, roles
- Auto-opening SOPs
- Instagram and Facebook message ingestion — enum only, no adapters. Meta app review is
  a multi-week external dependency.
- Route optimization beyond drive-time estimates
- Email marketing campaigns
- **Fleet quoting** — deferred. Do not build it, do not add fleet fields, do not let it
  into the quote builder.

---

# PART 8 — TO FILL IN

Do not invent values for these. Seed clearly labeled `PLACEHOLDER` rows and flag them.

- [ ] Service tiers — name, category, price, duration
- [ ] The four size classes — exact values from the website booking page
- [ ] Addons — name, price, added time
- [ ] Availability — days, hours, start times, buffers (from Acuity)
- [ ] Service zones — zips and travel fee each
- [ ] System X products — which ones, warranty length, whether maintenance intervals
      differ by product
- [ ] Tax set-aside percentage
- [ ] Owner's alert phone number
- [ ] Quote validity period (days)
- [ ] Max jobs per day
- [ ] Deposit threshold — dollar amount above which a deposit is required
- [ ] Deposit amount — flat or percentage
- [ ] Buffer time between jobs
- [ ] Is card on file required at booking, or optional?
