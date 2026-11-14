// 악보 판 — 진짜 악보에 기호를 넣었다 빼며 소리가 어떻게 달라지는지 듣는 판의 규칙(화면 · 소리 없음 · node로 시험).
//
//  가락(도막)은 곡 대장에 있는 곡에서 마디째 잘라 쓴다(새 곡을 짓지 않는다 · docs/rights.md 그대로).
//  기호는 '넣은 것 목록(marks)' 하나에 모인다 — 화면은 scoreOf로 그리고, 소리는 perform으로 만든다.
//   · 음에 넣는 기호는 '몇째 음(k)'에, 마디에 넣는 기호는 '몇째 마디(b)'에, 곡 처음에 넣는 것은 값 하나로 적는다.
//   · marks는 고치지 않는다 — toggle이 새 marks를 돌려준다.
//  차례(쉬운 것 먼저)는 docs/flow.md의 묶음 순서: 셈여림 · 빠르기 · 음색 → 음의 길이 · 되풀이 → 박자 → 조 · 화음(묶음 D2 · 5~6학년 쪽).
import { makeSong, sounding } from './song.js';
import { barTicks, TPQ, pc, accents, beatTicks, colorOf } from './theory.js';
import { songById } from './songs/index.js';

export const GROUPS = [
  { id: 'dyn', name: '셈여림', friend: 'bear', phrase: 'ode' },
  { id: 'tempo', name: '빠르기', friend: 'bear', phrase: 'ode' },
  { id: 'inst', name: '악기 소리', friend: 'bunny', phrase: 'ode' },
  { id: 'len', name: '음의 길이', friend: 'hog', phrase: 'auclair' },
  { id: 'repeat', name: '되풀이', friend: 'turtle', phrase: 'haenschen' },
  { id: 'meter', name: '박자', friend: 'hog', phrase: 'frere' },
  { id: 'key', name: '조', friend: 'bird', phrase: 'ode' },
  { id: 'chord', name: '화음', friend: 'turtle', phrase: 'ahvous8' },
];
export const groupById = id => GROUPS.find(g => g.id === id) || null;

// 셈여림표가 없을 때의 크기는 mp와 mf 사이. 소리 크기는 audio.js에서 vel에 곧게 비례한다.
export const LV = { pp: 0.11, p: 0.22, mp: 0.38, mf: 0.6, f: 0.95, ff: 1.3 };
export const LV0 = 0.48;
const LVMIN = 0.11, LVMAX = 1.3, HAIR = 2.2;       // 점점 세게 · 여리게 = 끝 표가 없으면 2.2배(약 7dB)
const ACCENT = 1.6, DOWN = 1.3, WEAK = 0.85;       // 악센트 · 센박 · 여린박
const RIT = 0.5, ACCEL = 1.7;                      // 끝에서의 빠르기 비율
const STACC = 0.4, GAP = 0.92;
const SECOND = 0.75, CHORD_V = 0.42;               // 둘째 줄 · 화음 한 음의 크기(가락에 견줘) — 가락이 앞에 들리게
export const CHORD = { I: [60, 64, 67], IV: [65, 69, 72], V: [67, 71, 74] };   // 다장조 도미솔 · 파라도 · 솔시레(화2 칸과 같은 자리)
export const CHORD_G = { I: [67, 71, 74], IV: [60, 64, 67], V: [62, 66, 69] };  // 사장조 — 음이름 사나라 · 다마사 · 라올림바가(화3 칸과 같은 자리)
export const chordsIn = key => (key === 7 ? CHORD_G : CHORD);

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
  { id: 'drum', group: 'inst', name: '북 반주', sym: '북 반주', where: 'start', kind: 'drum' },

  { id: 'rest', group: 'len', name: '쉼표', sym: '쉼표', where: 'note', kind: 'rest' },
  { id: 'tie', group: 'len', name: '붙임줄', sym: '⌣', where: 'tie', kind: 'tie' },
  { id: 'stacc', group: 'len', name: '스타카토', sym: '·', where: 'note', kind: 'stacc' },
  { id: 'fermata', group: 'len', name: '늘임표', sym: '𝄐', where: 'note', kind: 'fermata' },

  { id: 'repeat', group: 'repeat', name: '도돌이표', sym: ':|', where: 'bar', kind: 'repeat' },
  { id: 'volta', group: 'repeat', name: '1 · 2번 괄호', sym: '1. 2.', where: 'bar', kind: 'volta', phrase: 'odev' },
  { id: 'dc', group: 'repeat', name: 'D.C.', ko: '다 카포', sym: 'D.C.', where: 'bar', kind: 'dc', phrase: 'ahvousdc' },
  { id: 'fine', group: 'repeat', name: 'Fine', ko: '피네', sym: 'Fine', where: 'bar', kind: 'fine', phrase: 'ahvousdc' },

  M('m24', '4분의 2박자', [2, 4]), M('m34', '4분의 3박자', [3, 4]), M('m44', '4분의 4박자', [4, 4]),

  { id: 'up', group: 'key', name: '조 옮기기', sym: '♯', where: 'start', kind: 'keyup', also: ['chord'] },   // 화음 묶음 단추 줄에도(사장조 화음을 듣게)
  { id: 'sharp', group: 'key', name: '올림표', sym: '♯', where: 'note', kind: 'acc' },
  { id: 'flat', group: 'key', name: '내림표', sym: '♭', where: 'note', kind: 'acc' },

  { id: 'second', group: 'chord', name: '둘째 줄', sym: '3도', where: 'start', kind: 'second' },
  { id: 'I', group: 'chord', name: '으뜸화음', ko: '도미솔', sym: 'Ⅰ', where: 'bar', kind: 'chord' },
  { id: 'IV', group: 'chord', name: '버금딸림화음', ko: '파라도', sym: 'Ⅳ', where: 'bar', kind: 'chord' },
  { id: 'V', group: 'chord', name: '딸림화음', ko: '솔시레', sym: 'Ⅴ', where: 'bar', kind: 'chord' },
];
export const signById = id => SIGNS.find(s => s.id === id) || null;
export const signsOf = group => SIGNS.filter(s => s.group === group);

// ── 가락 도막 — 대장 곡에서 마디째 자름 ─────────────────────────────────
const CUTS = [
  ['ode', 'ode', 0, 4, '첫 네 마디'],
  ['auclair', 'auclair', 0, 4, '앞 도막'],
  ['haenschen', 'haenschen', 0, 4, '첫 도막'],
  ['frere', 'frere', 0, 6, '첫 여섯 마디'],
  // 묶음 D2 — 1 · 2번 괄호 · D.C. · Fine · 화음에 쓰는 도막(새 곡 X · 마디째 자름)
  //  odev = 환희의 송가 주제 여덟 마디를 1 · 2번 괄호로 줄여 적은 꼴(1~4마디 + 8마디 · 넷째 마디와 여덟째 마디만 다르다)
  //  ahvousdc = 작은 별 가락 a(8마디) + b의 앞 4마디 — D.C. · Fine을 넣으면 a b a(곡의 짜임 그대로)
  ['odev', 'ode', [0, 1, 2, 3, 7], null, '여덟 마디를 줄여 적은 꼴'],
  ['ahvousdc', 'ahvous', 0, 12, '앞 열두 마디'],
  ['ahvous8', 'ahvous', 0, 8, '첫 여덟 마디'],
];
function cut([id, src, from, to, part]) {
  const s = songById(src);
  if (!s) throw new Error('곡 대장에 없는 곡: ' + src);
  const all = s.mel.split('|').map(x => x.trim()), mel = (Array.isArray(from) ? from.map(i => all[i]) : all.slice(from, to)).join(' | ');
  const song = makeSong({ mel, meter: s.meter, tempo: s.tempo });
  const N = sounding(song).map((n, k) => ({ k, t: n.t, d: n.d, p: n.p }));
  return { id, src, title: s.title, part, meter: s.meter, tempo: s.tempo, mel, song, N, total: song.total };
}
export const PHRASES = CUTS.map(cut);
export const phraseById = id => PHRASES.find(p => p.id === id) || null;

export const emptyMarks = () => ({ dyn: {}, hair: {}, accent: {}, stacc: {}, tie: {}, rest: {}, fermata: {}, repeat: null, tempo: null, tchange: null, meter: null, inst: null,
  acc: {}, chord: {}, keyup: false, second: false, volta: null, dc: null, fine: null, drum: false });
export function countMarks(m) {
  const n = o => Object.keys(o).length;
  return n(m.dyn) + n(m.hair) + n(m.accent) + n(m.stacc) + n(m.tie) + n(m.rest) + n(m.fermata)
    + (m.repeat ? 1 : 0) + (m.tempo ? 1 : 0) + (m.tchange ? 1 : 0) + (m.meter ? 1 : 0) + (m.inst ? 1 : 0)
    + n(m.acc || {}) + n(m.chord || {}) + (m.keyup ? 1 : 0) + (m.second ? 1 : 0) + (m.volta ? 1 : 0) + (m.dc != null ? 1 : 0) + (m.fine != null ? 1 : 0) + (m.drum ? 1 : 0);
}

const sameMeter = (a, b) => a[0] === b[0] && a[1] === b[1];
export const meterNow = (ph, marks) => marks.meter || ph.meter;
// 이 가락을 그 박자표로 다시 나눌 수 있나 — 길이가 딱 떨어지고, 마디줄에 걸리는 음이 없어야 한다
export function fitsMeter(ph, meter) {
  const cap = barTicks(meter);
  if (ph.total % cap) return false;
  return ph.N.every(n => Math.floor(n.t / cap) === Math.floor((n.t + n.d - 1) / cap));
}

// ── 조 · 임시표(묶음 D2) ─────────────────────────────────────────────────
//  음 하나 = 음이름 자리(step · 7칸이 한 옥타브 · 가온 도 = 35) + 올림 · 내림(alt). 도막은 모두 다장조 음만 쓴다.
//  · 조 옮기기 = 다장조 → 사장조. 모든 음이 같은 만큼(완전5도 위 = 음이름 4칸 위, 또는 완전4도 아래 = 3칸 아래) 옮겨져 가락 모양이 그대로다.
//    사장조의 조표 = 파(F)에 올림표 하나 — 조표가 붙은 자리의 음은 어느 마디에서나 반음 올려 소리 낸다.
//  · 올림표 · 내림표(임시표) = 그 음과, 같은 마디 안에서 뒤에 오는 같은 자리(같은 옥타브)의 음을 반음 올리고 내린다.
//    다음 마디에서는 제자리(조표대로)로 돌아온다. 다른 오선(둘째 줄 · 화음)에는 걸리지 않는다.
//    올림표는 검은 건반이 되는 자리(미 · 시 X)에만, 내림표도 검은 건반이 되는 자리(도 · 파 X)에만 — 미♯ · 시♯ · 도♭ · 파♭ 같은 글자는 쓰지 않는다.
//    조표로 이미 올린 자리(사장조의 파)에는 넣지 않는다(겹올림 · 제자리표가 필요해짐). 그런 자리의 기호는 조를 옮기는 동안 쉰다(조 옮기기를 빼면 돌아온다).
const LET = [0, 2, 4, 5, 7, 9, 11];                                   // 음이름(C D E F G A B)의 반음 수
const NAT = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };            // 반음 → 음이름(다장조 음만)
const KALT = { 0: [0, 0, 0, 0, 0, 0, 0], 7: [0, 0, 0, 1, 0, 0, 0] };  // 조표 — 다장조 없음 · 사장조 파(F) ♯
const SYL = ['도', '레', '미', '파', '솔', '라', '시'];
const stepOf = p => (NAT[pc(p)] == null ? null : Math.floor(p / 12) * 7 + NAT[pc(p)]);
const natOf = st => Math.floor(st / 7) * 12 + LET[((st % 7) + 7) % 7];
const letterOf = st => ((st % 7) + 7) % 7;
// 조 옮기기 방향 — 덧줄이 덜 생기는 쪽(높은음자리표 덧줄 없는 넓이 = 레4 ~ 솔5), 같으면 위로
export function keyShift(ph) {
  const cost = sh => ph.N.reduce((c, n) => c + Math.max(0, 62 - (n.p + sh)) + Math.max(0, n.p + sh - 79), 0);
  return cost(-5) < cost(7) ? -5 : 7;
}
// 그 조의 음계 음 → 음이름 자리(사장조의 파# = 파 자리 · 조표가 맡으니 따로 기호를 붙이지 않음)
const stepIn = (p, key) => { const L = LET.findIndex((v, i) => (v + KALT[key][i]) % 12 === pc(p)); return Math.floor((p - KALT[key][L]) / 12) * 7 + L; };
const accOk = (a, L, kalt) => kalt[L] === 0 && (a === 'sharp' ? L !== 2 && L !== 6 : L !== 0 && L !== 3);
// notes(새로 만든 것)에 조 · 임시표를 입힌다 — 소리 높이(p) · 음이름 자리(step) · 붙은 기호(mark) · 둘째 줄 높이(p2)
function spell(marks, notes, shift) {
  const key = shift ? 7 : 0, ds = shift > 0 ? 4 : shift < 0 ? -3 : 0, kalt = KALT[key], acc = marks.acc || {};
  let bar = -1, state = null, any = false;
  for (const n of notes) {
    if (n.bar !== bar) { bar = n.bar; state = new Map(); }
    const st0 = stepOf(n.p);
    if (st0 == null) { n.step = null; continue; }                     // 다장조 밖 음(지금 도막에는 없음)은 그대로 둔다
    const step = st0 + ds, L = letterOf(step);
    let alt = state.has(step) ? state.get(step) : kalt[L], mark = null;
    const a = acc[n.k];
    if (a && !n.rest && accOk(a, L, kalt)) { alt = a === 'sharp' ? 1 : -1; state.set(step, alt); mark = a; any = true; }
    const L2 = letterOf(step - 2);
    Object.assign(n, { p0: n.p, step, alt, mark, p: natOf(step) + alt, p2: natOf(step - 2) + kalt[L2] });
  }
  return { key, any };
}
// 연주 차례 — [{ a, b, pass }] (틱 구간 · 몇째 번 지나가나)
//  도돌이표: 그 마디까지 → 처음부터 끝까지 · 1 · 2번 괄호: 1번 마디까지 → 처음부터 1번 앞까지 → 2번 마디부터 끝까지
//  D.C.: 끝까지 간 뒤 처음으로 → Fine이 있으면 Fine 마디 끝에서, 없으면 끝에서 마침. D.C.로 돌아온 뒤에는 도돌이표를 다시 지키지 않고 1번 괄호는 건너뛴다(관례)
function segsOf(m, total) {
  const B = b => b * m.cap, r = m.repeat ? m.repeat.to : null, out = [];
  let pass = 0;
  const go = (a, b) => { if (b > a) out.push({ a, b, pass }); };
  if (r == null) go(0, total);
  else if (m.volta) { go(0, B(r + 1)); pass++; go(0, B(r)); go(B(r + 1), total); }
  else { go(0, B(r + 1)); pass++; go(0, total); }
  if (m.dc) {
    pass++;
    const end = m.fine != null ? B(m.fine + 1) : total;
    if (m.volta) { go(0, Math.min(B(r), end)); if (end > B(r + 1)) go(B(r + 1), end); } else go(0, end);
  }
  return out;
}
// 마디 번호로 본 연주 차례(시험 · 화면 설명용)
export function orderOf(ph, marks) {
  const m = build(ph, marks), out = [];
  for (const g of segsOf(m, ph.total)) for (let b = g.a / m.cap; b < g.b / m.cap; b++) out.push(b);
  return out;
}

// ── 넣은 것 목록에서 뽑은 모양(화면과 소리가 같이 씀) ───────────────────
export function build(ph, marks) {
  const meter = meterNow(ph, marks), cap = barTicks(meter), bars = ph.total / cap;
  const notes = ph.N.map(n => ({ ...n, bar: Math.floor(n.t / cap), rest: !!marks.rest[n.k] }));
  const shift = marks.keyup ? keyShift(ph) : 0, sp = spell(marks, notes, shift);
  const tieOk = k => { const a = notes[k], b = notes[k + 1]; return !!(a && b && a.p === b.p && a.t + a.d === b.t && !a.rest && !b.rest); };
  const ties = notes.filter(n => marks.tie[n.k] && tieOk(n.k)).map(n => n.k);
  const tw = marks.tempo ? signById(marks.tempo) : null;
  const bpm = tw && tw.bpm ? tw.bpm : ph.tempo;
  const tchange = marks.tchange && marks.tchange.bar < bars ? marks.tchange : null;
  const repeat = marks.repeat && marks.repeat.to < bars ? marks.repeat : null;
  const hair = {};
  for (const [b, kind] of Object.entries(marks.hair)) if (+b < bars && notes.some(n => n.bar === +b && !n.rest)) hair[b] = kind;
  const r = repeat ? repeat.to : -1, volta = !!marks.volta && r >= 1 && r <= bars - 2;
  const chord = {};
  for (const [b, id] of Object.entries(marks.chord || {})) if (+b < bars) chord[b] = id;      // 조를 옮기면 화음도 그 조의 Ⅰ · Ⅳ · Ⅴ로 따라간다
  const dc = marks.dc != null && marks.dc === bars - 1;
  const fine = marks.fine != null && marks.fine < bars - 1 && !(volta && marks.fine === r) ? marks.fine : null;
  return { meter, cap, bars, notes, tieOk, ties, tieSet: new Set(ties), bpm, tempoWord: (tw || signById('mid')).name, inst: marks.inst || 'piano', tchange, repeat, hair,
    shift, key: sp.key, spelled: !!shift || sp.any, second: !!marks.second, chord, volta, dc, fine, drum: !!marks.drum };
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
  if (s.kind === 'acc') return accPlaces(m, marks, s.id);
  if (s.where === 'note') return act.map(n => n.k);
  const all = Array.from({ length: m.bars }, (_, b) => b);
  if (s.kind === 'hair') return all.filter(b => act.some(n => n.bar === b));
  if (s.kind === 'chord') return all;
  if (s.kind === 'volta') return marks.repeat ? (m.repeat && m.repeat.to >= 1 && m.repeat.to <= m.bars - 2 ? [m.repeat.to] : []) : all.filter(b => b >= 1 && b <= m.bars - 2);
  if (s.kind === 'dc') return [m.bars - 1];
  if (s.kind === 'fine') return all.filter(b => b < m.bars - 1 && !(m.volta && b === m.repeat.to));
  return all;
}

// 올림표 · 내림표를 넣을 수 있는 음 — 검은 건반이 되는 자리 · 조표가 없는 자리 · 같은 마디 앞의 임시표로 이미 그렇게 바뀐 음은 빼고(넣어도 소리가 같음)
function accPlaces(m, marks, id) {
  const kalt = KALT[m.key], want = id === 'sharp' ? 1 : -1, acc = marks.acc || {};
  return m.notes.filter(n => {
    if (n.rest || n.step == null || !accOk(id, letterOf(n.step), kalt)) return false;
    if (acc[n.k] === id) return true;
    const before = m.notes.filter(q => q.bar === n.bar && q.k < n.k && q.step === n.step && q.mark);
    return !(before.length && before[before.length - 1].mark === id && n.alt === want);
  }).map(n => n.k);
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
    case 'keyup': case 'second': case 'drum': return !!marks[s.kind];
    case 'acc': return (marks.acc || {})[at] === s.id;
    case 'chord': return (marks.chord || {})[at] === s.id;
    case 'volta': return !!marks.volta && !!marks.repeat && (at == null || marks.repeat.to === at);
    case 'dc': case 'fine': return marks[s.kind] != null && (at == null || marks[s.kind] === at);
    default: return false;
  }
}
// 박자 단추는 가락마다 '본래 박자'가 달라서 따로 묻는다
export const hasMeter = (ph, marks, signId) => { const s = signById(signId); return !!s && s.kind === 'meter' && sameMeter(meterNow(ph, marks), s.meter); };

const without = (o, k) => { const c = { ...o }; delete c[k]; return c; };
const flip = (o, k, v = true) => (o[k] ? without(o, k) : { ...o, [k]: v });

// 넣기 · 빼기 — 같은 기호를 같은 자리에 한 번 더 누르면 빠진다. { marks, on, note?, blocked? }
export function toggle(ph, marks, signId, at = null) {
  const s = signById(signId);
  if (!s) return { marks, on: false, blocked: true };
  if (s.kind === 'meter') {
    const cur = meterNow(ph, marks);
    const next = sameMeter(cur, s.meter) ? ph.meter : s.meter;      // 지금 것을 또 누르면 본래 박자로
    if (sameMeter(cur, next)) return { marks, on: true };
    if (!fitsMeter(ph, next)) return { marks, on: false, blocked: true, note: `이 가락은 ${s.name}로 나누면 마디가 딱 떨어지지 않아요. 다른 가락으로 해 보세요.` };
    const had = Object.keys(marks.hair).length || marks.tchange || marks.repeat || Object.keys(marks.chord || {}).length || marks.dc != null || marks.fine != null;
    const m2 = { ...marks, meter: sameMeter(next, ph.meter) ? null : next, hair: {}, tchange: null, repeat: null, chord: {}, volta: null, dc: null, fine: null };
    return { marks: m2, on: sameMeter(next, s.meter), meter: next, ...(had ? { note: '박자표를 바꾸면 마디가 달라져서, 마디에 넣은 기호는 뺐어요.' } : {}) };
  }
  if (s.kind === 'tempo') {
    const v = s.base || marks.tempo === s.id ? null : s.id;
    return { marks: { ...marks, tempo: v }, on: v != null || !!s.base };
  }
  if (s.kind === 'inst') {
    const v = s.base || marks.inst === s.id ? null : s.id;
    return { marks: { ...marks, inst: v }, on: v != null || !!s.base };
  }
  if (s.kind === 'keyup' || s.kind === 'second' || s.kind === 'drum') {     // 곡 전체에 켜고 끄는 것(묶음 D2)
    const v = !marks[s.kind], m2 = { ...marks, [s.kind]: v };
    if (s.kind !== 'keyup' || !v) return { marks: m2, on: v };
    const rest = [];
    const b = build(ph, m2);
    if (Object.keys(marks.acc || {}).some(k => b.notes[k] && !b.notes[k].mark && !b.notes[k].rest)) rest.push('사장조에서 쓰지 않는 자리의 임시표');
    return { marks: m2, on: v, ...(rest.length ? { note: `조를 옮기는 동안 ${josa(rest.join(' · '), '은/는')} 쉬어요. 조 옮기기를 빼면 돌아와요.` } : {}) };
  }
  const on = has(marks, signId, at);
  if (!on && !places(ph, marks, signId).includes(at)) return { marks, on: false, blocked: true };
  switch (s.kind) {
    case 'letter': return { marks: { ...marks, dyn: on ? without(marks.dyn, at) : { ...marks.dyn, [at]: s.id } }, on: !on };
    case 'hair': return { marks: { ...marks, hair: on ? without(marks.hair, at) : { ...marks.hair, [at]: s.id } }, on: !on };
    case 'accent': case 'stacc': case 'tie': case 'rest': case 'fermata': return { marks: { ...marks, [s.kind]: flip(marks[s.kind], at) }, on: !on };
    case 'tchange': return { marks: { ...marks, tchange: on ? null : { bar: at, kind: s.id } }, on: !on };
    case 'repeat': return { marks: { ...marks, repeat: on ? null : { to: at }, volta: !on && marks.volta && at >= 1 && at <= build(ph, marks).bars - 2 ? { own: false } : null }, on: !on };
    case 'acc': return { marks: { ...marks, acc: on ? without(marks.acc, at) : { ...marks.acc, [at]: s.id } }, on: !on };
    case 'chord': return { marks: { ...marks, chord: on ? without(marks.chord, at) : { ...marks.chord, [at]: s.id } }, on: !on };
    case 'volta':                                                // 도돌이표가 없으면 그 마디 끝에 도돌이표도 함께 — 뺄 때 함께 빠진다
      if (on) return { marks: { ...marks, volta: null, ...(marks.volta.own ? { repeat: null } : {}) }, on: false };
      return { marks: { ...marks, volta: { own: !marks.repeat }, ...(marks.repeat ? {} : { repeat: { to: at } }) }, on: true };
    case 'dc': case 'fine': return { marks: { ...marks, [s.kind]: on ? null : at }, on: !on };
    default: return { marks, on: false, blocked: true };
  }
}

// ── 소리 — 넣은 대로 연주한 사건(초) ────────────────────────────────────
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function unitsOf(m, marks, a, b) {                  // 한 번 지나가는 구간 [a, b) 안에서 붙임줄로 이은 '소리 덩이'
  const out = [];
  let prev = null;
  for (const n of m.notes) {
    if (n.t < a || n.t >= b || n.rest) continue;
    if (prev && prev.last + 1 === n.k && m.tieSet.has(prev.last)) {
      prev.d += n.d; prev.ks.push(n.k); prev.last = n.k;
      if (marks.fermata[n.k]) prev.fermata = true;
      if (marks.dyn[n.k]) prev.after = marks.dyn[n.k];      // 이어진 음에 적힌 셈여림표는 다음 음부터
      continue;
    }
    prev = { t: n.t, d: n.d, p: n.p, k: n.k, ks: [n.k], last: n.k, bar: n.bar, letter: marks.dyn[n.k] || null, after: null, accent: !!marks.accent[n.k], stacc: !!marks.stacc[n.k], fermata: !!marks.fermata[n.k] };
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
  const m = build(ph, marks), { cap } = m, total = ph.total;
  const sec = 60 / m.bpm / TPQ;
  const tc = m.tchange, x0 = tc ? tc.bar * cap : total, g = tc ? (tc.kind === 'rit' ? RIT : ACCEL) : 1, span = total - x0;
  const warp = x => (!tc || x <= x0 ? x * sec : x0 * sec + sec * span * Math.log(1 + (g - 1) * (x - x0) / span) / (g - 1));
  const segs = segsOf(m, total);
  const events = [];
  let clock = 0, level = LV0;
  segs.forEach(({ a, b, pass }, seg) => {
    const U = unitsOf(m, marks, a, b), lv0 = level;
    level = levels(U, m.hair, level);
    const holds = U.filter(u => u.fermata).map(u => ({ x: u.t + u.d, extra: warp(u.t + u.d) - warp(u.t) }));
    const at = x => clock + warp(x) - warp(a) + holds.reduce((s, h) => s + (h.x <= x ? h.extra : 0), 0);
    for (const u of U) {
      const len = warp(u.t + u.d) - warp(u.t);
      const d = u.fermata ? len * 2 * GAP : u.stacc ? Math.max(0.08, len * STACC) : len * GAP;
      const metric = beat ? (u.t % cap === 0 ? DOWN : WEAK) : 1;
      const vel = clamp(u.lv * (u.accent ? ACCENT : 1) * metric, 0.08, 1.45);
      events.push({ t: at(u.t), kind: 'note', inst: m.inst, p: u.p, d, vel, k: u.k, ks: u.ks, tick: u.t, pass, seg, len: len * (u.fermata ? 2 : 1) });
      const n0 = m.notes[u.k];                      // 둘째 줄 — 같은 리듬 · 3도 아래 · 조금 여리게(화음을 넣은 마디는 화음이 대신함)
      if (m.second && n0.p2 != null && !m.chord[u.bar]) events.push({ t: at(u.t), kind: 'note', inst: m.inst, p: n0.p2, d, vel: vel * SECOND, k: u.k, ks: u.ks, tick: u.t, pass, seg, len: len * (u.fermata ? 2 : 1), part: 'second' });
    }
    const lvAt = x => { let v = lv0; for (const u of U) { if (u.t > x) break; v = u.lv; } return v; };
    for (let x = a; x < b; x += cap) {              // 화음 — 그 마디 동안 세 음을 함께 길게
      const id = m.chord[x / cap];
      if (!id) continue;
      const t0 = at(x), d = (at(x + cap) - t0) * GAP, vel = clamp(lvAt(x) * CHORD_V, 0.06, 0.6);
      for (const p of chordsIn(m.key)[id]) events.push({ t: t0, kind: 'note', inst: m.inst, p, d, vel, k: null, ks: [], tick: x, pass, seg, len: d, part: 'chord', chord: id });
    }
    if (m.drum) {                                   // 북 반주 — 센박(4분의 4박자는 셋째 박도) 큰북 · 여린박 작은북
      const bt = beatTicks(m.meter), acc = accents(m.meter);
      for (let x = a; x < b; x += bt) {
        const w = acc[Math.floor((x % cap) / bt)] || 0, f = clamp(lvAt(x) / LV0, 0.45, 1.6);
        events.push({ t: at(x), kind: 'drum', drum: w >= 0.5 ? 'bassdrum' : 'snare', vel: (w === 1 ? 0.62 : w >= 0.5 ? 0.46 : 0.34) * f, tick: x, pass, seg, part: 'drum' });
      }
    }
    if (beat && !m.drum) {                          // 박 소리 — 늘임표로 늘인 동안에는 박도 기다린다(북 반주가 있으면 북이 박을 친다)
      for (let x = a; x < b; x += TPQ) {
        const down = x % cap === 0;
        events.push({ t: at(x), kind: 'drum', drum: down ? 'kick' : 'hat', vel: down ? 0.6 : 0.22, tick: x, pass, seg });
      }
    }
    clock = at(b);
  });
  events.sort((p, q) => p.t - q.t || (p.kind === 'drum' ? -1 : 1));
  return { events, total: clock + 0.35, bpm: m.bpm, passes: segs.length, segs, inst: m.inst };
}

// ── 화면 — notation.js renderScore가 읽는 악보 + 판이 덧그릴 것 ──────────
const STEP = 3;                                     // 16분음표 한 칸 = 3틱(4분 박자만 다룬다)
export function scoreOf(ph, marks) {
  const m = build(ph, marks);
  const events = m.notes.filter(n => !n.rest).map(n => {
    const ex = {};
    if (marks.accent[n.k]) ex.accent = true;
    if (marks.stacc[n.k] && !m.tieSet.has(n.k) && !m.tieSet.has(n.k - 1)) ex.stacc = true;
    return { s: n.t / STEP, d: n.d / STEP, ps: [n.p], i: n.k, ...(Object.keys(ex).length ? { ex } : {}) };
  });
  const score = {
    beats: m.meter[0], sub: 4, bars: m.bars, ts: m.meter,
    staves: [{ id: 'm', clef: 'treble', words: true, solY: 38, voices: [{ events }] }],
    ...(m.repeat ? { repeat: { from: -1, to: m.repeat.to } } : {}),
  };
  if (m.spelled) {                                  // 조 · 임시표 — 음이름 자리와 붙일 기호를 악보에 직접 알려 주고, 계이름은 그 조의 이름으로(사장조는 솔 자리가 도)
    for (const e of events) Object.assign(e, spellOf(m, m.notes[e.i]));
    score.staves[0].words = 'lab';
  }
  if (m.key) score.ksig = [8];                      // 사장조 조표 — 오선 맨 윗줄(파) ♯
  const low = [];                                   // 아래 오선 — 둘째 줄(3도 아래 · 같은 리듬)과 화음(마디마다 하나). 같은 마디에 둘이 겹치지 않는다
  if (m.second) for (const n of m.notes) if (!n.rest && n.p2 != null && !m.chord[n.bar]) low.push({ s: n.t / STEP, d: n.d / STEP, ps: [n.p2], i: n.k, sp: [{ pos: n.step - 2 - 37, acc: '' }] });
  for (const [b, id] of Object.entries(m.chord)) { const ps = chordsIn(m.key)[id]; low.push({ s: b * m.cap / STEP, d: m.cap / STEP, ps, i: 'c' + b, sp: ps.map(p => ({ pos: stepIn(p, m.key) - 37, acc: '' })) }); }
  if (low.length) score.staves.push({ id: 'h', clef: 'treble', words: false, minAbove: m.second ? 42 : 24, voices: [{ events: low }] });
  if (m.drum) {                                     // 북 반주 줄(한 줄 오선) — 큰북은 줄 아래 '쿵' · 작은북은 줄 위 '짝'
    const bt = beatTicks(m.meter), w = accents(m.meter), drum = [];
    for (let x = 0; x < ph.total; x += bt) { const big = (w[Math.floor((x % m.cap) / bt)] || 0) >= 0.5; drum.push({ s: x / STEP, d: bt / STEP, ps: [big ? 3 : 5], i: 'd' + x, lab: big ? '쿵' : '짝', col: '#5A4632' }); }
    score.staves.push({ id: 'd', clef: 'perc1', words: 'lab', solY: 14, minAbove: 20, voices: [{ stem: 'up', events: drum }] });
  }
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
    meter: m.meter, cap: m.cap, bars: m.bars, notes: m.notes, bpm: m.bpm, tempoWord: m.tempoWord, tempoSet: !!marks.tempo, inst: m.inst,
    letters, hairs, ties: m.ties, fermatas,
    tchange: m.tchange ? { bar: m.tchange.bar, text: signById(m.tchange.kind).sym } : null,
    repeat: m.repeat,
  };
  Object.assign(model, {
    key: m.key, shift: m.shift, second: m.second, lower: low.length > 0, drum: m.drum,
    chords: Object.entries(m.chord).map(([b, id]) => ({ bar: +b, id, sym: signById(id).sym, ko: signById(id).ko })).sort((a, b) => a.bar - b.bar),
    volta: m.volta ? m.repeat.to : null, dc: m.dc ? m.bars - 1 : null, fine: m.fine,
  });
  if (score.staves.length > 1 && (letters.length || hairs.length)) score.staves[0].minBelow = 80;      // 셈여림 글자 · 점점 세게 줄이 아래 오선과 겹치지 않게
  return { score, model };
}
// 음 하나의 악보 모양 — sp = 오선 자리(아래 첫 줄 미 = 0)와 붙일 기호 · lab = 그 조의 계이름 · col = 계이름 색 · oct = 계이름 위아래 점
function spellOf(m, n) {
  if (!n || n.step == null) return {};
  const L = letterOf(n.step), tonic = m.key === 7 ? 4 : 0, idx = (L - tonic + 7) % 7, rel = n.alt - KALT[m.key][L];
  return {
    sp: [{ pos: n.step - 37, acc: n.mark === 'sharp' ? '♯' : n.mark === 'flat' ? '♭' : '' }],
    lab: SYL[idx] + (rel > 0 ? '#' : rel < 0 ? '♭' : ''), col: colorOf(60 + LET[idx]),
    oct: Math.floor((natOf(n.step) - 60 - m.key) / 12),
  };
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
};
// 묶음 D2(조 · 화음 · 되풀이 더 · 북 반주)의 말
const FACT2 = {
  up: '조 옮기기 — 다장조 가락을 사장조로 옮겼어요(이 판은 사장조만). 조를 옮기면 계이름은 그대로, 음 높이만 달라져요(솔 자리가 도). 맨 앞의 ♯ 하나가 조표 — 파 자리를 늘 반음 올려요.',
  sharp: '올림표(♯) — 이 음을 반음 올려요. 같은 마디에서 뒤에 오는 같은 자리 음도 함께 올라가고, 다음 마디에서는 제자리로 돌아와요.',
  flat: '내림표(♭) — 이 음을 반음 내려요. 같은 마디에서 뒤에 오는 같은 자리 음도 함께 내려가고, 다음 마디에서는 제자리로 돌아와요.',
  second: '둘째 줄 — 가락의 음마다 3도 아래 음(미 아래 도, 솔 아래 미)이 같은 리듬으로 함께 나요. 두 소리가 겹쳐 어울려요.',
  I: '으뜸화음(I) — 이 마디 동안 도 · 미 · 솔이 함께 길게 울려요.',
  IV: '버금딸림화음(IV) — 이 마디 동안 파 · 라 · 도가 함께 길게 울려요.',
  V: '딸림화음(V) — 이 마디 동안 솔 · 시 · 레가 함께 길게 울려요.',
  gI: '사장조 으뜸화음(I) — 계이름 도 · 미 · 솔(음이름 사 · 나 · 라)이 이 마디 동안 함께 울려요.',
  gIV: '사장조 버금딸림화음(IV) — 계이름 파 · 라 · 도(음이름 다 · 마 · 사)가 이 마디 동안 함께 울려요.',
  gV: '사장조 딸림화음(V) — 계이름 솔 · 시 · 레(음이름 라 · 올림바 · 가)가 이 마디 동안 함께 울려요.',
  volta: '1 · 2번 괄호 — 처음에는 1번 마디까지 가서 도돌이표로 돌아가요. 두 번째에는 1번 마디를 건너뛰고 2번 마디로 가요.',
  drum: '북 반주 — 센박에는 큰북(쿵), 여린박에는 작은북(짝)이 가락과 함께 울려요. (컴퓨터로 만든 소리예요)',
};
// D.C. · Fine은 둘이 함께일 때 뜻이 다 선다 — 지금 넣은 것을 보고 말한다
function dcFineFact(id, m = {}) {
  const dc = m.dc != null, fine = m.fine != null;
  if (dc && fine) return id === 'dc' ? 'D.C.(다 카포) — 끝에서 처음으로 돌아가 Fine(피네)까지 연주하고 마쳐요.' : 'Fine(피네) — 마침. D.C.로 처음에 돌아온 뒤 여기서 마쳐요.';
  if (id === 'dc') return 'D.C.(다 카포) — 끝까지 연주한 뒤 처음으로 돌아가 한 번 더 연주해요. Fine(피네)을 넣으면 거기서 마쳐요.';
  return 'Fine(피네) — 마침. D.C.로 돌아왔을 때 여기서 마쳐요. 지금은 D.C.가 없어 소리는 그대로예요. 끝 마디에 D.C.도 넣어 보세요.';
}
const josa = (w, pair) => { const c = w.charCodeAt(w.length - 1); const jong = c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; return w + pair.split('/')[jong ? 0 : 1]; };
export function factOf(signId, on = true, extra = {}) {
  const s = signById(signId);
  if (!s) return '';
  if (extra.note && !on) return extra.note;
  if (s.kind === 'tempo') return s.base || !on ? '보통 빠르게 — 이 가락의 본래 빠르기로 돌아왔어요.' : `${s.name} — 곡 전체를 ${s.name} 연주해요. 음 길이의 비율은 그대로예요.`;
  if (s.kind === 'inst') return s.base || !on ? '피아노 — 처음 악기로 돌아왔어요.' : `${s.name} — 가락은 그대로이고 소리의 빛깔만 달라져요. (컴퓨터로 만든 소리예요)`;
  if (s.kind === 'meter') {
    const mt = extra.meter || s.meter;
    return `4분의 ${mt[0]}박자 — 한 마디에 4분음표가 ${mt[0]}개 들어가요. 마디의 첫 박이 센박이에요.` + (extra.note ? ' ' + extra.note : '');
  }
  if (s.kind === 'keyup') return on ? FACT2.up + (extra.note ? ' ' + extra.note : '') : '조 옮기기를 뺐어요 — 다장조로 돌아왔어요. 맨 앞의 조표도 빠졌어요.';
  if (s.kind === 'drum') return on ? FACT2.drum : '북 반주를 뺐어요 — 가락만 들려요.';
  if (on && (s.kind === 'dc' || s.kind === 'fine')) return dcFineFact(s.id, extra.marks);
  if (on && s.kind === 'chord' && extra.marks && extra.marks.keyup) return FACT2['g' + s.id];     // 조를 옮겼으면 사장조 화음으로
  if (!on) return `${josa(s.name, '을/를')} 뺐어요. [듣기]로 달라진 소리를 들어 보세요.`;
  return FACT[s.id] || FACT2[s.id] || s.name;
}
