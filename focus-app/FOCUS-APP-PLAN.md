# FocusFlow — Plan

> Working name: **FocusFlow** (placeholder — rename freely; alt ideas: *Cadence, Momentum, DeepDesk, Kaaj (কাজ), Mono (মনো)*).
> A personal focus + routine + time-tracking **Tauri desktop app** that syncs into the existing **webdevarif dashboard**.

---

## 1. Goal (why this exists)

Owner (Arif) is losing focus during work. FocusFlow should:

1. Let him lay out his **daily routine / tasks with time blocks**.
2. Start a **focus session** on a task for a chosen duration (e.g. 30 min).
3. Show a **timer on the desktop** — including a small **always-on-top floating overlay** — to keep him in flow.
4. When the timer ends, **pop up**: *"Continue, or take a break?"* → on break, pick the next task.
5. **Log every session**: which task, when started, when stopped, break vs continue.
6. Give a **daily count/summary** of what he actually did → and push it to the **dashboard** so focus data lives alongside the rest of his work.

Non-goal: a team/billing tool. This is single-user, personal, deep-work focused.

---

## 2. Key product decisions

- **Build lean & custom — do NOT fork Super Productivity.** SP already does all this but is huge and local-first (WebDAV sync). Our differentiator is *native integration with the webdevarif dashboard*, so a small purpose-built app that syncs to our own API is the right call.
- **Flowtime, not strict Pomodoro.** User sets the duration per session (SP calls this "Flowmodoro"). Keep 25/5 as a preset, not a rule.
- **Offline-first.** The app must work with no network; sync to the dashboard is a background push. Local SQLite is the source of truth on the device.
- **One data model** shared between app (SQLite) and dashboard (Postgres) so sync is a dumb upsert.
- **Reuse the webdevarif identity** — dark bg `#080808`, lime `#baff04`, mono/terminal aesthetic — so it feels like part of the family (mirror the dashboard's design tokens).

---

## 3. Reference apps (studied — what to steal)

| Repo | Stack | Steal |
|---|---|---|
| [super-productivity](https://github.com/super-productivity/super-productivity) (MIT) | Electron/Angular | Overall UX; task-linked time tracking; work-log & report model; Flowtime |
| [ahmmed29/jamrah](https://github.com/ahmmed29/jamrah) | Electron + SQLite | **Session timeline + daily history** data model; Sync section |
| [splode/pomotroid](https://github.com/splode/pomotroid) | **Tauri 2 + Rust + Svelte** | Daily/weekly stats + **52-week heatmap**; a WebSocket API for integrations |
| [shakibdshy/Kairos-Pomodoro](https://github.com/shakibdshy/Kairos-Pomodoro) | **Tauri + React + TS** | Closest stack to ours; timer + task tracking + local analytics |
| [errortzy/floatingpomodoro](https://github.com/errortzy/floatingpomodoro) | GTK | **Floating always-on-top overlay** (progress ring) + focus/off-task guard |
| [hortonew/pomagotchi](https://github.com/hortonew/pomagotchi) | Tauri 2 | Streak + gamification for motivation |
| [ActivityWatch](https://activitywatch.net/) (MPL-2.0) | — | (Later) auto app/window tracking to *verify* focus sessions |

Self-hosted trackers with server APIs (integration reference): **Kimai, Solidtime, TimeTagger, Traggo**.

---

## 4. Architecture

```
FocusFlow desktop (Tauri 2)
  React + TS + Vite + Tailwind (webdevarif tokens)
   - Main window: routine/tasks, start session, daily summary
   - Floating overlay window: always-on-top mini timer (progress ring)
   - Tray icon + global shortcut (start/pause) + notifications
  Rust core (tauri commands)
   - Timer engine (start/tick/end), session lifecycle
   - Local SQLite (tauri-plugin-sql) = source of truth on device
   - Sync worker: batch-push unsynced sessions -> dashboard API (JWT)
        |  HTTPS + Bearer <token>
        v
webdevarif dashboard (Next.js)
  POST /api/focus/sessions   (upsert batch, idempotent by clientId)
  GET  /api/focus/summary    (daily/weekly aggregates for the app, optional)
  Postgres (drizzle): focus_sessions, focus_tasks
  UI: /dashboard/focus - daily focus time, session timeline, streak heatmap
       (reuses PageHeader + StatCard primitives + a chart)
```

**Auth for the desktop client:** reuse the dashboard's JWT (same pattern as BizVoice -> BizGrowHub). A one-time browser-login or a device token stored encrypted in the Tauri store; the sync worker sends `Authorization: Bearer <token>`.

---

## 5. Data model (shared)

```ts
// A single focus (or break) session — the atomic unit.
focus_sessions {
  id            uuid            // generated on device
  clientId      text unique     // device-generated; idempotency key for sync
  userId        uuid            // dashboard user (server-side)
  taskId        uuid | null     // -> focus_tasks (optional)
  taskLabel     text            // denormalized so the log is readable even w/o a task
  projectId     uuid | null     // optional link to dashboard projects/shopify apps
  kind          'focus' | 'break'
  plannedMin    integer         // what they set (e.g. 30)
  startedAt     timestamptz
  endedAt       timestamptz | null
  actualSec     integer         // real focused seconds (idle-trimmed)
  status        'completed' | 'extended' | 'abandoned' | 'running'
  note          text | null
  source        text            // 'focusflow-desktop'
  createdAt / updatedAt / syncedAt
}

// Optional routine/task catalog (can start app-only, later dashboard-managed).
focus_tasks {
  id uuid, userId uuid, label text, plannedMin int | null,
  routineOrder int | null, active boolean, createdAt
}
```

Sync = client posts a batch of sessions where `syncedAt is null`; server upserts by `clientId`; client stamps `syncedAt` on ack. Conflict-free because the device owns each row.

---

## 6. Core UX flows

1. **Plan** — see today's routine (tasks + planned minutes). Add/edit tasks.
2. **Start** — pick a task, set duration (default = task's plannedMin or 30), hit Start -> a `focus` session opens (`status: running`) + the floating overlay appears.
3. **Overlay** — small always-on-top ring + remaining time; drag anywhere; click = focus main window; right-click = pause/stop.
4. **Idle guard** — if no keyboard/mouse for N min while running, prompt "still working?" so time isn't inflated (trim `actualSec`).
5. **End** — at 0:00, notification + a modal: **Continue** (extend same task -> `extended`) / **Break** (close session `completed`, start a `break`, then pick next task) / **Stop**.
6. **Daily summary** — end-of-day card: total focus time, # sessions, per-task breakdown, streak. Same data renders on the dashboard's Focus page.

---

## 7. Tauri specifics (reuse BizVoice/Appweave know-how)

- **Tauri 2**, Rust core. `tauri-plugin-sql` (SQLite), `tauri-plugin-notification`, `tauri-plugin-global-shortcut`, `tauri-plugin-autostart`, `tauri-plugin-single-instance`, `tauri-plugin-store` (token), `tauri-plugin-updater`.
- **Two windows**: `main` + `overlay` (`alwaysOnTop: true`, `decorations: false`, `skipTaskbar: true`, small, transparent).
- **Signed build/updater**: reuse the BizVoice `scripts/build.mjs` pattern (load `TAURI_SIGNING_PRIVATE_KEY` from the key file; no password) so `npm run build` produces a signed installer.
- **Gotchas already learned** (see memories): don't block a sync `#[tauri::command]` on a parented dialog (deadlock -> use async + oneshot); on Windows `npm run tauri -- dev`, not `npm run dev`.

---

## 8. Dashboard integration (in the dashboard repo)

- **Migration**: new `focus_sessions` + `focus_tasks` tables (drizzle) — follow the adopted-migration discipline (baseline is set; add as `00NN_focus`).
- **API**: `app/api/focus/sessions/route.ts` (POST batch upsert, GET list) + `app/api/focus/summary/route.ts` — mirror the existing `/api/bizvoice/history` + funnel-sync auth style.
- **UI**: `app/(app)/dashboard/(workspace)/focus/page.tsx` — reuses the new **PageHeader** + **StatCard** primitives; add a **streak heatmap** + a daily-focus bar chart (InstallChart is a reference). Add a sidebar leaf under "Workspace".
- Optional: link a session's `projectId` to the existing projects / shopify apps so "time spent per project" shows on those pages too.

---

## 9. Phase plan

- **P0 — MVP, local-only (usable immediately):** Tauri scaffold · SQLite schema · timer engine · main window (pick task, set duration, start) · **floating overlay** · end popup (continue/break/stop) · session logging · daily summary. Signed build.
- **P1 — Dashboard sync:** `focus_sessions` migration + `/api/focus/sessions` + JWT device auth + background sync worker (offline queue).
- **P2 — Dashboard analytics:** `/dashboard/focus` page (daily/weekly focus time, session timeline, streak heatmap) using the design-system primitives.
- **P3 — Routine planning:** manage the day's routine on the dashboard -> app pulls it and suggests the next task.
- **P4 — Polish:** streak/gamification, idle/off-task guard (ActivityWatch-style, optional), full keyboard flow, sound themes.

---

## 10. Tech stack

| Layer | Choice |
|---|---|
| Desktop | Tauri 2, Rust core |
| Desktop UI | React 18 + TS + Vite + Tailwind (webdevarif tokens) |
| Local store | SQLite via `tauri-plugin-sql` |
| Dashboard | existing Next.js + drizzle + Postgres |
| Auth | dashboard JWT (Bearer), device token in encrypted Tauri store |

---

## 11. Open questions / decisions

- [ ] **Name** (FocusFlow placeholder).
- [ ] MVP: local-only first (recommended) vs sync from day one?
- [ ] Overlay style: minimal ring vs pomagotchi-style gamified?
- [ ] Where does routine live first — app-only, or dashboard-managed from the start?
- [ ] Repo: standalone `focus-app/` (like BizVoice) — confirmed default.
