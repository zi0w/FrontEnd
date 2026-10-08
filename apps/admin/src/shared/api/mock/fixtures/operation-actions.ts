import type { OperationActionListItemResponse, OperationStatus } from "../../types";
import { daysAgo, todayAt } from "../demo-time";

type ActionSeed = {
  actionId: number;
  beachId: number;
  operationStatus: OperationStatus;
  memo: string | null;
  createdBy: number;
  createdByName: string;
  // 오늘(KST) 비율 지점 또는 n일 전
  when: { todayRatio: number } | { daysAgo: number; hourOffset: number };
};

const BROADCAST_MEMO =
  "AI 예측 결과에 따라 해파리 출몰 위험이 높아질 것으로 판단되어 해수욕장 전 구역을 대상으로 안전 안내방송을 실시했습니다. 방문객에게 입수 시 주의사항과 해파리 발견 시 행동 요령을 안내했습니다.";

const ACTION_SEEDS = [
  { actionId: 58, beachId: 1, operationStatus: "broadcast", memo: BROADCAST_MEMO, createdBy: 2, createdByName: "김민수", when: { todayRatio: 0.85 } },
  { actionId: 57, beachId: 1, operationStatus: "lifeguard_added", memo: "동측 구역 안전요원 2명 추가 배치. 15시 이후 위험도 변동 여부를 재확인할 예정입니다.", createdBy: 2, createdByName: "김민수", when: { todayRatio: 0.6 } },
  { actionId: 56, beachId: 7, operationStatus: "entry_ban", memo: "독성 의심 제보 확인 후 해수욕장 전 구역 입수를 통제했습니다.", createdBy: 3, createdByName: "이서윤", when: { todayRatio: 0.75 } },
  { actionId: 55, beachId: 7, operationStatus: "zone_control_review", memo: null, createdBy: 3, createdByName: "이서윤", when: { todayRatio: 0.4 } },
  { actionId: 54, beachId: 2, operationStatus: "entry_caution", memo: "입수객 대상 해파리 주의 안내문 배포 및 현장 안내를 진행했습니다.", createdBy: 2, createdByName: "김민수", when: { todayRatio: 0.55 } },
  { actionId: 53, beachId: 10, operationStatus: "monitoring_up", memo: "순찰 주기를 1시간에서 30분으로 단축했습니다.", createdBy: 4, createdByName: "박지훈", when: { todayRatio: 0.5 } },
  { actionId: 52, beachId: 5, operationStatus: "monitoring_up", memo: null, createdBy: 4, createdByName: "박지훈", when: { todayRatio: 0.3 } },
  { actionId: 51, beachId: 1, operationStatus: "broadcast", memo: "오전 순찰 결과 특이사항 없음. 정기 안내방송 실시.", createdBy: 2, createdByName: "김민수", when: { daysAgo: 1, hourOffset: -3 } },
  { actionId: 50, beachId: 2, operationStatus: "monitoring_up", memo: null, createdBy: 2, createdByName: "김민수", when: { daysAgo: 1, hourOffset: -5 } },
  { actionId: 49, beachId: 7, operationStatus: "broadcast", memo: BROADCAST_MEMO, createdBy: 3, createdByName: "이서윤", when: { daysAgo: 1, hourOffset: -6 } },
  { actionId: 48, beachId: 9, operationStatus: "entry_caution", memo: "해변 방향 풍향 지속으로 입수 주의 안내를 진행했습니다.", createdBy: 4, createdByName: "박지훈", when: { daysAgo: 2, hourOffset: -2 } },
  { actionId: 47, beachId: 3, operationStatus: "monitoring_up", memo: null, createdBy: 4, createdByName: "박지훈", when: { daysAgo: 2, hourOffset: -4 } },
  { actionId: 46, beachId: 6, operationStatus: "resumed", memo: "위험도 하락 확인 후 정상 운영을 재개했습니다.", createdBy: 3, createdByName: "이서윤", when: { daysAgo: 3, hourOffset: -1 } },
  { actionId: 45, beachId: 4, operationStatus: "normal", memo: null, createdBy: 2, createdByName: "김민수", when: { daysAgo: 3, hourOffset: -5 } },
  { actionId: 44, beachId: 8, operationStatus: "normal", memo: null, createdBy: 3, createdByName: "이서윤", when: { daysAgo: 4, hourOffset: -2 } },
] satisfies ActionSeed[];

export function buildOperationActionFixtures(now: number): OperationActionListItemResponse[] {
  return ACTION_SEEDS.map((seed) => {
    const when: ActionSeed["when"] = seed.when;
    const createdAt =
      "todayRatio" in when
        ? todayAt(now, when.todayRatio)
        : daysAgo(now, when.daysAgo, when.hourOffset);

    return {
      actionId: seed.actionId,
      beachId: seed.beachId,
      operationStatus: seed.operationStatus,
      actionType: seed.operationStatus,
      memo: seed.memo,
      riskScoreId: null,
      recommendationId: null,
      createdBy: seed.createdBy,
      createdByName: seed.createdByName,
      createdAt,
    } satisfies OperationActionListItemResponse;
  });
}
