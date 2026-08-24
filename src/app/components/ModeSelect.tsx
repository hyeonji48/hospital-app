import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Wrench } from "lucide-react";
import { unlockAudio } from "../hooks/useTTS";

export type AppMode = "demo" | "live";

interface Props {
  onSelect: (mode: AppMode) => void;
}

/**
 * 첫 화면 — 시연 / 실제 인식 선택.
 *
 * NFC 태그 하나로 심사위원들이 각자 폰을 대볼 것이므로, 처음 보이는 화면이
 * "목데이터로 보세요"처럼 읽히면 안 된다. 그래서 **시연용을 주 버튼**으로 크게 두고,
 * 실제 AI 인식은 아래쪽 작은 버튼으로 둔다.
 *
 * URL은 바뀌지 않는다 — NFC 태그에 적힌 주소를 그대로 써야 하기 때문이다.
 */
export function ModeSelect({ onSelect }: Props) {
  // 로고 파일(public/logo.png)이 없어도 화면이 깨지지 않게 한다
  const [logoOk, setLogoOk] = useState(true);

  // 첫 터치가 유일하게 확실한 사용자 제스처다. 여기서 오디오 잠금을 풀지 않으면
  // 아이폰에서 이후 모든 안내 음성이 조용히 막힌다.
  const choose = (mode: AppMode) => {
    unlockAudio();
    onSelect(mode);
  };

  return (
    <div className="relative flex flex-col h-full overflow-hidden select-none">
      {/* 배경 — 위쪽은 **로고 파일의 배경색(#FAF8F2)과 정확히 같게** 두었다.
          로고 PNG 가 투명 배경이 아니라서, 색을 맞추지 않으면 네모난 가장자리가 보인다.
          아래로 내려가며 앱 본체의 회색톤으로 자연스럽게 넘어간다. */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F2] via-[#F6F5F4] to-[#EFF1F6]" />

      <div className="relative flex flex-col h-full px-7 pb-8">
        {/* 로고 + 서비스명 */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          {logoOk ? (
            <motion.img
              src="/logo.png"
              alt=""
              onError={() => setLogoOk(false)}
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="w-48 h-44 object-contain"
            />
          ) : (
            // 로고 파일이 없을 때의 대체 마크
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55 }}
              className="w-32 h-32 rounded-full bg-gradient-to-br from-[#D9A273] to-[#B5794E] flex items-center justify-center shadow-[0_10px_28px_rgba(150,110,70,0.28)]"
            >
              <span className="text-white text-6xl font-extrabold leading-none">溫</span>
            </motion.div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.5 }}
            className="mt-8 text-[3.4rem] leading-none font-extrabold text-slate-900 tracking-tight"
          >
            동행온
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.24, duration: 0.5 }}
            className="mt-5 flex items-center gap-3"
          >
            <span className="h-px w-7 bg-slate-300" />
            <p className="text-lg text-slate-500 tracking-wide">병원 길안내</p>
            <span className="h-px w-7 bg-slate-300" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34, duration: 0.5 }}
            className="mt-7 text-2xl text-slate-600 leading-relaxed break-keep font-medium"
          >
            어르신의 발걸음에
            <br />
            따뜻함<span className="text-[#B5794E]">(溫)</span>을 더합니다
          </motion.p>
        </div>

        {/* 시작 */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="shrink-0 space-y-3"
        >
          <button
            onClick={() => choose("demo")}
            className="group w-full rounded-[1.75rem] py-7 bg-[#A96849] active:bg-[#8E543A] transition-all shadow-[0_10px_30px_rgba(169,104,73,0.30)] active:shadow-[0_4px_14px_rgba(169,104,73,0.25)] active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <span className="text-white text-[2.1rem] font-bold tracking-tight">시작하기</span>
            <ArrowRight size={30} strokeWidth={2.6} className="text-white/90" />
          </button>

          <button
            onClick={() => choose("live")}
            className="w-full flex items-center justify-center gap-1.5 py-3 text-[0.95rem] text-slate-400 active:text-slate-600 transition-colors"
          >
            <Wrench size={15} />
            실제 접수증으로 인식하기
          </button>
        </motion.div>
      </div>
    </div>
  );
}
