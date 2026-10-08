const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const KST_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
});

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toKstDate(time: number): string {
  return KST_DATE_FORMATTER.format(new Date(time));
}

export function kstMidnight(date: string): number {
  return Date.parse(`${date}T00:00:00+09:00`);
}

export function hoursAgo(now: number, hours: number): string {
  return new Date(now - hours * HOUR_MS).toISOString();
}

export function daysAgo(now: number, days: number, hourOffset = 0): string {
  return new Date(now - days * DAY_MS + hourOffset * HOUR_MS).toISOString();
}

// 오늘(KST) 자정~현재 사이 비율 지점. 새벽에 접속해도 항상 오늘 날짜가 된다
export function todayAt(now: number, ratio: number): string {
  const midnight = kstMidnight(toKstDate(now));
  return new Date(midnight + (now - midnight) * ratio).toISOString();
}

export { DAY_MS, HOUR_MS };
