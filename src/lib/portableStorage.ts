import { invoke } from "@tauri-apps/api/core";

const isTauri = "__TAURI_INTERNALS__" in window;

let writeTimer: ReturnType<typeof setTimeout> | null = null;

function dumpLocalStorage(): string {
  const data: Record<string, string> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key !== null) data[key] = window.localStorage.getItem(key) ?? "";
  }
  return JSON.stringify(data);
}

function scheduleSave() {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    invoke("save_storage", { contents: dumpLocalStorage() }).catch(() => {
      // ignore: portable save is best-effort
    });
  }, 300);
}

export async function initPortableStorage() {
  if (!isTauri) return;

  try {
    const raw = await invoke<string>("load_storage");
    const data = JSON.parse(raw) as Record<string, string>;
    for (const [key, value] of Object.entries(data)) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // ignore: fall back to whatever localStorage already has
  }

  const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
  const originalRemoveItem = window.localStorage.removeItem.bind(window.localStorage);
  const originalClear = window.localStorage.clear.bind(window.localStorage);

  window.localStorage.setItem = (key, value) => {
    originalSetItem(key, value);
    scheduleSave();
  };
  window.localStorage.removeItem = (key) => {
    originalRemoveItem(key);
    scheduleSave();
  };
  window.localStorage.clear = () => {
    originalClear();
    scheduleSave();
  };
}
