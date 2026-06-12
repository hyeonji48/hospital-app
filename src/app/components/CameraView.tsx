import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Camera, ScanLine } from "lucide-react";

interface CameraViewProps {
  onScan: () => void;
}

export function CameraView({ onScan }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch {
        setCameraError(true);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      onScan();
    }, 1800);
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col">
      {/* Camera feed */}
      {!cameraError ? (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          playsInline
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-[#2d2d2d] to-black flex items-center justify-center">
          <Camera className="text-[#8A7E7A]" size={80} />
        </div>
      )}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Top header */}
      <div className="relative z-10 pt-4 px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#2F6EFF] animate-pulse" />
          <span className="text-white text-xl font-normal">병원 길안내 서비스</span>
        </div>
      </div>

      {/* Scan frame */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <div className="relative w-72 h-72">
          {/* Corner brackets */}
          {[
            "top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl",
            "top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl",
            "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl",
            "bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl",
          ].map((cls, i) => (
            <div key={i} className={`absolute w-10 h-10 border-white ${cls}`} />
          ))}

          {/* Scan line animation */}
          {scanning && (
            <motion.div
              className="absolute left-0 right-0 h-0.5 bg-[#2F6EFF] shadow-[0_0_12px_4px_rgba(47,110,255,0.6)]"
              initial={{ top: "0%" }}
              animate={{ top: "100%" }}
              transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
            />
          )}

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <ScanLine size={36} className="text-white/60" />
            <p className="text-white/80 text-lg text-center font-normal">
              {scanning ? "분석 중..." : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom panel */}
      <div className="relative z-10 pb-6 px-6 space-y-5">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
          <p className="text-white text-4xl leading-normal font-medium">
            <span className="text-[#2F6EFF]">접수증</span>을<br />
            찍으세요
          </p>
        </div>

        <motion.button
          onClick={handleScan}
          disabled={scanning}
          className="w-full bg-[#2F6EFF] active:bg-[#1554D4] disabled:bg-slate-400 text-white rounded-2xl py-5 text-4xl font-medium transition-colors"
          whileTap={{ scale: 0.97 }}
        >
          {scanning ? "분석 중..." : "촬영"}
        </motion.button>
      </div>
    </div>
  );
}