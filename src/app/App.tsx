import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CameraView } from "./components/CameraView";
import { LoadingView } from "./components/LoadingView";
import { NavigationScreen } from "./components/NavigationScreen";
import { ArrivalScreen } from "./components/ArrivalScreen";
import { CompleteView } from "./components/CompleteView";
import { ConfirmScreen } from "./components/ConfirmScreen";
import { ModeSelect, type AppMode } from "./components/ModeSelect";
import type { Task } from "./types";
import {
  transformNotice,
  type ImagePayload,
  type TransformSource,
} from "./lib/noticeTransform";
import { buildTasks } from "./lib/buildTasks";
import { DEMO_NOTICE } from "./data/noticeFixtures";

type Phase = "intro" | "camera" | "loading" | "confirm" | "navigating" | "arrived" | "complete";

interface HistoryEntry {
  phase: Phase;
  taskIndex: number;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("intro");
  /**
   * demo: 접수증을 찍는 시늉만 하고 저장된 결과를 쓴다 (심사장 기본값).
   * live: 실제 사진을 AI에 보낸다.
   * 두 모드는 데이터 출처만 다르고 이후 화면·경로 코드는 완전히 동일하다.
   */
  const [mode, setMode] = useState<AppMode>("demo");
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  /** 접수증에서 뽑아낸 오늘의 일정. 앱을 켠 시점에는 비어 있다 */
  const [tasks, setTasks] = useState<Task[]>([]);
  const [source, setSource] = useState<TransformSource>("cache");
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Push the current state onto history before changing phase
  const pushAndNavigate = useCallback(
    (nextPhase: Phase, nextTaskIndex?: number) => {
      setHistory((prev) => [...prev, { phase, taskIndex: currentTaskIndex }]);
      if (nextTaskIndex !== undefined) {
        setCurrentTaskIndex(nextTaskIndex);
      }
      setPhase(nextPhase);
    },
    [phase, currentTaskIndex],
  );

  const goBack = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const newHistory = [...prev];
      const last = newHistory.pop()!;
      setPhase(last.phase);
      setCurrentTaskIndex(last.taskIndex);
      return newHistory;
    });
  }, []);

  /**
   * 접수증 촬영 → AI 변환 → 경로 생성.
   *
   * image 가 null 이면(카메라 실패 등) 시연용 안내문 텍스트로 대체한다.
   * transformNotice 안에 캐시·API·폴백 3단이 들어 있어 여기서는 실패를 걱정하지 않는다.
   */
  const handleScan = useCallback(
    async (image: ImagePayload | null) => {
      setHistory((prev) => [...prev, { phase: "camera", taskIndex: 0 }]);
      setPhase("loading");

      // 시연 모드는 사진을 보내지 않는다 — 네트워크·API 한도에 노출되지 않는다.
      // 실제 모드는 찍은 사진을 보내고, 실패하면 같은 캐시가 받아준다.
      const result =
        mode === "demo"
          ? await transformNotice({ notice: DEMO_NOTICE })
          : image
            ? await transformNotice({ image }, { allowDemoFallback: false })
            : // 실제 인식 모드인데 사진이 없다 = 촬영 실패.
              // 시연 데이터로 메우면 남의 일정이 뜬다.
              { source: "fallback" as const, steps: [], elapsedMs: 0, error: "사진을 얻지 못했습니다" };
      const { tasks: built, skipped } = buildTasks(result.steps);

      if (result.error) {
        // 인식이 실패한 이유를 남긴다 — 조용히 폴백되면 원인을 못 찾는다
        console.warn(`[동행온] 인식 실패 (${result.source}):`, result.error);
      }
      if (skipped.length > 0) {
        // 경로를 못 만든 단계는 화면에서 빠진다. 조용히 사라지면 원인을 못 찾으므로 남긴다.
        console.warn("[동행온] 경로를 만들지 못한 단계:", skipped);
      }

      setTasks(built);
      setSource(result.source);
      setCurrentTaskIndex(0);
      setHistory((prev) => [...prev, { phase: "loading", taskIndex: 0 }]);
      setPhase("confirm");
    },
    [mode],
  );

  const handleStartNavigation = () => {
    // 읽기에 실패해 일정이 비었으면 다시 촬영으로 되돌린다
    if (tasks.length === 0) {
      setPhase("camera");
      setHistory([]);
      return;
    }
    pushAndNavigate("navigating");
  };

  const handleArrived = () => {
    pushAndNavigate("arrived");
  };

  const handleNext = () => {
    if (currentTaskIndex < tasks.length - 1) {
      pushAndNavigate("navigating", currentTaskIndex + 1);
    } else {
      pushAndNavigate("complete");
    }
  };

  const handleRestart = () => {
    setCurrentTaskIndex(0);
    setTasks([]);
    setPhase("intro");
    setHistory([]);
  };

  const handleSelectMode = (m: AppMode) => {
    setMode(m);
    setHistory([{ phase: "intro", taskIndex: 0 }]);
    setPhase("camera");
  };

  return (
    <div className="min-h-screen w-screen bg-[#EDF0F3] flex items-center justify-center font-sans p-4 antialiased select-none">
      {/* clean floating smartphone screen */}
      <div className="relative w-[412px] h-[915px] rounded-[2.5rem] bg-[#F2F4F7] shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col max-sm:w-full max-sm:h-screen max-sm:rounded-none">
        
        {/* Content View Area */}
        <div className="flex-1 relative overflow-hidden flex flex-col bg-[#F2F4F7]">
          <AnimatePresence mode="wait">
            {phase === "intro" && (
              <motion.div
                key="intro"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                <ModeSelect onSelect={handleSelectMode} />
              </motion.div>
            )}

            {phase === "camera" && (
              <motion.div
                key="camera"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                <CameraView onScan={handleScan} requirePhoto={mode === "live"} />
              </motion.div>
            )}

            {phase === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                <LoadingView />
              </motion.div>
            )}

            {phase === "confirm" && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                <ConfirmScreen
                  tasks={tasks}
                  source={source}
                  useClips={mode === "demo"}
                  onConfirm={handleStartNavigation}
                />
              </motion.div>
            )}

            {phase === "navigating" && (
              <motion.div
                key={`navigating-${currentTaskIndex}`}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.35 }}
                className="absolute inset-0"
              >
                <NavigationScreen
                  tasks={tasks}
                  useClips={mode === "demo"}
                  currentTaskIndex={currentTaskIndex}
                  onArrived={handleArrived}
                  onBack={goBack}
                />
              </motion.div>
            )}

            {phase === "arrived" && (
              <motion.div
                key={`arrived-${currentTaskIndex}`}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.4, type: "spring", stiffness: 280, damping: 26 }}
                className="absolute inset-0"
              >
                <ArrivalScreen
                  task={tasks[currentTaskIndex]}
                  useClips={mode === "demo"}
                  isLast={currentTaskIndex === tasks.length - 1}
                  onNext={handleNext}
                  onBack={goBack}
                />
              </motion.div>
            )}

            {phase === "complete" && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0"
              >
                <CompleteView tasks={tasks} onRestart={handleRestart} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Spacing for screen rounding */}
        <div className="h-6 w-full shrink-0 bg-transparent select-none" />

      </div>
    </div>
  );
}
