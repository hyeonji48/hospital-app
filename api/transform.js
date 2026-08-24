// src/server/transform.ts
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

// src/app/data/places.ts
var PLACES = [
  // ── 성모관 1F ──────────────────────────────────────────────
  {
    id: "smg-1f-entrance",
    official: "\uC815\uBB38 \uB85C\uBE44",
    easy: "\uBCD1\uC6D0 \uC785\uAD6C",
    building: "\uC131\uBAA8\uAD00",
    floor: 1,
    aliases: ["\uC815\uBB38", "\uB85C\uBE44", "1\uCE35 \uB85C\uBE44"]
  },
  {
    id: "smg-1f-info",
    official: "\uC548\uB0B4\uB370\uC2A4\uD06C",
    easy: "\uBB3C\uC5B4\uBCF4\uB294 \uACF3",
    building: "\uC131\uBAA8\uAD00",
    floor: 1,
    aliases: ["\uC548\uB0B4", "\uC885\uD569\uC548\uB0B4"]
  },
  {
    id: "smg-1f-blood",
    official: "\uCC44\uD608\uC2E4",
    easy: "\uD53C \uBF51\uB294 \uACF3",
    building: "\uC131\uBAA8\uAD00",
    floor: 1,
    aliases: ["\u63A1\u8840\u5BA4", "\uCC44\uD608", "\uD53C\uAC80\uC0AC"]
  },
  {
    id: "smg-1f-xray",
    official: "\uC77C\uBC18\uCD2C\uC601\uC2E4",
    easy: "\uC0AC\uC9C4 \uCC0D\uB294 \uACF3",
    building: "\uC131\uBAA8\uAD00",
    floor: 1,
    aliases: ["\uC5D1\uC2A4\uB808\uC774", "X-ray", "X\uC120", "\uD749\uBD80\uCD2C\uC601", "\uC601\uC0C1\uC758\uD559\uACFC \uC77C\uBC18\uCD2C\uC601"]
  },
  {
    id: "smg-1f-ct",
    official: "CT\uC2E4",
    easy: "\uBAB8\uC18D \uC0AC\uC9C4 \uCC0D\uB294 \uACF3",
    building: "\uC131\uBAA8\uAD00",
    floor: 1,
    aliases: ["\uC528\uD2F0", "\uC804\uC0B0\uD654\uB2E8\uCE35\uCD2C\uC601"]
  },
  {
    id: "smg-1f-mri",
    official: "MRI\uC2E4",
    easy: "\uBAB8\uC18D \uC0AC\uC9C4 \uCC0D\uB294 \uACF3",
    building: "\uC131\uBAA8\uAD00",
    floor: 1,
    aliases: ["\uC5E0\uC54C\uC544\uC774", "\uC790\uAE30\uACF5\uBA85\uC601\uC0C1"]
  },
  {
    id: "smg-1f-us",
    official: "\uCD08\uC74C\uD30C\uC2E4",
    easy: "\uCD08\uC74C\uD30C \uBCF4\uB294 \uACF3",
    building: "\uC131\uBAA8\uAD00",
    floor: 1,
    aliases: ["\uCD08\uC74C\uD30C\uAC80\uC0AC"]
  },
  {
    id: "smg-1f-angio",
    official: "\uD608\uAD00\uC870\uC601\uC2E4",
    easy: "\uD608\uAD00 \uC0AC\uC9C4 \uCC0D\uB294 \uACF3",
    building: "\uC131\uBAA8\uAD00",
    floor: 1
  },
  {
    id: "smg-1f-er",
    official: "\uC751\uAE09\uC758\uB8CC\uC13C\uD130",
    easy: "\uC751\uAE09\uC2E4",
    building: "\uC131\uBAA8\uAD00",
    floor: 1
  },
  {
    id: "smg-1f-referral",
    official: "\uC9C4\uB8CC\uD611\uB825\uC13C\uD130",
    easy: "\uC9C4\uB8CC \uC758\uB8B0 \uB3C4\uC640\uC8FC\uB294 \uACF3",
    building: "\uC131\uBAA8\uAD00",
    floor: 1
  },
  // ── 성모관 2F ──────────────────────────────────────────────
  {
    id: "smg-2f-im",
    official: "\uB0B4\uACFC",
    easy: "\uB0B4\uACFC \uC9C4\uB8CC\uC2E4",
    building: "\uC131\uBAA8\uAD00",
    floor: 2,
    aliases: ["\uB0B4\uACFC \uC678\uB798", "\uB0B4\uACFC\uC678\uB798"]
  },
  {
    id: "smg-2f-ortho",
    official: "\uC815\uD615\uC678\uACFC",
    easy: "\uC815\uD615\uC678\uACFC \uC9C4\uB8CC\uC2E4",
    building: "\uC131\uBAA8\uAD00",
    floor: 2,
    aliases: ["\uC815\uD615\uC678\uACFC \uC678\uB798"]
  },
  {
    id: "smg-2f-ns",
    official: "\uC2E0\uACBD\uC678\uACFC",
    easy: "\uC2E0\uACBD\uC678\uACFC \uC9C4\uB8CC\uC2E4",
    building: "\uC131\uBAA8\uAD00",
    floor: 2
  },
  {
    id: "smg-2f-neuro",
    official: "\uC2E0\uACBD\uACFC",
    easy: "\uC2E0\uACBD\uACFC \uC9C4\uB8CC\uC2E4",
    building: "\uC131\uBAA8\uAD00",
    floor: 2
  },
  {
    id: "smg-2f-uro",
    official: "\uBE44\uB1E8\uC758\uD559\uACFC",
    easy: "\uBE44\uB1E8\uC758\uD559\uACFC \uC9C4\uB8CC\uC2E4",
    building: "\uC131\uBAA8\uAD00",
    floor: 2
  },
  {
    id: "smg-2f-obgy",
    official: "\uC0B0\uBD80\uC778\uACFC",
    easy: "\uC0B0\uBD80\uC778\uACFC \uC9C4\uB8CC\uC2E4",
    building: "\uC131\uBAA8\uAD00",
    floor: 2
  },
  {
    id: "smg-2f-ped",
    official: "\uC18C\uC544\uCCAD\uC18C\uB144\uACFC",
    easy: "\uC18C\uC544\uCCAD\uC18C\uB144\uACFC \uC9C4\uB8CC\uC2E4",
    building: "\uC131\uBAA8\uAD00",
    floor: 2
  },
  {
    id: "smg-2f-psy",
    official: "\uC815\uC2E0\uAC74\uAC15\uC758\uD559\uACFC",
    easy: "\uC815\uC2E0\uAC74\uAC15\uC758\uD559\uACFC \uC9C4\uB8CC\uC2E4",
    building: "\uC131\uBAA8\uAD00",
    floor: 2
  },
  {
    id: "smg-2f-dent",
    official: "\uCE58\uACFC",
    easy: "\uCE58\uACFC \uC9C4\uB8CC\uC2E4",
    building: "\uC131\uBAA8\uAD00",
    floor: 2
  },
  {
    id: "smg-2f-dm",
    official: "\uB2F9\uB1E8\uBCD1\uC13C\uD130",
    easy: "\uB2F9\uB1E8 \uBCF4\uB294 \uACF3",
    building: "\uC131\uBAA8\uAD00",
    floor: 2
  },
  {
    id: "smg-2f-vasc",
    official: "\uD608\uAD00\uC13C\uD130",
    easy: "\uD608\uAD00 \uBCF4\uB294 \uACF3",
    building: "\uC131\uBAA8\uAD00",
    floor: 2
  },
  {
    id: "smg-2f-inj",
    official: "\uC8FC\uC0AC\uC2E4",
    easy: "\uC8FC\uC0AC \uB9DE\uB294 \uACF3",
    building: "\uC131\uBAA8\uAD00",
    floor: 2
  },
  // ── 성모관 4F ──────────────────────────────────────────────
  {
    id: "smg-4f-cardio",
    official: "\uC2EC\uC7A5\uAC80\uC0AC\uC2E4",
    easy: "\uC2EC\uC7A5 \uAC80\uC0AC\uD558\uB294 \uACF3",
    building: "\uC131\uBAA8\uAD00",
    floor: 4,
    aliases: ["\uC2EC\uC804\uB3C4", "\uC2EC\uC804\uB3C4\uC2E4", "\uC2EC\uC7A5\uCD08\uC74C\uD30C", "EKG", "ECG"]
  },
  {
    id: "smg-4f-ent",
    official: "\uC774\uBE44\uC778\uD6C4\uACFC",
    easy: "\uADC0\xB7\uCF54\xB7\uBAA9 \uC9C4\uB8CC\uC2E4",
    building: "\uC131\uBAA8\uAD00",
    floor: 4
  },
  // ── 현장답사 필요 ─────────────────────────────────────────
  // 홈페이지 `병원둘러보기`에 원무·수납·약국이 없다. 층은 추정값이며
  // 답사 전까지 확정하지 말 것. (docs/BUCHEON_CMC_FLOORS.md 체크리스트)
  {
    id: "smg-1f-reception",
    official: "\uC6D0\uBB34\uACFC",
    easy: "\uC811\uC218\uD558\uB294 \uACF3",
    building: "\uC131\uBAA8\uAD00",
    floor: 1,
    aliases: ["\uC811\uC218\uCC3D\uAD6C", "\uCD08\uC9C4\uCC3D\uAD6C", "\uC6D0\uBB34\uD300"],
    needsSurvey: true
  },
  {
    id: "smg-1f-payment",
    official: "\uC218\uB0A9\uCC3D\uAD6C",
    easy: "\uB3C8 \uB0B4\uB294 \uACF3",
    building: "\uC131\uBAA8\uAD00",
    floor: 1,
    aliases: ["\uC218\uB0A9", "\uC9C4\uB8CC\uBE44 \uC218\uB0A9"],
    needsSurvey: true
  },
  {
    id: "smg-1f-pharmacy",
    official: "\uC57D\uAD6D",
    easy: "\uC57D \uBC1B\uB294 \uACF3",
    building: "\uC131\uBAA8\uAD00",
    floor: 1,
    aliases: ["\uC6D0\uB0B4\uC57D\uAD6D", "\uCC98\uBC29\uC804"],
    needsSurvey: true
  }
];
var PLACE_BY_ID = new Map(PLACES.map((p) => [p.id, p]));
function placeCatalogForPrompt() {
  return PLACES.map(
    (p) => `${p.id} | ${p.official} | ${p.easy} | ${p.building} ${p.floor}\uCE35` + (p.aliases?.length ? ` | \uBCC4\uCE6D: ${p.aliases.join(", ")}` : "")
  ).join("\n");
}
function placeIds() {
  return PLACES.map((p) => p.id);
}

// src/server/transform.ts
var MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
var ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });
var PLACE_IDS = placeIds();
var RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          order: { type: Type.INTEGER, description: "1\uBD80\uD130 \uC2DC\uC791\uD558\uB294 \uC21C\uC11C" },
          action: {
            type: Type.STRING,
            description: "\uC26C\uC6B4 \uD589\uB3D9\uC5B4 \uD55C \uBB38\uC7A5. \uC608: '\uD53C \uBF51\uB294 \uACF3\uC73C\uB85C \uAC00\uC138\uC694'"
          },
          placeId: {
            type: Type.STRING,
            enum: PLACE_IDS,
            description: "\uC7A5\uC18C \uC0AC\uC804\uC758 id. \uBAA9\uB85D\uC5D0 \uC5C6\uB294 \uACF3\uC740 \uC808\uB300 \uB9CC\uB4E4\uC9C0 \uB9D0 \uAC83"
          },
          detail: {
            type: Type.STRING,
            description: "\uB3C4\uCC29\uD574\uC11C \uD560 \uC77C \uD55C \uBB38\uC7A5. \uC608: '\uBC88\uD638\uD45C\uB97C \uBF51\uACE0 \uAE30\uB2E4\uB9AC\uC138\uC694'"
          },
          summary: {
            type: Type.STRING,
            description: "\uC644\uB8CC \uBAA9\uB85D\uC5D0 \uC4F8 \uBA85\uC0AC\uD615 \uD55C \uB9C8\uB514. \uB3D9\uC0AC\uB85C \uB05D\uB0B4\uC9C0 \uB9D0 \uAC83. \uC7A5\uC18C \uC774\uB984\uC740 \uBE7C\uACE0 \uD589\uB3D9\uB9CC. \uC608: \uC811\uC218, \uC9C4\uB8CC \uC811\uC218, \uD608\uC561\uAC80\uC0AC, \uC2EC\uC804\uB3C4 \uAC80\uC0AC, \uC9C4\uB8CC, \uC9C4\uB8CC\uBE44 \uB0A9\uBD80, \uC57D \uC218\uB839"
          },
          doctor: {
            type: Type.STRING,
            description: "\uADF8 \uB2E8\uACC4\uC758 \uB2F4\uB2F9 \uC758\uB8CC\uC9C4 \uC774\uB984. \uC811\uC218\uC99D\uC5D0 \uC801\uD600 \uC788\uC744 \uB54C\uB9CC \uADF8\uB300\uB85C \uC62E\uAE30\uACE0, \uC5C6\uC73C\uBA74 \uBE48 \uBB38\uC790\uC5F4"
          }
        },
        required: ["order", "action", "placeId", "detail", "summary", "doctor"]
      }
    }
  },
  required: ["steps"]
};
var ResultSchema = z.object({
  steps: z.array(
    z.object({
      order: z.number().int(),
      action: z.string().min(1),
      placeId: z.enum(PLACE_IDS),
      detail: z.string(),
      summary: z.string(),
      doctor: z.string().optional().default("")
    })
  ).min(1)
});
var SYSTEM = `\uB2F9\uC2E0\uC740 \uBCD1\uC6D0 \uC811\uC218\uC99D\uACFC \uC548\uB0B4\uBB38\uC744 \uACE0\uB839 \uD658\uC790\uC6A9 \uD589\uB3D9 \uC548\uB0B4\uB85C \uBC14\uAFB8\uB294 \uB3C4\uC6B0\uBBF8\uC785\uB2C8\uB2E4.

\uC0AC\uC9C4\uC774 \uC8FC\uC5B4\uC9C0\uBA74 \uBA3C\uC800 \uC0AC\uC9C4 \uC18D \uAE00\uC790\uB97C \uC77D\uACE0, \uC624\uB298 \uD658\uC790\uAC00 \uD574\uC57C \uD560 \uC77C\uC744 \uC21C\uC11C\uB300\uB85C \uCC3E\uC544\uB0B4\uC138\uC694.

\uC6D0\uCE59:
1. \uD55C \uB2E8\uACC4 = \uD55C \uD589\uB3D9. \uC5EC\uB7EC \uC77C\uC744 \uD55C \uBB38\uC7A5\uC5D0 \uB123\uC9C0 \uB9C8\uC138\uC694.
2. \uC5B4\uB824\uC6B4 \uBCD1\uC6D0 \uC6A9\uC5B4\uB97C \uC26C\uC6B4 \uB9D0\uB85C \uBC14\uAFC9\uB2C8\uB2E4. "\uCC44\uD608\uC2E4" \u2192 "\uD53C \uBF51\uB294 \uACF3", "\uC601\uC0C1\uC758\uD559\uACFC X-ray" \u2192 "\uC0AC\uC9C4 \uCC0D\uB294 \uACF3".
3. \uC874\uB313\uB9D0\uB85C, \uC9E7\uACE0 \uBD84\uBA85\uD558\uAC8C. \uD55C \uBB38\uC7A5 20\uC790 \uC774\uB0B4\uB97C \uBAA9\uD45C\uB85C \uD569\uB2C8\uB2E4.
4. \uC548\uB0B4\uBB38\uC5D0 \uC801\uD78C \uC21C\uC11C\uB97C \uADF8\uB300\uB85C \uC9C0\uD0B5\uB2C8\uB2E4. \uC21C\uC11C\uB97C \uBC14\uAFB8\uAC70\uB098 \uCD5C\uC801\uD654\uD558\uC9C0 \uB9C8\uC138\uC694.
5. \uC548\uB0B4\uBB38\uC5D0 \uC5C6\uB294 \uB2E8\uACC4\uB97C \uC9C0\uC5B4\uB0B4\uC9C0 \uB9C8\uC138\uC694.
6. placeId\uB294 \uC544\uB798 \uC7A5\uC18C \uBAA9\uB85D\uC5D0 \uC788\uB294 id\uB9CC \uC0AC\uC6A9\uD569\uB2C8\uB2E4. \uD574\uB2F9\uD558\uB294 \uACF3\uC774 \uC5C6\uC73C\uBA74 \uADF8 \uB2E8\uACC4\uB97C \uBE7C\uC138\uC694.
7. \uD658\uC790 \uC774\uB984\xB7\uC0DD\uB144\uC6D4\uC77C\xB7\uB4F1\uB85D\uBC88\uD638 \uAC19\uC740 \uAC1C\uC778\uC815\uBCF4\uB294 \uACB0\uACFC\uC5D0 \uC808\uB300 \uB2F4\uC9C0 \uB9C8\uC138\uC694.
   \uB2E8, **\uB2F4\uB2F9 \uC758\uB8CC\uC9C4 \uC774\uB984**\uC740 \uC9C4\uB8CC \uB2E8\uACC4\uC5D0\uC11C \uC5B4\uB974\uC2E0\uC774 \uD655\uC778\uD574\uC57C \uD558\uBBC0\uB85C doctor \uC5D0 \uB123\uC2B5\uB2C8\uB2E4.
   \uC885\uC774\uC5D0 \uC801\uD78C \uAE00\uC790\uB97C \uADF8\uB300\uB85C \uC62E\uAE30\uACE0, \uC548 \uC801\uD600 \uC788\uC73C\uBA74 \uBE48 \uBB38\uC790\uC5F4\uB85C \uB450\uC138\uC694. \uC9C0\uC5B4\uB0B4\uC9C0 \uB9C8\uC138\uC694.
8. \uAC19\uC740 \uD45C\uD604\uC744 \uBC18\uBCF5\uD558\uC9C0 \uB9C8\uC138\uC694. "~\uB85C \uAC00\uC138\uC694"\uAC00 \uACC4\uC18D \uB098\uC624\uC9C0 \uC54A\uB3C4\uB85D
   "~\uC5D0 \uB4E4\uB974\uC138\uC694", "~\uC5D0\uC11C \uAE30\uB2E4\uB9AC\uC138\uC694", "~\uB97C \uBC1B\uC73C\uC138\uC694" \uCC98\uB7FC \uB2E8\uACC4\uB9C8\uB2E4 \uB2E4\uB974\uAC8C \uC501\uB2C8\uB2E4.

\uC0AC\uC6A9 \uAC00\uB2A5\uD55C \uC7A5\uC18C (id | \uACF5\uC2DD\uBA85\uCE6D | \uC26C\uC6B4\uB9D0 | \uC704\uCE58):
${placeCatalogForPrompt()}`;
var RATE_LIMIT = 8;
var hits = /* @__PURE__ */ new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 6e4);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) hits.clear();
  return recent.length > RATE_LIMIT;
}
var MAX_IMAGE_CHARS = 56e5;
var ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
async function POST(request) {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY \uBBF8\uC124\uC815");
    return json({ error: "\uBCC0\uD658 \uC11C\uBC84\uAC00 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4" }, 500);
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return json({ error: "\uC694\uCCAD\uC774 \uB108\uBB34 \uC7A6\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694" }, 429);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "\uBCF8\uBB38\uC744 \uC77D\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" }, 400);
  }
  const parts = [];
  if (body.image) {
    const { data, mimeType } = body.image;
    if (typeof data !== "string" || typeof mimeType !== "string") {
      return json({ error: "\uC774\uBBF8\uC9C0 \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4" }, 400);
    }
    if (!ALLOWED_MIME.includes(mimeType)) {
      return json({ error: "\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uC774\uBBF8\uC9C0 \uD615\uC2DD\uC785\uB2C8\uB2E4" }, 400);
    }
    if (data.length > MAX_IMAGE_CHARS) {
      return json({ error: "\uC774\uBBF8\uC9C0\uAC00 \uB108\uBB34 \uD07D\uB2C8\uB2E4" }, 413);
    }
    parts.push({ inlineData: { data, mimeType } });
  }
  if (typeof body.notice === "string" && body.notice.trim() !== "") {
    const notice = body.notice.trim();
    if (notice.length > 2e3) {
      return json({ error: "\uC548\uB0B4\uBB38\uC774 \uB108\uBB34 \uAE41\uB2C8\uB2E4" }, 400);
    }
    parts.push({ text: `\uB2E4\uC74C \uBCD1\uC6D0 \uC548\uB0B4\uBB38\uC744 \uD589\uB3D9 \uB2E8\uACC4\uB85C \uBC14\uAFD4\uC8FC\uC138\uC694.

---
${notice}
---` });
  } else if (parts.length > 0) {
    parts.push({ text: "\uC774 \uC811\uC218\uC99D\uC744 \uBCF4\uACE0 \uC624\uB298 \uD574\uC57C \uD560 \uC77C\uC744 \uC21C\uC11C\uB300\uB85C \uC54C\uB824\uC8FC\uC138\uC694." });
  }
  if (parts.length === 0) {
    return json({ error: "\uC811\uC218\uC99D \uC0AC\uC9C4\uC774\uB098 \uC548\uB0B4\uBB38 \uD14D\uC2A4\uD2B8\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4" }, 400);
  }
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: SYSTEM,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0
      }
    });
    const text = response.text;
    if (!text) {
      return json({ error: "\uBCC0\uD658 \uACB0\uACFC\uAC00 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4" }, 502);
    }
    const parsed = ResultSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      console.error("\uC2A4\uD0A4\uB9C8 \uBD88\uC77C\uCE58:", parsed.error.message, "| raw:", text.slice(0, 400));
      return json({ error: "\uBCC0\uD658 \uACB0\uACFC\uB97C \uD574\uC11D\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" }, 502);
    }
    return json({
      steps: parsed.data.steps,
      model: MODEL,
      usage: {
        input: response.usageMetadata?.promptTokenCount,
        output: response.usageMetadata?.candidatesTokenCount
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/quota|rate|429|RESOURCE_EXHAUSTED/i.test(message)) {
      console.warn("\uBB34\uB8CC \uD2F0\uC5B4 \uD55C\uB3C4 \uCD08\uACFC:", message);
      return json({ error: "\uC9C0\uAE08\uC740 \uC694\uCCAD\uC774 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694" }, 429);
    }
    console.error("\uBCC0\uD658 \uC2E4\uD328:", message);
    return json({ error: "\uBCC0\uD658 \uC2E4\uD328" }, 502);
  }
}
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
export {
  POST
};
