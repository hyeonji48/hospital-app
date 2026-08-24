// 경로 계산 엔진 — 결정론적. AI가 아니다.
//
// 브리핑 §5의 원칙: "경로는 결정론적으로, 말은 LLM으로."
// LLM은 어느 장소로 가야 하는지만 말하고, 어떻게 가는지는 여기서 계산한다.
//
// ── 그래프 구성 ──────────────────────────────────────────────
// 도면(floorPlan.ts)에서 노드와 간선을 **자동 생성**한다. 손으로 적는 그래프는
// 도면이 바뀔 때마다 어긋나기 때문이다. 방은 복도의 한 점에 붙고, 복도 노드끼리
// x좌표 순으로 이어진다.
//
//   [방] --10걸음-- [복도점] --비례계산-- [복도점] --10걸음-- [방]
//                       |
//                  (엘리베이터/계단: 층간)
//
// 실측이 필요한 값은 floorPlan.ts 하단에 모아뒀다.

import {
  FLOORS,
  WAYPOINTS,
  LINKS,
  ROOM_ATTACH_COST,
  ELEVATOR_BASE_COST,
  ELEVATOR_PER_FLOOR,
  STAIRS_PER_FLOOR,
  type Room,
} from "../data/floorPlan";
import type { NavStep, DirIcon } from "../types";

export interface GraphNode {
  id: string;
  floor: number;
  x: number;
  y: number;
  kind: "room" | "corridor";
  label?: string;
  vertical?: "elevator" | "stairs";
}

export interface GraphEdge {
  from: string;
  to: string;
  /** 가중치. 평면도 좌표 단위 — 도면이 축척이라 비교에 그대로 쓸 수 있다 */
  cost: number;
  mode: "walk" | "elevator" | "stairs";
  /** 휠체어·보행보조기 이용 가능 여부. 계단만 false */
  accessible: boolean;
}

export interface Graph {
  nodes: Map<string, GraphNode>;
  adj: Map<string, GraphEdge[]>;
  /** placeId → 노드 id. 여러 placeId가 같은 구역을 가리킬 수 있다 */
  byPlace: Map<string, string>;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** 방이 통로에 붙는 지점 = 방 중심 */
function roomCenter(r: Room): { x: number; y: number } {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

export function buildGraph(): Graph {
  const nodes = new Map<string, GraphNode>();
  const adj = new Map<string, GraphEdge[]>();
  const byPlace = new Map<string, string>();

  const link = (a: string, b: string, cost: number, mode: GraphEdge["mode"]) => {
    const accessible = mode !== "stairs";
    const c = Math.max(1, Math.round(cost));
    for (const [from, to] of [[a, b], [b, a]]) {
      if (!adj.has(from)) adj.set(from, []);
      adj.get(from)!.push({ from, to, cost: c, mode, accessible });
    }
  };

  // 층별 엘리베이터·계단 노드를 모아뒀다가 층간 연결에 쓴다
  const elevators: Record<number, string> = {};
  const stairs: Record<number, string> = {};

  for (const floorStr of Object.keys(FLOORS)) {
    const floor = Number(floorStr);

    // 1) 통로 지점
    for (const wp of WAYPOINTS[floor] ?? []) {
      nodes.set(wp.id, { id: wp.id, floor, x: wp.x, y: wp.y, kind: "corridor" });
    }
    // 2) 통로끼리 연결 — 비용은 도면상 실제 거리
    for (const [a, b] of LINKS[floor] ?? []) {
      const na = nodes.get(a);
      const nb = nodes.get(b);
      if (!na || !nb) {
        console.warn(`[router] 통로 연결 실패: ${a} ↔ ${b}`);
        continue;
      }
      link(a, b, dist(na, nb), "walk");
    }

    // 3) 방을 자기 통로 지점에 붙인다
    (FLOORS[floor] ?? []).forEach((room, i) => {
      const c = roomCenter(room);
      const roomId = `r:${floor}:${i}`;
      nodes.set(roomId, {
        id: roomId,
        floor,
        x: c.x,
        y: c.y,
        kind: "room",
        label: room.fullName ?? room.label,
        vertical:
          room.kind === "elevator" ? "elevator" : room.kind === "stairs" ? "stairs" : undefined,
      });

      const wp = nodes.get(room.attach);
      if (!wp) {
        console.warn(`[router] ${room.label}의 통로 지점 없음: ${room.attach}`);
        return;
      }
      link(roomId, room.attach, dist(c, wp) + ROOM_ATTACH_COST, "walk");

      for (const pid of room.placeIds ?? []) byPlace.set(pid, roomId);
      // 층마다 엘리베이터·계단은 하나씩만 대표로 잡는다 (같은 코어에 모여 있다)
      if (room.kind === "elevator" && !elevators[floor]) elevators[floor] = roomId;
      if (room.kind === "stairs" && !stairs[floor]) stairs[floor] = roomId;
    });
  }

  // 4) 층간 연결
  //    ★ 인접 층끼리만 잇던 예전 방식은 틀렸다. 엘리베이터는 하나의 통로라
  //    1층에서 4층으로 한 번에 간다. 모든 층 쌍을 직접 연결해야
  //    "1→2 타고 내려서 2→4 다시 타기" 같은 엉뚱한 안내가 안 나온다.
  const floors = Object.keys(FLOORS).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < floors.length; i++) {
    for (let j = i + 1; j < floors.length; j++) {
      const gap = Math.abs(floors[j] - floors[i]);
      const e1 = elevators[floors[i]];
      const e2 = elevators[floors[j]];
      if (e1 && e2) link(e1, e2, ELEVATOR_BASE_COST + ELEVATOR_PER_FLOOR * gap, "elevator");
      const s1 = stairs[floors[i]];
      const s2 = stairs[floors[j]];
      if (s1 && s2) link(s1, s2, STAIRS_PER_FLOOR * gap, "stairs");
    }
  }

  return { nodes, adj, byPlace };
}

/** 그래프는 순수 함수라 한 번만 만들면 된다 */
let cached: Graph | null = null;
export function graph(): Graph {
  if (!cached) cached = buildGraph();
  return cached;
}
/** 테스트·실측 반영 후 강제 재생성 */
export function resetGraph(): void {
  cached = null;
}

// ── 최단경로 (Dijkstra) ──────────────────────────────────────

export interface RouteOptions {
  /**
   * 계단 사용을 허용할지. **기본은 false(계단 제외)** 다.
   *
   * 걸음 수만 보면 계단이 엘리베이터보다 짧게 나오지만, 이 서비스의 대상은
   * 보호자 없이 내원한 고령 환자다. 짧다는 이유로 계단을 안내하면
   * 서비스의 존재 이유와 어긋난다. 계단은 명시적으로 켜야만 쓰인다.
   */
  allowStairs?: boolean;
}

export interface Route {
  nodeIds: string[];
  totalCost: number;
}

export function shortestPath(
  fromId: string,
  toId: string,
  opts: RouteOptions = {},
): Route | null {
  const g = graph();
  if (!g.nodes.has(fromId) || !g.nodes.has(toId)) return null;
  if (fromId === toId) return { nodeIds: [fromId], totalCost: 0 };

  const distMap = new Map<string, number>([[fromId, 0]]);
  const prev = new Map<string, string>();
  const visited = new Set<string>();

  // 노드가 60개 남짓이라 우선순위 큐 없이 선형 탐색으로 충분하다.
  while (true) {
    let cur: string | null = null;
    let best = Infinity;
    for (const [id, d] of distMap) {
      if (!visited.has(id) && d < best) {
        best = d;
        cur = id;
      }
    }
    if (cur === null) return null;
    if (cur === toId) break;
    visited.add(cur);

    for (const e of g.adj.get(cur) ?? []) {
      if (!opts.allowStairs && !e.accessible) continue;
      const nd = best + e.cost;
      if (nd < (distMap.get(e.to) ?? Infinity)) {
        distMap.set(e.to, nd);
        prev.set(e.to, cur);
      }
    }
  }

  const nodeIds: string[] = [];
  for (let at: string | undefined = toId; at; at = prev.get(at)) nodeIds.unshift(at);
  return { nodeIds, totalCost: distMap.get(toId) ?? 0 };
}

// ── 경로 → 화면용 NavStep[] ──────────────────────────────────

/**
 * 구간 전체의 이동 방향을 정한다.
 *
 * 첫 두 점만 보면 안 된다 — 방에서 복도로 나가는 첫 걸음은 항상 수직이라
 * "아래쪽으로 직진" 같은 엉뚱한 안내가 나온다. 복도가 가로 방향이므로
 * 구간 전체의 x 변화량을 우선 본다.
 */
// ── 한글 조사 ────────────────────────────────────────────────
// "엘리베이터으로" 같은 어색한 안내는 고령자에게 특히 거슬린다.

function jongseong(word: string): number {
  const ch = word.trim().slice(-1).charCodeAt(0);
  if (Number.isNaN(ch) || ch < 0xac00 || ch > 0xd7a3) return 0;
  return (ch - 0xac00) % 28;
}
/** 으로 / 로 — ㄹ 받침(8)은 "로" */
function particleRo(w: string): string {
  const j = jongseong(w);
  return j === 0 || j === 8 ? "로" : "으로";
}
/** 은 / 는 */
function particleEun(w: string): string {
  return jongseong(w) ? "은" : "는";
}
/** 이 / 가 */
function particleI(w: string): string {
  return jongseong(w) ? "이" : "가";
}

const DIR_WORD: Record<DirIcon, string> = {
  right: "오른쪽",
  left: "왼쪽",
  up: "앞쪽",
  down: "아래쪽",
  elevator: "엘리베이터",
};

// ── 회전 감지 ────────────────────────────────────────────────
//
// 예전에는 구간의 시작점과 끝점만 보고 방향 하나를 뽑았다. 그래서
// "엘리베이터에서 내려 왼쪽으로 가다가 진료협력센터에서 다시 왼쪽으로 꺾는" 경로가
// 그냥 "왼쪽으로 직진"이 되어 버렸다. 실제로 그렇게 가면 길을 잃는다.
//
// 이제 폴리라인의 꺾이는 지점을 찾아 회전마다 안내하고, 그 지점에서 가장 가까운
// 방을 랜드마크로 붙인다. 어르신은 "왼쪽"보다 "채혈실이 보이면"을 훨씬 잘 따라간다.

interface Leg {
  points: GraphNode[];
  /** 이 구간의 진행 방향 */
  dir: DirIcon;
  /** 이 구간이 시작되는 지점의 랜드마크 (첫 구간은 없음) */
  landmark?: string;
  /** 이전 진행 방향 기준 좌/우 회전 */
  turn?: "left" | "right";
}

function heading(a: GraphNode, b: GraphNode): { dx: number; dy: number } {
  return { dx: b.x - a.x, dy: b.y - a.y };
}

function dirOf(dx: number, dy: number): DirIcon {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
  return dy >= 0 ? "down" : "up";
}

/** 진행 방향이 얼마나 꺾였는지 (라디안). 부호로 좌/우를 구분 */
function turnAngle(
  prev: { dx: number; dy: number },
  next: { dx: number; dy: number },
): number {
  const cross = prev.dx * next.dy - prev.dy * next.dx;
  const dot = prev.dx * next.dx + prev.dy * next.dy;
  return Math.atan2(cross, dot);
}

/** 회전 지점에서 가장 가까운 방 이름 */
function nearestLandmark(
  pt: GraphNode,
  floor: number,
  exclude: Array<string | undefined> = [],
): string | undefined {
  const g = graph();
  let best: { label: string; d: number } | null = null;
  for (const n of g.nodes.values()) {
    if (n.floor !== floor || n.kind !== "room" || !n.label) continue;
    // 출발지·목적지를 랜드마크로 쓰면 "엘리베이터에서 내려 엘리베이터가 보이면" 같은 말이 된다
    if (exclude.includes(n.label)) continue;
    // 화장실 아이콘 등 이름이 기호인 방은 랜드마크로 부적절
    if (!/[가-힣]/.test(n.label)) continue;
    const d = Math.hypot(n.x - pt.x, n.y - pt.y);
    if (!best || d < best.d) best = { label: n.label, d };
  }
  // 너무 멀면 랜드마크로 쓸모가 없다
  return best && best.d < 60 ? best.label : undefined;
}

/** 유의미한 회전으로 볼 각도 (약 35°) */
const TURN_THRESHOLD = 0.6;

function splitIntoLegs(segment: GraphNode[], destLabel: string, origin?: string): Leg[] {
  // 거의 같은 지점이 연달아 오면 방향 계산이 흔들린다 — 먼저 정리
  const pts = segment.filter(
    (p, i) => i === 0 || Math.hypot(p.x - segment[i - 1].x, p.y - segment[i - 1].y) > 2,
  );
  if (pts.length < 2) return [];

  const floor = pts[0].floor;
  // 출발지만 제외한다. 목적지까지 빼면 "엘리베이터로 가세요" 구간에서
  // 정작 엘리베이터가 랜드마크 후보에서 빠져 "여기까지 왔어요" 같은 말이 나온다.
  const skip = [origin];
  void destLabel;

  // 1) 꺾이는 지점을 먼저 전부 찾는다
  const breaks: Array<{ at: number; turn: "left" | "right"; landmark?: string }> = [];
  for (let i = 1; i < pts.length - 1; i++) {
    const prevH = heading(pts[i - 1], pts[i]);
    const nextH = heading(pts[i], pts[i + 1]);
    const angle = turnAngle(prevH, nextH);
    if (Math.abs(angle) > TURN_THRESHOLD) {
      breaks.push({
        at: i,
        // SVG는 y축이 아래로 향하므로 화면상 좌회전은 cross < 0
        turn: angle < 0 ? "left" : "right",
        landmark: nearestLandmark(pts[i], floor, skip),
      });
    }
  }

  // 2) 그 지점들을 경계로 잘라 구간을 만든다
  const cuts = [0, ...breaks.map((b) => b.at), pts.length - 1];
  const legs: Leg[] = [];
  for (let k = 0; k < cuts.length - 1; k++) {
    const slice = pts.slice(cuts[k], cuts[k + 1] + 1);
    if (slice.length < 2) continue;
    const h = heading(slice[0], slice[slice.length - 1]);
    const brk = k > 0 ? breaks[k - 1] : undefined;
    legs.push({
      points: slice,
      dir: dirOf(h.dx, h.dy),
      turn: brk?.turn,
      // 첫 구간은 회전이 없으므로 "무엇을 향해 가는지"로 말한다
      landmark: brk ? brk.landmark : nearestLandmark(slice[slice.length - 1], floor, skip),
    });
  }

  // 3) 아주 짧은 구간은 앞 구간에 흡수시킨다 — 두 걸음 만에 또 꺾으라고 하면 혼란스럽다
  const merged: Leg[] = [];
  for (const leg of legs) {
    const len = leg.points.reduce(
      (acc, p, i) => (i === 0 ? 0 : acc + Math.hypot(p.x - leg.points[i - 1].x, p.y - leg.points[i - 1].y)),
      0,
    );
    const prev = merged[merged.length - 1];
    if (prev && len < 12 && !leg.turn) {
      prev.points = [...prev.points, ...leg.points.slice(1)];
    } else {
      merged.push({ ...leg });
    }
  }

  return merged;
}

/**
 * 노드 경로를 화면이 쓰는 NavStep[] 로 바꾼다.
 *
 * ★ 화면 하나는 "이 구간을 걷고, 그 끝에서 무엇을 할지"를 말한다.
 *   구간에 **들어가는** 방향을 말하면("왼쪽으로 도세요" 다음 화면에서 또 "곧장")
 *   화면만 늘고 정보는 안 늘어난다. 끝에서 할 일을 말해야 한 화면이 한 행동이 된다.
 *
 * NavStep 은 경계 인터페이스다 — 지도·TTS·애니메이션이 전부 이 형태만 안다.
 */
export function toNavSteps(route: Route, destLabel: string): NavStep[] {
  const g = graph();
  const path = route.nodeIds.map((id) => g.nodes.get(id)!);
  const steps: NavStep[] = [];
  /** 직전에 층 이동이 있었는지 — "엘리베이터에서 내려" 로 시작하기 위함 */
  let justChangedFloor = false;
  /** 엘리베이터 화면에 넘겨줄 "거기까지 걸어가는 길" */
  let pendingTail: GraphNode[] = [];

  let i = 0;
  while (i < path.length - 1) {
    const floor = path[i].floor;
    let j = i;
    while (j + 1 < path.length && path[j + 1].floor === floor) j++;

    const nextIsFloorChange = j + 1 < path.length && path[j + 1].floor !== floor;

    if (j > i) {
      const segment = path.slice(i, j + 1);
      const isFinal = j === path.length - 1;
      const target = isFinal ? destLabel : segment[segment.length - 1].label ?? "엘리베이터";
      const legs = splitIntoLegs(segment, target, segment[0].label);
      const prefix = justChangedFloor ? "엘리베이터에서 내려\n" : "";

      legs.forEach((leg, li) => {
        const isLastLeg = li === legs.length - 1;
        const nextLeg = legs[li + 1];

        if (!isLastLeg && nextLeg?.turn) {
          // 이 구간을 걷다가 끝에서 꺾는다
          const word = nextLeg.turn === "left" ? "왼쪽" : "오른쪽";
          const where = nextLeg.landmark ? `${nextLeg.landmark} 앞에서\n` : "";
          // 꺾는 지점과 꺾은 뒤 방향을 지도에 넘긴다 — 말로만 "왼쪽"이라고 하면
          // 어느 쪽이 왼쪽인지 헷갈린다. 지도에 화살표로 같이 보여준다.
          const pivot = leg.points[leg.points.length - 1];
          const after = nextLeg.points[Math.min(1, nextLeg.points.length - 1)];
          steps.push({
            // 화면은 단어만 — 방향은 큰 화살표가 이미 말해준다
            headline: nextLeg.landmark ? `${nextLeg.landmark} 앞에서\n${word}` : `${word}으로`,
            instruction: `${li === 0 ? prefix : ""}${where}${word}${particleRo(word)} 도세요`,
            checkpoint: nextLeg.landmark ? `${nextLeg.landmark} 앞` : undefined,
            dirIcon: nextLeg.turn,
            detail: `${target} 방향`,
            floor,
            userPos: [leg.points[0].x, leg.points[0].y],
            destPos: [pivot.x, pivot.y],
            pathPoints: leg.points.map((n) => [n.x, n.y] as [number, number]),
            turnAt: [pivot.x, pivot.y],
            turnHeading: [after.x - pivot.x, after.y - pivot.y],
            turnDir: nextLeg.turn,
          });
          return;
        }

        if (!isLastLeg) return; // 회전 없는 중간 구간은 앞 화면이 이미 덮는다

        // 마지막 구간
        if (isFinal) {
          steps.push({
            headline: target,
            instruction: `${legs.length === 1 ? prefix : ""}곧장 가면\n${target}입니다`,
            checkpoint: target,
            dirIcon: "up",
            detail: `${target} 방향`,
            floor,
            targetRoom: target,
            userPos: [leg.points[0].x, leg.points[0].y],
            destPos: [leg.points[leg.points.length - 1].x, leg.points[leg.points.length - 1].y],
            pathPoints: leg.points.map((n) => [n.x, n.y] as [number, number]),
          });
        }
        // 층 이동으로 이어지는 마지막 구간은 화면을 만들지 않는다.
        // 대신 아래 엘리베이터 화면이 이 경로를 지도에 그린다 — 화면 하나를 아낀다.
      });

      if (nextIsFloorChange) {
        // 엘리베이터 화면이 "여기까지 걸어가는 길"을 함께 보여주도록 마지막 구간을 넘긴다
        const tail = legs[legs.length - 1];
        pendingTail = tail ? tail.points : [];
      }
    }

    if (nextIsFloorChange) {
      const a = path[j];
      const b = path[j + 1];
      const edge = (g.adj.get(a.id) ?? []).find((e) => e.to === b.id);
      const means = edge?.mode === "stairs" ? "계단" : "엘리베이터";
      const tail = pendingTail;
      pendingTail = [];
      steps.push({
        headline: `${b.floor}층`,
        instruction: `${means}${particleRo(means)}\n${b.floor}층에 가세요`,
        checkpoint: `${b.floor}층`,
        detail: `${a.floor}층 → ${b.floor}층`,
        dirIcon: "elevator",
        floor: a.floor,
        userPos: tail.length ? [tail[0].x, tail[0].y] : [a.x, a.y],
        destPos: [a.x, a.y],
        pathPoints: tail.map((n) => [n.x, n.y] as [number, number]),
        isElevator: true,
        elevatorFrom: a.floor,
        elevatorTo: b.floor,
      });
      justChangedFloor = true;
      i = j + 1;
    } else {
      justChangedFloor = false;
      i = j + 1;
    }
  }

  return steps;
}

/** 장소 id 두 개로 바로 길안내를 만든다 */
export function routeBetweenPlaces(
  fromPlaceId: string,
  toPlaceId: string,
  destLabel: string,
  opts: RouteOptions = {},
): { navSteps: NavStep[]; totalCost: number } | null {
  const g = graph();
  const a = g.byPlace.get(fromPlaceId);
  const b = g.byPlace.get(toPlaceId);
  if (!a || !b) return null;
  const route = shortestPath(a, b, opts);
  if (!route) return null;
  return { navSteps: toNavSteps(route, destLabel), totalCost: route.totalCost };
}

/**
 * 도면 단위 비용 → "약 3분" (대략치).
 *
 * ⚠️ 현재 화면에는 표시하지 않는다. 실측으로 보정한 값이 아니므로
 *    발표에 쓸 숫자로 인용하지 말 것 — 그 숫자는 답사 때 스톱워치로 잰다.
 */
export function estimateMinutes(cost: number): string {
  const min = Math.max(1, Math.round(cost / 60));
  return `약 ${min}분`;
}
