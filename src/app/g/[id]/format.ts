const day = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });
const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const hourOnly = new Intl.DateTimeFormat(undefined, { hour: "numeric" });

export const fmtDay = (t: number | Date) => day.format(t);
export const fmtTime = (t: number | Date) => time.format(t);
export const fmtHour = (h: number) => hourOnly.format(new Date(2000, 0, 1, h));
export const fmtRange = (a: number, b: number) => `${fmtDay(a)} · ${fmtTime(a)} – ${fmtTime(b)}`;

export function fmtDuration(ms: number) {
  const min = Math.round(ms / 60_000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

export function listNames(names: string[]) {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** yyyy-mm-dd for a local date, as used by <input type="date">. */
export function toInputDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function fromInputDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
