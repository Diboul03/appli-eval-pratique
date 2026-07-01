import { invoke } from "@tauri-apps/api/core";

export function buildFolderName(promotion: string, ue: string, date: string): string {
  const sanitize = (s: string) =>
    s.replace(/[/\\:*?"<>|]/g, "-").replace(/\s+/g, "_").trim() || "inconnu";
  const [y, m, d] = (date || "").split("-");
  const datePart = d && m && y ? `${d}-${m}-${y.slice(2)}` : (date || "");
  return [sanitize(promotion), sanitize(ue), datePart].filter(Boolean).join("_");
}

export async function saveFileToFolder(
  dirName: string,
  fileName: string,
  content: string | ArrayBuffer,
): Promise<void> {
  const bytes =
    content instanceof ArrayBuffer
      ? Array.from(new Uint8Array(content))
      : Array.from(new TextEncoder().encode(content));

  try {
    await invoke("save_export_file", { dirName, fileName, contents: bytes });
    return;
  } catch {
    // Not in Tauri or failed — fall back to browser download
  }

  const blob =
    content instanceof ArrayBuffer
      ? new Blob([content])
      : new Blob([content], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
