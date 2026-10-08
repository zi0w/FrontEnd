import type {
  AdminBeachItemResponse,
  AdminBeachRiskResponse,
  BackendHorizon,
  BackendRiskLevel,
  DataConfidence,
  LatestRiskResponse,
  RecommendationItemResponse,
  RecommendationViewResponse,
  RiskCardResponse,
  RiskFactorTagResponse,
} from "../../types";

export type FactorCode = "sea_temp" | "wave_height" | "onshore_wind" | "history" | "toxic_report";

type FactorSeed = { code: FactorCode; delta: number };

type HorizonSeed = {
  score: number;
  confidence: DataConfidence;
  factors: FactorSeed[];
};

export type BeachFixture = {
  beachId: number;
  name: string;
  region: string;
  lat: number;
  lng: number;
  facingDirection: number;
  priority: number;
  vulnerabilityScore: number;
  risk: Record<"now" | "24h" | "72h", HorizonSeed>;
};

export const LEVEL_RANK: Record<BackendRiskLevel, number> = {
  safe: 0,
  caution: 1,
  danger: 2,
  severe: 3,
};

export function scoreToLevel(score: number): BackendRiskLevel {
  if (score >= 85) return "severe";
  if (score >= 60) return "danger";
  if (score >= 30) return "caution";
  return "safe";
}

const FACTOR_CATALOG: Record<FactorCode, { name: string; detail: string }> = {
  sea_temp: {
    name: "수온 상승",
    detail: "최근 해수 온도가 상승하면서 해파리가 서식·활동하기 좋은 환경이 형성되었습니다.",
  },
  wave_height: {
    name: "파고 증가",
    detail: "높은 파도로 인해 먼 바다에 있던 해파리가 해안까지 이동한 것으로 분석됩니다.",
  },
  onshore_wind: {
    name: "해변 방향 풍향",
    detail: "바람이 해변 방향으로 불어 해파리가 연안으로 밀려왔을 가능성이 높습니다.",
  },
  history: {
    name: "과거 출현 이력",
    detail:
      "과거에도 동일 해역에서 해파리 출현이 반복되어 이번에도 출현 가능성이 높게 분석되었습니다.",
  },
  toxic_report: {
    name: "독성 의심 제보",
    detail:
      "인근 해역에서 독성 해파리 의심 제보가 접수되어 출현 가능성이 높아진 것으로 판단됩니다.",
  },
};

// 공개 앱과 동일한 10개 해변(id 1~10)
export const BEACH_FIXTURES = [
  {
    beachId: 1,
    name: "삼양 해수욕장",
    region: "제주 제주시 삼양동",
    lat: 33.5253,
    lng: 126.5859,
    facingDirection: 0,
    priority: 1,
    vulnerabilityScore: 0.82,
    risk: {
      now: {
        score: 88,
        confidence: "high",
        factors: [
          { code: "sea_temp", delta: 24 },
          { code: "wave_height", delta: 18 },
          { code: "toxic_report", delta: 12 },
          { code: "history", delta: 6 },
        ],
      },
      "24h": {
        score: 93,
        confidence: "high",
        factors: [
          { code: "sea_temp", delta: 26 },
          { code: "wave_height", delta: 21 },
          { code: "onshore_wind", delta: 10 },
        ],
      },
      "72h": {
        score: 72,
        confidence: "medium",
        factors: [
          { code: "sea_temp", delta: 18 },
          { code: "history", delta: 8 },
        ],
      },
    },
  },
  {
    beachId: 2,
    name: "함덕 해수욕장",
    region: "제주 제주시 조천읍",
    lat: 33.5432,
    lng: 126.6698,
    facingDirection: 10,
    priority: 1,
    vulnerabilityScore: 0.78,
    risk: {
      now: {
        score: 74,
        confidence: "high",
        factors: [
          { code: "sea_temp", delta: 20 },
          { code: "wave_height", delta: 14 },
          { code: "toxic_report", delta: 9 },
        ],
      },
      "24h": {
        score: 86,
        confidence: "medium",
        factors: [
          { code: "sea_temp", delta: 22 },
          { code: "onshore_wind", delta: 16 },
          { code: "wave_height", delta: 12 },
        ],
      },
      "72h": {
        score: 68,
        confidence: "medium",
        factors: [
          { code: "sea_temp", delta: 17 },
          { code: "history", delta: 9 },
        ],
      },
    },
  },
  {
    beachId: 3,
    name: "김녕 해수욕장",
    region: "제주 제주시 구좌읍",
    lat: 33.5578,
    lng: 126.7583,
    facingDirection: 15,
    priority: 2,
    vulnerabilityScore: 0.61,
    risk: {
      now: {
        score: 54,
        confidence: "high",
        factors: [
          { code: "onshore_wind", delta: 15 },
          { code: "history", delta: 7 },
        ],
      },
      "24h": {
        score: 63,
        confidence: "medium",
        factors: [
          { code: "onshore_wind", delta: 17 },
          { code: "sea_temp", delta: 11 },
        ],
      },
      "72h": {
        score: 47,
        confidence: "low",
        factors: [{ code: "history", delta: 8 }],
      },
    },
  },
  {
    beachId: 4,
    name: "월정 해수욕장",
    region: "제주 제주시 구좌읍",
    lat: 33.5565,
    lng: 126.7959,
    facingDirection: 20,
    priority: 3,
    vulnerabilityScore: 0.44,
    risk: {
      now: {
        score: 18,
        confidence: "high",
        factors: [{ code: "history", delta: 5 }],
      },
      "24h": {
        score: 34,
        confidence: "medium",
        factors: [
          { code: "onshore_wind", delta: 9 },
          { code: "history", delta: 5 },
        ],
      },
      "72h": {
        score: 22,
        confidence: "low",
        factors: [{ code: "history", delta: 4 }],
      },
    },
  },
  {
    beachId: 5,
    name: "성산일출봉 해변",
    region: "제주 서귀포시 성산읍",
    lat: 33.459,
    lng: 126.936,
    facingDirection: 90,
    priority: 2,
    vulnerabilityScore: 0.67,
    risk: {
      now: {
        score: 69,
        confidence: "high",
        factors: [
          { code: "wave_height", delta: 22 },
          { code: "sea_temp", delta: 9 },
        ],
      },
      "24h": {
        score: 71,
        confidence: "medium",
        factors: [
          { code: "wave_height", delta: 23 },
          { code: "onshore_wind", delta: 8 },
        ],
      },
      "72h": {
        score: 52,
        confidence: "low",
        factors: [{ code: "wave_height", delta: 13 }],
      },
    },
  },
  {
    beachId: 6,
    name: "표선 해수욕장",
    region: "제주 서귀포시 표선면",
    lat: 33.3262,
    lng: 126.8339,
    facingDirection: 135,
    priority: 3,
    vulnerabilityScore: 0.52,
    risk: {
      now: {
        score: 46,
        confidence: "high",
        factors: [
          { code: "sea_temp", delta: 13 },
          { code: "history", delta: 4 },
        ],
      },
      "24h": {
        score: 41,
        confidence: "medium",
        factors: [{ code: "sea_temp", delta: 11 }],
      },
      "72h": {
        score: 26,
        confidence: "low",
        factors: [{ code: "history", delta: 4 }],
      },
    },
  },
  {
    beachId: 7,
    name: "중문색달 해수욕장",
    region: "제주 서귀포시 색달동",
    lat: 33.2447,
    lng: 126.4103,
    facingDirection: 180,
    priority: 1,
    vulnerabilityScore: 0.88,
    risk: {
      now: {
        score: 91,
        confidence: "high",
        factors: [
          { code: "sea_temp", delta: 25 },
          { code: "toxic_report", delta: 19 },
          { code: "wave_height", delta: 11 },
        ],
      },
      "24h": {
        score: 89,
        confidence: "high",
        factors: [
          { code: "sea_temp", delta: 24 },
          { code: "toxic_report", delta: 15 },
          { code: "onshore_wind", delta: 9 },
        ],
      },
      "72h": {
        score: 75,
        confidence: "medium",
        factors: [
          { code: "sea_temp", delta: 19 },
          { code: "history", delta: 10 },
        ],
      },
    },
  },
  {
    beachId: 8,
    name: "화순금모래 해변",
    region: "제주 서귀포시 안덕면",
    lat: 33.2383,
    lng: 126.3348,
    facingDirection: 190,
    priority: 3,
    vulnerabilityScore: 0.39,
    risk: {
      now: {
        score: 16,
        confidence: "high",
        factors: [{ code: "history", delta: 4 }],
      },
      "24h": {
        score: 21,
        confidence: "medium",
        factors: [{ code: "history", delta: 5 }],
      },
      "72h": {
        score: 19,
        confidence: "low",
        factors: [{ code: "history", delta: 4 }],
      },
    },
  },
  {
    beachId: 9,
    name: "협재 해수욕장",
    region: "제주 제주시 한림읍",
    lat: 33.3941,
    lng: 126.2396,
    facingDirection: 290,
    priority: 2,
    vulnerabilityScore: 0.63,
    risk: {
      now: {
        score: 51,
        confidence: "high",
        factors: [
          { code: "onshore_wind", delta: 16 },
          { code: "sea_temp", delta: 6 },
        ],
      },
      "24h": {
        score: 61,
        confidence: "medium",
        factors: [
          { code: "onshore_wind", delta: 19 },
          { code: "sea_temp", delta: 8 },
        ],
      },
      "72h": {
        score: 44,
        confidence: "low",
        factors: [{ code: "onshore_wind", delta: 10 }],
      },
    },
  },
  {
    beachId: 10,
    name: "이호테우 해수욕장",
    region: "제주 제주시 이호동",
    lat: 33.4986,
    lng: 126.4525,
    facingDirection: 340,
    priority: 2,
    vulnerabilityScore: 0.7,
    risk: {
      now: {
        score: 66,
        confidence: "high",
        factors: [
          { code: "wave_height", delta: 17 },
          { code: "sea_temp", delta: 14 },
        ],
      },
      "24h": {
        score: 70,
        confidence: "medium",
        factors: [
          { code: "wave_height", delta: 18 },
          { code: "sea_temp", delta: 15 },
        ],
      },
      "72h": {
        score: 55,
        confidence: "low",
        factors: [{ code: "sea_temp", delta: 12 }],
      },
    },
  },
] satisfies BeachFixture[];

export function findBeach(beachId: number): BeachFixture | undefined {
  return BEACH_FIXTURES.find((beach) => beach.beachId === beachId);
}

export function toAdminBeachItem(beach: BeachFixture): AdminBeachItemResponse {
  return {
    beachId: beach.beachId,
    name: beach.name,
    region: beach.region,
    lat: beach.lat,
    lng: beach.lng,
    facingDirection: beach.facingDirection,
    priority: beach.priority,
    vulnerabilityScore: beach.vulnerabilityScore,
    isActive: true,
  } satisfies AdminBeachItemResponse;
}

// 6h 예측은 별도 시드 없이 현재~24h 사이를 보간한다
function resolveHorizonSeed(beach: BeachFixture, horizon: BackendHorizon): HorizonSeed {
  if (horizon !== "6h") return beach.risk[horizon];
  const now = beach.risk.now;
  const next = beach.risk["24h"];
  return {
    score: Math.round(now.score + (next.score - now.score) * 0.25),
    confidence: now.confidence,
    factors: now.factors,
  };
}

export type ToxicSourceResolver = (beachId: number) => number | null;

function toFactorTag(
  seed: FactorSeed,
  beachId: number,
  resolveToxicSource: ToxicSourceResolver,
): RiskFactorTagResponse {
  const catalog = FACTOR_CATALOG[seed.code];
  return {
    code: seed.code,
    name: catalog.name,
    detail: catalog.detail,
    delta: seed.delta,
    sourceReportId: seed.code === "toxic_report" ? resolveToxicSource(beachId) : null,
  } satisfies RiskFactorTagResponse;
}

export function toFactorSeeds(beach: BeachFixture): { code: FactorCode; name: string; detail: string; delta: number }[] {
  return beach.risk.now.factors.map((factor) => ({
    ...factor,
    ...FACTOR_CATALOG[factor.code],
  }));
}

export function buildLatestRisk(
  beach: BeachFixture,
  horizon: BackendHorizon,
  generatedAt: string,
): LatestRiskResponse {
  const seed = resolveHorizonSeed(beach, horizon);
  return {
    beachId: beach.beachId,
    name: beach.name,
    region: beach.region,
    lat: beach.lat,
    lng: beach.lng,
    riskLevel: scoreToLevel(seed.score),
    riskScore: seed.score,
    confidence: seed.confidence,
    horizon,
    minLevelApplied: false,
    generatedAt,
  } satisfies LatestRiskResponse;
}

export function buildBeachRisk(
  beach: BeachFixture,
  generatedAt: string,
  resolveToxicSource: ToxicSourceResolver,
): AdminBeachRiskResponse {
  const horizons = ["now", "24h", "72h"] as const;
  const cards = horizons.map(
    (horizon): RiskCardResponse => ({
      horizon,
      riskLevel: scoreToLevel(beach.risk[horizon].score),
      riskScore: beach.risk[horizon].score,
      confidence: beach.risk[horizon].confidence,
      generatedAt,
      factors: beach.risk[horizon].factors.map((factor) =>
        toFactorTag(factor, beach.beachId, resolveToxicSource),
      ),
    }),
  );

  return {
    beachId: beach.beachId,
    beachName: beach.name,
    region: beach.region,
    cards,
  } satisfies AdminBeachRiskResponse;
}

const RECOMMENDATION_FIXTURES = [
  {
    recommendationId: 1,
    actionCode: "normal",
    riskLevel: "safe",
    title: "정상 운영",
    description: "현재 해파리 출현 위험이 낮습니다. 정기 순찰을 유지하며 상황 변화를 확인해 주세요.",
    displayOrder: 1,
  },
  {
    recommendationId: 2,
    actionCode: "monitoring_up",
    riskLevel: "caution",
    title: "모니터링 강화",
    description:
      "해파리 출몰 가능성이 감지되고 있습니다. 순찰을 강화하고 해변 상황을 지속적으로 확인해 주세요.",
    displayOrder: 2,
  },
  {
    recommendationId: 3,
    actionCode: "entry_caution",
    riskLevel: "danger",
    title: "입수 주의 전달",
    description:
      "방문객의 입수 시 각별한 주의가 필요합니다. 안전수칙을 안내하고 위험 정보를 충분히 전달해 주세요.",
    displayOrder: 3,
  },
  {
    recommendationId: 4,
    actionCode: "lifeguard_added",
    riskLevel: "danger",
    title: "안전요원 추가",
    description:
      "신속한 대응을 위해 안전요원 추가 배치를 권장합니다. 순찰 구간을 확대하고 응급 상황에 대비해 주세요.",
    displayOrder: 4,
  },
  {
    recommendationId: 5,
    actionCode: "broadcast",
    riskLevel: "danger",
    title: "안내방송",
    description:
      "현재 해변의 위험 정보를 안내방송으로 알려주세요. 방문객이 상황을 인지하고 안전하게 행동할 수 있도록 안내가 필요합니다.",
    displayOrder: 5,
  },
  {
    recommendationId: 6,
    actionCode: "entry_ban",
    riskLevel: "severe",
    title: "입수 통제 검토",
    description:
      "해파리 출몰 위험이 높게 예측됩니다. 현장 상황을 확인한 뒤 입수 제한 여부를 검토해 주세요.",
    displayOrder: 6,
  },
  {
    recommendationId: 7,
    actionCode: "zone_control_review",
    riskLevel: "severe",
    title: "구역 통제 검토",
    description:
      "특정 구역의 위험도가 매우 높습니다. 방문객의 안전을 위해 구역 폐쇄 또는 출입 제한을 검토해 주세요.",
    displayOrder: 7,
  },
] satisfies RecommendationItemResponse[];

// 현재 등급 이하 단계의 권장 조치를 누적해 보여준다(안전 등급은 정상 운영만)
export function buildRecommendations(beach: BeachFixture): RecommendationViewResponse {
  const currentRiskLevel = scoreToLevel(beach.risk.now.score);
  const currentRank = LEVEL_RANK[currentRiskLevel];
  const recommendations = RECOMMENDATION_FIXTURES.filter((item) =>
    currentRank === 0
      ? item.riskLevel === "safe"
      : item.riskLevel !== "safe" && LEVEL_RANK[item.riskLevel] <= currentRank,
  );

  return {
    beachId: beach.beachId,
    currentRiskLevel,
    recommendations,
  } satisfies RecommendationViewResponse;
}
