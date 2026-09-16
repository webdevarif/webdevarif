import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  clearSyncConfig,
  getSyncConfig,
  pushSessions,
  saveSyncConfig,
  type SyncConfig,
  type SyncSession,
} from "./sync";
import "./App.css";

// ─── FocusFlow — P0 (local-only MVP) ────────────────────────────────
// Set a task + duration → run a focus timer → at 0:00 choose Continue /
// Break / Stop → every session is logged (localStorage for now; SQLite in P1)
// → today's summary. Flowtime model: you pick the minutes.

type Kind = "focus" | "break";
type Status = "completed" | "extended" | "abandoned";

type Session = {
  id: string;
  task: string;
  kind: Kind;
  plannedMin: number;
  startedAt: string; // ISO
  endedAt: string; // ISO
  actualSec: number;
  status: Status;
  syncedAt?: string; // ISO — set once the dashboard acknowledges it
};

type Phase = "idle" | "running" | "paused" | "ended";

const STORE_KEY = "focusflow.sessions";
const PRESETS = [25, 30, 50];
const BREAK_MIN = 5;

const uid = () =>
  `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function loadSessions(): Session[] {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]") as Session[];
  } catch {
    return [];
  }
}

// A short beep so the end is noticeable without native notification deps.
function beep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.06;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => ctx.close();
  } catch {
    /* audio not available — the modal is the primary signal */
  }
}

// Bridge to the Tauri core. No-ops in a plain browser (`npm run dev`) where
// `invoke` rejects — the app stays fully usable as a web page.
const pinWindow = (on: boolean) => {
  invoke("pin_window", { on }).catch(() => {});
};
const alertWindow = () => {
  invoke("alert_window").catch(() => {});
};

const toSync = (s: Session): SyncSession => ({
  clientId: s.id,
  task: s.task,
  kind: s.kind,
  plannedMin: s.plannedMin,
  actualSec: s.actualSec,
  status: s.status,
  startedAt: s.startedAt,
  endedAt: s.endedAt,
});

function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [kind, setKind] = useState<Kind>("focus");
  const [task, setTask] = useState("");
  const [plannedMin, setPlannedMin] = useState(30);
  const [remaining, setRemaining] = useState(30 * 60);
  const [sessions, setSessions] = useState<Session[]>(() => loadSessions());
  const startedAtRef = useRef<string>("");
  const [syncCfg, setSyncCfg] = useState<SyncConfig | null>(() =>
    getSyncConfig(),
  );
  const [showSync, setShowSync] = useState(false);
  const [draftUrl, setDraftUrl] = useState(syncCfg?.baseUrl ?? "");
  const [draftKey, setDraftKey] = useState(syncCfg?.apiKey ?? "");
  const [syncMsg, setSyncMsg] = useState("");
  const syncingRef = useRef(false);

  // Persist whenever the log changes.
  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  // Tick.
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          setPhase("ended");
          beep();
          alertWindow();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Reflect state in the window title.
  useEffect(() => {
    document.title =
      phase === "running" || phase === "paused"
        ? `${fmt(remaining)} · ${task || (kind === "break" ? "Break" : "Focus")} — FocusFlow`
        : "FocusFlow";
  }, [phase, remaining, task, kind]);

  // Float the window above other apps while a session is active; drop back to a
  // normal window when idle so it doesn't get in the way between sessions.
  useEffect(() => {
    pinWindow(phase !== "idle");
  }, [phase]);

  // Push not-yet-acknowledged sessions to the dashboard. The server dedupes by
  // clientId, so mount-time backlog flush, per-log push, and reconnect are all
  // safe to retry. A ref guards against overlapping runs (incl. StrictMode).
  useEffect(() => {
    if (!syncCfg) return;
    const pending = sessions.filter((s) => !s.syncedAt);
    if (pending.length === 0 || syncingRef.current) return;
    syncingRef.current = true;
    setSyncMsg("syncing…");
    pushSessions(syncCfg, pending.map(toSync))
      .then((r) => {
        if (r.ok) {
          const ack = new Set(r.acknowledged);
          const at = new Date().toISOString();
          setSessions((prev) =>
            prev.map((s) => (ack.has(s.id) ? { ...s, syncedAt: at } : s)),
          );
          setSyncMsg("");
        } else {
          setSyncMsg(r.error);
        }
      })
      .finally(() => {
        syncingRef.current = false;
      });
  }, [sessions, syncCfg]);

  const today = todayKey();
  const todays = useMemo(
    () => sessions.filter((s) => todayKey(new Date(s.startedAt)) === today),
    [sessions, today],
  );
  const focusSecToday = todays
    .filter((s) => s.kind === "focus")
    .reduce((a, s) => a + s.actualSec, 0);

  function startFocus(min = plannedMin) {
    setKind("focus");
    setPlannedMin(min);
    setRemaining(min * 60);
    startedAtRef.current = new Date().toISOString();
    setPhase("running");
  }

  function log(status: Status, elapsedSec: number) {
    const entry: Session = {
      id: uid(),
      task: task || (kind === "break" ? "Break" : "Untitled"),
      kind,
      plannedMin,
      startedAt: startedAtRef.current || new Date().toISOString(),
      endedAt: new Date().toISOString(),
      actualSec: Math.max(0, Math.round(elapsedSec)),
      status,
    };
    setSessions((prev) => [entry, ...prev]);
  }

  const elapsed = () => plannedMin * 60 - remaining;

  function stop() {
    log(remaining <= 1 ? "completed" : "abandoned", elapsed());
    setPhase("idle");
    setRemaining(plannedMin * 60);
    setKind("focus");
  }

  function onContinue() {
    log("extended", plannedMin * 60);
    startedAtRef.current = new Date().toISOString();
    setRemaining(plannedMin * 60);
    setPhase("running");
  }

  function onBreak() {
    log("completed", plannedMin * 60);
    setKind("break");
    setPlannedMin(BREAK_MIN);
    setRemaining(BREAK_MIN * 60);
    startedAtRef.current = new Date().toISOString();
    setPhase("running");
  }

  function onEndStop() {
    log("completed", plannedMin * 60);
    setPhase("idle");
    setKind("focus");
    setRemaining(30 * 60);
  }

  function onSaveSync() {
    const url = draftUrl.trim().replace(/\/+$/, "");
    const key = draftKey.trim();
    if (!url || !key) {
      setSyncMsg("url and key required");
      return;
    }
    saveSyncConfig(url, key);
    setSyncCfg({ baseUrl: url, apiKey: key });
    setShowSync(false);
  }

  async function onLogin() {
    const url = draftUrl.trim().replace(/\/+$/, "");
    if (!url) {
      setSyncMsg("enter your dashboard url first");
      return;
    }
    setSyncMsg("opening browser… approve in the dashboard");
    try {
      const state =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      const token = await invoke<string>("login_via_dashboard", {
        dashboardUrl: url,
        state,
      });
      saveSyncConfig(url, token);
      setSyncCfg({ baseUrl: url, apiKey: token });
      setDraftKey(token);
      setShowSync(false);
      setSyncMsg("");
    } catch (e) {
      setSyncMsg(
        typeof e === "string" ? e : "login failed — run the app via tauri dev",
      );
    }
  }

  function onDisconnect() {
    clearSyncConfig();
    setSyncCfg(null);
    setSyncMsg("");
  }

  const running = phase === "running" || phase === "paused";
  const unsynced = sessions.filter((s) => !s.syncedAt).length;
  const syncHost = (() => {
    if (!syncCfg) return "";
    try {
      return new URL(syncCfg.baseUrl).host;
    } catch {
      return syncCfg.baseUrl;
    }
  })();

  return (
    <main className="app">
      <p className="eyebrow">— focusflow · deep work</p>

      {phase === "idle" ? (
        <section className="card start">
          <label className="label">what are you working on?</label>
          <input
            className="task-input"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="e.g. GoFitment bulk-ingestion fix"
            autoFocus
          />

          <label className="label mt">for how long?</label>
          <div className="presets">
            {PRESETS.map((m) => (
              <button
                key={m}
                className={`chip ${plannedMin === m ? "chip-on" : ""}`}
                onClick={() => {
                  setPlannedMin(m);
                  setRemaining(m * 60);
                }}
              >
                {m}m
              </button>
            ))}
            <input
              className="chip chip-num"
              type="number"
              min={1}
              max={180}
              value={plannedMin}
              onChange={(e) => {
                const m = Math.max(1, Math.min(180, Number(e.target.value) || 1));
                setPlannedMin(m);
                setRemaining(m * 60);
              }}
            />
          </div>

          <button className="btn btn-primary mt-lg" onClick={() => startFocus()}>
            Start focus →
          </button>
        </section>
      ) : (
        <section className="card timer-card">
          <p className="timer-task">
            {kind === "break" ? "// break" : `// ${task || "focus"}`}
          </p>
          <p className={`timer ${kind === "break" ? "timer-break" : ""}`}>
            {fmt(remaining)}
          </p>
          <div className="row">
            {phase === "running" ? (
              <button className="btn" onClick={() => setPhase("paused")}>
                Pause
              </button>
            ) : phase === "paused" ? (
              <button className="btn" onClick={() => setPhase("running")}>
                Resume
              </button>
            ) : null}
            {running ? (
              <button className="btn btn-stop" onClick={stop}>
                Stop
              </button>
            ) : null}
          </div>
        </section>
      )}

      {/* Today's log */}
      <section className="log">
        <div className="log-head">
          <span className="label">today</span>
          <span className="stat">
            {fmt(focusSecToday)} focused ·{" "}
            {todays.filter((s) => s.kind === "focus").length} sessions
          </span>
        </div>
        {todays.length === 0 ? (
          <p className="empty">// nothing logged yet — start a session above</p>
        ) : (
          <ul className="rows">
            {todays.map((s) => (
              <li key={s.id} className="srow">
                <span className="srow-task">
                  {s.kind === "break" ? "☕ break" : s.task}
                </span>
                <span className="srow-meta">
                  {fmt(s.actualSec)} · {s.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Dashboard sync */}
      <section className="sync">
        <button className="sync-toggle" onClick={() => setShowSync((v) => !v)}>
          <span className={`dot ${syncCfg ? "dot-on" : ""}`} />
          {syncCfg ? `dashboard · ${syncHost}` : "connect to dashboard"}
          {syncMsg
            ? ` · ${syncMsg}`
            : syncCfg && unsynced
              ? ` · ${unsynced} pending`
              : syncCfg
                ? " · synced"
                : ""}
        </button>
        {showSync ? (
          <div className="sync-panel">
            <label className="label">dashboard url</label>
            <input
              className="task-input"
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              placeholder="http://localhost:3000"
              autoComplete="off"
            />
            <button className="btn btn-primary mt" onClick={onLogin}>
              Login with dashboard →
            </button>
            <p className="hint">
              Opens your browser to sign in &amp; approve — no key to copy.
            </p>

            <div className="divider">or paste a key manually</div>

            <label className="label">api key · scope focus:write</label>
            <input
              className="task-input"
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
              placeholder="tm_…"
              type="password"
              autoComplete="off"
            />
            <div className="sync-actions">
              <button className="btn" onClick={onSaveSync}>
                Save key
              </button>
              {syncCfg ? (
                <button className="btn btn-ghost" onClick={onDisconnect}>
                  Disconnect
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      {/* End-of-session popup */}
      {phase === "ended" ? (
        <div className="backdrop">
          <div className="modal">
            <p className="eyebrow">
              {kind === "break" ? "break over" : "time's up"}
            </p>
            <h2 className="modal-title">
              {kind === "break" ? "Back to it?" : "Keep going or take a break?"}
            </h2>
            <div className="modal-actions">
              {kind === "break" ? (
                <button className="btn btn-primary" onClick={onEndStop}>
                  Start next task
                </button>
              ) : (
                <>
                  <button className="btn btn-primary" onClick={onContinue}>
                    Continue (+{plannedMin}m)
                  </button>
                  <button className="btn" onClick={onBreak}>
                    Break ({BREAK_MIN}m)
                  </button>
                </>
              )}
              <button className="btn btn-ghost" onClick={onEndStop}>
                Stop
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default App;
