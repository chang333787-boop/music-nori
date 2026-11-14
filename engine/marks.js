// 악보 판 — 진짜 악보에 기호를 넣었다 빼며 소리가 어떻게 달라지는지 듣는 판의 규칙(화면 · 소리 없음 · node로 시험).
//
//  가락(도막)은 곡 대장에 있는 곡에서 마디째 잘라 쓴다(새 곡을 짓지 않는다 · docs/rights.md 그대로).
//  기호는 '넣은 것 목록(marks)' 하나에 모인다 — 화면은 scoreOf로 그리고, 소리는 perform으로 만든다.
//   · 음에 넣는 기호는 '몇째 음(k)'에, 마디에 넣는 기호는 '몇째 마디(b)'에, 곡 처음에 넣는 것은 값 하나로 적는다.
//   · marks는 고치지 않는다 — toggle이 새 marks를 돌려준다.
//  차례(쉬운 것 먼저)는 docs/flow.md의 묶음 순서: 셈여림 · 빠르기 · 음색 → 음의 길이 · 되풀이 → 박자.
//  [D1 · 11-14] 음 길이를 바꾸는 기호(점음표 · 당김음 · 16분음표 · 셋잇단)는 본래 음(k)을 조각(parts)으로 나눠 소리와 악보를 만든다 —
//   다른 기호는 여전히 본래 음 번호에 붙는다(셈여림 · 악센트 = 첫 조각, 늘임표 = 끝 조각, 스타카토 = 모든 조각).
//   마디를 다시 나누는 기호(8분의 6박자 · 못갖춘마디 · 바뀌는 박자)는 마디 목록(barsOf)을 바꾼다 — 마디에 넣은 기호는 빠진다.
import { makeSong, sounding } from './song.js';
import { barTicks, beatTicks, compound, DUR_NAME, TPQ } from './theory.js';
import { songById } from './songs/index.js';

export const GROUPS = [
  { id: 'dyn', name: '셈여림', friend: 'bear', phrase: 'ode' },
  { id: 'tempo', name: '빠르기', friend: 'bear', phrase: 'ode' },
  { id: 'inst', name: '악기 소리', friend: 'bunny', phrase: 'ode' },
  { id: 'len', name: '음의 길이', friend: 'hog', phrase: 'auclair' },
  { id: 'repeat', name: '되풀이', friend: 'turtle', phrase: 'haenschen' },
  { id: 'meter', name: '박자', friend: 'hog', phrase: 'frere' },
];
export const groupById = id => GROUPS.find(g => g.id === id) || null;

// 셈여림표가 없을 때의 크기는 mp와 mf 사이. 소리 크기는 audio.js에서 vel에 곧게 비례한다.
export const LV = { pp: 0.11, p: 0.22, mp: 0.38, mf: 0.6, f: 0.95, ff: 1.3 };
export const LV0 = 0.48;
const LVMIN = 0.11, LVMAX = 1.3, HAIR = 2.2;       // 점점 세게 · 여리게 = 끝 표가 없으면 2.2배(약 7dB)
const ACCENT = 1.6, DOWN = 1.3, WEAK = 0.85;       // 악센트 · 센박 · 여린박
const MID = 1.1, SYNC = 1.3;                       // [D1] 8분의 6박자 넷째 8분(그다음 센 박) · 당김음 가운데 음(센 느낌이 여린 자리로)
const RIT = 0.5, ACCEL = 1.7;                      // 끝에서의 빠르기 비율
const STACC = 0.4, GAP = 0.92;

const L = (id, name) => ({ id, group: 'dyn', name, sym: id, where: 'note', kind: 'letter' });
const T = (id, name, bpm) => ({ id, group: 'tempo', name, sym: name, where: 'start', kind: 'tempo', ...(bpm ? { bpm } : { base: true }) });
const I = (id, name) => ({ id, group: 'inst', name, sym: name, where: 'start', kind: 'inst', ...(id === 'piano' ? { base: true } : {}) });
const M = (id, name, meter) => ({ id, group: 'meter', name, sym: meter.join('/'), where: 'start', kind: 'meter', meter });

export const SIGNS = [
  L('p', '여리게'), L('f', '세게'), L('mp', '조금 여리게'), L('mf', '조금 세게'),
  { id: 'cresc', group: 'dyn', name: '점점 세게', sym: '<', where: 'bar', kind: 'hair' },
  { id: 'decresc', group: 'dyn', name: '점점 여리게', sym: '>', where: 'bar', kind: 'hair' },
  L('pp', '매우 여리게'), L('ff', '매우 세게'),
  { id: 'accent', group: 'dyn', name: '악센트', sym: '>', where: 'note', kind: 'accent' },

  T('slow', '느리게', 66), T('slowish', '조금 느리게', 80), T('mid', '보통 빠르게', 0), T('fastish', '조금 빠르게', 120), T('fast', '빠르게', 144),
  { id: 'rit', group: 'tempo', name: '점점 느리게', sym: 'rit.', where: 'bar', kind: 'tchange' },
  { id: 'accel', group: 'tempo', name: '점점 빠르게', sym: 'accel.', where: 'bar', kind: 'tchange' },

  I('piano', '피아노'), I('recorder', '리코더'), I('xylo', '실로폰'), I('violin', '바이올린'), I('trumpet', '트럼펫'),

  { id: 'rest', group: 'len', name: '쉼표', sym: '쉼표', where: 'note', kind: 'rest' },
  { id: 'tie', group: 'len', name: '붙임줄', sym: '⌣', where: 'tie', kind: 'tie' },
  { id: 'stacc', group: 'len', name: '스타카토', sym: '·', where: 'note', kind: 'stacc' },
  { id: 'fermata', group: 'len', name: '늘임표', sym: '𝄐', where: 'note', kind: 'fermata' },
  { id: 'dot', group: 'len', name: '점음표', sym: '♩.', where: 'note', kind: 'dot', tip: '점을 붙일 음을 눌러요' },
  { id: 'sync', group: 'len', name: '당김음', sym: '♪♩♪', where: 'note', kind: 'sync', tip: '이어진 4분음표 둘 가운데 앞 음을 눌러요' },
  { id: 'six', group: 'len', name: '16분음표', sym: '♬', where: 'note', kind: 'six', tip: '16분음표로 쪼갤 4분음표를 눌러요' },
  { id: 'trip', group: 'len', name: '셋잇단음표', sym: '3', where: 'note', kind: 'trip', tip: '셋잇단음표로 나눌 4분음표를 눌러요' },

  { id: 'repeat', group: 'repeat', name: '도돌이표', sym: ':|', where: 'bar', kind: 'repeat' },

  M('m24', '4분의 2박자', [2, 4]), M('m34', '4분의 3박자', [3, 4]), M('m44', '4분의 4박자', [4, 4]),
  { ...M('m68', '8분의 6박자', [6, 8]), phrase: 'rowrow' },          // phrase = 주소로 이 기호를 가리키면 먼저 여는 가락(이 기호가 맞는 가락)
  { id: 'pickup', group: 'meter', name: '못갖춘마디', sym: '못갖춘마디', where: 'start', kind: 'pickup', phrase: 'haenschen' },
  { id: 'mixed', group: 'meter', name: '바뀌는 박자', sym: '바뀌는 박자', where: 'bar', kind: 'mixed', phrase: 'frere', tip: '박자가 바뀔 마디를 눌러요' },
];
export const signById = id => SIGNS.find(s => s.id === id) || null;
export const signsOf = group => SIGNS.filter(s => s.group === group);

// ── 가락 도막 — 대장 곡에서 마디째 자름 ─────────────────────────────────
const CUTS = [
  ['ode', 'ode', 0, 4, '첫 네 마디'],
  ['auclair', 'auclair', 0, 4, '앞 도막'],
  ['haenschen', 'haenschen', 0, 4, '첫 도막'],
  ['frere', 'frere', 0, 6, '첫 여섯 마디'],
  ['rowrow', 'rowrow', 4, 8, '뒤 도막'],                     // D1 8분의 6박자 — 8분음표 여섯이 셋씩 묶인 마디가 둘(4분의 3박자로 바꾸면 둘씩 셋)
];
function cut([id, src, from, to, part]) {
  const s = songById(src);
  if (!s) throw new Error('곡 대장에 없는 곡: ' + src);
  const mel = s.mel.split('|').map(x => x.trim()).slice(from, to).join(' | ');
  const song = makeSong({ mel, meter: s.meter, tempo: s.tempo });
  const N = sounding(song).map((n, k) => ({ k, t: n.t, d: n.d, p: n.p }));
  return { id, src, title: s.title, part, meter: s.meter, tempo: s.tempo, mel, song, N, total: song.total };
}
export const PHRASES = CUTS.map(cut);
export const phraseById = id => PHRASES.find(p => p.id === id) || null;

export const emptyMarks = () => ({ dyn: {}, hair: {}, accent: {}, stacc: {}, tie: {}, rest: {}, fermata: {}, repeat: null, tempo: null, tchange: null, meter: null, inst: null });
export function countMarks(m) {
  const n = o => Object.keys(o).length;
  return n(m.dyn) + n(m.hair) + n(m.accent) + n(m.stacc) + n(m.tie) + n(m.rest) + n(m.fermata)
    + countD1(m)
    + (m.repeat ? 1 : 0) + (m.tempo ? 1 : 0) + (m.tchange ? 1 : 0) + (m.meter ? 1 : 0) + (m.inst ? 1 : 0);
}

// [D1] 음 길이 기호(본래 음 번호 → true)와 못갖춘마디 · 바뀌는 박자 — 빈 목록(emptyMarks)에 없던 칸은 비어 있는 것으로 읽는다
export const LEN_KINDS = ['dot', 'sync', 'six', 'trip'];
const lk = (m, kind) => m[kind] || {};
function countD1(m) {
  return LEN_KINDS.reduce((s, kind) => s + Object.keys(lk(m, kind)).length, 0) + (m.pickup ? 1 : 0) + (m.mixed ? 1 : 0);
}
// 이 음이 음 길이 기호에 걸려 있나(점음표 · 당김음은 앞 음과 뒤 음 둘 다)
const busy = (marks, k) => { const d = lk(marks, 'dot'), s = lk(marks, 'sync'); return !!(d[k] || d[k - 1] || s[k] || s[k - 1] || lk(marks, 'six')[k] || lk(marks, 'trip')[k]); };

const sameMeter = (a, b) => a[0] === b[0] && a[1] === b[1];
export const meterNow = (ph, marks) => marks.meter || ph.meter;

// 마디 목록 [{ t0, len, meter, pick }] — 못갖춘마디면 첫 마디가 한 박뿐이고 끝 마디는 한 박 모자란다(첫 마디 + 끝 마디 = 한 마디).
//  바뀌는 박자({ bar, meter })면 그 마디부터 새 박자. 길이가 딱 맞지 않으면 null
export function barsOf(total, meter, pickup = false, mixed = null) {
  const pk = pickup ? beatTicks(meter) : 0, out = [];
  let t = 0;
  if (pk) { out.push({ t0: 0, len: pk, meter, pick: true }); t = pk; }
  while (t < total) {
    const mt = mixed && out.length >= mixed.bar ? mixed.meter : meter;
    const len = Math.min(barTicks(mt), total - t);
    out.push({ t0: t, len, meter: mt });
    t += len;
  }
  const last = out[out.length - 1];
  if (!last || out.length < (pk ? 2 : 1) || last.len !== barTicks(last.meter) - pk) return null;
  if (mixed && (mixed.bar < (pk ? 2 : 1) || mixed.bar >= out.length)) return null;
  return out;
}
// 음들이 그 마디 목록에 맞나 — 마디줄에 걸치는 음이 없어야 한다.
//  겹박자(8분의 6박자)는 한 박(점4분)이 셋씩 묶음이라, 음이 한 박 안에 들거나 박에서 시작해 박에서 끝나야 한다(묶음이 보이게)
export function fitsBars(N, B) {
  if (!B) return false;
  return N.every(n => {
    const b = B.find(x => n.t >= x.t0 && n.t < x.t0 + x.len);
    if (!b || n.t + n.d > b.t0 + b.len) return false;
    if (!compound(b.meter)) return true;
    const bt = beatTicks(b.meter), a = n.t - b.t0, z = a + n.d;
    return Math.floor(a / bt) === Math.floor((z - 1) / bt) || (a % bt === 0 && z % bt === 0);
  });
}
// 이 가락을 그 박자표로 다시 나눌 수 있나 — 길이가 딱 떨어지고, 마디줄에 걸리는 음이 없어야 한다
export const fitsMeter = (ph, meter) => fitsBars(ph.N, barsOf(ph.total, meter));

// 음 길이 기호를 넣은 뒤의 음들 — 본래 음(k)마다 조각(parts). 조각 id는 첫 조각 = k, 다음 조각 = 'k.j'(불빛 · 그림이 쓰는 이름)
//  점음표: 이 음 + 반, 뒤 음 − 그만큼 · 당김음: 앞 음 8분 → 뒤 음이 8분 일찍(박 사이에서) 시작해 4분 + 8분 ·
//  16분음표: 4분음표 하나를 넷으로 · 셋잇단: 4분음표 하나를 셋으로(4틱씩 — TPQ 12가 셋으로 나뉨)
function rhythmOf(ph, marks) {
  const dot = lk(marks, 'dot'), sync = lk(marks, 'sync'), six = lk(marks, 'six'), trip = lk(marks, 'trip');
  const span = ph.N.map(n => ({ t: n.t, d: n.d }));
  for (const k of Object.keys(dot).map(Number)) { const a = span[k], b = span[k + 1]; if (!a || !b) continue; const h = a.d / 2; a.d += h; b.t += h; b.d -= h; }
  for (const k of Object.keys(sync).map(Number)) { const a = span[k], b = span[k + 1]; if (!a || !b) continue; const h = a.d / 2; a.d -= h; b.t -= h; b.d += h; }
  return ph.N.map((n, k) => {
    const { t, d } = span[k];
    let parts;
    if (six[k]) parts = [0, 1, 2, 3].map(j => ({ t: t + j * d / 4, d: d / 4 }));
    else if (trip[k]) parts = [0, 1, 2].map(j => ({ t: t + j * d / 3, d: d / 3, tri: true }));
    else if (sync[k - 1]) parts = [{ t, d: d * 2 / 3, push: true }, { t: t + d * 2 / 3, d: d / 3 }];
    else parts = [{ t, d }];
    return { k, t, d, p: n.p, parts: parts.map((q, j) => ({ ...q, k, j, p: n.p, id: j ? `${k}.${j}` : k, last: j === parts.length - 1 })) };
  });
}

// ── 넣은 것 목록에서 뽑은 모양(화면과 소리가 같이 씀) ───────────────────
export function build(ph, marks) {
  const meter = meterNow(ph, marks), cap = barTicks(meter);
  const B = barsOf(ph.total, meter, !!marks.pickup, marks.mixed || null) || barsOf(ph.total, meter) || [{ t0: 0, len: ph.total, meter }];
  const bars = B.length;
  const barOf = t => { let b = 0; while (b + 1 < bars && B[b + 1].t0 <= t) b++; return b; };
  const notes = rhythmOf(ph, marks).map(n => {
    const rest = !!marks.rest[n.k];
    return { ...n, bar: barOf(n.t), rest, parts: n.parts.map(q => ({ ...q, bar: barOf(q.t), rest })) };
  });
  const parts = notes.flatMap(n => n.parts);
  const tieOk = k => { const a = notes[k], b = notes[k + 1]; return !!(a && b && a.p === b.p && a.t + a.d === b.t && !a.rest && !b.rest && !busy(marks, k) && !busy(marks, k + 1)); };
  const ties = notes.filter(n => marks.tie[n.k] && tieOk(n.k)).map(n => n.k);
  const tw = marks.tempo ? signById(marks.tempo) : null;
  const bpm = tw && tw.bpm ? tw.bpm : ph.tempo;
  const tchange = marks.tchange && marks.tchange.bar < bars ? marks.tchange : null;
  const repeat = marks.repeat && marks.repeat.to < bars ? marks.repeat : null;
  const hair = {};
  for (const [b, kind] of Object.entries(marks.hair)) if (+b < bars && notes.some(n => n.bar === +b && !n.rest)) hair[b] = kind;
  return { meter, cap, bars, B, barOf, notes, parts, tieOk, ties, tieSet: new Set(ties), bpm, tempoWord: (tw || signById('mid')).name, inst: marks.inst || 'piano', tchange, repeat, hair };
}

// [D1] 음 길이 기호를 이 음(k)에 새로 넣을 수 있나 — 걸린 음은 쉬지 않고 · 다른 길이 기호 · 붙임줄에 묶이지 않아야 한다
//  점음표 · 당김음은 바로 뒤 음과 짝(같은 마디 · 같은 길이 · 이어짐). 박 자리:
//   점음표 = 4분분의 박자에서 박 위(8분 둘이면 한 박 안) · 8분의 6박자에서는 8분 둘이 한 박(점4분) 안
//   당김음 = 4분분의 박자에서 박 위의 4분음표 둘(4분의 4박자는 마디 반을 넘지 않게 — 첫째 · 셋째 박에서)
//   16분음표 = 박 위의 4분음표(8분의 6박자는 한 박 안) · 셋잇단 = 4분분의 박자에서 박 위의 4분음표
function lenOk(m, marks, kind, k) {
  const n = m.notes[k], nx = m.notes[k + 1];
  const free = x => !!x && !x.rest && !busy(marks, x.k) && !m.tieSet.has(x.k) && !m.tieSet.has(x.k - 1);
  if (!free(n)) return false;
  const b = m.B[n.bar], pos = n.t - b.t0, comp = compound(b.meter), bt = beatTicks(b.meter);
  const inBeat = len => Math.floor(pos / bt) === Math.floor((pos + len - 1) / bt);
  if (kind === 'six' || kind === 'trip') {
    if (n.d !== 12) return false;
    return comp ? kind === 'six' && inBeat(12) : pos % 12 === 0;
  }
  if (!free(nx) || nx.bar !== n.bar || nx.d !== n.d || nx.t !== n.t + n.d) return false;
  if (kind === 'dot') return comp ? n.d === 6 && inBeat(12) : [6, 12, 24].includes(n.d) && pos % 12 === 0;
  if (kind === 'sync') return !comp && n.d === 12 && pos % 12 === 0 && (b.meter[0] !== 4 || pos % 24 === 0);
  return false;
}
// [D1] 바뀌는 박자 — 이 마디부터 바꿀 박자(4분분의 박자끼리 · 뒤가 딱 떨어지는 것 가운데 앞의 것). 없으면 null
const OTHER_METER = { '2/4': [[3, 4], [4, 4]], '3/4': [[2, 4], [4, 4]], '4/4': [[3, 4], [2, 4]] };
export function mixedMeter(ph, marks, bar) {
  const meter = meterNow(ph, marks);
  for (const mt of OTHER_METER[meter.join('/')] || []) {
    if (fitsBars(ph.N, barsOf(ph.total, meter, !!marks.pickup, { bar, meter: mt }))) return mt;
  }
  return null;
}

// 이 기호를 넣을 수 있는 자리 — 음 번호 · 마디 번호의 목록, 곡 처음에 넣는 것은 'start'
export function places(ph, marks, signId) {
  const s = signById(signId);
  if (!s) return [];
  if (s.where === 'start') return 'start';
  const m = build(ph, marks);
  const act = m.notes.filter(n => !n.rest);
  if (s.kind === 'rest') return m.notes.filter(n => n.rest || act.length > 1).map(n => n.k);
  if (s.kind === 'tie') return m.notes.filter(n => m.tieOk(n.k)).map(n => n.k);
  if (LEN_KINDS.includes(s.kind)) return m.notes.filter(n => lk(marks, s.kind)[n.k] || lenOk(m, marks, s.kind, n.k)).map(n => n.k);
  if (s.where === 'note') return act.map(n => n.k);
  const all = Array.from({ length: m.bars }, (_, b) => b);
  if (s.kind === 'mixed') return all.filter(b => (marks.mixed && marks.mixed.bar === b) || mixedMeter(ph, marks, b));
  if (s.kind === 'hair') return all.filter(b => act.some(n => n.bar === b));
  return all;
}

export function has(marks, signId, at = null) {
  const s = signById(signId);
  if (!s) return false;
  switch (s.kind) {
    case 'letter': return marks.dyn[at] === s.id;
    case 'hair': return marks.hair[at] === s.id;
    case 'accent': case 'stacc': case 'tie': case 'rest': case 'fermata': return !!marks[s.kind][at];
    case 'tempo': return s.base ? !marks.tempo : marks.tempo === s.id;
    case 'tchange': return !!marks.tchange && marks.tchange.kind === s.id && (at == null || marks.tchange.bar === at);
    case 'repeat': return !!marks.repeat && (at == null || marks.repeat.to === at);
    case 'inst': return s.base ? !marks.inst : marks.inst === s.id;
    case 'dot': case 'sync': case 'six': case 'trip': return !!lk(marks, s.kind)[at];
    case 'pickup': return !!marks.pickup;
    case 'mixed': return !!marks.mixed && (at == null || marks.mixed.bar === at);
    default: return false;
  }
}
// 박자 단추는 가락마다 '본래 박자'가 달라서 따로 묻는다
export const hasMeter = (ph, marks, signId) => { const s = signById(signId); return !!s && s.kind === 'meter' && sameMeter(meterNow(ph, marks), s.meter); };

const without = (o, k) => { const c = { ...o }; delete c[k]; return c; };
const flip = (o, k, v = true) => (o[k] ? without(o, k) : { ...o, [k]: v });

// [D1] 마디 나눔이 바뀐 뒤 정리 — 마디에 넣은 기호(점점 · rit. · 도돌이표 · 바뀌는 박자)는 빼고, 새 마디에 안 맞게 된 음 길이 기호도 뺀다.
//  sideMixed = 바뀌는 박자도 덩달아 빠지는 경우(박자표 · 못갖춘마디를 바꿀 때). 돌려주는 notes = 알려 줄 말들
const BAR_NOTE = {
  meter: '박자표를 바꾸면 마디가 달라져서, 마디에 넣은 기호는 뺐어요.',
  pickup: '못갖춘마디를 넣거나 빼면 마디줄 자리가 달라져서, 마디에 넣은 기호는 뺐어요.',
  mixed: '박자가 바뀌면 마디가 달라져서, 마디에 넣은 기호는 뺐어요.',
};
function settle(ph, before, m2, barNote, sideMixed) {
  const notes = [];
  const had = Object.keys(before.hair).length || before.tchange || before.repeat || (sideMixed && before.mixed);
  let out = { ...m2, hair: {}, tchange: null, repeat: null, ...(sideMixed ? { mixed: null } : {}) };
  if (had) notes.push(barNote);
  let dropped = false;
  for (const kind of LEN_KINDS) for (const k of Object.keys(lk(out, kind)).map(Number)) {
    const less = { ...out, [kind]: without(lk(out, kind), k) };
    if (!lenOk(build(ph, less), less, kind, k)) { out = less; dropped = true; }
  }
  if (dropped) notes.push('새 마디에 맞지 않게 된 음 길이 기호도 뺐어요.');
  return { marks: out, notes };
}
const withNote = notes => (notes.length ? { note: notes.join(' ') } : {});
// 점음표 · 당김음 · 16분음표 · 셋잇단으로 바뀐 음표 이름(알려 주는 말에 씀) — 본래 길이로
function lenWords(ph, kind, k) {
  const d = ph.N[k] ? ph.N[k].d : 12, nm = t => DUR_NAME[t] || '';
  if (kind === 'dot') return { from: nm(d), to: [nm(d * 1.5), nm(d / 2)] };
  if (kind === 'sync') return { from: nm(d), to: [nm(d / 2), nm(d), nm(d / 2)] };
  if (kind === 'six') return { from: nm(d), to: [nm(d / 4)] };
  return { from: nm(d), to: ['8분음표'] };
}

// 넣기 · 빼기 — 같은 기호를 같은 자리에 한 번 더 누르면 빠진다. { marks, on, note?, blocked? }
export function toggle(ph, marks, signId, at = null) {
  const s = signById(signId);
  if (!s) return { marks, on: false, blocked: true };
  if (s.kind === 'meter') {
    const cur = meterNow(ph, marks);
    const next = sameMeter(cur, s.meter) ? ph.meter : s.meter;      // 지금 것을 또 누르면 본래 박자로
    if (sameMeter(cur, next)) return { marks, on: true };
    if (!fitsMeter(ph, next)) return { marks, on: false, blocked: true, note: `이 가락은 ${s.name}로 나누면 ${compound(next) ? '박이' : '마디가'} 딱 떨어지지 않아요. 다른 가락으로 해 보세요.` };
    const pkOk = !marks.pickup || fitsBars(ph.N, barsOf(ph.total, next, true));      // 못갖춘마디는 새 박자의 한 박으로 — 안 맞으면 뺀다
    const r = settle(ph, marks, { ...marks, meter: sameMeter(next, ph.meter) ? null : next, ...(pkOk ? {} : { pickup: null }) }, BAR_NOTE.meter, true);
    if (!pkOk) r.notes.push('새 박자로는 못갖춘마디가 맞지 않아서 뺐어요.');
    return { marks: r.marks, on: sameMeter(next, s.meter), meter: next, ...withNote(r.notes) };
  }
  if (s.kind === 'pickup') {
    const want = !marks.pickup;
    if (want && !fitsBars(ph.N, barsOf(ph.total, meterNow(ph, marks), true))) return { marks, on: false, blocked: true, note: '이 가락은 못갖춘마디로 시작하면 마디가 딱 떨어지지 않아요. 다른 가락으로 해 보세요.' };
    const r = settle(ph, marks, { ...marks, pickup: want ? true : null }, BAR_NOTE.pickup, true);
    return { marks: r.marks, on: want, ...withNote(r.notes) };
  }
  if (s.kind === 'tempo') {
    const v = s.base || marks.tempo === s.id ? null : s.id;
    return { marks: { ...marks, tempo: v }, on: v != null || !!s.base };
  }
  if (s.kind === 'inst') {
    const v = s.base || marks.inst === s.id ? null : s.id;
    return { marks: { ...marks, inst: v }, on: v != null || !!s.base };
  }
  const on = has(marks, signId, at);
  if (!on && !places(ph, marks, signId).includes(at)) return { marks, on: false, blocked: true };
  switch (s.kind) {
    case 'letter': return { marks: { ...marks, dyn: on ? without(marks.dyn, at) : { ...marks.dyn, [at]: s.id } }, on: !on };
    case 'hair': return { marks: { ...marks, hair: on ? without(marks.hair, at) : { ...marks.hair, [at]: s.id } }, on: !on };
    case 'accent': case 'stacc': case 'tie': case 'rest': case 'fermata': return { marks: { ...marks, [s.kind]: flip(marks[s.kind], at) }, on: !on };
    case 'tchange': return { marks: { ...marks, tchange: on ? null : { bar: at, kind: s.id } }, on: !on };
    case 'repeat': return { marks: { ...marks, repeat: on ? null : { to: at } }, on: !on };
    case 'dot': case 'sync': case 'six': case 'trip': return { marks: { ...marks, [s.kind]: flip(lk(marks, s.kind), at) }, on: !on, len: lenWords(ph, s.kind, at) };
    case 'mixed': {
      const mt = on ? null : mixedMeter(ph, marks, at);
      const r = settle(ph, marks, { ...marks, mixed: on ? null : { bar: at, meter: mt } }, BAR_NOTE.mixed, false);
      return { marks: r.marks, on: !on, ...(mt ? { meter: mt, bar: at } : {}), ...withNote(r.notes) };
    }
    default: return { marks, on: false, blocked: true };
  }
}

// ── 소리 — 넣은 대로 연주한 사건(초) ────────────────────────────────────
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function unitsOf(m, marks, a, b) {                  // 한 번 지나가는 구간 [a, b) 안에서 붙임줄로 이은 '소리 덩이'
  const out = [];
  let prev = null;
  for (const n of m.parts) {                        // 조각마다(음 길이 기호가 없으면 조각 = 본래 음 하나)
    if (n.t < a || n.t >= b || n.rest) continue;
    if (prev && n.j === 0 && prev.last + 1 === n.k && m.tieSet.has(prev.last)) {
      prev.d += n.d; prev.ks.push(n.id); prev.last = n.k;
      if (marks.fermata[n.k]) prev.fermata = true;
      if (marks.dyn[n.k]) prev.after = marks.dyn[n.k];      // 이어진 음에 적힌 셈여림표는 다음 음부터
      continue;
    }
    const first = n.j === 0;                            // 셈여림 · 악센트는 첫 조각에, 늘임표는 끝 조각에
    prev = { t: n.t, d: n.d, p: n.p, k: n.k, ks: [n.id], last: n.k, bar: n.bar, letter: (first && marks.dyn[n.k]) || null, after: null, accent: first && !!marks.accent[n.k], stacc: !!marks.stacc[n.k], fermata: n.last && !!marks.fermata[n.k], push: !!n.push };
    out.push(prev);
  }
  for (const u of out) if (u.ks.length > 1) u.stacc = false;
  return out;
}

function levels(U, hair, level) {                   // 셈여림표 · 점점 세게/여리게를 따라 덩이마다 크기를 정함
  let i = 0;
  while (i < U.length) {
    const u = U[i];
    if (u.letter) level = LV[u.letter];
    const kind = hair[u.bar];
    if (!kind) { u.lv = level; if (u.after) level = LV[u.after]; i++; continue; }
    let e = u.bar;
    while (hair[e + 1] === kind) e++;
    let j = i + 1;
    while (j < U.length && U[j].bar <= e && !U[j].letter) j++;
    const run = U.slice(i, j), nx = U[j], up = kind === 'cresc';
    const toLetter = nx && nx.letter && nx.bar <= e + 1 && (up ? LV[nx.letter] > level : LV[nx.letter] < level);
    const target = toLetter ? LV[nx.letter] : clamp(up ? level * HAIR : level / HAIR, LVMIN, LVMAX);
    const t0 = run[0].t, t1 = toLetter ? nx.t : run[run.length - 1].t;
    for (const r of run) r.lv = level * Math.pow(target / level, t1 > t0 ? (r.t - t0) / (t1 - t0) : 1);
    level = target;
    const tail = run[run.length - 1];
    if (tail.after) level = LV[tail.after];
    i = j;
  }
  return level;
}

export function perform(ph, marks, { beat = false } = {}) {
  const m = build(ph, marks), { B } = m, total = ph.total;
  const sec = 60 / m.bpm / TPQ;
  const tc = m.tchange, x0 = tc ? B[tc.bar].t0 : total, g = tc ? (tc.kind === 'rit' ? RIT : ACCEL) : 1, span = total - x0;
  const warp = x => (!tc || x <= x0 ? x * sec : x0 * sec + sec * span * Math.log(1 + (g - 1) * (x - x0) / span) / (g - 1));
  const rep = m.repeat ? B[m.repeat.to].t0 + B[m.repeat.to].len : 0;
  // 박 세기 — 마디 첫 박이 센박(못갖춘마디의 첫 마디는 여린박에서 시작) · 8분의 6박자는 넷째 8분이 그다음으로 셈
  const metricAt = x => { const bar = B[m.barOf(x)], pos = x - bar.t0; return pos === 0 && !bar.pick ? DOWN : pos > 0 && compound(bar.meter) && pos % beatTicks(bar.meter) === 0 ? MID : WEAK; };
  const passes = rep ? [[0, rep], [0, total]] : [[0, total]];
  const events = [];
  let clock = 0, level = LV0;
  passes.forEach(([a, b], pass) => {
    const U = unitsOf(m, marks, a, b);
    level = levels(U, m.hair, level);
    const holds = U.filter(u => u.fermata).map(u => ({ x: u.t + u.d, extra: warp(u.t + u.d) - warp(u.t) }));
    const at = x => clock + warp(x) - warp(a) + holds.reduce((s, h) => s + (h.x <= x ? h.extra : 0), 0);
    for (const u of U) {
      const len = warp(u.t + u.d) - warp(u.t);
      const d = u.fermata ? len * 2 * GAP : u.stacc ? Math.max(0.08, len * STACC) : len * GAP;
      const metric = beat ? metricAt(u.t) : 1;
      const vel = clamp(u.lv * (u.accent ? ACCENT : 1) * (u.push ? SYNC : metric), 0.08, 1.45);
      events.push({ t: at(u.t), kind: 'note', inst: m.inst, p: u.p, d, vel, k: u.k, ks: u.ks, tick: u.t, pass, len: len * (u.fermata ? 2 : 1) });
    }
    if (beat) {                                     // 박 소리 — 늘임표로 늘인 동안에는 박도 기다린다 · 8분의 6박자는 8분마다(셋씩 묶음이 들리게)
      for (const bar of B) {
        const comp = compound(bar.meter), step = comp ? TPQ / 2 : TPQ;
        for (let x = bar.t0; x < bar.t0 + bar.len; x += step) {
          if (x < a || x >= b) continue;
          const mt = metricAt(x), down = mt === DOWN, mid = mt === MID;
          events.push({ t: at(x), kind: 'drum', drum: down || mid ? 'kick' : 'hat', vel: down ? 0.6 : mid ? 0.36 : comp ? 0.16 : 0.22, tick: x, pass });
        }
      }
    }
    clock = at(b);
  });
  events.sort((p, q) => p.t - q.t || (p.kind === 'drum' ? -1 : 1));
  return { events, total: clock + 0.35, bpm: m.bpm, passes: passes.length, inst: m.inst };
}

// ── 화면 — notation.js renderScore가 읽는 악보 + 판이 덧그릴 것 ──────────
const STEP = 3;                                     // 16분음표 한 칸 = 3틱(8분의 6박자도 16분 칸 — 한 박 = 6칸)
export function scoreOf(ph, marks) {
  const m = build(ph, marks), comp = compound(m.meter);
  const events = [];
  for (const n of m.notes) {
    if (n.rest) continue;
    const ex = {};
    if (marks.accent[n.k]) ex.accent = true;
    if (marks.stacc[n.k] && !m.tieSet.has(n.k) && !m.tieSet.has(n.k - 1)) ex.stacc = true;
    const exOf = j => { const e = { ...ex }; if (j) delete e.accent; return Object.keys(e).length ? { ex: e } : {}; };
    if (n.parts[0].tri) {                             // 셋잇단 — 한 박 자리에 한 덩이(notation.js가 8분음표 셋 + 3으로 그림)
      events.push({ s: n.t / STEP, d: n.d / STEP, ps: [n.p], i: n.parts[0].id, tri: n.parts.map(q => ({ p: q.p, i: q.id })), ...exOf(0) });
      continue;
    }
    n.parts.forEach((q, j) => events.push({ s: q.t / STEP, d: q.d / STEP, ps: [q.p], i: q.id,
      ...(q.push ? { whole: true } : {}),                // 당김음 가운데 4분음표는 박 사이에서 시작해도 한 음표로(♪♩♪)
      ...(j && n.parts.length > 2 ? { nosol: true } : {}), // 16분음표 넷은 계이름을 첫 음에만(같은 높이 · 글자가 겹치지 않게)
      ...exOf(j) }));
  }
  const fixed = m.B.every(b => !b.pick && sameMeter(b.meter, m.meter));
  const score = {
    beats: comp ? m.meter[0] / 3 : m.meter[0], sub: comp ? 6 : 4, bars: m.bars, ts: m.meter,
    staves: [{ id: 'm', clef: 'treble', words: true, solY: 38, voices: [{ events }] }],
    ...(m.repeat ? { repeat: { from: -1, to: m.repeat.to } } : {}),
    ...(fixed ? {} : { barLens: m.B.map(b => b.len / STEP) }),          // 못갖춘마디 · 바뀌는 박자 — 마디마다 칸 수
    ...(marks.mixed && m.B.length > marks.mixed.bar ? { tsAt: [{ bar: marks.mixed.bar, ts: marks.mixed.meter }] } : {}),
    ...(LEN_KINDS.some(kind => Object.keys(lk(marks, kind)).length) ? { spread: true } : {}),   // 음을 쪼갰으면 촘촘한 음 사이를 벌려 그림
  };
  const act = k => !m.notes[k].rest;
  const letters = Object.entries(marks.dyn).filter(([k]) => m.notes[+k] && act(+k)).map(([k, text]) => ({ k: +k, text }));
  const hairs = [];
  Object.keys(m.hair).map(Number).sort((a, b) => a - b).forEach(b => {
    const last = hairs[hairs.length - 1];
    if (last && last.kind === m.hair[b] && last.b1 === b - 1) last.b1 = b;
    else hairs.push({ kind: m.hair[b], b0: b, b1: b });
  });
  const fermatas = Object.keys(marks.fermata).map(Number).filter(k => m.notes[k] && act(k));
  const model = {
    meter: m.meter, cap: m.cap, bars: m.bars, B: m.B, barOf: m.barOf, step: STEP, pickup: !!marks.pickup, mixed: marks.mixed || null, notes: m.notes, bpm: m.bpm, tempoWord: m.tempoWord, tempoSet: !!marks.tempo, inst: m.inst,
    letters, hairs, ties: m.ties, fermatas,
    tchange: m.tchange ? { bar: m.tchange.bar, text: signById(m.tchange.kind).sym } : null,
    repeat: m.repeat,
  };
  return { score, model };
}

// ── 넣거나 뺐을 때 한 줄로 알려 주는 말(칭찬 없이 사실만) ────────────────
const FACT = {
  p: '여리게(p) — 여기서부터 작은 소리로 연주해요.',
  f: '세게(f) — 여기서부터 큰 소리로 연주해요.',
  mp: '조금 여리게(mp) — 여리게(p)보다 조금 크게 연주해요.',
  mf: '조금 세게(mf) — 세게(f)보다 조금 작게 연주해요.',
  pp: '매우 여리게(pp) — 여기서부터 아주 작은 소리로 연주해요.',
  ff: '매우 세게(ff) — 여기서부터 아주 큰 소리로 연주해요.',
  cresc: '점점 세게 — 이 마디에서 소리가 조금씩 커져요.',
  decresc: '점점 여리게 — 이 마디에서 소리가 조금씩 작아져요.',
  accent: '악센트 — 이 음만 특히 세게 연주해요.',
  rit: '점점 느리게(rit.) — 이 마디부터 끝까지 조금씩 느려져요.',
  accel: '점점 빠르게(accel.) — 이 마디부터 끝까지 조금씩 빨라져요.',
  rest: '쉼표 — 이 음 자리에서 소리를 내지 않고 쉬어요. 박은 그대로 흘러요.',
  tie: '붙임줄 — 높이가 같은 두 음을 이어서 한 음처럼 길게 연주해요.',
  stacc: '스타카토 — 이 음을 짧게 끊어서 연주해요.',
  fermata: '늘임표 — 이 음을 본래보다 길게 늘여요. 여기서는 두 배쯤 늘여요.',
  repeat: '도돌이표 — 처음으로 돌아가 여기까지 한 번 더 연주해요.',
  dot: '점음표 — 점은 그 음표 길이의 반을 더해요. 이 음이 반만큼 길어지고 바로 뒤 음이 그만큼 짧아져서, 마디 길이는 그대로예요.',
  sync: '당김음 — 4분음표 둘이 8분 · 4분 · 8분음표가 되었어요. 가운데 음이 박과 박 사이에서 시작해서, 센 느낌이 여린 자리로 옮겨 가요.',
  six: '16분음표 — 4분음표 한 박을 16분음표 넷으로 고르게 쪼갰어요. 높이는 그대로이고, 한 박 동안 네 번 소리 나요.',
  trip: '셋잇단음표 — 4분음표 한 박을 셋으로 고르게 나눴어요. 8분음표 셋을 한 박에 넣고, 묶음 위에 3을 적어요.',
  pickup: '못갖춘마디 — 여린박에서 시작해서 첫 마디가 한 박뿐이에요. 마디줄이 한 박 뒤로 옮겨 가 센박 자리가 바뀌어요. 첫 마디와 끝 마디를 합하면 한 마디예요.',
  mixed: '바뀌는 박자 — 고른 마디부터 박자표가 바뀌어요. 그 자리에 박자표를 새로 적고, 센박도 새 박자를 따라가요.',
};
// 박자표 한 줄 — 4분분의 박자는 4분음표를, 8분의 6박자는 8분음표를 센다
const meterFact = mt => (compound(mt)
  ? `8분의 ${mt[0]}박자 — 한 마디에 8분음표가 ${mt[0]}개 들어가요. 셋씩 두 묶음으로 세고, 첫째 음이 가장 세고 넷째 음이 그다음으로 세요.`
  : `4분의 ${mt[0]}박자 — 한 마디에 4분음표가 ${mt[0]}개 들어가요. 마디의 첫 박이 센박이에요.`);
const meterName = mt => `${mt[1]}분의 ${mt[0]}박자`;
const josa = (w, pair) => { const c = w.charCodeAt(w.length - 1); const jong = c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; return w + pair.split('/')[jong ? 0 : 1]; };
export function factOf(signId, on = true, extra = {}) {
  const s = signById(signId);
  if (!s) return '';
  if (extra.note && !on) return extra.note;
  if (s.kind === 'tempo') return s.base || !on ? '보통 빠르게 — 이 가락의 본래 빠르기로 돌아왔어요.' : `${s.name} — 곡 전체를 ${s.name} 연주해요. 음 길이의 비율은 그대로예요.`;
  if (s.kind === 'inst') return s.base || !on ? '피아노 — 처음 악기로 돌아왔어요.' : `${s.name} — 가락은 그대로이고 소리의 빛깔만 달라져요. (컴퓨터로 만든 소리예요)`;
  if (s.kind === 'meter') {
    const mt = extra.meter || s.meter;
    return meterFact(mt) + (extra.note ? ' ' + extra.note : '');
  }
  if (!on) return `${josa(s.name, '을/를')} 뺐어요. [듣기]로 달라진 소리를 들어 보세요.`;
  const tail = extra.note ? ' ' + extra.note : '';
  if (s.kind === 'mixed' && extra.meter) return `바뀌는 박자 — ${extra.bar + 1}번째 마디부터 ${meterName(extra.meter)}로 바뀌어요. 그 자리에 박자표를 새로 적고, 센박도 새 박자를 따라가요.` + tail;
  if (s.kind === 'dot' && extra.len && extra.len.from) return `점음표 — 점은 그 음표 길이의 반을 더해요. ${extra.len.from} 둘이 ${josa(extra.len.to[0], '과/와')} ${josa(extra.len.to[1], '이/가')} 되었어요. 마디 길이는 그대로예요.`;
  if (s.kind === 'pickup' || s.kind === 'mixed') return FACT[s.id] + tail;
  return FACT[s.id] || s.name;
}
