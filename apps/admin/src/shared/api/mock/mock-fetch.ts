import { DEMO_CREDENTIALS } from "../demo-mode";
import type {
  AdminNotificationListItemResponse,
  BackendHorizon,
  BackendRiskLevel,
  BackendReportStatus,
  DashboardSummaryResponse,
  LoginUserResponse,
  NotificationEventType,
  NotificationTargetType,
  OperationActionListItemResponse,
  OperationStatus,
  PaginatedResponse,
  RecordOperationActionResponse,
  ReportDetailResponse,
  ReportListItemResponse,
  ReviewReportResponse,
  SendNotificationResponse,
} from "../types";
import { buildDailyReport } from "./daily-report";
import { DATE_PATTERN, toKstDate } from "./demo-time";
import {
  BEACH_FIXTURES,
  LEVEL_RANK,
  buildBeachRisk,
  buildLatestRisk,
  buildRecommendations,
  findBeach,
  scoreToLevel,
  toAdminBeachItem,
} from "./fixtures/beaches";
import {
  appendAction,
  appendNotification,
  findDailyReport,
  findDailyReportById,
  listActions,
  listNotifications,
  listReports,
  nextDemoId,
  saveDailyReport,
  saveReview,
} from "./mock-store";

const DEMO_TOKEN = "demo-token";
const DEMO_USER = { userId: 1, name: "정하늘" } as const;
const NOTIFICATION_RECIPIENT_COUNT = 12;
const DAILY_REPORT_DELAY_MS = 1200;

// 어제 기준값. 오늘 값과의 차이로 deltas를 만든다
const YESTERDAY_BASELINE = {
  overallScore: 71,
  dangerBeachCount: 4,
  toxicPendingCount: 1,
  unreviewedReportCount: 6,
  actionCount: 5,
};

const OPERATION_STATUSES: OperationStatus[] = [
  "normal",
  "monitoring_up",
  "entry_caution",
  "lifeguard_added",
  "broadcast",
  "zone_control_review",
  "entry_ban",
  "resumed",
];
const HORIZONS: BackendHorizon[] = ["now", "6h", "24h", "72h"];
const TARGET_TYPES: NotificationTargetType[] = ["admin", "operator", "public"];
const EVENT_TYPES: NotificationEventType[] = ["level_up", "toxic_report", "sting_report"];
const RISK_LEVELS: BackendRiskLevel[] = ["safe", "caution", "danger", "severe"];
const UNREVIEWED_STATUSES: BackendReportStatus[] = ["received", "ai_processing", "ai_done"];
const REVIEWABLE_STATUSES: BackendReportStatus[] = ["ai_done", "hold"];

type MockRequest = {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
  isAuthorized: boolean;
};

type MockResult = { status: number; body: unknown; delayMs?: number };

class MockHttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function ok(data: unknown, delayMs?: number): MockResult {
  return { status: 200, body: { success: true, data }, delayMs };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === "string" && (options as readonly string[]).includes(value);
}

function readBody(body: unknown): Record<string, unknown> {
  if (!isRecord(body)) throw new MockHttpError(400, "VALIDATION_FAILED", "요청 본문이 올바르지 않습니다.");
  return body;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function requireBeach(beachId: number) {
  const beach = findBeach(beachId);
  if (!beach) throw new MockHttpError(404, "BEACH_NOT_FOUND", "해변을 찾을 수 없습니다.");
  return beach;
}

function paginate<T>(items: T[], query: URLSearchParams): PaginatedResponse<T> {
  const page = Math.max(1, Number(query.get("page") ?? "1") || 1);
  const size = Math.max(1, Math.min(100, Number(query.get("size") ?? "20") || 20));
  const start = (page - 1) * size;
  return {
    items: items.slice(start, start + size),
    total: items.length,
    page,
    size,
    totalPages: Math.max(1, Math.ceil(items.length / size)),
  };
}

// 위험도는 매시 정각에 산출된 것으로 표현한다
function latestGeneratedAt(): string {
  const time = new Date();
  time.setMinutes(0, 0, 0);
  return time.toISOString();
}

// 반영된 독성 의심 제보를 위험 요인 출처로 연결한다
function resolveToxicSource(beachId: number): number | null {
  const source = listReports().find(
    (report) =>
      report.beachId === beachId &&
      report.aiResult === "toxic_suspected" &&
      (report.status === "reflected" || report.status === "verified"),
  );
  return source?.reportId ?? null;
}

function toListItem(report: ReportDetailResponse): ReportListItemResponse {
  return {
    reportId: report.reportId,
    beachId: report.beachId,
    beachName: report.beachName,
    beachLat: report.beachLat,
    beachLng: report.beachLng,
    lat: report.lat,
    lng: report.lng,
    nearestBeachId: report.nearestBeachId,
    nearestBeachName: report.nearestBeachName,
    nearestBeachDistanceKm: report.nearestBeachDistanceKm,
    reportType: report.reportType,
    status: report.status,
    aiResult: report.aiResult,
    aiConfidence: report.aiConfidence,
    imageUrl: report.imageUrl,
    thumbnailUrl: report.thumbnailUrl,
    submittedAt: report.submittedAt,
  };
}

function handleLogin(request: MockRequest): MockResult {
  const body = readBody(request.body);
  const email = optionalString(body.email)?.trim().toLowerCase();
  const password = optionalString(body.password);

  if (email !== DEMO_CREDENTIALS.email || password !== DEMO_CREDENTIALS.password) {
    throw new MockHttpError(401, "AUTH_INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않습니다.");
  }

  return ok({
    userId: DEMO_USER.userId,
    email: DEMO_CREDENTIALS.email,
    role: "admin",
    name: DEMO_USER.name,
    lastLoginAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    accessToken: DEMO_TOKEN,
  } satisfies LoginUserResponse);
}

function handleDashboardSummary(): MockResult {
  const nowRisks = BEACH_FIXTURES.map((beach) => buildLatestRisk(beach, "now", latestGeneratedAt()));
  const topScores = [...nowRisks].sort((a, b) => b.riskScore - a.riskScore).slice(0, 3);
  const overallScore = Math.round(
    topScores.reduce((sum, item) => sum + item.riskScore, 0) / topScores.length,
  );
  const reports = listReports();
  const today = toKstDate(Date.now());

  const current = {
    overallScore,
    dangerBeachCount: nowRisks.filter((item) => LEVEL_RANK[item.riskLevel] >= LEVEL_RANK.danger).length,
    toxicPendingCount: reports.filter(
      (report) =>
        report.aiResult === "toxic_suspected" && REVIEWABLE_STATUSES.includes(report.status),
    ).length,
    unreviewedReportCount: reports.filter((report) => UNREVIEWED_STATUSES.includes(report.status))
      .length,
    actionCount: listActions().filter((action) => toKstDate(Date.parse(action.createdAt)) === today)
      .length,
  };

  return ok({
    overallRisk: scoreToLevel(overallScore),
    ...current,
    generatedAt: latestGeneratedAt(),
    deltas: {
      overallScore: current.overallScore - YESTERDAY_BASELINE.overallScore,
      dangerBeachCount: current.dangerBeachCount - YESTERDAY_BASELINE.dangerBeachCount,
      toxicPendingCount: current.toxicPendingCount - YESTERDAY_BASELINE.toxicPendingCount,
      unreviewedReportCount: current.unreviewedReportCount - YESTERDAY_BASELINE.unreviewedReportCount,
      actionCount: current.actionCount - YESTERDAY_BASELINE.actionCount,
    },
  } satisfies DashboardSummaryResponse);
}

function handleLatestRisks(request: MockRequest): MockResult {
  const horizon = request.query.get("horizon") ?? "now";
  if (!isOneOf(horizon, HORIZONS)) {
    throw new MockHttpError(400, "VALIDATION_FAILED", "horizon 값이 올바르지 않습니다.");
  }
  const generatedAt = latestGeneratedAt();
  return ok(BEACH_FIXTURES.map((beach) => buildLatestRisk(beach, horizon, generatedAt)));
}

function handleRecordAction(request: MockRequest): MockResult {
  const body = readBody(request.body);
  const beachId = body.beachId;
  if (typeof beachId !== "number") {
    throw new MockHttpError(400, "VALIDATION_FAILED", "beachId가 필요합니다.");
  }
  requireBeach(beachId);
  if (!isOneOf(body.operationStatus, OPERATION_STATUSES)) {
    throw new MockHttpError(400, "VALIDATION_FAILED", "operationStatus 값이 올바르지 않습니다.");
  }

  const previous = listActions().find((action) => action.beachId === beachId);
  const action: OperationActionListItemResponse = {
    actionId: nextDemoId(),
    beachId,
    operationStatus: body.operationStatus,
    actionType: optionalString(body.actionType) ?? body.operationStatus,
    memo: optionalString(body.memo) ?? null,
    riskScoreId: typeof body.riskScoreId === "number" ? body.riskScoreId : null,
    recommendationId: typeof body.recommendationId === "number" ? body.recommendationId : null,
    createdBy: DEMO_USER.userId,
    createdByName: DEMO_USER.name,
    createdAt: new Date().toISOString(),
  };
  appendAction(action);

  return ok({
    actionId: action.actionId,
    beachId,
    operationStatus: action.operationStatus,
    previousStatus: previous?.operationStatus ?? null,
    createdBy: action.createdBy,
    createdAt: action.createdAt,
  } satisfies RecordOperationActionResponse);
}

function handleReviewReport(reportId: number, request: MockRequest): MockResult {
  const body = readBody(request.body);
  const reviewStatus = body.reviewStatus;
  if (!isOneOf(reviewStatus, ["verified", "rejected", "hold"] as const)) {
    throw new MockHttpError(400, "VALIDATION_FAILED", "reviewStatus 값이 올바르지 않습니다.");
  }

  const report = listReports().find((item) => item.reportId === reportId);
  if (!report) throw new MockHttpError(404, "REPORT_NOT_FOUND", "제보를 찾을 수 없습니다.");
  if (!REVIEWABLE_STATUSES.includes(report.status)) {
    throw new MockHttpError(409, "REPORT_INVALID_TRANSITION", "허용되지 않는 상태 변경입니다.");
  }

  // 확인완료는 위험도 재산출에 반영된 것으로 처리한다(해변 배정 제보만)
  const reflectedRisk = reviewStatus === "verified" && report.beachId !== null;
  const reportStatus: BackendReportStatus = reflectedRisk ? "reflected" : reviewStatus;
  saveReview(reportId, {
    status: reportStatus,
    reflectedAt: reflectedRisk ? new Date().toISOString() : null,
  });

  return ok({ reportId, reviewStatus, reportStatus, reflectedRisk } satisfies ReviewReportResponse);
}

function handleSendNotification(request: MockRequest): MockResult {
  const body = readBody(request.body);
  const beachId = body.beachId;
  if (!isOneOf(body.targetType, TARGET_TYPES) || typeof beachId !== "number") {
    throw new MockHttpError(400, "VALIDATION_FAILED", "알림 요청 값이 올바르지 않습니다.");
  }
  const beach = requireBeach(beachId);
  const notificationId = nextDemoId();

  // 시민 대상 발송은 관리자 수신함에 남기지 않는다
  if (body.targetType !== "public") {
    const notification: AdminNotificationListItemResponse = {
      notificationId,
      targetType: body.targetType,
      beachId,
      beachName: beach.name,
      riskLevel: isOneOf(body.riskLevel, RISK_LEVELS) ? body.riskLevel : null,
      eventType: isOneOf(body.eventType, EVENT_TYPES) ? body.eventType : "level_up",
      title: optionalString(body.title) ?? null,
      message: optionalString(body.message) ?? "",
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    appendNotification(notification);
  }

  return ok({
    created: true,
    notificationId,
    recipientCount: NOTIFICATION_RECIPIENT_COUNT,
  } satisfies SendNotificationResponse);
}

function readDailyReportParams(beachIdValue: unknown, dateValue: unknown) {
  const beachId = typeof beachIdValue === "string" ? Number(beachIdValue) : beachIdValue;
  if (typeof beachId !== "number" || !Number.isInteger(beachId)) {
    throw new MockHttpError(400, "VALIDATION_FAILED", "beachId가 올바르지 않습니다.");
  }
  if (typeof dateValue !== "string" || !DATE_PATTERN.test(dateValue)) {
    throw new MockHttpError(400, "VALIDATION_FAILED", "date는 YYYY-MM-DD 형식이어야 합니다.");
  }
  return { beach: requireBeach(beachId), date: dateValue };
}

function dailyReportResult(beachId: number, date: string, delayMs?: number): MockResult {
  return ok(
    buildDailyReport({
      beach: requireBeach(beachId),
      date,
      now: Date.now(),
      reports: listReports(),
      actions: listActions(),
      record: findDailyReport(beachId, date),
    }),
    delayMs,
  );
}

function handleGenerateDailyReport(request: MockRequest): MockResult {
  const body = readBody(request.body);
  const { beach, date } = readDailyReportParams(body.beachId, body.date);
  if (!findDailyReport(beach.beachId, date)) {
    saveDailyReport(beach.beachId, date, { reportId: nextDemoId(), memo: null });
  }
  return dailyReportResult(beach.beachId, date, DAILY_REPORT_DELAY_MS);
}

function handleUpdateDailyReportMemo(reportId: number, request: MockRequest): MockResult {
  const body = readBody(request.body);
  const found = findDailyReportById(reportId);
  if (!found) throw new MockHttpError(404, "DAILY_REPORT_NOT_FOUND", "리포트를 찾을 수 없습니다.");
  const memo = typeof body.memo === "string" ? body.memo : null;
  saveDailyReport(found.beachId, found.date, { ...found.record, memo });
  return dailyReportResult(found.beachId, found.date);
}

type Route = {
  method: string;
  pattern: RegExp;
  isPublic?: boolean;
  handle: (request: MockRequest, params: number[]) => MockResult;
};

const ROUTES: Route[] = [
  { method: "POST", pattern: /^\/api\/admin\/auth\/login$/, isPublic: true, handle: handleLogin },
  { method: "GET", pattern: /^\/api\/admin\/dashboard\/summary$/, handle: handleDashboardSummary },
  { method: "GET", pattern: /^\/api\/admin\/risks\/latest$/, handle: handleLatestRisks },
  {
    method: "GET",
    pattern: /^\/api\/admin\/beaches$/,
    handle: (request) => ok(paginate(BEACH_FIXTURES.map(toAdminBeachItem), request.query)),
  },
  {
    method: "GET",
    pattern: /^\/api\/admin\/beaches\/(\d+)\/risk$/,
    handle: (_request, [beachId]) =>
      ok(buildBeachRisk(requireBeach(beachId), latestGeneratedAt(), resolveToxicSource)),
  },
  {
    method: "GET",
    pattern: /^\/api\/admin\/beaches\/(\d+)\/recommendations$/,
    handle: (_request, [beachId]) => ok(buildRecommendations(requireBeach(beachId))),
  },
  {
    method: "GET",
    pattern: /^\/api\/admin\/beaches\/(\d+)\/operation-actions$/,
    handle: (request, [beachId]) => {
      requireBeach(beachId);
      const items = listActions().filter((action) => action.beachId === beachId);
      return ok(paginate(items, request.query));
    },
  },
  { method: "POST", pattern: /^\/api\/admin\/operation-actions$/, handle: handleRecordAction },
  {
    method: "GET",
    pattern: /^\/api\/admin\/reports$/,
    handle: (request) => {
      const items = [...listReports()]
        .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))
        .map(toListItem);
      return ok(paginate(items, request.query));
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/admin\/reports\/(\d+)$/,
    handle: (_request, [reportId]) => {
      const report = listReports().find((item) => item.reportId === reportId);
      if (!report) throw new MockHttpError(404, "REPORT_NOT_FOUND", "제보를 찾을 수 없습니다.");
      return ok(report);
    },
  },
  {
    method: "PATCH",
    pattern: /^\/api\/admin\/reports\/(\d+)\/review$/,
    handle: (request, [reportId]) => handleReviewReport(reportId, request),
  },
  {
    method: "GET",
    pattern: /^\/api\/admin\/notifications$/,
    handle: (request) => ok(paginate(listNotifications(), request.query)),
  },
  { method: "POST", pattern: /^\/api\/admin\/notifications$/, handle: handleSendNotification },
  {
    method: "GET",
    pattern: /^\/api\/admin\/daily-reports$/,
    handle: (request) => {
      const { beach, date } = readDailyReportParams(
        request.query.get("beachId"),
        request.query.get("date"),
      );
      return dailyReportResult(beach.beachId, date);
    },
  },
  { method: "POST", pattern: /^\/api\/admin\/daily-reports$/, handle: handleGenerateDailyReport },
  {
    method: "PATCH",
    pattern: /^\/api\/admin\/daily-reports\/(\d+)\/memo$/,
    handle: (request, [reportId]) => handleUpdateDailyReportMemo(reportId, request),
  },
];

function parseRequestBody(body: RequestInit["body"]): unknown {
  if (typeof body !== "string") return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function resolveRequest(input: RequestInfo | URL, init?: RequestInit): MockRequest {
  const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const url = new URL(rawUrl, "http://demo.local");
  const authorization = new Headers(init?.headers).get("Authorization");

  return {
    method: (init?.method ?? "GET").toUpperCase(),
    path: url.pathname.replace(/\/+$/, ""),
    query: url.searchParams,
    body: parseRequestBody(init?.body),
    isAuthorized: authorization === `Bearer ${DEMO_TOKEN}`,
  };
}

function route(request: MockRequest): MockResult {
  for (const candidate of ROUTES) {
    if (candidate.method !== request.method) continue;
    const match = candidate.pattern.exec(request.path);
    if (!match) continue;

    if (!candidate.isPublic && !request.isAuthorized) {
      throw new MockHttpError(401, "AUTH_UNAUTHORIZED", "인증이 필요합니다.");
    }
    return candidate.handle(request, match.slice(1).map(Number));
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn(`[demo] 처리되지 않은 요청: ${request.method} ${request.path}`);
  }
  throw new MockHttpError(404, "NOT_FOUND", "요청한 리소스를 찾을 수 없습니다.");
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// fetch와 같은 시그니처로 백엔드 응답 형태를 흉내 낸다
export async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = resolveRequest(input, init);
  let result: MockResult;

  try {
    result = route(request);
  } catch (error) {
    const httpError =
      error instanceof MockHttpError
        ? error
        : new MockHttpError(500, "INTERNAL_ERROR", "요청을 처리하지 못했습니다.");
    result = {
      status: httpError.status,
      body: { success: false, error: { code: httpError.code, message: httpError.message } },
    };
  }

  await wait(result.delayMs ?? 200 + Math.random() * 300);
  return jsonResponse(result.status, result.body);
}
