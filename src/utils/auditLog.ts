export interface AuditEntry {
  ts: string;
  action: string;
  detail?: string;
}

const KEY = "auditLog";
const MAX = 200;

export function auditLog(action: string, detail?: string): void {
  const entries: AuditEntry[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
  entries.unshift({ ts: new Date().toISOString(), action, detail });
  if (entries.length > MAX) entries.length = MAX;
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function getAuditLog(): AuditEntry[] {
  return JSON.parse(localStorage.getItem(KEY) ?? "[]");
}

export function clearAuditLog(): void {
  localStorage.removeItem(KEY);
}
