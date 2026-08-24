import { CheckCircle2, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";
import { useTTS } from "../hooks/useTTS";
import { useEffect } from "react";
import { TTSReplayButton } from "./ui/TTSReplayButton";
import type { Task } from "../types";
import type { TransformSource } from "../lib/noticeTransform";
import { confirmPhrase, CONFIRM_CLIP } from "../lib/phrases";

interface Props {
  tasks: Task[];
  /** 이 결과가 실시간 AI인지 캐시인지 — 시연에서 "진짜 AI 맞아요?"에 답하는 근거 */
  source: TransformSource;
  onConfirm: () => void;
}

/**
 * 접수증을 읽은 직후 화면.
 *
 * 여기서는 **오늘 누구에게 진료를 받는지 하나만** 확인한다.
 * 할 일 목록을 여기 늘어놓으면 어르신이 한 번에 다 읽어야 할 것처럼 느낀다 —
 * 그것이 바로 인터뷰에서 나온 "정보 과부하" 문제다. 목록은 다 끝난 뒤
 * 완료 화면에서 "오늘 이런 걸 하셨습니다"로 보여주면 된다.
 */
export function ConfirmScreen({ tasks, source, onConfirm }: Props) {
  const speak = useTTS();

  const visit = tasks.find((t) => t.doctor);
  const doctor = visit?.doctor;
  // "성모관 2층 내과" → "내과"
  const dept = visit?.location.split(" ").pop();

  const empty = tasks.length === 0;
  const spoken = empty
    ? "접수증을 읽지 못했습니다. 다시 찍어주세요."
    : confirmPhrase(tasks.length, doctor, dept);

  useEffect(() => {
    speak(spoken, { clip: CONFIRM_CLIP });
  }, [spoken]); // eslint-disable-line

  return (
    <div className="flex flex-col h-full bg-[#F2F4F7] p-6 select-none">
      {/* Header */}
      <div className="flex items-center justify-between py-2 shrink-0">
        <p className="text-2xl font-bold text-slate-800">접수증 확인</p>
        <TTSReplayButton onClick={() => speak(spoken, { clip: CONFIRM_CLIP })} />
      </div>

      <div className="flex-1 flex flex-col justify-center py-4">
        {empty ? (
          <div className="flex flex-col items-center justify-center text-center gap-4 px-4">
            <AlertTriangle size={56} className="text-amber-500" />
            <p className="text-3xl font-bold text-slate-800 leading-snug break-keep">
              접수증을 읽지 못했어요
            </p>
            <p className="text-xl text-slate-500 break-keep">
              글자가 잘 보이게 다시 찍어주세요
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col items-center text-center my-auto"
          >
            {doctor ? (
              <>
                <p className="text-4xl font-extrabold text-slate-900 leading-snug break-keep mb-2">
                  {dept}
                </p>
                <p className="text-5xl font-extrabold text-[#2F6EFF] leading-snug break-keep">
                  {doctor}님
                </p>
                <p className="text-2xl font-medium text-slate-500 mt-7 break-keep">
                  진료가 맞으신가요?
                </p>
              </>
            ) : (
              // 접수증에 담당 의료진이 없는 경우
              <>
                <p className="text-4xl font-extrabold text-slate-900 leading-snug break-keep">
                  오늘 하실 일
                </p>
                <p className="text-6xl font-extrabold text-[#2F6EFF] mt-4">
                  {tasks.length}가지
                </p>
                <p className="text-2xl font-medium text-slate-500 mt-7 break-keep">
                  안내를 시작할까요?
                </p>
              </>
            )}
          </motion.div>
        )}
      </div>

      {/* 출처 표시 — 시연에서 실시간 호출임을 보여주는 용도 */}
      {!empty && (
        <p className="shrink-0 text-center text-sm text-slate-400 pb-2">
          {source === "api"
            ? "AI가 방금 접수증을 읽었습니다"
            : source === "cache"
              ? "저장된 안내를 불러왔습니다"
              : "기본 안내를 표시합니다"}
        </p>
      )}

      <div className="shrink-0 pt-1">
        <motion.button
          onClick={onConfirm}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full rounded-[1.75rem] py-6 text-3xl font-bold text-white flex items-center justify-center gap-3 bg-[#2F6EFF] active:bg-[#1554D4] transition-colors shadow-lg shadow-[#2F6EFF]/15"
          whileTap={{ scale: 0.97 }}
        >
          {empty ? "다시 찍기" : "안내 시작"} <CheckCircle2 size={32} strokeWidth={2.5} />
        </motion.button>
      </div>
    </div>
  );
}
