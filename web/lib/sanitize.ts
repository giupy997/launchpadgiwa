/** Creator-supplied metadata is untrusted: only render URLs with safe schemes. */

/** For <a href>: http(s) only. Returns null when unsafe/empty. */
export function safeLink(url: string): string | null {
  const u = url.trim();
  if (!u) return null;
  try {
    const parsed = new URL(u);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
  } catch {
    // no scheme: treat as https://<value> if it looks like a host
    if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(u)) return `https://${u}`;
  }
  return null;
}

/** For <img src>: http(s), data:image/*, or ipfs:// (rewritten to a gateway). */
export function safeLogo(url: string): string | null {
  const u = url.trim();
  if (!u) return null;
  if (u.startsWith("data:image/")) return u;
  if (u.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${u.slice(7)}`;
  try {
    const parsed = new URL(u);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
  } catch {
    /* fall through */
  }
  return null;
}
