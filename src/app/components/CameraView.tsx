import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Camera, ScanLine, ImageUp, AlertTriangle } from "lucide-react";
import type { ImagePayload } from "../lib/noticeTransform";
import { fileToImagePayload } from "../lib/noticeTransform";

interface CameraViewProps {
  /** 접수증 사진. null 이면 카메라를 쓸 수 없었다는 뜻 */
  onScan: (image: ImagePayload | null) => void;
  /**
   * 사진이 **반드시** 있어야 하는지.
   *
   * 실제 인식 모드에서는 사진이 없으면 아무것도 못 하므로 true.
   * 시연 모드에서는 저장된 안내를 쓰기 때문에 사진이 없어도 진행해야 한다 —
   * 심사위원이 카메라 권한을 거부해도 시연이 막히면 안 된다.
   */
  requirePhoto: boolean;
}

/** 업로드 용량과 인식률의 절충점. 너무 크면 토큰만 먹고 정확도는 안 오른다 */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;

type CamState = "starting" | "live" | "blocked";

export function CameraView({ onScan, requirePhoto }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cam, setCam] = useState<CamState>("starting");
  const [scanning, setScanning] = useState(false);

  /**
   * 카메라를 켠다.
   *
   * 제약을 크게 걸면 기기에 따라 통째로 거절당한다. 뒷면 카메라를 먼저 요청하고,
   * 실패하면 아무 카메라나 다시 요청한다. 두 번 다 실패해야 '못 씀'으로 본다.
   */
  const startCamera = async () => {
    setCam("starting");
    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: "environment" } } },
      { video: true },
    ];

    for (const constraints of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((t) => t.stop());
          continue;
        }
        video.srcObject = stream;
        // play() 는 거절될 수 있다. 삼키면 "왜 화면이 까맣지"가 된다.
        await video.play().catch(() => {});
        setCam("live");
        return;
      } catch {
        /* 다음 조건으로 재시도 */
      }
    }
    setCam("blocked");
  };

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCam("blocked");
      return;
    }
    void startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const image = captureFrame();
    // 실제 인식 모드에서 프레임을 못 잡았으면 촬영이 안 된 것이다.
    // 조용히 넘어가면 엉뚱한 안내가 뜨므로 여기서 멈추고 다시 시도하게 한다.
    if (!image && requirePhoto) {
      setCam("blocked");
      return;
    }
    setScanning(true);
    setTimeout(() => onScan(image), 400);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file || scanning) return;
    setScanning(true);
    try {
      onScan(await fileToImagePayload(file));
    } catch {
      setScanning(false);
      setCam("blocked");
    }
  };

  // 시연 모드는 사진이 없어도 진행한다 — 카메라 권한이 없어도 시연은 돌아가야 한다
  const canShoot = !scanning && (cam === "live" || !requirePhoto);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col">
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover ${cam === "live" ? "" : "invisible"}`}
        autoPlay
        muted
        playsInline
      />
      {cam !== "live" && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#2d2d2d] to-black flex items-center justify-center">
          <Camera className="text-[#8A7E7A]" size={72} />
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
      <div className="relative z-10 flex-1 flex items-center justify-center px-6">
        {cam === "blocked" && requirePhoto ? (
          // 카메라를 못 쓰는 상황을 분명히 알린다. 예전에는 아무 말 없이 검은 화면만
          // 보여줘서, 촬영을 눌러도 아무 일이 없는 이유를 알 수 없었다.
          <div className="bg-black/55 backdrop-blur-sm rounded-3xl p-7 text-center max-w-[20rem]">
            <AlertTriangle size={44} className="text-amber-400 mx-auto mb-4" />
            <p className="text-white text-2xl font-bold leading-snug break-keep">
              카메라를 열 수 없어요
            </p>
            <p className="text-white/75 text-lg mt-3 leading-relaxed break-keep">
              카메라 사용을 허용해 주시거나,
              <br />
              아래에서 앨범 사진을 골라주세요
            </p>
            <button
              onClick={() => void startCamera()}
              className="mt-5 w-full rounded-2xl bg-white/20 active:bg-white/30 text-white text-xl font-bold py-3 transition-colors"
            >
              카메라 다시 켜기
            </button>
          </div>
        ) : (
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
        )}
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
          disabled={!canShoot}
          className="w-full bg-[#2F6EFF] active:bg-[#1554D4] disabled:bg-slate-500/70 text-white rounded-2xl py-5 text-4xl font-medium transition-colors"
          whileTap={canShoot ? { scale: 0.97 } : undefined}
        >
          {scanning ? "읽는 중..." : cam === "starting" && requirePhoto ? "카메라 켜는 중..." : "촬영"}
        </motion.button>

        {/* 카메라가 막힌 환경(데스크톱·권한 거부)을 위한 우회로 */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={scanning}
          className="w-full flex items-center justify-center gap-2 text-white/75 text-lg py-1 active:text-white disabled:opacity-40"
        >
          <ImageUp size={20} />
          앨범에서 고르기
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          /* capture 속성을 두면 폰에서 앨범 대신 카메라가 열린다.
             촬영은 위의 [촬영] 버튼이 맡고, 여기는 앨범에서 고르는 길이다. */
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
