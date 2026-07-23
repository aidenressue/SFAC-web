# Shine for a Cause — Website (shineforacause.com)

Public marketing site. Plain HTML/CSS/JS, no framework. Deploys to Vercel on push.

## Handling multi-part requests (required)

The user often sends one message containing many separate requests. Before doing anything:

1. **Read the entire prompt first**, start to finish. Do not begin acting on the first sentence before you've read the rest.
2. **Break it into an explicit checklist of distinct tasks** — one line per request, including small ones buried mid-sentence.
3. **Work the independent pieces simultaneously**, not one-by-one. Fire all image generations in parallel up front (they take the longest), and batch independent file edits in the same turn while they render.
4. **Account for every item before reporting done.** Re-read the original message and confirm each checklist item was actually completed. Missing a request is the #1 thing to avoid.

## Homepage redesign (in progress)

- Work happens on the **`homepage-redesign`** branch in `home-new.html`.
- The live homepage is `index.html` — **do not edit it** during the redesign. Content gets migrated from it into `home-new.html` as the draft is finalized.
- The booking flow (`booking.html`) and quote builder (`quote-builder.html`) are **off-limits** — link into them, don't modify them.

## Preview server

- A small Node preview server runs on **http://localhost:3001** (`.preview-server.mjs`).
- It maps `/` (and `/index.html`) to `home-new.html` so a refresh always lands on the redesign draft. All other assets serve normally.
- If it's not running, start it: `node .preview-server.mjs` (from the repo root, background it).
- Port 3000 is the user's own server — always use 3001.

## ALWAYS screenshot to verify visual changes (required workflow)

After every visual/layout/CSS change, **take a screenshot with Puppeteer and actually look at it** before reporting done. Do not rely on reading the code alone.

- **Take as many screenshots as you need to verify a change is right** (the user is on the Pro plan, so credits are not a constraint). Capture multiple angles when relevant: desktop AND mobile, before/after states, each step of a flow, hover/active states, and both breakpoints. Prefer verifying visually over assuming from the code. Still aim each capture carefully (a document-relative `clip` of the target section, or drive the UI to the state first) so each shot is informative.

- Puppeteer is installed in this repo (`node_modules`), so run the script **from the repo root**.
- Use **`headless: 'shell'`** (the old headless) for screenshots — the newer `headless: 'new'` has a compositor bug that renders `backdrop-filter`/glass/`isolation` layers as falsely translucent in screenshots. `shell` matches real browsers.
- `page.screenshot({ clip })` coordinates are **document-relative, not viewport-relative** — to capture what's actually visible after scrolling, screenshot the full viewport (no clip) or account for scroll offset.
- Default to **desktop (1440px)** for the single verification shot. Only add **mobile (390px)** when the user asks for it or a change is mobile-specific.
- For interactive things (dropdowns, tabs, accordion, sticky nav), drive them with `page.hover`/`page.click`/`page.evaluate(scrollTo)` and screenshot the result. Also verify with `elementFromPoint` / `getBoundingClientRect` when stacking or above-the-fold visibility matters.
- Write the throwaway script to a dotfile at repo root (e.g. `.shot.mjs`), run it, then delete it so it isn't committed.

Example:
```js
import puppeteer from 'puppeteer';
const b = await puppeteer.launch({ headless: 'shell' });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 820 });
await p.goto('http://127.0.0.1:3001/', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 400));
await p.screenshot({ path: '/tmp/shot.png' });          // viewport
await b.close();
```

## Brand / design (redesign)

- Light/white theme. Gold accent `#C9973A` (deep `#A87B27`). Ink `#101112`.
- Fonts: Archivo (display/headings/nav) + Instrument Sans (body).
- Nav is a floating frosted-glass "bubble": glass effect is on `.nav-inner::before` (NOT the element itself, so dropdowns stay opaque). `overflow-x: clip` on body (not `hidden`) so `position: sticky` works.
- Logo: `brand_assets/logo-nav.png` (transparent, black+gold, for light backgrounds).
- Real content (service names, pricing, reviews, areas) comes from `index.html`.

## Copy / writing (required)

- Never use em dashes (—) in copy. They read as AI-written. Use a period, comma, colon, or parentheses instead. This applies to all reader-facing text: body copy, headings, labels, meta descriptions, alt text.

## Scope discipline (required)

Carry out **exactly** what the user asks — nothing more. Do not add extra features, sections, copy, styling, or "nice to have" enhancements unless explicitly told to. If a change seems to invite an obvious addition, mention it as a suggestion but do not implement it without the go-ahead.

## Commit convention

Commit each discrete change on the `homepage-redesign` branch with a short message. Only push when the user asks.
