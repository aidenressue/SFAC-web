# How it all works

Short notes, plain terms. Two things exist: the **website** customers see, and the
**CRM** you use.

---

## Where things live

| Thing | Where |
|---|---|
| Website | shineforacause.com |
| CRM | sfac-mu.vercel.app |
| Website code | `~/Documents/Website` |
| CRM code | `~/Documents/SFAC` |
| Database | Supabase project `janzjvhkpiminuscxzzv` |

Push to `main` in either folder and it goes live on its own in about a minute.

---

## One price list

All prices live in **one file**: `SFAC/lib/services-catalog.ts`.

The website booking page, every quote builder and the CRM booking form all read
it. Change a price there and it changes everywhere at once.

Twice we found pages carrying their own copy that had drifted, and both were
quoting less than the website. That is why there is only one list now.

---

## A booking, start to finish

1. Customer books on the website (or you book them in the CRM)
2. It saves to the `bookings` table
3. The database **refuses** to save anything that overlaps an existing job, including drive time
4. It creates a Google Calendar event on your Biz Calendar
5. It emails you
6. It texts you and the customer *(off until Twilio approves the number)*

The reply tells you if the calendar event worked. If it says `"calendar":"failed"`,
add it by hand.

---

## Times and days off

On the **CRM calendar page**:

- **Working hours** — opens, closes, how late a job may run over, which days you work
- **Time off** — block whole days

Both hit the website immediately. No publishing, no waiting. Change closing to
3pm and the website stops offering afternoon slots on the next page load.

---

## Drive time and travel fees

Worked out from the address:

| Area | Fee | Drive time held |
|---|---|---|
| Fort Collins, Loveland, Windsor, Timnath | free | none |
| Greeley, Eaton, Ault, Wellington, Laporte, Johnstown, Berthoud | $45 | 30 min each side |
| Longmont | $65 | none |

**Two or more vehicles:** drive time is only held before the first and after the
last, never between them. They run back to back.

---

## Quotes

Four builders: Residential, Ceramic, Maintenance, Fleet.

All of them do two things:

- **Download PDF** — a file, for in person
- **Save & get link** — sends `shineforacause.com/quote?id=...`

**Use the link.** It opens in a text thread, always shows the current price, and
has a Book button on it. A PDF has none of that.

---

## Leads

Everything lives on the **CRM page**.

- **Home tab** — who just came in, where leads come from, how many a month
- **Pipeline** — New, Contacted, In Discussions, Closed, Lost, Recontact Needed

Two columns fill themselves in:

- **Closed** — the lead's name, phone or email showed up on a booking
- **Recontact Needed** — sat in Contacted for 3 days with nothing happening

Old leads are **archived**, not deleted. The "Archived" button brings them back.

---

## Money

- **Cash, Venmo, Zelle, Cash App, PayPal** — always work
- **Card** — through Stripe on the pay page, tip included

> **Stripe is in TEST mode right now.** A customer can pay by card, see a success
> screen, and you get nothing. Check Settings → Payments. It says so in red.

---

## Texts

Nothing texts yet. Twilio has to approve the number for business texting first
(A2P registration).

Until then messages are held back on purpose rather than sent and quietly
dropped by the phone carriers. Check Settings → Text Messages.

When approved: add `SMS_ENABLED=1` in Vercel and redeploy.

---

## Google Ads

Anyone arriving from an ad is tagged automatically. Their lead shows **GOOGLE**
as the source with the campaign name, so you can see what the spend bought.

Remembered for 90 days, so it still counts if they enquire a week later.

---

## Things that will bite you

**Never add a `public/` folder to the website repo.** Vercel then serves only
that folder and every page 404s. It took the whole site down once.

**Two Supabase projects exist.** Migrations go to `janzjvhkpiminuscxzzv` only.

**Vercel crons must be daily.** More often and Vercel silently refuses to deploy
at all, with nothing in the dashboard to show why.

**Dates are Denver time, not UTC.** Use `lib/today.ts`. Doing it the obvious way
makes the CRM think it is tomorrow after 6pm.
