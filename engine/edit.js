// 놀이터 편집 — 곡(engine/song.js makeSong 모양)을 바꾸는 순수 함수. 화면 · 소리 없음 · node로 시험(tests/edit.test.mjs)
//  정본 명세: docs/playground.md '엔진'. 모든 함수는 받은 곡을 건드리지 않고 새 곡을 돌려준다.
//
//  마디 = 글 한 줄(mel)의 '|'로 나뉜 묶음(song.bars). 아이가 음을 길게 하면 그 마디가 넘치고(넘침),
//  지우면 모자란다(모자람). 둘 다 '박이 어긋남'으로 화면이 알려 준다 — 엔진은 마디를 저절로 고치지 않는다.
//  다만 붙임줄로 다음 마디까지 이어진 음은 '한 덩어리'로 다룬다(박자표를 바꾸면 마디선을 넘는 음이 붙임줄로 갈라짐).
//  고친 곡은 늘 toMel → makeSong으로 다시 만든다 — 그래서 makeSong({ ...곡, mel: toMel(곡) })이 같은 곡이 된다(저장 · 왕복).
import { makeSong } from './song.js';
import { barTicks, beatTicks, durCode, letter, pc } from './theory.js';

export const LENS = [6, 12, 24, 36, 48];          // ◀▶ 길이 차례: 8분 · 4분 · 2분 · 점2분 · 온
export const RANGE = { lo: 60, hi: 88 };           // 한 칸 오르내림 끝: C4 ~ E6(넘으면 그대로)
export const MAJOR = [0, 2, 4, 5, 7, 9, 11];        // 다장조 음계(한 칸 = 한 계이름)
const COMPUTED = ['ev', 'bars', 'pickup', 'total', 'errors'];
const NOTE_SPLIT = [48, 36, 24, 18, 12, 6, 3];       // 마디선에서 가를 때 쓰는 길이(점8분 · 셋잇단 X — 읽기 쉽게)
const ALL_LENS = [48, 36, 32, 24, 18, 16, 12, 9, 8, 6, 4, 3, 2];

const sum = a => a.reduce((s, x) => s + x.d, 0);
const defOf = song => { const d = { ...song }; for (const k of COMPUTED) delete d[k]; return d; };

// ── 읽기 ──

// 곡 → 마디 묶음 [[{ d, p, dyn, tie, i }]] (i = song.ev 차례). 마디 경계는 song.bars를 따른다
export function groupsOf(song) {
  const bars = song.bars || [];
  const out = bars.map(() => []);
  let k = 0;
  song.ev.forEach((e, i) => {
    while (k < bars.length - 1 && e.t >= bars[k].t0 + bars[k].ticks) k++;
    out[k].push({ d: e.d, p: e.p, dyn: e.dyn, tie: !!e.tie, i });
  });
  return out;
}

// 소리 덩어리 — 붙임줄로 이어진 조각은 하나. [{ i0, i1(ev 차례), t, d, p, dyn, b0, b1(마디) }] · 쉼표는 조각마다 하나
export function unitsOf(song) {
  const out = [];
  let open = null;
  groupsOf(song).forEach((g, b) => g.forEach(it => {
    const e = song.ev[it.i];
    if (open && it.p != null && it.p === open.p) {
      open.i1 = it.i; open.d += it.d; open.b1 = b;
      if (!it.tie) open = null;
      return;
    }
    const u = { i0: it.i, i1: it.i, t: e.t, d: it.d, p: it.p, dyn: it.dyn, b0: b, b1: b };
    out.push(u);
    open = it.p != null && it.tie ? u : null;
  }));
  return out;
}
export const unitOf = (song, i) => unitsOf(song).find(u => u.i0 <= i && i <= u.i1) || null;
// 그 틱에 소리 나는(또는 쉬는) 덩어리 · 그 덩어리의 첫 조각 ev 차례
export const unitAtTick = (song, t) => unitsOf(song).find(u => u.t <= t && t < u.t + u.d) || null;
export const indexAtTick = (song, t) => { const u = unitAtTick(song, t); return u ? u.i0 : -1; };

// 마디마다 { k, start(틱), ticks, cap, over(넘친 틱), left(모자란 틱), first · last(ev 차례) }
export function bars(song) {
  const cap = barTicks(song.meter);
  let i = 0;
  return (song.bars || []).map((b, k) => {
    const first = i;
    while (i < song.ev.length && song.ev[i].t < b.t0 + b.ticks) i++;
    return { k, start: b.t0, ticks: b.ticks, cap, over: Math.max(0, b.ticks - cap), left: Math.max(0, cap - b.ticks), first, last: i - 1 };
  });
}
// 박이 어긋난 마디만(넘침 · 모자람)
export const problems = song => bars(song).filter(b => b.over || b.left);

// 다장조 음계 안 한 칸 위 · 아래(반음 음이면 그 쪽 가장 가까운 음계 음)
export function stepScale(p, dir) {
  let q = p + Math.sign(dir);
  while (!MAJOR.includes(pc(q))) q += Math.sign(dir);
  return q;
}

// 마디 묶음 → 글 한 줄(셈여림이 바뀌는 곳에만 '!p' 같은 표시)
export function melOf(groups) {
  let dyn = 'mf';
  const parts = [];
  groups.filter(g => g.length).forEach((g, k) => {
    if (k) parts.push('|');
    for (const it of g) {
      if (it.dyn && it.dyn !== dyn) { parts.push('!' + it.dyn); dyn = it.dyn; }
      const c = durCode(it.d);
      if (c == null) throw new Error(`적을 수 없는 길이 ${it.d}틱`);
      parts.push((it.p == null ? 'R' : letter(it.p)) + c + (it.p != null && it.tie ? '~' : ''));
    }
  });
  return parts.join(' ');
}
// 곡 → 글 한 줄(저장용) — makeSong({ ...곡, mel: toMel(곡) })이 같은 곡
export const toMel = song => melOf(groupsOf(song));

// ── 안에서 쓰는 도구 ──

function rebuild(song, groups, extra = {}) {
  return makeSong({ ...defOf(song), ...extra, mel: melOf(groups) });
}
// 실패하면(적을 수 없는 길이 등) 곡을 그대로 — 화면이 멈추지 않게
const safe = (song, fn) => { try { return fn() ?? song; } catch { return song; } };

// 한 토막(len틱 · 마디 안 자리 pos)을 적을 수 있는 길이들로. 쉼표는 박 사이에서 시작하면 먼저 그 박 끝까지
function greedy(len) {
  const vals = len % 3 === 0 ? NOTE_SPLIT : ALL_LENS, out = [];
  while (len > 0) {
    const v = vals.find(x => x <= len && (len - x === 0 || len - x >= 2));
    if (!v) throw new Error(`가를 수 없는 길이 ${len}틱`);
    out.push(v); len -= v;
  }
  return out;
}
function pieces(len, pos, rest) {
  if (len <= 0) return [];
  if (!rest) return durCode(len) != null ? [len] : greedy(len);
  const out = [], plain = l => (durCode(l) != null && l !== 18 && l !== 9 ? [l] : greedy(l));   // 쉼표는 점4분 · 점8분 대신 둘로
  const inBeat = pos % 12;
  if (inBeat && len > 12 - inBeat) { const a = 12 - inBeat; out.push(...plain(a)); len -= a; }
  out.push(...plain(len));
  return out;
}

// 덩어리들을 n마디로 다시 묶는다 — 앞 n-1마디는 꼭 cap만큼(마디선을 넘는 음은 붙임줄로 가름 · 쉼표는 그냥 가름),
//  끝 마디는 남은 것을 모두 떠안는다(넘침 · 모자람이 여기 남음)
function pack(units, cap, n) {
  const G = [[]];
  let pos = 0;
  for (const u of units) {
    const segs = [];
    let left = u.d;
    while (left > 0) {
      const lastBar = G.length >= n;
      const take = lastBar ? left : Math.min(left, cap - pos);
      segs.push({ bar: G.length - 1, pos, len: take });
      left -= take; pos += take;
      if (!lastBar && pos >= cap) { G.push([]); pos = 0; }
    }
    const rest = u.p == null;
    const flat = [];
    for (const s of segs) for (const d of pieces(s.len, s.pos, rest)) flat.push({ bar: s.bar, d });
    flat.forEach((f, k) => G[f.bar].push({ d: f.d, p: u.p, dyn: u.dyn, tie: !rest && k < flat.length - 1 }));
  }
  return G.filter(g => g.length);
}

// 마디 묶음 일부를 덩어리로 펴기(붙임줄 조각은 합침)
function toUnits(groups) {
  const out = [];
  let open = null;
  for (const g of groups) for (const it of g) {
    if (open && it.p != null && it.p === open.p) { open.d += it.d; open.i1 = it.i; if (!it.tie) open = null; continue; }
    const u = { d: it.d, p: it.p, dyn: it.dyn, i0: it.i, i1: it.i };
    out.push(u);
    open = it.p != null && it.tie ? u : null;
  }
  return out;
}

// b0~b1 마디(붙임줄로 이어진 마디까지 넓힘)를 덩어리로 펴서 fn(덩어리들)으로 바꾸고 다시 묶는다.
//  다시 묶는 마디 수 = 원래 마디 수(줄어 모자라면 그만큼 적게). 덩어리가 하나도 안 남으면 그 마디들이 없어진다
function editRegion(song, b0, b1, fn) {
  const G = groupsOf(song), cap = barTicks(song.meter);
  const tieOut = g => g.length && g[g.length - 1].p != null && g[g.length - 1].tie;
  while (b0 > 0 && tieOut(G[b0 - 1])) b0--;
  while (b1 < G.length - 1 && tieOut(G[b1])) b1++;
  const units = fn(toUnits(G.slice(b0, b1 + 1)));
  if (!units) return song;
  const total = sum(units);
  const n = Math.max(1, Math.min(b1 - b0 + 1, Math.ceil(total / cap)));
  const packed = total ? pack(units, cap, n) : [];
  return rebuild(song, [...G.slice(0, b0), ...packed, ...G.slice(b1 + 1)]);
}

// 한 덩어리의 조각들을 길이 그대로 바꾸기(높이 · 쉼표) — 마디 묶음은 그대로
function mapUnit(song, i, fn) {
  const u = unitOf(song, i);
  if (!u) return song;
  const G = groupsOf(song).map(g => g.map(it => (it.i >= u.i0 && it.i <= u.i1 ? fn({ ...it }) : it)));
  return rebuild(song, G);
}

// 쉼표를 음으로 바꿀 때 쓸 높이 — 앞의 가장 가까운 음, 없으면 뒤, 그것도 없으면 솔
export function neighborPitch(song, i) {
  for (let k = i - 1; k >= 0; k--) if (song.ev[k].p != null) return song.ev[k].p;
  for (let k = i + 1; k < song.ev.length; k++) if (song.ev[k].p != null) return song.ev[k].p;
  return 67;
}

// ── 바꾸기(모두 새 곡을 돌려줌) ──

// 음 하나를 음계 안에서 한 칸 높게(+1) · 낮게(-1). 쉼표면 그대로 · 범위(C4~E6) 밖으로 나가면 그대로
export function stepPitch(song, i, dir, range = RANGE) {
  const e = song.ev[i];
  if (!e || e.p == null || !dir) return song;
  const np = stepScale(e.p, dir);
  if ((dir > 0 && np > range.hi) || (dir < 0 && np < range.lo)) return song;
  return safe(song, () => mapUnit(song, i, it => ({ ...it, p: np })));
}

// 음(또는 쉼표) 하나의 길이를 틱으로 — 같은 마디 뒤 음이 밀리거나 당겨진다(마디가 넘치거나 모자랄 수 있음)
export function setDur(song, i, ticks) {
  const u = unitOf(song, i);
  if (!u || !(ticks > 0) || u.d === ticks) return song;
  return safe(song, () => editRegion(song, u.b0, u.b1, us => us.map(x => (x.i0 === u.i0 ? { ...x, d: ticks } : x))));
}
// ◀ 짧게(-1) · ▶ 길게(+1) — LENS 차례에서 한 칸. 끝이면 그대로
export function nextLen(d, dir) {
  if (dir > 0) return LENS.find(x => x > d) ?? d;
  return [...LENS].reverse().find(x => x < d) ?? d;
}

// 음표 ↔ 쉼표. 쉼표를 음으로 바꿀 땐 p(없으면 이웃 음 높이). 길이 · 박은 그대로
export function toggleRest(song, i, p = null) {
  const e = song.ev[i];
  if (!e) return song;
  if (e.p != null) return safe(song, () => mapUnit(song, i, it => ({ ...it, p: null, tie: false })));
  const np = p ?? neighborPitch(song, i);
  return safe(song, () => mapUnit(song, i, it => ({ ...it, p: np, tie: false })));
}

// 음 하나 넣기(at = 틱 · p = 높이 · 기본 4분음표). 넣는 자리:
//  · 쉼표 안이면 그 쉼표를 메운다(누른 박의 첫머리에 맞춤 · 쉼표가 짧으면 쉼표 길이만큼) — 박은 그대로
//  · 음 안이면 그 음의 가까운 쪽 끝(앞 반이면 앞, 뒤 반이면 뒤)에 끼우고 뒤 음은 밀린다
//  · 곡 끝 뒤면 끝 마디에 붙인다(끝 마디가 다 찼으면 새 마디)
function insertPlan(song, at, p, d) {
  const cap = barTicks(song.meter);
  if (!song.ev.length) return { t: 0, song: rebuild(song, [[{ d, p, dyn: 'mf', tie: false }]]) };
  const U = unitsOf(song);
  const u = U.find(x => x.t <= at && at < x.t + x.d);
  if (!u) {
    const G = groupsOf(song), last = G[G.length - 1], dyn = song.ev[song.ev.length - 1].dyn;
    const note = { d, p, dyn };
    if (sum(last) < cap) return { t: song.total, song: editRegion(song, G.length - 1, G.length - 1, us => [...us, note]) };
    return { t: song.total, song: rebuild(song, [...G, [{ ...note, tie: false }]]) };
  }
  if (u.p == null) {
    const len = Math.min(d, u.d), bt = beatTicks(song.meter), b0 = song.bars[u.b0].t0;
    let s = u.t + Math.floor((at - u.t) / 6) * 6;                 // 8분 칸
    const onBeat = b0 + Math.floor((s - b0) / bt) * bt;           // 그 박의 첫머리(쉼표 안이면 박에 맞춤)
    if (onBeat >= u.t) s = onBeat;
    if (s + len > u.t + u.d) s = u.t + u.d - len;
    const before = s - u.t, after = u.t + u.d - s - len;
    const rep = [
      ...(before ? [{ d: before, p: null, dyn: u.dyn }] : []),
      { d: len, p, dyn: u.dyn },
      ...(after ? [{ d: after, p: null, dyn: u.dyn }] : []),
    ];
    return { t: s, song: editRegion(song, u.b0, u.b1, us => us.flatMap(x => (x.i0 === u.i0 ? rep : [x]))) };
  }
  const front = at < u.t + u.d / 2;
  const note = { d, p, dyn: u.dyn };
  return {
    t: front ? u.t : u.t + u.d,
    song: editRegion(song, u.b0, u.b1, us => us.flatMap(x => (x.i0 === u.i0 ? (front ? [note, x] : [x, note]) : [x]))),
  };
}
export function insertNote(song, at, p, d = 12) { return safe(song, () => insertPlan(song, at, p, d).song); }
// insertNote가 새 음을 놓을 틱(화면이 넣은 음을 바로 고르게)
export function insertTick(song, at, d = 12) { try { return insertPlan(song, at, 67, d).t; } catch { return -1; } }

// k째 마디(0부터) 끝에 음 하나 붙이기 — 모자란 마디의 빈 박을 누를 때
export function appendToBar(song, k, p, d = 12) {
  const G = groupsOf(song);
  if (!G[k]) return song;
  const last = G[k][G[k].length - 1];
  const note = { d, p, dyn: last ? last.dyn : 'mf' };
  return safe(song, () => editRegion(song, k, k, us => [...us, note]));
}

// 음(또는 쉼표) 하나 빼기 — 같은 마디 뒤 음이 당겨진다. 곡에 하나만 남았으면 그대로
export function remove(song, i) {
  const u = unitOf(song, i);
  if (!u || unitsOf(song).length <= 1) return song;
  return safe(song, () => editRegion(song, u.b0, u.b1, us => us.filter(x => x.i0 !== u.i0)));
}

// 박자표 바꾸기 — 같은 음들을 새 마디 길이로 다시 묶는다(마디선을 넘는 음은 붙임줄로 가름).
//  끝의 쉼표는 떼고 묶은 뒤 끝 마디를 쉼표로 채운다 → 4/4 → 3/4 → 4/4 하면 처음 곡으로 돌아온다
export function setMeter(song, meter) {
  if (!Array.isArray(meter) || meter.length !== 2) return song;
  if (song.meter[0] === meter[0] && song.meter[1] === meter[1]) return song;
  return safe(song, () => {
    const cap = barTicks(meter);
    const U = toUnits(groupsOf(song));
    const dyn = U.length ? U[U.length - 1].dyn : 'mf';
    while (U.length && U[U.length - 1].p == null) U.pop();
    if (!U.length) return rebuild(song, [[{ d: cap, p: null, dyn, tie: false }]], { meter: [...meter] });
    const total = sum(U), n = Math.ceil(total / cap), pad = n * cap - total;
    if (pad) U.push({ d: pad, p: null, dyn });
    return rebuild(song, pack(U, cap, n), { meter: [...meter] });
  });
}

// 빠르기(4분음표 기준 숫자) — 음 길이 비율은 그대로
export function setTempo(song, bpm) {
  if (!(bpm > 0) || song.tempo === bpm) return song;
  return makeSong({ ...defOf(song), tempo: bpm });
}
// 셈여림(곡 전체) — 높이 · 길이는 그대로
export function setDyn(song, dyn) {
  if (song.ev.every(e => e.dyn === dyn)) return song;
  return safe(song, () => rebuild(song, groupsOf(song).map(g => g.map(it => ({ ...it, dyn })))));
}
// 곡 끝에 빈 마디(쉼표) n개 — '마음대로 지어 보기' 판
export function appendBars(song, n = 1) {
  const cap = barTicks(song.meter), G = groupsOf(song);
  const dyn = song.ev.length ? song.ev[song.ev.length - 1].dyn : 'mf';
  const empty = () => pieces(cap, 0, true).map(d => ({ d, p: null, dyn, tie: false }));
  return safe(song, () => rebuild(song, [...G, ...Array.from({ length: n }, empty)]));
}
