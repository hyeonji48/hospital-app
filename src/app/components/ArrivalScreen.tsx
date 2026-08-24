import { useEffect } from "react";
import { motion } from "motion/react";
import { Task } from "../types";
import { ChevronLeft } from "lucide-react";
import { useTTS } from "../hooks/useTTS";
import { arrivalPhrase, arriveClip } from "../lib/phrases";
import { TTSReplayButton } from "./ui/TTSReplayButton";

interface ArrivalScreenProps {
  task: Task;
  isLast: boolean;
  onNext: () => void;
  onBack: () => void;
}

export function ArrivalScreen({ task, isLast, onNext, onBack }: ArrivalScreenProps) {
  const speak = useTTS();

  const spoken = arrivalPhrase(
    task.arrivalTitle.replace(" 도착", ""),
    task.arrivalDetail,
    task.doctor,
    task.id,
  );

  useEffect(() => {
    speak(spoken, { clip: arriveClip(task.id) });
  }, [spoken]); // eslint-disable-line

  const handleReplayTTS = () => speak(spoken);

  return (
    <div className="flex flex-col h-full bg-[#F2F4F7] p-6 justify-between select-none">

      {/* Top bar */}
      <div className="flex items-center justify-between py-2 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-slate-500 active:text-slate-800"
        >
          <ChevronLeft size={28} strokeWidth={2.5} />
          <span className="text-2xl font-bold">뒤로</span>
        </button>
        <TTSReplayButton onClick={handleReplayTTS} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center py-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center text-center gap-6 my-auto"
        >
          {/* Arrival title */}
          <p className="text-4xl font-extrabold text-slate-900 leading-snug whitespace-pre-line">
            {task.arrivalTitle}
          </p>

          {/* 담당 의료진 — 접수증에 적혀 있을 때만 */}
          {task.doctor && (
            <p className="text-3xl font-bold text-[#2F6EFF] leading-snug break-keep">
              {task.doctor}님
            </p>
          )}

          {/* Divider */}
          <div className="w-12 h-1 bg-[#2F6EFF] rounded-full" />

          {/* Instruction */}
          <p className="text-2xl font-medium text-slate-500 leading-relaxed whitespace-pre-line">
            {task.arrivalDetail}
          </p>
        </motion.div>
      </div>

      {/* Next button */}
      <div className="shrink-0 pt-2">
        <motion.button
          onClick={onNext}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="w-full rounded-[1.75rem] py-6 text-3xl font-bold text-white bg-[#2F6EFF] active:bg-[#1554D4] transition-colors shadow-lg shadow-[#2F6EFF]/15"
          whileTap={{ scale: 0.97 }}
        >
          완료
        </motion.button>
      </div>
    </div>
  );
}
