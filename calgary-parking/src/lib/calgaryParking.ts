export type EdmontonNow = {
  weekdayIndex: number; // 0=Sun ... 6=Sat
  minutesSinceMidnight: number;
};

const DAY_TOKEN_TO_INDEX: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

function toMinutes(hhmm: string): number | null {
  // hhmm is always 4 digits, e.g. "0910"
  const match = /^(\d{2})(\d{2})$/.exec(hhmm);
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

export function getEdmontonNowParts(date: Date = new Date()): EdmontonNow {
  // Calgary uses America/Edmonton.
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Edmonton",
    weekday: "short",
  }).format(date);

  const timeParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Edmonton",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);

  const hour = timeParts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = timeParts.find((p) => p.type === "minute")?.value ?? "00";

  const weekdayToken = weekday.toUpperCase().slice(0, 3); // "Mon" -> "MON"
  const weekdayIndex = DAY_TOKEN_TO_INDEX[weekdayToken];

  return {
    weekdayIndex: typeof weekdayIndex === "number" ? weekdayIndex : 0,
    minutesSinceMidnight: toMinutes(`${hour}${minute}`) ?? 0,
  };
}

function parseDaySpec(daySpecRaw: string): number[] | null {
  const daySpec = daySpecRaw.trim().toUpperCase().replace(/\s+/g, "");
  if (!daySpec) return null;

  // Examples: "MON", "MON-FRI", "SAT-SUN"
  const tokens = daySpec.split("-");
  if (tokens.length === 1) {
    const idx = DAY_TOKEN_TO_INDEX[tokens[0]];
    return typeof idx === "number" ? [idx] : null;
  }
  if (tokens.length !== 2) return null;

  const start = DAY_TOKEN_TO_INDEX[tokens[0]];
  const end = DAY_TOKEN_TO_INDEX[tokens[1]];
  if (typeof start !== "number" || typeof end !== "number") return null;

  const res: number[] = [];
  if (start <= end) {
    for (let i = start; i <= end; i++) res.push(i);
    return res;
  }

  // Wrap around week boundary (e.g. SAT-SUN)
  for (let i = start; i <= 6; i++) res.push(i);
  for (let i = 0; i <= end; i++) res.push(i);
  return res;
}

function parseEnforceableTimeSegments(
  enforceableTime: string
): Array<{ startMin: number; endMin: number; days: number[] }> {
  // Examples:
  // - "0910-1750 MON-SAT"
  // - "0910-1750 MON-FRI, 0910-1750 SAT"
  // - "0900-1800 MON-SUN"
  const segments = enforceableTime
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const parsed: Array<{ startMin: number; endMin: number; days: number[] }> =
    [];

  for (const seg of segments) {
    const m = /^(\d{4})-(\d{4})\s*(.+)$/.exec(seg);
    if (!m) continue;

    const startMin = toMinutes(m[1]);
    const endMin = toMinutes(m[2]);
    if (startMin === null || endMin === null) continue;

    const days = parseDaySpec(m[3]);
    if (!days || days.length === 0) continue;

    parsed.push({ startMin, endMin, days });
  }

  return parsed;
}

// Calgary dataset meaning (heuristic):
// - If current local time is within `enforceable_time`, the zone is actively
//   enforced/charged => not free.
// - If outside `enforceable_time`, the zone should be free ($0.00).
export function isFreeNowFromEnforceableTime(
  enforceableTime: string | null | undefined,
  now: EdmontonNow
): boolean {
  if (!enforceableTime || !enforceableTime.trim()) return false;

  const segments = parseEnforceableTimeSegments(enforceableTime);
  if (segments.length === 0) return false;

  const { weekdayIndex, minutesSinceMidnight } = now;

  for (const seg of segments) {
    if (!seg.days.includes(weekdayIndex)) continue;
    if (minutesSinceMidnight >= seg.startMin && minutesSinceMidnight <= seg.endMin) {
      return false; // charged/enforced right now
    }
  }

  return true;
}

