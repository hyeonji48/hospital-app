import { motion } from "motion/react";

export function LoadingView() {
  return (
    <div className="w-full h-full bg-[#F2F4F7] flex flex-col items-center justify-center gap-10 select-none">

      {/* Spinner */}
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full border-8 border-slate-200" />
        <motion.div
          className="absolute inset-0 rounded-full border-8 border-transparent border-t-[#2F6EFF]"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Text */}
      <p className="text-3xl font-extrabold text-slate-800">
        잠시만 기다려 주세요
      </p>
    </div>
  );
}
