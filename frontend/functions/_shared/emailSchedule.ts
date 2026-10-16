// Date helpers for the scheduled email drip (migration 0026). All schedule times are Dubai
// time (UTC+4, no daylight saving), stored as UTC timestamps.
const DUBAI_OFFSET_H = 4;

function parseTime(t: string): [number, number] {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || "").trim());
  const h = m ? Math.min(23, Number(m[1])) : 10, min = m ? Math.min(59, Number(m[2])) : 0;
  return [h, min];
}

// UTC Date for a Dubai calendar day (y, m0, d) at HH:MM Dubai.
function dubaiAt(y: number, m0: number, d: number, time: string): Date {
  const [h, min] = parseTime(time);
  return new Date(Date.UTC(y, m0, d, h - DUBAI_OFFSET_H, min));
}

// First allowed send moment on or after the Dubai date `fromDay` (YYYY-MM-DD).
export function firstRunFrom(fromDay: string, time: string, days: number[]): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fromDay);
  const base = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : new Date();
  const allowed = days.length ? days : [0, 1, 2, 3, 4, 5, 6];
  for (let i = 0; i < 14; i++) {
    const d = new Date(base.getTime() + i * 86400e3);
    if (allowed.includes(d.getUTCDay())) return dubaiAt(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), time);
  }
  return dubaiAt(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), time);
}

// Next allowed send day strictly AFTER today (Dubai), at the schedule's time.
export function nextRunAfterToday(time: string, days: number[], now = new Date()): Date {
  const dubaiNow = new Date(now.getTime() + DUBAI_OFFSET_H * 3600e3);
  const tomorrow = new Date(Date.UTC(dubaiNow.getUTCFullYear(), dubaiNow.getUTCMonth(), dubaiNow.getUTCDate()) + 86400e3);
  return firstRunFrom(tomorrow.toISOString().slice(0, 10), time, days);
}

export function cleanDays(v: unknown): number[] {
  const arr = Array.isArray(v) ? v.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6) : [];
  return Array.from(new Set(arr)).sort();
}
