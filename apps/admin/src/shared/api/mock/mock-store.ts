import type {
  AdminNotificationListItemResponse,
  BackendReportStatus,
  OperationActionListItemResponse,
  ReportDetailResponse,
} from "../types";
import { buildNotificationFixtures } from "./fixtures/notifications";
import { buildOperationActionFixtures } from "./fixtures/operation-actions";
import { buildReportFixtures } from "./fixtures/reports";

const STORAGE_KEY = "jellysafe-admin-demo-store:v1";
const STORE_VERSION = 1;

type ReviewOverride = { status: BackendReportStatus; reflectedAt: string | null };
type DailyReportRecord = { reportId: number; memo: string | null };

// 시드 위에 덮어쓰는 변경분만 탭 단위(sessionStorage)로 보관한다
type DemoOverlay = {
  version: typeof STORE_VERSION;
  reviews: Record<string, ReviewOverride>;
  actions: OperationActionListItemResponse[];
  notifications: AdminNotificationListItemResponse[];
  dailyReports: Record<string, DailyReportRecord>;
  nextId: number;
};

type DemoSeed = {
  reports: ReportDetailResponse[];
  actions: OperationActionListItemResponse[];
  notifications: AdminNotificationListItemResponse[];
};

function createEmptyOverlay(): DemoOverlay {
  return {
    version: STORE_VERSION,
    reviews: {},
    actions: [],
    notifications: [],
    dailyReports: {},
    nextId: 5000,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// 직접 저장한 값만 읽으므로 최상위 구조만 검증하고, 어긋나면 시드로 되돌린다
function parseOverlay(raw: string | null): DemoOverlay | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      parsed.version !== STORE_VERSION ||
      !isRecord(parsed.reviews) ||
      !Array.isArray(parsed.actions) ||
      !Array.isArray(parsed.notifications) ||
      !isRecord(parsed.dailyReports) ||
      typeof parsed.nextId !== "number"
    ) {
      return null;
    }
    return parsed as DemoOverlay;
  } catch {
    return null;
  }
}

function readOverlay(): DemoOverlay {
  if (typeof window === "undefined") return createEmptyOverlay();
  try {
    return parseOverlay(window.sessionStorage.getItem(STORAGE_KEY)) ?? createEmptyOverlay();
  } catch {
    return createEmptyOverlay();
  }
}

function writeOverlay(overlay: DemoOverlay): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(overlay));
  } catch {
    // 저장 불가(사파리 프라이빗 등)면 메모리 상태만 유지
  }
}

let seed: DemoSeed | null = null;
let overlay: DemoOverlay | null = null;

function getSeed(): DemoSeed {
  if (!seed) {
    const now = Date.now();
    seed = {
      reports: buildReportFixtures(now),
      actions: buildOperationActionFixtures(now),
      notifications: buildNotificationFixtures(now),
    };
  }
  return seed;
}

function getOverlay(): DemoOverlay {
  if (!overlay) overlay = readOverlay();
  return overlay;
}

function updateOverlay(mutate: (draft: DemoOverlay) => void): void {
  const current = getOverlay();
  mutate(current);
  writeOverlay(current);
}

export function nextDemoId(): number {
  let id = 0;
  updateOverlay((draft) => {
    id = draft.nextId;
    draft.nextId += 1;
  });
  return id;
}

export function listReports(): ReportDetailResponse[] {
  const { reviews } = getOverlay();
  return getSeed().reports.map((report) => {
    const review = reviews[String(report.reportId)];
    return review ? { ...report, status: review.status, reflectedAt: review.reflectedAt } : report;
  });
}

export function saveReview(reportId: number, review: ReviewOverride): void {
  updateOverlay((draft) => {
    draft.reviews[String(reportId)] = review;
  });
}

// 최신순
export function listActions(): OperationActionListItemResponse[] {
  return [...getOverlay().actions, ...getSeed().actions].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

export function appendAction(action: OperationActionListItemResponse): void {
  updateOverlay((draft) => {
    draft.actions.push(action);
  });
}

export function listNotifications(): AdminNotificationListItemResponse[] {
  return [...getOverlay().notifications, ...getSeed().notifications].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

export function appendNotification(notification: AdminNotificationListItemResponse): void {
  updateOverlay((draft) => {
    draft.notifications.push(notification);
  });
}

function dailyReportKey(beachId: number, date: string): string {
  return `${beachId}:${date}`;
}

export function findDailyReport(beachId: number, date: string): DailyReportRecord | null {
  return getOverlay().dailyReports[dailyReportKey(beachId, date)] ?? null;
}

export function findDailyReportById(
  reportId: number,
): { beachId: number; date: string; record: DailyReportRecord } | null {
  for (const [key, record] of Object.entries(getOverlay().dailyReports)) {
    if (record.reportId !== reportId) continue;
    const [beachId, date] = key.split(":");
    return { beachId: Number(beachId), date, record };
  }
  return null;
}

export function saveDailyReport(beachId: number, date: string, record: DailyReportRecord): void {
  updateOverlay((draft) => {
    draft.dailyReports[dailyReportKey(beachId, date)] = record;
  });
}
