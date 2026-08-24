import { motion } from "motion/react";
import { Task } from "../types";
import { CheckCircle2, RotateCcw } from "lucide-react";

interface CompleteViewProps {
  tasks: Task[];
  onRestart: () => void;
}

export function CompleteView({ tasks, onRestart }: CompleteViewProps) {
  return (
    <div className="flex flex-col h-full bg-[#F2F4F7] items-center justify-between p-6 pb-8 select-none">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-8 w-full py-4">

        {/* Check icon */}
        <motion.div
          initial={{ scale: 0, y: -20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 250, damping: 18, delay: 0.1 }}
          className="w-28 h-28 rounded-full bg-[#EAF0FF] flex items-center justify-center relative shadow-sm"
        >
          <div className="absolute inset-0 rounded-full bg-[#2F6EFF] opacity-10 animate-ping" />
          <CheckCircle2 size={52} className="text-[#2F6EFF]" strokeWidth={2.5} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <p className="text-4xl font-extrabold text-slate-900">
            오늘 진료 완료!
          </p>
          <p className="text-2xl font-medium text-slate-500">모든 일정을 마치셨습니다.</p>
        </motion.div>

        {/* Task completion list */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="w-full bg-white rounded-[2rem] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-4 mt-2"
        >
          <p className="text-2xl font-bold text-slate-800 mb-3 border-b border-slate-100 pb-3">완료한 일정</p>
          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {tasks.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                className="flex items-center gap-3.5"
              >
                <CheckCircle2 size={24} className="text-[#2F6EFF] shrink-0" strokeWidth={2.5} />
                <p className="text-slate-700 text-xl font-bold text-left break-keep">
                  {/* "성모관 2층 내과" + "진료" → 한 줄로 끊어 읽는다 */}
                  {[task.location, task.summary].filter(Boolean).join(" ")}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Restart button */}
      <div className="shrink-0 w-full pt-2">
        <motion.button
          onClick={onRestart}
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-500 shadow-[0_4px_20px_rgba(0,0,0,0.02)] rounded-[1.75rem] py-5 text-3xl font-bold transition-all"
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <RotateCcw size={26} strokeWidth={2.5} />
          처음으로 돌아가기
        </motion.button>
      </div>
    </div>
  );
}
