export function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${pad(minutes)}:${pad(seconds)}`;
}

/** Compact hours/minutes duration, e.g. `5 min` or `1 h 5 min`. */
export function formatTotalTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
