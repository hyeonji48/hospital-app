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
  isElevator?: boolean;
  elevatorFrom?: number;
  elevatorTo?: number;
}

export interface Task {
  id: number;
  title: string;
  shortTitle: string;
  location: string;
  floor: number;
  steps: NavStep[];
  arrivalTitle: string;
  arrivalDetail: string;
  estimatedTime: string;
}

// ───────────── COORDINATE REFERENCE ─────────────
// SVG viewport: 360 × 240
// Floor 1: corridor y=94~112  | top-rooms y=5~90  | bottom-rooms y=116~235
// Floor 2,3,4: corridor y=100~120 | top-rooms y=5~96 | bottom-rooms y=124~235

export const TASKS: Task[] = [
  {
    id: 1,
    title: "김멋사 교수님 진료",
    shortTitle: "정형외과 진료",
    location: "2층 정형외과 205번방",
    floor: 2,
    estimatedTime: "약 5분",
    arrivalTitle: "2층 정형외과 205번방 도착",
    arrivalDetail: "잠시 대기 후\n진료",
    steps: [
      {
        instruction: "원무과 접수 후\n오른쪽으로 직진",
        detail: "복도 끝 엘리베이터 방향으로 직진",
        dirIcon: "right",
        floor: 1,
        targetRoom: "엘리베이터",
        userPos: [270, 101],
        destPos: [212, 177],
        pathPoints: [[270, 101], [212, 101], [212, 117]],
      },
      {
        instruction: "엘리베이터 2층으로 이동",
        detail: "1층 → 2층",
        dirIcon: "elevator",
        floor: 1,
        userPos: [212, 177],
        destPos: [212, 177],
        pathPoints: [],
        isElevator: true,
        elevatorFrom: 1,
        elevatorTo: 2,
      },
      {
        instruction: "엘리베이터에서 내려 오른쪽으로 직진",
        detail: "간호사실 지나 205번방으로 이동",
        dirIcon: "right",
        floor: 2,
        targetRoom: "205",
        userPos: [27, 110],
        destPos: [295, 96],
        pathPoints: [[27, 110], [295, 110], [295, 96]],
      },
    ],
  },
  {
    id: 2,
    title: "CT 촬영",
    shortTitle: "CT 촬영",
    location: "4층 CT실",
    floor: 4,
    estimatedTime: "약 6분",
    arrivalTitle: "4층 CT실 도착",
    arrivalDetail: "진료의뢰서 제출 후\n검사복 환복",
    steps: [
      {
        instruction: "205번방 나와\n 왼쪽으로 이동",
        detail: "왼쪽으로 돌아 간호사실 앞 복도로 직진",
        dirIcon: "left",
        floor: 2,
        targetRoom: "엘리베이터",
        userPos: [295, 96],
        destPos: [27, 110],
        pathPoints: [[295, 96], [295, 110], [27, 110]],
      },
      {
        instruction: "엘리베이터 4층으로 이동",
        detail: "2층 → 4층",
        dirIcon: "elevator",
        floor: 2,
        userPos: [27, 110],
        destPos: [27, 110],
        pathPoints: [],
        isElevator: true,
        elevatorFrom: 2,
        elevatorTo: 4,
      },
      {
        instruction: "내려서\n 오른쪽으로 직진",
        detail: "CT 대기실 지나 CT실로 이동",
        dirIcon: "right",
        floor: 4,
        targetRoom: "CT실",
        userPos: [27, 110],
        destPos: [215, 125],
        pathPoints: [[27, 110], [215, 110], [215, 124]],
      },
    ],
  },
  {
    id: 3,
    title: "엑스레이 촬영",
    shortTitle: "엑스레이 촬영",
    location: "4층 엑스레이실",
    floor: 4,
    estimatedTime: "약 2분",
    arrivalTitle: "4층 엑스레이실 도착",
    arrivalDetail: "번호표 뽑고 대기\n(금속 물건 제거)",
    steps: [
      {
        instruction: "CT실 나와 오른쪽으로 직진",
        detail: "CT실 바로 오른쪽\n엑스레이실까지 이동",
        dirIcon: "right",
        floor: 4,
        targetRoom: "엑스레이실",
        userPos: [215, 125],
        destPos: [310, 125],
        pathPoints: [[215, 124], [215, 110], [310, 110], [310, 124]],
      },
    ],
  },
  {
    id: 4,
    title: "김멋사 교수님 진료",
    shortTitle: "정형외과 진료",
    location: "2층 정형외과 205번방",
    floor: 2,
    estimatedTime: "약 5분",
    arrivalTitle: "2층 정형외과 205번방 도착",
    arrivalDetail: "검사 결과 확인 및\n진료 대기",
    steps: [
      {
        instruction: "엑스레이실 나와 왼쪽으로 이동",
        detail: "복도 끝 왼쪽\n엘리베이터 방향으로 이동",
        dirIcon: "left",
        floor: 4,
        targetRoom: "엘리베이터",
        userPos: [310, 125],
        destPos: [27, 110],
        pathPoints: [[310, 124], [310, 110], [27, 110]],
      },
      {
        instruction: "엘리베이터 2층으로 이동",
        detail: "4층 → 2층",
        dirIcon: "elevator",
        floor: 4,
        userPos: [27, 110],
        destPos: [27, 110],
        pathPoints: [],
        isElevator: true,
        elevatorFrom: 4,
        elevatorTo: 2,
      },
      {
        instruction: "내려서 오른쪽으로 직진",
        detail: "간호사실 지나 205번방으로 이동",
        dirIcon: "right",
        floor: 2,
        targetRoom: "205",
        userPos: [27, 110],
        destPos: [295, 96],
        pathPoints: [[27, 110], [295, 110], [295, 96]],
      },
    ],
  },
  {
    id: 5,
    title: "진료비 납부",
    shortTitle: "원무과",
    location: "1층 원무과",
    floor: 1,
    estimatedTime: "약 3분",
    arrivalTitle: "1층 원무과 도착",
    arrivalDetail: "번호표 뽑고\n진료비 납부",
    steps: [
      {
        instruction: "205번방 나와 왼쪽으로 이동",
        detail: "왼쪽으로 돌아\n간호사실 앞 복도로 직진",
        dirIcon: "left",
        floor: 2,
        targetRoom: "엘리베이터",
        userPos: [295, 96],
        destPos: [27, 110],
        pathPoints: [[295, 96], [295, 110], [27, 110]],
      },
      {
        instruction: "엘리베이터 1층으로 이동",
        detail: "2층 → 1층",
        dirIcon: "elevator",
        floor: 2,
        userPos: [27, 110],
        destPos: [27, 110],
        pathPoints: [],
        isElevator: true,
        elevatorFrom: 2,
        elevatorTo: 1,
      },
      {
        instruction: "내려서 오른쪽\n원무과로 직진",
        detail: "안내데스크를 지나 원무과로 이동",
        dirIcon: "right",
        floor: 1,
        targetRoom: "원무과",
        userPos: [212, 117],
        destPos: [280, 90],
        pathPoints: [[212, 117], [212, 101], [280, 101], [280, 90]],
      },
    ],
  },
  {
    id: 6,
    title: "약 수령",
    shortTitle: "약국",
    location: "1층 입구 옆 약국",
    floor: 1,
    estimatedTime: "약 6분",
    arrivalTitle: "1층 약국 도착",
    arrivalDetail: "처방전 제출 후\n약 수령",
    steps: [
      {
        instruction: "원무과 나와 왼쪽\n정문 방향으로 직진",
        detail: "안내데스크 지나\n왼쪽 끝 약국으로 이동",
        dirIcon: "left",
        floor: 1,
        targetRoom: "약국",
        userPos: [280, 90],
        destPos: [49, 90],
        pathPoints: [[280, 90], [280, 101], [49, 101], [49, 90]],
      },
    ],
  },
];
