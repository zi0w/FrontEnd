import type {
  AdminNotificationListItemResponse,
  BackendRiskLevel,
  NotificationEventType,
  NotificationTargetType,
} from "../../types";
import { hoursAgo } from "../demo-time";
import { findBeach } from "./beaches";

type NotificationSeed = {
  notificationId: number;
  targetType: NotificationTargetType;
  beachId: number;
  riskLevel: BackendRiskLevel;
  eventType: NotificationEventType;
  title: string;
  message: string;
  hoursAgo: number;
  isRead: boolean;
};

const NOTIFICATION_SEEDS = [
  {
    notificationId: 208,
    targetType: "admin",
    beachId: 1,
    riskLevel: "severe",
    eventType: "toxic_report",
    title: "해파리 출현 주의 알림",
    message:
      "삼양 해수욕장 인근 해역에서 해파리 다수 출현이 확인되었습니다. 해변 이용객에게 즉시 주의 안내를 진행해주세요.",
    hoursAgo: 0.3,
    isRead: false,
  },
  {
    notificationId: 207,
    targetType: "operator",
    beachId: 7,
    riskLevel: "severe",
    eventType: "sting_report",
    title: "쏘임 사고 제보 접수",
    message:
      "중문색달 해수욕장에서 쏘임 사고 제보가 접수되었습니다. 응급 처치 키트와 안전요원 배치를 확인해주세요.",
    hoursAgo: 0.8,
    isRead: false,
  },
  {
    notificationId: 206,
    targetType: "admin",
    beachId: 2,
    riskLevel: "danger",
    eventType: "toxic_report",
    title: "독성 의심 해파리 제보 대응",
    message:
      "함덕 해수욕장에서 독성 의심 해파리 제보가 접수되었습니다. 현장 확인 후 필요 시 입수 통제를 검토해주세요.",
    hoursAgo: 2.5,
    isRead: true,
  },
  {
    notificationId: 205,
    targetType: "admin",
    beachId: 7,
    riskLevel: "severe",
    eventType: "level_up",
    title: "위험 등급 상향 안내",
    message:
      "중문색달 해수욕장 위험 등급이 심각으로 상향되었습니다. 운영 인력 배치와 안내 방송을 강화해주세요.",
    hoursAgo: 4.2,
    isRead: true,
  },
  {
    notificationId: 204,
    targetType: "operator",
    beachId: 5,
    riskLevel: "danger",
    eventType: "level_up",
    title: "파고 증가 연계 주의",
    message:
      "성산일출봉 해변 해역 파고 증가로 해파리 유입 가능성이 높아졌습니다. 관광객 대상 안전 수칙을 안내해주세요.",
    hoursAgo: 7,
    isRead: true,
  },
  {
    notificationId: 203,
    targetType: "admin",
    beachId: 10,
    riskLevel: "danger",
    eventType: "level_up",
    title: "위험 등급 상향 안내",
    message:
      "이호테우 해수욕장 위험 등급이 위험으로 상향되었습니다. 모니터링 주기를 단축하고 입수객에게 주의를 안내해주세요.",
    hoursAgo: 12,
    isRead: true,
  },
  {
    notificationId: 202,
    targetType: "operator",
    beachId: 9,
    riskLevel: "caution",
    eventType: "level_up",
    title: "야간 순찰 강화 요청",
    message:
      "협재 해수욕장 인근에서 소규모 해파리 출현이 보고되었습니다. 야간 순찰 및 안내 표지 점검을 요청드립니다.",
    hoursAgo: 20,
    isRead: true,
  },
  {
    notificationId: 201,
    targetType: "admin",
    beachId: 3,
    riskLevel: "caution",
    eventType: "level_up",
    title: "해변 방향 풍향 주의",
    message:
      "김녕 해수욕장에 해변 방향 바람이 이어지고 있습니다. 연안 유입 가능성에 대비해 순찰을 강화해주세요.",
    hoursAgo: 30,
    isRead: true,
  },
] satisfies NotificationSeed[];

export function buildNotificationFixtures(now: number): AdminNotificationListItemResponse[] {
  return NOTIFICATION_SEEDS.map((seed) => {
    const createdAt = hoursAgo(now, seed.hoursAgo);
    return {
      notificationId: seed.notificationId,
      targetType: seed.targetType,
      beachId: seed.beachId,
      beachName: findBeach(seed.beachId)?.name ?? null,
      riskLevel: seed.riskLevel,
      eventType: seed.eventType,
      title: seed.title,
      message: seed.message,
      createdAt,
      readAt: seed.isRead ? createdAt : null,
    } satisfies AdminNotificationListItemResponse;
  });
}
