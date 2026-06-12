import { Volume2 } from "lucide-react";
import { motion } from "motion/react";

interface Props {
  onClick: () => void;
}

export function TTSReplayButton({ onClick }: Props) {
  return (
    <motion.button
      onClick={onClick}
      className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#EAF0FF] active:bg-[#D5E4FF] text-[#2F6EFF] transition-colors shadow-sm"
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Volume2 size={22} strokeWidth={2.5} />
      <span className="text-xl font-bold">다시 듣기</span>
    </motion.button>
  );
}
