// 음성 문구 변주
//
// 같은 문장이 24번 반복되면 어르신이 안내를 흘려듣게 된다.
// 단계 번호를 씨앗으로 삼아 템플릿을 돌려 쓴다 — 무작위가 아니라 결정론적이라
// 같은 화면을 다시 들어도 문구가 바뀌지 않는다. (다시 듣기가 어색해지지 않게)

// ── 음성 클립 식별자 ─────────────────────────────────────────
// 화면과 생성 스크립트가 **같은 함수**를 써야 파일명이 어긋나지 않는다.
// 예전처럼 양쪽에서 각자 문자열을 조립하면 조용히 틀어진다.

export const CONFIRM_CLIP = "confirm";
/** 같은 화면은 항상 같은 씨앗 → 문구가 매번 바뀌지 않는다 */
export const navSeed = (taskIndex: number, stepIndex: number) => taskIndex * 7 + stepIndex;
export const navClip = (taskIndex: number, stepIndex: number) => `nav-${taskIndex}-${stepIndex}`;
export const arriveClip = (taskId: number) => `arrive-${taskId}`;

function pick<T>(list: T[], seed: number): T {
  return list[Math.abs(Math.floor(seed)) % list.length];
}

/** 길안내 한 화면을 읽어주는 문장 */
export function navPhrase(instruction: string, seed: number, isLast: boolean): string {
  const body = instruction.replace(/\n/g, " ");
  // "…입니다"로 끝나는 도착 안내에는 "이번에는" 같은 머리말이 어울리지 않는다
  const isArrival = /입니다$/.test(body.trim());
  const lead = isArrival ? "" : pick(["", "", "자, ", "이번에는 ", "그다음, "], seed);
  const pace = pick(
    [
      "천천히 가셔도 됩니다.",
      "서두르지 않으셔도 됩니다.",
      "조심해서 가세요.",
      "천천히 다녀오세요.",
      "",
    ],
    seed + 1,
  );
  const after = isLast
    ? pick(["도착하시면 완료를 눌러주세요.", "다 오시면 완료 버튼을 눌러주세요."], seed)
    : pick(["다 오시면 버튼을 눌러주세요.", "도착하시면 아래 버튼을 눌러주세요."], seed + 2);
  return [`${lead}${body}.`, pace, after].filter(Boolean).join(" ");
}

/** 엘리베이터 화면 */
export function elevatorPhrase(from: number, to: number, seed: number): string {
  return pick(
    [
      `엘리베이터를 타고 ${from}층에서 ${to}층으로 가세요. 내리신 뒤에 도착 버튼을 눌러주세요.`,
      `${to}층 버튼을 누르시면 됩니다. ${to}층에서 내려 도착 버튼을 눌러주세요.`,
      `엘리베이터에서 ${to}층을 눌러주세요. 내리신 다음 아래 버튼을 눌러주세요.`,
    ],
    seed,
  );
}

/** 도착 화면 */
export function arrivalPhrase(
  place: string,
  detail: string | undefined,
  doctor: string | undefined,
  seed: number,
): string {
  const head = pick(
    [`${place}에 도착하셨습니다.`, `여기가 ${place}입니다.`, `${place}에 다 오셨습니다.`],
    seed,
  );
  const who = doctor ? `${doctor}님께 진료를 받으시면 됩니다.` : "";
  return [head, who, detail].filter(Boolean).join(" ");
}

/**
 * 접수증 확인 화면.
 *
 * 화면에 담당 의료진만 크게 띄우므로 음성도 그것만 확인한다.
 * 할 일 개수를 여기서 읊으면 화면에 없는 정보라 어긋나고,
 * 인터뷰에서 나온 "정보 과부하"를 다시 만드는 셈이다.
 */
export function confirmPhrase(count: number, doctor?: string, dept?: string): string {
  const tail = "맞으시다면 화면 아래 안내 시작 버튼을 눌러주세요.";
  if (doctor) {
    const who = dept ? `${dept} ${doctor}님` : `${doctor}님`;
    return `어르신, 오늘 ${who} 진료 보러 오셨나요? ${tail}`;
  }
  return `어르신, 오늘 하실 일이 ${count}가지 있습니다. ${tail}`;
}

// ── 시연용 음성 대본 ─────────────────────────────────────────

export interface SpeechClip {
  clip: string;
  text: string;
}

/**
 * 시연 모드에서 나올 모든 음성 문장을 화면 순서대로 만든다.
 *
 * 화면들이 쓰는 것과 **동일한 함수·동일한 씨앗**을 쓰므로, 여기서 만든 파일이
 * 실제 재생 시점의 문장과 정확히 일치한다.
 * `npm run gen:speech` 가 이 목록을 그대로 음성으로 굽는다.
 */
export function buildSpeechScript(
  tasks: Array<{
    id: number;
    location: string;
    doctor?: string;
    arrivalTitle: string;
    arrivalDetail: string;
    steps: Array<{
      instruction: string;
      isElevator?: boolean;
      elevatorFrom?: number;
      elevatorTo?: number;
    }>;
  }>,
): SpeechClip[] {
  const out: SpeechClip[] = [];

  const visit = tasks.find((t) => t.doctor);
  out.push({
    clip: CONFIRM_CLIP,
    text: confirmPhrase(tasks.length, visit?.doctor, visit?.location.split(" ").pop()),
  });

  tasks.forEach((task, ti) => {
    task.steps.forEach((step, si) => {
      const seed = navSeed(ti, si);
      const isLast = si === task.steps.length - 1;
      out.push({
        clip: navClip(ti, si),
        text: step.isElevator
          ? elevatorPhrase(step.elevatorFrom ?? 1, step.elevatorTo ?? 1, seed)
          : navPhrase(step.instruction, seed, isLast),
      });
    });
    out.push({
      clip: arriveClip(task.id),
      text: arrivalPhrase(
        task.arrivalTitle.replace(" 도착", ""),
        task.arrivalDetail,
        task.doctor,
        task.id,
      ),
    });
  });

  return out;
}
