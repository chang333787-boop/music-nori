// 주제곡 「숲속 음악대」 — 우리가 지은 곡(저작권 걱정 0 · docs/sound.md). 순수 자료 + 편곡 계산(DOM · 소리 X → node 시험 tests/theme.test.mjs)
//  한 곡을 앱 전체가 함께 쓴다: 처음 화면 배경 음악(친구 줄이 계단만큼) · 박 놀이 반주(박과 화음만) · 결과 팡파르(첫 동기)
//  사건 = { b(마디 안 박 · 0부터), part, kind:'note'|'drum', inst | drum, p, d(박), vel } — 초로 바꾸기는 소리 쪽(music.js · _beat.js)이 한다
import { parseMel } from './song.js';
import { chordByName, pc } from './theory.js';
import { FIRST, cellById } from './cells.js';

// ── 곡 ──
//  가락은 솔 · 미 · 라 · 도 · 레(다섯 음) — 가락 갈래 차례(솔미 → 라 → 도 · 건너뛰기)를 그대로 들려준다. 첫 마디 = 솔 미 솔 미(인사 동기)
//  A(1~8) = C Am F G | C Am F·G C(마침) · B(9~16) = F G Em Am | F G C G(A로 돌아감)
export const THEME = {
  title: '숲속 음악대', bpm: 100, meter: 4,
  chords: ['C', 'Am', 'F', 'G', 'C', 'Am', ['F', 'G'], 'C', 'F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'G'],
  mel: 'G4q E4q G4q E4q | A4e A4e G4q E4h | A4q A4q C5q A4q | G4q A4q G4h | G4q E4q G4e G4e C5q | A4q C5q A4q E4q | A4e A4e A4q G4q D4q | E4q D4q C4h'
    + ' | C5q C5q A4q C5q | D5q C5q D5h | E5q D5q E5h | C5q A4q E4h | A4q C5q C5e D5e C5q | D5h G4h | E5q D5q C5q G4q | G4q A4q D4h',
};
export const BARS = THEME.chords.length;               // 16
const parsed = parseMel(THEME.mel, [4, 4]);
export const THEME_ERRORS = parsed.errors;
// 마디마다 가락 [{ b, d, p }](박 단위)
export const MEL = Array.from({ length: BARS }, (_, i) => parsed.ev.filter(e => e.p != null && Math.floor(e.t / 48) === i).map(e => ({ b: (e.t - i * 48) / 12, d: e.d / 12, p: e.p })));

// 마디 i의 화음 — 박 b에서(한 마디에 둘이면 앞 두 박 · 뒤 두 박)
export function chordAt(i, b = 0, chords = THEME.chords) {
  const c = chords[((i % chords.length) + chords.length) % chords.length];
  return Array.isArray(c) ? c[b < 2 ? 0 : 1] : c;
}
// 마디 i의 화음 조각 [{ b, len, name }]
export function chordSpans(i, chords = THEME.chords) {
  const c = chords[((i % chords.length) + chords.length) % chords.length];
  return Array.isArray(c) ? [{ b: 0, len: 2, name: c[0] }, { b: 2, len: 2, name: c[1] }] : [{ b: 0, len: 4, name: c }];
}
// 소리 자리(크롬북 작은 스피커에서도 들리게 너무 낮지 않게)
export const ROOT = { C: 48, D: 50, Em: 52, E: 52, F: 53, G: 43, Am: 45, A: 45, Dm: 50 };      // 베이스(거북)
export const COMP = { C: [60, 64, 67], Am: [57, 60, 64], F: [57, 60, 65], G: [55, 59, 62], Em: [55, 59, 64], Dm: [57, 62, 65] };   // 피아노 화음(곰)
export const tonesOf = name => (chordByName(name) || chordByName('C')).pcs;
export const isChordTone = (p, name) => tonesOf(name).includes(pc(p));

// ── 친구 다섯 = 다섯 줄 · 첫 판 칸 하나 = 계단 하나(11-08 장1 장단보 → 고슴도치 '장구' · 셈1 → 곰 '셈여림' · 11-10 빠1 → 곰 '빠르기' · 11-14 소6 → 토끼 '하프' · 형1 · 화1 → 거북 '첼로' · '호른') ──
//  곰 = 반주(처음부터) · 토끼 = 반짝 소리(소리 갈래) · 참새 = 가락(가락 갈래) · 고슴도치 = 북(박·리듬 갈래) · 거북 = 낮은 소리(악보 갈래 + 형식·화음 갈래 — lanes)
export const PARTS = [
  { key: 'bear', lane: 'any', name: '반주', base: 1, max: 3 },   // 곰 = 처음부터 반주(1) · 셈1을 지나면 커졌다 작아졌다(2) · 빠1을 지나면 끝 두 마디가 점점 느리게(3)
  { key: 'bunny', lane: 'sound', name: '반짝 소리', max: 4 },
  { key: 'bird', lane: 'melody', name: '가락', max: 4 },
  { key: 'hog', lane: 'rhythm', name: '북', max: 7 },
  { key: 'turtle', lane: 'score', lanes: ['score', 'meet'], name: '낮은 소리', max: 4 },
];
// 줄이 맡는 갈래들 — 거북만 둘(악보 + 형식·화음)
const lanesOf = part => part.lanes || [part.lane];
// 진행(prog) → 줄마다 계단 { bear:1, bunny:0~3, … } — 그 갈래 첫 판 칸 중 별 하나 이상 받은 칸 수
export function levelsOf(prog = {}) {
  const lv = {};
  for (const part of PARTS) {
    const base = part.base || 0;
    const ids = part.lane ? FIRST.filter(id => lanesOf(part).includes(cellById(id).lane)) : [];
    lv[part.key] = base + Math.min(part.max - base, ids.filter(id => prog[id] && prog[id].stars >= 1).length);
  }
  return lv;
}
export const stepsOf = lv => PARTS.reduce((s, p) => s + Math.max(0, (lv[p.key] || 0) - (p.base || 0)), 0);   // 0 ~ 첫 판 칸 수
// 새로 생긴 줄(지난번 들은 계단 → 지금) [{ key, from, to }]
export const newParts = (heard = {}, now = {}) => PARTS.filter(p => p.lane && (now[p.key] || 0) > (heard[p.key] ?? (p.base || 0))).map(p => ({ key: p.key, from: heard[p.key] ?? (p.base || 0), to: now[p.key] }));
// 칸 하나가 몇째 줄 · 몇째 계단을 여는지(결과 화면 한 줄) — 그 칸의 갈래 줄
export const partOfCell = id => { const c = cellById(id); return c ? PARTS.find(p => lanesOf(p).includes(c.lane)) || null : null; };
// 그 갈래 줄의 계단마다 무엇이 더해지는지(결과 · 처음 화면 한 줄)
export const STEP_TEXT = {
  bear: ['', '', '셈여림', '빠르기'],
  bunny: ['', '트라이앵글', '글로켄슈필', '첼레스타', '하프'],
  bird: ['', '가락 앞부분', '가락 뒷부분', '가락 화음', '레'],
  hog: ['', '큰북', '작은북', '하이햇', '마디 끝 채움', '심벌', '장구', '작은북 띠띠'],
  turtle: ['', '낮은 소리', '걷는 낮은 소리', '첼로', '호른'],
};

// ── 편곡: 처음 화면 배경 음악 한 마디 ──
//  lv = levelsOf() · i = 마디(0~15) · 돌려주는 사건은 마디 안 박(b) 기준
const N = (part, inst, p, b, d, vel) => ({ part, kind: 'note', inst, p, b, d, vel });
const D = (part, drum, b, vel, span) => ({ part, kind: 'drum', drum, b, vel, ...(span ? { span } : {}) });
export function themeBar(i, lv) {
  const ev = [], bar = ((i % BARS) + BARS) % BARS, spans = chordSpans(bar), phraseEnd = bar % 4 === 3, secStart = bar === 0 || bar === 8, inB = bar >= 8;
  // 곰 — 피아노 화음(조각 첫 박 · 셋째 박) + 큰북 첫 박
  for (const s of spans) {
    for (const b of s.len === 4 ? [0, 2] : [s.b]) for (const p of COMP[s.name]) ev.push(N('bear', 'keys', p, b, 1.6, b === 0 ? 0.36 : 0.27));
  }
  ev.push(D('bear', 'bassdrum', 0, 0.32));
  // 거북 — 낮은 소리: 1 근음 길게 · 2 근음-5음-옥타브-5음 걷기 · 3 + 첼로(화음의 아래 음을 길게) · 4 + 호른(네 마디 끝마다 화음의 위 음을 길게)
  if (lv.turtle >= 1) for (const s of spans) {
    const r = ROOT[s.name];
    if (lv.turtle >= 2) [r, r + 7, r + 12, r + 7].slice(0, s.len).forEach((p, k) => ev.push(N('turtle', 'bass', p, s.b + k, 0.9, 0.55)));
    else ev.push(N('turtle', 'bass', r, s.b, s.len - 0.2, 0.6));
    if (lv.turtle >= 3) ev.push(N('turtle', 'cello', COMP[s.name][0], s.b, s.len - 0.15, 0.3));
    if (lv.turtle >= 4 && phraseEnd) ev.push(N('turtle', 'horn', COMP[s.name][2], s.b, s.len - 0.3, 0.28));
  }
  // 고슴도치 — 북
  const hg = lv.hog;
  if (hg >= 1) { ev.push(D('hog', 'kick', 0, 0.6), D('hog', 'kick', 2, 0.5)); if (hg >= 5 && inB) ev.push(D('hog', 'kick', 2.5, 0.35)); }
  if (hg >= 2) { const fill = hg >= 4 && phraseEnd; ev.push(D('hog', 'snare', 1, 0.45)); if (!fill) ev.push(D('hog', 'snare', 3, 0.45)); else [3, 3.25, 3.5, 3.75].forEach((b, k) => ev.push(D('hog', 'snare', b, 0.3 + k * 0.06))); }
  if (hg >= 3) for (let k = 0; k < 8; k++) ev.push(D('hog', 'hat', k / 2, k % 2 ? 0.22 : 0.32));
  if (hg >= 5 && secStart) ev.push(D('hog', 'cymbal', 0, 0.4));
  if (hg >= 6 && bar % 2 === 1) ev.push(D('hog', 'kung', 0, 0.38), D('hog', 'deok', 1.5, 0.3));   // 장구(장1 장단보) — 두 마디마다 쿵 · 덕
  if (hg >= 7) { ev.push(D('hog', 'snare', 1.5, 0.26)); if (!phraseEnd) ev.push(D('hog', 'snare', 3.5, 0.26)); }   // 작은북 띠띠(리3 8분음표 둘) — 둘째 · 넷째 박을 8분음표 둘로(마디 끝 채움 마디는 넷째 박 그대로 · 세기 낮게)
  // 참새 — 가락(플루트): 1 A만 · 2 모두 · 3 + B에 아래 화음 음 · 4(가4 레) + 가락이 길게 머무는 마디에 레가 든 차례가기 지나가는 음(도-레-미 · 미-레-도)
  const bd = lv.bird;
  if (bd >= 2 || (bd >= 1 && !inB)) for (const n of MEL[bar]) {
    ev.push(N('bird', 'flute', n.p, n.b, n.d * 0.92, 0.5));
    if (bd >= 3 && inB) { const h = harmonyBelow(n.p, chordAt(bar, n.b)); if (h != null) ev.push(N('bird', 'clarinet', h, n.b, n.d * 0.92, 0.3)); }
  }
  if (bd >= 4 && STEP_RUN[bar]) STEP_RUN[bar].forEach((p, k) => ev.push(N('bird', 'lead', p, 2 + k / 2, k === 2 ? 0.9 : 0.42, 0.36)));
  // 토끼 — 반짝: 1 트라이앵글(네 마디마다) · 2 + 글로켄 오름(마디 끝) · 3 + 첼레스타 엇박 · 4 + 하프(네 마디의 셋째 마디마다 화음을 아래에서 위로 펼침)
  const bn = lv.bunny;
  if (bn >= 1 && bar % 4 === 0) ev.push(D('bunny', 'triangle', 0, 0.55));
  if (bn >= 2 && phraseEnd) { const c = COMP[chordAt(bar, 3)]; c.forEach((p, k) => ev.push(N('bunny', 'glock', p + 12, 3 + k / 3, 0.4, 0.35))); }
  if (bn >= 3) for (const b of [1.5, 3.5]) { const c = COMP[chordAt(bar, b)]; ev.push(N('bunny', 'celesta', c[2] + 12, b, 0.35, 0.22)); }
  if (bn >= 4 && bar % 4 === 2) { const c = COMP[chordAt(bar, 0)]; [c[0], c[1], c[2], c[0] + 12].forEach((p, k) => ev.push(N('bunny', 'harp', p, k / 2, 1.2, 0.3))); }
  // 곰 2계단(셈1 여리게·세게) — 셈여림: A는 조금 여리게(mp) · B 앞 네 마디 점점 세게 · 뒤 네 마디 점점 여리게
  if ((lv.bear || 1) >= 2) { const g = DYN[bar]; for (const e of ev) e.vel = Math.min(1, +(e.vel * g).toFixed(3)); }
  // 곰 3계단(빠1 느리게·보통·빠르게) — 빠르기: 끝 두 마디(15 · 16)가 점점 느리게(rit.) · 다음 바퀴 첫 마디는 제 빠르기(a tempo)
  //  사건의 박(b) · 길이(d)를 늘어난 박 자리로 옮김 → 소리 쪽(music.js)은 barLen만큼 마디를 잡음(박 놀이 반주 accompBar는 그대로)
  const w = warpOf(bar, lv);
  if (w) for (const e of ev) { const a = w(e.b); if (e.d != null) e.d = +(w(e.b + e.d) - a).toFixed(4); e.b = +a.toFixed(4); }
  return ev;
}
// 참새 4계단(가4 레) — 가락이 셋째 박부터 길게 머무는 마디(2 · 8 · 12마디)의 셋째 · 넷째 박에 차례가기 세 음(8분 · 8분 · 4분)
//  화음 음(C · Am의 도 · 미)이 박 위, 레는 박 사이 지나가는 음 · 8마디(마침)는 미-레-도로 내려와 도에서 끝남 · 주제곡 가락(MEL)은 그대로
export const STEP_RUN = { 1: [72, 74, 76], 7: [76, 74, 72], 11: [72, 74, 76] };
// 빠르기 계단(곰 3) — 마디 안 박 길이 배수가 처음 s0 → 끝 s1로 고르게 늘어남(점점 느리게). 15마디 1 → 1.2 · 16마디 1.2 → 1.5
//  = 빠르기 100(보통 · 빠1의 '보통')에서 약 67(빠1의 '느리게')까지 · 박 자리 W(b) = s0·b + (s1 − s0)·b²/8 · 마디 길이 = W(4) = 2(s0 + s1)
export const RIT = { 14: [1, 1.2], 15: [1.2, 1.5] };
export function warpOf(i, lv = {}) {
  if ((lv.bear || 1) < 3) return null;
  const r = RIT[((i % BARS) + BARS) % BARS];
  if (!r) return null;
  const [s0, s1] = r;
  return b => s0 * b + (s1 - s0) * b * b / 8;
}
// 마디 길이(박 · 제 빠르기 박으로 셈) — 배경 음악이 마디를 차례로 잡을 때(music.js pump)
export const barLen = (i, lv = {}) => { const w = warpOf(i, lv); return w ? w(4) : 4; };
export const DYN = [0.8, 0.8, 0.8, 0.85, 0.8, 0.8, 0.85, 0.9, 0.72, 0.86, 1.0, 1.15, 1.1, 0.96, 0.82, 0.7];
// 가락 아래 화음 음(셋째 · 넷째 아래 중 화음 음) — 없으면 null
export function harmonyBelow(p, name) {
  for (let k = 3; k <= 5; k++) if (isChordTone(p - k, name)) return p - k;
  return null;
}
// 마침(배경 음악 끝 · 박 놀이 끝) — 다장조 으뜸화음
export function cadence(lv = { bear: 1 }) {
  const ev = COMP.C.map(p => N('bear', 'keys', p, 0, 3, 0.4));
  ev.push(N('bear', 'bass', 48, 0, 2.5, 0.5), D('bear', 'bassdrum', 0, 0.35));
  if (lv.turtle >= 1) ev.push(N('turtle', 'bass', 48, 0, 2.5, 0.55));
  if (lv.turtle >= 3) ev.push(N('turtle', 'cello', 55, 0, 2.5, 0.3));
  if (lv.turtle >= 4) ev.push(N('turtle', 'horn', 64, 0, 2.5, 0.28));
  if (lv.bird >= 1) ev.push(N('bird', 'flute', 72, 0, 2.5, 0.45));
  if (lv.hog >= 5) ev.push(D('hog', 'cymbal', 0, 0.35));
  if (lv.bunny >= 1) ev.push(D('bunny', 'triangle', 0, 0.5));
  if (lv.bunny >= 4) [60, 64, 67, 72].forEach((p, k) => ev.push(N('bunny', 'harp', p, k * 0.12, 2, 0.3)));
  return ev;
}

// ── 박 놀이 반주(박과 화음만 — 맞혀야 할 리듬은 치지 않는다 · docs/sound.md §4) ──
//  sal = 박 드러남: 3 큰북 박마다 · 2 큰북 1·3박 + 박마다 작은 햇 · 1 북 없음(낮은 소리 · 화음 · 가락만) · 'pulse' = 박마다 햇 + 큰북 첫 박(따라 치기 · 풍선 · 막대)
//  mel = 주제곡 가락도(징검다리) · names = 화음 조각(없으면 주제곡 i번째 마디)
export function accompBar(i, { sal = 'pulse', mel = false, spans = null, meter = 4 } = {}) {
  const ev = [], bar = ((i % BARS) + BARS) % BARS, sp = spans || chordSpans(bar);
  for (const s of sp) {
    const r = ROOT[s.name] ?? 48, low = r < 48 ? r + 12 : r;   // 둥(마림바 · 작은 스피커에서도 들리는 높이)
    /* 반주는 고슴도치 북 · 내 소리보다 작게(따라 칠 것이 묻히지 않게) · 가벼운 소리(bass · keys · lead = 소리 장치 둘)로 — 크롬북 소리 스레드 */
    ev.push(N('acc', 'bass', low, s.b, Math.min(1.2, s.len - 0.3), 0.46));
    if (s.len >= 4) ev.push(N('acc', 'bass', low + 7, s.b + 2, 0.8, 0.34));
    for (const b of s.len >= 4 ? [s.b, s.b + 2] : [s.b]) for (const p of COMP[s.name] || COMP.C) ev.push(N('acc', 'keys', p, b, 1.0, b === s.b ? 0.17 : 0.13));
  }
  for (let k = 0; k < meter; k++) {
    if (sal === 3) ev.push(D('acc', 'kick', k, k === 0 ? 0.7 : 0.55));
    else if (sal === 2) { if (k % 2 === 0) ev.push(D('acc', 'kick', k, k === 0 ? 0.7 : 0.5)); ev.push(D('acc', 'hat', k, k === 0 ? 0.36 : 0.26)); }
    else if (sal === 'pulse') { ev.push(D('acc', 'hat', k, k === 0 ? 0.42 : 0.3)); if (k === 0) ev.push(D('acc', 'kick', 0, 0.34)); }
  }
  if (mel) for (const n of MEL[bar]) ev.push(N('acc', 'lead', n.p, n.b, n.d * 0.88, 0.5));
  return ev;
}
// n마디 반주에 쓸 주제곡 마디 차례 — 끝 두 마디는 늘 마침(7 · 8마디)
export function themeRun(n) {
  if (n <= 2) return [6, 7].slice(2 - n);
  const out = [];
  for (let k = 0; k < n - 2; k++) out.push(k % 6);     // 1~6마디를 돌고
  return [...out, 6, 7];
}
// 막대 음(솔 · 미 · 라 …) 한 마디 → 어울리는 화음(C · Am · F · G 중 센박 · 긴 음을 가장 많이 품는 것)
export function harmonize(notes, cands = ['C', 'F', 'Am', 'G']) {
  if (!notes.length) return 'C';
  let best = cands[0], bs = -1;
  for (const c of cands) {
    let s = 0;
    for (const n of notes) if (isChordTone(n.p, c)) s += (n.d || 1) * (n.b % 2 === 0 ? 1.5 : 1);
    if (s > bs + 1e-9) { bs = s; best = c; }
  }
  return best;
}
// 길게 부는 음(리4) — 아이가 아는 음(미 · 솔 · 라) 중 그 화음 음이면서 솔(67)에 가장 가까운 음(파는 아직 배우지 않음)
export function holdPitch(name, near = 67, pool = [64, 67, 69]) {
  let best = near, bd = 99;
  for (const p of pool) if (isChordTone(p, name)) { const d = Math.abs(p - near); if (d < bd) { bd = d; best = p; } }
  return best;
}

// ── 결과 · 손맛 ──
export const STAR_NOTES = [84, 88, 91];                 // 별 하나씩 — 도 · 미 · 솔(글로켄 · 높은 음역)
// 이어 맞힘 사다리 — 맞음 소리 두 음(넷째 위)이 한 칸씩 올라감: 솔 라 도 레 미 → 여섯째부터 화음
export const LADDER = [79, 81, 84, 86, 88];
export function goodNotes(k) {                           // k = 이어서 맞힌 수(1부터)
  if (k <= 0) k = 1;
  if (k > LADDER.length) return { chord: [84, 88, 91], top: 96 };
  const a = LADDER[k - 1];
  return { pair: [a, a + 5] };
}
// 별 셋 팡파르 — 주제곡 첫 동기 두 마디(솔미솔솔도 | 도) · 빠르기 132
export const FANFARE_BPM = 132;
export function fanfare() {
  const ev = [];
  [[67, 0, 1], [64, 1, 1], [67, 2, 0.5], [67, 2.5, 0.5], [72, 3, 1], [76, 4, 2], [72, 4, 2]].forEach(([p, b, d], k) => {
    ev.push(N('bird', 'lead', p, b, d * 0.9, k >= 5 ? 0.55 : 0.65));     /* 가벼운 소리로(한꺼번에 울려도 소리 장치 70개 안팎 · 크롬북) */
  });
  for (const p of COMP.C) ev.push(N('bear', 'keys', p, 0, 1.6, 0.3));
  for (const p of [...COMP.C, 72]) ev.push(N('bear', 'keys', p, 4, 2.4, 0.34));
  ev.push(N('turtle', 'bass', 48, 0, 1.8, 0.5), N('turtle', 'bass', 43, 3, 0.9, 0.5), N('turtle', 'bass', 48, 4, 2.2, 0.55));
  [3, 3.25, 3.5, 3.75].forEach((b, k) => ev.push(D('hog', 'snare', b, 0.28 + k * 0.07)));
  ev.push(D('hog', 'kick', 0, 0.55), D('hog', 'kick', 4, 0.6), D('hog', 'cymbal', 4, 0.38));
  return ev;
}
