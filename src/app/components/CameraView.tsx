import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Camera, ScanLine, ImageUp } from "lucide-react";
import type { ImagePayload } from "../lib/noticeTransform";
import { fileToImagePayload } from "../lib/noticeTransform";

interface CameraViewProps {
  /** 촬영한 접수증 사진을 넘긴다. null 이면 시연용 캐시 경로로 진행 */
  onScan: (image: ImagePayload | null) => void;
}

/** 업로드 용량과 인식률의 절충점. 너무 크면 토큰만 먹고 정확도는 안 오른다 */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;

export function CameraView({ onScan }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cameraError, setCameraError] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch {
        // 카메라를 못 쓰는 환경(데스크톱 브라우저, 권한 거부)에서는
        // 파일 선택으로 대체한다. 시연 중 카메라 권한 팝업에 막히면 끝이다.
        setCameraError(true);
      }
    };

    startCamera();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /** 비디오의 현재 프레임을 잘라 base64 JPEG 으로 만든다 */
  const captureFrame = (): ImagePayload | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;

    const scale = Math.min(1, MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    return { data: dataUrl.slice(dataUrl.indexOf(",") + 1), mimeType: "image/jpeg" };
  };

  const handleShoot = () => {
    if (scanning) return;
    setScanning(true);
    // 촬영 순간을 사용자가 인지하도록 한 박자 둔다. 그동안 프레임은 이미 잡아둔다.
    const image = captureFrame();
    setTimeout(() => onScan(image), 400);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file || scanning) return;
    setScanning(true);
    try {
      onScan(await fileToImagePayload(file));
    } catch {
      onScan(null); // 읽기 실패해도 흐름은 이어간다 — 캐시가 받아준다
    }
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col">
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

      <div className="absolute inset-0 bg-black/30" />

      {/* Top header */}
      <div className="relative z-10 pt-4 px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#2F6EFF] animate-pulse" />
          <span className="text-white text-xl font-normal">동행온 · 병원 길안내</span>
        </div>
      </div>

      {/* Scan frame */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <div className="relative w-72 h-72">
          {[
            "top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl",
            "top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl",
            "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl",
            "bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl",
          ].map((cls, i) => (
            <div key={i} className={`absolute w-10 h-10 border-white ${cls}`} />
          ))}

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
              {scanning ? "읽는 중..." : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom panel */}
      <div className="relative z-10 pb-6 px-6 space-y-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
          <p className="text-white text-4xl leading-normal font-medium">
            <span className="text-[#2F6EFF]">접수증</span>을<br />
            찍으세요
          </p>
        </div>

        <motion.button
          onClick={handleShoot}
          disabled={scanning}
          className="w-full bg-[#2F6EFF] active:bg-[#1554D4] disabled:bg-slate-400 text-white rounded-2xl py-5 text-4xl font-medium transition-colors"
          whileTap={{ scale: 0.97 }}
        >
          {scanning ? "읽는 중..." : "촬영"}
        </motion.button>

        {/* 카메라가 막힌 환경(데스크톱 시연·권한 거부)을 위한 우회로 */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={scanning}
          className="w-full flex items-center justify-center gap-2 text-white/70 text-lg py-1 active:text-white disabled:opacity-40"
        >
          <ImageUp size={20} />
          사진에서 고르기
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
