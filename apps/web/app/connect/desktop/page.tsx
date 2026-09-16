import { getCurrentUser } from "@/lib/auth/session";

import { approveDesktopConnect } from "./actions";
import { isLoopbackCallback } from "./validate";

export const dynamic = "force-dynamic";

// Standalone page — the desktop app opens this in the user's browser. Styled
// inline so it renders correctly without the dashboard's app-shell providers.
const wrap: React.CSSProperties = {
  minHeight: "100vh",
  margin: 0,
  display: "grid",
  placeItems: "center",
  background: "#080808",
  color: "#ededed",
  fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
  padding: "24px",
};
const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  border: "1px solid #252525",
  background: "#141414",
  borderRadius: 14,
  padding: 28,
};
const eyebrow: React.CSSProperties = {
  margin: 0,
  fontFamily: "ui-monospace, Menlo, Consolas, monospace",
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#8a8a8a",
};
const muted: React.CSSProperties = {
  color: "#8a8a8a",
  fontSize: 13,
  lineHeight: 1.6,
};
const button: React.CSSProperties = {
  width: "100%",
  marginTop: 20,
  padding: "12px 18px",
  borderRadius: 10,
  border: "1px solid #baff04",
  background: "#baff04",
  color: "#000",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};
const link: React.CSSProperties = {
  display: "inline-block",
  marginTop: 18,
  color: "#baff04",
  textDecoration: "none",
  fontWeight: 600,
};

export default async function ConnectDesktopPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_uri?: string; state?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const redirectUri = sp.redirect_uri ?? "";
  const state = sp.state ?? "";

  if (!isLoopbackCallback(redirectUri) || !state) {
    return (
      <main style={wrap}>
        <div style={card}>
          <p style={eyebrow}>focusflow</p>
          <h1 style={{ fontSize: 20, margin: "10px 0 8px" }}>
            Invalid connection request
          </h1>
          <p style={muted}>
            This link is missing or has an unsafe callback. Open FocusFlow and
            click <b>Login with dashboard</b> again.
          </p>
        </div>
      </main>
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return (
      <main style={wrap}>
        <div style={card}>
          <p style={eyebrow}>focusflow</p>
          <h1 style={{ fontSize: 20, margin: "10px 0 8px" }}>
            Sign in to connect
          </h1>
          <p style={muted}>
            You&apos;re not signed in to the dashboard. Sign in, then return to
            FocusFlow and click <b>Login with dashboard</b> again.
          </p>
          <a style={link} href="/sign-in">
            Sign in →
          </a>
        </div>
      </main>
    );
  }

  return (
    <main style={wrap}>
      <div style={card}>
        <p style={eyebrow}>focusflow · connect</p>
        <h1 style={{ fontSize: 20, margin: "10px 0 8px" }}>
          Connect FocusFlow Desktop
        </h1>
        <p style={muted}>
          Authorize <b>FocusFlow</b> to sync your focus sessions to{" "}
          <b style={{ color: "#ededed" }}>{user.email}</b>.
        </p>
        <form action={approveDesktopConnect}>
          <input type="hidden" name="redirect_uri" value={redirectUri} />
          <input type="hidden" name="state" value={state} />
          <button type="submit" style={button}>
            Approve &amp; connect
          </button>
        </form>
        <p style={{ ...muted, marginTop: 16, fontSize: 12 }}>
          Creates a “FocusFlow Desktop” key with focus scopes only. Revoke it
          anytime in Settings → API Keys.
        </p>
      </div>
    </main>
  );
}
