/**
 * Security gate for the desktop loopback login. The token we mint is only ever
 * handed to a redirect_uri that is a LOOPBACK http callback — never an
 * arbitrary host — so an approval link can't be crafted to exfiltrate a key to
 * a remote server. Used by both the authorize page (render) and the approve
 * server action (the real gate, since it issues the token).
 */
export function isLoopbackCallback(uri: string): boolean {
  try {
    const u = new URL(uri);
    return (
      u.protocol === "http:" &&
      (u.hostname === "127.0.0.1" || u.hostname === "localhost") &&
      u.pathname === "/callback"
    );
  } catch {
    return false;
  }
}
