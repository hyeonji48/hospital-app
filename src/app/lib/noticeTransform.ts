// 접수증/안내문 → 행동 리스트 변환 (클라이언트)
//
// 동행온의 핵심 주장이 실행되는 지점이다 (본선덱 p8):
//
//   "내과 외래 접수 후 채혈실 방문, 영상의학과 흉부 X-ray 촬영 후 내과 외래 앞 대기"
//        ↓
//   1. 내과 접수를 하세요  2. 피 뽑는 곳으로 가세요  3. X-ray를 찍으세요 ...
//
// 3단 폴백 — 시연 중 네트워크는 반드시 배신한다는 전제 (브리핑 §5):
//
//   1) cache    사전 생성해둔 시연용 응답. 즉시. 네트워크 불필요.
//   2) api      /api/transform 경유 실시간 AI 호출.
//   3) fallback 둘 다 실패하면 사전 대본. 화면이 비지 않는다.

import { PLACE_BY_ID, type Place } from "../data/places";
import {
  NOTICE_FIXTURES,
  FALLBACK_STEPS,
  DEMO_FIXTURE_KEY,
  normalizeNotice,
} from "../data/noticeFixtures";

/** 안내문에서 뽑아낸 행동 하나 = 화면 한 장 (1행동 1페이지) */
export interface ActionStep {
  order: number;
  /** 쉬운 행동어 — 화면 큰 글씨. "피 뽑는 곳으로 가세요" */
  action: string;
  /** 공식 명칭 — 표지판에서 찾을 이름. 정책제안서 §3이 함께 제시하라고 명시 */
  officialName: string;
  building: string;
  floor: number;
  /** 도착 후 할 일. "번호표를 뽑고 기다리세요" */
  detail?: string;
  /** 완료 목록에 쓸 명사형 한 마디. "접수", "채혈", "심전도 검사" */
  summary: string;
  /** 장소 사전의 id. 사전에 없으면 null */
  placeId: string | null;
  /**
   * 담당 의료진. 접수증에 적혀 있을 때만 채워진다.
   *
   * ⚠️ 장소와 달리 이름은 사전으로 못박을 수 없어 환각을 막을 방법이 없다.
   * 그래서 프롬프트에서 "종이에 적힌 그대로 옮기고, 없으면 비워둘 것"으로 제한하고
   * 화면에서도 값이 있을 때만 보여준다.
   */
  doctor?: string;
}

export type TransformSource = "cache" | "api" | "fallback";

export interface TransformResult {
  source: TransformSource;
  steps: ActionStep[];
  /** 변환에 걸린 시간(ms). 시연에서 "실시간 맞아요"의 근거 */
  elapsedMs: number;
  /** api 경로가 실패했을 때의 사유 */
  error?: string;
}

/** 서버/픽스처가 돌려주는 최소 형태 — 건물·층은 장소 사전이 채운다 */
export interface RawStep {
  order: number;
  action: string;
  placeId: string;
  detail?: string;
  doctor?: string;
  /** 완료 목록용 명사형. 없으면 action 을 그대로 쓴다 */
  summary?: string;
}

export interface ImagePayload {
  /** base64 (data: 접두사 없이) */
  data: string;
  mimeType: string;
}

export interface TransformInput {
  /** 접수증 사진 */
  image?: ImagePayload;
  /** 안내문 텍스트. 개발·테스트용, 또는 OCR 결과를 직접 넣을 때 */
  notice?: string;
}

export interface TransformOptions {
  /** true면 캐시를 건너뛰고 실제 AI를 호출한다.
   *  심사위원이 "진짜 AI 맞아요?"라고 물었을 때 쓰는 경로. */
  preferLive?: boolean;
  /** 사진 경로에서 API가 실패했을 때 사용할 캐시 키.
   *  기본값은 시연용 접수증. */
  fixtureKey?: string;
}

/** API 응답이 이 시간을 넘으면 폴백 — 심사장에서 화면이 멈추면 안 된다 */
const API_TIMEOUT_MS = 15000;

const ENDPOINT = "/api/transform";

export async function transformNotice(
  input: TransformInput,
  opts: TransformOptions = {},
): Promise<TransformResult> {
  const started = performance.now();
  const fixtureKey = opts.fixtureKey ?? DEMO_FIXTURE_KEY;

  // 텍스트로 들어온 경우에만 내용 기반 캐시가 가능하다.
  const textKey = input.notice ? normalizeNotice(input.notice) : null;

  // 1) 캐시 — 시연 경로. 네트워크를 타지 않는다.
  if (!opts.preferLive && textKey && NOTICE_FIXTURES[textKey]) {
    return done("cache", NOTICE_FIXTURES[textKey], started);
  }

  // 2) 실시간 API
  try {
    const steps = await callApi(input);
    return done("api", steps, started);
  } catch (err) {
    // 3) 폴백 — 화면은 절대 비우지 않는다
    const cached =
      (textKey ? NOTICE_FIXTURES[textKey] : undefined) ?? NOTICE_FIXTURES[fixtureKey];
    return {
      ...done(cached ? "cache" : "fallback", cached ?? FALLBACK_STEPS, started),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function done(source: TransformSource, raw: RawStep[], started: number): TransformResult {
  return { source, steps: hydrate(raw), elapsedMs: performance.now() - started };
}

async function callApi(input: TransformInput): Promise<RawStep[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    const body = (await res.json().catch(() => ({}))) as {
      steps?: RawStep[];
      error?: string;
    };

    if (!res.ok) {
      throw new Error(body.error ?? `변환 서버 응답 ${res.status}`);
    }
    if (!Array.isArray(body.steps) || body.steps.length === 0) {
      throw new Error("변환 결과가 비어 있습니다");
    }
    return body.steps;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * placeId를 장소 사전과 맞춰 건물·층·공식명칭을 채운다.
 *
 * 사전에 없는 placeId는 조용히 버리지 않고 표시만 비운 채 남긴다 —
 * 시연 중 사라지는 단계보다 "위치 확인 필요"가 낫다.
 */
function hydrate(raw: RawStep[]): ActionStep[] {
  return raw.map((s, i) => {
    const place: Place | undefined = PLACE_BY_ID.get(s.placeId);
    return {
      order: s.order ?? i + 1,
      action: s.action,
      officialName: place?.official ?? "위치 확인 필요",
      building: place?.building ?? "",
      floor: place?.floor ?? 0,
      detail: s.detail,
      summary: s.summary?.trim() || s.action,
      doctor: s.doctor?.trim() || undefined,
      placeId: place ? s.placeId : null,
    };
  });
}

/**
 * <input type="file"> 이나 카메라 캡처 결과를 API가 받는 형태로 바꾼다.
 * data: 접두사를 떼는 이유는 서버가 순수 base64만 받기 때문.
 */
export function fileToImagePayload(file: File): Promise<ImagePayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("사진을 읽지 못했습니다"));
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve({
        data: comma >= 0 ? result.slice(comma + 1) : result,
        mimeType: file.type || "image/jpeg",
      });
    };
    reader.readAsDataURL(file);
  });
}
