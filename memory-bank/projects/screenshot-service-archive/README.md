# Screenshot Service Archive

Archived 2026-04-28 as part of Loupe sunset. Source for what `SCREENSHOT_SERVICE_URL` used to point at.

## What it was

A single-purpose Vultr VPS running a Node + Puppeteer (with `puppeteer-extra-plugin-stealth`) HTTP service. Took a URL, returned a PNG screenshot, optionally through a Decodo residential proxy. Used by Loupe's daily scan + on-demand audit flows.

- **Vultr instance:** `screenshot-service`, ID `69edfdb2-a974-480c-aae6-d5d1e93b24a3`, IP `45.63.3.155`, region `ewr` (New Jersey), plan `vc2-2c-4gb` (~$20/mo)
- **Created:** 2026-01-29
- **Destroyed:** 2026-04-28 (snapshot retained — see below)
- **Snapshot ID:** `798b7f81-d11a-4044-a342-0b1f87ad2d43` ("Loupe screenshot-service final snapshot before sunset")

## Files in this archive

- `server.js` — the entire service (single file, ~11KB). API key on line 13 is redacted; the live key is `SCREENSHOT_API_KEY` in `.env.local`.
- `package.json` — deps: `express`, `puppeteer`, `puppeteer-extra`, `puppeteer-extra-plugin-stealth`.
- `screenshot.service` — systemd unit file (was at `/etc/systemd/system/screenshot.service`).
- `instance-survey.txt` — output of the SSH survey (running services, directory layout).

## Secrets (where they live, not committed here)

All in `.env.local` of the main Loupe repo:
- `SCREENSHOT_API_KEY` — `x-api-key` header the service requires.
- `VULTR_PAT` — Vultr API token for revival/management.
- `VULTR_SCREENSHOT_PASSWORD` — root password for the box (also keyed via `~/.ssh/id_ed25519`).
- Decodo proxy creds — `PROXY_USER` / `PROXY_PASS` were passed via env on the box; see Decodo dashboard.

## Reviving (if Loupe comes back)

Two paths, in increasing fidelity:

1. **Restore from snapshot** — fastest. Spin up a new Vultr instance from snapshot `798b7f81-d11a-4044-a342-0b1f87ad2d43`. Same IP won't return; update `SCREENSHOT_SERVICE_URL` accordingly. Decodo proxy creds stay the same.
2. **Rebuild from these files** — `apt install nodejs npm`, `cd /opt/screenshot-service && npm i`, `cp screenshot.service /etc/systemd/system/`, set env, `systemctl enable --now screenshot`. Plug in a fresh API key and rotate `SCREENSHOT_API_KEY` in `.env.local`.

If reviving for a different angle (not Loupe), worth considering: serverless Playwright (Browserless.io, ScrapingBee, or Vercel's Edge Functions with `@sparticuz/chromium`) — much cheaper for low/spiky volume than a $20/mo always-on VPS.

## Why we shut it down

See `memory-bank/phases/current.md`. TL;DR: Loupe's WAU dropped from 188 → 15 over 8 weeks; only 3 unique users started a new audit in the last 30 days; no marketing engine to fix. Stopping recurring infra cost was step 1 of sunset.
