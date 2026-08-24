#!/usr/bin/env node
// 시연용 캐시 생성기
//
//   npm run gen:fixture -- "내과 외래 접수 후 채혈실 방문..."
//
// 실행 중인 변환 엔드포인트를 그대로 호출한다. 프롬프트를 복제하지 않으므로
// 캐시와 실시간 호출이 어긋날 일이 없다.
//
//   배포본(기본): https://hospital-app-xi-sooty.vercel.app
//   로컬:         TRANSFORM_URL=http://localhost:3000 npm run gen:fixture -- "..."
//                 (먼저 `npm run dev:api` 로 vercel dev 실행)

const notice = process.argv.slice(2).join(" ").trim();
if (!notice) {
  console.error('사용법: npm run gen:fixture -- "<안내문 원문>"');
  process.exit(1);
}

const base = process.env.TRANSFORM_URL ?? "https://hospital-app-xi-sooty.vercel.app";
const url = `${base.replace(/\/$/, "")}/api/transform`;

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ notice }),
}).catch((err) => {
  console.error(`엔드포인트 호출 실패 (${url})`);
  console.error("배포가 끝났는지, ANTHROPIC_API_KEY가 설정됐는지 확인하세요.");
  console.error(err.message);
  process.exit(1);
});

const body = await res.json();
if (!res.ok || body.error) {
  console.error(`변환 실패 (${res.status}):`, body.error ?? body);
  process.exit(1);
}

console.error(`✓ ${body.model} / in ${body.usage?.input} out ${body.usage?.output} 토큰`);
console.error("아래를 src/app/data/noticeFixtures.ts 에 붙여넣으세요.\n");

console.log(`const STEPS = ${JSON.stringify(body.steps, null, 2)};`);
