import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CameraView } from "./components/CameraView";
import { LoadingView } from "./components/LoadingView";
import { NavigationScreen } from "./components/NavigationScreen";
import { ArrivalScreen } from "./components/ArrivalScreen";
import { CompleteView } from "./components/CompleteView";
import { ConfirmScreen } from "./components/ConfirmScreen";
import { TASKS } from "./types";

type Phase = "camera" | "loading" | "confirm" | "navigating" | "arrived" | "complete";

interface HistoryEntry {
  phase: Phase;
  taskIndex: number;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("camera");
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "오후" : "오전";
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      setTime(`${ampm} ${hours}:${minutes}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 60000);
    return () => clearInterval(interval);
  }, []);

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

  const handleScan = () => {
    pushAndNavigate("loading");
    setTimeout(() => {
      // Replace "loading" in-place → push confirm on top
      setHistory((prev) => [...prev, { phase: "loading", taskIndex: currentTaskIndex }]);
      setPhase("confirm");
    }, 3600);
  };

  const handleStartNavigation = () => {
    pushAndNavigate("navigating");
  };

  const handleArrived = () => {
    pushAndNavigate("arrived");
  };

  const handleNext = () => {
    if (currentTaskIndex < TASKS.length - 1) {
      pushAndNavigate("navigating", currentTaskIndex + 1);
    } else {
      pushAndNavigate("complete");
    }
  };

  const handleRestart = () => {
    setCurrentTaskIndex(0);
    setPhase("camera");
    setHistory([]);
  };

  return (
    <div className="min-h-screen w-screen bg-[#EDF0F3] flex items-center justify-center font-sans p-4 antialiased select-none">
      {/* clean floating smartphone screen */}
      <div className="relative w-[412px] h-[915px] rounded-[2.5rem] bg-[#F2F4F7] shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col max-sm:w-full max-sm:h-screen max-sm:rounded-none">
        
        {/* Status Bar */}
        <div className="h-10 px-8 pt-3.5 flex items-center justify-between text-base font-semibold text-slate-800 z-40 shrink-0 bg-transparent select-none max-sm:px-6">
          <span className="tracking-tight">{time || "오후 3:41"}</span>
          <div className="flex items-center gap-2">
            {/* Cellular signal bars */}
            <div className="flex items-end gap-[2px] h-3.5">
              <span className="w-[3px] h-[5px] bg-slate-800 rounded-[0.5px]" />
              <span className="w-[3px] h-[7px] bg-slate-800 rounded-[0.5px]" />
              <span className="w-[3px] h-[9px] bg-slate-800 rounded-[0.5px]" />
              <span className="w-[3px] h-[11px] bg-slate-800 rounded-[0.5px]" />
            </div>
            
            {/* Wi-Fi Icon (Lucide-like SVG) */}
            <svg className="w-4 h-4 fill-current text-slate-800" viewBox="0 0 24 24">
              <path d="M12 21a2 2 0 1 1-2-2 2 2 0 0 1 2 2zm0-5a5 5 0 0 0-3.54 1.46.75.75 0 1 0 1.06 1.06 3.5 3.5 0 0 1 4.96 0 .75.75 0 1 0 1.06-1.06A5 5 0 0 0 12 16zm0-5a10 10 0 0 0-7.07 2.93.75.75 0 0 0 1.06 1.06 8.5 8.5 0 0 1 12.02 0 .75.75 0 0 0 1.06-1.06A10 10 0 0 0 12 11zm0-5a15 15 0 0 0-10.6 4.4.75.75 0 0 0 1.06 1.06 13.5 13.5 0 0 1 19.08 0 .75.75 0 0 0 1.06-1.06A15 15 0 0 0 12 6z"/>
            </svg>
            
            {/* Battery percentage */}
            <span className="text-[13px] font-bold text-slate-800">96%</span>
            <div className="w-6 h-3 rounded-[3px] border border-slate-800 p-[1px] flex items-center">
              <div className="w-[85%] h-full bg-slate-800 rounded-[1px]" />
            </div>
          </div>
        </div>

        {/* Content View Area */}
        <div className="flex-1 relative overflow-hidden flex flex-col bg-[#F2F4F7]">
          <AnimatePresence mode="wait">
            {phase === "camera" && (
              <motion.div
                key="camera"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                <CameraView onScan={handleScan} />
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
                <ConfirmScreen onConfirm={handleStartNavigation} />
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
                  task={TASKS[currentTaskIndex]}
                  isLast={currentTaskIndex === TASKS.length - 1}
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
                <CompleteView onRestart={handleRestart} />
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
