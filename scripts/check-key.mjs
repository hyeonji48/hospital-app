#!/usr/bin/env node
// GEMINI_API_KEY 가 실제로 동작하는지 확인한다.
//
//   npm run check:key
//
// 키 자체는 절대 출력하지 않는다. 길이와 앞 세 글자만 보여준다.
// (구글이 키 형식을 바꿔서 AIza 로 시작하는 것도, AQ. 로 시작하는 것도 정상이다)

const key = process.env.GEMINI_API_KEY;

if (!key) {
  console.error("❌ GEMINI_API_KEY 가 이 터미널에 없습니다.");
  console.error("");
  console.error("   export GEMINI_API_KEY=키붙여넣기");
  console.error("");
  console.error("   를 먼저 실행하세요. 창을 새로 열면 다시 해야 합니다.");
  process.exit(1);
}

console.log(`키 확인: ${key.slice(0, 3)}… (${key.length}자)`);
console.log("구글에 물어보는 중…\n");

try {
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
    headers: { "x-goog-api-key": key },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`❌ 키가 거부되었습니다 (HTTP ${res.status})`);
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      console.error("   키를 잘못 붙여넣었거나, 앞뒤에 공백·따옴표가 섞였을 수 있습니다.");
    }
    console.error(`   응답: ${body.slice(0, 300)}`);
    process.exit(1);
  }

  const json = await res.json();
  const models = (json.models ?? []).map((m) => m.name.replace("models/", ""));
  const tts = models.filter((m) => m.includes("tts"));
  const flash = models.filter((m) => m.includes("flash") && !m.includes("tts"));

  console.log("✅ 키가 정상 동작합니다.");
  console.log(`   사용 가능한 모델 ${models.length}개`);
  console.log(`   음성(TTS) 모델: ${tts.length ? tts.slice(0, 3).join(", ") : "없음 ⚠️"}`);
  console.log(`   접수증 인식용: ${flash.slice(0, 3).join(", ")}`);
  console.log("");
  if (tts.length === 0) {
    console.log("⚠️  TTS 모델이 목록에 없습니다. npm run gen:speech 가 실패할 수 있습니다.");
  } else {
    console.log("다음: npm run gen:speech");
  }
} catch (err) {
  console.error("❌ 구글에 연결하지 못했습니다:", err instanceof Error ? err.message : err);
  process.exit(1);
}
