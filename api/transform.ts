// 접수증/안내문 → 행동 리스트 변환 (서버 측)
//
// 이 함수가 존재하는 이유는 단 하나, API 키다.
// 프론트는 정적 SPA라 브라우저에서 AI를 직접 부르면 키가 그대로 노출되고,
// 공개 URL이라 키가 새면 남의 요금이 아니라 우리 요금이 나간다.
// 키는 Vercel 환경변수 GEMINI_API_KEY에만 둔다.
//
// AI 제공사는 이 파일 하나에만 묶여 있다. 다른 회사로 갈아타도
// 화면·장소 사전·캐시·폴백·경로계산은 한 줄도 바뀌지 않는다.
//
// Vercel Functions (Node.js 런타임) Web Handler.
// 배포: https://hospital-app-xi-sooty.vercel.app/api/transform

import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import { placeCatalogForPrompt, placeIds } from "../src/app/data/places";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

const PLACE_IDS = placeIds();

// ★ placeId를 장소 사전의 enum으로 못박는다.
//   AI가 존재하지 않는 진료실을 만들어내는 것을 스키마 수준에서 차단한다.
//   (브리핑 §5 "경로는 결정론적으로, 말은 LLM으로"의 장소 버전)
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          order: { type: Type.INTEGER, description: "1부터 시작하는 순서" },
          action: {
            type: Type.STRING,
            description: "쉬운 행동어 한 문장. 예: '피 뽑는 곳으로 가세요'",
          },
          placeId: {
            type: Type.STRING,
            enum: PLACE_IDS,
            description: "장소 사전의 id. 목록에 없는 곳은 절대 만들지 말 것",
          },
          detail: {
            type: Type.STRING,
            description: "도착해서 할 일 한 문장. 예: '번호표를 뽑고 기다리세요'",
          },
          summary: {
            type: Type.STRING,
            description:
              "완료 목록에 쓸 명사형 한 마디. 동사로 끝내지 말 것. 장소 이름은 빼고 행동만. 예: 접수, 진료 접수, 혈액검사, 심전도 검사, 진료, 진료비 납부, 약 수령",
          },
          doctor: {
            type: Type.STRING,
            description:
              "그 단계의 담당 의료진 이름. 접수증에 적혀 있을 때만 그대로 옮기고, 없으면 빈 문자열",
          },
        },
        required: ["order", "action", "placeId", "detail", "summary", "doctor"],
      },
    },
  },
  required: ["steps"],
};

// 모델이 스키마를 어겼을 때 조용히 통과시키지 않기 위한 2차 방어선
const ResultSchema = z.object({
  steps: z
    .array(
      z.object({
        order: z.number().int(),
        action: z.string().min(1),
        placeId: z.enum(PLACE_IDS as [string, ...string[]]),
        detail: z.string(),
        summary: z.string(),
        doctor: z.string().optional().default(""),
      }),
    )
    .min(1),
});

const SYSTEM = `당신은 병원 접수증과 안내문을 고령 환자용 행동 안내로 바꾸는 도우미입니다.

사진이 주어지면 먼저 사진 속 글자를 읽고, 오늘 환자가 해야 할 일을 순서대로 찾아내세요.

원칙:
1. 한 단계 = 한 행동. 여러 일을 한 문장에 넣지 마세요.
2. 어려운 병원 용어를 쉬운 말로 바꿉니다. "채혈실" → "피 뽑는 곳", "영상의학과 X-ray" → "사진 찍는 곳".
3. 존댓말로, 짧고 분명하게. 한 문장 20자 이내를 목표로 합니다.
4. 안내문에 적힌 순서를 그대로 지킵니다. 순서를 바꾸거나 최적화하지 마세요.
5. 안내문에 없는 단계를 지어내지 마세요.
6. placeId는 아래 장소 목록에 있는 id만 사용합니다. 해당하는 곳이 없으면 그 단계를 빼세요.
7. 환자 이름·생년월일·등록번호 같은 개인정보는 결과에 절대 담지 마세요.
   단, **담당 의료진 이름**은 진료 단계에서 어르신이 확인해야 하므로 doctor 에 넣습니다.
   종이에 적힌 글자를 그대로 옮기고, 안 적혀 있으면 빈 문자열로 두세요. 지어내지 마세요.
8. 같은 표현을 반복하지 마세요. "~로 가세요"가 계속 나오지 않도록
   "~에 들르세요", "~에서 기다리세요", "~를 받으세요" 처럼 단계마다 다르게 씁니다.

사용 가능한 장소 (id | 공식명칭 | 쉬운말 | 위치):
${placeCatalogForPrompt()}`;

// ── 남용 방지 ────────────────────────────────────────────────
// 공개 URL이라 아무나 호출할 수 있다. 서버리스는 인스턴스가 수시로 죽으므로
// 이 카운터는 완벽하지 않다 — 어디까지나 1차 완충이고,
// 진짜 안전장치는 제공사 콘솔의 지출/사용량 한도다.
const RATE_LIMIT = 8; // 분당 IP당 허용 횟수
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) hits.clear(); // 메모리 폭주 방지
  return recent.length > RATE_LIMIT;
}

/** base64 이미지 상한. 대략 4MB 원본까지 허용 */
const MAX_IMAGE_CHARS = 5_600_000;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

interface Body {
  notice?: unknown;
  image?: { data?: unknown; mimeType?: unknown };
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY 미설정");
    return json({ error: "변환 서버가 설정되지 않았습니다" }, 500);
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return json({ error: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요" }, 429);
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ error: "본문을 읽을 수 없습니다" }, 400);
  }

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

  // 사진 경로 — 접수증을 찍어서 보내는 실제 사용 흐름
  if (body.image) {
    const { data, mimeType } = body.image;
    if (typeof data !== "string" || typeof mimeType !== "string") {
      return json({ error: "이미지 형식이 올바르지 않습니다" }, 400);
    }
    if (!ALLOWED_MIME.includes(mimeType)) {
      return json({ error: "지원하지 않는 이미지 형식입니다" }, 400);
    }
    if (data.length > MAX_IMAGE_CHARS) {
      return json({ error: "이미지가 너무 큽니다" }, 413);
    }
    parts.push({ inlineData: { data, mimeType } });
  }

  // 텍스트 경로 — 개발·테스트용. 사진 없이 안내문 문장만 넣어볼 수 있다.
  if (typeof body.notice === "string" && body.notice.trim() !== "") {
    const notice = body.notice.trim();
    if (notice.length > 2000) {
      return json({ error: "안내문이 너무 깁니다" }, 400);
    }
    parts.push({ text: `다음 병원 안내문을 행동 단계로 바꿔주세요.\n\n---\n${notice}\n---` });
  } else if (parts.length > 0) {
    parts.push({ text: "이 접수증을 보고 오늘 해야 할 일을 순서대로 알려주세요." });
  }

  if (parts.length === 0) {
    return json({ error: "접수증 사진이나 안내문 텍스트가 필요합니다" }, 400);
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: SYSTEM,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0,
      },
    });

    const text = response.text;
    if (!text) {
      return json({ error: "변환 결과가 비어 있습니다" }, 502);
    }

    const parsed = ResultSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      // 스키마를 어긴 응답은 버린다. 틀린 안내를 하느니 폴백이 낫다.
      console.error("스키마 불일치:", parsed.error.message, "| raw:", text.slice(0, 400));
      return json({ error: "변환 결과를 해석할 수 없습니다" }, 502);
    }

    return json({
      steps: parsed.data.steps,
      model: MODEL,
      usage: {
        input: response.usageMetadata?.promptTokenCount,
        output: response.usageMetadata?.candidatesTokenCount,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // 429 = 무료 티어 분당/일일 한도 초과. 폴백이 받아주도록 그대로 알린다.
    if (/quota|rate|429|RESOURCE_EXHAUSTED/i.test(message)) {
      console.warn("무료 티어 한도 초과:", message);
      return json({ error: "지금은 요청이 많습니다. 잠시 후 다시 시도해주세요" }, 429);
    }
    console.error("변환 실패:", message);
    return json({ error: "변환 실패" }, 502);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
