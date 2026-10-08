import type {
  AlertListItemResponse,
  BackendHorizon,
  BackendRiskLevel,
  BeachDetailResponse,
  BeachListItemResponse,
  DataConfidence,
  PublicBeachRiskResponse,
  PublicGuideResponse,
  PublicRiskFactorResponse,
  PublicRiskPointResponse,
  ReportAiResult,
  ReportBackendType,
} from "../types";

// 시각은 항상 현재 기준 상대값으로 생성해 데이터가 최신처럼 보이게 한다.
export function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

type FactorCode = "SEA_TEMP" | "WAVE_HEIGHT" | "ONSHORE_WIND" | "SIGHTING_HISTORY" | "TOXIC_REPORT";

const FACTOR_NAME: Record<FactorCode, string> = {
  SEA_TEMP: "수온 상승",
  WAVE_HEIGHT: "파고 증가",
  ONSHORE_WIND: "해변 방향 풍향",
  SIGHTING_HISTORY: "과거 출현 이력",
  TOXIC_REPORT: "독성 의심 제보",
};

type SeedFactor = [code: FactorCode, detail: string, scoreDelta: number];

type SeedPoint = {
  level: BackendRiskLevel;
  score: number;
  confidence: DataConfidence;
  factors: SeedFactor[];
};

type SeedBeach = {
  beachId: number;
  name: string;
  region: string;
  lat: number;
  lng: number;
  facingDirection: number;
  vulnerabilityScore: number;
  timeline: Record<"now" | "24h" | "72h", SeedPoint>;
};

const SEED_BEACHES: SeedBeach[] = [
  {
    beachId: 1,
    name: "삼양 해수욕장",
    region: "제주 제주시 삼양동",
    lat: 33.5253,
    lng: 126.5859,
    facingDirection: 0,
    vulnerabilityScore: 0.82,
    timeline: {
      now: {
        level: "severe",
        score: 99,
        confidence: "high",
        factors: [
          ["SEA_TEMP", "삼양 해변 표층 수온이 평년보다 크게 높아 해파리 밀집이 심각합니다.", 34],
          ["SIGHTING_HISTORY", "최근 삼양 인근에서 대형 해파리 출현 신고가 반복적으로 접수되었습니다.", 28],
          ["TOXIC_REPORT", "쏘임 피해 제보가 다수 접수되어 독성 해파리 가능성이 높습니다.", 25],
        ],
      },
      "24h": {
        level: "severe",
        score: 88,
        confidence: "high",
        factors: [
          ["SEA_TEMP", "24시간 후에도 삼양 해변의 높은 수온이 유지되어 밀집이 지속될 전망입니다.", 32],
          ["ONSHORE_WIND", "해변 방향으로 부는 바람이 이어져 해파리 유입이 계속될 것으로 보입니다.", 24],
        ],
      },
      "72h": {
        level: "danger",
        score: 72,
        confidence: "medium",
        factors: [
          ["SEA_TEMP", "72시간 후 수온이 다소 내려가며 밀집도가 점차 완화될 것으로 예상됩니다.", 26],
          ["SIGHTING_HISTORY", "과거 패턴상 사흘 뒤에도 잔존 개체가 남아 위험이 이어질 수 있습니다.", 20],
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
    vulnerabilityScore: 0.74,
    timeline: {
      now: {
        level: "danger",
        score: 78,
        confidence: "high",
        factors: [
          ["WAVE_HEIGHT", "함덕 앞바다 파고가 높아지며 해파리가 연안으로 밀려들고 있습니다.", 27],
          ["SEA_TEMP", "표층 수온 상승으로 함덕 해변 인근 해파리 활동이 활발합니다.", 24],
        ],
      },
      "24h": {
        level: "severe",
        score: 84,
        confidence: "high",
        factors: [
          ["ONSHORE_WIND", "24시간 뒤 해변 방향 풍향이 강해져 함덕 유입량이 늘어날 전망입니다.", 28],
          ["WAVE_HEIGHT", "이어지는 높은 파고로 해파리 유입 위험이 한층 커집니다.", 22],
          ["SIGHTING_HISTORY", "성수기 함덕에서 다수 출현한 이력이 있어 주의가 필요합니다.", 16],
        ],
      },
      "72h": {
        level: "danger",
        score: 66,
        confidence: "medium",
        factors: [
          ["SEA_TEMP", "72시간 후 수온이 소폭 낮아지며 위험도가 다소 완화됩니다.", 22],
          ["WAVE_HEIGHT", "잔여 너울로 인해 해파리 유입 가능성은 여전히 남아 있습니다.", 18],
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
    vulnerabilityScore: 0.58,
    timeline: {
      now: {
        level: "caution",
        score: 54,
        confidence: "high",
        factors: [
          ["SEA_TEMP", "김녕 해변 수온이 완만히 오르며 해파리 출몰 가능성이 커지고 있습니다.", 21],
          ["SIGHTING_HISTORY", "지난해 같은 시기 김녕에서 소규모 출현이 관측된 바 있습니다.", 14],
        ],
      },
      "24h": {
        level: "danger",
        score: 62,
        confidence: "high",
        factors: [
          ["ONSHORE_WIND", "24시간 후 해변 방향 바람이 강해져 김녕 해변 유입이 증가할 전망입니다.", 23],
          ["SEA_TEMP", "수온 상승세가 이어져 해파리 활동이 더 활발해집니다.", 19],
        ],
      },
      "72h": {
        level: "caution",
        score: 48,
        confidence: "medium",
        factors: [["SEA_TEMP", "72시간 후 수온이 안정되며 김녕 해변 위험도가 낮아질 것으로 보입니다.", 17]],
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
    vulnerabilityScore: 0.31,
    timeline: {
      now: {
        level: "safe",
        score: 12,
        confidence: "high",
        factors: [["SIGHTING_HISTORY", "월정 해변은 최근 해파리 신고가 거의 없어 안전한 상태입니다.", 4]],
      },
      "24h": {
        level: "safe",
        score: 20,
        confidence: "high",
        factors: [["SEA_TEMP", "24시간 후 수온이 소폭 오르지만 월정 해변은 여전히 안전 수준입니다.", 7]],
      },
      "72h": {
        level: "caution",
        score: 28,
        confidence: "medium",
        factors: [
          ["ONSHORE_WIND", "72시간 후 풍향 변화로 월정 해변에 소량 유입 가능성이 생깁니다.", 10],
          ["SEA_TEMP", "수온 상승이 이어지면 주의 단계로 올라설 수 있어 지켜볼 필요가 있습니다.", 8],
        ],
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
    vulnerabilityScore: 0.69,
    timeline: {
      now: {
        level: "danger",
        score: 71,
        confidence: "high",
        factors: [
          ["WAVE_HEIGHT", "성산 앞바다 파고가 높아 해파리가 해변으로 밀려들고 있습니다.", 25],
          ["ONSHORE_WIND", "동쪽에서 해변으로 부는 바람이 성산 해변 유입을 키우고 있습니다.", 22],
        ],
      },
      "24h": {
        level: "danger",
        score: 63,
        confidence: "high",
        factors: [
          ["SEA_TEMP", "24시간 뒤 수온이 유지되며 성산 해변의 위험이 이어집니다.", 21],
          ["WAVE_HEIGHT", "높은 파고가 계속되어 유입 위험이 남아 있습니다.", 18],
        ],
      },
      "72h": {
        level: "caution",
        score: 55,
        confidence: "medium",
        factors: [["ONSHORE_WIND", "72시간 후 풍향이 바뀌며 성산 해변 유입이 줄어들 전망입니다.", 15]],
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
    vulnerabilityScore: 0.52,
    timeline: {
      now: {
        level: "caution",
        score: 48,
        confidence: "high",
        factors: [
          ["SEA_TEMP", "표선 해변 수온이 서서히 올라 해파리 출몰 가능성이 있습니다.", 18],
          ["SIGHTING_HISTORY", "표선에서 소규모 출현 이력이 있어 입수 전 주의가 필요합니다.", 13],
        ],
      },
      "24h": {
        level: "caution",
        score: 40,
        confidence: "high",
        factors: [["SEA_TEMP", "24시간 후 수온이 소폭 낮아지며 위험도가 완화됩니다.", 14]],
      },
      "72h": {
        level: "caution",
        score: 33,
        confidence: "medium",
        factors: [["SIGHTING_HISTORY", "72시간 후에도 표선 해변은 주의 수준을 유지할 것으로 보입니다.", 11]],
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
    vulnerabilityScore: 0.88,
    timeline: {
      now: {
        level: "severe",
        score: 92,
        confidence: "high",
        factors: [
          ["TOXIC_REPORT", "중문 해변에서 쏘임 피해 제보가 잇따라 독성 해파리가 의심됩니다.", 31],
          ["SEA_TEMP", "높은 표층 수온으로 중문 해변 해파리 밀집이 심각한 상태입니다.", 27],
          ["WAVE_HEIGHT", "너울성 파도로 대형 해파리가 해변으로 밀려들고 있습니다.", 21],
        ],
      },
      "24h": {
        level: "severe",
        score: 80,
        confidence: "high",
        factors: [
          ["SEA_TEMP", "24시간 후에도 높은 수온이 유지되어 중문 해변 밀집이 이어집니다.", 28],
          ["TOXIC_REPORT", "독성 해파리 잔존으로 쏘임 위험이 계속될 것으로 보입니다.", 24],
        ],
      },
      "72h": {
        level: "danger",
        score: 68,
        confidence: "medium",
        factors: [
          ["WAVE_HEIGHT", "72시간 후 파고가 낮아지며 중문 해변 유입이 점차 줄어듭니다.", 20],
          ["SIGHTING_HISTORY", "사흘 뒤에도 잔존 개체로 인한 위험이 남을 수 있습니다.", 17],
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
    vulnerabilityScore: 0.34,
    timeline: {
      now: {
        level: "safe",
        score: 18,
        confidence: "high",
        factors: [["SIGHTING_HISTORY", "화순 해변은 최근 해파리 신고가 적어 안전하게 이용할 수 있습니다.", 6]],
      },
      "24h": {
        level: "caution",
        score: 24,
        confidence: "high",
        factors: [["SEA_TEMP", "24시간 후 수온이 잠시 오르며 주의 수준에 근접할 수 있습니다.", 9]],
      },
      "72h": {
        level: "safe",
        score: 16,
        confidence: "medium",
        factors: [["SIGHTING_HISTORY", "72시간 후 화순 해변은 다시 안전 수준으로 안정될 전망입니다.", 5]],
      },
    },
  },
  {
    beachId: 9,
    name: "협재 해수욕장",
    region: "제주 제주시 한림읍",
    lat: 33.3941,
    lng: 126.2396,
    facingDirection: 300,
    vulnerabilityScore: 0.61,
    timeline: {
      now: {
        level: "caution",
        score: 51,
        confidence: "high",
        factors: [
          ["SEA_TEMP", "협재 해변 수온이 오르며 해파리 출몰 가능성이 생기고 있습니다.", 19],
          ["ONSHORE_WIND", "북서풍이 해변으로 불며 협재 해변에 소량 유입이 관측됩니다.", 15],
        ],
      },
      "24h": {
        level: "caution",
        score: 58,
        confidence: "high",
        factors: [
          ["SEA_TEMP", "24시간 후 수온 상승이 이어져 협재 해변 주의가 지속됩니다.", 21],
          ["SIGHTING_HISTORY", "성수기 협재에서 출현 이력이 있어 관찰이 필요합니다.", 14],
        ],
      },
      "72h": {
        level: "caution",
        score: 44,
        confidence: "medium",
        factors: [["SEA_TEMP", "72시간 후 수온이 안정되며 협재 해변 위험도가 낮아집니다.", 15]],
      },
    },
  },
  {
    beachId: 10,
    name: "이호테우 해수욕장",
    region: "제주 제주시 이호동",
    lat: 33.4986,
    lng: 126.4525,
    facingDirection: 330,
    vulnerabilityScore: 0.66,
    timeline: {
      now: {
        level: "danger",
        score: 66,
        confidence: "high",
        factors: [
          ["ONSHORE_WIND", "해변 방향으로 부는 바람으로 이호테우에 해파리가 유입되고 있습니다.", 23],
          ["SEA_TEMP", "표층 수온 상승으로 이호테우 해변 해파리 활동이 활발합니다.", 20],
        ],
      },
      "24h": {
        level: "danger",
        score: 72,
        confidence: "high",
        factors: [
          ["WAVE_HEIGHT", "24시간 후 파고가 높아지며 이호테우 유입 위험이 커집니다.", 22],
          ["SEA_TEMP", "수온 상승세가 이어져 위험도가 한층 높아질 전망입니다.", 19],
          ["SIGHTING_HISTORY", "이호테우 인근 출현 이력이 있어 각별한 주의가 필요합니다.", 13],
        ],
      },
      "72h": {
        level: "caution",
        score: 52,
        confidence: "medium",
        factors: [["ONSHORE_WIND", "72시간 후 풍향이 바뀌며 이호테우 유입이 줄어들 것으로 보입니다.", 16]],
      },
    },
  },
];

// 등급별 안내문(상세 배너)
const GUIDE_TEXT_BY_LEVEL: Record<BackendRiskLevel, string> = {
  safe: "현재 해변은 안전하게 이용할 수 있습니다. 실시간 상황에 따라 위험도가 변할 수 있으니 안내 사항을 틈틈이 확인해 주세요.",
  caution: "해파리 출몰 가능성이 있습니다. 입수 전 주변을 살피고 안전요원의 안내를 따라주세요.",
  danger: "해파리 출몰 위험이 높습니다. 입수 시 각별히 주의하고 어린이와 노약자는 입수를 자제해 주세요.",
  severe: "해파리가 대량으로 관측되고 있습니다. 안전사고 예방을 위해 입수를 자제해 주시기 바랍니다.",
};

const RISK_LEVELS = ["safe", "caution", "danger", "severe"] as const satisfies readonly BackendRiskLevel[];

// 예측 생성 시각(현재 기준 몇 분 전)
const GENERATED_MINUTES_AGO = 12;

function findSeed(beachId: number): SeedBeach | undefined {
  return SEED_BEACHES.find((beach) => beach.beachId === beachId);
}

export function hasBeach(beachId: number): boolean {
  return findSeed(beachId) !== undefined;
}

export function buildBeachList(): BeachListItemResponse[] {
  return SEED_BEACHES.map((beach) => ({
    beachId: beach.beachId,
    name: beach.name,
    region: beach.region,
    lat: beach.lat,
    lng: beach.lng,
    currentRiskLevel: beach.timeline.now.level,
    priority: beach.beachId,
  })) satisfies BeachListItemResponse[];
}

export function buildBeachDetail(beachId: number): BeachDetailResponse | null {
  const beach = findSeed(beachId);
  if (!beach) return null;
  return {
    beachId: beach.beachId,
    name: beach.name,
    region: beach.region,
    lat: beach.lat,
    lng: beach.lng,
    facingDirection: beach.facingDirection,
    priority: beach.beachId,
    vulnerabilityScore: beach.vulnerabilityScore,
    isActive: true,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: minutesAgo(GENERATED_MINUTES_AGO),
  } satisfies BeachDetailResponse;
}

function toFactors(factors: SeedFactor[]): PublicRiskFactorResponse[] {
  return factors.map(([code, detail, scoreDelta]) => ({
    code,
    name: FACTOR_NAME[code],
    detail,
    scoreDelta,
  }));
}

const TIMELINE_HORIZONS = ["now", "24h", "72h"] as const satisfies readonly BackendHorizon[];

export function buildBeachRisk(beachId: number): PublicBeachRiskResponse | null {
  const beach = findSeed(beachId);
  if (!beach) return null;
  const generatedAt = minutesAgo(GENERATED_MINUTES_AGO);
  const riskTimeline: PublicRiskPointResponse[] = TIMELINE_HORIZONS.map((horizon) => {
    const point = beach.timeline[horizon];
    return {
      horizon,
      riskLevel: point.level,
      riskScore: point.score,
      factors: toFactors(point.factors),
      dataConfidence: point.confidence,
      generatedAt,
    };
  });
  const now = beach.timeline.now;
  return {
    beachId: beach.beachId,
    beachName: beach.name,
    horizon: "now",
    riskLevel: now.level,
    riskScore: now.score,
    factors: toFactors(now.factors),
    guideText: GUIDE_TEXT_BY_LEVEL[now.level],
    dataConfidence: now.confidence,
    generatedAt,
    riskTimeline,
  } satisfies PublicBeachRiskResponse;
}

// 관심 목록 조인용 해변 요약
export function findBeachSummary(
  beachId: number,
): { name: string; region: string; level: BackendRiskLevel; score: number } | null {
  const beach = findSeed(beachId);
  if (!beach) return null;
  return {
    name: beach.name,
    region: beach.region,
    level: beach.timeline.now.level,
    score: beach.timeline.now.score,
  };
}

// 응급 대처법 본문. 빈 줄(\n\n) 기준으로 카드 블록이 나뉜다.
const FIRST_AID_BODY = [
  "쏘인 즉시 환자를 물 밖으로 나오도록 하고, 쏘인 부위가 넓거나 환자 상태가 좋지 않으면 (호흡곤란, 의식불명) 바로 구급차를 부르고 구조요원에게 도움을 청한다.",
  "환자의 상태를 관찰하여 호흡곤란 등으로 인한 긴급한 구조가 필요하다고 판단되면 인공호흡을 비롯한 심폐소생술을 실시한다.",
  "쏘인 부위는 식염수로 세척한다.",
  "해파리 쏘임시에 알코올 종류의 세척제는 독액의 방출을 증가시킬 수 있어서 금한다. 작은부레관해파리의 쏘임시에는 식초가 독액의 방출을 증가시킬 수 있어서 식초를 이용한 세척을 금한다.",
  "테트라싸이클린(Tetracycline) 계열의 연고를 쏘임부위에 발라준다.",
  "열찜질 또는 냉찜질을 하면 통증을 완화시키는데 도움을 줄 수 있다.",
].join("\n\n");

export const GUIDES = [
  {
    id: 1,
    guideCode: "FIRST_AID",
    targetType: "public",
    riskLevel: null,
    title: "해파리 접촉피해 응급 대처법",
    body: FIRST_AID_BODY,
    displayOrder: 1,
  },
  ...RISK_LEVELS.map((level, index) => ({
    id: index + 2,
    guideCode: `RISK_${level.toUpperCase()}`,
    targetType: "public" as const,
    riskLevel: level,
    title: "위험 단계 안내",
    body: GUIDE_TEXT_BY_LEVEL[level],
    displayOrder: index + 2,
  })),
] satisfies PublicGuideResponse[];

// 알림 시드. 기존 화면 고정 알림(협재·함덕·이호테우·중문색달)과 겹치지 않는 해변만 사용.
type SeedAlert = Omit<AlertListItemResponse, "createdAt" | "readAt"> & { minutesAgo: number };

export const SEED_ALERTS: SeedAlert[] = [
  {
    notificationId: 103,
    beachId: 1,
    beachName: "삼양 해수욕장",
    riskLevel: "severe",
    eventType: "level_up",
    title: "삼양 해수욕장 위험도가 심각 단계로 상승했습니다",
    message:
      "수온 상승과 대형 해파리 출현 신고가 겹쳐 위험도가 심각 단계로 올랐습니다. 안전사고 예방을 위해 입수를 자제해 주세요.",
    minutesAgo: 18,
  },
  {
    notificationId: 102,
    beachId: 5,
    beachName: "성산일출봉 해변",
    riskLevel: "danger",
    eventType: "sting_report",
    title: null,
    message:
      "성산일출봉 해변 인근에서 해파리 쏘임 사고 제보가 접수되었습니다. 쏘인 경우 즉시 물 밖으로 나와 식염수로 세척해 주세요.",
    minutesAgo: 95,
  },
  {
    notificationId: 101,
    beachId: 3,
    beachName: "김녕 해수욕장",
    riskLevel: "caution",
    eventType: "toxic_report",
    title: null,
    message:
      "김녕 해수욕장에서 독성 해파리로 의심되는 개체가 제보되었습니다. 해파리를 발견하면 맨손으로 만지지 말고 안전요원에게 알려 주세요.",
    minutesAgo: 60 * 26,
  },
];

// 제보 AI 판별 결과(유형별)
export const REPORT_AI_OUTCOME: Record<
  ReportBackendType,
  { aiResult: ReportAiResult; aiConfidence: number; guideMessage: string }
> = {
  sting: {
    aiResult: "toxic_suspected",
    aiConfidence: 0.87,
    guideMessage:
      "쏘임 부위를 식염수로 세척하고, 통증이 심하거나 호흡곤란이 있으면 즉시 119에 연락해 주세요.\n제보 내용은 관리자 검토 후 해변 위험도에 반영됩니다.",
  },
  multiple: {
    aiResult: "toxic_suspected",
    aiConfidence: 0.74,
    guideMessage:
      "독성 해파리가 다수 출몰한 것으로 의심됩니다. 입수를 자제하고 주변 사람들에게도 알려 주세요.\n제보 내용은 관리자 검토 후 해변 위험도에 반영됩니다.",
  },
  general: {
    aiResult: "normal",
    aiConfidence: 0.91,
    guideMessage:
      "독성이 확인되지 않은 해파리로 판별되었습니다. 그래도 맨손으로 만지지 말고 거리를 두어 주세요.\n제보 내용은 관리자 검토 후 해변 위험도에 반영됩니다.",
  },
};
