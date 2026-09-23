const WEEKDAY: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function tzOffsetMs(timeZone: string, date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );

  return asUtc - date.getTime();
}

export function zonedLocalToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
) {
  let utc = Date.UTC(year, month - 1, day, hour, minute, second);
  utc -= tzOffsetMs(timeZone, new Date(utc));
  utc = Date.UTC(year, month - 1, day, hour, minute, second);
  utc -= tzOffsetMs(timeZone, new Date(utc));
  return new Date(utc);
}

export function getZonedYmd(timeZone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: get("year"), month: get("month"), day: get("day") };
}

export function getWeekRange(timeZone: string, now = new Date()) {
  const weekdayName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(now);
  const dow = WEEKDAY[weekdayName] ?? 1;
  const daysFromMonday = (dow + 6) % 7;

  const { year, month, day } = getZonedYmd(timeZone, now);
  const monday = new Date(Date.UTC(year, month - 1, day));
  monday.setUTCDate(monday.getUTCDate() - daysFromMonday);

  const start = zonedLocalToUtc(
    timeZone,
    monday.getUTCFullYear(),
    monday.getUTCMonth() + 1,
    monday.getUTCDate(),
    0,
    0,
    0,
  );
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);
  const end = zonedLocalToUtc(
    timeZone,
    nextMonday.getUTCFullYear(),
    nextMonday.getUTCMonth() + 1,
    nextMonday.getUTCDate(),
    0,
    0,
    0,
  );

  return { start, end };
}

export function getDayRange(timeZone: string, now = new Date()) {
  const { year, month, day } = getZonedYmd(timeZone, now);
  const start = zonedLocalToUtc(timeZone, year, month, day, 0, 0, 0);
  const endDate = new Date(Date.UTC(year, month - 1, day));
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const end = zonedLocalToUtc(
    timeZone,
    endDate.getUTCFullYear(),
    endDate.getUTCMonth() + 1,
    endDate.getUTCDate(),
    0,
    0,
    0,
  );
  return { start, end };
}

export function formatVolume(volume: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(volume),
  );
}
