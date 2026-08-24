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

/**
 * 길안내 한 화면을 읽어주는 문장.
 *
 * ★ 화면마다 **어디까지 가야 하는지**(checkpoint)를 말한다.
 *   예전에는 서른 번 내내 "다 오시면 버튼을 눌러주세요"만 반복했는데,
 *   어디까지가 '다 온 것'인지 알려주지 않으니 어르신이 판단할 수가 없었다.
 *   목표 지점을 말하면 안내가 분명해지고, 화면마다 문장이 달라져
 *   억지 변주 없이도 반복감이 사라진다.
 */
export function navPhrase(
  instruction: string,
  seed: number,
  isLast: boolean,
  checkpoint?: string,
): string {
  const body = instruction.replace(/\n/g, " ").trim();
  const pace = pick(
    ["천천히 가셔도 됩니다.", "서두르지 않으셔도 됩니다.", "조심해서 가세요.", ""],
    seed,
  );

  // 지시문에 이미 장소가 나오는데 안내 문구에서 또 부르면 같은 말이 두 번 된다.
  //   ✗ "안내데스크 앞에서 오른쪽으로 도세요. 안내데스크 앞에 오시면 …"
  //   ✓ "안내데스크 앞에서 오른쪽으로 도세요. 도신 다음 …"
  const alreadyNamed = Boolean(checkpoint && body.includes(checkpoint.replace(/ 앞$/, "")));
  const cue = isLast
    ? `${checkpoint ? `${checkpoint}에 ` : ""}도착하시면 아래 버튼을 눌러주세요.`
    : alreadyNamed
      ? "도신 다음 아래 버튼을 눌러주세요."
      : checkpoint
        ? `${checkpoint}에 오시면 아래 버튼을 눌러주세요.`
        : "돌고 나서 아래 버튼을 눌러주세요.";

  return [`${body}.`, pace, cue].filter(Boolean).join(" ");
}

/** 엘리베이터 화면 */
export function elevatorPhrase(from: number, to: number, seed: number): string {
  // 내려가는데 "올라가세요"라고 하면 안 된다
  const move = to > from ? "올라가세요" : "내려가세요";
  const how = pick(
    [
      `엘리베이터를 타고 ${to}층으로 가세요.`,
      `엘리베이터에서 ${to}층을 눌러주세요.`,
      `엘리베이터로 ${from}층에서 ${to}층으로 ${move}.`,
    ],
    seed,
  );
  return `${how} ${to}층에서 내리시면 아래 버튼을 눌러주세요.`;
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
      checkpoint?: string;
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
          : navPhrase(step.instruction, seed, isLast, step.checkpoint),
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
