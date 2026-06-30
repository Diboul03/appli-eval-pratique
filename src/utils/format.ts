/** Formatage lisible d'une durée en millisecondes (ex. "12 min 34 s"). */
export function formatDurationMs(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) return `${seconds}s`;
  if (minutes < 60) return `${minutes} min ${seconds.toString().padStart(2, "0")} s`;

  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours} h ${remMinutes.toString().padStart(2, "0")} min`;
}
