// 놀이터 편집 — 곡(engine/song.js makeSong 모양)을 바꾸는 순수 함수. 화면 · 소리 없음 · node로 시험(tests/edit.test.mjs)
//  정본 명세: docs/playground.md '엔진'. 모든 함수는 받은 곡을 건드리지 않고 새 곡을 돌려준다.
//
//  마디 = 글 한 줄(mel)의 '|'로 나뉜 묶음(song.bars). 아이가 음을 길게 하면 그 마디가 넘치고(넘침),
//  지우면 모자란다(모자람). 둘 다 '박이 어긋남'으로 화면이 알려 준다 — 엔진은 마디를 저절로 고치지 않는다.
//  다만 붙임줄로 다음 마디까지 이어진 음은 '한 덩어리'로 다룬다(박자표를 바꾸면 마디선을 넘는 음이 붙임줄로 갈라짐).
//  고친 곡은 늘 toMel → makeSong으로 다시 만든다 — 그래서 makeSong({ ...곡, mel: toMel(곡) })이 같은 곡이 된다(저장 · 왕복).
import { makeSong, sounding, DYN_VEL } from './song.js';
import { barTicks, beatTicks, durCode, letter, pc, TPQ } from './theory.js';

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

// ════ 묶음 D3 — 놀이터 부탁 카드 셋(리듬 지어 보기 · 내 곡 꾸며 보기 · 반주 화음 붙여 보기 · 11-14) ════

// ── 리듬 지어 보기(rmake) ──  높이 하나(솔)로 된 빈 n마디 판(기본 두 마디)
//  놓은 차례대로 앞 마디부터 채운다. 마디가 다 찼거나 넘쳤으면 다음 음은 다음 마디로 — 넘친 마디는 그대로 둔다(화면이 빗금으로 알려 줌).
//  마지막 마디까지 다 찼으면(또는 넘쳤으면) 더 놓지 않는다. 붙임줄 없음(한 음 = 한 조각) · 정답 없음.
//  판 표시: song.board = 'rhythm' · boardBars = 마디 수 · boardP = 높이(makeSong이 그대로 들고 다님 → 고쳐도 남음)
export const RHYTHM_P = 67;                       // 솔
export const RHYTHM_NOTE = [6, 12, 24, 36, 48];   // 8분 · 4분 · 2분 · 점2분 · 온
export const RHYTHM_REST = [6, 12, 24, 48];       // 8분쉼표 · 4분쉼표 · 2분쉼표 · 온쉼표
export function rhythmBoard({ meter = [4, 4], tempo = 100, p = RHYTHM_P, n = 2 } = {}) {
  return makeSong({ id: 'rhythm', board: 'rhythm', boardBars: n, boardP: p, mel: '', meter: [...meter], tempo });
}
const boardN = song => song.boardBars || 2;
// 차례대로 마디에 담기(앞 마디가 cap 이상이면 다음 마디 · 마지막 마디는 남은 것을 다 떠안음)
function packSeq(items, cap, n) {
  const G = [];
  for (const it of items) {
    const last = G[G.length - 1];
    if (!last || (sum(last) >= cap && G.length < n)) G.push([it]); else last.push(it);
  }
  return G;
}
// 마디마다 { k, start, ticks, cap, over, left, first, last } — 아직 없는 마디는 빈 마디로 채워 늘 n개
export function rhythmBars(song) {
  const B = bars(song), cap = barTicks(song.meter);
  for (let k = B.length; k < boardN(song); k++) B.push({ k, start: song.total, ticks: 0, cap, over: 0, left: cap, first: song.ev.length, last: song.ev.length - 1 });
  return B;
}
// 다음 음이 들어갈 마디 { k, left(남은 틱) } · 다 찼으면 null
export function rhythmNext(song) {
  const b = rhythmBars(song).find(x => x.ticks < x.cap);
  return b ? { k: b.k, left: b.left } : null;
}
// 모든 마디가 박 수에 딱 맞음
export const rhythmFull = song => rhythmBars(song).every(b => b.ticks === b.cap);
// 음(rest = false) 또는 쉼표 하나를 끝에 놓기 — 다 찼으면 그대로
export function rhythmAdd(song, d, rest = false) {
  if (!(d > 0) || durCode(d) == null || !rhythmNext(song)) return song;
  const G = groupsOf(song), cap = barTicks(song.meter);
  const lastIt = song.ev.length ? song.ev[song.ev.length - 1] : null;
  const it = { d, p: rest ? null : (song.boardP ?? RHYTHM_P), dyn: lastIt ? lastIt.dyn : 'mf', tie: false };
  return safe(song, () => rebuild(song, packSeq([...G.flat(), it], cap, boardN(song))));
}
// 끝의 것 하나 빼기
export function rhythmPop(song) {
  if (!song.ev.length) return song;
  const items = groupsOf(song).flat().slice(0, -1);
  return safe(song, () => rebuild(song, packSeq(items, barTicks(song.meter), boardN(song))));
}
// 다 비우기
export const rhythmClear = song => (song.ev.length ? safe(song, () => rebuild(song, [])) : song);
// 판의 박자표 바꾸기 — 놓은 차례 그대로 새 마디 길이로 다시 담는다(쉼표를 덧붙이지 않음 · 붙임줄로 가르지 않음)
export function rhythmMeter(song, meter) {
  if (!Array.isArray(meter) || meter.length !== 2 || (song.meter[0] === meter[0] && song.meter[1] === meter[1])) return song;
  return safe(song, () => rebuild(song, packSeq(groupsOf(song).flat(), barTicks(meter), boardN(song)), { meter: [...meter] }));
}

// ── 내 곡 꾸며 보기(dress) ──  도막(두 마디)마다 셈여림 · 빠르기 · 악기
//  셈여림은 음마다 적는다(글 한 줄의 '!f' 표시 → 저장 왕복) · 빠르기 · 악기는 도막 차례 표(secTempo · secInst)로 곡에 붙인다
//  (칸이 비면 곡 전체 값 · 악기는 화면이 고른 악기). 가락 · 길이 · 박자표는 건드리지 않는다.
export const SEC_BARS = 2;
// [{ s, b0, b1(마디), t0, t1(틱) }] — 끝 도막은 한 마디일 수 있음
export function sections(song, per = SEC_BARS) {
  const B = bars(song), out = [];
  for (let k = 0; k < B.length; k += per) {
    const z = B[Math.min(B.length, k + per) - 1];
    out.push({ s: out.length, b0: k, b1: z.k, t0: B[k].start, t1: z.start + z.ticks });
  }
  return out;
}
export const sectionOfBar = (k, per = SEC_BARS) => Math.floor(k / per);
export const secTempos = song => sections(song).map((_, s) => (song.secTempo && song.secTempo[s]) || song.tempo);
export const secInsts = (song, inst = 'piano') => sections(song).map((_, s) => (song.secInst && song.secInst[s]) || inst);
// 도막의 셈여림 — 그 도막 음들이 모두 같으면 그 값, 섞였으면 첫 음 값
export function secDyns(song) {
  const G = groupsOf(song);
  return sections(song).map(S => { const its = G.slice(S.b0, S.b1 + 1).flat(); return its.length ? its[0].dyn : 'mf'; });
}
export function setSecDyn(song, s, dyn) {
  const S = sections(song)[s];
  if (!S || DYN_VEL[dyn] == null) return song;
  const G = groupsOf(song);
  if (G.slice(S.b0, S.b1 + 1).flat().every(it => it.dyn === dyn)) return song;
  return safe(song, () => rebuild(song, G.map((g, k) => (k >= S.b0 && k <= S.b1 ? g.map(it => ({ ...it, dyn })) : g))));
}
function setSecField(song, field, s, v, cur) {
  const n = sections(song).length;
  if (s < 0 || s >= n || cur[s] === v) return song;
  const arr = Array.from({ length: n }, (_, k) => (song[field] && song[field][k]) || null);
  arr[s] = v;
  return makeSong({ ...defOf(song), [field]: arr });
}
export const setSecTempo = (song, s, bpm) => (bpm > 0 ? setSecField(song, 'secTempo', s, bpm, secTempos(song)) : song);
export const setSecInst = (song, s, inst, base = 'piano') => (inst ? setSecField(song, 'secInst', s, inst, secInsts(song, base)) : song);
// 꾸밈(도막 빠르기 · 악기)과 반주 화음을 떼어 낸 곡 — 다른 부탁으로 넘어갈 때(셈여림은 음에 적힌 것이라 남음)
export function plain(song) {
  if (!song.secTempo && !song.secInst && !song.chordBars) return song;
  const d = defOf(song);
  delete d.secTempo; delete d.secInst; delete d.chordBars;
  return makeSong(d);
}

// ── 반주 화음 붙여 보기(chord) ──  마디마다 다장조 주요 3화음 Ⅰ 도미솔 · Ⅳ 파라도 · Ⅴ 솔시레 · 없음
//  song.chordBars[k] = 'I' | 'IV' | 'V' | 'none'(없음을 고름) | null(아직 안 고름). 어울림을 맞고 틀림으로 따지지 않는다 —
//  가락 음이 그 마디 화음의 음과 같은 음이름인지(사실)만 알려 준다(chordFit).
export const CHORD_TONES = { I: [60, 64, 67], IV: [65, 69, 72], V: [67, 71, 74] };   // 화2 칸과 같은 자리(도미솔 · 파라도 · 솔시레)
export const CHORD_KEYS = ['I', 'IV', 'V', 'none'];
export const chordBars = song => bars(song).map((_, k) => (song.chordBars && song.chordBars[k]) || null);
export function setChord(song, k, c) {
  const B = bars(song);
  if (k < 0 || k >= B.length || (c != null && !CHORD_KEYS.includes(c))) return song;
  const cur = chordBars(song);
  if (cur[k] === c) return song;
  cur[k] = c;
  return makeSong({ ...defOf(song), chordBars: cur });
}
export const chordPcsOf = c => (CHORD_TONES[c] || []).map(pc);
// 가락 음마다 { i0, t, d, p, k(마디), c(그 마디 화음 · 없으면 null), in(화음 음과 같은 음이름 · 화음이 없으면 null) }
export function chordFit(song) {
  const C = chordBars(song);
  return unitsOf(song).filter(u => u.p != null).map(u => {
    const c = C[u.b0] && C[u.b0] !== 'none' ? C[u.b0] : null;
    return { i0: u.i0, t: u.t, d: u.d, p: u.p, k: u.b0, c, in: c ? chordPcsOf(c).includes(pc(u.p)) : null };
  });
}
// 반주 화음 음(틱) — 박마다 세 음을 함께(마디 첫 박은 down). 소리(playEvents)와 오선 '화음' 줄(MUSIC-HARM-1)이 같은 것을 씀
export function chordHarm(song) {
  const C = chordBars(song), bt = beatTicks(song.meter), out = [];
  bars(song).forEach((b, k) => {
    if (!CHORD_TONES[C[k]]) return;
    const end = b.start + b.ticks;
    for (let t = b.start; t < end; t += bt) for (const p of CHORD_TONES[C[k]]) out.push({ t, d: Math.min(bt, end - t), p, down: t === b.start, k });
  });
  return out;
}

// ════ 묶음 D8 — 보고 놓기 카드 둘(오선 보고 놓기 · 음이름 보고 놓기 · 11-14) ════
//  보기(오선에 그린 가락 · 음이름 글)를 보고 그림 악보 판의 같은 높이에 놓는다 — 정답이 있는 놓기(넣고 빼기 E).
//  판 = 4분음표 칸 n개(3 · 4)짜리 한 마디(n/4) · 처음엔 모두 4분쉼표(빈 칸). 칸 하나 = song.ev 하나(붙임줄 없음).
//  판 표시: song.board = 'read' · readKind = 'staff' | 'name' · readPs = 보기 음 높이(MIDI) — makeSong이 그대로 들고 다님(고쳐도 남음)
//  맞음: 오선 = 높이가 같음(같은 줄 · 칸 자리) · 음이름 = 이름이 같음(다장조 고정 — 다 = C … 나 = B · 옥타브와 상관없음)
//  가락은 모두 이 앱에서 지은 것(있는 노래 X) · 오선 가락은 가온 도(C4) ~ 높은 미(E5) — 덧줄은 가온 도 하나뿐
export const NOTE_NAMES = ['다', '라', '마', '바', '사', '가', '나'];                // 다장조 음계 차례(도 레 미 파 솔 라 시)
export const NAME_PC = { 다: 0, 라: 2, 마: 4, 바: 5, 사: 7, 가: 9, 나: 11 };       // 음악 사실: 다 = C · 라 = D · 마 = E · 바 = F · 사 = G · 가 = A · 나 = B
export const noteName = p => (p == null ? null : NOTE_NAMES[MAJOR.indexOf(pc(p))] ?? null);
// 판의 줄(위 → 아래) — 오선: 가온 도 ~ 높은 미 열 줄 · 음이름: 다 ~ 높은 다 여덟 줄(한 옥타브)
export const READ_ROWS = { staff: [76, 74, 72, 71, 69, 67, 65, 64, 62, 60], name: [72, 71, 69, 67, 65, 64, 62, 60] };
// 보기 가락 — 쉬운 것(차례가기 · 줄 안)부터 · 셋째에 가온 도(덧줄) · 높은 미까지. 끝낼 때마다 다음 가락(화면이 차례 번호를 기억)
export const READ_TUNES = {
  staff: [
    [67, 69, 71, 72],   // 솔 라 시 도
    [64, 69, 67],       // 미 라 솔
    [60, 64, 67, 64],   // 도 미 솔 미(가온 도 = 덧줄)
    [72, 71, 67, 69],   // 도 시 솔 라
    [62, 65, 64, 60],   // 레 파 미 도
    [76, 72, 74, 71],   // 미 도 레 시(높은 미 = 넷째 칸)
    [71, 74, 72],       // 시 레 도
    [65, 67, 64, 62],   // 파 솔 미 레
  ],
  name: [
    ['다', '마', '사', '마'],
    ['사', '가', '나', '다'],
    ['마', '바', '사'],
    ['라', '바', '마', '다'],
    ['가', '사', '바', '마'],
    ['바', '라', '다'],
    ['다', '사', '가', '사'],
    ['나', '가', '사', '바'],
  ],
};
// 음이름 → 음이름 판(60~72)의 높이 — 다는 낮은 다(60)
export const nameToPitch = nm => (NAME_PC[nm] == null ? null : 60 + NAME_PC[nm]);
// k번째(0부터 · 차례가 돌아감) 보기 → { kind, ps } · 음이름 보기의 ps는 이름을 판 높이로 바꾼 것(맞음은 이름으로 봄)
export function readTarget(kind, k = 0) {
  const T = READ_TUNES[kind];
  if (!T) return null;
  const t = T[((k % T.length) + T.length) % T.length];
  return { kind, ps: kind === 'name' ? t.map(nameToPitch) : [...t] };
}
// 빈 판 — 보기 음 수만큼 4분쉼표 칸(n/4 한 마디)
export function readBoard(target, { tempo = 100 } = {}) {
  const n = target.ps.length;
  return makeSong({ id: 'read', board: 'read', readKind: target.kind, readPs: [...target.ps], mel: Array(n).fill('Rq').join(' '), meter: [n, 4], tempo });
}
// k번째 칸에 높이 p를 놓음(p = null이면 비움) — 같으면 그대로
export function readPlace(song, k, p = null) {
  const e = song.ev[k];
  if (!e || (e.p ?? null) === (p ?? null)) return song;
  return safe(song, () => rebuild(song, groupsOf(song).map(g => g.map(it => (it.i === k ? { ...it, p: p ?? null, tie: false } : it)))));
}
export const readClear = song => (song.ev.some(e => e.p != null) ? safe(song, () => rebuild(song, groupsOf(song).map(g => g.map(it => ({ ...it, p: null, tie: false }))))) : song);
// 칸 k에 놓아야 할 높이(오선 = 그 높이 · 음이름 = 판 위 그 이름의 낮은 자리)
export const readWant = (song, k) => (song.readPs || [])[k] ?? null;
// 다장조 음계 안 자리 번호(한 칸 = 한 계이름) — 두 음 사이 '몇 칸'을 셀 때
const diaIdx = p => Math.floor(p / 12) * 7 + MAJOR.indexOf(pc(p));
// 판 살피기 → { n, slots(놓은 높이 · 빈 칸 null), ok(칸마다 같은가), placed, same, next(처음 빈 칸 · 없으면 -1),
//   first(놓았는데 다른 첫 칸 · 없으면 -1), steps(first 칸: 보기 − 놓은 것, 음계 칸 수 · 위 = +), all(모두 같음) }
export function readCheck(song) {
  const want = song.readPs || [], name = song.readKind === 'name';
  const slots = want.map((_, k) => (song.ev[k] ? song.ev[k].p ?? null : null));
  const same = (p, w) => p != null && w != null && (name ? pc(p) === pc(w) : p === w);
  const ok = slots.map((p, k) => same(p, want[k]));
  const first = slots.findIndex((p, k) => p != null && !ok[k]);
  return {
    n: want.length, slots, ok, placed: slots.filter(p => p != null).length, same: ok.filter(Boolean).length,
    next: slots.findIndex(p => p == null), first, steps: first >= 0 ? diaIdx(want[first]) - diaIdx(slots[first]) : 0, all: want.length > 0 && ok.every(Boolean),
  };
}

// ── 소리 사건(세 카드 + 예전 놀이터 모두) ──
// 틱 ↔ 초 — 도막마다 빠르기가 다르면 조각마다 이어 붙인다(secTempo가 없으면 곡 빠르기 하나)
export function timeMap(song) {
  const S = sections(song);
  if (!song.secTempo || !S.length) { const k = 60 / song.tempo / TPQ; return { sec: t => t * k, tick: s => s / k, span: (a, b) => (b - a) * k }; }
  const T = secTempos(song), segs = [];
  let acc = 0;
  S.forEach((x, i) => { const k = 60 / T[i] / TPQ; segs.push({ t0: x.t0, t1: x.t1, s0: acc, s1: acc + (x.t1 - x.t0) * k, k }); acc += (x.t1 - x.t0) * k; });
  const at = (key, v) => segs.find(g => v < g[key]) || segs[segs.length - 1];
  const sec = t => { const g = at('t1', t); return g.s0 + (t - g.t0) * g.k; };
  return { sec, tick: s => { const g = at('s1', s); return g.t0 + (s - g.s0) / g.k; }, span: (a, b) => sec(b) - sec(a) };
}
// from ~ to 틱을 소리 사건으로(초 · from이 0초). 가락(도막 악기 · 셈여림) + drums(박마다 북: 센박 큰북 · 나머지 작은 소리)
//  + 반주 화음(chordBars가 있으면 박마다 세 음 · 마디 첫 박을 조금 세게). 음 길이는 to에서 자른다.
export function playEvents(song, { inst = 'piano', from = 0, to = song.total, gap = 0.92, drums = false, chordInst = 'keys' } = {}) {
  const tm = timeMap(song), at = t => tm.span(from, t), out = [];   // 빠르기가 하나면 (t − from) × 초/틱 — 예전 toEvents와 같은 수
  const S = sections(song), I = secInsts(song, inst);
  const instAt = t => { let s = S.findIndex(x => t < x.t1); if (s < 0) s = S.length - 1; return I[s] || inst; };
  for (const n of sounding(song)) {
    if (n.t < from || n.t >= to) continue;
    const end = Math.min(n.t + n.d, to);
    out.push({ t: at(n.t), kind: 'note', inst: instAt(n.t), p: n.p, d: Math.min(tm.span(n.t, n.t + n.d) * gap, tm.span(n.t, end)), vel: n.vel, tick: n.t });
  }
  const cap = barTicks(song.meter), bt = beatTicks(song.meter);
  if (drums) for (let t = Math.ceil(from / bt) * bt; t < to; t += bt) {
    const down = t % cap === 0;
    out.push({ t: at(t), kind: 'drum', drum: down ? 'kick' : 'hat', vel: down ? 0.6 : 0.22, tick: t });
  }
  for (const x of chordHarm(song)) {
    if (x.t < from || x.t >= to) continue;
    out.push({ t: at(x.t), kind: 'note', inst: chordInst, p: x.p, d: tm.span(x.t, Math.min(x.t + x.d, to)) * 0.9, vel: x.down ? 0.34 : 0.24, tick: x.t, chord: true });
  }
  out.sort((a, b) => a.t - b.t);
  return { events: out, total: tm.span(from, to), tm };
}
