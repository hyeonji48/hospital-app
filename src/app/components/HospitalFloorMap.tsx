import { useEffect, useRef, useState } from "react";
import { Plus, Minus } from "lucide-react";
import { NavStep } from "../types";

// ─── Room type ───────────────────────────────────────────────
interface Room {
  x: number; y: number; w: number; h: number;
  label: string; sub?: string;
  isElevator?: boolean; isStairs?: boolean; isNurse?: boolean;
  isWaiting?: boolean; isLobby?: boolean; isToilet?: boolean;
  isSpecial?: boolean; isUrgent?: boolean;
}

// ─── Floor definitions ───────────────────────────────────────
const FLOOR_1_ROOMS: Room[] = [
  // Top row (north)
  { x:5,   y:5,  w:88, h:86, label:"약국",        sub:"💊 처방전" },
  { x:98,  y:5,  w:78, h:86, label:"처방전접수",   sub:"📋" },
  { x:181, y:5,  w:68, h:86, label:"안내데스크",   sub:"ℹ️" },
  { x:254, y:5,  w:52, h:86, label:"원무과",       sub:"📝" },
  { x:311, y:5,  w:44, h:86, label:"화장실",       sub:"🚻", isToilet: true },
  // Bottom row (south)
  { x:5,   y:116, w:178, h:119, label:"1층 대기 로비", sub:"💺", isLobby: true },
  { x:188, y:116, w:68,  h:57,  label:"편의점",        sub:"🛒", isSpecial: true },
  { x:261, y:116, w:94,  h:57,  label:"커피숍",        sub:"☕", isSpecial: true },
  { x:188, y:177, w:48,  h:58,  label:"엘리베이터",    sub:"🛗", isElevator: true },
  { x:241, y:177, w:40,  h:58,  label:"계단",          sub:"🚶", isStairs: true },
  { x:286, y:177, w:69,  h:58,  label:"응급센터",      sub:"🚨", isUrgent: true },
];

const FLOOR_2_ROOMS: Room[] = [
  // Top row
  { x:5,   y:5, w:45, h:91, label:"엘리베이터", sub:"🛗", isElevator: true },
  { x:55,  y:5, w:35, h:91, label:"계단",       sub:"🚶", isStairs: true },
  { x:95,  y:5, w:65, h:91, label:"간호사실",   sub:"👩‍⚕️",  isNurse: true },
  { x:165, y:5, w:48, h:91, label:"201",        sub:"재활의학과" },
  { x:218, y:5, w:48, h:91, label:"203",        sub:"정형외과" },
  { x:271, y:5, w:48, h:91, label:"205",        sub:"김멋사 교수" },
  { x:324, y:5, w:31, h:91, label:"207",        sub:"정형외과" },
  // Bottom row
  { x:5,   y:124, w:85,  h:111, label:"대기실",   sub:"💺", isWaiting: true },
  { x:95,  y:124, w:65,  h:111, label:"처치실",   sub:"🩺" },
  { x:165, y:124, w:48,  h:111, label:"202",      sub:"재활의학과" },
  { x:218, y:124, w:48,  h:111, label:"204",      sub:"정형외과" },
  { x:271, y:124, w:48,  h:111, label:"206",      sub:"정형외과" },
  { x:324, y:124, w:31,  h:111, label:"208",      sub:"정형외과" },
];

const FLOOR_3_ROOMS: Room[] = [
  // Top row
  { x:5,   y:5, w:45, h:91, label:"엘리베이터", sub:"🛗", isElevator: true },
  { x:55,  y:5, w:35, h:91, label:"계단",       sub:"🚶", isStairs: true },
  { x:95,  y:5, w:65, h:91, label:"간호사실",   sub:"👩‍⚕️",  isNurse: true },
  { x:165, y:5, w:48, h:91, label:"308",        sub:"신경외과" },
  { x:218, y:5, w:48, h:91, label:"310",        sub:"신경외과" },
  { x:271, y:5, w:48, h:91, label:"312",        sub:"김멋사 교수" },
  { x:324, y:5, w:31, h:91, label:"314",        sub:"신경외과" },
  // Bottom row
  { x:5,   y:124, w:85,  h:111, label:"대기실",   sub:"💺", isWaiting: true },
  { x:95,  y:124, w:65,  h:111, label:"처치실",   sub:"🩺" },
  { x:165, y:124, w:48,  h:111, label:"307",      sub:"신경외과" },
  { x:218, y:124, w:48,  h:111, label:"309",      sub:"내과" },
  { x:271, y:124, w:48,  h:111, label:"311",      sub:"신경외과" },
  { x:324, y:124, w:31,  h:111, label:"313",      sub:"신경외과" },
];

const FLOOR_4_ROOMS: Room[] = [
  // Top row
  { x:5,   y:5, w:45, h:91, label:"엘리베이터", sub:"🛗", isElevator: true },
  { x:55,  y:5, w:35, h:91, label:"계단",       sub:"🚶", isStairs: true },
  { x:95,  y:5, w:65, h:91, label:"간호사실",   sub:"👩‍⚕️",  isNurse: true },
  { x:165, y:5, w:95, h:91, label:"CT 대기실",  sub:"💺 번호대기", isWaiting: true },
  { x:265, y:5, w:90, h:91, label:"MRI실",      sub:"🔬 MRI 촬영" },
  // Bottom row
  { x:5,   y:124, w:90,  h:111, label:"대기실",    sub:"💺", isWaiting: true },
  { x:100, y:124, w:65,  h:111, label:"판독실",    sub:"🔍" },
  { x:170, y:124, w:90,  h:111, label:"CT실",      sub:"CT 촬영" },
  { x:265, y:124, w:90,  h:111, label:"엑스레이실", sub:"X-Ray" },
];

function getFloorRooms(floor: number): Room[] {
  if (floor === 1) return FLOOR_1_ROOMS;
  if (floor === 2) return FLOOR_2_ROOMS;
  if (floor === 3) return FLOOR_3_ROOMS;
  return FLOOR_4_ROOMS;
}

function getFloorLabel(floor: number): string {
  if (floor === 1) return "1층 외래·로비";
  if (floor === 2) return "2층 정형외과";
  if (floor === 3) return "3층 신경외과";
  return "4층 영상의학과";
}

// Corridor definition per floor
function getCorridorY(floor: number): { y: number; h: number } {
  return floor === 1 ? { y: 94, h: 18 } : { y: 100, h: 20 };
}

// ─── Main component ──────────────────────────────────────────
interface Props {
  step: NavStep;
}

export function HospitalFloorMap({ step }: Props) {
  const pathRef = useRef<SVGPathElement>(null);

  const rooms = getFloorRooms(step.floor);
  const { y: corridorY, h: corridorH } = getCorridorY(step.floor);
  const floorLabel = getFloorLabel(step.floor);

  const pathD =
    step.pathPoints.length > 1
      ? step.pathPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ")
      : "";

  // 1. Calculate heading direction angle to make map auto-rotate forward (straight UP)
  let angleDegrees = 0;
  if (step.pathPoints.length >= 2) {
    const p0 = step.pathPoints[0];
    const p1 = step.pathPoints[1];
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    angleDegrees = Math.atan2(dy, dx) * (180 / Math.PI);
  } else {
    const dx = step.destPos[0] - step.userPos[0];
    const dy = step.destPos[1] - step.userPos[1];
    angleDegrees = Math.atan2(dy, dx) * (180 / Math.PI);
  }

  // To make heading point straight UP (-90 deg):
  const rotationAngle = -90 - angleDegrees;
  const ux = step.userPos[0];
  const uy = step.userPos[1];

  // Manual zoom multiplier state (resets back to 1.0 when step changes)
  const [zoomMultiplier, setZoomMultiplier] = useState(1.0);

  useEffect(() => {
    setZoomMultiplier(1.0);
  }, [step]);

  // 2. Active GPS Translation, Rotation, and Dynamic Zoom scaling
  // We want to fit the User position and the Destination position in the rotated coordinate space
  // so they are BOTH guaranteed to be fully visible in the 240x360 viewport, zoomed in as much as possible!
  const rad = (rotationAngle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const destDx = step.destPos[0] - ux;
  const destDy = step.destPos[1] - uy;
  const rx = destDx * cos - destDy * sin;
  const ry = destDx * sin + destDy * cos;

  // We only fit the User (0, 0) and the Destination (rx, ry)
  // Include 15px padding around the points to make sure markers aren't clipped at edges
  const pad = 15;
  const minRx = Math.min(0, rx) - pad;
  const maxRx = Math.max(0, rx) + pad;
  const minRy = Math.min(0, ry) - pad;
  const maxRy = Math.max(0, ry) + pad;

  // Screen layout configuration:
  const tx = 120; // Center X of portrait viewBox (width = 240)
  const ty = 330; // Bottom Y of portrait viewBox (height = 360) for forward sight view

  // We want to fit all points within:
  // X: [15, 225] (15px margin from edges -> 105px from center 120)
  // Y: [50, 355] (50px margin from top -> 280px from ty 330, 5px margin from bottom -> 25px from ty 330)
  let maxAllowedScale = 2.0; // Higher default zoom ceiling
  const minAllowedScale = 0.35; // Lower floor to fit extremely far destinations

  if (minRx < 0) {
    const sVal = -105 / minRx;
    if (sVal < maxAllowedScale) maxAllowedScale = sVal;
  }
  if (maxRx > 0) {
    const sVal = 105 / maxRx;
    if (sVal < maxAllowedScale) maxAllowedScale = sVal;
  }
  if (minRy < 0) {
    const sVal = -280 / minRy; // 280px budget to top margin (y = 50)
    if (sVal < maxAllowedScale) maxAllowedScale = sVal;
  }
  if (maxRy > 0) {
    const sVal = 25 / maxRy; // 25px budget to absolute bottom (y = 355)
    if (sVal < maxAllowedScale) maxAllowedScale = sVal;
  }

  // Base optimal fit scale
  const baseScale = Math.max(minAllowedScale, maxAllowedScale);

  // Apply manual zoom multiplier
  const scale = baseScale * zoomMultiplier;

  const navTransform = `translate(${tx}, ${ty}) scale(${scale}) rotate(${rotationAngle}) translate(${-ux}, ${-uy})`;

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomMultiplier(prev => Math.min(2.5, prev + 0.15));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomMultiplier(prev => Math.max(0.5, prev - 0.15));
  };

  useEffect(() => {
    const el = pathRef.current;
    if (!el || !pathD) return;
    const len = el.getTotalLength();
    el.style.strokeDasharray = String(len);
    el.style.strokeDashoffset = String(len);
    el.animate(
      [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      { duration: 1000, fill: "forwards", easing: "ease-out" }
    );
  }, [step, pathD]);

  return (
    <div className="w-full rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col select-none animate-[fadeIn_0.3s_ease-out]">
      {/* Floor banner */}
      <div className="bg-[#2F6EFF] text-white px-4 py-2.5 flex items-center justify-between shrink-0">
        <span className="text-base font-medium">🗺️ {floorLabel}</span>
        <span className="bg-white/20 rounded-lg px-2.5 py-0.5 text-sm font-bold">{step.floor}층</span>
      </div>

      {/* Location / Destination Guide Bar */}
      <div className="bg-[#EAF0FF] border-b border-[#D5E4FF]/40 py-2.5 px-4 flex items-center justify-center gap-7 shrink-0 select-none">
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 rounded-full bg-[#2F6EFF] border-2 border-white shadow-sm flex-shrink-0" />
          <span className="text-slate-700 text-base font-bold">현재 위치</span>
        </div>
        <span className="text-slate-300 font-light select-none">|</span>
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 rounded-full bg-[#DC2626] border border-white shadow-sm flex items-center justify-center flex-shrink-0 text-[8px] text-white font-extrabold select-none">★</span>
          <span className="text-slate-900 text-base font-extrabold">목적지</span>
        </div>
      </div>

      <div className="p-2 bg-[#F8F9FC] flex-1 flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 240 360" className="w-full h-[390px] max-sm:h-[42vh]">
          {/* Group that undergoes navigation transform (rotation, panning, zooming) */}
          <g transform={navTransform}>
            {/* Background */}
            <rect x="0" y="0" width="360" height="240" fill="#F8F9FC" rx="6" />
            {/* Building outer wall */}
            <rect x="2" y="2" width="356" height="236" fill="#ffffff" stroke="#D1D5E8" strokeWidth="2" rx="5" />

            {/* Corridor */}
            <rect x={2} y={corridorY} width={356} height={corridorH} fill="#EBEcF4" stroke="#E0E3F0" strokeWidth="0.5" />
            <text x="180" y={corridorY + corridorH / 2 + 4} textAnchor="middle" fontSize="9" fill="#8A94CD" letterSpacing="4">
              — — — 복도 — — —
            </text>

            {/* Rooms */}
            {rooms.map((room, i) => {
              const isTarget = step.targetRoom === room.label;
              let fill = "#ffffff";
              let stroke = "#D1D5E8";
              let strokeW = 0.8;

              if (isTarget)          { fill = "#EAF0FF"; stroke = "#2F6EFF"; strokeW = 2; }
              else if (room.isElevator) { fill = "#FFFBEB"; stroke = "#FCD34D"; }
              else if (room.isStairs)   { fill = "#F0FDF4"; stroke = "#86EFAC"; }
              else if (room.isNurse)    { fill = "#FFF1F2"; stroke = "#FDA4AF"; }
              else if (room.isWaiting || room.isLobby) { fill = "#F9FAFB"; stroke = "#D1D5DB"; }
              else if (room.isToilet)   { fill = "#F5F3FF"; stroke = "#C4B5FD"; }
              else if (room.isUrgent)   { fill = "#FFF5F5"; stroke = "#FCA5A5"; }
              else if (room.isSpecial)  { fill = "#FEFCE8"; stroke = "#FDE68A"; }

              const cx = room.x + room.w / 2;
              const cy = room.y + room.h / 2;
              const hasSubLabel = !!room.sub;

              // Distance to User Position
              const distToUser = Math.sqrt(Math.pow(cx - step.userPos[0], 2) + Math.pow(cy - step.userPos[1], 2));
              // Distance to Destination Position
              const distToDest = Math.sqrt(Math.pow(cx - step.destPos[0], 2) + Math.pow(cy - step.destPos[1], 2));

              const isNearUserOrDest = distToUser < 70 || distToDest < 70 || isTarget;

              // Calculate basic desired font sizes based on proximity
              let desiredMainSize = 12.5; // default size for '그 외는 조금 더 키워줘' (increased from 10.5)
              let desiredSubSize = 9.5;

              if (isTarget) {
                desiredMainSize = 15.5; // Destination room is extra large!
                desiredSubSize = 11;
              } else if (isNearUserOrDest) {
                desiredMainSize = 14; // Rooms near user/dest are very large!
                desiredSubSize = 10;
              }

              // Calculate safe limits to prevent room box overflows!
              // Each bold Korean character takes approx 0.82 * fontSize width. Leave 4px safety padding.
              const charFactor = 0.82;
              const maxMainFontSize = (room.w - 4) / (room.label.length * charFactor);
              const textFontSize = String(Math.max(9, Math.min(desiredMainSize, maxMainFontSize)));

              let subFontSize = String(desiredSubSize);
              if (room.sub) {
                const maxSubFontSize = (room.w - 4) / (room.sub.length * charFactor);
                subFontSize = String(Math.max(8, Math.min(desiredSubSize, maxSubFontSize)));
              }

              return (
                <g key={i}>
                  <rect x={room.x} y={room.y} width={room.w} height={room.h}
                    fill={fill} stroke={stroke} strokeWidth={strokeW} rx="2" />
                  {isTarget && (
                    <rect x={room.x+2} y={room.y+2} width={room.w-4} height={room.h-4}
                      fill="none" stroke="#2F6EFF" strokeWidth="1" strokeDasharray="4,3" rx="1.5" />
                  )}
                  
                  {/* Group to counter-rotate text so it stays upright (horizontal) and boost contrast! */}
                  <g transform={`rotate(${-rotationAngle}, ${cx}, ${cy})`}>
                    <text x={cx} y={cy - (hasSubLabel ? (isTarget || isNearUserOrDest ? 9 : 8) : 0)} textAnchor="middle"
                      fontSize={textFontSize}
                      fontWeight="bold"
                      fill={isTarget ? "#1E3A8A" : (room.isElevator ? "#92400E" : room.isNurse ? "#BE123C" : "#0F172A")}>
                      {room.label}
                    </text>
                    {hasSubLabel && (
                      <text x={cx} y={cy + (isTarget || isNearUserOrDest ? 9 : 8)} textAnchor="middle"
                        fontSize={subFontSize}
                        fontWeight="bold"
                        fill={isTarget ? "#2F6EFF" : "#475569"}>
                        {room.sub}
                      </text>
                    )}
                  </g>

                  {/* Door mark on target room */}
                  {isTarget && (
                    <rect
                      x={room.x + room.w / 2 - 5}
                      y={step.floor === 1 ? room.y + room.h - 2 : room.y + room.h - 2}
                      width={10} height={4}
                      fill="#2F6EFF" rx="1"
                    />
                  )}
                </g>
              );
            })}

            {/* Navigation path */}
            {pathD && (
              <path ref={pathRef} d={pathD} fill="none"
                stroke="#2F6EFF" strokeWidth="3.5" strokeLinecap="round"
                strokeLinejoin="round" strokeDasharray="7,5" opacity="0.85" />
            )}

            {/* Direction arrows along path */}
            {step.pathPoints.length >= 2 && step.pathPoints.slice(1).map(([x, y], i) => {
              const prev = step.pathPoints[i];
              const dx = x - prev[0];
              const dy = y - prev[1];
              if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return null;
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              const mx = (prev[0] + x) / 2;
              const my = (prev[1] + y) / 2;
              return (
                <polygon key={i}
                  points="-6,5 6,5 0,-8"
                  transform={`translate(${mx},${my}) rotate(${angle + 90})`}
                  fill="#2F6EFF" opacity="0.95" />
              );
            })}

            {/* User position — pulsing dot */}
            <g>
              <circle cx={step.userPos[0]} cy={step.userPos[1]} r="12" fill="#2F6EFF" opacity="0.12">
                <animate attributeName="r" values="8;16;8" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.15;0.04;0.15" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <circle cx={step.userPos[0]} cy={step.userPos[1]} r="6.5" fill="#2F6EFF" stroke="white" strokeWidth="2" />
              <circle cx={step.userPos[0]} cy={step.userPos[1]} r="2.5" fill="white" />
            </g>

            {/* Destination marker - Counter-rotated so the star stays upright! */}
            {step.pathPoints.length > 0 && (
              <g transform={`translate(${step.destPos[0]},${step.destPos[1]}) rotate(${-rotationAngle})`}>
                <circle cy="0" r="9.5" fill="#DC2626" stroke="white" strokeWidth="2" className="shadow-sm">
                  <animate attributeName="r" values="7.5;11.5;7.5" dur="1.4s" repeatCount="indefinite" />
                </circle>
                <text y="3" textAnchor="middle" fontSize="10.5" fill="white" fontWeight="bold">★</text>
              </g>
            )}
          </g>

        </svg>

        {/* Floating Zoom Controls specifically for the Map */}
        <div className="absolute right-4 bottom-32 flex flex-col gap-2.5 z-10">
          <button
            onClick={handleZoomIn}
            className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-md flex items-center justify-center text-[#2F6EFF] active:bg-[#F2F4F7] active:scale-95 transition-all"
            title="지도 크게보기"
          >
            <Plus size={24} strokeWidth={3} />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-500 active:bg-[#F2F4F7] active:scale-95 transition-all"
            title="지도 작게보기"
          >
            <Minus size={24} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
}
