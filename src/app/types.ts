export type DirIcon = "right" | "left" | "up" | "down" | "elevator";

export interface NavStep {
  instruction: string;
  detail: string;
  dirIcon: DirIcon;
  floor: number;
  userPos: [number, number];
  destPos: [number, number];
  pathPoints: Array<[number, number]>;
  targetRoom?: string;
  /** 이 구간 끝에서 꺾어야 하는 지점 (도면 좌표). 지도에 회전 표시를 그린다 */
  turnAt?: [number, number];
  /** 꺾은 뒤 진행할 방향 벡터 */
  turnHeading?: [number, number];
  /** 좌회전인지 우회전인지 */
  turnDir?: "left" | "right";
  isElevator?: boolean;
  elevatorFrom?: number;
  elevatorTo?: number;
}

export interface Task {
  id: number;
  /** 담당 의료진. 접수증에 적혀 있을 때만 채워진다 */
  doctor?: string;
  /** 완료 화면에 쓰는 명사형 한 마디. "접수", "채혈" */
  summary?: string;
  title: string;
  shortTitle: string;
  location: string;
  floor: number;
  steps: NavStep[];
  arrivalTitle: string;
  arrivalDetail: string;
  estimatedTime: string;
}

// 좌표계 안내
// ─────────────────────────────────────────────────────────────
// SVG viewBox 360 × 240. 방(x,y,w,h)과 경로점([x,y])이 같은 공간을 쓴다.
// 실제 도면과 노드 그래프는 data/floorPlan.ts, 경로 계산은 lib/router.ts.
//
// 예전에 여기 있던 TASKS 목데이터(가상 병원 6개 코스)는 삭제했다.
// 3층 신경외과·4층 CT실 같은 가상 층을 참조하고 있었는데 그 도면이 이미
// 부천성모 성모관 1F·2F 로 교체되어, 남겨두면 틀린 데이터가 될 뿐이었다.
// 이제 Task[] 는 접수증에서 만들어진다: noticeTransform → buildTasks → router.
