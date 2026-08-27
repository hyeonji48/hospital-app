// 부천성모병원 성모관 실제 평면도 → 도면 + 통로 그래프
//
// 출처: 병원 공식 홈페이지 `병원둘러보기` 층별 평면도 PNG (820×660)
//       https://cmcbucheon.or.kr/page/hospitalguide/lookaround
//       좌표는 그 도면을 0.439배(360/820)로 축소해 옮긴 것이다.
//       저작권 문제로 원본 이미지는 레포에 넣지 않는다. 위 주소에서 다시 받을 수 있다.
//
// ⚠️ 이전 버전의 "곧은 복도 하나 + 위아래 방 두 줄" 가정은 **틀렸다.**
//    실제 성모관은 중앙 코어(엘리베이터 6대 + 계단 2 + 화장실)를 방들이
//    둘러싼 2차원 배치다. 그래서 통로를 waypoint 그래프로 직접 그린다.
//
// 좌표계: 360 × 290 (도면 비율 유지)

export type RoomKind =
  | "room" | "desk" | "elevator" | "stairs"
  | "entrance" | "waiting" | "facility" | "toilet";

export interface Room {
  x: number; y: number; w: number; h: number;
  label: string;
  sub?: string;
  kind: RoomKind;
  floor: number;
  /**
   * places.ts 의 id 목록. 없으면 목적지가 될 수 없는 공간(화장실·쉼터 등).
   *
   * 배열인 이유: 공식 평면도가 "영상의학팀(일반촬영실, 혈관조영실, CT실, MRI실)"처럼
   * 여러 검사실을 한 구역으로 묶어 표기한다. 길찾기에는 한 지점이지만
   * AI는 "X-ray"와 "CT"를 구분해서 말해야 하므로 사전에서는 별개로 둔다.
   */
  placeIds?: string[];
  /**
   * 말할 때 쓰는 온전한 이름.
   *
   * 도면 칸이 좁아 라벨을 줄여 쓴 곳이 있다("진료협력"). 화면에는 짧게 그리되
   * 음성과 길안내 문구에서는 이 이름을 쓴다.
   */
  fullName?: string;
  /** 이 방이 붙어 있는 통로 지점 id */
  attach: string;
  /** 평면도에 표기가 없어 위치를 추정한 곳 — 답사 확인 대상 */
  estimated?: boolean;

}

/** 통로 지점 */
export interface Waypoint {
  id: string;
  floor: number;
  x: number;
  y: number;
}

export const VIEW_W = 360;
export const VIEW_H = 290;

// ═══════════════════════════════════════════════════════════
//  성모관 1F — 정문·검사·응급
// ═══════════════════════════════════════════════════════════
// 평면도: 왼쪽 큰 덩어리 = 영상의학팀, 오른쪽 큰 덩어리 = 응급의료센터,
//         중앙 세로줄 = 엘리베이터 6대, 아래 중앙 = 정문출입구
const WP_1: Waypoint[] = [
  { id: "w1-gate",  floor: 1, x: 184, y: 268 }, // 정문 안쪽
  { id: "w1-south", floor: 1, x: 184, y: 232 }, // 로비 남측
  { id: "w1-core",  floor: 1, x: 184, y: 150 }, // 중앙 코어 앞 (엘리베이터·계단·채혈실)
  { id: "w1-north", floor: 1, x: 184, y: 62 },  // 코어 북측
  { id: "w1-west",  floor: 1, x: 150, y: 150 }, // 서측 통로 (영상의학팀)
  { id: "w1-wsouth",floor: 1, x: 120, y: 232 }, // 서측 남단 (약국)
  { id: "w1-east",  floor: 1, x: 222, y: 120 }, // 동측 통로 (응급·초음파)
  { id: "w1-esouth",floor: 1, x: 222, y: 218 }, // 동측 남단 (진료협력센터)
];

const LINK_1: Array<[string, string]> = [
  ["w1-gate", "w1-south"],
  ["w1-south", "w1-core"],
  ["w1-core", "w1-north"],
  ["w1-core", "w1-west"],
  ["w1-west", "w1-wsouth"],
  ["w1-wsouth", "w1-south"],   // 서쪽으로 도는 순환로
  ["w1-core", "w1-east"],
  ["w1-east", "w1-esouth"],
  ["w1-esouth", "w1-south"],   // 동쪽으로 도는 순환로
  ["w1-north", "w1-east"],
];

const FLOOR_1: Room[] = [
  { x:  9, y:  9, w:136, h:192, label:"영상의학팀", sub:"X-ray·CT·MRI", kind:"room", floor:1, placeIds:["smg-1f-xray","smg-1f-ct","smg-1f-mri","smg-1f-angio"], attach:"w1-west" },
  { x: 35, y:202, w: 66, h: 78, label:"약국",       sub:"💊 처방전",    kind:"desk", floor:1, placeIds:["smg-1f-pharmacy"], attach:"w1-wsouth" },
  { x:190, y: 18, w: 28, h: 76, label:"엘리베이터", sub:"🛗 6대",       kind:"elevator", floor:1, attach:"w1-north" },
  { x:148, y:137, w: 22, h: 34, label:"계단",       sub:"🚶",           kind:"stairs",   floor:1, attach:"w1-west" },
  { x:190, y:110, w: 36, h: 32, label:"채혈실",     sub:"🩸 피 뽑는 곳", kind:"room", floor:1, placeIds:["smg-1f-blood"], attach:"w1-core" },
  { x:150, y:176, w: 20, h: 18, label:"🚻",         sub:"",             kind:"toilet",   floor:1, attach:"w1-core" },
  { x:307, y: 36, w: 44, h: 22, label:"초음파실",   sub:"🔊",           kind:"room", floor:1, placeIds:["smg-1f-us"],  attach:"w1-east" },
  { x:228, y: 60, w:123, h:141, label:"응급의료센터", sub:"🚨",         kind:"facility", floor:1, placeIds:["smg-1f-er"], attach:"w1-east" },
  { x:228, y:204, w: 46, h: 22, label:"진료협력",   sub:"센터",         fullName:"진료협력센터", kind:"desk", floor:1, placeIds:["smg-1f-referral"], attach:"w1-esouth" },
  { x:160, y:272, w: 48, h: 16, label:"정문출입구", sub:"🚪",           kind:"entrance", floor:1, placeIds:["smg-1f-entrance"], attach:"w1-gate" },

  // ✅ 2026-08-25 현장답사로 확인. 공식 평면도에는 표기가 없던 곳들이다.
  //    안내데스크 — 영상의학팀 아래, 약국 오른쪽. 정문에서 왼쪽 앞.
  //    원무·수납  — 진료협력센터 아래, 정문에서 오른쪽. 한 구역에 붙어 있다.
  //    키오스크   — 원무·수납 앞에 여러 대. NFC 태그를 붙일 자리이자 동선의 시작점.
  { x:118, y:206, w: 52, h: 28, label:"안내데스크", sub:"ℹ️",     kind:"desk", floor:1, placeIds:["smg-1f-info"],      attach:"w1-south" },
  { x:248, y:230, w: 48, h: 30, label:"원무과",     sub:"📝 접수", kind:"desk", floor:1, placeIds:["smg-1f-reception"], attach:"w1-esouth" },
  { x:300, y:230, w: 52, h: 30, label:"수납창구",   sub:"💳 수납", kind:"desk", floor:1, placeIds:["smg-1f-payment"],   attach:"w1-esouth" },
  // 목적지는 아니지만 **길안내 지형지물로 쓰인다.** 어르신에게 "키오스크 앞"은
  // "복도 분기점"보다 훨씬 알아보기 쉬운 기준점이다.
  { x:228, y:262, w: 60, h: 20, label:"키오스크",   sub:"🖥️",     kind:"facility", floor:1, attach:"w1-esouth" },
];

// ═══════════════════════════════════════════════════════════
//  성모관 2F — 외래 진료
// ═══════════════════════════════════════════════════════════
const WP_2: Waypoint[] = [
  { id: "w2-core",  floor: 2, x: 180, y: 150 },
  { id: "w2-north", floor: 2, x: 180, y: 62 },
  { id: "w2-south", floor: 2, x: 180, y: 240 },
  { id: "w2-west",  floor: 2, x: 138, y: 150 },
  { id: "w2-wnorth",floor: 2, x: 138, y: 62 },
  { id: "w2-wsouth",floor: 2, x: 110, y: 240 },
  { id: "w2-east",  floor: 2, x: 222, y: 150 },
  { id: "w2-enorth",floor: 2, x: 222, y: 62 },
  { id: "w2-esouth",floor: 2, x: 250, y: 240 },
];

const LINK_2: Array<[string, string]> = [
  ["w2-core", "w2-north"], ["w2-core", "w2-south"],
  ["w2-core", "w2-west"],  ["w2-core", "w2-east"],
  ["w2-west", "w2-wnorth"], ["w2-wnorth", "w2-north"],
  ["w2-west", "w2-wsouth"], ["w2-wsouth", "w2-south"],
  ["w2-east", "w2-enorth"], ["w2-enorth", "w2-north"],
  ["w2-east", "w2-esouth"], ["w2-esouth", "w2-south"],
];

const FLOOR_2: Room[] = [
  { x:100, y:  8, w: 67, h: 49, label:"당뇨병센터", sub:"", kind:"room", floor:2, placeIds:["smg-2f-dm"],   attach:"w2-wnorth" },
  { x:  9, y: 61, w: 59, h: 81, label:"산부인과",   sub:"", kind:"room", floor:2, placeIds:["smg-2f-obgy"], attach:"w2-west" },
  { x: 70, y:105, w: 59, h: 36, label:"소아청소년과", sub:"", kind:"room", floor:2, placeIds:["smg-2f-ped"], attach:"w2-west" },
  { x: 70, y:147, w: 59, h: 34, label:"주사실",     sub:"💉", kind:"room", floor:2, placeIds:["smg-2f-inj"], attach:"w2-west" },
  { x: 35, y:202, w: 48, h: 60, label:"치과",       sub:"🦷", kind:"room", floor:2, placeIds:["smg-2f-dent"], attach:"w2-wsouth" },
  { x: 86, y:202, w: 26, h: 34, label:"신경과",     sub:"", kind:"room", floor:2, placeIds:["smg-2f-neuro"], attach:"w2-wsouth" },
  { x: 86, y:246, w: 61, h: 34, label:"신경외과",   sub:"", kind:"room", floor:2, placeIds:["smg-2f-ns"],   attach:"w2-south" },
  { x:150, y:246, w: 84, h: 34, label:"내과",       sub:"내과 진료실", kind:"room", floor:2, placeIds:["smg-2f-im"], attach:"w2-south" },
  { x:238, y:246, w: 62, h: 34, label:"정신건강",   sub:"의학과", fullName:"정신건강의학과", kind:"room", floor:2, placeIds:["smg-2f-psy"], attach:"w2-esouth" },
  { x:186, y: 18, w: 28, h: 76, label:"엘리베이터", sub:"🛗 6대", kind:"elevator", floor:2, attach:"w2-north" },
  { x:148, y: 64, w: 20, h: 31, label:"계단",       sub:"🚶", kind:"stairs", floor:2, attach:"w2-wnorth" },
  { x:148, y:143, w: 20, h: 33, label:"계단",       sub:"🚶", kind:"stairs", floor:2, attach:"w2-west" },
  { x:150, y:180, w: 20, h: 18, label:"🚻",         sub:"", kind:"toilet", floor:2, attach:"w2-core" },
  { x:198, y:100, w: 26, h:100, label:"혈관",       sub:"센터", fullName:"혈관센터", kind:"room", floor:2, placeIds:["smg-2f-vasc"], attach:"w2-east" },
  { x:228, y: 61, w:123, h: 37, label:"비뇨의학과", sub:"", kind:"room", floor:2, placeIds:["smg-2f-uro"],  attach:"w2-enorth" },
  { x:228, y:100, w:123, h: 38, label:"정형외과",   sub:"", kind:"room", floor:2, placeIds:["smg-2f-ortho"], attach:"w2-east" },
  { x:228, y:140, w:123, h: 59, label:"하늘공원",   sub:"🌿 쉼터", kind:"waiting", floor:2, attach:"w2-east" },
];

// ═══════════════════════════════════════════════════════════
//  성모관 4F — 이비인후과·심장검사실
// ═══════════════════════════════════════════════════════════
const WP_4: Waypoint[] = [
  { id: "w4-core",  floor: 4, x: 178, y: 160 },
  { id: "w4-west",  floor: 4, x: 140, y: 120 },
  { id: "w4-east",  floor: 4, x: 220, y: 120 },
];

const LINK_4: Array<[string, string]> = [
  ["w4-core", "w4-west"],
  ["w4-core", "w4-east"],
];

const FLOOR_4: Room[] = [
  { x:  9, y: 69, w: 75, h: 76, label:"분만실",     sub:"", kind:"room", floor:4, attach:"w4-west" },
  { x: 87, y: 69, w: 76, h: 76, label:"신생아실",   sub:"", kind:"room", floor:4, attach:"w4-west" },
  { x:150, y:154, w: 28, h: 74, label:"엘리베이터", sub:"🛗 6대", kind:"elevator", floor:4, attach:"w4-core" },
  { x:191, y:154, w: 22, h: 31, label:"계단",       sub:"🚶", kind:"stairs", floor:4, attach:"w4-core" },
  { x:239, y: 70, w: 64, h: 31, label:"이비인후과", sub:"", kind:"room", floor:4, placeIds:["smg-4f-ent"], attach:"w4-east" },
  { x:305, y: 70, w: 46, h: 31, label:"심장검사실", sub:"❤️ 심전도", kind:"room", floor:4, placeIds:["smg-4f-cardio"], attach:"w4-east" },
  { x:191, y:113, w:160, h: 32, label:"이비인후과", sub:"진료실", kind:"room", floor:4, attach:"w4-east" },
];

// ═══════════════════════════════════════════════════════════

export const FLOORS: Record<number, Room[]> = { 1: FLOOR_1, 2: FLOOR_2, 4: FLOOR_4 };
export const WAYPOINTS: Record<number, Waypoint[]> = { 1: WP_1, 2: WP_2, 4: WP_4 };
export const LINKS: Record<number, Array<[string, string]>> = { 1: LINK_1, 2: LINK_2, 4: LINK_4 };

export const FLOOR_LABELS: Record<number, string> = {
  1: "성모관 1층 · 정문·검사",
  2: "성모관 2층 · 외래 진료",
  4: "성모관 4층 · 이비인후과",
};

// ═══════════════════════════════════════════════════════════
//  거리·비용
// ═══════════════════════════════════════════════════════════
//
// 통로 거리는 **평면도 좌표에서 직접 계산**한다. 도면이 축척에 맞으므로
// "어느 쪽이 더 가까운가"는 걸음을 세지 않아도 정확히 나온다.
// → 현장답사에서 걸음 수를 잴 필요가 없다.

/** 방 입구에서 통로까지의 기본 비용 (도면 단위) */
export const ROOM_ATTACH_COST = 6;

/**
 * 엘리베이터 한 층 이동 비용 (도면 단위).
 * 호출 대기 때문에 실제 거리보다 크게 잡는다 — 한두 층은 계단이 빠를 수 있지만
 * 고령자 대상이라 어차피 계단은 기본에서 제외된다.
 */
export const ELEVATOR_BASE_COST = 40;
export const ELEVATOR_PER_FLOOR = 12;

/** 계단 한 층 (기본 경로에서는 제외됨) */
export const STAIRS_PER_FLOOR = 30;
