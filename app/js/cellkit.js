// 칸 도구 — 개념 칸(app/js/cells/*.js)이 같이 쓰는 것: 진행 저장 · 결과 카드 · 별 · 맞음/삐끗 소리 · 점수
//  칸 모듈 약속(docs/cells.md):
//   export default { show(ui, kit), follow(ui, kit), game(ui, kit) } — 각각 정리 함수를 돌려준다
//   ui  = { stage(무대 그릇), bar(아래 띠), say(글), setBar(...단추) }
//   kit = { engine, device, band, next(), pass(), finish(결과), setAuto(fn), ... }
import { h, lsGet, lsSet, onPress } from './util.js';
import { goodSound } from './music.js';
import { friendImg } from './band.js';
import { STEP_TEXT } from '../../engine/theme.js';

// ── 진행 · 결과 기록(기기에만 · 이름 없음) ──
//  { [칸]: { stars(최고 별), at(마지막), hist: [{ at, s(별), k(맞힌 수), n(전체), tip(틀린 갈래 한 줄) }](최근 10개) } }
//  hist = 과정 중심 평가 자료(선생님 칸 '이 기기 기록 보기' · #/records). 예전 모양 { stars, at }도 그대로 읽힌다(hist 없음)
export const HIST_MAX = 10;
export const getProg = () => lsGet('prog', {});
// r = 결과 카드 자료(cell.js finish) 또는 { stars, kept, total, tip }(징검다리) — k/n은 다시 보기 줄(replay)에서, 없으면 kept/total
export function saveResult(id, r) {
  const p = getProg();
  const old = p[id] && typeof p[id] === 'object' ? p[id] : {};
  const s = r.stars ?? (r.starOn || []).filter(Boolean).length;
  const rep = Array.isArray(r.replay) && r.replay.length ? r.replay : null;
  const k = rep ? rep.filter(Boolean).length : r.kept ?? null, n = rep ? rep.length : r.total ?? null;
  const at = Date.now();
  const hist = [...(Array.isArray(old.hist) ? old.hist : []), { at, s, k, n, tip: r.tip || '' }].slice(-HIST_MAX);
  p[id] = { ...old, stars: Math.max(old.stars || 0, s), at, hist };
  lsSet('prog', p);
  return p[id].stars;
}

// ── 성취기준 줄(선생님 화면만) — 기호 하나씩 끊기지 않게([4음02-01]◎ 가운데에서 줄이 바뀌지 않게) ──
export const stdEl = (std, cls = 'stdl') => h('span', { class: cls, title: '◎ 직접 · ○ 요소 기초' }, ...(std || []).flatMap(([code, m], i) => [i ? ' ' : null, h('span', { class: 'sc' }, `[${code}]${m}`)]));

// ── 별 ──
export const STAR_SVG = on => `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3l5 11 12 1.4-9 8.2 2.6 11.9L20 29.6 9.4 35.5 12 23.6 3 15.4 15 14z" fill="${on ? '#E0A100' : '#FFFFFF'}" stroke="#3B2A1E" stroke-width="3" stroke-linejoin="round"/></svg>`;

// 고르기 게임 점수 — results = [true/false…] · 별 기준 ① 절반 넘게 ② need번 이어서 ③ 모두
export function scoreChoices(results, need = 5) {
  let run = 0, best = 0, kept = 0;
  for (const r of results) { if (r) { run++; kept++; best = Math.max(best, run); } else run = 0; }
  const total = results.length, n = Math.min(need, total);
  const starOn = [kept * 2 > total, best >= n, total > 0 && kept === total];
  return { total, kept, streak: best, starOn, stars: starOn.filter(Boolean).length, rules: ['절반 넘게 맞혔어요', `${n}번 이어서 맞혔어요`, '모두 맞혔어요'] };
}

// 결과 카드 — r = { title, replay:[true/false], group(다시 보기 묶음 크기 · 기본 4 · 배열이면 묶음마다 길이), facts:[…], starOn, rules, tip }
export function resultCard(r) {
  const g = r.group || 4;
  const cuts = new Set();
  if (Array.isArray(g)) { let t = 0; for (const n of g) { t += n; cuts.add(t); } } else for (let t = g; t < (r.replay || []).length; t += g) cuts.add(t);
  const replay = r.replay ? h('div', { class: 'replay', 'aria-label': '다시 보기' },
    ...r.replay.map((ok, i) => [i && cuts.has(i) ? h('span', { class: 'gap' }) : null, h('i', { class: ok ? 'g' : 'm' })]).flat()) : null;
  return h('div', { class: 'panelcard resultcard', role: 'dialog', 'aria-label': '결과' },
    h('h2', {}, r.title),
    replay,
    h('div', { class: 'facts' }, ...(r.facts || []).flatMap((f, i) => (i ? [h('br'), f] : [f]))),
    starRow(r.rules, r.starOn, r),
    r.tip ? h('div', { class: 'tip' }, r.tip) : null,
    freshLine(r.fresh));
}
// 별 줄 — 켜진 별은 소리에 맞춰 하나씩 톡(delays · music.starSounds) · 이번에 처음 받은 별엔 '새 별'(newFrom = 전에 받은 최고 별 수)
export function starRow(rules, starOn, { delays = null, newFrom = 3 } = {}) {
  let j = 0, lit = 0;
  return h('div', { class: 'stars' }, ...rules.map((t, k) => {
    const on = !!starOn[k], d = on && delays ? delays[j++] : null;
    if (on) lit++;
    const el = h('div', { class: 'star' + (on ? ' on' : '') + (d != null ? ' pop' : ''), style: d != null ? { '--d': d + 'ms' } : null, html: STAR_SVG(on) + `<span>${t}</span>` });
    if (on && lit > newFrom) el.append(h('b', { class: 'newstar' }, '새 별'));
    return el;
  }));
}
// 처음 화면 음악에 새 줄이 생겼으면 한 줄(친구 얼굴 + 무엇이 더해졌는지)
export function freshLine(fresh) {
  if (!fresh || !fresh.length) return null;
  return h('div', { class: 'freshline' }, ...fresh.map(x => friendImg(x.key, 'face', { label: false })),
    h('span', {}, `처음 화면 음악에 ${fresh.map(x => STEP_TEXT[x.key][x.to]).join(' · ')} 소리가 더해졌어요`));
}

// ── 소리 ──
// 맞음 = 마림바 두 음 위로 — 이어서 맞힐수록 한 칸씩 올라감(솔 라 도 레 미 → 여섯째부터 화음 · docs/sound.md §5)
// 삐끗 = 나무 소리 하나(혼내는 소리 X) · 사다리는 처음부터 · 칸 단계가 바뀌면 cell.js가 reset
export const sfx = {
  k: 0,
  good() { this.k++; goodSound(this.k); },
  oops(engine) { this.k = 0; const t = engine.ensure().currentTime + 0.01; engine.drum('gi', t, 0.6); engine.note('marimba', 62, t + 0.05, 0.25, 0.35); },
  reset() { this.k = 0; },
};
// 음 차례 틀기 — notes = [{ p, d(초), gap(초) , inst, vel }] → 끝나는 시각(초 뒤)
export function playSeq(engine, notes, { inst = 'xylo', vel = 0.8, at = 0.05, out = null } = {}) {
  const ac = engine.ensure();
  let t = ac.currentTime + at;
  const starts = [];
  for (const n of notes) {
    starts.push(t);
    if (n.p != null) engine.note(n.inst || inst, n.p, t, n.d, n.vel ?? vel, out);
    t += n.d + (n.gap ?? 0.12);
  }
  return { starts, end: t, ac };
}
// 오디오 시각 → 그때까지 남은 ms(그림 맞추기)
export const msUntil = (ac, t) => Math.max(0, (t - ac.currentTime) * 1000);
// 기다리기(정리 때 멈출 수 있게 타이머 목록에 넣는다)
export function timers() {
  const list = new Set();
  return {
    after(ms, fn) { const id = setTimeout(() => { list.delete(id); fn(); }, ms); list.add(id); return id; },
    clear() { for (const id of list) clearTimeout(id); list.clear(); },
  };
}
// 무작위(칸마다 같은 판이 되풀이되지 않게 · 시험에서는 seed로 재현)
export function rng(seed = Date.now()) {
  let s = (seed >>> 0) || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
export const shuffle = (a, r = Math.random) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// 답 단추 묶음(11-07 평가 2차 — 모든 고르기 칸이 같은 모양 · 같은 자리: 무대 오른쪽 세로 한 줄)
//  items = [{ key, label, chip(그림 html 또는 노드), locked }] · onPick(key)
//  게임 중에 고를 것이 늘어나는 칸은 처음부터 다 깔고 locked로 둔다 — 잠긴 단추는 보이지 않지만 자리는 지킴(자리가 밀리지 않게 · 평가 3차)
export function answers(items, onPick, { cls = '' } = {}) {
  const btns = new Map();
  const el = h('div', { class: ('answers ' + cls).trim(), role: 'group' }, ...items.map(it => {
    const chip = h('span', { class: 'chip', 'aria-hidden': 'true' });
    if (it.chip && it.chip.nodeType) chip.append(it.chip); else if (it.chip) chip.innerHTML = it.chip;
    const b = h('button', { type: 'button', class: 'ans' + (it.locked ? ' locked' : ''), 'data-k': it.key, 'aria-disabled': it.locked ? 'true' : null },
      it.chip ? chip : null, h('span', { class: 'lab' }, it.label));
    onPress(b, () => { if (!b.classList.contains('locked')) onPick(it.key); });
    btns.set(it.key, b);
    return b;
  }));
  return {
    el,
    btn: k => btns.get(k),
    lock(k, on = true) { const b = btns.get(k); if (b) { b.classList.toggle('locked', on); b.setAttribute('aria-disabled', on ? 'true' : 'false'); } },
    // 고른 뒤 표시 — 'right' 금 테두리 · 'wrong' 점선(빨강 X)
    mark(k, kind) { for (const b of btns.values()) b.classList.remove('right', 'wrong'); if (k != null) { const b = btns.get(k); if (b) b.classList.add(kind); } },
    clear() { for (const b of btns.values()) b.classList.remove('right', 'wrong'); },
    // 틀린 뒤 맞는 답도 함께 보이기(고른 단추 회색은 그대로 두고 맞는 단추에 초록 ✓)
    reveal(k) { const b = btns.get(k); if (b) b.classList.add('right'); },
    // 듣는 동안 — 단추는 70%로 흐리게(누를 수 없음) · 묶음 위 '잘 들어요'(평가 3차: 회색 단추로 꺼 두지 않음)
    busy(on = true) { el.classList.toggle('busy', on); },
  };
}
