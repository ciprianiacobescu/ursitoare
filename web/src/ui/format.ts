const DASH = "—";
const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function parseInstantMs(iso: string): number {
  return Date.parse(iso);
}

export function formatDuration(startIso: string, endIso: string | null, nowMs: number): string {
  const startMs = parseInstantMs(startIso);
  const endMs = endIso === null ? nowMs : parseInstantMs(endIso);
  const span = endMs - startMs;
  if (!Number.isFinite(span) || span < 0) return DASH;
  if (span < SECOND_MS) return "<1 s";
  if (span < MINUTE_MS) return `${(Math.floor(span / 100) / 10).toFixed(1)} s`;
  if (span < HOUR_MS) {
    const seconds = Math.floor(span / SECOND_MS);
    return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
  }
  const seconds = Math.floor(span / SECOND_MS);
  return `${Math.floor(seconds / 3600)} h ${Math.floor((seconds % 3600) / 60)} min`;
}

export function formatInstant(iso: string): string {
  const ms = parseInstantMs(iso);
  if (!Number.isFinite(ms)) return iso;
  const date = new Date(ms);
  const year = date.getUTCFullYear();
  if (year < 0 || year > 9999) return iso;
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${String(year).padStart(4, "0")}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

export function formatAgo(iso: string, nowMs: number): string {
  const ms = parseInstantMs(iso);
  if (!Number.isFinite(ms)) return formatInstant(iso);
  const span = nowMs - ms;
  if (span < 0) return formatInstant(iso);
  if (span < MINUTE_MS) return "just now";
  if (span < HOUR_MS) return `${Math.floor(span / MINUTE_MS)} min ago`;
  if (span < DAY_MS) return `${Math.floor(span / HOUR_MS)} h ago`;
  return `${Math.floor(span / DAY_MS)} d ago`;
}
