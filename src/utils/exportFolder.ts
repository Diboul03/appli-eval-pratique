import { invoke } from "@tauri-apps/api/core";

export function sanitizeFolder(s: string): string {
  return s.replace(/[/\\:*?"<>|]/g, " ").replace(/\s{2,}/g, " ").trim() || "inconnu";
}

/**
 * BDD : appli-eval-pratique-data/bdd/{ue}/
 * Un seul répertoire BDD général, sous-dossier par UE.
 */
export function buildBddPath(ue: string): string {
  return `bdd/${sanitizeFolder(ue)}`;
}

/**
 * Notes : appli-eval-pratique-data/notes/{promo}/{sessionDate}/{ue}/
 * sessionDate = YYYY-MM-DD de la session d'éval.
 */
export function buildNotesPath(promo: string, sessionDate: string, ue: string): string {
  return `notes/${sanitizeFolder(promo)}/${sessionDate}/${sanitizeFolder(ue)}`;
}

/**
 * Archives : appli-eval-pratique-data/archives/{promo}/{ue}/
 * Contient un fichier par étudiant + le fichier promotion complète.
 */
export function buildArchivesPath(promo: string, ue: string): string {
  return `archives/${sanitizeFolder(promo)}/${sanitizeFolder(ue)}`;
}

/** Construit le nom de fichier pour un export (UE + date, sans tiret). */
export function buildExportFileName(ue: string, date: string, ext: string): string {
  const [y, m, d] = (date || "").split("-");
  const datePart = d && m && y ? `${d}${m}${y.slice(2)}` : (date || "");
  return [sanitizeFolder(ue), datePart].filter(Boolean).join(" ") + ext;
}

/** Construit le nom de fichier xlsx notes (UE + promo + date, sans tiret). */
export function buildXlsxFileName(ue: string, promo: string, date: string): string {
  const [y, m, d] = (date || "").split("-");
  const datePart = d && m && y ? `${d}${m}${y.slice(2)}` : (date || "");
  return [sanitizeFolder(ue), sanitizeFolder(promo), datePart].filter(Boolean).join(" ") + ".xlsx";
}

// Compat aliases (appelés depuis App.tsx / RecapSelectPage avant migration)
/** @deprecated → buildArchivesPath */
export function buildArchivesFolder(promotion: string, ue: string): string {
  return buildArchivesPath(promotion, ue);
}
/** @deprecated → buildNotesPath */
export function buildNotesFolder(promotion: string, ue: string): string {
  return buildNotesPath(promotion, "", ue);
}
/** @deprecated → buildBddPath */
export function buildBddFolder(ue: string, _promotion: string): string {
  return buildBddPath(ue);
}
/** @deprecated */
export function buildPromoFolder(promotion: string): string {
  return sanitizeFolder(promotion);
}
/** @deprecated */
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
