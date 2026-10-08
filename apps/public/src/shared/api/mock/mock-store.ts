import type { ReportBackendType } from "../types";

// 사용자 조작(관심·열람·제보)을 브라우저에 보존하는 키
const STORAGE_KEY = "jellysafe:demo-db:v1";

export type DemoReport = {
  id: number;
  type: ReportBackendType;
  // epoch ms
  submittedAt: number;
};

export type DemoFavorite = {
  beachId: number;
  createdAt: string;
};

type DemoDb = {
  favorites: DemoFavorite[];
  readAlertIds: number[];
  reports: DemoReport[];
};

// 첫 방문 시 관심 탭이 비어 보이지 않도록 기본 관심 해변을 둔다.
function createSeed(): DemoDb {
  const createdAt = new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString();
  return {
    favorites: [
      { beachId: 2, createdAt },
      { beachId: 4, createdAt },
    ],
    readAlertIds: [],
    reports: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isReportType(value: unknown): value is ReportBackendType {
  return value === "general" || value === "multiple" || value === "sting";
}

// 저장값 검증. 형식이 어긋나면 null(시드로 대체).
function parseDb(raw: string): DemoDb | null {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) return null;
  const { favorites, readAlertIds, reports } = parsed;
  if (!Array.isArray(favorites) || !Array.isArray(readAlertIds) || !Array.isArray(reports)) {
    return null;
  }
  return {
    favorites: favorites.filter(
      (item): item is DemoFavorite =>
        isRecord(item) && typeof item.beachId === "number" && typeof item.createdAt === "string",
    ),
    readAlertIds: readAlertIds.filter((id): id is number => typeof id === "number"),
    reports: reports.filter(
      (item): item is DemoReport =>
        isRecord(item) &&
        typeof item.id === "number" &&
        isReportType(item.type) &&
        typeof item.submittedAt === "number",
    ),
  };
}

let cachedDb: DemoDb | null = null;

// 핸들러 호출 시점에만 지연 로드(SSR에서는 시드만 사용)
function loadDb(): DemoDb {
  if (cachedDb) return cachedDb;
  let db: DemoDb | null = null;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      db = raw ? parseDb(raw) : null;
    } catch {
      db = null;
    }
  }
  cachedDb = db ?? createSeed();
  return cachedDb;
}

function saveDb(db: DemoDb): void {
  cachedDb = db;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // 저장 불가(시크릿 모드 등) 시 메모리 상태만 유지
  }
}

export function listFavorites(): DemoFavorite[] {
  return loadDb().favorites;
}

export function addFavorite(beachId: number): void {
  const db = loadDb();
  if (db.favorites.some((item) => item.beachId === beachId)) return;
  saveDb({
    ...db,
    favorites: [{ beachId, createdAt: new Date().toISOString() }, ...db.favorites],
  });
}

export function removeFavorite(beachId: number): void {
  const db = loadDb();
  saveDb({ ...db, favorites: db.favorites.filter((item) => item.beachId !== beachId) });
}

export function isAlertRead(alertId: number): boolean {
  return loadDb().readAlertIds.includes(alertId);
}

export function markAlertRead(alertId: number): void {
  const db = loadDb();
  if (db.readAlertIds.includes(alertId)) return;
  saveDb({ ...db, readAlertIds: [...db.readAlertIds, alertId] });
}

// 제보 id는 실제 서비스처럼 보이도록 큰 수에서 시작
const REPORT_ID_BASE = 1200;

export function createReport(type: ReportBackendType): DemoReport {
  const db = loadDb();
  const lastId = db.reports.reduce((max, report) => Math.max(max, report.id), REPORT_ID_BASE);
  const report: DemoReport = { id: lastId + 1, type, submittedAt: Date.now() };
  saveDb({ ...db, reports: [...db.reports, report] });
  return report;
}

export function findReport(reportId: number): DemoReport | undefined {
  return loadDb().reports.find((report) => report.id === reportId);
}
