import { invoke } from "@tauri-apps/api/core";

const POLL_INTERVAL_MS = 1000;

function dumpLocalStorage(): string {
  const data: Record<string, string> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key !== null) data[key] = window.localStorage.getItem(key) ?? "";
  }
  return JSON.stringify(data);
}

export async function initPortableStorage() {
  let raw: string;
  try {
    raw = await invoke<string>("load_storage");
  } catch {
    // not running inside Tauri (e.g. plain web build): nothing to bridge
    return;
  }

  try {
    const data = JSON.parse(raw) as Record<string, string>;
    for (const [key, value] of Object.entries(data)) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // ignore: corrupt portable file, fall back to whatever localStorage already has
  }

  // WebKit's localStorage cannot be reliably monkey-patched (it's a legacy
  // platform object), so we poll for changes and write them to the portable
  // file instead of intercepting setItem/removeItem/clear.
  let lastDump = dumpLocalStorage();
  setInterval(() => {
    const current = dumpLocalStorage();
    if (current === lastDump) return;
    lastDump = current;
    invoke("save_storage", { contents: current }).catch(() => {
      // ignore: portable save is best-effort
    });
  }, POLL_INTERVAL_MS);
}
