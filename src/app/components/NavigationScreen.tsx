import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Task, NavStep, DirIcon } from "../types";
import { HospitalFloorMap } from "./HospitalFloorMap";
import { Map, ChevronLeft, X, ArrowRight, ArrowLeft, ArrowUp, ArrowDown } from "lucide-react";
import { useTTS } from "../hooks/useTTS";
import { navPhrase, elevatorPhrase, navSeed, navClip } from "../lib/phrases";
import { TTSReplayButton } from "./ui/TTSReplayButton";

interface Props {
  tasks: Task[];
  /** 사전 녹음 음성을 쓸지. 실제 인식 모드에서는 내용이 달라 쓰면 안 된다 */
  useClips: boolean;
  currentTaskIndex: number;
  onArrived: () => void;
  onBack: () => void;
}

// ─── Direction icon mapper ────────────────────────────────────
function DirIconComponent({ dir }: { dir: DirIcon }) {
  const cls = "text-white";
  const size = 52;
  if (dir === "right") return <ArrowRight size={size} className={cls} strokeWidth={2.5} />;
  if (dir === "left")  return <ArrowLeft  size={size} className={cls} strokeWidth={2.5} />;
  if (dir === "up")    return <ArrowUp    size={size} className={cls} strokeWidth={2.5} />;
  if (dir === "down")  return <ArrowDown  size={size} className={cls} strokeWidth={2.5} />;
  return null; // elevator handled separately
}

// ─── Full-screen Map ─────────────────────────────────────────
function MapFullScreen({ step, onClose }: { step: NavStep; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-50 bg-[#F2F4F7] flex flex-col p-6 select-none"
    >
      <div className="flex items-center justify-center py-4 shrink-0">
        <p className="text-5xl font-extrabold text-slate-900">약   도</p>
      </div>

      <div className="flex-1 my-4 flex flex-col justify-center min-h-0">
        <HospitalFloorMap step={step} fullScreen />
      </div>

      <div className="shrink-0 pt-2">
        <button
          onClick={onClose}
          className="w-full bg-[#2F6EFF] active:bg-[#1554D4] text-white rounded-[1.75rem] py-5 text-3xl font-bold transition-all shadow-lg shadow-[#2F6EFF]/15"
        >
          닫기
        </button>
      </div>
    </motion.div>
  );
}

// ─── Elevator UI ──────────────────────────────────────────────
function ElevatorPanel({ step, onDone }: { step: NavStep; onDone: () => void }) {
  const from = step.elevatorFrom ?? 1;
  const to = step.elevatorTo ?? 1;
  // 버튼이 "무엇을 확인하는 것인지" 말해준다. 그냥 '완료'는 뭐가 완료인지 알 수 없다.
  const label = `${to}층에 내렸어요`;

  return (
    <div className="flex flex-col h-full justify-between select-none">
      <div className="flex-1 flex flex-col justify-center py-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="w-full bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center text-center gap-8 my-auto"
        >
          <p className="text-4xl font-extrabold text-slate-900 leading-normal">
            엘리베이터
          </p>

          <div className="bg-[#EAF0FF] rounded-[2rem] px-10 py-6 flex items-center gap-6 shadow-sm">
            <span className="text-4xl font-extrabold">
              <span className="text-[#2F6EFF]">{from}</span>
              <span className="text-3xl font-semibold text-slate-500">층</span>
            </span>
            <span className="text-3xl text-slate-300 font-normal">→</span>
            <span className="text-5xl font-extrabold">
              <span className="text-[#2F6EFF]">{to}</span>
              <span className="text-4xl font-semibold text-slate-500">층</span>
            </span>
          </div>
        </motion.div>
      </div>

      <div className="shrink-0 pt-2">
        <motion.button
          onClick={onDone}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="w-full rounded-[1.75rem] py-6 text-3xl font-bold text-white bg-[#2F6EFF] active:bg-[#1554D4] transition-colors shadow-lg shadow-[#2F6EFF]/15"
          whileTap={{ scale: 0.97 }}
        >
          {label}
        </motion.button>
      </div>
    </div>
  );
}

// ─── Main NavigationScreen ────────────────────────────────────
export function NavigationScreen({ tasks, useClips, currentTaskIndex, onArrived, onBack }: Props) {
  const task = tasks[currentTaskIndex];
  const [stepIndex, setStepIndex] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const speak = useTTS();

  // Speak instruction whenever step changes
  useEffect(() => {
    setStepIndex(0);
    setShowMap(false);
  }, [currentTaskIndex]);

  const currentStep = task.steps[stepIndex];
  const isLastStep = stepIndex === task.steps.length - 1;

  // 화면마다 문구를 조금씩 바꿔 읽는다 — 같은 말이 서른 번 반복되면 흘려듣게 된다.
  // 씨앗이 (태스크, 스텝) 조합이라 같은 화면은 항상 같은 문구다. 다시 듣기가 어색해지지 않는다.
  const seed = navSeed(currentTaskIndex, stepIndex);
  const spoken = currentStep.isElevator
    ? elevatorPhrase(currentStep.elevatorFrom ?? 1, currentStep.elevatorTo ?? 1, seed)
    : navPhrase(currentStep.instruction, seed, isLastStep, currentStep.checkpoint);

  useEffect(() => {
    speak(spoken, useClips ? { clip: navClip(currentTaskIndex, stepIndex) } : {});
  }, [spoken, currentTaskIndex, stepIndex]); // eslint-disable-line

  // 다시 듣기도 **같은 음성 파일**을 재생한다.
  // 예전에는 파일 없이 불러서 브라우저가 제 나름의 목소리로 합성했고,
  // 그래서 자동 안내와 다시 듣기의 목소리가 서로 달랐다.
  const handleReplayTTS = () => {
    speak(spoken, useClips ? { clip: navClip(currentTaskIndex, stepIndex) } : {});
  };

  /**
   * 버튼 문구 — 이 화면에서 **어디까지 가면 누르는지**를 말한다.
   * "완료"만으로는 무엇이 완료인지 알 수 없어 어르신이 그냥 눌러 넘기게 된다.
   */
  const doneLabel = currentStep.checkpoint
    ? isLastStep
      ? `${currentStep.checkpoint} 도착`
      : `${currentStep.checkpoint}에 왔어요`
    : "완료";

  const handleNextStep = () => {
    setShowMap(false);
    if (isLastStep) {
      onArrived();
    } else {
      setStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
    } else {
      onBack();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F4F7] p-6 justify-between select-none relative overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between py-2 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-slate-500 active:text-slate-800"
          >
            <ChevronLeft size={28} strokeWidth={2.5} />
            <span className="text-2xl font-bold">뒤로</span>
          </button>
          
          <span className="text-slate-400 text-xl font-bold">
            {currentTaskIndex + 1} / {tasks.length}
          </span>
        </div>

        <TTSReplayButton onClick={handleReplayTTS} />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center py-4">
        <AnimatePresence mode="wait">
          {currentStep.isElevator ? (
            <motion.div
              key={`elevator-${stepIndex}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.22 }}
              className="h-full"
            >
              <ElevatorPanel step={currentStep} onDone={handleNextStep} />
            </motion.div>
          ) : (
            <motion.div
              key={`step-${stepIndex}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.22 }}
              className="h-full flex flex-col justify-between"
            >
              {/* Instruction area */}
              <div className="flex-1 flex flex-col justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full bg-white rounded-[2rem] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center text-center gap-6 my-auto"
                >
                  {/* Direction icon */}
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.08, type: "spring", stiffness: 200 }}
                    className="w-28 h-28 rounded-full bg-[#2F6EFF] flex items-center justify-center relative shadow-sm"
                  >
                    <div className="absolute inset-0 rounded-full bg-[#2F6EFF] opacity-10 animate-ping" />
                    <DirIconComponent dir={currentStep.dirIcon} />
                  </motion.div>

                  {/* Main instruction */}
                  <p className="text-3xl font-extrabold text-slate-900 leading-snug px-2 whitespace-pre-line">
                    {currentStep.headline}
                  </p>

                  {/* Map button */}
                  <button
                    onClick={() => setShowMap(true)}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#EAF0FF] text-[#2F6EFF] text-2xl font-bold active:bg-[#D5E4FF] transition-all shadow-sm"
                  >
                    <Map size={24} strokeWidth={2.5} />
                    약도 보기
                  </button>
                </motion.div>
              </div>

              {/* Complete button */}
              <div className="shrink-0 pt-2">
                <motion.button
                  onClick={handleNextStep}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="w-full rounded-[1.75rem] py-6 text-3xl font-bold text-white bg-[#2F6EFF] active:bg-[#1554D4] transition-colors shadow-lg shadow-[#2F6EFF]/15"
                  whileTap={{ scale: 0.97 }}
                >
                  {doneLabel}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Full-screen Map */}
      <AnimatePresence>
        {showMap && (
          <MapFullScreen step={currentStep} onClose={() => setShowMap(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}