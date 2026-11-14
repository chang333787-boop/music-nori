// 놀이터 — 곡 하나를 열어 요소를 바꿔 보는 작업대(정본 docs/playground.md · 화면 약속 docs/ui.md · 말 약속 docs/cells.md)
//  왼쪽 위: 그림 악보 편집판(세로 = 높이 · 가로 = 시간 · 음 = 길이만큼 긴 블록 · 셈여림 = 블록 굵기) ↔ 오선(보기만)
//  오른쪽: 부탁 카드 하나 + 곡 전체(박자표 · 빠르기 · 셈여림 · 악기) · 아래: 고른 음 도구 + '듣기'(주황은 이것 하나)
//  무엇을 바꾸든 소리 · 악보 · 장면이 그 자리에서 함께 바뀐다. 곡 고치기는 모두 engine/edit.js(순수 함수 · tests/edit.test.mjs)
//  부탁은 잠그지 않는다(교사 선 '잠금 X' · 11-08): 카드 위 점 = 단추 · 누르면 그 부탁을 바로 연다(앞 부탁을 끝냈는지 묻지 않음).
//   진행 저장 play.done = 끝낸 부탁 번호(0부터) 목록 — 끝낸 것만 채움(8번만 먼저 끝내도 1~7은 빈 점 · 11-08) · 예전 play.card(가장 큰 번호)는 처음 한 번 목록으로 옮김
//  자동 시험: window.__playAuto() = 지금 부탁을 푸는 맞는 행동 하나 · window.__playState() = { card, done, ok, all }
//  묶음 D3(11-14): 부탁 9 · 10 · 11 = 따로 서는 '짓고 꾸미기' 카드(rmake · dress · chord — flow.js PLAY_SOLO) — 앞 여덟 번호 뒤에 붙여 예전 저장(play.done)이 그대로 맞음
//   카드마다 mode가 있으면 화면이 바뀐다: rhythm = 솔 한 줄 판 + 음표 · 쉼표 단추 · dress = 도막(두 마디)마다 셈여림 · 빠르기 · 악기 · chord = 마디마다 반주 화음
//   셋 모두 정답 없음 — 판정은 '다 했나'(두 마디가 꽉 참 · 도막을 다르게 꾸밈 · 마디마다 고름)만 보고, 듣고 나면 끝
//  묶음 D8(11-14): 부탁 12 · 13 = '보고 놓기' 카드(staff 오선 보고 놓기 · name 음이름 보고 놓기 — flow.js PLAY_SOLO) — 앞 열하나 뒤에 붙임(예전 저장 그대로)
//   mode read = 4분음표 칸 3~4개짜리 빈 판(engine/edit.js readBoard) · 카드에 보기(오선 그림 · 음이름 글) · 줄을 누르면 그 칸에 그 높이(또 누르면 빠짐)
//   정답이 있는 놓기 — 판정은 '자리가 같은지' 사실만(빨강 · X · 부정하는 말 X): 다 놓은 뒤 '4개 가운데 3개 … 오선의 두 번째 음은 한 칸 위예요'
//   다 같으면 판 가락을 저절로 들려주며 카드의 오선 음 · 음이름 글도 함께 반짝 → 끝까지 들으면 끝 · 끝낼 때마다 다음 보기(play.readNo)
//   줄 이름 · 블록 글자: 오선 = 계이름 · 음이름 = 음이름(선반의 계이름 ↔ 음이름 단추로 바꿈 · 다장조라 도 = 다)
import { h, svg, onPress, lsGet, lsSet, josa } from '../util.js';
import { Player } from '../audio.js';
import { friendImg, setPose, preload } from '../band.js';
import { renderStaff } from '../notation.js';
import { makeSong, toStaffSong } from '../../../engine/song.js';
import { barTicks, beatTicks, colorOf, solfege, pc, DUR_NAME, REST_NAME } from '../../../engine/theory.js';
import * as E from '../../../engine/edit.js';
import { songById } from '../../../engine/songs/index.js';
import { glyph } from '../cells/_glyph.js';
import { staffCard } from '../cells/_staff.js';

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
// 반주 화음 카드의 고르기(다장조 주요 3화음 — 화2 칸과 같은 이름) · 오선 화음 이름(글자)
const CHORDS = [{ k: 'I', name: '도미솔', rom: 'Ⅰ' }, { k: 'IV', name: '파라도', rom: 'Ⅳ' }, { k: 'V', name: '솔시레', rom: 'Ⅴ' }, { k: 'none', name: '없음', rom: '' }];
const chordWord = c => (CHORDS.find(x => x.k === c) || { name: '' }).name;
const CHORD_LETTER = { I: 'C', IV: 'F', V: 'G' };
const DYN_WORD = { pp: '아주 여리게', p: '여리게', mp: '조금 여리게', mf: '조금 세게', f: '세게', ff: '아주 세게' };
const instName = k => (INSTS.find(x => x[0] === k) || [k, k])[1];
const tempoName = bpm => TEMPI.find(x => x.k === tempoKey(bpm)).name;
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
// 보고 놓기(묶음 D8) — 판을 살펴 카드 상태로. 맞고 틀림은 '자리가 같은지' 사실만 · 다른 자리는 다 놓은 뒤 첫 칸 하나만 알려 줌
//  (놓는 중에는 몇 번째를 놓을 차례인지만 — 하나씩 맞춰 보기보다 오선 · 글을 끝까지 읽고 놓게)
const COUNT = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
//  목록은 줄바꿈 없는 띄어쓰기(\u00A0)로 묶어 '도 · / 미'처럼 목록 가운데서 줄이 갈리지 않게
const NB = '\u00A0·\u00A0';
const nameList = ps => '음이름\u00A0' + ps.map(E.noteName).join(NB);
const solList = ps => '계이름\u00A0' + ps.map(p => solfege(p, { short: true })).join(NB);
function readMsg(cur) {
  const r = E.readCheck(cur), name = cur.readKind === 'name', want = cur.readPs || [], nm = k => E.noteName(want[k]);
  if (r.all) return { st: 'ready', need: cur.total, done: name
    ? `${COUNT[r.n]} 음 모두 같은 음이름이에요 — ${nameList(want)} = ${solList(r.slots)}`
    : `${COUNT[r.n]} 음 모두 오선과 같은 높이예요 — ${solList(want)} = ${nameList(want)}` };
  if (!r.placed) return { st: 'idle', msg: name ? `첫 음 '${nm(0)}'부터 — 그 이름의 줄을 눌러 놓아요` : '오선의 첫 번째 음과 같은 높이의 줄을 눌러 놓아요' };
  if (r.next >= 0) return { st: 'idle', msg: name ? `${ord(r.next)} 음 '${nm(r.next)}'${obj(nm(r.next), '을/를')} 놓아요` : `오선의 ${ord(r.next)} 음을 놓아요` };
  const k = r.first;
  if (name) return { st: 'diff', msg: `${r.n}개 가운데 ${r.same}개가 같은 음이름이에요 — ${ord(k)} 음은 '${nm(k)}'예요(지금은 '${E.noteName(r.slots[k])}')` };
  const s = Math.abs(r.steps);
  return { st: 'diff', msg: `${r.n}개 가운데 ${r.same}개가 오선과 같은 높이예요 — 오선의 ${ord(k)} 음은 ${COUNT[s] || s} 칸 ${r.steps > 0 ? '위' : '아래'}예요` };
}
// 지금 놓을 칸(카드 보기 · 판의 칸에 같은 표시) — 빈 칸이 있으면 처음 빈 칸 · 다 놓았으면 다른 첫 칸 · 다 같으면 없음(-1)
const readCur = s => { const r = E.readCheck(s); return r.next >= 0 ? r.next : r.first; };

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

  // ── 묶음 D3 · 짓고 꾸미기(정답 없음) ──
  //  리듬 지어 보기 — 솔 하나로 된 빈 두 마디를 음표 · 쉼표로 마음대로(engine/edit.js rhythm*). 두 마디가 꽉 차면 알려 주고 북과 함께 들려줌
  { key: 'rmake', mode: 'rhythm', ready: "두 마디가 꽉 찼어요 — '듣기'로 북과 함께 들어 봐요",
    setup: song => ({ song: E.rhythmBoard({ meter: METERS.some(m => sameMeter(m, song.meter)) ? song.meter : [4, 4], tempo: 100 }) }),
    info: () => ({}),
    text: () => '솔 하나로 두 마디 리듬을 지어 봐요 — 음표와 쉼표를 마음대로',
    check(cur) {
      const B = E.rhythmBars(cur), nx = E.rhythmNext(cur), ov = B.find(b => b.over), beats = barTicks(cur.meter) / 12;
      const N = cur.ev.filter(e => e.p != null).length, R = cur.ev.length - N;
      if (ov) return { st: 'wrong', msg: `${ord(ov.k)} 마디가 ${beatsWord(ov.over)} 넘쳐요 — '하나 빼기'를 누르고 더 짧은 것을 놓아요` };
      if (!cur.ev.length) return { st: 'idle', msg: `아래 단추를 눌러 음표나 쉼표를 놓아요 — 한 마디에 ${beats}박이 들어가요` };
      if (nx) return { st: 'idle', msg: `${ord(nx.k)} 마디에 ${beatsWord(nx.left)}이 남았어요` };
      if (!N) return { st: 'idle', msg: "쉼표로만 꽉 찼어요 — '하나 빼기'로 자리를 내고 음표도 넣어 봐요" };
      return { st: 'ready', need: cur.total, done: `내가 지은 리듬이에요 — 음표 ${N}개${R ? ` · 쉼표 ${R}개` : ''}로 ${beats}박씩 두 마디를 채웠어요` };
    },
    auto(c, A) {
      const s = A.song(), nx = E.rhythmNext(s);
      if (!nx || E.rhythmBars(s).some(b => b.over)) return A.rpop();
      const PAT = [[12, false], [6, false], [6, false], [12, true], [12, false], [24, false], [12, true], [12, false]];
      const k = s.ev.length % PAT.length;
      const [d, r] = [...PAT.slice(k), ...PAT.slice(0, k)].find(([x]) => x <= nx.left) || [Math.min(12, nx.left), false];
      return A.radd(d, r);
    } },

  //  내 곡 꾸며 보기 — 지은 곡(없으면 처음 곡)의 도막(두 마디)마다 셈여림 · 빠르기 · 악기를 골라 입힘(engine/edit.js sections · setSec*)
  { key: 'dress', mode: 'dress', ready: "됐어요 — '듣기'로 꾸민 곡을 끝까지 들어 봐요",
    setup: (song, H) => H.mine(song),
    info: base => ({ n: E.sections(base).length }),
    text: c => (c.info.n > 1 ? '도막(두 마디)마다 셈여림 · 빠르기 · 악기를 골라 내 곡을 꾸며 봐요' : '셈여림 · 빠르기 · 악기를 골라 내 곡을 꾸며 봐요'),
    check(cur, c, H) {
      const now = H.looks(cur), was = H.looks(c.base), key = l => `${l.dyn}/${l.tempo}/${l.inst}`;
      const changed = now.some((l, s) => key(l) !== key(was[s] || l));
      if (!changed) return { st: 'idle', msg: c.info.n > 1 ? '마디를 눌러 도막을 고르고, 오른쪽에서 셈여림 · 빠르기 · 악기를 골라요' : '오른쪽에서 셈여림 · 빠르기 · 악기를 골라요' };
      if (c.info.n > 1 && new Set(now.map(key)).size < 2) return { st: 'idle', msg: '다른 도막도 골라 다르게 꾸며 봐요' };
      const what = [['dyn', '셈여림'], ['tempo', '빠르기'], ['inst', '악기']].filter(([f]) => new Set(now.map(l => l[f])).size > 1 || now.some((l, s) => was[s] && l[f] !== was[s][f])).map(x => x[1]);
      const list = what.join(' · ');
      return { st: 'ready', need: cur.total, done: `꾸민 대로 끝까지 들었어요 — ${josa(list, '을/를')} ${c.info.n > 1 ? '도막마다 골라' : '골라'} 입혔어요` };
    },
    auto(c, A) {
      const n = E.sections(A.song()).length, look = A.looks();
      const plan = [[0, 'dyn', 'p'], [0, 'tempo', 'slow'], [0, 'inst', 'recorder'], ...(n > 1 ? [[1, 'dyn', 'f'], [1, 'tempo', 'fast']] : [])];
      for (const [sec, f, v] of plan) {
        if (look[sec][f] === v) continue;
        if (A.sec() !== sec) return A.pickBar(sec * E.SEC_BARS);
        return A[f](v);
      }
      return 'none';
    } },

  //  반주 화음 붙여 보기 — 마디마다 도미솔 · 파라도 · 솔시레 · 없음(engine/edit.js setChord · chordFit). 어울림을 맞고 틀림으로 따지지 않음
  { key: 'chord', mode: 'chord', ready: "됐어요 — '듣기'로 반주와 함께 끝까지 들어 봐요",
    setup: (song, H) => H.mine(song),
    info: base => ({ n: E.bars(base).length }),
    text: () => '마디마다 반주 화음을 골라 붙여 들어 봐요',
    check(cur, c) {
      const C = E.chordBars(cur), picked = C.filter(x => x != null).length, n = C.length;
      if (!picked) return { st: 'idle', msg: '마디를 눌러 고르고, 아래에서 도미솔 · 파라도 · 솔시레 · 없음 가운데 골라요' };
      if (picked < n) return { st: 'idle', msg: `${n}마디 가운데 ${picked}마디를 골랐어요 — 다음 마디를 눌러 골라요` };
      if (!C.some(x => E.CHORD_TONES[x])) return { st: 'idle', msg: "모든 마디에 '없음'을 골랐어요 — 화음을 하나 이상 붙여 봐요" };
      const F = E.chordFit(cur).filter(x => x.c), inn = F.filter(x => x.in).length;
      return { st: 'ready', need: cur.total, done: `반주와 함께 들었어요 — 화음을 붙인 마디의 가락 음 ${F.length}개 가운데 ${inn}개가 화음 음과 같은 음이에요(점)` };
    },
    auto(c, A) {
      const C = E.chordBars(A.song()), k = C.findIndex(x => x == null);
      if (k < 0) return C.some(x => E.CHORD_TONES[x]) ? 'none' : A.chord('I');
      if (A.bar() !== k) return A.pickBar(k);
      return A.chord(['I', 'V', 'IV', 'I'][k % 4]);
    } },

  // ── 묶음 D8 · 보고 놓기(정답 있음 — 넣고 빼기 E) ──
  //  오선 보고 놓기 — 카드의 오선 가락(가온 도 ~ 높은 미 · 덧줄은 가온 도 하나)을 그림 악보 판(열 줄)의 같은 높이에 · 블록 글자 = 계이름
  { key: 'staff', mode: 'read', read: 'staff', ready: "오선과 같아요 — '듣기'로 오선과 그림 악보를 함께 들어 봐요",
    setup: (song, H) => ({ song: E.readBoard(E.readTarget('staff', H.readNo('staff'))) }),
    info: base => ({ n: base.readPs.length }),
    text: () => '오선 가락을 보고 그림 악보에 같은 높이로 놓아요',
    check: cur => readMsg(cur),
    auto: (c, A) => A.readAuto() },
  //  음이름 보고 놓기 — 음이름 글(다 라 마 바 사 가 나)을 보고 같은 이름의 줄(다 ~ 높은 다 여덟 줄)에 · 줄 이름 · 블록 글자 = 음이름
  { key: 'name', mode: 'read', read: 'name', ready: "모두 같은 음이름이에요 — '듣기'로 들어 봐요",
    setup: (song, H) => ({ song: E.readBoard(E.readTarget('name', H.readNo('name'))) }),
    info: base => ({ n: base.readPs.length }),
    text: () => '음이름을 보고 그림 악보에 같은 높이로 놓아요',
    check: cur => readMsg(cur),
    auto: (c, A) => A.readAuto() },
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
  let player = null, pre = null, raf = 0, playT0 = 0, nowIdx = -1, msgUntil = 0, msgText = '';
  let L = null, staffEls = null, pickerEl = null, anim = null, playTm = null;
  let selSec = 0, selBar = 0;             // 꾸미기 카드의 고른 도막 · 반주 화음 카드의 고른 마디(0부터)
  let names = false;                      // 보고 놓기 판의 줄 이름 · 블록 글자 = 음이름(true) · 계이름(false)
  const modeNow = () => (card && card.def.mode) || null;
  // 블록 · 줄 이름 글자 — 보고 놓기 판에서 음이름을 고르면 다 라 마 … · 나머지는 늘 계이름
  const pname = p => (modeNow() === 'read' && names ? E.noteName(p) : solfege(p, { short: true }));
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };

  function pickable(id) {
    const f = FOLK.find(x => x.id === id), d = f ? folkDef(f) : songById(id), m = lsGet('play.saved', []).find(x => x && x.id === id);
    if (d) return fits(makeSong(d)) ? d : null;
    return m && fits(makeSong(m), true) ? m : null;
  }
  // 카드 setup · check가 쓰는 것 — 지은 곡 열기 · 도막마다 꾸민 모습
  const H = {
    // 지은 곡(없으면 처음 곡): 지금 곡이 리듬 판이거나 처음 곡이면 이 기기에 저장한 가장 최근 곡을 연다 · 아이가 고른 곡이면 그대로
    mine(cur) {
      if (!cur.board && tuneDef.id !== FIRST) return { song: cur };
      const m = lsGet('play.saved', []).find(d => d && d.mel && fits(makeSong(d), true));
      if (m) { tuneDef = m; return { song: makeSong(m), note: `'${tuneName(m)}'${obj(tuneName(m), '을/를')} 열었어요` }; }
      return { song: cur.board ? makeSong(tuneDef) : cur };
    },
    looks(s) {
      const D = E.secDyns(s), T = E.secTempos(s), I = E.secInsts(s, inst);
      return D.map((dyn, k) => ({ dyn, tempo: tempoKey(T[k]), inst: I[k] }));
    },
    // 보고 놓기 — 몇 번째 보기를 낼지(끝낼 때마다 하나씩 넘어감 · 이 기기)
    readNo: kind => Number((lsGet('play.readNo', {}) || {})[kind]) || 0,
  };
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
  const palEl = h('div', { class: 'ppal', hidden: true, role: 'group', 'aria-label': '놓을 음표 · 쉼표' });   // 리듬 지어 보기의 음표 · 쉼표 단추
  const stage = h('section', { class: 'pstage' }, h('div', { class: 'phead' }, viewSeg, line1), roll, staffBox, palEl);
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
  const toolsEl = h('div', { class: 'ptools' }, ...Object.values(tools));
  // 리듬 지어 보기: 음표 · 쉼표 단추(무대 아래) + 하나 빼기 · 다 비우기(선반)
  const palBtn = (d, rest) => press(h('button', { type: 'button', class: 'ppal-b', 'data-d': d, 'data-rest': String(rest), 'aria-label': lenName(d, rest) },
    h('span', { class: 'ppal-g', html: glyph([rest ? -d / 12 : d / 12], { size: 46 }) }), h('span', { class: 'lab' }, lenName(d, rest))), () => act('radd', [d, rest]));
  palEl.append(h('div', { class: 'ppal-row' }, ...E.RHYTHM_NOTE.map(d => palBtn(d, false))), h('div', { class: 'ppal-row' }, ...E.RHYTHM_REST.map(d => palBtn(d, true))));
  const rTools = { pop: press(h('button', { type: 'button', class: 'ptool' }, '하나 빼기'), () => act('rpop')), clear: press(h('button', { type: 'button', class: 'ptool' }, '다 비우기'), () => act('rclear')) };
  const rToolsEl = h('div', { class: 'ptools', hidden: true }, rTools.pop, rTools.clear);
  // 꾸미기: 도막 단추(고르기) · 반주 화음: 고른 마디 + 화음 넷
  const secEl = h('div', { class: 'ptools psecs', hidden: true, role: 'group', 'aria-label': '도막 고르기' });
  const chordLab = h('span', { class: 'pshelf-lab' });
  const chordBtns = CHORDS.map(c => press(h('button', { type: 'button', class: 'ptool pchord', 'data-k': c.k, 'aria-pressed': 'false' }, h('span', { class: 'lab' }, c.name), c.rom ? h('span', { class: 'rom' }, c.rom) : null), () => act('chord', c.k)));
  const chordEl = h('div', { class: 'ptools', hidden: true, role: 'group', 'aria-label': '반주 화음' }, chordLab, ...chordBtns);
  // 보고 놓기: 줄 이름(계이름 ↔ 음이름) · 다 비우기
  const nameBtns = [[false, '계이름', '도 레 미'], [true, '음이름', '다 라 마']].map(([v, lab, sub]) => press(h('button', { type: 'button', class: 'ptool pname', 'data-v': String(v), 'aria-pressed': 'false' }, h('span', { class: 'lab' }, lab), h('span', { class: 'sub' }, sub)), () => act('names', v)));
  const readClearBtn = press(h('button', { type: 'button', class: 'ptool pclear' }, '다 비우기'), () => act('rdclear'));
  const readToolsEl = h('div', { class: 'ptools', hidden: true, role: 'group', 'aria-label': '줄 이름' }, h('span', { class: 'pshelf-lab' }, '줄 이름'), ...nameBtns, readClearBtn);
  shelf.append(toolsEl, rToolsEl, secEl, chordEl, readToolsEl, playBtn);

  // 오른쪽: 곡 전체
  // 곡 전체 고르기 한 묶음 — 돌려주는 함수(k → 고른 단추 표시)에 .wrap · .lab · .seg를 달아 둠(꾸미기 카드는 '도막 n …'으로 이름을 바꿔 씀)
  function group(label, items, onPick, extra = null) {
    const seg = h('div', { class: 'choice pseg', role: 'group', 'aria-label': label });
    const btns = items.map(it => { const b = noFocus(h('button', { type: 'button', 'data-k': it.k, 'aria-label': it.aria || null, onclick: () => onPick(it.k) }, ...it.kids)); seg.append(b); return b; });
    const lab = h('span', {}, label), wrap = h('div', { class: 'pg' }, h('div', { class: 'pg-lab' }, lab, extra), seg);
    globalEl.append(wrap);
    const set = k => btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k)));
    return Object.assign(set, { wrap, lab, seg, label });
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
    const cap = barTicks(song.meter), B = modeNow() === 'rhythm' ? E.rhythmBars(song) : E.bars(song), X = [];
    let x = 0;
    for (const b of B) { X.push(x); x += Math.max(cap, b.ticks); }
    const read = modeNow() === 'read';
    const D = x + (read ? 2 : 12);
    const w = Math.max(240, scroller.clientWidth - 6);
    // 8분음표 한 칸 16~48px(넘치면 판 안에서만 옆으로 밀림 · 좁은 블록은 글자 없이) · 보고 놓기 판은 칸 3~4개라 판 넓이를 채움(4분음표 칸 240px까지)
    const px = read ? Math.max(16 / 6, Math.min(240 / 12, w / D)) : Math.max(16 / 6, Math.min(48 / 6, w / D));
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
  // 줄 — 리듬 판은 솔 한 줄을 크게(남는 높이를 그 줄이 다 씀) · 나머지는 낮은 솔 ~ 높은 미 13줄
  //  보고 놓기 판은 오선 = 가온 도 ~ 높은 미 열 줄 · 음이름 = 다 ~ 높은 다 여덟 줄(남는 높이만큼 줄을 굵게 · 64px까지)
  const rowsNow = () => { const m = modeNow(); return m === 'rhythm' ? [song.boardP ?? E.RHYTHM_P] : m === 'read' ? E.READ_ROWS[song.readKind] || E.READ_ROWS.staff : ROWS; };
  const rowH = () => {
    const m = modeNow(), avail = (scroller.clientHeight || 300) - RULER_H - 4;
    if (m === 'rhythm') return Math.max(96, avail);
    if (m === 'read') return Math.max(ROW_H, Math.min(64, Math.floor(avail / rowsNow().length)));
    return ROW_H;
  };
  const rowOf = p => { const R = rowsNow(), r = R.indexOf(p); return r >= 0 ? r : p > R[0] ? 0 : R.length - 1; };
  // 그 자리(틱 · 판 위 가로)가 든 마디 — 꾸미기 · 반주 화음 카드에서 마디를 눌러 고를 때
  function barAtX(dx) { const { B, X, cap } = L; for (let k = 0; k < B.length; k++) if (dx >= X[k] && dx < X[k] + Math.max(cap, B[k].ticks)) return k; return dx < 0 ? 0 : B.length - 1; }
  const freshFrom = () => (card && card.def.key === 'make' ? card.info.k0 : Infinity);

  function renderLabels() {
    const RH = rowH();
    labels.replaceChildren(h('div', { class: 'plab-ruler' }), ...rowsNow().map(p => {
      const dim = card && card.def.allowed && !card.def.allowed.includes(pc(p));
      return h('div', { class: 'plab' + (dim ? ' dim' : ''), style: { height: RH + 'px', '--c': colorOf(p), color: INK_TEXT.has(colorOf(p)) ? 'var(--ink)' : '#fff' } }, h('span', { class: 'chip' }, pname(p), p >= 72 ? h('i', { class: 'oct up' }) : null, p < 60 ? h('i', { class: 'oct dn' }) : null));
    }));
  }

  function renderRoll() {
    L = layout();
    const { cap, B, X, D, px, bt } = L;
    const RS = rowsNow(), RH = rowH(), mode = modeNow();
    const W = Math.ceil(D * px), Hh = RULER_H + RS.length * RH;
    canvas.style.width = W + 'px'; canvas.style.height = Hh + 'px';
    canvas.classList.toggle('rh', mode === 'rhythm');
    canvas.classList.toggle('rd', mode === 'read');
    const kids = [];
    const allowed = card && card.def.allowed;
    RS.forEach((p, r) => kids.push(h('div', { class: 'prow' + (allowed && !allowed.includes(pc(p)) ? ' dim' : ''), 'data-p': p, style: { top: RULER_H + r * RH + 'px', height: RH + 'px', '--c': colorOf(p) } })));
    // 보고 놓기: 칸마다 세로 띠(지금 놓을 칸 = 옅은 파랑 + 위 굵은 줄 — 카드 보기의 같은 차례 음과 같은 표시)
    if (mode === 'read') { const cur = card && !card.done ? readCur(song) : -1; song.ev.forEach((e, k) => kids.push(h('div', { class: 'pslot' + (k === cur ? ' on' : ''), 'data-slot': k, style: { left: k * 12 * px + 'px', width: 12 * px + 'px' } }))); }
    const fresh = freshFrom();
    const S = mode === 'dress' ? E.sections(song) : null, C = mode === 'chord' ? E.chordBars(song) : null;
    const picked = k => (mode === 'dress' ? S[selSec] && k >= S[selSec].b0 && k <= S[selSec].b1 : mode === 'chord' ? k === selBar : false);
    B.forEach((b, k) => {
      const x0 = X[k] * px;
      kids.push(h('div', { class: 'pbox' + (k >= fresh ? ' fresh' : '') + (picked(k) ? ' psel' : ''), style: { left: x0 + 'px', width: cap * px + 3 + 'px' } }));
      // 반주 화음: 그 마디 화음의 음과 같은 음이름 줄을 칠함(가락 음이 그 줄에 있으면 화음 안) · 아래에 화음 이름 꼬리표(누르면 그 마디를 고름)
      if (C) {
        const pcs = E.chordPcsOf(C[k]);
        RS.forEach((p, r) => { if (pcs.includes(pc(p))) kids.push(h('div', { class: 'pchrow', style: { left: x0 + 'px', width: cap * px + 'px', top: RULER_H + r * RH + 'px', height: RH + 'px' } })); });
        const narrow = cap * px < 88, nm = C[k] == null ? (narrow ? '?' : '고르기') : narrow && C[k] !== 'none' ? (CHORDS.find(x => x.k === C[k]) || {}).rom : chordWord(C[k]);   // 좁은 마디(2/4 긴 곡)는 Ⅰ · Ⅳ · Ⅴ로
        kids.push(h('span', { class: 'ptag pchip' + (C[k] == null ? ' unset' : '') + (k === selBar ? ' on' : ''), style: { left: x0 + cap * px / 2 + 'px' } }, nm));
      }
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
    // 꾸미기: 도막마다 입힌 것(악기 / 빠르기 · 셈여림) — 도막 왼쪽 아래
    if (S) {
      const D2 = E.secDyns(song), T2 = E.secTempos(song), I2 = E.secInsts(song, inst);
      const narrow = cap * 2 * px < 176;   // 좁은 도막은 '도막' 글자를 빼고 줄을 나눔
      S.forEach((x, k) => kids.push(h('span', { class: 'pdress' + (k === selSec ? ' on' : ''), style: { left: X[x.b0] * px + 8 + 'px' } },
        h('b', {}, narrow ? `${k + 1} · ${instName(I2[k])}` : `도막 ${k + 1} · ${instName(I2[k])}`), h('span', {}, `${tempoName(T2[k])} · `, h('i', { class: 'dyn' }, D2[k])))));
    }
    // 음 블록
    const U = E.unitsOf(song), su = unitAtIdx(song, sel);
    const fitIn = C ? new Set(E.chordFit(song).filter(x => x.in).map(x => x.i0)) : null;
    const markT = card && !card.done && card.def.mark && rhythm(song) === rhythm(card.base) ? card.def.mark(card) : null;
    const uOf = new Array(song.ev.length);
    U.forEach(u => { for (let i = u.i0; i <= u.i1; i++) uOf[i] = u; });
    let tagEl = null;
    B.forEach((b, k) => {
      for (let i = b.first; i <= b.last; i++) {
        const e = song.ev[i], u = uOf[i], rest = e.p == null;
        if (mode === 'read' && rest) continue;   // 보고 놓기 판의 빈 칸은 그리지 않음(쉼표가 아니라 아직 안 놓은 자리)
        const p = mode === 'rhythm' ? RS[0] : rest ? restRow(i, e.t) : e.p, r = rowOf(p), c = colorOf(p);
        const th = mode === 'rhythm' ? Math.min(RH - 60, 168) : mode === 'read' ? Math.min(RH - 10, 40) : rest ? 30 : DYN_H[e.dyn] || 28;
        const x = (X[k] + e.t - b.start) * px, w = e.d * px - (i !== u.i1 ? 0 : 2);
        const cls = ['pblk'];
        if (rest) cls.push('rest');
        if (i !== u.i0) cls.push('cont');
        if (i !== u.i1) cls.push('tieout');
        if (su && u.i0 === su.i0) cls.push('sel');
        const isMark = markT != null && u.t === markT;
        if (isMark) cls.push('mark');
        const top = RULER_H + r * RH + (RH - th) / 2;
        // 리듬 판 블록 = 음표 · 쉼표 그림(높이는 솔 하나라 계이름 대신) · 나머지 = 계이름
        const gw = { 6: 46, 12: 58, 24: 78, 36: 100, 48: 98 }[e.d], gs = gw ? Math.min(84, th - 24, Math.floor((w - 10) * 84 / gw)) : 0;   // 그림 넓이(_glyph.js 한 개짜리) — 블록 안에 들게
        const lab = mode === 'rhythm' ? (gs >= 24 ? h('span', { class: 'pglyph', html: glyph([rest ? -e.d / 12 : e.d / 12], { size: gs, color: rest ? '#6B5A4A' : '#3B2A1E' }) }) : '')
          : !rest && i === u.i0 && w >= 25 ? pname(e.p) : '';
        const pin = fitIn && i === u.i0 && fitIn.has(u.i0) ? h('i', { class: 'pin', 'aria-hidden': 'true' }) : null;
        kids.push(h('div', { class: cls.join(' '), 'data-i': i, 'aria-label': rest ? `쉼표 ${beatsWord(e.d)}` : mode === 'read' ? `${ord(i)} 자리 ${pname(e.p)}` : `${solfege(e.p)} ${lenName(u.d)}${pin ? ' · 화음 안' : ''}`,
          style: { left: x + 'px', width: w + 'px', top: top + 'px', height: th + 'px', '--c': c, color: rest ? 'var(--ink-2)' : INK_TEXT.has(c) ? 'var(--ink)' : '#fff' } }, lab, pin));
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
        if (anim.dy && mode !== 'rhythm') el.animate([{ transform: `translateY(${anim.dy}px)` }, { transform: 'none' }], { duration: 170, easing: 'ease-out' });
        if (anim.w0) el.animate([{ width: anim.w0 + 'px' }, { width: el.style.width }], { duration: 200, easing: 'ease-out' });
      }
      anim = null;
    }
  }

  function renderStaffView() {
    const W0 = Math.max(400, staffBox.clientWidth - 28), H0 = Math.max(200, staffBox.clientHeight - 24);
    if (!song.ev.length) { staffEls = new Map(); staffBox.replaceChildren(h('p', { class: 'pempty-t pstaff-empty' }, '아직 놓은 음이 없어요 — 그림 악보에서 음표를 놓으면 오선에도 보여요')); return; }
    const ss = toStaffSong(song), lines = Math.ceil(ss.bars / 4), Wl = Math.max(640, Math.round(W0 / 1.3));
    // 반주 화음 카드: 오선 둘(위 = 가락 · 아래 = 화음 — notation.js MUSIC-HARM-1) · 마디 위에 화음 이름(C · F · G — 없음은 비움)
    const harm = modeNow() === 'chord' ? E.chordHarm(song) : [];
    if (harm.length) {
      const step = ss.sub === 3 ? 6 : 3, shift = song.pickup ? barTicks(song.meter) - song.pickup : 0;
      ss.harm = harm.map(x => ({ s: (x.t + shift) / step, d: x.d / step, p: x.p })).filter(x => Number.isInteger(x.s) && Number.isInteger(x.d));
      ss.prog = E.chordBars(song).map(c => CHORD_LETTER[c] || '-'); ss.progEvery = ss.beats;
    }
    const st = renderStaff(ss, { width: Wl, chords: false, barsPerLine: 4 });
    const k = Math.max(0.6, Math.min(W0 / Wl, H0 / (lines * (ss.harm && ss.harm.length ? 252 : 150) + 10)));
    st.el.style.width = Math.round(Wl * k) + 'px'; st.el.style.height = 'auto';
    staffEls = st.noteEls;
    staffBox.replaceChildren(st.el);
    const si = soundIdx(sel);
    if (si >= 0) (staffEls.get(si) || []).forEach(el => el.classList.add('sel'));
  }
  // 고른 덩어리 → 오선 음 차례(소리 나는 음 차례)
  function soundIdx(i) { const u = unitAtIdx(song, i); if (!u || u.p == null) return -1; return notesOf(song).findIndex(x => x.i0 === u.i0); }

  function renderTools() {
    const mode = modeNow();
    toolsEl.hidden = !!mode; rToolsEl.hidden = mode !== 'rhythm'; secEl.hidden = mode !== 'dress'; chordEl.hidden = mode !== 'chord'; palEl.hidden = mode !== 'rhythm';
    readToolsEl.hidden = mode !== 'read';
    resetBtn.hidden = pickBtn.hidden = mode === 'rhythm' || mode === 'read';   // 리듬 판 · 보고 놓기 판은 곡을 쓰지 않음('다 비우기'가 처음으로)
    if (mode === 'rhythm') { rTools.pop.disabled = rTools.clear.disabled = !song.ev.length; return; }
    if (mode === 'read') {
      nameBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(names))));
      readClearBtn.disabled = !song.ev.some(e => e.p != null);
      return;
    }
    if (mode === 'dress') {
      const S = E.sections(song);
      if (secEl.children.length !== S.length) secEl.replaceChildren(...S.map((x, k) => press(h('button', { type: 'button', class: 'ptool psec', 'data-k': k, 'aria-pressed': 'false' },
        h('span', { class: 'lab' }, `도막 ${k + 1}`), h('span', { class: 'sub' }, x.b0 === x.b1 ? `${x.b0 + 1}마디` : `${x.b0 + 1}~${x.b1 + 1}마디`)), () => pickBar(x.b0))));
      [...secEl.children].forEach((b, k) => b.setAttribute('aria-pressed', String(k === selSec)));
      return;
    }
    if (mode === 'chord') {
      const c = E.chordBars(song)[selBar];
      chordLab.textContent = `${selBar + 1}마디`;
      chordBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === c)));
      return;
    }
    const u = unitAtIdx(song, sel);
    const note = u && u.p != null;
    tools.up.disabled = !note; tools.down.disabled = !note;
    tools.short.disabled = !u || u.d <= E.LENS[0]; tools.long.disabled = !u || u.d >= E.LENS[E.LENS.length - 1];
    tools.rest.disabled = !u;
    tools.rest.querySelector('.lab').textContent = u && !note ? '음으로' : '쉼표로';
    tools.del.disabled = !u || E.unitsOf(song).length <= 1;
  }
  function renderGlobal() {
    const mode = modeNow(), dress = mode === 'dress';
    // 보이는 묶음: 리듬 판 = 박자표 · 빠르기 · 악기 / 꾸미기 = 고른 도막의 셈여림 · 빠르기 · 악기 / 반주 화음 = 빠르기 · 악기
    //  보고 놓기 = 빠르기 · 악기(판의 박자표 · 셈여림은 보기에 딸린 것)
    setMeterUI.wrap.hidden = dress || mode === 'chord' || mode === 'read';
    setDynUI.wrap.hidden = mode === 'rhythm' || mode === 'chord' || mode === 'read';
    for (const g of [setTempoUI, setDynUI, setInstUI]) g.lab.textContent = dress ? `도막 ${selSec + 1} ${g.label}` : g.label;
    setMeterUI(song.meter.join('/'));
    const look = dress ? H.looks(song)[selSec] : null;
    setTempoUI(look ? look.tempo : tempoKey(song.tempo));
    const d = look ? look.dyn : song.ev.length && song.ev.every(e => e.dyn === song.ev[0].dyn) ? song.ev[0].dyn : 'mf';
    setDynUI(d);
    const lv = (DYNS.find(x => x.k === d) || DYNS[1]).lv;
    [...vol.children].forEach((el, k) => el.classList.toggle('on', k < lv));
    setInstUI(look ? look.inst : inst);
  }
  function renderLine() {
    if (performance.now() < msgUntil) { line1.replaceChildren(h('b', {}, msgText)); return; }
    const mode = modeNow();
    if (mode === 'chord') { line1.replaceChildren('색칠한 줄 = 그 마디 화음의 음 · ', h('i', { class: 'pin-k', 'aria-hidden': 'true' }), ' = 가락 음이 화음 안에'); return; }
    if (mode === 'dress') { const x = E.sections(song)[selSec]; line1.replaceChildren(`도막 ${selSec + 1}(${x ? (x.b0 === x.b1 ? `${x.b0 + 1}마디` : `${x.b0 + 1}~${x.b1 + 1}마디`) : ''}) 꾸미는 중 · 마디를 누르면 그 도막을 골라요`); return; }
    if (mode === 'rhythm' && sel < 0) { const n = song.ev.filter(e => e.p != null).length; line1.replaceChildren(`${song.meter[0]}박씩 두 마디 · 음표 ${n}개 · 쉼표 ${song.ev.length - n}개`); return; }
    const u = unitAtIdx(song, sel);
    if (mode === 'read') {
      if (u && u.p != null) line1.replaceChildren(h('span', { class: 'pdot-c', style: { '--c': colorOf(u.p) } }), `${ord(sel)} 자리 · ${pname(u.p)}`);
      else line1.replaceChildren('줄을 눌러 음을 놓아요 · 같은 자리를 또 누르면 빠져요');
      return;
    }
    if (u) line1.replaceChildren(h('span', { class: 'pdot-c', style: { '--c': u.p != null ? colorOf(u.p) : 'transparent' } }), u.p != null ? `${solfege(u.p)} · ${lenName(u.d)}(${beatsWord(u.d)})` : `쉼표 · ${beatsWord(u.d)}`);
    else line1.replaceChildren('음 블록을 눌러 골라요 · ', h('span', { class: 'kbd' }, '← →'), ' 고르기 ', h('span', { class: 'kbd' }, '↑ ↓'), ' 높이 ', h('span', { class: 'kbd' }, '스페이스'), ' 듣기');
  }
  function say(text, ms = 3600) { msgText = text; msgUntil = performance.now() + ms; renderLine(); later(renderLine, ms + 30); }

  function renderAll() {
    const mode = modeNow();
    titleEl.textContent = mode === 'rhythm' ? '내가 짓는 리듬' : mode === 'read' ? (song.readKind === 'name' ? '음이름 가락' : '오선 가락') : tuneName(tuneDef);
    viewSeg.hidden = mode === 'read';   // 보고 놓기 판은 그림 악보만(오선 보기로 견주면 읽지 않고 그림만 맞추게 됨)
    viewBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === view)));
    roll.hidden = view !== 'roll'; staffBox.hidden = view !== 'staff';
    renderLabels();
    if (view === 'roll') renderRoll(); else { L = layout(); renderStaffView(); }
    renderTools(); renderGlobal(); renderLine(); renderCard();
  }

  // ── 카드 ──
  function startCard(note = null) {
    const def = CARDS[cardNo] || null;
    // 다른 부탁에서 넘어올 때(부탁을 다 한 뒤 포함) — 리듬 판에서 나오면 곡으로 돌아오고, 꾸밈(도막 빠르기 · 악기)과 반주 화음은 떼어 냄(셈여림은 음에 적힌 것이라 남음)
    if (song.board && (!def || def.mode !== 'rhythm')) { song = makeSong(tuneDef); sel = -1; restMem.clear(); }
    { const p = E.plain(song); if (p !== song) song = p; }
    if (!def) { card = null; renderAll(); return; }
    let setupNote = null;
    if (def.setup) { const r = def.setup(song, H); if (r.song !== song) { song = r.song; sel = -1; restMem.clear(); } setupNote = r.note || null; }
    selSec = 0; selBar = 0;
    if (def.mode) sel = -1;
    if (def.mode === 'read') { view = 'roll'; names = def.read === 'name'; }
    const base = song;
    card = { def, base, info: def.info(base), st: 'idle', msg: '', need: 0, done: false, note: note || setupNote, bear: def.scene ? friendImg('bear', 'idle', { label: false, cls: 'pbear' }) : null };
    heard = -1;
    evalCard(false);
    renderAll();
    if (def.key === 'make') scroller.scrollLeft = scroller.scrollWidth;   // 판이 넓으면 붙인 빈 마디가 보이게
  }
  function evalCard(rerender = true) {
    if (!card || card.done) return;
    const r = card.def.check(song, card, H);
    card.st = r.st; card.msg = r.msg || ''; card.need = r.need ?? 0; card.doneMsg = r.done || '';
    if (r.st === 'ready' && heard >= card.need) return finishCard();
    if (rerender) renderCard();
  }
  function finishCard() {
    card.done = true; card.st = 'done';
    if (card.bear) setPose(card.bear, 'bear', 'play');
    if (card.def.key === 'make') saveCurrent(true);
    if (card.def.read) { const o = lsGet('play.readNo', {}) || {}; lsSet('play.readNo', { ...o, [card.def.read]: H.readNo(card.def.read) + 1 }); }   // 다음에 열면 다음 보기
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
    // 점 = 부탁 단추(44 × 44 · 보이는 점은 그 안에 14px) · 채움 = 끝냄 · 고리 = 지금(아직 안 끝낸) 부탁
    //  한 줄에 여덟 칸(카드 폭 352)이라 부탁 9~11(짓고 꾸미기) · 12~13(보고 놓기 · D8)은 둘째 줄 — 앞 여덟(곡 바꾸기)과 줄로 나뉨(11-14 D3)
    //  '부탁 n / 11' 글은 뺐다(지금 자리는 고리 · 화면 읽기는 aria-current)
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
    if (card.def.read) kids.push(readView());
    const nextBtn = card.done ? press(h('button', { type: 'button', class: 'pc-next' }, cardNo + 1 < CARDS.length ? '다음 부탁' : '부탁 끝'), () => nextCard()) : null;
    if (card.bear) kids.push(h('div', { class: 'pc-scene' + (card.done ? ' awake' : '') }, card.bear, h('span', { class: 'zz' }, card.done ? '깼어요!' : '쿨쿨'), card.done ? h('div', { class: 'pc-act in' }, nextBtn) : null));
    let hint, k = card.st;
    if (card.done) hint = card.doneMsg;
    else if (card.st === 'ready') hint = player && player.playing ? '듣는 중이에요 — 끝까지 들으면 끝나요' : card.def.ready || "됐어요 — 이제 '듣기'로 들어 봐요";
    else hint = card.msg;
    if (card.note && card.st === 'idle' && !card.done) hint = `${card.note}. ${hint}`;
    kids.push(h('p', { class: 'pc-hint', 'data-k': k }, hint));
    if (card.done && !card.bear) kids.push(h('div', { class: 'pc-act' }, nextBtn));
    cardEl.replaceChildren(...kids);
  }
  // 보고 놓기 카드의 보기 — 오선 그림(_staff.js staffCard · 덧줄은 가온 도 하나) 또는 음이름 글. 음 하나 = .prd-item(차례대로)
  //  지금 놓을 차례 = 파랑(판의 그 칸 띠와 같은 색) · 들을 때 지금 음 = 금색(오선 보기와 같은 표시)
  function readView() {
    const ps = song.readPs || [], cur = card.done ? -1 : readCur(song);
    if (card.def.read === 'staff') {
      const el = h('div', { class: 'prd-staff', role: 'img', 'aria-label': `오선 가락 ${COUNT[ps.length]} 음` });
      el.innerHTML = staffCard(ps, { lo: -2, hi: 9, width: 190 });   // viewBox를 좁게 = 카드 폭에서 크게 보임
      el.querySelectorAll('ellipse').forEach((x, k) => { x.classList.add('prd-item'); if (k === cur) x.classList.add('cur'); });
      return el;
    }
    return h('div', { class: 'prd-names', role: 'img', 'aria-label': '음이름 ' + ps.map(E.noteName).join(' ') }, ...ps.map((p, k) => h('span', { class: 'prd-item prd-name' + (k === cur ? ' cur' : '') }, E.noteName(p))));
  }

  // ── 바꾸기 ──
  function commit(next, ch) {
    if (next === song) { if (ch.same) say(ch.same); return; }
    stopAll();
    song = next; heard = -1;
    if (ch.timing) restMem.clear();
    if (ch.anim && view === 'roll') anim = ch.anim;
    if (ch.tick != null) sel = E.indexAtTick(song, ch.tick);
    if (ch.desel) sel = -1;
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
      // ── 리듬 지어 보기 ──
      case 'radd': {
        const [d, rest] = arg;
        if (!E.rhythmNext(song)) return say("두 마디가 다 찼어요 — '하나 빼기'로 자리를 내요");
        const next = E.rhythmAdd(song, d, rest), b = E.bars(next).pop();
        let msg = `${josa(lenName(d, rest), '을/를')} 놓았어요`;
        if (E.rhythmFull(next) && next.ev.some(e => e.p != null)) msg = '두 마디가 꽉 찼어요 — 북과 함께 들어요';
        else if (b && b.ticks === b.cap) msg += ` · ${ord(b.k)} 마디가 꽉 찼어요`;
        else if (b && b.over) msg += ` · ${ord(b.k)} 마디가 ${beatsWord(b.over)} 넘쳐요`;
        return commit(next, { kind: 'radd', desel: true, msg });
      }
      case 'rpop': {
        if (!song.ev.length) return say('아직 놓은 것이 없어요');
        const z = song.ev[song.ev.length - 1];
        return commit(E.rhythmPop(song), { kind: 'rpop', desel: true, msg: `${josa(lenName(z.d, z.p == null), '을/를')} 뺐어요` });
      }
      case 'rclear': return commit(E.rhythmClear(song), { kind: 'rpop', desel: true, msg: '다 비웠어요 — 처음부터 지어요', same: '아직 놓은 것이 없어요' });
      // ── 보고 놓기 ──
      case 'rdclear': return commit(E.readClear(song), { kind: 'unplace', desel: true, msg: '다 비웠어요 — 첫 번째 자리부터 놓아요', same: '아직 놓은 음이 없어요' });
      case 'names': {
        if (names === arg) return;
        names = arg;
        say(arg ? '줄 이름을 음이름(다 라 마 …)으로 보여요' : '줄 이름을 계이름(도 레 미 …)으로 보여요');
        renderAll();
        return;
      }
      // ── 반주 화음 붙여 보기 ──
      case 'chord': {
        const next = E.setChord(song, selBar, arg);
        if (next === song) { preview({ kind: 'chord' }); return; }   // 같은 것을 또 누르면 그 마디를 다시 들려줌
        return commit(next, { kind: 'chord', msg: `${selBar + 1}마디 — ${arg === 'none' ? '화음 없음' : `${chordWord(arg)} 화음`}` });
      }
      case 'meter': {
        if (modeNow() === 'rhythm') return commit(E.rhythmMeter(song, arg), { kind: 'rmeter', desel: true, msg: `한 마디에 ${arg[0]}박 — 놓은 차례 그대로 다시 담았어요` });
        const t = u ? u.t : null;
        return commit(E.setMeter(song, arg), { kind: 'meter', tick: t, timing: true, msg: `${arg[0]}박씩 다시 묶었어요 · 큰 점이 센박` });
      }
      case 'tempo': {
        const T = TEMPI.find(x => x.k === arg);
        if (modeNow() === 'dress') return commit(E.setSecTempo(song, selSec, T.bpm), { kind: 'sec', msg: `도막 ${selSec + 1} — ${T.name}`, same: `도막 ${selSec + 1}은 벌써 '${T.name}'예요` });
        return commit(E.setTempo(song, T.bpm), { kind: 'tempo', tick: u ? u.t : null, msg: `${T.name} — 음 길이 비율은 그대로예요` });
      }
      case 'dyn': {
        const D = DYNS.find(x => x.k === arg);
        if (modeNow() === 'dress') return commit(E.setSecDyn(song, selSec, arg), { kind: 'sec', msg: `도막 ${selSec + 1} — ${D.k} ${D.name}`, same: `도막 ${selSec + 1}은 벌써 ${D.k}예요` });
        return commit(E.setDyn(song, arg), { kind: 'dyn', tick: u ? u.t : null, msg: `${D.k} ${D.name} — 소리 크기만 바뀌어요 · 높이는 그대로` });
      }
      case 'inst': {
        if (modeNow() === 'dress') return commit(E.setSecInst(song, selSec, arg, inst), { kind: 'sec', msg: `도막 ${selSec + 1} — ${instName(arg)} 소리`, same: `도막 ${selSec + 1}은 벌써 ${instName(arg)} 소리예요` });
        if (arg === inst) return;
        stopAll(); inst = arg; lsSet('play.inst', arg);
        say(`${INSTS.find(x => x[0] === arg)[1]} 소리 — 같은 악보, 다른 음색`);
        renderGlobal(); preview({ kind: 'inst' });
        return;
      }
    }
  }
  // 꾸미기 · 반주 화음: 마디 k를 누름 → 그 도막(꾸미기) · 그 마디(반주 화음)를 고르고 그 자리를 들려줌
  function pickBar(k, sound = true) {
    const mode = modeNow();
    if (mode === 'dress') selSec = Math.max(0, Math.min(E.sections(song).length - 1, E.sectionOfBar(k)));
    else if (mode === 'chord') selBar = Math.max(0, Math.min(E.bars(song).length - 1, k));
    else return;
    stopAll();
    renderAll();
    if (sound) preview({ kind: mode === 'dress' ? 'sec' : 'chord' });
  }
  function choose(i, sound = true) {
    const u = unitAtIdx(song, i);
    if (!u) return;
    sel = u.i0;
    renderAll();
    if (sound && u.p != null) blip(u.p, u.d, song.ev[u.i0].dyn, u.t);
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
  // 보고 놓기: k번째 칸에 높이 p — 빈 칸이면 놓고, 다른 높이면 옮기고, 같은 높이를 또 누르면(toggle) 뺌 · p = null이면 뺌
  function place(k, p, toggle = false) {
    const e = song.ev[k];
    if (!e) return 'none';
    const old = e.p ?? null;
    if (p == null || (toggle && old === p)) {
      if (old == null) return 'none';
      return commit(E.readPlace(song, k, null), { kind: 'unplace', tick: k * 12, msg: `${ord(k)} 자리를 비웠어요` });
    }
    return commit(E.readPlace(song, k, p), { kind: 'place', tick: k * 12, anim: old != null ? { tick: k * 12, dy: (rowOf(old) - rowOf(p)) * rowH() } : null, msg: `${ord(k)} 자리 — ${pname(p)}` });
  }
  function fillBar(k, p = 67) {
    const b = E.bars(song)[k];
    if (!b) return 'none';
    return commit(E.appendToBar(song, k, p, Math.min(12, b.left || 12)), { kind: 'insert', tick: b.start + b.ticks, timing: true, p, msg: `${josa(solfege(p), '을/를')} 넣었어요` });
  }

  // ── 소리 ──
  //  소리 사건은 모두 engine/edit.js playEvents(가락 · 박마다 북 · 도막마다 빠르기 · 악기 · 반주 화음 — 꾸밈 · 화음이 없으면 예전 toEvents와 같은 수)
  const secOf = () => 60 / song.tempo / 12;
  // 꾸미기 카드에서는 그 음이 든 도막의 악기
  const instAt = t => (modeNow() === 'dress' ? E.secInsts(song, inst)[Math.max(0, E.sections(song).findIndex(x => t < x.t1))] || inst : inst);
  function blip(p, d, dyn = 'mf', t = 0) {
    const ac = engine.ensure();
    stopPre();
    engine.note(instAt(t), p, ac.currentTime + 0.02, Math.min(1.1, d * secOf() * 0.92), ({ p: 0.5, mf: 0.75, f: 0.9 })[dyn] ?? 0.75);
  }
  // 곡의 한 토막만(바꾼 자리 바로 듣기)
  function snippet(from, to, drums = false) {
    stopPre();
    if (to <= from) return;
    const ac = engine.ensure();
    const { events, total } = E.playEvents(song, { inst, from, to, drums });
    pre = new Player(engine);
    pre.start(events, { total, at: ac.currentTime + 0.05 });
  }
  function preview(ch) {
    const U = E.unitsOf(song), u = unitAtIdx(song, sel), k = u ? U.findIndex(x => x.i0 === u.i0) : -1, cap = barTicks(song.meter);
    const around = () => { if (k < 0) return; const a = U[Math.max(0, k - 1)], z = U[Math.min(U.length - 1, k + 1)]; snippet(a.t, z.t + z.d); };
    switch (ch.kind) {
      case 'pitch': case 'insert': case 'unrest': if (u && u.p != null) blip(u.p, u.d, song.ev[u.i0].dyn, u.t); break;
      case 'dur': if (u) { const z = U[Math.min(U.length - 1, k + 1)]; snippet(u.t, z.t + z.d); } break;
      case 'rest': around(); break;
      case 'del': { const a = U.filter(x => x.t < ch.at).pop(), z = U.find(x => x.t >= ch.at); if (a || z) snippet((a || z).t, (z || a).t + (z || a).d); break; }
      case 'meter': case 'tempo': snippet(0, Math.min(song.total, cap), true); break;
      case 'dyn': case 'inst': snippet(0, U.length > 3 ? U[3].t : song.total); break;
      // 리듬 판: 두 마디가 꽉 차면 북과 함께 처음부터 끝까지(듣기와 같음 → 다 들으면 끝) · 아니면 놓은 음이 든 마디를 처음부터 놓은 데까지 북과 함께
      case 'radd': {
        if (E.rhythmFull(song) && song.ev.some(e => e.p != null)) { startPlay(); break; }
        const b = E.bars(song).pop();
        if (b) snippet(b.start, b.start + b.ticks, true);
        break;
      }
      case 'rmeter': if (song.total) snippet(0, Math.min(song.total, cap * 2), true); break;
      case 'sec': { const x = E.sections(song)[selSec]; if (x) snippet(x.t0, x.t1); break; }
      // 보고 놓기: 놓은 음을 바로 · 다 같아지면 판 가락을 처음부터 끝까지(듣기와 같음 → 다 들으면 끝)
      case 'place': if (card && !card.done && card.st === 'ready') { startPlay(); break; } if (u && u.p != null) blip(u.p, u.d, song.ev[u.i0].dyn, u.t); break;
      case 'chord': { const b = E.bars(song)[selBar]; if (b) snippet(b.start, b.start + b.ticks); break; }
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
    if (card && card.st === 'ready' && !card.done) renderCard();
  }
  function stopAll() { stopPre(); stopPlay(); }
  function togglePlay() { if (player && player.playing) { stopPlay(); return; } startPlay(); }
  function startPlay() {
    stopAll();
    if (!song.ev.length) return;
    engine.ensure();
    // 박마다 북 — 반주 화음을 붙인 곡은 화음이 박을 짚으므로 북을 빼고 화음만
    const drums = !(modeNow() === 'chord' && E.chordBars(song).some(c => E.CHORD_TONES[c]));
    const { events, total, tm } = E.playEvents(song, { inst, drums });
    player = new Player(engine);
    playTm = tm;
    const me = player;
    playT0 = player.start(events, { total, onEnd: () => { if (player !== me) return; heard = Math.max(heard, song.total); stopPlay(); evalCard(); } });
    playBtn.textContent = '멈추기';
    if (card && card.st === 'ready' && !card.done) renderCard();
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
    // 보고 놓기: 카드의 오선 음 · 음이름 글도 함께(판의 칸 k = song.ev k = 보기 k번째 음)
    if (modeNow() === 'read') cardEl.querySelectorAll('.prd-item').forEach((el, k) => el.classList.toggle('now', k === i));
    nowIdx = i;
  }
  function frame() {
    if (!player || !player.playing) return;
    const t = playTm.tick(engine.now - playT0);
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
    const blk = e.target.closest('.pblk'), mode = modeNow();
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    // 꾸미기 · 반주 화음: 판 어디를 눌러도 그 마디(도막)를 고름 — 음은 놓지 않음
    if (mode === 'dress' || mode === 'chord') { pickBar(barAtX(x / L.px)); return; }
    // 리듬 판: 블록은 골라 들어 보기만 · 빈 자리는 아래 단추로 놓는다고 알려 줌
    if (mode === 'rhythm') { if (blk && !blk.classList.contains('rest')) choose(Number(blk.dataset.i)); else say('아래 단추를 눌러 음표나 쉼표를 놓아요'); return; }
    // 보고 놓기: 칸(가로) · 줄(세로)을 눌러 그 높이를 놓음 — 블록 위를 눌러도 같은 규칙(같은 줄 = 빼기)
    if (mode === 'read') {
      if (y < RULER_H) return;
      const R = rowsNow(), row = Math.floor((y - RULER_H) / rowH()), k = Math.floor(x / L.px / 12);
      if (row < 0 || row >= R.length || k < 0 || k >= song.ev.length) return;
      place(k, R[row], true);
      return;
    }
    if (blk && !blk.classList.contains('rest')) { choose(Number(blk.dataset.i)); return; }   // 쉼표(점선)는 빈 자리 — 누르면 그 줄 높이 음이 들어감
    if (y < RULER_H) return;
    const row = Math.floor((y - RULER_H) / ROW_H);
    if (row < 0 || row >= ROWS.length) return;
    tapEmpty(x / L.px, ROWS[row]);
  });
  function onKey(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (pickerEl) { if (e.key === 'Escape') closePicker(); return; }
    const onBtn = e.target && e.target.closest && e.target.closest('button,a'), mode = modeNow();
    // 짓고 꾸미기 카드: ← → = 마디(도막) 고르기 · 리듬 판은 지우기 = 하나 빼기 · 높이 바꾸기 없음
    if (mode && e.key !== ' ') {
      if ((mode === 'dress' || mode === 'chord') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const dir = e.key === 'ArrowLeft' ? -1 : 1, n = E.bars(song).length;
        if (mode === 'dress') pickBar(Math.max(0, Math.min(E.sections(song).length - 1, selSec + dir)) * E.SEC_BARS);
        else pickBar(Math.max(0, Math.min(n - 1, selBar + dir)));
        return;
      }
      if (mode === 'rhythm' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); move(e.key === 'ArrowLeft' ? -1 : 1); return; }
      if (mode === 'rhythm' && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); act('rpop'); return; }
      // 보고 놓기: ← → 칸 고르기 · ↑ ↓ 그 칸의 음을 한 줄씩(빈 칸이면 맨 아래 · 맨 위 줄부터) · 지우기 = 그 칸 빼기
      if (mode === 'read') {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); move(e.key === 'ArrowLeft' ? -1 : 1); return; }
        const k = Math.max(0, sel), R = rowsNow();
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const up = e.key === 'ArrowUp', cur = song.ev[k] ? song.ev[k].p : null;
          const r = cur == null ? (up ? R.length - 1 : 0) : Math.max(0, Math.min(R.length - 1, R.indexOf(cur) + (up ? -1 : 1)));
          if (cur != null && R[r] === cur) say(up ? '더 높은 줄은 이 판에 없어요' : '더 낮은 줄은 이 판에 없어요'); else place(k, R[r]);
          return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); place(k, null); return; }
      }
      return;
    }
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
    // 짓고 꾸미기 카드
    radd: (d, rest) => { act('radd', [d, rest]); return 'radd'; },
    rpop: () => { act('rpop'); return 'rpop'; },
    pickBar: k => { pickBar(k, false); return 'bar'; },
    sec: () => selSec,
    bar: () => selBar,
    looks: () => H.looks(song),
    inst: k => { act('inst', k); return 'inst'; },
    chord: c => { act('chord', c); return 'chord'; },
    // 보고 놓기 — 보기와 다른 첫 칸에 맞는 높이를 놓음
    readAuto: () => { const k = E.readCheck(song).ok.findIndex(x => !x); if (k < 0) return 'none'; place(k, E.readWant(song, k)); return 'place'; },
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
