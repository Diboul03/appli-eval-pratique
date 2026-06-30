import type { Axis, Scores, SubStatus } from "../types";

/** Somme des barèmes de tous les axes. */
export function sumAxesMax(axes: Axis[]): number {
  return axes.reduce((s, a) => s + a.max, 0);
}

/** Note ramenée sur 20 à partir des scores bruts et des barèmes. */
export function computeTotal20(axes: Axis[], scores: Scores): number {
  const max = sumAxesMax(axes);
  if (max <= 0) return 0;
  const raw = axes.reduce((s, a) => s + (scores[a.id] || 0), 0);
  return (raw / max) * 20;
}

/**
 * Vrai si tous les sous-items ont un statut, et si tout statut "en cours" ou
 * "non acquis" est accompagné d'un commentaire non vide.
 */
export function areAllSubItemsSelected(
  axes: Axis[],
  subChecks: Record<string, Record<string, SubStatus>>,
  subComments: Record<string, Record<string, string>>,
): boolean {
  for (const a of axes) {
    for (const si of a.subItems || []) {
      const st = subChecks[a.id]?.[si.id] ?? "";
      if (!st) return false;
      if ((st === "NON_ACQUIS" || st === "EN_COURS") && !subComments[a.id]?.[si.id]?.trim()) {
        return false;
      }
    }
  }
  return true;
}
