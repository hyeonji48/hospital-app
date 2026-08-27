#!/usr/bin/env node
/**
 * 시연용 음성 파일 생성기
 *
 *   npm run gen:speech                     # macOS 내장 음성 (무제한, 기본)
 *   TTS_ENGINE=gemini npm run gen:speech   # Gemini TTS (품질 좋으나 무료 하루 10개)
 *
 * 시연 모드에서 나올 문장을 전부 뽑아 음성으로 굽고 `public/audio/` 에 넣는다.
 *
 * 왜 미리 굽는가 — 브라우저 내장 음성은 **기기마다 목소리와 품질이 완전히 다르다.**
 * 심사장에서 어떤 폰을 쓰게 될지 모르는데 거기에 발표 품질을 맡길 수 없다.
 * 파일로 두면 기기·네트워크·지연·비용이 전부 문제에서 빠진다.
 *
 * 문장은 화면이 쓰는 것과 **같은 함수**(buildSpeechScript)로 만든다.
 * 그래서 파일과 실제 재생 문장이 어긋날 수 없다.
 */

import {
  writeFileSync, readFileSync, mkdirSync, unlinkSync, readdirSync, renameSync, rmSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { buildSpeechScript } from "../src/app/lib/phrases";
import { buildTasks } from "../src/app/lib/buildTasks";
import { NOTICE_FIXTURES, DEMO_FIXTURE_KEY } from "../src/app/data/noticeFixtures";
import { PLACE_BY_ID } from "../src/app/data/places";

const OUT_DIR = "public/audio";

/**
 * `say`  — macOS 내장. 무제한·즉시·무료. 아이폰 사파리의 기본 한국어 목소리와 같은 계열.
 * `gemini` — 더 자연스럽지만 **무료 티어는 모델당 하루 10회**라 34개를 한 번에 못 만든다.
 */
const ENGINE = (process.env.TTS_ENGINE ?? "say") as "say" | "gemini";

// ── say 설정 ─────────────────────────────────────────────────
/** `say -v '?'` 로 목록을 볼 수 있다. Yuna 가 가장 무난하다 */
const SAY_VOICE = process.env.TTS_VOICE ?? "Yuna";
/** 분당 단어 수. 고령자 대상이라 기본값(175)보다 느리게 */
const SAY_RATE = process.env.TTS_RATE ?? "160";

// ── gemini 설정 ──────────────────────────────────────────────
/**
 * 무료 티어 한도는 **모델별**로 걸린다 (quotaId 가 …PerProjectPerModel).
 * 한 모델이 하루치를 다 쓰면 다음 모델로 넘어가 그날 최대한 많이 만든다.
 * 같은 음색(Kore)을 쓰므로 모델이 달라도 목소리는 유지된다.
 */
const GEMINI_MODELS = (process.env.GEMINI_TTS_MODEL ?? [
  "gemini-2.5-flash-preview-tts",
  "gemini-3.1-flash-tts-preview",
  "gemini-2.5-pro-preview-tts",
].join(",")).split(",");
const GEMINI_MODEL = GEMINI_MODELS[0];
const GEMINI_VOICE = process.env.GEMINI_TTS_VOICE ?? "Kore";
const GEMINI_GAP_MS = Number(process.env.GEMINI_TTS_GAP ?? 21000);

/** Gemini TTS 는 24kHz 16bit 모노 PCM 을 준다 — 헤더가 없으므로 직접 붙인다 */
function toWav(pcm: Buffer): Buffer {
  const rate = 24000, ch = 1, bits = 16;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(ch, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE((rate * ch * bits) / 8, 28);
  header.writeUInt16LE((ch * bits) / 8, 32);
  header.writeUInt16LE(bits, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function have(cmd: string): boolean {
  try {
    execFileSync("/bin/sh", ["-c", `command -v ${cmd}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * 무손실 원본 → m4a.
 *
 * 44.1kHz / 128kbps 로 굽는다. 예전에는 22kHz / 64kbps 였는데, 브라우저가
 * 그 자리에서 합성한 소리(무압축)와 나란히 들어보면 확연히 탁했다.
 * 음성 클립 서른 개라도 44.1kHz/128k 로 전체 3MB 남짓이라 용량은 문제가 아니다.
 */
function compress(src: string, m4a: string): boolean {
  try {
    if (have("afconvert")) {
      execFileSync("afconvert", ["-f", "m4af", "-d", "aac@44100", "-b", "128000", src, m4a], {
        stdio: "ignore",
      });
      return true;
    }
    if (have("ffmpeg")) {
      execFileSync("ffmpeg", ["-y", "-i", src, "-ar", "44100", "-b:a", "128k", m4a], {
        stdio: "ignore",
      });
      return true;
    }
  } catch {
    /* 변환 실패해도 원본을 그대로 쓴다 */
  }
  return false;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 429 응답을 해석한다.
 *
 * 구글은 "분당 한도"와 "하루 한도"를 구분해서 알려주고, **몇 초 뒤에 다시 오라고
 * 정확히 말해준다.** 예전에는 이걸 무시하고 고정 시간만 기다려서, 분당 한도에
 * 걸린 것까지 실패로 처리하고 버렸다.
 */
function readQuotaError(msg: string): {
  isQuota: boolean;
  perDay: boolean;
  retrySec: number;
  transient: boolean;
} {
  // 503 = 모델이 일시적으로 붐빔. 한도와 무관하므로 잠깐 뒤 다시 하면 된다.
  // 예전에는 이걸 실패로 처리해 클립 하나를 그냥 잃었다.
  const transient = /\b503\b|UNAVAILABLE|high demand|overloaded/i.test(msg);
  const isQuota = /429|RESOURCE_EXHAUSTED|quota/i.test(msg);
  if (!isQuota) return { isQuota: false, perDay: false, retrySec: 0, transient };
  const perDay = /PerDay/i.test(msg);
  const m = msg.match(/"retryDelay"\s*:\s*"(\d+)s"/) ?? msg.match(/retry in ([\d.]+)s/);
  return { isQuota: true, perDay, retrySec: m ? Math.ceil(Number(m[1])) + 2 : 35, transient: false };
}

async function main() {
  // 시연 모드가 실제로 쓰는 목데이터로 화면을 그대로 재현한다
  const raw = NOTICE_FIXTURES[DEMO_FIXTURE_KEY];
  if (!raw) {
    console.error("시연용 픽스처를 찾지 못했습니다:", DEMO_FIXTURE_KEY);
    process.exit(1);
  }
  const actions = raw.map((s, i) => {
    const place = PLACE_BY_ID.get(s.placeId);
    return {
      order: s.order ?? i + 1,
      action: s.action,
      summary: s.summary ?? s.action,
      detail: s.detail,
      doctor: s.doctor,
      officialName: place?.official ?? "",
      building: place?.building ?? "",
      floor: place?.floor ?? 0,
      placeId: s.placeId,
    };
  });
  const { tasks, skipped } = buildTasks(actions);
  if (skipped.length) console.warn(`⚠️  경로를 만들지 못한 단계 ${skipped.length}개`);

  const script = buildSpeechScript(tasks);

  if (ENGINE === "say") {
    if (!have("say")) {
      console.error("❌ macOS 의 `say` 명령을 찾지 못했습니다. TTS_ENGINE=gemini 로 시도하세요.");
      process.exit(1);
    }
    console.log(`문장 ${script.length}개 / macOS say / 목소리 ${SAY_VOICE} / 속도 ${SAY_RATE}\n`);
  } else {
    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY 가 없습니다.  export GEMINI_API_KEY=... 후 다시 실행하세요.");
      process.exit(1);
    }
    console.log(`문장 ${script.length}개 / 음색 ${GEMINI_VOICE}`);
    console.log(`모델 순서: ${GEMINI_MODELS.join(" → ")}`);
    console.log("⚠️  무료 티어는 모델당 하루 한도가 있습니다. 다 못 만들면 내일 다시 실행하세요.");
    console.log("   (기존 음성은 전부 성공하기 전까지 그대로 유지됩니다)\n");
  }

  mkdirSync(OUT_DIR, { recursive: true });

  // 지금 설정으로 만들면 어떤 목소리가 되는지
  const signature =
    ENGINE === "say" ? `say:${SAY_VOICE}:${SAY_RATE}:hq` : `gemini:${GEMINI_MODEL}:${GEMINI_VOICE}:hq`;

  let prev: { signature?: string } = {};
  try {
    prev = JSON.parse(readFileSync(`${OUT_DIR}/manifest.json`, "utf8"));
  } catch {
    /* 없으면 처음 만드는 것 */
  }

  const files = readdirSync(OUT_DIR).filter((f) => /\.(m4a|wav|aiff)$/.test(f));
  const voiceChanged = Boolean(files.length && prev.signature && prev.signature !== signature);

  // ★ 목소리가 바뀌면 34개를 전부 새로 만들어야 한다. 섞이면 재생 도중 목소리가 바뀐다.
  //   그렇다고 **기존 파일을 먼저 지우면 안 된다** — 새로 만드는 데 실패하면
  //   (예: 무료 티어 하루 한도) 아무 음성도 남지 않는다. 실제로 한 번 그렇게 날렸다.
  //   그래서 임시 폴더에 전부 만들어보고, 다 성공했을 때만 갈아끼운다.
  const STAGING = `${OUT_DIR}/.staging`;
  const workDir = voiceChanged ? STAGING : OUT_DIR;

  if (voiceChanged) {
    console.log("목소리 설정이 바뀌었습니다.");
    console.log(`  이전: ${prev.signature}`);
    console.log(`  지금: ${signature}`);
    console.log("전부 새로 만듭니다. 다 만들어지기 전까지 기존 파일은 그대로 둡니다.\n");
    mkdirSync(STAGING, { recursive: true });
  }

  // 이어받기.
  // 목소리를 바꾸는 중이면 **임시 폴더에 쌓아둔 것**을 기준으로 건너뛴다.
  // 무료 티어 하루 한도 때문에 며칠에 걸쳐 채워야 할 수 있는데,
  // 매번 처음부터 다시 만들면 영영 못 끝낸다.
  const staged = voiceChanged
    ? readdirSync(STAGING).filter((f) => /\.(m4a|wav|aiff)$/.test(f))
    : [];
  const existing = new Set(
    (voiceChanged ? staged : files).map((f) => f.replace(/\.(m4a|wav|aiff)$/, "")),
  );
  if (existing.size) {
    console.log(
      voiceChanged
        ? `지난번에 만들어둔 ${existing.size}개는 건너뜁니다. (${script.length}개 다 모이면 교체)\n`
        : `이미 있는 ${existing.size}개는 건너뜁니다.\n`,
    );
  }

  const done: string[] = [...existing];
  let modelIdx = 0;
  let quotaExhausted = false;
  let ext = files.some((f) => f.endsWith(".m4a")) ? "m4a" : "wav";

  // gemini 는 SDK 를 쓸 때만 불러온다 (say 경로에서는 네트워크가 필요 없다)
  const ai =
    ENGINE === "gemini"
      ? new (await import("@google/genai")).GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
      : null;

  for (const [i, item] of script.entries()) {
    if (existing.has(item.clip)) {
      console.log(`[${i + 1}/${script.length}] ${item.clip} … (건너뜀)`);
      continue;
    }
    process.stdout.write(`[${i + 1}/${script.length}] ${item.clip} … `);

    const m4aPath = `${workDir}/${item.clip}.m4a`;
    let saved = false;

    for (let attempt = 0; attempt < 6 && !saved; attempt++) {
      try {
        let srcPath: string;

        if (ENGINE === "say") {
          srcPath = `${workDir}/${item.clip}.aiff`;
          execFileSync("say", ["-v", SAY_VOICE, "-r", SAY_RATE, "-o", srcPath, item.text]);
        } else {
          const res = await ai!.models.generateContent({
            model: GEMINI_MODELS[modelIdx],
            contents: [{ role: "user", parts: [{ text: item.text }] }],
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                languageCode: "ko-KR",
                voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_VOICE } },
              },
            },
          });
          const b64 = res.data;
          if (!b64) throw new Error("오디오가 비어 있음");
          srcPath = `${workDir}/${item.clip}.wav`;
          writeFileSync(srcPath, toWav(Buffer.from(b64, "base64")));
        }

        if (compress(srcPath, m4aPath)) {
          unlinkSync(srcPath);
          ext = "m4a";
        }
        done.push(item.clip);
        saved = true;
        console.log("✓");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const q = readQuotaError(msg);

        if (q.isQuota && q.perDay) {
          // 이 모델은 오늘 끝. 다음 모델로 넘어간다
          if (modelIdx < GEMINI_MODELS.length - 1) {
            modelIdx++;
            console.log(`✗ 하루 한도 → ${GEMINI_MODELS[modelIdx]} 로 전환`);
            continue;
          }
          console.log("✗ 모든 모델의 하루 한도 소진");
          quotaExhausted = true;
          break;
        }

        if (q.isQuota && attempt < 5) {
          // 분당 한도 — 구글이 알려준 만큼만 정확히 기다린다
          process.stdout.write(`분당 한도, ${q.retrySec}초 대기 … `);
          await sleep(q.retrySec * 1000);
          continue;
        }

        if (q.transient && attempt < 5) {
          // 모델 혼잡 — 조금 기다렸다 다시. 한도를 쓰는 게 아니므로 재시도가 이득이다.
          const wait = 8 * (attempt + 1);
          process.stdout.write(`모델 혼잡, ${wait}초 후 재시도 … `);
          await sleep(wait * 1000);
          continue;
        }

        console.log(`✗ ${msg.slice(0, 90)}`);
        break;
      }
    }

    if (quotaExhausted) break;

    if (ENGINE === "gemini") await sleep(GEMINI_GAP_MS);
  }

  const total = new Set(done).size;

  if (voiceChanged) {
    if (total < script.length) {
      // 반만 바꾸면 재생 도중 목소리가 섞인다 → 아직 교체하지 않는다.
      // 다만 만들어둔 것은 **버리지 않고 남긴다.** 하루 한도에 걸려도
      // 다음 날 이어서 채우면 되도록.
      console.log(`\n⏸  ${total}/${script.length}개 완료. 아직 교체하지 않습니다.`);
      console.log(`   ${script.length - total}개가 더 필요합니다. 만들어둔 것은 보관됩니다.`);
      console.log("   내일 같은 명령을 다시 실행하면 나머지만 채웁니다.");
      console.log("   지금 음성은 그대로 유지됩니다.");
      return;
    }
    console.log("\n전부 모였습니다. 기존 음성을 교체합니다.");
    // 전부 성공 — 이제 안전하게 갈아끼운다
    for (const f of readdirSync(OUT_DIR)) {
      if (/\.(m4a|wav|aiff)$/.test(f)) unlinkSync(`${OUT_DIR}/${f}`);
    }
    for (const f of readdirSync(STAGING)) {
      renameSync(`${STAGING}/${f}`, `${OUT_DIR}/${f}`);
    }
    rmSync(STAGING, { recursive: true, force: true });
  }

  writeFileSync(
    `${OUT_DIR}/manifest.json`,
    JSON.stringify({ ext, signature, clips: [...new Set(done)] }, null, 2) + "\n",
  );

  console.log(`\n완료: ${total}/${script.length}개 → ${OUT_DIR}/*.${ext}`);
  if (total < script.length) {
    console.log("빠진 것은 앱에서 브라우저 음성으로 대체됩니다. 다시 실행하면 빠진 것만 채웁니다.");
  } else {
    console.log('\n다음: git add public/audio && git commit -m "시연용 음성 파일 생성"');
  }
}

main();
