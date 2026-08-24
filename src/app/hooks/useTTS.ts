import { useCallback, useEffect, useRef } from "react";

/**
 * 음성 안내.
 *
 * 두 가지 경로가 있다.
 *
 *  1) **사전 생성 음성 파일** — 시연 모드처럼 문장이 고정된 경우.
 *     `/audio/{clip}.mp3` 가 있으면 그걸 튼다. 기기마다 목소리가 달라지는 문제가
 *     사라지고, 네트워크·지연·비용도 0이다. 심사장에서 가장 중요한 성질.
 *
 *  2) **브라우저 음성 합성** — 실제 인식 모드처럼 문장을 미리 알 수 없는 경우.
 *     기기에 깔린 한국어 목소리 중 가장 자연스러운 것을 골라 쓴다.
 *
 * 파일이 없으면 조용히 2번으로 넘어가므로, 음성 파일은 나중에 채워도 된다.
 */

/**
 * 자연스러운 순서대로 나열한 한국어 목소리 이름.
 * 앞쪽에 있을수록 우선. 없으면 그냥 ko-KR 기본값을 쓴다.
 */
const PREFERRED_VOICES = [
  "Yuna", "유나",                    // Apple, 가장 자연스러움
  "Google 한국의", "Google 한국어",    // Android Chrome
  "Heami", "혜미",                   // Windows
  "Sora", "소라",
];

function pickKoreanVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices().filter((v) => /^ko/i.test(v.lang));
  if (voices.length === 0) return null;
  for (const want of PREFERRED_VOICES) {
    const hit = voices.find((v) => v.name.includes(want));
    if (hit) return hit;
  }
  // 로컬(오프라인) 음성을 원격보다 선호한다 — 네트워크가 끊겨도 나온다
  return voices.find((v) => v.localService) ?? voices[0];
}

export interface SpeakOptions {
  /** 사전 생성 음성 파일 이름. `public/audio/manifest.json` 에 있으면 그 파일을 튼다 */
  clip?: string;
}

interface AudioManifest {
  ext: string;
  clips: string[];
}

/**
 * 어떤 클립이 실제로 있는지 담은 목록.
 *
 * 파일 유무를 매번 요청해서 확인하면 없는 클립마다 404가 찍히고 콘솔이 지저분해진다.
 * 목록을 한 번만 받아두면 있는 것만 정확히 재생하고 나머지는 곧장 합성으로 간다.
 * `npm run gen:speech` 가 이 파일을 만든다. 없으면 전부 합성으로 동작한다.
 */
let manifestPromise: Promise<AudioManifest | null> | null = null;

function loadManifest(): Promise<AudioManifest | null> {
  if (!manifestPromise) {
    manifestPromise = fetch("/audio/manifest.json")
      .then((r) => (r.ok ? (r.json() as Promise<AudioManifest>) : null))
      .catch(() => null);
  }
  return manifestPromise;
}

/**
 * 첫 사용자 터치에서 오디오를 "깨운다".
 *
 * ★ 이 함수가 없으면 아이폰과 대부분의 모바일 브라우저에서 **음성이 아예 안 나온다.**
 *   자동재생 차단 정책 때문에, 소리는 사용자 제스처 안에서 한 번 시작된 적이 있어야
 *   그 뒤로 코드가 마음대로 재생할 수 있다. 화면이 바뀌면서 자동으로 나오는 안내는
 *   제스처 밖이라 조용히 막힌다 — 에러도 안 나서 원인을 찾기 어렵다.
 *
 *   첫 화면의 버튼을 누르는 순간 무음 재생과 빈 발화를 한 번씩 흘려서 잠금을 푼다.
 *   음성 파일 목록도 이때 미리 받아둔다.
 */
export function unlockAudio(): void {
  try {
    // 아주 짧은 무음 wav — 재생 자체가 목적이라 내용은 필요 없다
    const silent = new Audio(
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=",
    );
    silent.volume = 0;
    void silent.play().catch(() => {});
  } catch {
    /* 무시 — 잠금 해제는 최선 노력이다 */
  }
  try {
    // 음성 합성도 같은 제약을 받는다.
    // 빈 문자열은 브라우저에 따라 오류가 나므로 공백 한 칸을 무음으로 흘린다.
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    u.lang = "ko-KR";
    window.speechSynthesis.speak(u);
  } catch {
    /* 무시 */
  }
  // 목록을 미리 받아두면 첫 안내에서 끊기지 않는다
  void loadManifest();
}

export function useTTS() {
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** 비동기 재생이 겹치지 않도록 하는 호출 순번 */
  const callSeq = useRef(0);
  /** 크롬이 재생 중 스스로 멈추는 것을 막는 타이머 */
  const keepAlive = useRef(0);

  useEffect(() => {
    const load = () => {
      voiceRef.current = pickKoreanVoice();
    };
    load();
    // 목소리 목록은 비동기로 채워지는 브라우저가 있다
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
      window.clearInterval(keepAlive.current);
      audioRef.current?.pause();
    };
  }, []);

  /**
   * 브라우저 음성 합성.
   *
   * Web Speech API 는 브라우저마다 고장 패턴이 다르고 **에러 없이 조용히 실패**한다.
   * 아래 처리는 전부 실제로 자주 겪는 문제에 대한 대응이다.
   */
  const synthesize = useCallback((text: string) => {
    const synth = window.speechSynthesis;
    synth.cancel();

    // ① 크롬은 cancel() 직후 speak() 를 하면 발화가 큐에만 남고 시작되지 않는다.
    //    (speechSynthesis.speaking 은 true 인데 onstart 가 영영 안 온다)
    //    한 박자 쉬어야 확실히 시작된다.
    window.setTimeout(() => {
      // ② 크롬은 한 발화가 15초쯤 넘어가면 중간에 끊는다.
      //    문장 단위로 쪼개 큐에 넣으면 각각이 짧아져 안전하다.
      const chunks = text
        .split(/(?<=[.!?])\s+/)
        .map((t) => t.trim())
        .filter(Boolean);

      for (const chunk of chunks.length ? chunks : [text]) {
        const u = new SpeechSynthesisUtterance(chunk);
        u.lang = "ko-KR";
        if (voiceRef.current) u.voice = voiceRef.current;
        u.rate = 0.92; // 고령자용으로 살짝 느리게
        u.pitch = 1.0;
        u.volume = 1.0;
        u.onerror = (e) => {
          // 사용자가 화면을 넘겨서 취소된 것은 정상이다
          if (e.error !== "canceled" && e.error !== "interrupted") {
            console.warn("[동행온] 음성 재생 실패:", e.error);
          }
        };
        synth.speak(u);
      }

      // ③ 크롬은 재생 도중 스스로 일시정지에 빠지는 일이 있다.
      //    말하는 동안 주기적으로 resume() 을 불러 깨워둔다.
      window.clearInterval(keepAlive.current);
      keepAlive.current = window.setInterval(() => {
        if (!synth.speaking) {
          window.clearInterval(keepAlive.current);
          return;
        }
        synth.resume();
      }, 5000);
    }, 90);
  }, []);

  const speak = useCallback(
    (text: string, opts: SpeakOptions = {}) => {
      window.speechSynthesis.cancel();
      audioRef.current?.pause();

      if (!opts.clip) {
        synthesize(text);
        return;
      }

      // 이 호출이 최신인지 표시 — 목록을 받는 사이 화면이 넘어갔으면 재생하지 않는다
      const token = ++callSeq.current;

      loadManifest().then((manifest) => {
        if (token !== callSeq.current) return;
        if (!manifest || !manifest.clips.includes(opts.clip!)) {
          synthesize(text);
          return;
        }
        const audio = new Audio(`/audio/${opts.clip}.${manifest.ext}`);
        audioRef.current = audio;
        audio.onerror = () => synthesize(text);
        audio.play().catch(() => synthesize(text));
      });
    },
    [synthesize],
  );

  return speak;
}
