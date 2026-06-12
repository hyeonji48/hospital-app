import { CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { useTTS } from "../hooks/useTTS";
import { useEffect } from "react";
import { TTSReplayButton } from "./ui/TTSReplayButton";

interface Props {
  onConfirm: () => void;
}

export function ConfirmScreen({ onConfirm }: Props) {
  const speak = useTTS();

  useEffect(() => {
    speak("어르신, 오늘 정형외과 김멋사 교수님 진료 받으시러 오셨군요! 맞으시다면, 편안하게 화면 아래에 있는 '네 맞습니다' 버튼을 눌러주세요.");
  }, [speak]);

  const handleReplayTTS = () => {
    speak("정형외과 김멋사 교수님 진료가 맞으신가요?");
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F4F7] p-6 justify-between select-none">
      {/* Header */}
      <div className="flex items-center justify-between py-2 shrink-0">
        <p className="text-2xl font-bold text-slate-800">접수증 확인</p>
        <TTSReplayButton onClick={handleReplayTTS} />
      </div>

      {/* Card Content */}
      <div className="flex-1 flex flex-col justify-center py-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col items-center text-center my-auto"
        >
          <p className="text-4xl font-extrabold text-slate-900 mb-6 leading-snug break-keep">
            정형외과<br />
            <span className="text-[#2F6EFF]">김멋사</span> 교수님
          </p>
          <p className="text-2xl font-medium text-slate-500 break-keep">
            진료가 맞으신가요?
          </p>
        </motion.div>
      </div>

      {/* Action button */}
      <div className="shrink-0 pt-2">
        <motion.button
          onClick={onConfirm}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full rounded-[1.75rem] py-6 text-3xl font-bold text-white flex items-center justify-center gap-3 bg-[#2F6EFF] active:bg-[#1554D4] transition-colors shadow-lg shadow-[#2F6EFF]/15"
          whileTap={{ scale: 0.97 }}
        >
          완료 <CheckCircle2 size={32} strokeWidth={2.5} />
        </motion.button>
      </div>
    </div>
  );
}
