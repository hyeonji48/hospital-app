# 프로토타입 코드베이스 실사 (2026-08-23)

`docs/PROJECT_BRIEF.md` §10 "즉시 해야 할 것 #1"의 결과물.
브리핑 §6 스키마 초안을 **확정 스키마로 승격시키기 위한 근거 문서**다.

## 1. 기술 스택 (확정)

| 항목 | 내용 |
|---|---|
| 출처 | Figma Make 익스포트 (`package.json` name: `@figma/my-make-file`) |
| 빌드 | Vite 6.3.5 + `@vitejs/plugin-react` |
| 프레임워크 | React 18.3.1 (peerDependency), TypeScript |
| 스타일 | Tailwind CSS v4 (`@tailwindcss/vite`) |
| 애니메이션 | `motion/react` (Framer Motion v12) |
| UI 킷 | shadcn/ui 전체 복사본 (Radix UI 기반) — `src/app/components/ui/` 49개 파일 |
| 아이콘 | lucide-react |
| 백엔드 | **없음.** 전부 클라이언트 사이드 정적 앱 |
| 상태관리 | **없음.** `App.tsx`의 `useState` 3개가 전부 |
| 라우터 | **없음.** `react-router` 설치돼 있으나 미사용 |

**의존성 정리 여지:** `react-router`, `react-dnd`, `recharts`, `@mui/material`,
`react-slick`, `embla-carousel-react`, `date-fns`, `react-hook-form` 모두
`src/app/components/ui/` 밖에서 참조 0건. Figma Make가 기본 포함시킨 것들이며 실제 앱은 쓰지 않는다.
번들 크기 줄일 때 후보. (우선순위 낮음)

## 2. 앱 구조

```
src/main.tsx
└─ src/app/App.tsx                    221줄 — 단일 상태머신 + 아이폰 목업 프레임(412×915)
   ├─ components/CameraView.tsx       126줄 — 접수증 촬영
   ├─ components/LoadingView.tsx       23줄 — 분석 중
   ├─ components/ConfirmScreen.tsx     63줄 — 접수증 확인
   ├─ components/NavigationScreen.tsx 262줄 — 길안내 본체 + 전체화면 약도 + 엘리베이터 패널
   │  └─ components/HospitalFloorMap.tsx 415줄 — SVG 층별 지도 (자동 회전/줌)
   ├─ components/ArrivalScreen.tsx     79줄 — 도착
   ├─ components/CompleteView.tsx      79줄 — 전체 완료
   ├─ hooks/useTTS.ts                  22줄 — Web Speech API (ko-KR, rate 0.9)
   └─ types.ts                        255줄 — ★ 목데이터 전체
```

**상태머신:** `camera → loading → confirm → navigating → arrived → complete`
`history: HistoryEntry[]` 스택으로 뒤로가기 지원. `currentTaskIndex`로 태스크 순회.

## 3. 현재 목데이터 구조 (★ 가장 중요)

데이터가 **두 파일에 분산**되어 있고, **서로 연결되어 있지 않다.**

### 3-A. `src/app/types.ts` — 태스크와 경로

```ts
Task  { id, title, shortTitle, location, floor, steps: NavStep[],
        arrivalTitle, arrivalDetail, estimatedTime }

NavStep { instruction, detail, dirIcon, floor,
          userPos: [x,y], destPos: [x,y], pathPoints: [x,y][],
          targetRoom?, isElevator?, elevatorFrom?, elevatorTo? }
```

`TASKS: Task[]` 6개가 하드코딩:

| # | 태스크 | 위치 | 층 | steps |
|---|---|---|---:|---:|
| 1 | 김멋사 교수님 진료 | 2층 정형외과 205번방 | 2 | 3 |
| 2 | CT 촬영 | 4층 CT실 | 4 | 3 |
| 3 | 엑스레이 촬영 | 4층 엑스레이실 | 4 | 1 |
| 4 | 김멋사 교수님 진료 (재진) | 2층 정형외과 205번방 | 2 | 3 |
| 5 | 진료비 납부 | 1층 원무과 | 1 | 3 |
| 6 | 약 수령 | 1층 약국 | 1 | 1 |

**핵심: `pathPoints`는 사람이 손으로 찍은 폴리라인이다.** 경로 계산 코드는 존재하지 않는다.
현재 앱은 라우팅 엔진이 아니라 **미리 만들어둔 슬라이드쇼**다.

### 3-B. `src/app/components/HospitalFloorMap.tsx` — 층별 공간

```ts
Room { x, y, w, h, label, sub?,
       isElevator? isStairs? isNurse? isWaiting? isLobby? isToilet? isSpecial? isUrgent? }
```

`FLOOR_1_ROOMS` ~ `FLOOR_4_ROOMS` 4개 배열, 총 41개 사각형.

- 1층: 약국 / 처방전접수 / 안내데스크 / 원무과 / 화장실 / 대기로비 / 편의점 / 커피숍 / 엘리베이터 / 계단 / 응급센터
- 2층: 정형외과 201~208 + 간호사실 / 처치실 / 대기실 / 엘리베이터 / 계단
- 3층: 신경외과 307~314 (동일 레이아웃)
- 4층: 영상의학과 — CT 대기실 / MRI실 / 판독실 / CT실 / 엑스레이실

**좌표계:** SVG viewBox `360 × 240`. 복도는 층마다 **가로 띠 하나**(`getCorridorY`) —
1층 `y=94..112`, 2~4층 `y=100..120`. 즉 모든 층이 "복도 하나 + 위아래 방 두 줄" 구조.

**층 조회 함수는 폴백이 위험하다:**

```ts
function getFloorRooms(floor: number): Room[] {
  if (floor === 1) return FLOOR_1_ROOMS;
  if (floor === 2) return FLOOR_2_ROOMS;
  if (floor === 3) return FLOOR_3_ROOMS;
  return FLOOR_4_ROOMS;   // ← floor=0, -1(지하1층) 도 4층 도면을 그린다
}
```

브리핑 §7의 권장 범위가 **지하1층 포함**이므로 이 함수는 반드시 손봐야 한다.

### 3-C. 두 파일의 연결고리 = 문자열 하나

`HospitalFloorMap.tsx:259`

```ts
const isTarget = step.targetRoom === room.label;
```

목적지 강조는 `NavStep.targetRoom` 문자열과 `Room.label` 문자열의 **정확 일치**로만 결정된다.
`"205"`, `"엘리베이터"`, `"CT실"` 같은 값. 오타 하나면 조용히 강조가 사라진다. ID 참조로 교체 대상.

## 4. 지도 렌더링 로직 (이건 자산이다 — 보존할 것)

`HospitalFloorMap.tsx`는 단순 도면이 아니라 **차량 내비 스타일 뷰포트**를 이미 구현해뒀다:

1. `pathPoints[0] → pathPoints[1]` 벡터로 진행 방향 각도 계산
2. 진행 방향이 **항상 화면 위쪽(-90°)** 을 향하도록 지도 전체 회전
3. 사용자 위치와 목적지가 모두 화면에 들어오도록 **스케일 자동 계산** (`maxAllowedScale` 클램프)
4. `fullScreen` prop으로 뷰포트 240×360 ↔ 600×900 전환
5. `+`/`−` 수동 줌 (`zoomMultiplier`, step 변경 시 1.0으로 리셋)

**이 컴포넌트의 입력은 오직 `NavStep` 하나다.** → 라우팅 엔진이 `NavStep[]`을 출력하기만 하면
지도 코드는 손댈 필요가 거의 없다. 5장 마이그레이션 전략의 근거.

## 5. 브리핑 §6 스키마와의 갭 분석

| # | 브리핑이 가정하는 것 | 현재 코드 | 갭 크기 |
|---|---|---|---|
| 1 | node/edge 그래프 + Dijkstra | 그래프 없음. 손으로 찍은 폴리라인 | **가장 큼** |
| 2 | 노드에 `floor, x, y` | 방은 사각형(x,y,w,h), 경로점은 [x,y] — **같은 viewBox 좌표계** | 작음 (호환) |
| 3 | `accessible` 플래그로 계단 제외 | `isStairs` 플래그 있으나 **장식용**. 계단 이동 로직 없음 | 중간 |
| 4 | `hospital.id`로 병원 교체 | 병원 식별자 자체가 없음. 층 데이터가 컴포넌트 안에 하드코딩 | 중간 |
| 5 | 지하1층 포함 3개 층 | `getFloorRooms` 폴백이 음수/0층을 4층으로 그림 | 작음 |
| 6 | 다국어 | 한국어 문자열이 JSX·TTS에 직접 박혀 있음 | 중간 |

### 그래서 좋은 소식

**#2가 작다는 게 핵심이다.** 브리핑이 제안한 `nodes[].x/y`와 기존 `pathPoints`가 동일한
360×240 좌표 공간을 쓴다. 노드를 그 공간에 얹으면 되고, 기존 지도 렌더링을 버릴 필요가 없다.

### 그래서 나쁜 소식

**#1은 "데이터 교체"가 아니라 "엔진 신규 구현"이다.** 브리핑 §10이 이 작업을 "목데이터 →
실데이터 변환 스크립트"로 적어뒀는데, 실제로는 **없던 것을 만드는 일**이다. 일정 산정 시 주의.

## 6. 권장 마이그레이션 전략 — 라우터를 `NavStep[]` 생산자로

기존 UI를 한 줄도 버리지 않고 엔진을 끼워 넣는 방법:

```
graph.json (nodes/edges)
      ↓
  dijkstra(from, to, mode)  →  nodeId[]
      ↓
  toNavSteps(nodeId[])      →  NavStep[]   ← 기존과 100% 동일한 shape
      ↓
  NavigationScreen / HospitalFloorMap      ← 무수정
```

`NavStep`을 **경계 인터페이스로 고정**하면:

- 지도·화면·TTS·애니메이션 전부 그대로 재사용
- `TASKS` 하드코딩을 `route()` 호출로 바꾸는 것이 실질적 작업의 전부
- 엔진이 미완성이어도 기존 하드코딩 `TASKS`로 폴백 가능 → **시연 리스크 0**

마지막 항목이 중요하다. 해커톤에서 "완성하지 못하는 것"이 가장 큰 실패이므로, 언제든 되돌아갈
수 있는 상태를 유지한 채 엔진을 붙인다.

### 작업 단위 추정

| 작업 | 추정 | 비고 |
|---|---|---|
| `data/bucheon-cmc.json` 스키마 확정 + 타입 | 소 | 브리핑 §6 거의 그대로 |
| 노드/엣지 저작 (3개 층, 40~60 노드) | **대** | 현장답사 데이터 의존. 병목은 코드가 아니라 실측 |
| Dijkstra + 모드별 가중치 | 소 | 40~60 노드면 우선순위 큐 없이도 충분 |
| `toNavSteps()` (경로 → 방향지시 + 문구) | 중 | "오른쪽으로 직진" 문구 생성이 은근히 까다로움 |
| `HospitalFloorMap` 데이터 주입형으로 전환 | 중 | 룸 배열을 props/JSON에서 받도록 |
| 지하1층 지원 (`getFloorRooms` 폴백 수정) | 소 | |

## 7. 시연·발표 관점에서 지금 당장 걸리는 것들

- **`ConfirmScreen.tsx`에 "정형외과 김멋사 교수님"이 하드코딩** — TTS 문구까지 포함.
  브리핑 §9 시나리오(78세 어르신 / 순환기내과 초진 + 채혈 + 심전도)와 불일치. 시연 대본을
  확정하면 이 화면부터 교체해야 한다.
- **`CameraView`의 스캔은 가짜다** — `getUserMedia`로 실제 카메라는 켜지지만, "촬영" 버튼은
  `setTimeout(1800)` 후 다음 화면으로 넘어갈 뿐 OCR이 없다. 심사위원이 접수증 대신 아무 종이나
  들이대면 그대로 통과한다. 시연 시 이 점을 건드리지 않도록 대본을 짜거나, 정직하게
  "OCR은 상용 API로 대체 가능한 부분"이라고 말하는 편이 안전하다.
- **층 이름이 가상 병원 기준** (`2층 정형외과`, `3층 신경외과`, `4층 영상의학과`) — 부천성모
  실제 층별 구성으로 교체 필요. 현장답사 항목.
- **TTS는 브라우저 내장 음성** — 기기·브라우저마다 한국어 음질 편차가 크다. 시연 기기에서
  반드시 사전 확인할 것. 최악의 경우 음성 파일 사전 녹음이 더 안전하다.
