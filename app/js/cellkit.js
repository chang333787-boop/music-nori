// 칸 도구 — 개념 칸(app/js/cells/*.js)이 같이 쓰는 것: 진행 저장 · 결과 카드 · 별 · 맞음/삐끗 소리 · 점수
//  칸 모듈 약속(docs/cells.md):
//   export default { show(ui, kit), follow(ui, kit), game(ui, kit) } — 각각 정리 함수를 돌려준다
//   ui  = { stage(무대 그릇), bar(아래 띠), say(글), setBar(...단추) }
//   kit = { engine, device, band, next(), pass(), finish(결과), setAuto(fn), ... }
import { h, lsGet, lsSet } from './util.js';

// ── 진행(기기에만) ── { [칸]: { stars, at } }
export const getProg = () => lsGet('prog', {});
export function saveStars(id, stars) {
  const p = getProg();
  const old = p[id] ? p[id].stars : 0;
  p[id] = { stars: Math.max(old, stars), at: Date.now() };
  lsSet('prog', p);
  return p[id].stars;
}

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

// 결과 카드 — r = { title, replay:[true/false], facts:[…], starOn, rules, tip }
export function resultCard(r) {
  const replay = r.replay ? h('div', { class: 'replay', 'aria-label': '다시 보기' },
    ...r.replay.map((ok, i) => [i && i % 4 === 0 ? h('span', { class: 'gap' }) : null, h('i', { class: ok ? 'g' : 'm' })]).flat()) : null;
  return h('div', { class: 'panelcard resultcard', role: 'dialog', 'aria-label': '결과' },
    h('h2', {}, r.title),
    replay,
    h('div', { class: 'facts' }, ...(r.facts || []).flatMap((f, i) => (i ? [h('br'), f] : [f]))),
    h('div', { class: 'stars' }, ...r.rules.map((t, k) => h('div', { class: 'star' + (r.starOn[k] ? ' on' : ''), html: STAR_SVG(r.starOn[k]) + `<span>${t}</span>` }))),
    r.tip ? h('div', { class: 'tip' }, r.tip) : null);
}

// ── 소리 ──
// 맞음 = 마림바 두 음 위로 · 삐끗 = 나무 소리 하나(혼내는 소리 X)
export const sfx = {
  good(engine) { const t = engine.ensure().currentTime + 0.01; engine.note('marimba', 79, t, 0.12, 0.45); engine.note('marimba', 84, t + 0.09, 0.2, 0.45); },
  oops(engine) { const t = engine.ensure().currentTime + 0.01; engine.drum('gi', t, 0.6); engine.note('marimba', 62, t + 0.05, 0.25, 0.35); },
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
