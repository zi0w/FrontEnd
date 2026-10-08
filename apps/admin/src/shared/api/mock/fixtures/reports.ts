import type {
  BackendAiResult,
  BackendReportStatus,
  BackendReportType,
  ReportDetailResponse,
} from "../../types";
import { HOUR_MS } from "../demo-time";
import { findBeach } from "./beaches";

const DEMO_MEDIA_HOST = "https://demo.jellysafe.local";

type ReportSeed = {
  reportId: number;
  beachId: number | null;
  reportType: BackendReportType;
  status: BackendReportStatus;
  aiResult: BackendAiResult | null;
  aiConfidence: number | null;
  hoursAgo: number;
  // 접수 시각보다 몇 분 먼저 목격했는지
  occurredMinutesBefore: number;
  // 해변 좌표 기준 제보 위치 오프셋
  offset: [number, number];
  hasImage: boolean;
  duplicateOfReportId?: number;
  // 해변 미배정 제보의 위치/가까운 해변 맥락
  unassigned?: { lat: number; lng: number; nearestBeachId: number; distanceKm: number };
};

// 상태 분포: 미검수(ai_done) 다수 + 보류·확인·반영·반려·AI 분석 중 혼합
const REPORT_SEEDS = [
  { reportId: 1024, beachId: 1, reportType: "multiple", status: "ai_done", aiResult: "toxic_suspected", aiConfidence: 0.91, hoursAgo: 0.4, occurredMinutesBefore: 15, offset: [0.0011, -0.0008], hasImage: true },
  { reportId: 1023, beachId: 7, reportType: "sting", status: "ai_done", aiResult: "toxic_suspected", aiConfidence: 0.87, hoursAgo: 0.9, occurredMinutesBefore: 25, offset: [-0.0006, 0.0012], hasImage: true },
  { reportId: 1022, beachId: 2, reportType: "general", status: "ai_processing", aiResult: null, aiConfidence: null, hoursAgo: 1.1, occurredMinutesBefore: 10, offset: [0.0004, 0.0009], hasImage: true },
  { reportId: 1021, beachId: null, reportType: "general", status: "ai_done", aiResult: "normal", aiConfidence: 0.74, hoursAgo: 1.6, occurredMinutesBefore: 30, offset: [0, 0], hasImage: true, unassigned: { lat: 33.5164, lng: 126.5291, nearestBeachId: 1, distanceKm: 5.3 } },
  { reportId: 1020, beachId: 10, reportType: "multiple", status: "ai_done", aiResult: "toxic_suspected", aiConfidence: 0.82, hoursAgo: 2.3, occurredMinutesBefore: 20, offset: [0.0009, 0.0005], hasImage: true },
  { reportId: 1019, beachId: 1, reportType: "sting", status: "hold", aiResult: "unknown", aiConfidence: 0.48, hoursAgo: 3.2, occurredMinutesBefore: 45, offset: [-0.001, -0.0004], hasImage: true },
  { reportId: 1018, beachId: 5, reportType: "general", status: "ai_done", aiResult: "normal", aiConfidence: 0.69, hoursAgo: 3.9, occurredMinutesBefore: 12, offset: [0.0007, -0.0011], hasImage: true },
  { reportId: 1017, beachId: 3, reportType: "general", status: "ai_done", aiResult: "unknown", aiConfidence: 0.41, hoursAgo: 4.6, occurredMinutesBefore: 35, offset: [-0.0005, 0.0007], hasImage: true },
  { reportId: 1016, beachId: 7, reportType: "multiple", status: "reflected", aiResult: "toxic_suspected", aiConfidence: 0.94, hoursAgo: 5.5, occurredMinutesBefore: 20, offset: [0.0012, 0.0003], hasImage: true },
  { reportId: 1015, beachId: 2, reportType: "sting", status: "reflected", aiResult: "toxic_suspected", aiConfidence: 0.89, hoursAgo: 6.8, occurredMinutesBefore: 40, offset: [-0.0008, -0.0006], hasImage: true },
  { reportId: 1014, beachId: 2, reportType: "general", status: "rejected", aiResult: "normal", aiConfidence: 0.58, hoursAgo: 7.4, occurredMinutesBefore: 18, offset: [0.0003, -0.0009], hasImage: true, duplicateOfReportId: 1015 },
  { reportId: 1013, beachId: 9, reportType: "general", status: "ai_done", aiResult: "normal", aiConfidence: 0.77, hoursAgo: 9.2, occurredMinutesBefore: 22, offset: [0.0006, 0.0006], hasImage: true },
  { reportId: 1012, beachId: null, reportType: "sting", status: "hold", aiResult: "unknown", aiConfidence: 0.36, hoursAgo: 11.5, occurredMinutesBefore: 60, offset: [0, 0], hasImage: true, unassigned: { lat: 33.2891, lng: 126.6152, nearestBeachId: 6, distanceKm: 8.7 } },
  { reportId: 1011, beachId: 6, reportType: "general", status: "verified", aiResult: "normal", aiConfidence: 0.81, hoursAgo: 14, occurredMinutesBefore: 30, offset: [-0.0009, 0.0008], hasImage: true },
  { reportId: 1010, beachId: 1, reportType: "multiple", status: "reflected", aiResult: "toxic_suspected", aiConfidence: 0.92, hoursAgo: 18, occurredMinutesBefore: 25, offset: [0.0005, 0.0012], hasImage: true },
  { reportId: 1009, beachId: 4, reportType: "general", status: "rejected", aiResult: "normal", aiConfidence: 0.33, hoursAgo: 21, occurredMinutesBefore: 50, offset: [-0.0004, -0.0012], hasImage: true },
  { reportId: 1008, beachId: 10, reportType: "general", status: "ai_done", aiResult: "unknown", aiConfidence: 0.52, hoursAgo: 26, occurredMinutesBefore: 15, offset: [0.001, -0.0002], hasImage: true },
  { reportId: 1007, beachId: 7, reportType: "sting", status: "reflected", aiResult: "toxic_suspected", aiConfidence: 0.9, hoursAgo: 30, occurredMinutesBefore: 35, offset: [-0.0011, 0.0004], hasImage: true },
  { reportId: 1006, beachId: 5, reportType: "multiple", status: "verified", aiResult: "toxic_suspected", aiConfidence: 0.79, hoursAgo: 34, occurredMinutesBefore: 28, offset: [0.0008, 0.0009], hasImage: true },
  { reportId: 1005, beachId: 3, reportType: "general", status: "hold", aiResult: "unknown", aiConfidence: 0.44, hoursAgo: 40, occurredMinutesBefore: 40, offset: [0.0002, -0.0007], hasImage: true },
  { reportId: 1004, beachId: null, reportType: "general", status: "ai_done", aiResult: "normal", aiConfidence: 0.63, hoursAgo: 45, occurredMinutesBefore: 20, offset: [0, 0], hasImage: true, unassigned: { lat: 33.4512, lng: 126.2861, nearestBeachId: 9, distanceKm: 6.4 } },
  { reportId: 1003, beachId: 8, reportType: "general", status: "verified", aiResult: "normal", aiConfidence: 0.71, hoursAgo: 52, occurredMinutesBefore: 25, offset: [-0.0006, -0.0005], hasImage: true },
  { reportId: 1002, beachId: 9, reportType: "sting", status: "reflected", aiResult: "toxic_suspected", aiConfidence: 0.85, hoursAgo: 60, occurredMinutesBefore: 30, offset: [0.0007, -0.0008], hasImage: true },
  { reportId: 1001, beachId: 2, reportType: "general", status: "rejected", aiResult: "normal", aiConfidence: 0.29, hoursAgo: 70, occurredMinutesBefore: 45, offset: [0.0004, 0.0004], hasImage: false },
] satisfies ReportSeed[];

function toReportDetail(seed: ReportSeed, now: number): ReportDetailResponse {
  const submittedTime = now - seed.hoursAgo * HOUR_MS;
  const beach = seed.beachId !== null ? findBeach(seed.beachId) : undefined;
  const nearestBeach = seed.unassigned ? findBeach(seed.unassigned.nearestBeachId) : undefined;

  // 사진이 파기된 제보는 좌표도 함께 파기된 것으로 표현한다
  const lat = seed.hasImage
    ? (seed.unassigned?.lat ?? (beach ? beach.lat + seed.offset[0] : null))
    : null;
  const lng = seed.hasImage
    ? (seed.unassigned?.lng ?? (beach ? beach.lng + seed.offset[1] : null))
    : null;
  const imageUrl = seed.hasImage
    ? `${DEMO_MEDIA_HOST}/uploads/reports/${seed.reportId}.jpg`
    : null;

  return {
    reportId: seed.reportId,
    beachId: beach?.beachId ?? null,
    beachName: beach?.name ?? null,
    beachLat: beach?.lat ?? null,
    beachLng: beach?.lng ?? null,
    lat,
    lng,
    nearestBeachId: nearestBeach?.beachId ?? null,
    nearestBeachName: nearestBeach?.name ?? null,
    nearestBeachDistanceKm: seed.unassigned?.distanceKm ?? null,
    reportType: seed.reportType,
    status: seed.status,
    aiResult: seed.aiResult,
    aiConfidence: seed.aiConfidence,
    imageUrl,
    thumbnailUrl: null,
    submittedAt: new Date(submittedTime).toISOString(),
    occurredAt: new Date(submittedTime - seed.occurredMinutesBefore * 60 * 1000).toISOString(),
    reflectedAt:
      seed.status === "reflected" ? new Date(submittedTime + 0.5 * HOUR_MS).toISOString() : null,
    duplicateOfReportId: seed.duplicateOfReportId ?? null,
  } satisfies ReportDetailResponse;
}

export function buildReportFixtures(now: number): ReportDetailResponse[] {
  return REPORT_SEEDS.map((seed) => toReportDetail(seed, now));
}
