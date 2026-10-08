import type {
  BackendRiskLevel,
  DailyReportResponse,
  OperationActionListItemResponse,
  ReportDetailResponse,
  RiskTrendPointResponse,
} from "../types";
import { HOUR_MS, kstMidnight, toKstDate } from "./demo-time";
import { LEVEL_RANK, scoreToLevel, toFactorSeeds, type BeachFixture } from "./fixtures/beaches";

// 같은 해변·날짜면 항상 같은 값이 나오도록 하는 결정적 난수
function createRandom(seedText: string): () => number {
  let state = 0;
  for (const char of seedText) {
    state = (Math.imul(state, 31) + char.charCodeAt(0)) | 0;
  }
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) | 0;
    return ((state >>> 0) % 10000) / 10000;
  };
}

function clampScore(value: number): number {
  return Math.max(3, Math.min(99, Math.round(value)));
}

function buildRiskTrend(beach: BeachFixture, date: string, now: number): RiskTrendPointResponse[] {
  const random = createRandom(`${beach.beachId}:${date}`);
  const midnight = kstMidnight(date);
  const isToday = date === toKstDate(now);
  // 지난 날짜는 하루 단위로 기준선이 조금씩 흔들린다
  const dayShift = isToday ? 0 : (random() - 0.5) * 20;
  const baseScore = beach.risk.now.score + dayShift;

  const points: RiskTrendPointResponse[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    const time = midnight + hour * HOUR_MS + 5 * 60 * 1000;
    if (time > now) break;

    // 새벽엔 낮고 오후(14~16시)에 정점
    const daily = Math.sin(((hour - 8) / 24) * 2 * Math.PI) * 14;
    const noise = (random() - 0.5) * 8;
    const score = clampScore(baseScore - 6 + daily + noise);
    points.push({
      generatedAt: new Date(time).toISOString(),
      riskLevel: scoreToLevel(score),
      riskScore: score,
    });
  }
  return points;
}

function maxLevel(points: RiskTrendPointResponse[]): BackendRiskLevel | null {
  return points.reduce<BackendRiskLevel | null>(
    (max, point) =>
      max === null || LEVEL_RANK[point.riskLevel] > LEVEL_RANK[max] ? point.riskLevel : max,
    null,
  );
}

// 백엔드 형식 그대로 영문 등급을 쓴다(화면에서 localizeRiskChangeSummary로 한글화)
function summarizeChange(points: RiskTrendPointResponse[], peak: BackendRiskLevel | null): string | null {
  const first = points[0];
  if (!first || !peak) return null;
  if (first.riskLevel === peak) return `${peak} 유지`;
  return `${first.riskLevel} → ${peak}`;
}

type DailyReportInput = {
  beach: BeachFixture;
  date: string;
  now: number;
  reports: ReportDetailResponse[];
  actions: OperationActionListItemResponse[];
  record: { reportId: number; memo: string | null } | null;
};

export function buildDailyReport({
  beach,
  date,
  now,
  reports,
  actions,
  record,
}: DailyReportInput): DailyReportResponse {
  const riskTrend = buildRiskTrend(beach, date, now);
  const peak = maxLevel(riskTrend);
  const isFuture = kstMidnight(date) > now;

  const dayReports = reports.filter(
    (report) => report.beachId === beach.beachId && toKstDate(Date.parse(report.submittedAt)) === date,
  );
  const dayActions = actions.filter(
    (action) => action.beachId === beach.beachId && toKstDate(Date.parse(action.createdAt)) === date,
  );

  // 시드 제보가 없는 과거 날짜는 위험도에 비례한 건수를 채운다
  const random = createRandom(`counts:${beach.beachId}:${date}`);
  const scale = beach.risk.now.score / 100;
  const hasSeedReports = dayReports.length > 0;
  const reportCount = isFuture
    ? 0
    : hasSeedReports
      ? dayReports.length
      : Math.round(random() * 8 * scale);
  const toxicCount = hasSeedReports
    ? dayReports.filter((report) => report.aiResult === "toxic_suspected").length
    : Math.round(reportCount * 0.4 * random());
  const stingCount = hasSeedReports
    ? dayReports.filter((report) => report.reportType === "sting").length
    : Math.round(reportCount * 0.25 * random());

  return {
    reportId: record?.reportId ?? null,
    beachId: beach.beachId,
    reportDate: date,
    maxRiskLevel: peak,
    riskChangeSummary: summarizeChange(riskTrend, peak),
    reportCount,
    toxicCount,
    stingCount,
    actionCount: dayActions.length,
    memo: record?.memo ?? null,
    summaryJson: null,
    persisted: record !== null,
    riskTrend,
    topFactors: isFuture
      ? []
      : toFactorSeeds(beach).map((factor) => ({
          code: factor.code,
          name: factor.name,
          detail: factor.detail,
          scoreDelta: factor.delta,
        })),
  } satisfies DailyReportResponse;
}
