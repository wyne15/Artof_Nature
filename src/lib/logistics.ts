/**
 * Dispatch scheduling for a one-person workshop.
 * Everything works on Europe/London calendar dates ("YYYY-MM-DD"), never on server time.
 */
export type ClosureMode = "open" | "paused";

export type Closure = {
  from: string; // inclusive, YYYY-MM-DD
  to: string; // inclusive
  /** open  = shop keeps taking orders, dispatch dates move past the closure
   *  paused = checkout is disabled until the closure ends */
  mode: ClosureMode;
  noteEn?: string;
  noteRo?: string;
};

export type Schedule = {
  timeZone: string;
  /** 0 = Sunday ... 6 = Saturday */
  workingDays: number[];
  startHour: number;
  endHour: number;
  /** Orders placed before this hour on a working day count as received that day. */
  cutoffHour: number;
  leadMinDays: number;
  leadMaxDays: number;
  /** Max orders promised for one dispatch date. */
  dailyCap: number;
  closures: Closure[];
};

export const DEFAULT_SCHEDULE: Schedule = {
  timeZone: "Europe/London",
  workingDays: [1, 2, 3, 4, 5],
  startHour: 9,
  endHour: 14,
  cutoffHour: 9,
  leadMinDays: 2,
  leadMaxDays: 4,
  dailyCap: 10,
  closures: [],
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(s: string): boolean {
  if (!ISO.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export type LocalParts = { date: string; hour: number; minute: number };

export function localParts(now: Date, timeZone: string): LocalParts {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(now)) parts[p.type] = p.value;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function closureOn(date: string, s: Schedule): Closure | undefined {
  return s.closures.find((c) => c.from <= date && date <= c.to);
}

export function isWorkingDay(date: string, s: Schedule): boolean {
  return s.workingDays.includes(weekdayOf(date)) && !closureOn(date, s);
}

/** First working day on or after `date`. */
export function nextWorkingDay(date: string, s: Schedule): string {
  if (s.workingDays.length === 0) throw new Error("no_working_days");
  let d = date;
  for (let i = 0; i < 400; i++) {
    if (isWorkingDay(d, s)) return d;
    d = addDays(d, 1);
  }
  throw new Error("no_working_day_found");
}

/** Counts `date` itself as day 1 if it is a working day. n >= 1. */
export function nthWorkingDay(from: string, n: number, s: Schedule): string {
  let d = nextWorkingDay(from, s);
  for (let i = 1; i < n; i++) d = nextWorkingDay(addDays(d, 1), s);
  return d;
}

/** The day she can start processing an order placed `now`. */
export function receivedOn(now: Date, s: Schedule): string {
  const p = localParts(now, s.timeZone);
  if (isWorkingDay(p.date, s) && p.hour < s.cutoffHour) return p.date;
  return nextWorkingDay(addDays(p.date, 1), s);
}

export type DispatchEstimate = { earliest: string; latest: string; receivedOn: string };

/**
 * load[date] = number of orders already promised for that dispatch date.
 * The "latest" date is pushed forward while it is full, so the promise stays honest.
 */
export function estimateDispatch(now: Date, s: Schedule, load: Record<string, number> = {}): DispatchEstimate {
  const base = receivedOn(now, s);
  const earliest = nthWorkingDay(base, s.leadMinDays, s);
  let latest = nthWorkingDay(base, s.leadMaxDays, s);
  for (let i = 0; i < 60 && (load[latest] ?? 0) >= s.dailyCap; i++) {
    latest = nextWorkingDay(addDays(latest, 1), s);
  }
  return { earliest, latest: latest < earliest ? earliest : latest, receivedOn: base };
}

export type ShopStatus =
  | { state: "open"; today?: undefined; resumeOn?: undefined }
  | { state: "away"; resumeOn: string; noteEn?: string; noteRo?: string }
  | { state: "paused"; resumeOn: string; noteEn?: string; noteRo?: string };

/** away = inside an "open" closure (orders accepted, dispatch resumes later); paused = checkout disabled. */
export function shopStatus(now: Date, s: Schedule, manualPause = false): ShopStatus {
  const today = localParts(now, s.timeZone).date;
  const c = closureOn(today, s);
  if (c) {
    const resumeOn = nextWorkingDay(addDays(c.to, 1), { ...s, closures: s.closures.filter((x) => x !== c) });
    const base = { resumeOn, noteEn: c.noteEn, noteRo: c.noteRo };
    return c.mode === "paused" ? { state: "paused", ...base } : { state: "away", ...base };
  }
  if (manualPause) return { state: "paused", resumeOn: nextWorkingDay(addDays(today, 1), s) };
  return { state: "open" };
}

export function validateSchedule(s: Schedule): string[] {
  const errors: string[] = [];
  if (s.workingDays.length === 0 || s.workingDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) errors.push("working_days");
  if (!(s.startHour >= 0 && s.endHour <= 24 && s.startHour < s.endHour)) errors.push("hours");
  if (!(s.cutoffHour >= s.startHour && s.cutoffHour <= s.endHour)) errors.push("cutoff");
  if (!(s.leadMinDays >= 1 && s.leadMaxDays >= s.leadMinDays && s.leadMaxDays <= 30)) errors.push("lead_days");
  if (!(Number.isInteger(s.dailyCap) && s.dailyCap >= 1 && s.dailyCap <= 200)) errors.push("daily_cap");
  for (const c of s.closures) {
    if (!isIsoDate(c.from) || !isIsoDate(c.to) || c.from > c.to) errors.push("closure_dates");
    if (c.mode !== "open" && c.mode !== "paused") errors.push("closure_mode");
  }
  return [...new Set(errors)];
}

const MONTHS = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ro: ["ian.", "feb.", "mar.", "apr.", "mai", "iun.", "iul.", "aug.", "sept.", "oct.", "nov.", "dec."],
} as const;
const DAYS = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  ro: ["dum.", "lun.", "mar.", "mie.", "joi", "vin.", "sâm."],
} as const;

/** "Tue 14 Oct" / "mar. 14 oct." – locale independent of server ICU data. */
export function formatDate(date: string, locale: "en" | "ro", withWeekday = true): string {
  const d = new Date(`${date}T12:00:00Z`);
  const core = `${d.getUTCDate()} ${MONTHS[locale][d.getUTCMonth()]}`;
  return withWeekday ? `${DAYS[locale][d.getUTCDay()]} ${core}` : core;
}
