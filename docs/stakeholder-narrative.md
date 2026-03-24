# Stakeholder narrative — what we built vs what gets wired later

This file is the **single place** to answer: *“Is this only a front end?”* and *“Where is the 26-week story?”*

## Short answer

- **No — it is not “just a front end.”** This repository is a **full-stack product**: API, domain rules, SQL, auth model, observatory analytics, and a **Module Federation** remote that can mount inside a host app.
- **Yes — the 26-week narrative exists** and is written down for demo and seed intent: see **`docs/scenario-bible.md`** (half-year Meridian arc, personas, week-by-week beats, drift and alignment themes).
- **Integration work** (PA host auth handoff, corporate IdP / 15Five-style directory, mapping enterprise roles into `UserRole`, loading data from an external system of record) is **real work**, but it is **boundary and mapping** work — not “the product is missing.”

If someone only asked for a **static UI shell**, this repo **overshoots** that ask on purpose: the spec was **production-ready weekly execution + observability**, not a Figma playback.

---

## Where the 26-week “drift and alignment” story lives

| Asset | Purpose |
|--------|---------|
| **`docs/scenario-bible.md`** | Canonical **26-week narrative** (Jan–June 2026): orgs, personas, arcs (Elena’s team, Wei’s ERP drift, displacement, Robert sandbagged, etc.), week milestones (e.g. week 16 crisis, week 18 intervention), and what the **seed data is supposed to encode** so drift/alignment/carry-forward are visible in the observatory. |
| **`docs/scenario-scripts/`** | Harness + format for persona/week scripts; use with the bible for scripted demos. |
| **Seed / observatory data** | Backend `seed/` + observatory-scale flags — implements the **data** side of the story where the build is complete. |

**For future readers (including AI agents):** start with **`scenario-bible.md`** for the week-by-week story; use **`dev-log.md`** for implementation history (e.g. commitment **History lineage** UI).

---

## What is “in the box” vs “integration later”

| Capability | In this repo? | Notes |
|------------|----------------|--------|
| Weekly commit CRUD, RCDO linking, CHESS, lifecycle, reconciliation | Yes | Core domain |
| Manager / exec / portfolio / observatory views | Yes | Role-gated |
| Drift, displacement, alignment signals (where implemented) | Yes | See observatory + scenario bible intent |
| Commitment **history / chain** (lineage API + History UI) | Yes | `docs/dev-log.md`, `GET /commitments/{id}/lineage` |
| **Micro-frontend** remote (`compass/App`, shared deps) | Yes | Host must mount and pass `authContext` + `basename` |
| **Auth handoff from real PA app** | Contract defined, wiring per environment | `App` expects `authContext`; host supplies token + identity props |
| **Drop-in roles from 15Five / enterprise DB** | Not automatic | `UserRole` enum is **Compass’s**; map IdP / HR roles to it at integration time |
| **One-click import from 15Five production DB** | Not a single button | Any external system needs ETL and field mapping; **not** required to prove product value in a demo |

---

## Talking points if the concern is “we only wanted the front end”

1. **The ask was a production-ready *module* replacing 15-Five-style workflow** — that implies **behavior**, **persistence**, and **visibility**, not only pixels.
2. **The UI is already built to sit inside the host** (Module Federation) — that *is* the “front end” delivery shape; the **same** codebase also **is** the backend and rules engine.
3. **Enterprise data** (15Five, Workday, custom IdP) is always **integration** — different schema, different roles. **Mapping** is a project phase, not a missing feature list.
4. **The demo narrative** (26 weeks, drift, rally cry alignment, troublesome vs healthy teams) is **documented** in `scenario-bible.md` and can be **shown** with seed + scripted flows — **no need to clone 15Five** to prove product sense.

---

## What not to worry about until the customer contract is clear

- **Exact role names** from external IdP — keep Compass’s `UserRole` ladder; add a **mapping table** when you know their groups.
- **Parity with 15Five’s database** — not required for a demo; **story + credible data** beat schema cloning.

---

## One-line pitch

**“We ship the full execution loop and observability in one codebase; the host plugs in identity and token, and any enterprise directory or legacy app connects through mapping and ETL — the capability you want lives here.”**
