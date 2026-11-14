// 악보 판 — 진짜 악보에 기호를 넣었다 빼며 소리가 어떻게 달라지는지 듣는 판의 규칙(화면 · 소리 없음 · node로 시험).
//
//  가락(도막)은 곡 대장에 있는 곡에서 마디째 잘라 쓴다(새 곡을 짓지 않는다 · docs/rights.md 그대로).
//  기호는 '넣은 것 목록(marks)' 하나에 모인다 — 화면은 scoreOf로 그리고, 소리는 perform으로 만든다.
//   · 음에 넣는 기호는 '몇째 음(k)'에, 마디에 넣는 기호는 '몇째 마디(b)'에, 곡 처음에 넣는 것은 값 하나로 적는다.
//   · marks는 고치지 않는다 — toggle이 새 marks를 돌려준다.
//  차례(쉬운 것 먼저)는 docs/flow.md의 묶음 순서: 셈여림 · 빠르기 · 음색 → 음의 길이 · 되풀이 → 박자.
import { makeSong, sounding } from './song.js';
import { barTicks, TPQ } from './theory.js';
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

  { id: 'repeat', group: 'repeat', name: '도돌이표', sym: ':|', where: 'bar', kind: 'repeat' },

  M('m24', '4분의 2박자', [2, 4]), M('m34', '4분의 3박자', [3, 4]), M('m44', '4분의 4박자', [4, 4]),
];
export const signById = id => SIGNS.find(s => s.id === id) || null;
export const signsOf = group => SIGNS.filter(s => s.group === group);

// ── 가락 도막 — 대장 곡에서 마디째 자름 ─────────────────────────────────
const CUTS = [
  ['ode', 'ode', 0, 4, '첫 네 마디'],
  ['auclair', 'auclair', 0, 4, '앞 도막'],
  ['haenschen', 'haenschen', 0, 4, '첫 도막'],
  ['frere', 'frere', 0, 6, '첫 여섯 마디'],
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
    + (m.repeat ? 1 : 0) + (m.tempo ? 1 : 0) + (m.tchange ? 1 : 0) + (m.meter ? 1 : 0) + (m.inst ? 1 : 0);
}

const sameMeter = (a, b) => a[0] === b[0] && a[1] === b[1];
export const meterNow = (ph, marks) => marks.meter || ph.meter;
// 이 가락을 그 박자표로 다시 나눌 수 있나 — 길이가 딱 떨어지고, 마디줄에 걸리는 음이 없어야 한다
export function fitsMeter(ph, meter) {
  const cap = barTicks(meter);
  if (ph.total % cap) return false;
  return ph.N.every(n => Math.floor(n.t / cap) === Math.floor((n.t + n.d - 1) / cap));
}

// ── 넣은 것 목록에서 뽑은 모양(화면과 소리가 같이 씀) ───────────────────
export function build(ph, marks) {
  const meter = meterNow(ph, marks), cap = barTicks(meter), bars = ph.total / cap;
  const notes = ph.N.map(n => ({ ...n, bar: Math.floor(n.t / cap), rest: !!marks.rest[n.k] }));
  const tieOk = k => { const a = notes[k], b = notes[k + 1]; return !!(a && b && a.p === b.p && a.t + a.d === b.t && !a.rest && !b.rest); };
  const ties = notes.filter(n => marks.tie[n.k] && tieOk(n.k)).map(n => n.k);
  const tw = marks.tempo ? signById(marks.tempo) : null;
  const bpm = tw && tw.bpm ? tw.bpm : ph.tempo;
  const tchange = marks.tchange && marks.tchange.bar < bars ? marks.tchange : null;
  const repeat = marks.repeat && marks.repeat.to < bars ? marks.repeat : null;
  const hair = {};
  for (const [b, kind] of Object.entries(marks.hair)) if (+b < bars && notes.some(n => n.bar === +b && !n.rest)) hair[b] = kind;
  return { meter, cap, bars, notes, tieOk, ties, tieSet: new Set(ties), bpm, tempoWord: (tw || signById('mid')).name, inst: marks.inst || 'piano', tchange, repeat, hair };
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
  if (s.where === 'note') return act.map(n => n.k);
  const all = Array.from({ length: m.bars }, (_, b) => b);
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
    const had = Object.keys(marks.hair).length || marks.tchange || marks.repeat;
    const m2 = { ...marks, meter: sameMeter(next, ph.meter) ? null : next, hair: {}, tchange: null, repeat: null };
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
  const on = has(marks, signId, at);
  if (!on && !places(ph, marks, signId).includes(at)) return { marks, on: false, blocked: true };
  switch (s.kind) {
    case 'letter': return { marks: { ...marks, dyn: on ? without(marks.dyn, at) : { ...marks.dyn, [at]: s.id } }, on: !on };
    case 'hair': return { marks: { ...marks, hair: on ? without(marks.hair, at) : { ...marks.hair, [at]: s.id } }, on: !on };
    case 'accent': case 'stacc': case 'tie': case 'rest': case 'fermata': return { marks: { ...marks, [s.kind]: flip(marks[s.kind], at) }, on: !on };
    case 'tchange': return { marks: { ...marks, tchange: on ? null : { bar: at, kind: s.id } }, on: !on };
    case 'repeat': return { marks: { ...marks, repeat: on ? null : { to: at } }, on: !on };
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
  const rep = m.repeat ? (m.repeat.to + 1) * cap : 0;
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
      const metric = beat ? (u.t % cap === 0 ? DOWN : WEAK) : 1;
      const vel = clamp(u.lv * (u.accent ? ACCENT : 1) * metric, 0.08, 1.45);
      events.push({ t: at(u.t), kind: 'note', inst: m.inst, p: u.p, d, vel, k: u.k, ks: u.ks, tick: u.t, pass, len: len * (u.fermata ? 2 : 1) });
    }
    if (beat) {                                     // 박 소리 — 늘임표로 늘인 동안에는 박도 기다린다
      for (let x = a; x < b; x += TPQ) {
        const down = x % cap === 0;
        events.push({ t: at(x), kind: 'drum', drum: down ? 'kick' : 'hat', vel: down ? 0.6 : 0.22, tick: x, pass });
      }
    }
    clock = at(b);
  });
  events.sort((p, q) => p.t - q.t || (p.kind === 'drum' ? -1 : 1));
  return { events, total: clock + 0.35, bpm: m.bpm, passes: passes.length, inst: m.inst };
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
};
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
  if (!on) return `${josa(s.name, '을/를')} 뺐어요. [듣기]로 달라진 소리를 들어 보세요.`;
  return FACT[s.id] || s.name;
}
