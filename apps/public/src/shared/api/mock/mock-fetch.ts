import type {
  AlertListItemResponse,
  AlertListResponse,
  AlertReadResponse,
  FavoriteCreateResponse,
  FavoriteListItemResponse,
  ReportBackendType,
  ReportImageUploadResponse,
  ReportResultResponse,
  ReportSubmitResponse,
} from "../types";
import {
  buildBeachDetail,
  buildBeachList,
  buildBeachRisk,
  findBeachSummary,
  GUIDES,
  hasBeach,
  minutesAgo,
  REPORT_AI_OUTCOME,
  SEED_ALERTS,
} from "./fixtures";
import {
  addFavorite,
  createReport,
  findReport,
  isAlertRead,
  listFavorites,
  markAlertRead,
  removeFavorite,
} from "./mock-store";

// 스켈레톤이 보이도록 주는 응답 지연 범위(ms)
const MIN_DELAY_MS = 200;
const MAX_DELAY_MS = 500;

// 제출 후 AI 판별이 끝난 것으로 간주하는 시간(ms)
const AI_PROCESSING_MS = 3000;

function delay(): Promise<void> {
  const ms = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ok<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fail(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function noContent(): Response {
  return new Response(null, { status: 204 });
}

function notFound(): Response {
  return fail(404, "NOT_FOUND", "요청한 리소스를 찾을 수 없습니다.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isReportType(value: unknown): value is ReportBackendType {
  return value === "general" || value === "multiple" || value === "sting";
}

function parseJsonBody(init?: RequestInit): unknown {
  if (typeof init?.body !== "string") return null;
  try {
    return JSON.parse(init.body);
  } catch {
    return null;
  }
}

type RouteContext = {
  params: string[];
  query: URLSearchParams;
  init?: RequestInit;
};

type Route = {
  method: string;
  pattern: RegExp;
  handle: (ctx: RouteContext) => Response;
};

function toAlertItem(alert: (typeof SEED_ALERTS)[number]): AlertListItemResponse {
  const { minutesAgo: ago, ...rest } = alert;
  return {
    ...rest,
    createdAt: minutesAgo(ago),
    // 열람 시각은 화면에 쓰이지 않아 생성 직후 시각으로 근사
    readAt: isAlertRead(alert.notificationId) ? minutesAgo(Math.max(ago - 1, 0)) : null,
  };
}

const ROUTES: Route[] = [
  {
    method: "GET",
    pattern: /^\/api\/public\/beaches$/,
    handle: () => ok(buildBeachList()),
  },
  {
    method: "GET",
    pattern: /^\/api\/public\/beaches\/(\d+)$/,
    handle: ({ params }) => {
      const detail = buildBeachDetail(Number(params[0]));
      return detail ? ok(detail) : notFound();
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/public\/beaches\/(\d+)\/risk$/,
    handle: ({ params }) => {
      const risk = buildBeachRisk(Number(params[0]));
      return risk ? ok(risk) : notFound();
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/public\/guides$/,
    handle: () => ok(GUIDES),
  },
  {
    method: "GET",
    pattern: /^\/api\/public\/alerts$/,
    handle: ({ query }) => {
      const page = Math.max(Number(query.get("page")) || 1, 1);
      const size = Math.max(Number(query.get("size")) || 20, 1);
      // 미열람 우선 → 최신순(서버 정렬 규칙과 동일)
      const all = SEED_ALERTS.map(toAlertItem).sort((a, b) => {
        if ((a.readAt === null) !== (b.readAt === null)) return a.readAt === null ? -1 : 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
      const data: AlertListResponse = {
        items: all.slice((page - 1) * size, page * size),
        total: all.length,
        page,
        size,
      };
      return ok(data);
    },
  },
  {
    method: "PATCH",
    pattern: /^\/api\/public\/alerts\/(\d+)\/read$/,
    handle: ({ params }) => {
      const id = Number(params[0]);
      if (!SEED_ALERTS.some((alert) => alert.notificationId === id)) return notFound();
      markAlertRead(id);
      const data: AlertReadResponse = { notificationId: id, readAt: new Date().toISOString() };
      return ok(data);
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/public\/favorites$/,
    handle: () => {
      const data: FavoriteListItemResponse[] = listFavorites().flatMap((favorite) => {
        const beach = findBeachSummary(favorite.beachId);
        if (!beach) return [];
        return [
          {
            favoriteId: favorite.beachId,
            beachId: favorite.beachId,
            beachName: beach.name,
            region: beach.region,
            currentRiskLevel: beach.level,
            currentRiskScore: beach.score,
            createdAt: favorite.createdAt,
          },
        ];
      });
      return ok(data);
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/public\/favorites$/,
    handle: ({ init }) => {
      const body = parseJsonBody(init);
      const beachId = isRecord(body) ? body.beachId : null;
      if (typeof beachId !== "number" || !hasBeach(beachId)) return notFound();
      addFavorite(beachId);
      const data: FavoriteCreateResponse = { favoriteId: beachId, beachId };
      return ok(data, 201);
    },
  },
  {
    method: "DELETE",
    pattern: /^\/api\/public\/favorites\/(\d+)$/,
    handle: ({ params }) => {
      removeFavorite(Number(params[0]));
      return noContent();
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/public\/reports\/image$/,
    // 파일 본문은 사용하지 않고 업로드된 것처럼 URL만 발급
    handle: () => {
      const data: ReportImageUploadResponse = {
        imageUrl: `https://demo.jellysafe.local/reports/${Date.now()}.jpg`,
        thumbnailUrl: null,
      };
      return ok(data, 201);
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/public\/reports$/,
    handle: ({ init }) => {
      const body = parseJsonBody(init);
      const reportType = isRecord(body) ? body.reportType : null;
      if (!isReportType(reportType)) {
        return fail(400, "VALIDATION_ERROR", "제보 유형이 올바르지 않습니다.");
      }
      const report = createReport(reportType);
      const data: ReportSubmitResponse = {
        reportId: report.id,
        status: "received",
        aiStatus: "pending",
      };
      return ok(data, 201);
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/public\/reports\/(\d+)$/,
    handle: ({ params }) => {
      const report = findReport(Number(params[0]));
      if (!report) return notFound();
      const isDone = Date.now() - report.submittedAt >= AI_PROCESSING_MS;
      const outcome = REPORT_AI_OUTCOME[report.type];
      const data: ReportResultResponse = isDone
        ? {
            reportId: report.id,
            status: "ai_done",
            aiResult: outcome.aiResult,
            aiConfidence: outcome.aiConfidence,
            guideMessage: outcome.guideMessage,
            adminReviewStatus: null,
          }
        : {
            reportId: report.id,
            status: "ai_processing",
            aiResult: null,
            aiConfidence: null,
            guideMessage: "",
            adminReviewStatus: null,
          };
      return ok(data);
    },
  },
];

// fetch 대체 구현. METHOD + 경로로 라우팅해 백엔드와 같은 봉투 형태로 응답한다.
export async function mockFetch(url: string, init?: RequestInit): Promise<Response> {
  await delay();
  const { pathname, searchParams } = new URL(url, "http://localhost");
  const method = (init?.method ?? "GET").toUpperCase();

  for (const route of ROUTES) {
    if (route.method !== method) continue;
    const match = route.pattern.exec(pathname);
    if (match) {
      return route.handle({ params: match.slice(1), query: searchParams, init });
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.warn(`[mockFetch] 처리되지 않은 요청: ${method} ${pathname}`);
  }
  return notFound();
}
