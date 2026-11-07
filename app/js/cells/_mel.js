// 가락·악보 칸(가1 솔·미 · 가2 라 · 가3 도 · 악2 오선의 줄과 칸) 공용 도우미
//  · 계이름 배지(theory.js colorOf + 글자) · 높이 판(계이름 계단 + 참새) · 높이 그림(가락을 점·막대로 · 뒤에 사다리 띠)
//  · 보기 카드(스피커 그림 + 이름) · 계이름 답 단추(kit.answers) · 판정 말풍선(ui.tell)
//  · 소리 길(칸 정리 때 바로 끊음) · 대장 곡 → 박 단위 음 목록 · 시작 카드
//  높이는 늘 세로 위치. 세로 자리는 오선과 같은 '음 자리'(미 = 0 · 솔 = 2 · 라 = 3 · 도 = -2 — notation.js staffPos)로 놓는다:
//  솔-라는 바로 붙은 계단, 도-미-솔은 한 칸씩 건너뛴 계단으로 보이고, 그대로 악2 오선(미 = 첫째 줄 · 솔 = 둘째 줄 · 라 = 둘째 칸)으로 이어진다.
//  모양은 app/css/cells/_mel.css(가락 칸 넷이 같이 씀 · 처음 불릴 때 한 번 붙임)
import { svg, josa } from '../util.js';
import { solfege, colorOf, TPQ } from '../../../engine/theory.js';
import { staffPos } from '../notation.js';
import { makeSong } from '../../../engine/song.js';
import { songById } from '../../../engine/songs/index.js';

export const DO = 60, RE = 62, MI = 64, FA = 65, SOL = 67, LA = 69;
export const nameOf = p => solfege(p, { short: true });
export const posOf = staffPos;
export { colorOf, josa };
// 손 높이(코다이 손 기호의 높이만 빌림 — 배 < 가슴 < 어깨 < 턱)
export const HAND = { [DO]: '배', [MI]: '가슴', [SOL]: '어깨', [LA]: '턱' };
// 자동 시험 · 키보드가 단추를 누르는 길(손가락과 같은 pointerdown)
export const press = el => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

(() => {
  if (typeof document === 'undefined' || document.querySelector('link[data-mel]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = 'app/css/cells/_mel.css'; l.dataset.mel = '1';
  document.head.append(l);
})();

// ── 소리 길 — 칸 단계마다 하나. cut() = 지금 나는(예약된) 소리를 끊음 · 다음 play는 새 길 ──
export function voice(engine) {
  let bus = null;
  const fade = () => {
    if (!bus) return;
    const b = bus, g = b.gain, now = engine.now;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0, now + 0.05);
    setTimeout(() => { try { b.disconnect(); } catch { /* 이미 끊김 */ } }, 400);
    bus = null;
  };
  return {
    play(kit, notes, opt = {}) { if (!bus) { engine.ensure(); bus = engine.bus(); } return kit.playSeq(engine, notes, { ...opt, out: bus }); },
    cut: fade,
  };
}

// 대장 곡 → [{ p, t(박), d(박) }] (쉼표는 빈자리로 남음)
export function songNotes(id) {
  const s = makeSong(songById(id));
  return { title: s.title, tempo: s.tempo, beats: s.total / TPQ, notes: s.ev.filter(e => e.p != null).map(e => ({ p: e.p, t: e.t / TPQ, d: e.d / TPQ })) };
}
// 박 단위 음 목록을 그대로 틀기 — starts[i] = i째 음이 나는 오디오 시각
export function playBeats(V, kit, notes, { tempo = 100, inst = 'xylo' } = {}) {
  const spb = 60 / tempo;
  const seq = notes.map((n, i) => {
    const d = n.d * spb * 0.9, nx = notes[i + 1];
    return { p: n.p, d, gap: nx ? (nx.t - n.t) * spb - d : 0 };
  });
  return V.play(kit, seq, { inst });
}

// 계이름 배지 — 흰 동그라미 + 잉크 글자(어느 바탕색 위에서도 읽힘)
export function badge(h, p, cls = '') {
  return h('span', { class: ('m-badge ' + cls).trim(), style: { '--c': colorOf(p) } }, nameOf(p));
}

// ── 높이 판 — 계이름마다 색 계단 하나(세로 = 음 자리) · 참새가 소리 나는 계단 옆으로 폴짝 ──
//  ghosts = 아직 안 배운 자리(점선 빈 계단 — 가2에서 파 · 가3에서 레 · 파: 건너뛴 계단이 보이게)
export function heightBoard(kit, { notes, ghosts = [], hands = false, rh = 60, friend = 'bird' }) {
  const { h } = kit;
  const all = [...notes, ...ghosts].map(posOf);
  const lo = Math.min(...all) - 0.6, hi = Math.max(...all) + 0.6;
  const yOf = p => ((posOf(p) - lo) / (hi - lo)) * 100;
  const at = p => `calc(${yOf(p).toFixed(2)}% - ${rh / 2}px)`;
  const el = h('div', { class: 'm-board', style: { '--rh': rh + 'px' } });
  for (const p of ghosts) el.append(h('div', { class: 'm-rung ghost', style: { bottom: at(p) }, 'aria-hidden': 'true' }));
  const rungs = new Map();
  for (const p of notes) {
    const r = h('div', { class: 'm-rung', style: { bottom: at(p), '--c': colorOf(p) } },
      badge(h, p), hands ? h('span', { class: 'm-hand' }, `손은 ${HAND[p]}`) : null);
    rungs.set(p, r); el.append(r);
  }
  const bird = h('div', { class: 'm-bbird' }, kit.friendImg(friend, 'idle', { label: false }));
  el.append(bird);
  const pose = ps => kit.setPose(bird.firstChild, friend, ps);
  const lit = p => rungs.forEach((r, q) => r.classList.toggle('on', q === p));
  function move(p, ps = 'play') {
    lit(p);
    bird.style.bottom = `calc(${yOf(p).toFixed(2)}% - 48px)`;
    bird.classList.remove('hop'); void bird.offsetWidth; bird.classList.add('hop');
    pose(ps);
  }
  const rest = () => { lit(null); pose('idle'); };
  bird.style.bottom = `calc(${((yOf(notes[0]) + yOf(notes[notes.length - 1])) / 2).toFixed(2)}% - 48px)`;
  return { el, move, lit, rest, pose, rungs };
}

// ── 높이 그림(SVG) — 가락을 왼쪽 → 오른쪽 차례로, 세로 = 음 자리 ──
//  items = [{ p, t, d }](t · d = 박) · pill = 길이만큼 막대(곡) / 아니면 점(짧은 가락) · join = 점을 선으로 이음(가3 모양 그림)
//  rows = 사다리 띠를 깔 계이름(+ghosts 점선 빈 띠) · height = 그림 높이(px) — 띠 사이는 높이에 맞춰 저절로
//  띠는 계이름 색을 옅게 깐 막대(높이 판 계단과 같은 말) — 가는 점선은 오선처럼 보여서 쓰지 않는다(평가 2차)
//  그림은 1:1 크기로 둔다(줄여 보이면 동그라미 글자가 18px 아래로 작아짐)
export function heightPic(items, { rows, ghosts = [], height = 90, unit = 46, r = 18, pill = false, join = false, pad = 6, guide = true, label = true }) {
  const all = [...rows, ...ghosts, ...items.map(n => n.p)].map(posOf);
  const lo = Math.min(...all), hi = Math.max(...all);
  const step = hi > lo ? (height - 2 * pad - 2 * r) / (hi - lo) : 0;
  const yOf = p => pad + r + (hi - posOf(p)) * step + (hi > lo ? 0 : (height - 2 * pad - 2 * r) / 2);
  const beats = Math.max(...items.map(n => n.t + (pill ? n.d : 0)));
  const W = pill ? pad * 2 + beats * unit : pad * 2 + 2 * r + beats * unit;
  const root = svg('svg', { viewBox: `0 0 ${W.toFixed(1)} ${height}`, width: Math.round(W), height, class: 'm-pic' + (pill ? ' pill' : ''), 'aria-hidden': 'true' });
  if (guide) {
    const ps = [...new Set([...rows, ...ghosts].map(posOf))].sort((a, b) => a - b);
    let near = Infinity;
    for (let k = 1; k < ps.length; k++) near = Math.min(near, (ps[k] - ps[k - 1]) * step);
    const bh = Math.max(6, Math.min(2 * r - 8, near - 5));
    const band = (p, cls, fill) => root.append(svg('rect', { x: 1.5, y: (yOf(p) - bh / 2).toFixed(1), width: (W - 3).toFixed(1), height: bh.toFixed(1), rx: bh / 2, class: cls, fill }));
    for (const p of ghosts) band(p, 'm-band ghost', 'none');
    for (const p of rows) band(p, 'm-band', colorOf(p));
  }
  const cx = n => (pill ? pad + n.t * unit + r : pad + r + n.t * unit);
  if (join && items.length > 1) root.append(svg('polyline', { points: items.map(n => `${cx(n).toFixed(1)},${yOf(n.p).toFixed(1)}`).join(' '), class: 'm-join' }));
  const marks = items.map(n => {
    const y = yOf(n.p), g = svg('g', { class: 'm-mark' });
    if (pill) {
      const w = Math.max(2 * r, n.d * unit - 6);
      g.append(svg('rect', { x: pad + n.t * unit, y: y - r, width: w, height: 2 * r, rx: r, fill: colorOf(n.p), class: 'm-shape' }));
    } else g.append(svg('circle', { cx: cx(n), cy: y, r, fill: colorOf(n.p), class: 'm-shape' }));
    if (label) g.append(svg('text', { x: cx(n), y: y + 1, class: 'm-pl', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, nameOf(n.p)));
    root.append(g);
    return g;
  });
  return { el: root, marks, lit: k => marks.forEach((m, i) => m.classList.toggle('on', i === k)) };
}

// ── 보기 카드 — 누를 수 있다는 스피커 그림 + 이름 + 그림(묶음 위에는 hearHead) ──
const SPK = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 15h7l9-7v24l-9-7H6z" fill="#FFFFFF" stroke="#3B2A1E" stroke-width="3" stroke-linejoin="round"/><path d="M27 14.5c2.6 3.2 2.6 7.8 0 11M31.5 10.5c5 5.4 5 13.6 0 19" fill="none" stroke="#3B2A1E" stroke-width="3" stroke-linecap="round"/></svg>';
export const speaker = h => h('span', { class: 'm-spk', html: SPK });
export const hearHead = h => h('p', { class: 'm-hear' }, '눌러서 들어 봐요');
export function exCard(kit, { name, pic, sub = null, wide = false, cls = '' }) {
  const { h } = kit;
  return h('button', { type: 'button', class: ('excard m-ex ' + (wide ? 'm-song ' : '') + cls).trim(), 'aria-label': name + ' 들어 보기' },
    h('span', { class: 'm-exhd' }, speaker(h), h('b', {}, name), sub ? h('span', { class: 'm-exsub' }, sub) : null), pic);
}

// ── 계이름 답 단추(오른쪽 세로 한 줄 · kit.answers) — 위에서 아래 = 높은 음에서 낮은 음 ──
export const dot = (h, p) => h('span', { class: 'm-dot', style: { '--c': colorOf(p) } });
export function noteAnswers(kit, ps, onPick, cls = '') {
  return kit.answers(ps.map(p => ({ key: p, label: nameOf(p), chip: dot(kit.h, p) })), onPick, { cls: ('m-ans ' + cls).trim() });
}
// 고른 뒤 표시 — 맞는 답은 금 테두리, 잘못 고른 답은 점선(빨강 X)
export function markPick(A, right, picked) {
  A.mark(right, 'right');
  if (picked != null && picked !== right) { const b = A.btn(picked); if (b) b.classList.add('wrong'); }
}
// 판정 말풍선(맨 위 한 줄 오른쪽) — 맞아요 · 다시 들어 봐요(소리 문제) / 다시 봐요(눈 문제) · 놓쳤어요
export function judge(ui, right, { missed = false, eye = false } = {}) {
  if (right) ui.tell('맞아요', 'good', 1100);
  else ui.tell(missed ? '놓쳤어요' : eye ? '다시 봐요' : '다시 들어 봐요', 'oops', 1500);
}

// ── 확인 게임 시작 카드 — 무엇을 하는지 한 줄 + 판 수 · 아래 띠에 '시작' 하나(주황) ──
export function startCard(ui, kit, { title, lines, onStart }) {
  const { h, onPress } = kit;
  const card = h('div', { class: 'overlay clear' }, h('div', { class: 'panelcard startcard' },
    h('h2', {}, title), ...lines.map(t => h('p', { class: 'sub' }, t))));
  const btn = h('button', { type: 'button', class: 'go huge' }, '시작');
  onPress(btn, () => { if (!card.isConnected) return; card.remove(); ui.setBar(); onStart(); });
  ui.setBar(btn);
  return { card, btn, waiting: () => card.isConnected };
}
