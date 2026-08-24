// 부천성모병원 성모관 장소 사전
//
// 출처: 공식 홈페이지 `병원둘러보기` (docs/BUCHEON_CMC_FLOORS.md)
// 1차 구현 범위는 성모관 1F·2F. 나머지 층/관은 동일 스키마로 확장한다.
//
// ★ 이 사전이 AI가 고를 수 있는 장소의 전부다.
//   경로를 결정론적으로 계산하듯, 장소도 사전 밖으로 나가지 못하게 막는다.
//   (브리핑 §5 "경로는 결정론적으로, 말은 LLM으로"의 장소 버전)

export interface Place {
  /** 안정적인 식별자 */
  id: string;
  /** 공식 병원 명칭 — 어르신이 표지판에서 찾을 이름 */
  official: string;
  /** 쉬운 행동어 — "채혈실" → "피 뽑는 곳" */
  easy: string;
  building: "성모관" | "성가정관" | "성심관";
  floor: number;
  /** 안내문에 등장할 수 있는 표기 변형 */
  aliases?: string[];
  /** 현장답사로 위치를 확인해야 하는 곳 */
  needsSurvey?: boolean;
}

export const PLACES: Place[] = [
  // ── 성모관 1F ──────────────────────────────────────────────
  {
    id: "smg-1f-entrance",
    official: "정문 로비",
    easy: "병원 입구",
    building: "성모관",
    floor: 1,
    aliases: ["정문", "로비", "1층 로비"],
  },
  {
    id: "smg-1f-info",
    official: "안내데스크",
    easy: "물어보는 곳",
    building: "성모관",
    floor: 1,
    aliases: ["안내", "종합안내"],
  },
  {
    id: "smg-1f-blood",
    official: "채혈실",
    easy: "피 뽑는 곳",
    building: "성모관",
    floor: 1,
    aliases: ["採血室", "채혈", "피검사"],
  },
  {
    id: "smg-1f-xray",
    official: "일반촬영실",
    easy: "사진 찍는 곳",
    building: "성모관",
    floor: 1,
    aliases: ["엑스레이", "X-ray", "X선", "흉부촬영", "영상의학과 일반촬영"],
  },
  {
    id: "smg-1f-ct",
    official: "CT실",
    easy: "몸속 사진 찍는 곳",
    building: "성모관",
    floor: 1,
    aliases: ["씨티", "전산화단층촬영"],
  },
  {
    id: "smg-1f-mri",
    official: "MRI실",
    easy: "몸속 사진 찍는 곳",
    building: "성모관",
    floor: 1,
    aliases: ["엠알아이", "자기공명영상"],
  },
  {
    id: "smg-1f-us",
    official: "초음파실",
    easy: "초음파 보는 곳",
    building: "성모관",
    floor: 1,
    aliases: ["초음파검사"],
  },
  {
    id: "smg-1f-angio",
    official: "혈관조영실",
    easy: "혈관 사진 찍는 곳",
    building: "성모관",
    floor: 1,
  },
  {
    id: "smg-1f-er",
    official: "응급의료센터",
    easy: "응급실",
    building: "성모관",
    floor: 1,
  },
  {
    id: "smg-1f-referral",
    official: "진료협력센터",
    easy: "진료 의뢰 도와주는 곳",
    building: "성모관",
    floor: 1,
  },

  // ── 성모관 2F ──────────────────────────────────────────────
  {
    id: "smg-2f-im",
    official: "내과",
    easy: "내과 진료실",
    building: "성모관",
    floor: 2,
    aliases: ["내과 외래", "내과외래"],
  },
  {
    id: "smg-2f-ortho",
    official: "정형외과",
    easy: "정형외과 진료실",
    building: "성모관",
    floor: 2,
    aliases: ["정형외과 외래"],
  },
  {
    id: "smg-2f-ns",
    official: "신경외과",
    easy: "신경외과 진료실",
    building: "성모관",
    floor: 2,
  },
  {
    id: "smg-2f-neuro",
    official: "신경과",
    easy: "신경과 진료실",
    building: "성모관",
    floor: 2,
  },
  {
    id: "smg-2f-uro",
    official: "비뇨의학과",
    easy: "비뇨의학과 진료실",
    building: "성모관",
    floor: 2,
  },
  {
    id: "smg-2f-obgy",
    official: "산부인과",
    easy: "산부인과 진료실",
    building: "성모관",
    floor: 2,
  },
  {
    id: "smg-2f-ped",
    official: "소아청소년과",
    easy: "소아청소년과 진료실",
    building: "성모관",
    floor: 2,
  },
  {
    id: "smg-2f-psy",
    official: "정신건강의학과",
    easy: "정신건강의학과 진료실",
    building: "성모관",
    floor: 2,
  },
  {
    id: "smg-2f-dent",
    official: "치과",
    easy: "치과 진료실",
    building: "성모관",
    floor: 2,
  },
  {
    id: "smg-2f-dm",
    official: "당뇨병센터",
    easy: "당뇨 보는 곳",
    building: "성모관",
    floor: 2,
  },
  {
    id: "smg-2f-vasc",
    official: "혈관센터",
    easy: "혈관 보는 곳",
    building: "성모관",
    floor: 2,
  },
  {
    id: "smg-2f-inj",
    official: "주사실",
    easy: "주사 맞는 곳",
    building: "성모관",
    floor: 2,
  },

  // ── 성모관 4F ──────────────────────────────────────────────
  {
    id: "smg-4f-cardio",
    official: "심장검사실",
    easy: "심장 검사하는 곳",
    building: "성모관",
    floor: 4,
    aliases: ["심전도", "심전도실", "심장초음파", "EKG", "ECG"],
  },
  {
    id: "smg-4f-ent",
    official: "이비인후과",
    easy: "귀·코·목 진료실",
    building: "성모관",
    floor: 4,
  },

  // ── 현장답사 필요 ─────────────────────────────────────────
  // 홈페이지 `병원둘러보기`에 원무·수납·약국이 없다. 층은 추정값이며
  // 답사 전까지 확정하지 말 것. (docs/BUCHEON_CMC_FLOORS.md 체크리스트)
  {
    id: "smg-1f-reception",
    official: "원무과",
    easy: "접수하는 곳",
    building: "성모관",
    floor: 1,
    aliases: ["접수창구", "초진창구", "원무팀"],
    needsSurvey: true,
  },
  {
    id: "smg-1f-payment",
    official: "수납창구",
    easy: "돈 내는 곳",
    building: "성모관",
    floor: 1,
    aliases: ["수납", "진료비 수납"],
    needsSurvey: true,
  },
  {
    id: "smg-1f-pharmacy",
    official: "약국",
    easy: "약 받는 곳",
    building: "성모관",
    floor: 1,
    aliases: ["원내약국", "처방전"],
    needsSurvey: true,
  },
];

export const PLACE_BY_ID = new Map(PLACES.map((p) => [p.id, p]));

/** AI에게 넘길 장소 목록 — 이 밖의 장소는 만들어낼 수 없다 */
export function placeCatalogForPrompt(): string {
  return PLACES.map(
    (p) =>
      `${p.id} | ${p.official} | ${p.easy} | ${p.building} ${p.floor}층` +
      (p.aliases?.length ? ` | 별칭: ${p.aliases.join(", ")}` : ""),
  ).join("\n");
}

export function placeIds(): string[] {
  return PLACES.map((p) => p.id);
}
