// 장단 판 규칙(11-14 · 묶음 D4 · 화면 app/js/screens/jang.js) — 화면 · 소리 없음(node 시험 tests/jang.test.mjs)
//  한 장단 = 소박 칸 줄. 칸마다 구음 하나(덩 · 쿵 · 덕 · 기덕 · 더러러러) 또는 쉼(null).
//  여기서 하는 일: 장단 표 · 칸 줄 → 소리 사건 · 보기와 바뀐 칸 찾기 · 부탁 카드 판정 · 자동 시험이 둘 맞는 수 · 저장 글.
//
//  장단 표는 이 앱에 이미 있는 것만(새 국악 사실 X):
//   · 자진모리 · 세마치 = 장1 칸(app/js/cells/jd1.js JANGDAN.JJ · SM)과 같은 칸 · 같은 센 곳 · 같은 빠르기(docs/gugak.md 표 — 교과서 · 국립국악원 대조)
//   · 굿거리 · 중중모리 = 국악 사실 장부(11-14) §1 · §2의 '확실히 말해도 되는 것' 표(국악사전 3소박 4박 · 센 곳 1 · 9번 소박 ·
//     미래엔 교사용 6학년 굿거리 장단보 · 5학년 중중모리 기본 꼴) — 장2 칸(묶음 C5 jd2.js)의 GG · JJM과 같은 칸
//   · 빠르기: 굿거리 80 · 중중모리 85는 사실 장부가 고른 값(두 출처가 겹치는 ♩.=80~90 안 · 앱이 정한 값)
//  쉼은 빈칸(교과서 장단보) — 화면에 '·'를 쓰지 않는다(국악원 자료에서 '·'는 '더' 부호).
//  '기덕'은 한 칸 — '기'는 앞꾸밈이라 칸 시작보다 조금 앞에서 난다(사실 장부 §1 조심할 것 · 칸을 하나 더 쓰지 않음).
//  '더러러러'는 한 칸 — 채 끝을 굴려 서너 번(사실 장부 §5 · 미래엔 6학년 Tip '6번 칸까지 끌지 않는다').

// 구음 — 화면 글은 한글만(영어 소리 이름 X)
export const HITS = ['deong', 'kung', 'deok', 'kideok', 'durr'];
export const SYL = { deong: '덩', kung: '쿵', deok: '덕', kideok: '기덕', durr: '더러러러' };
// 치는 손(사실 장부 '칸에서 써도 안전한 문장' 4 · 5 · 6)
export const HAND = { deong: '두 손 함께', kung: '왼손', deok: '오른손 채', kideok: '덕 앞에 짧게', durr: '채 끝 굴림' };
// 세기 — 장1(jd1 VEL)과 같음 · 기 · 굴림은 덕과 같은 세기(audio.js가 기를 더 작게 냄 · 장2와 같음) · 센 곳은 1.12배(장1 · 장2와 같음)
export const VEL = { deong: 0.85, kung: 0.8, deok: 0.7, gi: 0.7, roll: 0.7 };
export const ACC_UP = 1.12;
export const GI = 0.05;                        // 기 = 칸 시작보다 0.05초 앞(장2와 같음)

// tag = 고르는 단추 아래 짧은 글 · info = 보기 장단보 머리 글(사실 장부 '칸에서 써도 안전한 문장' 1 · 2 · 3 · '민요 세마치'는 docs/gugak.md)
const J = (key, name, beats, bpm, acc, pat, tag, info) => ({ key, name, beats, sub: 3, bpm, acc, pat, tag, info });
export const JANG = {
  jj: J('jj', '자진모리', 4, 100, [0, 8], ['deong', null, null, 'kung', null, null, 'kung', null, 'deok', 'kung', null, null], '네 박', '네 박 · 한 박을 셋으로 나눠 열두 칸'),
  sm: J('sm', '세마치', 3, 90, [0], ['deong', null, null, 'deong', null, 'deok', 'kung', 'deok', null], '민요 · 세 박', '민요 · 세 박 · 한 박을 셋으로 나눠 아홉 칸'),
  gg: J('gg', '굿거리', 4, 80, [0, 8], ['deong', null, 'kideok', 'kung', 'durr', null, 'kung', null, 'kideok', 'kung', 'durr', null], '네 박', '네 박 · 열두 칸 · 더러러러가 있어요'),
  jjm: J('jjm', '중중모리', 4, 85, [0, 8], ['deong', null, 'deok', 'kung', null, 'deok', 'kung', null, 'deok', 'kung', null, 'kung'], '네 박', '네 박 · 열두 칸 · 덕이 많아요'),
};
export const ORDER = ['sm', 'jj', 'gg', 'jjm'];   // 고르는 차례 — 부탁 ①은 세마치부터(설계서) · 3~4학년 둘 다음 5~6학년 둘
// 내 장단 짓기의 빈 틀 — 장단 이름 없이 박 수만(정답 없음 · 센 곳 표시 없음) · 빠르기 90은 앱이 정한 값(세마치와 같음)
export const FRAMES = {
  b3: { key: 'b3', name: '세 박', beats: 3, sub: 3, bpm: 90, acc: [], tag: '아홉 칸', info: '아홉 칸' },
  b4: { key: 'b4', name: '네 박', beats: 4, sub: 3, bpm: 90, acc: [], tag: '열두 칸', info: '열두 칸' },
};
export const lenOf = d => d.beats * d.sub;
export const emptyPat = d => Array(lenOf(d)).fill(null);
export const subSec = bpm => 60 / bpm / 3;     // 소박 한 칸(초) — ♩. = bpm
export const cycleSec = d => lenOf(d) * subSec(d.bpm);

// 칸 하나 놓기 — 같은 구음을 한 번 더 놓으면 빠짐(쉼) · 쉼(null)을 놓으면 빠짐 · 새 줄을 돌려줌(원래 줄은 그대로)
export function place(pat, i, hit) {
  if (i < 0 || i >= pat.length) return pat;
  const to = hit && pat[i] !== hit ? hit : null;
  if (to === pat[i]) return pat;
  const out = pat.slice(); out[i] = to; return out;
}

// 칸 줄 → 소리 사건(Engine.drum에 그대로) — t는 줄 처음부터 초(기덕의 '기'는 칸보다 GI 앞이라 첫 칸이면 음수)
//  { t, drum, vel, span, i } · 쉼은 사건 없음 · acc = 센 칸(세기 1.12배)
export function cycleEvents(pat, { bpm, acc = [] }) {
  const s = subSec(bpm), out = [];
  pat.forEach((hit, i) => {
    if (!hit) return;
    const t = i * s, up = acc.includes(i) ? ACC_UP : 1, v = k => Math.min(1, VEL[k] * up);
    if (hit === 'kideok') out.push({ t: t - GI, drum: 'gi', vel: v('gi'), span: s, i }, { t, drum: 'deok', vel: v('deok'), span: s, i });
    else if (hit === 'durr') out.push({ t, drum: 'roll', vel: v('roll'), span: s, i });
    else out.push({ t, drum: hit, vel: v(hit), span: s, i });
  });
  return out.sort((a, b) => a.t - b.t);
}

// 보기와 바뀐 칸 — 칸 번호(0부터) 목록
export function diffCells(a, b) {
  const n = Math.max(a.length, b.length), out = [];
  for (let i = 0; i < n; i++) if ((a[i] ?? null) !== (b[i] ?? null)) out.push(i);
  return out;
}
export const countHits = pat => pat.filter(Boolean).length;
export const sylOf = hit => (hit ? SYL[hit] : '쉼');
// 칸 자리 글 — '5번째 칸(2박 둘째 소박)'
const NTH = ['첫째', '둘째', '셋째'];
export const cellPlace = (d, i) => `${i + 1}번째 칸(${Math.floor(i / d.sub) + 1}박 ${NTH[i % d.sub]} 소박)`;
// 바뀐 칸 한 줄(사실만) — '5번째 칸(2박 둘째 소박): 쉼 → 덕'
export const changeLine = (d, ref, pat, i) => `${cellPlace(d, i)}: ${sylOf(ref[i])} → ${sylOf(pat[i])}`;

// 부탁 카드 셋 — kind: copy(보기를 그대로 · E) · one(한 칸만 바꾸기 · E) · free(내 장단 짓기 · M · 정답 없음)
export const CARDS = [
  { key: 'copy', kind: 'E', text: d => `${d.name} 장단을 보기대로 놓아 들어 봐요` },
  { key: 'one', kind: 'E', text: () => '한 칸을 바꿔 들어 봐요 — 어디가 달라졌나' },
  { key: 'free', kind: 'M', text: () => '내 장단 짓기 — 빈 칸에 마음대로' },
];
export const FREE_MIN = 3;                     // 내 장단 짓기 — 소리 셋 이상이면 들어 볼 수 있음(정답은 없음)
// 판정 — st: idle(아직) · ready(들어 볼 차례) · diff(한 칸보다 많이 바뀜) · msg: 아래 한 줄(사실만 · 부정하는 말 X)
export function judge(key, pat, ref) {
  if (key === 'copy') {
    const n = diffCells(pat, ref).length;
    if (!n) return { st: 'ready', n: 0 };
    return { st: 'idle', n, msg: !countHits(pat) ? '아래에서 구음을 고르고, 보기와 같은 칸을 눌러요' : `보기와 다른 칸이 ${n}개 남았어요` };
  }
  if (key === 'one') {
    const D = diffCells(pat, ref);
    if (D.length === 1) return { st: 'ready', n: 1, at: D[0] };
    if (!D.length) return { st: 'idle', n: 0, msg: '칸 하나를 골라 다른 구음으로 바꿔요' };
    return { st: 'diff', n: D.length, msg: `지금 ${D.length}칸이 보기와 달라요 — 한 칸만 바꿔요('처음대로'를 누르면 보기와 같아져요)` };
  }
  const n = countHits(pat);
  if (n >= FREE_MIN) return { st: 'ready', n };
  return { st: 'idle', n, msg: `빈 칸에 구음을 놓아요 — ${n}개 놓았어요` };
}

// 자동 시험 — 지금 부탁을 푸는 맞는 수 하나 { i, hit }(hit = null이면 쉼으로 빼기) · 할 것이 없으면 null
const FREE_SEQ = ['deong', 'kung', 'deok', 'kung', 'kideok', 'deok'];
export function nextMove(key, pat, ref) {
  if (key === 'copy') { const i = diffCells(pat, ref)[0]; return i == null ? null : { i, hit: ref[i] }; }
  if (key === 'one') {
    const D = diffCells(pat, ref);
    if (D.length === 1) return null;
    if (D.length > 1) { const i = D[D.length - 1]; return { i, hit: ref[i] }; }
    const i = ref.findIndex((x, k) => k > 0 && x);
    return { i, hit: ref[i] === 'kung' ? 'deok' : 'kung' };
  }
  if (countHits(pat) >= FREE_MIN) return null;
  const i = pat.indexOf(null);
  return i < 0 ? null : { i, hit: FREE_SEQ[countHits(pat) % FREE_SEQ.length] };
}

// 저장 글(기기에만) — 칸마다 한 글자: 덩 D · 쿵 K · 덕 T · 기덕 G · 더러러러 R · 쉼 .
const CODE = { deong: 'D', kung: 'K', deok: 'T', kideok: 'G', durr: 'R' };
const DECODE = Object.fromEntries(Object.entries(CODE).map(([k, v]) => [v, k]));
export const encode = pat => pat.map(x => (x ? CODE[x] : '.')).join('');
// 읽기 — 길이가 n이 아니거나 모르는 글자가 있으면 null(옛 저장 · 망가진 저장은 버림)
export function decode(s, n) {
  if (typeof s !== 'string' || s.length !== n) return null;
  const out = [];
  for (const c of s) { if (c === '.') out.push(null); else if (DECODE[c]) out.push(DECODE[c]); else return null; }
  return out;
}
