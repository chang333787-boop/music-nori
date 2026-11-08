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

// ── 친구 다섯 = 다섯 줄 · 첫 판 14칸 = 14계단(11-08 장1 장단보 → 고슴도치 여섯째 계단 '장구') ──
//  곰 = 반주(처음부터) · 토끼 = 반짝 소리(소리 갈래) · 참새 = 가락(가락 갈래) · 고슴도치 = 북(박·리듬 갈래) · 거북 = 베이스(악보 갈래)
export const PARTS = [
  { key: 'bear', lane: null, name: '반주', max: 1 },
  { key: 'bunny', lane: 'sound', name: '반짝 소리', max: 3 },
  { key: 'bird', lane: 'melody', name: '가락', max: 3 },
  { key: 'hog', lane: 'rhythm', name: '북', max: 6 },
  { key: 'turtle', lane: 'score', name: '낮은 소리', max: 2 },
];
// 진행(prog) → 줄마다 계단 { bear:1, bunny:0~3, … } — 그 갈래 첫 판 칸 중 별 하나 이상 받은 칸 수
export function levelsOf(prog = {}) {
  const lv = { bear: 1, bunny: 0, bird: 0, hog: 0, turtle: 0 };
  for (const part of PARTS) {
    if (!part.lane) continue;
    const ids = FIRST.filter(id => cellById(id).lane === part.lane);
    lv[part.key] = Math.min(part.max, ids.filter(id => prog[id] && prog[id].stars >= 1).length);
  }
  return lv;
}
export const stepsOf = lv => PARTS.reduce((s, p) => s + (p.lane ? lv[p.key] || 0 : 0), 0);   // 0 ~ 13
// 새로 생긴 줄(지난번 들은 계단 → 지금) [{ key, from, to }]
export const newParts = (heard = {}, now = {}) => PARTS.filter(p => p.lane && (now[p.key] || 0) > (heard[p.key] || 0)).map(p => ({ key: p.key, from: heard[p.key] || 0, to: now[p.key] }));
// 칸 하나가 몇째 줄 · 몇째 계단을 여는지(결과 화면 한 줄) — 그 칸의 갈래 줄
export const partOfCell = id => { const c = cellById(id); return c ? PARTS.find(p => p.lane === c.lane) || null : null; };
// 그 갈래 줄의 계단마다 무엇이 더해지는지(결과 · 처음 화면 한 줄)
export const STEP_TEXT = {
  bunny: ['', '트라이앵글', '글로켄슈필', '첼레스타'],
  bird: ['', '가락 앞부분', '가락 뒷부분', '가락 화음'],
  hog: ['', '큰북', '작은북', '하이햇', '마디 끝 채움', '심벌', '장구'],
  turtle: ['', '낮은 소리', '걷는 낮은 소리'],
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
  // 거북 — 베이스: 1 근음 길게 · 2 근음-5음-옥타브-5음 걷기
  if (lv.turtle >= 1) for (const s of spans) {
    const r = ROOT[s.name];
    if (lv.turtle >= 2) [r, r + 7, r + 12, r + 7].slice(0, s.len).forEach((p, k) => ev.push(N('turtle', 'bass', p, s.b + k, 0.9, 0.55)));
    else ev.push(N('turtle', 'bass', r, s.b, s.len - 0.2, 0.6));
  }
  // 고슴도치 — 북
  const hg = lv.hog;
  if (hg >= 1) { ev.push(D('hog', 'kick', 0, 0.6), D('hog', 'kick', 2, 0.5)); if (hg >= 5 && inB) ev.push(D('hog', 'kick', 2.5, 0.35)); }
  if (hg >= 2) { const fill = hg >= 4 && phraseEnd; ev.push(D('hog', 'snare', 1, 0.45)); if (!fill) ev.push(D('hog', 'snare', 3, 0.45)); else [3, 3.25, 3.5, 3.75].forEach((b, k) => ev.push(D('hog', 'snare', b, 0.3 + k * 0.06))); }
  if (hg >= 3) for (let k = 0; k < 8; k++) ev.push(D('hog', 'hat', k / 2, k % 2 ? 0.22 : 0.32));
  if (hg >= 5 && secStart) ev.push(D('hog', 'cymbal', 0, 0.4));
  if (hg >= 6 && bar % 2 === 1) ev.push(D('hog', 'kung', 0, 0.38), D('hog', 'deok', 1.5, 0.3));   // 장구(장1 장단보) — 두 마디마다 쿵 · 덕
  // 참새 — 가락(플루트): 1 A만 · 2 모두 · 3 + B에 아래 화음 음
  const bd = lv.bird;
  if (bd >= 2 || (bd >= 1 && !inB)) for (const n of MEL[bar]) {
    ev.push(N('bird', 'flute', n.p, n.b, n.d * 0.92, 0.5));
    if (bd >= 3 && inB) { const h = harmonyBelow(n.p, chordAt(bar, n.b)); if (h != null) ev.push(N('bird', 'clarinet', h, n.b, n.d * 0.92, 0.3)); }
  }
  // 토끼 — 반짝: 1 트라이앵글(네 마디마다) · 2 + 글로켄 오름(마디 끝) · 3 + 첼레스타 엇박
  const bn = lv.bunny;
  if (bn >= 1 && bar % 4 === 0) ev.push(D('bunny', 'triangle', 0, 0.55));
  if (bn >= 2 && phraseEnd) { const c = COMP[chordAt(bar, 3)]; c.forEach((p, k) => ev.push(N('bunny', 'glock', p + 12, 3 + k / 3, 0.4, 0.35))); }
  if (bn >= 3) for (const b of [1.5, 3.5]) { const c = COMP[chordAt(bar, b)]; ev.push(N('bunny', 'celesta', c[2] + 12, b, 0.35, 0.22)); }
  return ev;
}
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
  if (lv.bird >= 1) ev.push(N('bird', 'flute', 72, 0, 2.5, 0.45));
  if (lv.hog >= 5) ev.push(D('hog', 'cymbal', 0, 0.35));
  if (lv.bunny >= 1) ev.push(D('bunny', 'triangle', 0, 0.5));
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
