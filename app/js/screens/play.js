// 놀이터 — 곡 하나를 열어 요소를 바꿔 보는 작업대(정본 docs/playground.md · 화면 약속 docs/ui.md · 말 약속 docs/cells.md)
//  왼쪽 위: 그림 악보 편집판(세로 = 높이 · 가로 = 시간 · 음 = 길이만큼 긴 블록 · 셈여림 = 블록 굵기) ↔ 오선(보기만)
//  오른쪽: 부탁 카드 하나 + 곡 전체(박자표 · 빠르기 · 셈여림 · 악기) · 아래: 고른 음 도구 + '듣기'(주황은 이것 하나)
//  무엇을 바꾸든 소리 · 악보 · 장면이 그 자리에서 함께 바뀐다. 곡 고치기는 모두 engine/edit.js(순수 함수 · tests/edit.test.mjs)
//  부탁은 잠그지 않는다(교사 선 '잠금 X' · 11-08): 카드 위 점 = 단추 · 누르면 그 부탁을 바로 연다(앞 부탁을 끝냈는지 묻지 않음).
//   진행 저장 play.done = 끝낸 부탁 번호(0부터) 목록 — 끝낸 것만 채움(8번만 먼저 끝내도 1~7은 빈 점 · 11-08) · 예전 play.card(가장 큰 번호)는 처음 한 번 목록으로 옮김
//  자동 시험: window.__playAuto() = 지금 부탁을 푸는 맞는 행동 하나 · window.__playState() = { card, done, ok, all }
import { h, svg, onPress, lsGet, lsSet, josa } from '../util.js';
import { Player } from '../audio.js';
import { friendImg, setPose, preload } from '../band.js';
import { renderStaff } from '../notation.js';
import { makeSong, toEvents, toStaffSong } from '../../../engine/song.js';
import { barTicks, beatTicks, colorOf, solfege, pc, DUR_NAME, REST_NAME } from '../../../engine/theory.js';
import * as E from '../../../engine/edit.js';
import { songById } from '../../../engine/songs/index.js';

// ── 고정 값 ──
const ROWS = [76, 74, 72, 71, 69, 67, 65, 64, 62, 60, 59, 57, 55];   // 위 → 아래: 높은 미 … 낮은 솔(다장조 음계)
const LO = 55, HI = 76, ROW_H = 36, RULER_H = 32;
const METERS = [[2, 4], [3, 4], [4, 4]];
const TEMPI = [{ k: 'slow', name: '느리게', bpm: 72, steps: 2 }, { k: 'mid', name: '보통', bpm: 100, steps: 3 }, { k: 'fast', name: '빠르게', bpm: 138, steps: 5 }];
const DYNS = [{ k: 'p', name: '여리게', lv: 1 }, { k: 'mf', name: '조금 세게', lv: 2 }, { k: 'f', name: '세게', lv: 3 }];
const DYN_H = { pp: 20, p: 22, mp: 26, mf: 28, f: 34, ff: 34 };     // 블록 굵기 = 소리 크기(높이 자리는 그대로)
const INSTS = [['xylo', '실로폰'], ['recorder', '리코더'], ['piano', '피아노'], ['flute', '플루트']];
const ORD = ['첫 번째', '두 번째', '세 번째', '네 번째', '다섯 번째', '여섯 번째', '일곱 번째', '여덟 번째', '아홉 번째', '열 번째', '열한 번째', '열두 번째', '열세 번째', '열네 번째', '열다섯 번째', '열여섯 번째'];
const ord = k => ORD[k] || `${k + 1}번째`;
const INK_TEXT = new Set(['#C9A227', '#D98A55']);                     // 밝은 색 블록(미 · 레)은 잉크 글자
// 곡 고르기 — 새로 지은 곡 + 여러 나라 옛 노래 몇 곡(대장 곡만 · 노랫말 X · 놀이터 넓이에 맞는 것)
const MADE = ['ga1-insa', 'ga1-swim', 'ga1-dol', 'ga2-ra', 'ga2-stair', 'ga2-slide', 'ga3-jump', 'ga3-home', 'ri4-balloon', 'ri5-march', 'ri5-waltz'];
//  옛 노래는 앞 도막(4~8마디)만 — 그림 악보에서 8분음표 블록이 글자를 담을 만큼 넓게
const FOLK = [
  { id: 'ahvous', bars: 8, name: '작은 별 가락 · 프랑스' },
  { id: 'auclair', bars: 4, name: 'Au clair de la lune · 프랑스' },
  { id: 'frere', bars: 8, name: 'Frère Jacques · 프랑스' },
  { id: 'haenschen', bars: 4, name: 'Hänschen klein · 독일' },
];
function folkDef(f) {
  const d = songById(f.id);
  return d && { ...d, mel: d.mel.split('|').slice(0, f.bars).map(x => x.trim()).join(' | '), short: f.name };
}
const tuneName = d => d.short || d.title;
const obj = (w, pair) => josa(w, pair).slice(w.length);   // 조사만(따옴표로 감쌀 때)
const FIRST = 'ga1-insa';
const TRI = {
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 22 19H2z" fill="currentColor"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20 2 5h20z" fill="currentColor"/></svg>',
  short: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12 19 2v20z" fill="currentColor"/></svg>',
  long: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12 5 22V2z" fill="currentColor"/></svg>',
};

// 놀이터에 올릴 수 있는 곡인가 — 2/4 · 3/4 · 4/4 · 못갖춘마디 X · 8분음표 칸에 맞음 · 낮은 솔 ~ 높은 미 · 너무 길지 않음
//  내가 지은 곡(mine)은 마디가 넘치거나 모자란 채로 저장했을 수 있어 마디 검사는 건너뜀(첫 마디가 짧으면 makeSong이 못갖춘마디로 봄)
function fits(s, mine = false) {
  if (s.errors.some(m => !/마디:/.test(m)) || s.meter[1] !== 4 || s.meter[0] < 2 || s.meter[0] > 4) return false;
  if (!mine && (s.errors.length || s.pickup)) return false;
  return s.ev.every(e => e.d % 6 === 0 && (e.p == null || (e.p >= LO && e.p <= HI && [0, 2, 4, 5, 7, 9, 11].includes(pc(e.p))))) && s.total / 6 <= 52;
}
function beatsWord(t) {
  const b = t / 12;
  if (b === 0.5) return '반 박';
  if (b === 0.25) return '반의 반 박';
  if (Number.isInteger(b)) return b + '박';
  if (Number.isInteger(b * 2)) return Math.floor(b) + '박 반';
  return Math.round(b * 10) / 10 + '박';
}
const lenName = (d, rest) => (rest ? REST_NAME[d] : DUR_NAME[d]) || beatsWord(d);
const barMsg = b => `${ord(b.k)} 마디가 ${beatsWord(b.over || b.left)} ${b.over ? '넘쳐요' : '모자라요'}`;
const tempoKey = bpm => (bpm < 86 ? 'slow' : bpm > 118 ? 'fast' : 'mid');
const sig = s => E.unitsOf(s).map(u => (u.p ?? 'R') + ':' + u.d).join(' ') + '|' + s.meter.join('/');
const sigP = s => E.unitsOf(s).map(u => u.p ?? 'R').join(' ');
const rhythm = s => E.unitsOf(s).map(u => (u.p == null ? 'R' : '') + u.d).join(' ') + '|' + s.meter.join('/');   // 리듬(길이 · 쉼표 자리 · 박자표)
const sameMeter = (a, b) => a[0] === b[0] && a[1] === b[1];
const notesOf = s => E.unitsOf(s).filter(u => u.p != null);
const unitAtIdx = (s, i) => (i >= 0 ? E.unitOf(s, i) : null);

// ── 부탁 카드 ──  보기 → 바꾸기 → 들어 보기가 한 번에 끝나는 크기. 판정은 곡 상태 + 들어 봄.
//  st: idle(아직) · ready(맞음 · 들어 볼 차례) · wrong(틀림 = 박이 어긋남) · diff(다르게 = 가락 · 길이가 다르게 바뀜)
//  차례: 명세 예시 1 · 2 · 7 · 3 · 4 · 5 · 6 · 8 — '길게(넘침이 생김)' 바로 뒤에 '넘친 마디 고치기'를 두어 원인과 고침이 이어지게
function offMsg(cur, target) {
  const pr = E.problems(cur);
  if (pr.length && !E.problems(target).length) return { st: 'wrong', msg: `박이 어긋났어요 — ${barMsg(pr[0])}` };
  if (sigP(cur) !== sigP(target)) return { st: 'diff', msg: "가락이 다르게 바뀌었어요 — '처음 곡으로'를 누르고 다시 해 봐요" };
  return { st: 'diff', msg: "길이가 다르게 바뀌었어요 — '처음 곡으로'를 누르고 다시 해 봐요" };
}
const CARDS = [
  { key: 'pitch',
    info(base) {
      const N = notesOf(base), u = N[2] || N[N.length - 1], nth = N.indexOf(u);
      const up = E.stepScale(u.p, 1) <= HI, p1 = E.stepScale(u.p, up ? 1 : -1);
      return { t: u.t, d: u.d, p0: u.p, p1, up, nth, target: u.i0, T: E.stepPitch(base, u.i0, up ? 1 : -1, { lo: LO, hi: HI }) };
    },
    text: c => `${ord(c.info.nth)} 음을 바로 ${c.info.up ? '위' : '아래'} 음으로 바꿔 들어 봐요`,
    check(cur, c) {
      const { T, t, d, p0, p1, up } = c.info;
      if (sig(cur) === sig(T)) return { st: 'ready', need: t + d, done: `맞아요 — ${josa(solfege(p0), '이/가')} ${josa(solfege(p1), '이/가')} 되었어요. 자리 · 색 · 소리가 함께 바뀌었어요` };
      if (sig(cur) === sig(c.base)) return { st: 'idle', msg: `'이 음'을 눌러 고른 뒤 ${up ? '▲ 높게' : '▼ 낮게'}` };
      const cu = E.unitAtTick(cur, t), a = sigP(cur).split(' '), b = sigP(c.base).split(' ');
      const k0 = E.unitsOf(c.base).findIndex(u => u.t === t);
      const diffs = a.length === b.length ? a.map((x, k) => (x !== b[k] ? k : -1)).filter(k => k >= 0) : null;
      const onlyHere = cu && cu.t === t && rhythm(cur) === rhythm(c.base) && diffs && diffs.length === 1 && diffs[0] === k0;
      if (onlyHere && cu.p != null) {
        if (up ? cu.p < p0 : cu.p > p0) return { st: 'diff', msg: `반대로 갔어요 — ${up ? '▲ 높게' : '▼ 낮게'}를 눌러요` };
        return { st: 'diff', msg: `너무 멀리 갔어요 — 바로 ${up ? '위' : '아래'} 음까지만` };
      }
      return offMsg(cur, T);
    },
    mark: c => c.info.t,
    auto(c, A) { const u = A.selUnit(); if (!u || u.t !== c.info.t) return A.chooseTick(c.info.t); return A.act(c.info.up ? 'up' : 'down'); } },

  { key: 'long',
    info(base) {
      const B = E.bars(base), U = E.unitsOf(base);
      const lastNote = k => U.filter(u => u.p != null && u.b0 === k).pop();
      let kb = B.length >= 3 ? 2 : B.length - 1, u = lastNote(kb);
      if (!u || u.d >= 24) for (let k = 0; k < B.length; k++) { const x = lastNote(k); if (x && x.d === 12) { kb = k; u = x; break; } }
      if (!u || u.d >= 24) { u = U.find(x => x.p != null && x.d < 24) || U.find(x => x.p != null); kb = u.b0; }
      const inBar = U.filter(x => x.p != null && x.b0 === kb), j = inBar.indexOf(u), last = j === inBar.length - 1;
      const T = E.setDur(base, u.i0, 24);
      return { t: u.t, d0: u.d, kb, j, last, target: u.i0, T, over: E.bars(T)[kb]?.over || 0 };
    },
    text: c => `${ord(c.info.kb)} 마디 ${c.info.last ? '마지막' : ord(c.info.j)} 음을 길게 — 두 박으로`,
    check(cur, c) {
      const { T, t, kb, over } = c.info;
      if (sig(cur) === sig(T)) return { st: 'ready', need: Math.min(cur.total, t + 48), done: over ? `맞아요 — 뒤 음이 밀려서 ${ord(kb)} 마디가 ${beatsWord(over)} 넘쳤어요(빗금). 넘친 채로도 들을 수 있어요` : '맞아요 — 두 박이 되었어요' };
      if (sig(cur) === sig(c.base)) return { st: 'idle', msg: "'이 음'을 눌러 고른 뒤 ▶ 길게" };
      const cu = E.unitAtTick(cur, t);
      if (cu && cu.t === t && sigP(cur) === sigP(c.base)) {
        if (cu.d > 24) return { st: 'wrong', msg: '두 박보다 길어요 — ◀ 짧게를 눌러요' };
        if (cu.d < 24) return { st: 'idle', msg: '조금 더 — ▶ 길게를 눌러 두 박까지' };
      }
      return offMsg(cur, T);
    },
    mark: c => c.info.t,
    auto(c, A) { const u = A.selUnit(); if (!u || u.t !== c.info.t) return A.chooseTick(c.info.t); return A.act(u.d < 24 ? 'long' : 'short'); } },

  { key: 'fix',
    setup(song) {
      if (E.problems(song).length) return { song };
      const U = E.unitsOf(song), B = E.bars(song);
      const pickBar = B.length >= 2 ? 1 : 0;
      const u = U.find(x => x.p != null && x.d === 12 && x.b0 === pickBar) || U.find(x => x.p != null && x.d === 12) || U.find(x => x.p != null && x.d < 48);
      if (!u) return { song };
      return { song: E.setDur(song, u.i0, E.nextLen(u.d, 1)), note: '음 하나가 길어져서 마디가 넘쳤어요' };
    },
    info(base) {
      const pr = E.problems(base);
      return { pr, kind: pr.length && !pr[0].over ? 'left' : 'over', beats: barTicks(base.meter) / 12, last: pr.length ? pr[pr.length - 1].k : 0, key: pr.map(b => `${b.k}:${b.over}:${b.left}`).join(' ') };
    },
    text: c => `${c.info.kind === 'over' ? '넘친' : '모자란'} 마디를 고쳐 ${c.info.beats}박으로 맞춰요`,
    check(cur, c) {
      const pr = E.problems(cur);
      if (!pr.length) {
        const B = E.bars(cur), b = B[Math.min(c.info.last, B.length - 1)];
        return { st: 'ready', need: b ? Math.min(cur.total, b.start + b.ticks) : cur.total, done: `맞아요 — 모든 마디가 ${c.info.beats}박이에요` };
      }
      if (pr.map(b => `${b.k}:${b.over}:${b.left}`).join(' ') === c.info.key)
        return { st: 'idle', msg: pr[0].over ? '빗금만큼 줄여요 — 음을 고르고 ◀ 짧게, 또는 지우기' : '빈 박을 눌러 음을 채우거나 ▶ 길게' };
      return { st: 'wrong', msg: `아직 박이 어긋나요 — ${barMsg(pr[0])}` };
    },
    auto(c, A) {
      const b = E.problems(A.song())[0];
      if (!b) return 'none';
      if (b.left) return A.fillBar(b.k);
      const U = E.unitsOf(A.song()).filter(u => u.b0 === b.k && u.d > 6);
      const big = U.reduce((m, u) => (!m || u.d > m.d ? u : m), null) || E.unitsOf(A.song()).filter(u => u.b0 === b.k).pop();
      const s = A.selUnit();
      if (!s || s.i0 !== big.i0) return A.chooseTick(big.t);
      return A.act(big.d > 6 ? 'short' : 'del');
    } },

  { key: 'rest',
    info(base) {
      const B = E.bars(base), kb = B.length >= 2 ? 1 : 0, U = E.unitsOf(base);
      const u = U.find(x => x.p != null && x.b0 === kb) || U.find(x => x.p != null);
      return { t: u.t, d: u.d, kb: u.b0, first: U.find(x => x.b0 === u.b0) === u, target: u.i0, T: E.toggleRest(base, u.i0) };
    },
    text: c => `${ord(c.info.kb)} 마디 ${c.info.first ? '첫' : '첫 번째'} 음을 쉼표로 바꿔 들어 봐요`,
    check(cur, c) {
      const { T, t, d } = c.info;
      if (sig(cur) === sig(T)) return { st: 'ready', need: Math.min(cur.total, t + d + 12), done: '맞아요 — 쉼표 자리는 소리 없이 박만 흘러요' };
      if (sig(cur) === sig(c.base)) return { st: 'idle', msg: "'이 음'을 눌러 고른 뒤 '쉼표로'" };
      const rests = s => E.unitsOf(s).filter(u => u.p == null).length;
      if (sig(cur).replace(/[\d]+:|R:/g, '') === sig(c.base).replace(/[\d]+:|R:/g, '') && rests(cur) > rests(c.base)) return { st: 'diff', msg: `다른 음이 쉼표가 되었어요 — ${ord(c.info.kb)} 마디 첫 음이에요` };
      return offMsg(cur, T);
    },
    mark: c => c.info.t,
    auto(c, A) { const u = A.selUnit(); if (!u || u.t !== c.info.t) return A.chooseTick(c.info.t); return A.act('rest'); } },

  { key: 'meter',
    info: base => ({ tgt: base.meter[0] === 3 ? [4, 4] : [3, 4] }),
    text: c => `박자표를 ${c.info.tgt.join('/')}로 바꾸고 센박이 어디로 갔는지 들어 봐요`,
    check(cur, c) {
      const { tgt } = c.info, cap = barTicks(tgt);
      if (sameMeter(cur.meter, tgt)) return { st: 'ready', need: Math.min(cur.total, cap * 2), done: `맞아요 — 센박(큰 점 · 큰북)이 ${tgt[0] === 3 ? '세' : '네'} 박마다 와요` };
      if (!sameMeter(cur.meter, c.base.meter)) return { st: 'diff', msg: `다른 박자표예요 — ${tgt.join('/')}를 눌러요` };
      return { st: 'idle', msg: `오른쪽 박자표에서 ${tgt.join('/')}를 눌러요` };
    },
    auto: (c, A) => A.meter(c.info.tgt) },

  { key: 'tempo',
    info: base => { const k = tempoKey(base.tempo) === 'fast' ? 'slow' : 'fast'; return { k, name: TEMPI.find(x => x.k === k).name }; },
    text: c => `빠르기를 '${c.info.name}'로 바꿔도 길고 짧은 차례는 그대로인지 들어 봐요`,
    check(cur, c) {
      const ok = tempoKey(cur.tempo) === c.info.k;
      if (ok && sig(cur) === sig(c.base)) return { st: 'ready', need: Math.min(cur.total, barTicks(cur.meter) * 2), done: `맞아요 — ${c.info.k === 'fast' ? '빨라져도' : '느려져도'} 긴 음은 길고 짧은 음은 짧아요. 음 길이 비율은 그대로예요` };
      if (ok) return { st: 'diff', msg: '음은 그대로 두고 빠르기만 바꿔요' };
      return { st: 'idle', msg: `오른쪽 빠르기에서 '${c.info.name}'를 눌러요` };
    },
    auto: (c, A) => A.tempo(c.info.k) },

  { key: 'dyn',
    setup(song) { return song.ev.every(e => e.dyn === 'f') ? { song: E.setDyn(song, 'mf') } : { song }; },
    info: () => ({}),
    text: () => '셈여림만 바꿔 잠든 곰을 깨워 봐요(높이는 그대로)',
    check(cur, c) {
      const loud = cur.ev.every(e => e.dyn === 'f');
      const sameNotes = sig(cur) === sig(c.base);
      if (loud && sameNotes) return { st: 'ready', need: Math.min(cur.total, barTicks(cur.meter) * 2), done: '맞아요 — 소리만 커져서 곰이 깼어요. 높이는 그대로예요' };
      if (!sameNotes) return { st: 'diff', msg: "높이는 그대로 두고 셈여림만 바꿔요 — '처음 곡으로'를 누르고 다시" };
      if (cur.ev.every(e => e.dyn === 'p')) return { st: 'idle', msg: '더 여려졌어요 — 곰이 더 깊이 자요' };
      return { st: 'idle', msg: '오른쪽 셈여림에서 f(세게)를 눌러요' };
    },
    scene: true,
    auto: (c, A) => A.dyn('f') },

  { key: 'make',
    setup(song) { return { song: E.appendBars(song, 2), note: '곡 끝에 빈 마디 두 개를 붙였어요' }; },
    info: base => ({ k0: base.bars.length - 2 }),
    text: () => '마음대로 두 마디 지어 보기(솔 · 미 · 라 · 도만)',
    check(cur, c) {
      const { k0 } = c.info, B = E.bars(cur);
      if (B.length < k0 + 2) return { st: 'idle', msg: "'처음 곡으로'를 누르면 빈 마디가 다시 생겨요" };
      const U = E.unitsOf(cur).filter(u => u.b0 >= k0), N = U.filter(u => u.p != null);
      const bad = N.find(u => ![0, 4, 7, 9].includes(pc(u.p)));
      if (bad) return { st: 'diff', msg: `솔 · 미 · 라 · 도만 써요 — ${josa(solfege(bad.p, { short: true }), '이/가')} 있어요` };
      const pr = E.problems(cur).filter(b => b.k >= k0);
      if (pr.length) return { st: 'wrong', msg: `박이 어긋났어요 — ${barMsg(pr[0])}` };
      const each = B.slice(k0).every(b => N.some(u => u.b0 === b.k));
      if (N.length < 3 || !each) return { st: 'idle', msg: `빈 자리를 눌러 음을 놓아요 — ${N.length}개 놓았어요` };
      return { st: 'ready', need: cur.total, done: "맞아요 — 내가 지은 두 마디를 '내가 지은 곡'에 넣었어요" };
    },
    allowed: [0, 4, 7, 9],
    auto(c, A) {
      const r = E.unitsOf(A.song()).find(u => u.b0 >= c.info.k0 && u.p == null);
      if (!r) return 'none';
      const n = notesOf(A.song()).filter(u => u.b0 >= c.info.k0).length;
      return A.insertAt(r.t, [67, 64, 69, 60, 67, 69, 64, 60][n % 8]);
    } },
];

export default function mount(root, ctx) {
  const { engine, bar } = ctx;
  preload([['bear', 'idle'], ['bear', 'play']]);
  let inst = INSTS.some(([k]) => k === lsGet('play.inst')) ? lsGet('play.inst') : 'piano';
  let view = 'roll';
  const args = (ctx.args || []).filter(Boolean);
  const wantCard = CARDS.findIndex(c => args.includes(c.key));   // #/play/pitch — 칸 결과에서 그 부탁으로 바로(11-10)
  const want = args.find(a => !CARDS.some(c => c.key === a));
  let tuneDef = (want && pickable(want)) || songById(FIRST);   // '처음 곡으로'가 돌아갈 곡
  let song = makeSong(tuneDef);
  let sel = -1;                           // 고른 덩어리의 첫 조각(song.ev 차례)
  const restMem = new Map();              // 쉼표로 바꾼 자리(틱) → 원래 높이(다시 음으로 할 때)
  let heard = -1;                         // 마지막으로 바꾼 뒤 '듣기'로 들은 데까지(틱)
  const old = Math.max(0, Math.min(CARDS.length, Number(lsGet('play.card', 0)) || 0));   // 예전 저장(끝낸 가장 큰 번호)
  const done = new Set((lsGet('play.done', null) || Array.from({ length: old }, (_, k) => k)).filter(k => k >= 0 && k < CARDS.length));
  const firstOpen = () => { for (let k = 0; k < CARDS.length; k++) if (!done.has(k)) return k; return CARDS.length; };
  let cardNo = wantCard >= 0 ? wantCard : firstOpen();               // 지금 연 부탁(0부터) — 처음엔 아직 안 끝낸 첫 부탁 · 점을 눌러 아무 부탁이나
  let card = null;                        // { def, base, info, st, msg, need, doneMsg, done, note, bear }
  let player = null, pre = null, raf = 0, playT0 = 0, playSec = 0, nowIdx = -1, msgUntil = 0, msgText = '';
  let L = null, staffEls = null, pickerEl = null, anim = null;
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };

  function pickable(id) {
    const f = FOLK.find(x => x.id === id), d = f ? folkDef(f) : songById(id), m = lsGet('play.saved', []).find(x => x && x.id === id);
    if (d) return fits(makeSong(d)) ? d : null;
    return m && fits(makeSong(m), true) ? m : null;
  }
  const noFocus = el => { el.addEventListener('mousedown', e => e.preventDefault()); return el; };   // 눌러도 스페이스 = 듣기가 그대로
  const press = (el, fn) => noFocus(onPress(el, fn));

  // ── 그릇 ──
  const viewSeg = h('div', { class: 'choice pview', role: 'group', 'aria-label': '악보 모양' });
  const line1 = h('div', { class: 'pline1', role: 'status', 'aria-live': 'polite' });
  const labels = h('div', { class: 'plabels', 'aria-hidden': 'true' });
  const canvas = h('div', { class: 'pcanvas', role: 'application', 'aria-label': '그림 악보 — 음 블록을 눌러 고르고, 빈 자리를 누르면 음이 들어가요' });
  const scroller = h('div', { class: 'pscroll' }, canvas);
  const roll = h('div', { class: 'proll' }, labels, scroller);
  const staffBox = h('div', { class: 'pstaff', hidden: true });
  const stage = h('section', { class: 'pstage' }, h('div', { class: 'phead' }, viewSeg, line1), roll, staffBox);
  const cardEl = h('section', { class: 'pcard' });
  const globalEl = h('div', { class: 'pglobal' });
  const shelf = h('div', { class: 'pshelf' });
  const wrap = h('div', { class: 'play' }, stage, h('aside', { class: 'pside' }, cardEl, globalEl), shelf);
  root.append(wrap);
  const playLine = h('div', { class: 'pplayline', hidden: true });

  // 머리띠: 가운데 곡 이름 · 오른쪽 '처음 곡으로' '곡 바꾸기'
  const titleEl = h('span', { class: 'ptitle' });
  bar.mid(titleEl);
  const resetBtn = press(h('button', { type: 'button' }, '처음 곡으로'), () => resetTune(true));
  const pickBtn = press(h('button', { type: 'button' }, '곡 바꾸기'), () => openPicker());
  bar.right(h('div', { class: 'bar-btns' }, resetBtn, pickBtn));

  // 보기 바꾸기(그림 악보 ↔ 오선)
  const viewBtns = [['roll', '그림 악보'], ['staff', '오선 악보']].map(([k, n]) => {
    const b = noFocus(h('button', { type: 'button', 'data-k': k, onclick: () => { view = k; renderAll(); } }, n));
    viewSeg.append(b); return b;
  });

  // 아래 선반: 고른 음 도구 + 듣기
  const tool = (k, lab) => press(h('button', { type: 'button', class: 'ptool', 'data-k': k }, TRI[k] ? h('span', { class: 'ico', html: TRI[k] }) : null, h('span', { class: 'lab' }, lab)), () => act(k));
  const tools = { up: tool('up', '높게'), down: tool('down', '낮게'), short: tool('short', '짧게'), long: tool('long', '길게'), rest: tool('rest', '쉼표로'), del: tool('del', '지우기') };
  const playBtn = press(h('button', { type: 'button', class: 'go big pplay' }, '듣기'), () => togglePlay());
  shelf.append(h('div', { class: 'ptools' }, ...Object.values(tools)), playBtn);

  // 오른쪽: 곡 전체
  function group(label, items, onPick, extra = null) {
    const seg = h('div', { class: 'choice pseg', role: 'group', 'aria-label': label });
    const btns = items.map(it => { const b = noFocus(h('button', { type: 'button', 'data-k': it.k, 'aria-label': it.aria || null, onclick: () => onPick(it.k) }, ...it.kids)); seg.append(b); return b; });
    globalEl.append(h('div', { class: 'pg' }, h('div', { class: 'pg-lab' }, label, extra), seg));
    return k => btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k)));
  }
  const steps = n => {
    const W = 52, g = svg('svg', { viewBox: `0 0 ${W} 20`, class: 'feet', 'aria-hidden': 'true' });
    for (let i = 0; i < n; i++) { const x = n === 1 ? W / 2 : 6 + i * (W - 12) / (n - 1); g.append(svg('ellipse', { cx: x, cy: i % 2 ? 14 : 6, rx: 3.6, ry: 5, fill: 'currentColor' })); }
    return g;
  };
  const setMeterUI = group('박자표', METERS.map(m => ({ k: m.join('/'), kids: [m.join('/')], aria: `${m[0]}/${m[1]} 박자` })), k => act('meter', k.split('/').map(Number)));
  const setTempoUI = group('빠르기', TEMPI.map(t => ({ k: t.k, kids: [steps(t.steps), h('span', {}, t.name)] })), k => act('tempo', k));
  const vol = h('span', { class: 'pvol', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));
  const setDynUI = group('셈여림', DYNS.map(d => ({ k: d.k, kids: [h('b', { class: 'dyn' }, d.k), h('span', {}, d.name)], aria: `${d.k} ${d.name}` })), k => act('dyn', k), vol);
  const setInstUI = group('악기', INSTS.map(([k, n]) => ({ k, kids: [n] })), k => act('inst', k));

  // ── 그림 자리 ──  마디 상자는 늘 cap 넓이 · 넘친 만큼은 상자 밖(빗금) · 모자란 만큼은 상자 안 빈 박
  function layout() {
    const cap = barTicks(song.meter), B = E.bars(song), X = [];
    let x = 0;
    for (const b of B) { X.push(x); x += Math.max(cap, b.ticks); }
    const D = x + 12;
    const w = Math.max(240, scroller.clientWidth - 6);
    const px = Math.max(16 / 6, Math.min(48 / 6, w / D));   // 8분음표 한 칸 16~48px(넘치면 판 안에서만 옆으로 밀림 · 좁은 블록은 글자 없이)
    return { cap, B, X, end: x, D, px, bt: beatTicks(song.meter) };
  }
  function barAtTick(t) { const { B } = L; let k = B.length - 1; while (k > 0 && B[k].start > t) k--; return k; }
  function xOfTick(t) {
    if (!L.B.length) return 0;
    const k = barAtTick(t), b = L.B[k];
    return (L.X[k] + Math.max(0, Math.min(t - b.start, Math.max(L.cap, b.ticks)))) * L.px;
  }
  // 쉼표 블록을 그릴 줄 = 쉼표로 바꾸기 전 높이(기억) 또는 이웃 음 높이
  const restRow = (i, t) => restMem.get(t) ?? E.neighborPitch(song, i);
  const rowOf = p => { const r = ROWS.indexOf(p); return r >= 0 ? r : p > HI ? 0 : ROWS.length - 1; };
  const freshFrom = () => (card && card.def.key === 'make' ? card.info.k0 : Infinity);

  function renderLabels() {
    labels.replaceChildren(h('div', { class: 'plab-ruler' }), ...ROWS.map(p => {
      const dim = card && card.def.allowed && !card.def.allowed.includes(pc(p));
      return h('div', { class: 'plab' + (dim ? ' dim' : ''), style: { '--c': colorOf(p), color: INK_TEXT.has(colorOf(p)) ? 'var(--ink)' : '#fff' } }, h('span', { class: 'chip' }, solfege(p, { short: true }), p >= 72 ? h('i', { class: 'oct up' }) : null, p < 60 ? h('i', { class: 'oct dn' }) : null));
    }));
  }

  function renderRoll() {
    L = layout();
    const { cap, B, X, D, px, bt } = L;
    const W = Math.ceil(D * px), H = RULER_H + ROWS.length * ROW_H;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    const kids = [];
    const allowed = card && card.def.allowed;
    ROWS.forEach((p, r) => kids.push(h('div', { class: 'prow' + (allowed && !allowed.includes(pc(p)) ? ' dim' : ''), style: { top: RULER_H + r * ROW_H + 'px', '--c': colorOf(p) } })));
    const fresh = freshFrom();
    B.forEach((b, k) => {
      const x0 = X[k] * px;
      kids.push(h('div', { class: 'pbox' + (k >= fresh ? ' fresh' : ''), style: { left: x0 + 'px', width: cap * px + 3 + 'px' } }));
      for (let j = bt; j < cap; j += bt) kids.push(h('div', { class: 'pbeat', style: { left: x0 + j * px + 'px' } }));
      kids.push(h('span', { class: 'pnum', style: { left: x0 + 6 + 'px' } }, String(k + 1)));
      for (let j = 0; j < cap; j += bt) kids.push(h('span', { class: 'pdot' + (j === 0 ? ' down' : ''), style: { left: x0 + j * px + 'px' } }));
      if (b.over) {
        kids.push(h('div', { class: 'phatch', style: { left: x0 + cap * px + 'px', width: b.over * px + 'px' } }));
        kids.push(h('span', { class: 'ptag over', style: { left: x0 + (cap + b.over / 2) * px + 'px' } }, `${beatsWord(b.over)} 넘침`));
      }
      if (b.left) {
        kids.push(h('div', { class: 'pempty', 'data-bar': k, style: { left: x0 + b.ticks * px + 'px', width: b.left * px + 'px' } }));
        kids.push(h('span', { class: 'ptag left', style: { left: x0 + (b.ticks + b.left / 2) * px + 'px' } }, `${beatsWord(b.left)} 빔`));
      }
    });
    if (fresh < B.length) kids.push(h('span', { class: 'ptag fresh', style: { left: (X[fresh] + cap) * px + 'px' } }, '여기에 지어요'));
    // 음 블록
    const U = E.unitsOf(song), su = unitAtIdx(song, sel);
    const markT = card && !card.done && card.def.mark && rhythm(song) === rhythm(card.base) ? card.def.mark(card) : null;
    const uOf = new Array(song.ev.length);
    U.forEach(u => { for (let i = u.i0; i <= u.i1; i++) uOf[i] = u; });
    let tagEl = null;
    B.forEach((b, k) => {
      for (let i = b.first; i <= b.last; i++) {
        const e = song.ev[i], u = uOf[i], rest = e.p == null;
        const p = rest ? restRow(i, e.t) : e.p, r = rowOf(p), c = colorOf(p);
        const th = rest ? 30 : DYN_H[e.dyn] || 28;
        const x = (X[k] + e.t - b.start) * px, w = e.d * px - (i !== u.i1 ? 0 : 2);
        const cls = ['pblk'];
        if (rest) cls.push('rest');
        if (i !== u.i0) cls.push('cont');
        if (i !== u.i1) cls.push('tieout');
        if (su && u.i0 === su.i0) cls.push('sel');
        const isMark = markT != null && u.t === markT;
        if (isMark) cls.push('mark');
        const top = RULER_H + r * ROW_H + (ROW_H - th) / 2;
        const lab = !rest && i === u.i0 && w >= 25 ? solfege(e.p, { short: true }) : '';
        kids.push(h('div', { class: cls.join(' '), 'data-i': i, 'aria-label': rest ? `쉼표 ${beatsWord(e.d)}` : `${solfege(e.p)} ${lenName(u.d)}`,
          style: { left: x + 'px', width: w + 'px', top: top + 'px', height: th + 'px', '--c': c, color: rest ? 'var(--ink-2)' : INK_TEXT.has(c) ? 'var(--ink)' : '#fff' } }, lab));
        if (isMark && i === u.i0 && !tagEl) { tagEl = h('span', { class: 'pmarktag', style: { left: x + w / 2 + 'px', top: Math.max(RULER_H + 2, top - 34) + 'px' } }, '이 음'); kids.push(tagEl); }
      }
    });
    kids.push(playLine);
    canvas.replaceChildren(...kids);
    nowIdx = -1;
    // 바꾼 블록이 그 자리에서 오르내리고(높이) 늘고 줄어듦(길이) — 새로 그린 뒤 예전 모양에서 출발
    if (anim) {
      const el = canvas.querySelector(`.pblk[data-i="${E.indexAtTick(song, anim.tick)}"]`);
      if (el && el.animate) {
        if (anim.dy) el.animate([{ transform: `translateY(${anim.dy}px)` }, { transform: 'none' }], { duration: 170, easing: 'ease-out' });
        if (anim.w0) el.animate([{ width: anim.w0 + 'px' }, { width: el.style.width }], { duration: 200, easing: 'ease-out' });
      }
      anim = null;
    }
  }

  function renderStaffView() {
    const W0 = Math.max(400, staffBox.clientWidth - 28), H0 = Math.max(200, staffBox.clientHeight - 24);
    const ss = toStaffSong(song), lines = Math.ceil(ss.bars / 4), Wl = Math.max(640, Math.round(W0 / 1.3));
    const st = renderStaff(ss, { width: Wl, chords: false, barsPerLine: 4 });
    const k = Math.max(0.6, Math.min(W0 / Wl, H0 / (lines * 150 + 10)));
    st.el.style.width = Math.round(Wl * k) + 'px'; st.el.style.height = 'auto';
    staffEls = st.noteEls;
    staffBox.replaceChildren(st.el);
    const si = soundIdx(sel);
    if (si >= 0) (staffEls.get(si) || []).forEach(el => el.classList.add('sel'));
  }
  // 고른 덩어리 → 오선 음 차례(소리 나는 음 차례)
  function soundIdx(i) { const u = unitAtIdx(song, i); if (!u || u.p == null) return -1; return notesOf(song).findIndex(x => x.i0 === u.i0); }

  function renderTools() {
    const u = unitAtIdx(song, sel);
    const note = u && u.p != null;
    tools.up.disabled = !note; tools.down.disabled = !note;
    tools.short.disabled = !u || u.d <= E.LENS[0]; tools.long.disabled = !u || u.d >= E.LENS[E.LENS.length - 1];
    tools.rest.disabled = !u;
    tools.rest.querySelector('.lab').textContent = u && !note ? '음으로' : '쉼표로';
    tools.del.disabled = !u || E.unitsOf(song).length <= 1;
  }
  function renderGlobal() {
    setMeterUI(song.meter.join('/'));
    setTempoUI(tempoKey(song.tempo));
    const d = song.ev.length && song.ev.every(e => e.dyn === song.ev[0].dyn) ? song.ev[0].dyn : 'mf';
    setDynUI(d);
    const lv = (DYNS.find(x => x.k === d) || DYNS[1]).lv;
    [...vol.children].forEach((el, k) => el.classList.toggle('on', k < lv));
    setInstUI(inst);
  }
  function renderLine() {
    if (performance.now() < msgUntil) { line1.replaceChildren(h('b', {}, msgText)); return; }
    const u = unitAtIdx(song, sel);
    if (u) line1.replaceChildren(h('span', { class: 'pdot-c', style: { '--c': u.p != null ? colorOf(u.p) : 'transparent' } }), u.p != null ? `${solfege(u.p)} · ${lenName(u.d)}(${beatsWord(u.d)})` : `쉼표 · ${beatsWord(u.d)}`);
    else line1.replaceChildren('음 블록을 눌러 골라요 · ', h('span', { class: 'kbd' }, '← →'), ' 고르기 ', h('span', { class: 'kbd' }, '↑ ↓'), ' 높이 ', h('span', { class: 'kbd' }, '스페이스'), ' 듣기');
  }
  function say(text, ms = 3600) { msgText = text; msgUntil = performance.now() + ms; renderLine(); later(renderLine, ms + 30); }

  function renderAll() {
    titleEl.textContent = tuneName(tuneDef);
    viewBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === view)));
    roll.hidden = view !== 'roll'; staffBox.hidden = view !== 'staff';
    renderLabels();
    if (view === 'roll') renderRoll(); else { L = layout(); renderStaffView(); }
    renderTools(); renderGlobal(); renderLine(); renderCard();
  }

  // ── 카드 ──
  function startCard(note = null) {
    if (cardNo >= CARDS.length) { card = null; renderAll(); return; }
    const def = CARDS[cardNo];
    let setupNote = null;
    if (def.setup) { const r = def.setup(song); if (r.song !== song) { song = r.song; sel = -1; restMem.clear(); } setupNote = r.note || null; }
    const base = song;
    card = { def, base, info: def.info(base), st: 'idle', msg: '', need: 0, done: false, note: note || setupNote, bear: def.scene ? friendImg('bear', 'idle', { label: false, cls: 'pbear' }) : null };
    heard = -1;
    evalCard(false);
    renderAll();
    if (def.key === 'make') scroller.scrollLeft = scroller.scrollWidth;   // 판이 넓으면 붙인 빈 마디가 보이게
  }
  function evalCard(rerender = true) {
    if (!card || card.done) return;
    const r = card.def.check(song, card);
    card.st = r.st; card.msg = r.msg || ''; card.need = r.need ?? 0; card.doneMsg = r.done || '';
    if (r.st === 'ready' && heard >= card.need) return finishCard();
    if (rerender) renderCard();
  }
  function finishCard() {
    card.done = true; card.st = 'done';
    if (card.bear) setPose(card.bear, 'bear', 'play');
    if (card.def.key === 'make') saveCurrent(true);
    if (!done.has(cardNo)) { done.add(cardNo); lsSet('play.done', [...done].sort((a, b) => a - b)); }
    sfxGood();
    renderAll();
  }
  function nextCard() { cardNo = Math.min(CARDS.length, cardNo + 1); stopAll(); startCard(); }
  // 점을 눌러 부탁 열기 — 잠금 X · 진행(끝낸 목록)은 그대로 · 곡도 그대로(새로 하려면 '처음 곡으로')
  function openCard(k) {
    if (k === cardNo && card) return;
    const kb = document.activeElement && document.activeElement.closest && document.activeElement.closest('.pc-dots');
    cardNo = k; stopAll(); startCard();
    if (kb) { const b = cardEl.querySelector(`.pc-dots button[data-k="${k}"]`); if (b) b.focus(); }   // 키보드로 골랐으면 그 점에 그대로
  }
  function renderCard() {
    // 점 = 부탁 단추(44 × 44 칸 여덟 개가 카드 맨 위 한 줄 · 보이는 점은 그 안에 14px) · 채움 = 끝냄 · 고리 = 지금(아직 안 끝낸) 부탁
    //  '부탁 n / 8' 글은 뺐다 — 단추 여덟 칸이 카드 폭을 다 써서(지금 자리는 고리 · 화면 읽기는 aria-current)
    const dots = h('div', { class: 'pc-dots', role: 'group', 'aria-label': '부탁 고르기' }, ...CARDS.map((_, k) => {
      const on = done.has(k) || (k === cardNo && card && card.done), now = k === cardNo && card && !card.done;
      return press(h('button', { type: 'button', class: [on ? 'on' : '', now ? 'now' : ''].join(' ').trim(), 'data-k': k, 'aria-label': `부탁 ${k + 1}`, 'aria-current': k === cardNo && card ? 'step' : null }, h('i', {})), () => openCard(k));
    }));
    if (!card) {
      const again = press(h('button', { type: 'button' }, '처음 부탁부터'), () => { cardNo = 0; stopAll(); startCard(); });
      cardEl.replaceChildren(dots,
        h('p', { class: 'pc-text' }, done.size >= CARDS.length ? `부탁 ${CARDS.length}개를 다 했어요` : `부탁 ${CARDS.length}개 중 ${done.size}개를 했어요`),
        h('p', { class: 'pc-hint' }, done.size >= CARDS.length ? "이제 마음대로 바꿔 봐요. '곡 바꾸기'에서 다른 곡도 열 수 있어요." : '빈 점을 누르면 남은 부탁을 할 수 있어요.'), h('div', { class: 'pc-act' }, again));
      return;
    }
    const kids = [dots,
      h('p', { class: 'pc-text' }, card.def.text(card))];
    const nextBtn = card.done ? press(h('button', { type: 'button', class: 'pc-next' }, cardNo + 1 < CARDS.length ? '다음 부탁' : '부탁 끝'), () => nextCard()) : null;
    if (card.bear) kids.push(h('div', { class: 'pc-scene' + (card.done ? ' awake' : '') }, card.bear, h('span', { class: 'zz' }, card.done ? '깼어요!' : '쿨쿨'), card.done ? h('div', { class: 'pc-act in' }, nextBtn) : null));
    let hint, k = card.st;
    if (card.done) hint = card.doneMsg;
    else if (card.st === 'ready') hint = "됐어요 — 이제 '듣기'로 들어 봐요";
    else hint = card.msg;
    if (card.note && card.st === 'idle' && !card.done) hint = `${card.note}. ${hint}`;
    kids.push(h('p', { class: 'pc-hint', 'data-k': k }, hint));
    if (card.done && !card.bear) kids.push(h('div', { class: 'pc-act' }, nextBtn));
    cardEl.replaceChildren(...kids);
  }

  // ── 바꾸기 ──
  function commit(next, ch) {
    if (next === song) { if (ch.same) say(ch.same); return; }
    stopAll();
    song = next; heard = -1;
    if (ch.timing) restMem.clear();
    if (ch.anim && view === 'roll') anim = ch.anim;
    if (ch.tick != null) sel = E.indexAtTick(song, ch.tick);
    if (sel >= song.ev.length) sel = song.ev.length - 1;
    const pr = E.problems(song), here = ch.tick != null ? pr.find(b => b.start <= ch.tick && ch.tick < b.start + Math.max(b.ticks, b.cap)) : null;
    say(ch.msg + (ch.timing && pr.length ? ` · ${barMsg(here || pr[0])}` : ''));
    renderAll();
    evalCard();
    preview(ch);
  }
  function act(k, arg) {
    const u = unitAtIdx(song, sel);
    switch (k) {
      case 'up': case 'down': {
        if (!u) return say('먼저 음 블록을 눌러 골라요');
        if (u.p == null) return say("쉼표는 높이가 없어요 — '음으로'를 눌러요");
        const dir = k === 'up' ? 1 : -1, to = E.stepScale(u.p, dir);
        return commit(E.stepPitch(song, sel, dir, { lo: LO, hi: HI }), { kind: 'pitch', tick: u.t, anim: { tick: u.t, dy: (rowOf(u.p) - rowOf(to)) * ROW_H }, msg: `${solfege(u.p)} → ${solfege(to)}`, same: dir > 0 ? '더 높은 음은 이 판에 없어요' : '더 낮은 음은 이 판에 없어요' });
      }
      case 'short': case 'long': {
        if (!u) return say('먼저 음 블록을 눌러 골라요');
        const to = E.nextLen(u.d, k === 'long' ? 1 : -1), rest = u.p == null;
        return commit(E.setDur(song, sel, to), { kind: 'dur', tick: u.t, timing: true, anim: L ? { tick: u.t, w0: song.ev[u.i0].d * L.px - 2 } : null, msg: `${lenName(u.d, rest)} → ${lenName(to, rest)} · 뒤 음이 ${to > u.d ? '밀려요' : '당겨져요'}`, same: k === 'long' ? '온음표보다 길게는 안 돼요' : '8분음표보다 짧게는 안 돼요' });
      }
      case 'rest': {
        if (!u) return say('먼저 음 블록을 눌러 골라요');
        if (u.p != null) { restMem.set(u.t, u.p); return commit(E.toggleRest(song, sel), { kind: 'rest', tick: u.t, msg: '쉼표 — 소리 없이 박만 흘러요' }); }
        const p = restMem.get(u.t) ?? null, next = E.toggleRest(song, sel, p);
        return commit(next, { kind: 'unrest', tick: u.t, msg: `다시 음으로 — ${solfege(next.ev[sel].p)}` });
      }
      case 'del': {
        if (!u) return say('먼저 음 블록을 눌러 골라요');
        const next = E.remove(song, sel);
        if (next === song) return say('음이 하나뿐이라 지울 수 없어요');
        const t = Math.min(u.t, Math.max(0, next.total - 1));
        return commit(next, { kind: 'del', tick: t, timing: true, at: u.t, msg: u.p != null ? `${josa(solfege(u.p), '을/를')} 지웠어요 · 뒤 음이 당겨져요` : '쉼표를 지웠어요 · 뒤 음이 당겨져요' });
      }
      case 'meter': {
        const t = u ? u.t : null;
        return commit(E.setMeter(song, arg), { kind: 'meter', tick: t, timing: true, msg: `${arg[0]}박씩 다시 묶었어요 · 큰 점이 센박` });
      }
      case 'tempo': {
        const T = TEMPI.find(x => x.k === arg);
        return commit(E.setTempo(song, T.bpm), { kind: 'tempo', tick: u ? u.t : null, msg: `${T.name} — 음 길이 비율은 그대로예요` });
      }
      case 'dyn': {
        const D = DYNS.find(x => x.k === arg);
        return commit(E.setDyn(song, arg), { kind: 'dyn', tick: u ? u.t : null, msg: `${D.k} ${D.name} — 소리 크기만 바뀌어요 · 높이는 그대로` });
      }
      case 'inst': {
        if (arg === inst) return;
        stopAll(); inst = arg; lsSet('play.inst', arg);
        say(`${INSTS.find(x => x[0] === arg)[1]} 소리 — 같은 악보, 다른 음색`);
        renderGlobal(); preview({ kind: 'inst' });
        return;
      }
    }
  }
  function choose(i, sound = true) {
    const u = unitAtIdx(song, i);
    if (!u) return;
    sel = u.i0;
    renderAll();
    if (sound && u.p != null) blip(u.p, u.d, song.ev[u.i0].dyn);
  }
  function move(dir) {
    const U = E.unitsOf(song);
    if (!U.length) return;
    const k = U.findIndex(u => u.i0 === sel);
    const n = k < 0 ? (dir > 0 ? 0 : U.length - 1) : Math.max(0, Math.min(U.length - 1, k + dir));
    choose(U[n].i0);
  }
  // 빈 자리 누르기 — 그 높이 · 그 때에 4분음표(쉼표 안이면 메움 · 모자란 마디 빈 박이면 그 마디를 채움 · 끝 뒤면 붙임)
  function tapEmpty(dx, p) {
    const { B, X, cap } = L;
    for (let k = 0; k < B.length; k++) {
      if (dx < X[k] || dx >= X[k] + Math.max(cap, B[k].ticks)) continue;
      const local = dx - X[k];
      if (local >= B[k].ticks) return fillBar(k, p);
      return insertAt(B[k].start + local, p);
    }
    return insertAt(song.total + 1, p);
  }
  function insertAt(at, p) {
    const t = E.insertTick(song, at);
    return commit(E.insertNote(song, at, p), { kind: 'insert', tick: t, timing: true, p, msg: `${josa(solfege(p), '을/를')} 넣었어요` });
  }
  function fillBar(k, p = 67) {
    const b = E.bars(song)[k];
    if (!b) return 'none';
    return commit(E.appendToBar(song, k, p, Math.min(12, b.left || 12)), { kind: 'insert', tick: b.start + b.ticks, timing: true, p, msg: `${josa(solfege(p), '을/를')} 넣었어요` });
  }

  // ── 소리 ──
  const secOf = () => 60 / song.tempo / 12;
  function blip(p, d, dyn = 'mf') {
    const ac = engine.ensure();
    stopPre();
    engine.note(inst, p, ac.currentTime + 0.02, Math.min(1.1, d * secOf() * 0.92), ({ p: 0.5, mf: 0.75, f: 0.9 })[dyn] ?? 0.75);
  }
  function drumEvents(from, to, sec) {
    const cap = barTicks(song.meter), bt = beatTicks(song.meter), out = [];
    for (let t = Math.ceil(from / bt) * bt; t < to; t += bt) {
      const down = t % cap === 0;
      out.push({ t: (t - from) * sec, kind: 'drum', drum: down ? 'kick' : 'hat', vel: down ? 0.6 : 0.22 });
    }
    return out;
  }
  // 곡의 한 토막만(바꾼 자리 바로 듣기)
  function snippet(from, to, drums = false) {
    stopPre();
    if (to <= from) return;
    const ac = engine.ensure();
    const { events, sec } = toEvents(song, { inst, startTick: from });
    const evs = events.filter(e => e.tick < to).map(e => ({ ...e, d: Math.min(e.d, (to - e.tick) * sec) }));
    const all = drums ? [...evs, ...drumEvents(from, to, sec)].sort((a, b) => a.t - b.t) : evs;
    pre = new Player(engine);
    pre.start(all, { total: (to - from) * sec, at: ac.currentTime + 0.05 });
  }
  function preview(ch) {
    const U = E.unitsOf(song), u = unitAtIdx(song, sel), k = u ? U.findIndex(x => x.i0 === u.i0) : -1, cap = barTicks(song.meter);
    const around = () => { if (k < 0) return; const a = U[Math.max(0, k - 1)], z = U[Math.min(U.length - 1, k + 1)]; snippet(a.t, z.t + z.d); };
    switch (ch.kind) {
      case 'pitch': case 'insert': case 'unrest': if (u && u.p != null) blip(u.p, u.d, song.ev[u.i0].dyn); break;
      case 'dur': if (u) { const z = U[Math.min(U.length - 1, k + 1)]; snippet(u.t, z.t + z.d); } break;
      case 'rest': around(); break;
      case 'del': { const a = U.filter(x => x.t < ch.at).pop(), z = U.find(x => x.t >= ch.at); if (a || z) snippet((a || z).t, (z || a).t + (z || a).d); break; }
      case 'meter': case 'tempo': snippet(0, Math.min(song.total, cap), true); break;
      case 'dyn': case 'inst': snippet(0, U.length > 3 ? U[3].t : song.total); break;
    }
  }
  function stopPre() { if (pre) { pre.stop(); pre = null; } }
  function stopPlay() {
    if (player) player.stop();
    player = null;
    cancelAnimationFrame(raf);
    playBtn.textContent = '듣기';
    playLine.hidden = true;
    setNow(-1);
    if (card && card.bear && !card.done) setPose(card.bear, 'bear', 'idle');
  }
  function stopAll() { stopPre(); stopPlay(); }
  function togglePlay() { if (player && player.playing) { stopPlay(); return; } startPlay(); }
  function startPlay() {
    stopAll();
    if (!song.ev.length) return;
    engine.ensure();
    const { events, total, sec } = toEvents(song, { inst });
    const all = [...events, ...drumEvents(0, song.total, sec)].sort((a, b) => a.t - b.t);
    player = new Player(engine);
    playSec = sec;
    const me = player;
    playT0 = player.start(all, { total, onEnd: () => { if (player !== me) return; heard = Math.max(heard, song.total); stopPlay(); evalCard(); } });
    playBtn.textContent = '멈추기';
    if (view === 'roll') playLine.hidden = false;
    if (card && card.bear && song.ev.every(e => e.dyn === 'f')) setPose(card.bear, 'bear', 'play');
    raf = requestAnimationFrame(frame);
  }
  function setNow(i) {
    if (i === nowIdx) return;
    if (view === 'roll') {
      canvas.querySelectorAll('.pblk.now').forEach(el => el.classList.remove('now'));
      if (i >= 0) { const u = unitAtIdx(song, i); if (u) for (let j = u.i0; j <= u.i1; j++) { const el = canvas.querySelector(`.pblk[data-i="${j}"]`); if (el) el.classList.add('now'); } }
    } else if (staffEls) {
      staffBox.querySelectorAll('.st-note.now').forEach(el => el.classList.remove('now'));
      const k = soundIdx(i);
      if (k >= 0) (staffEls.get(k) || []).forEach(el => el.classList.add('now'));
    }
    nowIdx = i;
  }
  function frame() {
    if (!player || !player.playing) return;
    const t = (engine.now - playT0) / playSec;
    if (t >= 0) {
      if (t > heard) heard = t;
      const tt = Math.min(t, song.total);
      if (view === 'roll') {
        const x = xOfTick(tt);
        playLine.style.transform = `translateX(${x}px)`;
        if (x > scroller.scrollLeft + scroller.clientWidth - 60 || x < scroller.scrollLeft) scroller.scrollLeft = Math.max(0, x - 120);
      }
      let i = -1;
      for (let k = 0; k < song.ev.length; k++) { const e = song.ev[k]; if (e.t <= t && t < e.t + e.d) { i = e.p == null ? -1 : k; break; } }
      setNow(i);
      if (card && !card.done && card.st === 'ready' && heard >= card.need) finishCard();
    }
    raf = requestAnimationFrame(frame);
  }
  function sfxGood() { const t = engine.ensure().currentTime + 0.05; engine.note('marimba', 79, t, 0.12, 0.45); engine.note('marimba', 84, t + 0.09, 0.2, 0.45); }

  // ── 곡 고르기 · 처음 곡으로 · 저장 ──
  function resetTune(announce) {
    stopAll();
    song = makeSong(tuneDef); sel = -1; restMem.clear(); heard = -1;
    startCard(announce ? '처음 곡으로 돌아왔어요' : null);
  }
  function loadTune(def) { tuneDef = def; resetTune(false); say(`'${tuneName(def)}'${obj(tuneName(def), '을/를')} 열었어요`); }
  function saveCurrent(quiet) {
    const n = (Number(lsGet('play.savedN', 0)) % 9) + 1;
    lsSet('play.savedN', n);
    const def = { id: 'my-' + Date.now().toString(36), title: `내가 지은 곡 ${n}`, short: `내가 지은 곡 ${n}`, mel: E.toMel(song), meter: [...song.meter], tempo: song.tempo };
    lsSet('play.saved', [def, ...lsGet('play.saved', [])].slice(0, 3));
    if (!quiet) say(`'${def.title}'${obj(def.title, '으로/로')} 이 기기에 저장했어요`);
  }
  function openPicker() {
    stopAll();
    closePicker();
    const cur = id => String(id === tuneDef.id);
    const btn = d => press(h('button', { type: 'button', 'aria-current': cur(d.id) }, tuneName(d)), () => { closePicker(); loadTune(d); });
    const made = MADE.map(songById).filter(Boolean).filter(d => fits(makeSong(d)));
    const folk = FOLK.map(folkDef).filter(Boolean).filter(d => fits(makeSong(d)));
    const mine = lsGet('play.saved', []).filter(d => d && d.mel && fits(makeSong(d), true));
    const saveBtn = press(h('button', { type: 'button' }, '지금 곡 저장하기'), () => { saveCurrent(false); closePicker(); });
    const closeBtn = press(h('button', { type: 'button' }, '닫기'), () => closePicker());
    pickerEl = h('div', { class: 'overlay ppick-ov' }, h('div', { class: 'panelcard ppick', role: 'dialog', 'aria-label': '곡 바꾸기' },
      h('div', { class: 'ppick-top' }, h('h2', {}, '곡 바꾸기'), h('div', { class: 'ppick-acts' }, saveBtn, closeBtn)),
      h('h3', {}, '새로 지은 곡'), h('div', { class: 'plist' }, ...made.map(btn)),
      h('h3', {}, '여러 나라 옛 노래'), h('div', { class: 'plist' }, ...folk.map(btn)),
      h('h3', {}, '내가 지은 곡(이 기기 · 3개까지)'),
      mine.length ? h('div', { class: 'plist' }, ...mine.map(btn)) : h('p', { class: 'pempty-t' }, "아직 없어요 — 마지막 부탁을 하거나 '지금 곡 저장하기'를 눌러요")));
    wrap.append(pickerEl);
  }
  function closePicker() { if (pickerEl) { pickerEl.remove(); pickerEl = null; } }

  // ── 누르기 · 키보드 ──
  canvas.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    const blk = e.target.closest('.pblk');
    if (blk && !blk.classList.contains('rest')) { choose(Number(blk.dataset.i)); return; }   // 쉼표(점선)는 빈 자리 — 누르면 그 줄 높이 음이 들어감
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (y < RULER_H) return;
    const row = Math.floor((y - RULER_H) / ROW_H);
    if (row < 0 || row >= ROWS.length) return;
    tapEmpty(x / L.px, ROWS[row]);
  });
  function onKey(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (pickerEl) { if (e.key === 'Escape') closePicker(); return; }
    const onBtn = e.target && e.target.closest && e.target.closest('button,a');
    switch (e.key) {
      case 'ArrowLeft': case 'ArrowRight': e.preventDefault(); if (e.shiftKey) act(e.key === 'ArrowLeft' ? 'short' : 'long'); else move(e.key === 'ArrowLeft' ? -1 : 1); break;
      case 'ArrowUp': case 'ArrowDown': e.preventDefault(); if (sel < 0) move(1); else act(e.key === 'ArrowUp' ? 'up' : 'down'); break;
      case ' ': if (onBtn) return; e.preventDefault(); if (!e.repeat) togglePlay(); break;
      case 'Delete': case 'Backspace': e.preventDefault(); act('del'); break;
      case 'r': case 'R': act('rest'); break;
      default:
    }
  }
  document.addEventListener('keydown', onKey);
  let rz = 0;
  const onResize = () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => renderAll()); };
  window.addEventListener('resize', onResize);

  // ── 자동 시험 고리 ──
  const A = {
    song: () => song,
    selUnit: () => unitAtIdx(song, sel),
    chooseTick: t => { choose(E.indexAtTick(song, t), false); return 'choose'; },
    act: k => { act(k); return k; },
    meter: m => { act('meter', m); return 'meter'; },
    tempo: k => { act('tempo', k); return 'tempo'; },
    dyn: k => { act('dyn', k); return 'dyn'; },
    insertAt: (t, p) => { insertAt(t, p); return 'insert'; },
    fillBar: k => { fillBar(k); return 'fill'; },
  };
  window.__playAuto = () => {
    if (pickerEl) closePicker();
    if (!card) return 'all';
    if (card.done) { nextCard(); return 'next'; }
    if (card.st === 'ready') { if (!(player && player.playing)) startPlay(); return 'listen'; }
    return card.def.auto(card, A);
  };
  window.__playState = () => ({ card: Math.min(cardNo + 1, CARDS.length), done: done.size, doneList: [...done].sort((a, b) => a - b), ok: card ? card.done : true, all: !card, key: card ? card.def.key : 'end', st: card ? card.st : 'end' });

  // 처음: 곡을 열고 지금 부탁 카드를 건다(그림 자리는 그릇 크기가 잡힌 뒤)
  startCard();
  requestAnimationFrame(() => renderAll());

  return () => {
    stopAll();
    timers.forEach(clearTimeout); timers.clear();
    cancelAnimationFrame(rz);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    closePicker();
    delete window.__playAuto; delete window.__playState;
  };
}
