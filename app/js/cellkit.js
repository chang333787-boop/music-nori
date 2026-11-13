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
//  { [칸]: { stars(최고 별), at(마지막), hist: [{ at, s(별), k(맞힌 수), n(전체), l(늦게 · 없으면 예전 기록), tip(틀린 갈래 한 줄),
//    sd(판 씨앗), r(어디서 — 'solo' 방 밖 · 'room' 방에 든 기기 · 'tvs' 소리는 TV · 답만 이 기기), t(두드림 어긋남 — 박 칸만 · judge.js tapStats) }](최근 10개) } }
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
  const l = rep ? rep.filter(x => x === null).length : r.late ?? null;   // 늦게 = 고르기 전에 시간이 지난 판(틀림과 따로 · N1)
  const at = Date.now();
  const row = { at, s, k, n, l, tip: r.tip || '' };
  if (r.sd != null) row.sd = r.sd;                    // 판 씨앗(N2 · 같은 판을 다시 만들 수 있게)
  if (r.mode) row.r = r.mode;                         // 'tvs' = 소리는 TV 하나 · 답은 각자로 한 판 · 'room' 방에 든 기기 · 'solo' 방 밖(X4 · 이어폰 기록과 TV 소리 기록을 가름)
  if (r.t) row.t = r.t;                               // 두드림 어긋남 { o, sp, m, lat, band, bpm }(박 칸 · X4 · 3월 판정 창을 다시 맞출 자료)
  const hist = [...(Array.isArray(old.hist) ? old.hist : []), row].slice(-HIST_MAX);
  p[id] = { ...old, stars: Math.max(old.stars || 0, s), at, hist };
  if (!lsSet('prog', p) && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('save-fail'));   // 저장이 막힌 기기(개인 창 · 꽉 참) — 톱니에 주황 점(X3)
  return p[id].stars;
}

// ── 성취기준 줄(선생님 화면만) — 기호 하나씩 끊기지 않게([4음02-01]◎ 가운데에서 줄이 바뀌지 않게) ──
export const stdEl = (std, cls = 'stdl') => h('span', { class: cls, title: '◎ 직접 · ○ 요소 기초' }, ...(std || []).flatMap(([code, m], i) => [i ? ' ' : null, h('span', { class: 'sc' }, `[${code}]${m}`)]));

// ── 별 ──
export const STAR_SVG = on => `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3l5 11 12 1.4-9 8.2 2.6 11.9L20 29.6 9.4 35.5 12 23.6 3 15.4 15 14z" fill="${on ? '#E0A100' : '#FFFFFF'}" stroke="#3B2A1E" stroke-width="3" stroke-linejoin="round"/></svg>`;

// 고르기 게임 점수 — results = [true/false…] · 별 기준 ① 절반 넘게 ② need번 이어서 ③ 모두
//  results 칸 = true(맞음) · false(틀림) · null(고르기 전에 시간이 지남 — 점수에선 틀림, late로 따로 셈 · N1)
//  chance = 판마다 찍어서 맞힐 확률(고르기 칸 · N2) — 주면 별 ①은 '찍기로는 10%도 안 나오는 수' 이상(minKeep) · 별 ②는 ①을 받은 뒤에만
//   (이어서 맞힘만으로 별을 받던 길을 막음). 안 주면 예전 규칙 그대로(박 칸)
export function scoreChoices(results, need = 5, { chance = null } = {}) {
  let run = 0, best = 0, kept = 0;
  for (const r of results) { if (r) { run++; kept++; best = Math.max(best, run); } else run = 0; }
  const total = results.length, n = Math.min(need, total), late = results.filter(r => r === null).length;
  if (chance) {
    const floor = minKeepP(chance.length === total ? chance : Array(total).fill(chance[0] ?? 0.5));
    const starOn = [kept >= floor, kept >= floor && best >= n, total > 0 && kept === total];
    return { total, kept, late, floor, streak: best, starOn, stars: starOn.filter(Boolean).length, rules: [`${total}번 중 ${floor}번은 맞혔어요`, `${n}번 이어서 맞혔어요`, '모두 맞혔어요'] };
  }
  const starOn = [kept * 2 > total, best >= n, total > 0 && kept === total];
  return { total, kept, late, streak: best, starOn, stars: starOn.filter(Boolean).length, rules: ['절반 넘게 맞혔어요', `${n}번 이어서 맞혔어요`, '모두 맞혔어요'] };
}
// 찍기 바닥(N2) — 판마다 찍어 맞힐 확률 ps일 때, 찍어서 k개 이상 맞힐 확률이 alpha(10%)보다 작아지는 가장 작은 k
//  (판마다 확률이 달라도 되게 포아송 이항 분포를 직접 셈) · minKeep(12, 2) = 9 · minKeep(12, 3) = 7
export function minKeepP(ps, alpha = 0.10) {
  let dist = [1];
  for (const p of ps) { const nx = Array(dist.length + 1).fill(0); dist.forEach((v, k) => { nx[k] += v * (1 - p); nx[k + 1] += v * p; }); dist = nx; }
  let tail = 0;
  for (let k = dist.length - 1; k >= 0; k--) { tail += dist[k]; if (tail >= alpha) return Math.min(ps.length, k + 1); }
  return 0;
}
export const minKeep = (total, choices, alpha = 0.10) => minKeepP(Array(total).fill(1 / choices), alpha);
// 씨앗(N2) — 글 조각을 이어 32비트 FNV-1a(같은 방 · 같은 칸 · 같은 판 시각이면 TV와 아이 기기가 같은 판)
export function seedOf(...parts) {
  let x = 0x811c9dc5;
  for (const ch of parts.join('|')) { x ^= ch.codePointAt(0); x = Math.imul(x, 0x01000193) >>> 0; }
  return x >>> 0;
}
// 단계 안 섞기(N2) — 단계 경계(cuts)는 그대로 두고 단계 안에서만 차례를 섞고, 판마다 반쯤 답을 뒤집음(flip).
//  조건: 같은 답 maxRun+1번 연속 X · 처음 네 판이 ABAB로 번갈아 X · balance면 답 수가 같게. 못 채우면 다시 뽑고 tries 넘으면 원판
//  → 번갈아 누르기 · 늘 같은 답으로 별을 받지 못하게(11-08 토론: 소4는 번갈아 누르면 12번 중 10번이었음)
export function stageShuffle(plan, cuts, r, { flip = null, answerOf = null, maxRun = 2, noAlt4 = true, balance = true, tries = 300 } = {}) {
  const bounds = [0, ...cuts, plan.length];
  const good = arr => {
    if (!answerOf) return true;
    const a = arr.map(answerOf);
    for (let i = maxRun; i < a.length; i++) if (a.slice(i - maxRun, i + 1).every(x => x === a[i])) return false;
    if (noAlt4 && a.length >= 4 && a[0] === a[2] && a[1] === a[3] && a[0] !== a[1]) return false;
    if (balance) { const c = {}; for (const x of a) c[x] = (c[x] || 0) + 1; const v = Object.values(c); if (v.length > 1 && Math.max(...v) - Math.min(...v) > a.length % 2) return false; }
    return true;
  };
  for (let t = 0; t < tries; t++) {
    const out = [];
    for (let k = 0; k + 1 < bounds.length; k++) out.push(...shuffle(plan.slice(bounds[k], bounds[k + 1]), r).map(p => (flip && r() < 0.5 ? flip(p) : p)));
    if (good(out)) return out;
  }
  return plan.slice();
}
// 단계 꼬리표 문항 표(X2) → 단계 경계 — 줄마다 stage('intro' 소개 · 'grow' 발전 · 'twist' 비틀기 · 'end' 마무리)가 바뀌는 자리
//  문항 표 하나에서 경계를 읽어 CUTS가 표와 어긋날 수 없게(새 칸 · TV 소리 모드 · 섞어 듣기가 모두 이 표를 씀)
export const stageCuts = plan => plan.map((p, k) => (k && p.stage !== plan[k - 1].stage ? k : 0)).filter(Boolean);
// 결과 한 줄(tip) — 사실만(N1 · 11-08 토론): 틀린 갈래 말은 그 갈래가 틀린 판(시간 지남 뺌)의 2/3를 넘고 3번 이상일 때만.
//  그 밖에는 몇째 판을 틀렸는지만 · 시간이 지난 판은 따로 한 줄. branches = [{ n: 그 갈래 틀린 수, text }](앞에서부터 우선)
export function factTip(results, branches, perfect) {
  tipPick.b = -1; tipPick.n = branches.length;
  const late = results.filter(r => r === null).length;
  const wrongAt = results.map((r, k) => (r === false ? k + 1 : 0)).filter(Boolean), dir = wrongAt.length;
  if (!dir && !late) return perfect;
  const out = [];
  if (dir) {
    const bi = dir >= 3 ? branches.findIndex(x => x.n > dir * 2 / 3) : -1, b = bi >= 0 ? branches[bi] : null;
    tipPick.b = bi;
    out.push(b ? b.text : `${wrongAt.slice(0, 4).join(' · ')}번째 판을 틀렸어요${dir > 4 ? `(그 밖에 ${dir - 4}판 더)` : ''}.`);
  }
  if (late) out.push(`고르기 전에 시간이 지난 판이 ${late}번 있었어요.`);
  return out.join(' ');
}
// 방금 고른 틀린 갈래의 자리(X6 둘째) — factTip이 채움: b = 갈래 차례(0부터 · 갈래 말을 하지 않았으면 -1) · n = 갈래 수.
//  방에 든 아이 기기가 결과와 함께 이 '차례 숫자'만 TV로 보냄(글 X) → TV는 칸의 TIPS_TV[b] 짧은 이름으로 '틀린 갈래' 막대를 그림
//  제 손으로 갈래를 고르는 칸(박 칸 · 가1)은 kit.finish({ …, b })로 직접 알림
export const tipPick = { b: -1, n: 0 };
// 별 0이 이어진 수(X11) — 기록 끝(가장 새 줄)에서부터 별 0인 줄 수 · since(ms)보다 앞선 줄에서 멈춤
export function zeroRun(hist, since = 0) {
  let n = 0;
  for (let i = (hist || []).length - 1; i >= 0 && hist[i] && hist[i].s === 0 && (hist[i].at || 0) >= since; i--) n++;
  return n;
}

// 결과 카드 — r = { title, replay:[true/false], group(다시 보기 묶음 크기 · 기본 4 · 배열이면 묶음마다 길이), facts:[…], starOn, rules, tip }
//  before = 같은 화면에서 바로 앞 판(결과의 '한 번 더' 앞)의 starOn — 그 별 옆에 '아까' 빈 테두리 별(X2 · 화면 안 기억만 · 기기 기록끼리 견주지 않음)
export function resultCard(r) {
  const g = r.group || 4;
  const cuts = new Set();
  if (Array.isArray(g)) { let t = 0; for (const n of g) { t += n; cuts.add(t); } } else for (let t = g; t < (r.replay || []).length; t += g) cuts.add(t);
  const replay = r.replay ? h('div', { class: 'replay', 'aria-label': '다시 보기' },
    ...r.replay.map((ok, i) => [i && cuts.has(i) ? h('span', { class: 'gap' }) : null, h('i', { class: ok === null ? 'l' : ok ? 'g' : 'm', title: ok === null ? '시간이 지남' : null })]).flat()) : null;
  return h('div', { class: 'panelcard resultcard', role: 'dialog', 'aria-label': '결과' },
    h('h2', {}, r.title),
    replay,
    h('div', { class: 'facts' }, ...(r.facts || []).flatMap((f, i) => (i ? [h('br'), f] : [f]))),
    starRow(r.rules, r.starOn, r),
    r.tip ? h('div', { class: 'tip' }, r.tip) : null,
    freshLine(r.fresh));
}
// 별 줄 — 켜진 별은 소리에 맞춰 하나씩 톡(delays · music.starSounds) · 이번에 처음 받은 별엔 '새 별'(newFrom = 전에 받은 최고 별 수)
//  before = 아까(같은 화면 바로 앞 판) 받은 별 — 그 줄 끝에 점선 빈 별 + '아까'(이번 별과 헷갈리지 않게 작게 · 채우지 않음)
export function starRow(rules, starOn, { delays = null, newFrom = 3, before = null } = {}) {
  let j = 0, lit = 0;
  return h('div', { class: 'stars' + (before ? ' hasbefore' : '') }, ...rules.map((t, k) => {
    const on = !!starOn[k], d = on && delays ? delays[j++] : null;
    if (on) lit++;
    const el = h('div', { class: 'star' + (on ? ' on' : '') + (d != null ? ' pop' : ''), style: d != null ? { '--d': d + 'ms' } : null, html: STAR_SVG(on) + `<span>${t}</span>` });
    if (on && lit > newFrom) el.append(h('b', { class: 'newstar' }, '새 별'));
    if (before && before[k]) el.append(h('span', { class: 'beforestar', html: BEFORE_SVG + '<em>아까</em>' }));
    return el;
  }));
}
const BEFORE_SVG = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3l5 11 12 1.4-9 8.2 2.6 11.9L20 29.6 9.4 35.5 12 23.6 3 15.4 15 14z" fill="none" stroke="#3B2A1E" stroke-width="2.6" stroke-dasharray="4 3" stroke-linejoin="round"/></svg>';
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
// '헷갈리는 두 소리'(X11 · 칸 모듈 NEAR = [{ label, low?, play }, { … }]) 한 쪽 — 음 차례를 out(cell.js가 준 소리 길)으로 틀고 끝날 때까지 남은 초를 돌려주는 함수를 만든다
//  별 0일 때 결과 화면에서 번갈아 듣기만(점수 없음) · 눈으로 푸는 칸 · 톡 치는 칸은 NEAR를 두지 않는다
export const nearSeq = (notes, opt = {}) => (kit, out) => { const s = playSeq(kit.engine, notes, { ...opt, out }); return s.end - s.ac.currentTime; };
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
    // 고르기 시계 — 답 단추 묶음 아래 줄어드는 줄(깜빡임 · 소리 · 숫자 X · N1). sec초 동안 줄어듦 · 0이면 숨김. 다시 듣기면 다시 부름
    timer(sec) {
      let t = el.querySelector('.anstimer');
      if (!sec) { if (t) t.hidden = true; return; }
      if (!t) { t = h('i', { class: 'anstimer', 'aria-hidden': 'true' }); el.append(t); }
      t.hidden = false; t.classList.remove('run'); void t.offsetWidth;
      t.style.animationDuration = sec.toFixed(2) + 's'; t.classList.add('run');
    },
  };
}
