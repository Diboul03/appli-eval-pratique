import { invoke } from "@tauri-apps/api/core";

export function sanitizeFolder(s: string): string {
  return s.replace(/[/\\:*?"<>|]/g, " ").replace(/\s{2,}/g, " ").trim() || "inconnu";
}

/** Dossier archives HTML : "archives eval PROMO UE" */
export function buildArchivesFolder(promotion: string, ue: string): string {
  return sanitizeFolder(`archives eval ${promotion} ${ue}`);
}

/** Retourne le nom du dossier promotion (racine des exports). */
export function buildPromoFolder(promotion: string): string {
  return sanitizeFolder(promotion);
}

/** Dossier pour les récaps de notes : "NOTES PROMO UE" */
export function buildNotesFolder(promotion: string, ue: string): string {
  return sanitizeFolder(`NOTES ${promotion} ${ue}`);
}

/** Dossier pour les BDD : "BDD UE PROMO" */
export function buildBddFolder(ue: string, promotion: string): string {
  return sanitizeFolder(`BDD ${ue} ${promotion}`);
}

/** Construit le nom de fichier pour un export (UE + date). */
export function buildExportFileName(ue: string, date: string, ext: string): string {
  const [y, m, d] = (date || "").split("-");
  const datePart = d && m && y ? `${d}-${m}-${y.slice(2)}` : (date || "");
  return [sanitizeFolder(ue), datePart].filter(Boolean).join("_") + ext;
}

/** @deprecated Utiliser buildPromoFolder + buildExportFileName */
export function buildFolderName(promotion: string, ue: string, date: string): string {
  const [y, m, d] = (date || "").split("-");
  const datePart = d && m && y ? `${d}-${m}-${y.slice(2)}` : (date || "");
  return [sanitizeFolder(promotion), sanitizeFolder(ue), datePart].filter(Boolean).join("_");
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
