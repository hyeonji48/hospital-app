// AI가 뽑은 행동 리스트 → 화면이 쓰는 Task[]
//
// 두 세계를 잇는 다리다.
//
//   ActionStep[]   "피 뽑는 곳으로 가세요" (AI가 만든 말)
//        ↓  routeBetweenPlaces()          (코드가 계산한 길)
//   Task[]         화면·지도·TTS가 아는 유일한 형태
//
// Task/NavStep 을 경계 인터페이스로 고정했기 때문에, 이 파일만 통과하면
// 기존 화면 코드는 한 줄도 바뀌지 않는다.

import type { ActionStep } from "./noticeTransform";
import { routeBetweenPlaces, estimateMinutes, type RouteOptions } from "./router";
import { PLACE_BY_ID } from "../data/places";
import type { Task, NavStep } from "../types";

/**
 * 환자가 앱을 켜는 지점 = 정문.
 *
 * 접수 창구로 잡으면 첫 단계가 "원무과 → 원무과"가 되어 안내가 비어버린다.
 * 정문에서 시작해야 첫 화면부터 "접수하는 곳으로 가세요"가 나온다.
 * (NFC 태그는 정문·키오스크 주변에 붙는다)
 */
export const START_PLACE_ID = "smg-1f-entrance";

export interface BuildResult {
  tasks: Task[];
  /** 경로를 찾지 못해 건너뛴 단계 — 조용히 삼키지 않고 위로 올린다 */
  skipped: Array<{ step: ActionStep; reason: string }>;
}

export function buildTasks(
  actions: ActionStep[],
  opts: { startPlaceId?: string } & RouteOptions = {},
): BuildResult {
  const tasks: Task[] = [];
  const skipped: BuildResult["skipped"] = [];
  let cursor = opts.startPlaceId ?? START_PLACE_ID;

  actions.forEach((action, index) => {
    if (!action.placeId) {
      skipped.push({ step: action, reason: "장소 사전에 없는 곳" });
      return;
    }

    const place = PLACE_BY_ID.get(action.placeId);
    if (!place) {
      skipped.push({ step: action, reason: "장소 정보 없음" });
      return;
    }

    // 같은 곳에 연달아 머무는 경우(진료 후 같은 자리 대기)는 이동이 없다
    const sameSpot = cursor === action.placeId;
    const routed = sameSpot
      ? { navSteps: [] as NavStep[], totalCost: 0 }
      : routeBetweenPlaces(cursor, action.placeId, place.official, opts);

    if (!routed) {
      skipped.push({ step: action, reason: "경로를 찾지 못함" });
      return;
    }

    tasks.push({
      id: index + 1,
      doctor: action.doctor,
      title: action.action,
      summary: action.summary,
      shortTitle: place.easy,
      location: `${place.building} ${place.floor}층 ${place.official}`,
      floor: place.floor,
      steps: routed.navSteps.length > 0 ? routed.navSteps : [stayStep(place.floor, place.official)],
      arrivalTitle: `${place.official} 도착`,
      arrivalDetail: action.detail ?? "안내에 따라 진행하세요",
      estimatedTime: sameSpot ? "바로" : estimateMinutes(routed.totalCost),
    });

    cursor = action.placeId;
  });

  return { tasks, skipped };
}

/**
 * 이동 없이 같은 자리에 머무는 단계용 더미 NavStep.
 * 화면이 빈 steps 배열을 만나면 깨지므로 한 장은 반드시 준다.
 */
function stayStep(floor: number, label: string): NavStep {
  return {
    instruction: `${label} 앞에서\n기다리세요`,
    detail: "이름을 부르면 들어가세요",
    dirIcon: "up",
    floor,
    targetRoom: label,
    userPos: [180, 120],
    destPos: [180, 120],
    pathPoints: [],
  };
}
