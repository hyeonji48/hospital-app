import { useEffect, useRef, useState } from "react";
import type React from "react";
import { Plus, Minus } from "lucide-react";
import { NavStep } from "../types";

// ─── 도면 데이터 ─────────────────────────────────────────────
// 가상 병원 하드코딩을 걷어내고 부천성모 성모관 실제 배치를 쓴다.
// 좌표는 아직 가배치이며, 답사 후 floorPlan.ts 만 고치면 여기는 안 바뀐다.

import { FLOORS, FLOOR_LABELS, WAYPOINTS, LINKS, type Room } from "../data/floorPlan";

function getFloorRooms(floor: number): Room[] {
  // 없는 층을 요청받으면 빈 도면을 돌려준다. 예전 코드처럼 엉뚱한 층을
  // 그려주는 것보다 아무것도 안 그리는 편이 디버깅 가능하다.
  return FLOORS[floor] ?? [];
}

function getFloorLabel(floor: number): string {
  return FLOOR_LABELS[floor] ?? `${floor}층`;
}

/** 통로를 실선으로 그리기 위한 선분 목록 */
function getCorridorSegments(floor: number): Array<[number, number, number, number]> {
  const wps = new Map((WAYPOINTS[floor] ?? []).map((w) => [w.id, w]));
  const out: Array<[number, number, number, number]> = [];
  for (const [a, b] of LINKS[floor] ?? []) {
    const na = wps.get(a);
    const nb = wps.get(b);
    if (na && nb) out.push([na.x, na.y, nb.x, nb.y]);
  }
  return out;
}

// ─── Main component ──────────────────────────────────────────
interface Props {
  step: NavStep;
  fullScreen?: boolean;
}

export function HospitalFloorMap({ step, fullScreen = false }: Props) {
  const pathRef = useRef<SVGPathElement>(null);

  const rooms = getFloorRooms(step.floor);
  const corridorSegments = getCorridorSegments(step.floor);
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

  // 수동 확대 배율과 손으로 민 이동량. 단계가 바뀌면 원위치로 돌아간다.
  const [zoomMultiplier, setZoomMultiplier] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setZoomMultiplier(1.0);
    setPan({ x: 0, y: 0 });
  }, [step]);

  // 지도를 손으로 밀어서 볼 수 있게 한다.
  // 자동 확대가 현재위치와 목적지에만 맞춰지다 보니 주변이 화면 밖으로 나간다.
  // 어르신이 "여기가 어디쯤인지" 확인하려면 둘러볼 수 있어야 한다.
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const start = dragRef.current;
    if (!start) return;
    // 화면 픽셀 → SVG 좌표로 환산해야 손가락과 지도가 같이 움직인다
    const rect = e.currentTarget.getBoundingClientRect();
    const kx = rect.width ? (fullScreen ? 600 : 240) / rect.width : 1;
    const ky = rect.height ? (fullScreen ? 900 : 360) / rect.height : 1;
    setPan((prev) => ({
      x: prev.x + (e.clientX - start.x) * kx,
      y: prev.y + (e.clientY - start.y) * ky,
    }));
    dragRef.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  // 2. Active GPS Translation, Rotation, and Dynamic Zoom scaling
  const rad = (rotationAngle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const destDx = step.destPos[0] - ux;
  const destDy = step.destPos[1] - uy;
  const rx = destDx * cos - destDy * sin;
  const ry = destDx * sin + destDy * cos;

  // Include padding around the points
  const pad = 15;
  const minRx = Math.min(0, rx) - pad;
  const maxRx = Math.max(0, rx) + pad;
  const minRy = Math.min(0, ry) - pad;
  const maxRy = Math.max(0, ry) + pad;

  // Screen layout configuration:
  const vw = fullScreen ? 600 : 240;
  const vh = fullScreen ? 900 : 360;
  // 현재위치를 화면 정중앙에 고정하지 않는다.
  // 고정하면 진행 방향 쪽 여백만 쓰게 되어 지도가 필요 이상으로 작아진다.
  // 현재위치와 목적지의 가운데를 화면 중앙에 두면 같은 화면에 더 크게 담긴다.
  const midRx = (Math.min(0, rx) + Math.max(0, rx)) / 2;
  const midRy = (Math.min(0, ry) + Math.max(0, ry)) / 2;

  const tx = vw / 2 + pan.x;
  const ty = (fullScreen ? vh * 0.52 : vh * 0.55) + pan.y;

  let maxAllowedScale = fullScreen ? 6.0 : 3.2;
  const minAllowedScale = fullScreen ? 0.8 : 0.5;

  // 여백을 줄여 지도를 더 크게 — 12번 피드백("너무 작아 보임")
  const halfW = vw / 2 - 14;
  const topBudget = vh * 0.5 - 20;
  const bottomBudget = vh * 0.5 - 20;

  if (minRx < 0) {
    const sVal = -halfW / minRx;
    if (sVal < maxAllowedScale) maxAllowedScale = sVal;
  }
  if (maxRx > 0) {
    const sVal = halfW / maxRx;
    if (sVal < maxAllowedScale) maxAllowedScale = sVal;
  }
  if (minRy < 0) {
    const sVal = -topBudget / minRy;
    if (sVal < maxAllowedScale) maxAllowedScale = sVal;
  }
  if (maxRy > 0) {
    const sVal = bottomBudget / maxRy;
    if (sVal < maxAllowedScale) maxAllowedScale = sVal;
  }

  // 구간이 짧으면 자동 맞춤 배율이 과하게 올라가 주변 방 이름이 다 잘린다.
  // "적어도 도면의 이만큼은 보이게" 라는 상한을 따로 둔다 —
  // 어르신이 현재 위치를 주변 지형지물과 함께 파악할 수 있어야 하기 때문.
  const MIN_VISIBLE_SPAN = 165;
  const spanCap = vw / MIN_VISIBLE_SPAN;

  // Base optimal fit scale
  const baseScale = Math.min(spanCap, Math.max(minAllowedScale, maxAllowedScale));

  // Apply manual zoom multiplier
  const scale = baseScale * zoomMultiplier;
  // 현재위치·목적지의 중점을 화면 중앙으로 끌어오는 보정
  const centerShiftX = -midRx * scale;
  const centerShiftY = -midRy * scale;

  const navTransform = `translate(${tx + centerShiftX}, ${ty + centerShiftY}) scale(${scale}) rotate(${rotationAngle}) translate(${-ux}, ${-uy})`;

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
    <div className={`w-full rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col select-none animate-[fadeIn_0.3s_ease-out] ${fullScreen ? 'h-full' : ''}`}>
      {/* Floor banner */}
      <div className="bg-[#2F6EFF] text-white px-4 py-2.5 flex items-center justify-between shrink-0">
        <span className="text-base font-medium">🗺️ {floorLabel}</span>
        <span className="bg-white/20 rounded-lg px-2.5 py-0.5 text-sm font-bold">{step.floor}F</span>
      </div>

      {/* Location / Destination Guide Bar */}
      <div className="bg-[#EAF0FF] border-b border-[#D5E4FF]/40 py-2.5 px-4 flex items-center justify-center gap-7 shrink-0 select-none">
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 rounded-full bg-[#2F6EFF] border-2 border-white shadow-sm flex-shrink-0" />
          <span className="text-slate-700 text-base font-bold">현재 위치</span>
        </div>
        <span className="text-slate-300 font-light select-none">|</span>
        {/* 회전 화면에서는 목적지 대신 "여기서 도세요"를 안내한다 */}
        <div className="flex items-center gap-2.5">
          {step.turnAt ? (
            <>
              <span className="w-4 h-4 rounded-full bg-[#F59E0B] border border-white shadow-sm flex items-center justify-center flex-shrink-0 text-[9px] text-white font-extrabold select-none">
                ➜
              </span>
              <span className="text-slate-900 text-base font-extrabold">
                {step.turnDir === "left" ? "왼쪽으로" : "오른쪽으로"}
              </span>
            </>
          ) : (
            <>
              <span className="w-4 h-4 rounded-full bg-[#DC2626] border border-white shadow-sm flex items-center justify-center flex-shrink-0 text-[8px] text-white font-extrabold select-none">★</span>
              <span className="text-slate-900 text-base font-extrabold">목적지</span>
            </>
          )}
        </div>
      </div>

      <div className="p-2 bg-[#F8F9FC] flex-1 flex items-center justify-center overflow-hidden min-h-0">
        <svg
          viewBox={`0 0 ${vw} ${vh}`}
          className={
            (fullScreen ? "w-full h-full" : "w-full h-[390px] max-sm:h-[42vh]") +
            " touch-none cursor-grab active:cursor-grabbing"
          }
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Group that undergoes navigation transform (rotation, panning, zooming) */}
          <g transform={navTransform}>
            {/* Background */}
            <rect x="0" y="0" width="360" height="240" fill="#F8F9FC" rx="6" />
            {/* Building outer wall */}
            <rect x="2" y="2" width="356" height="236" fill="#ffffff" stroke="#D1D5E8" strokeWidth="2" rx="5" />

            {/* 통로 — 실제 평면도의 이동 가능한 선 */}
            {corridorSegments.map(([x1, y1, x2, y2], i) => (
              <line
                key={`corr-${i}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#E0E3F0" strokeWidth="9" strokeLinecap="round"
              />
            ))}

            {/* Rooms */}
            {rooms.map((room, i) => {
              const isTarget = step.targetRoom === room.label;
              let fill = "#ffffff";
              let stroke = "#D1D5E8";
              let strokeW = 0.8;

              if (isTarget)                      { fill = "#EAF0FF"; stroke = "#2F6EFF"; strokeW = 2; }
              else if (room.kind === "elevator") { fill = "#FFFBEB"; stroke = "#FCD34D"; }
              else if (room.kind === "stairs")   { fill = "#F0FDF4"; stroke = "#86EFAC"; }
              else if (room.kind === "desk")     { fill = "#FFF1F2"; stroke = "#FDA4AF"; }
              else if (room.kind === "waiting")  { fill = "#F9FAFB"; stroke = "#D1D5DB"; }
              else if (room.kind === "entrance") { fill = "#F5F3FF"; stroke = "#C4B5FD"; }
              else if (room.kind === "facility") { fill = "#FFF5F5"; stroke = "#FCA5A5"; }

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
                      fill={isTarget ? "#1E3A8A" : room.kind === "elevator" ? "#92400E" : room.kind === "desk" ? "#BE123C" : "#0F172A"}>
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
                      y={room.y + room.h - 2}
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

            {/* 회전 표시 — "왼쪽으로 도세요"만으로는 어느 쪽이 왼쪽인지 헷갈린다.
                꺾는 자리에 꺾은 뒤 갈 방향을 주황 화살표로 그린다.
                파란 경로선과 다른 색이라 "여기서 이 방향" 이 한눈에 보인다. */}
            {step.turnAt && step.turnHeading && (
              <g
                transform={`translate(${step.turnAt[0]},${step.turnAt[1]}) rotate(${
                  (Math.atan2(step.turnHeading[1], step.turnHeading[0]) * 180) / Math.PI
                })`}
              >
                <circle r="11" fill="#F59E0B" opacity="0.18">
                  <animate attributeName="r" values="9;14;9" dur="1.4s" repeatCount="indefinite" />
                </circle>
                {/* 오른쪽(+x)을 향하는 화살표. 위 rotate 로 실제 방향에 맞춘다 */}
                <path
                  d="M -2 0 L 9 0 M 4 -4.5 L 9 0 L 4 4.5"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M -2 0 L 9 0 M 4 -4.5 L 9 0 L 4 4.5"
                  fill="none"
                  stroke="white"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            )}

            {/* Destination marker - Counter-rotated so the star stays upright! */}
            {step.pathPoints.length > 0 && !step.turnAt && (
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
