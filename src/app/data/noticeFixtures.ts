// 시연용 사전 생성 변환 결과
//
// 시연 모드(`demo`)는 네트워크·API·무료 티어 한도를 전혀 타지 않는다.
// 심사장에서 심사위원들이 NFC를 동시에 여러 번 대도 항상 같은 결과가 나온다.
//
// 갱신 방법: npm run gen:fixture -- "<안내문 원문>"

import type { RawStep } from "../lib/noticeTransform";

/**
 * 안내문을 캐시 키로 정규화한다.
 * 비전 모델은 같은 종이도 공백·줄바꿈을 매번 다르게 읽으므로
 * 이 정규화가 없으면 캐시가 사실상 동작하지 않는다.
 */
export function normalizeNotice(text: string): string {
  return text
    .replace(/\s+/g, "")
    .replace(/[.,·․‧∙]/g, "")
    .trim();
}

/** 시연 모드가 항상 사용하는 캐시 키 */
export const DEMO_FIXTURE_KEY = "demo:순환기-7단계";

/**
 * 시연용 접수증 원문. public/sample-receipt.html 의 ①번과 짝을 이룬다.
 * 브리핑 §9 페르소나(보호자 없이 온 고령 환자, 순환기 초진)에 맞춘 여정이다.
 */
export const DEMO_NOTICE =
  "내과 외래 방문, 채혈실 혈액검사 및 심장검사실 심전도 검사 시행, 검사 후 내과 외래 진료";

/**
 * 4단계 / 3개 층.
 * 2F 내과 → 1F 채혈 → 4F 심전도 → 2F 내과(진료)
 *
 * **원무과 접수는 목록에 없다.** 환자는 원무과에서 접수증을 받아 든 채로
 * 앱을 켜기 때문이다. 이미 서 있는 자리로 가라고 안내할 이유가 없다.
 *
 * **수납·약국도 시연에서 뺐다.** 심사위원이 끝까지 눌러볼 만큼 시간을 쓰지
 * 않는다는 판단이다. 20화면이면 2분 안에 완주할 수 있고, 앞 두 단계 안에
 * 교수님 이름·용어 변환·층 이동이 모두 들어간다.
 * (수납·약국은 실제 인식 모드에서 접수증에 적혀 있으면 그대로 안내된다)
 */
const DEMO_STEPS: RawStep[] = [
  {
    order: 1,
    action: "내과에 들르세요",
    summary: "진료 접수",
    placeId: "smg-2f-im",
    detail: "도착하시면 창구에 접수증을 내세요.",
    doctor: "김부천 교수",
  },
  {
    order: 2,
    action: "피를 뽑으세요",
    summary: "혈액검사",
    placeId: "smg-1f-blood",
    detail: "성모관 1층입니다. 번호표를 뽑고 기다리세요.",
  },
  {
    order: 3,
    action: "심장 검사를 받으세요",
    summary: "심전도 검사",
    placeId: "smg-4f-cardio",
    detail: "성모관 4층입니다. 윗옷을 벗기 편한 상태로 기다리세요.",
  },
  {
    order: 4,
    action: "진료를 받으세요",
    summary: "진료",
    placeId: "smg-2f-im",
    detail: "이름을 부르면 진료실로 들어가세요.",
    doctor: "김부천 교수",
  },
];

/** 정규화된 안내문(또는 demo: 키) → 변환 결과 */
export const NOTICE_FIXTURES: Record<string, RawStep[]> = {
  [DEMO_FIXTURE_KEY]: DEMO_STEPS,
  [normalizeNotice(DEMO_NOTICE)]: DEMO_STEPS,
};

/**
 * 캐시에도 없고 API도 실패했을 때의 최후 화면.
 * 틀린 안내를 하느니 "사람에게 물어보라"고 말하는 편이 안전하다.
 */
export const FALLBACK_STEPS: RawStep[] = [
  {
    order: 1,
    action: "접수하는 곳으로 가세요",
    summary: "접수",
    placeId: "smg-1f-reception",
    detail: "안내 데스크 직원에게 접수증을 보여주세요.",
  },
];
