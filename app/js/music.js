// 배경 음악 · 결과 소리 — 주제곡 「숲속 음악대」(engine/theme.js)를 트는 곳(docs/sound.md)
//  · 배경 음악은 처음 화면 · 마을 지도에서만(main.js가 화면마다 want) · 칸에 들어가면 0.4초 안에 꺼짐 · 처음 ↔ 지도는 끊지 않고 이어 틂
//  · 방에 들어온 아이 기기 · 선생님 칸 '배경 음악 끔'이면 X · 탭이 숨으면 멈췄다가 다음 마디부터
//  · 16마디 × 세 바퀴(약 2분) 뒤 마침 화음으로 끝내고 조용히(화면을 다시 열면 처음부터)
//  · 줄마다 볼륨(친구 다섯) — 친구를 누르면 그 줄만 두 마디 크게(음색 듣기) · 새 줄은 첫 네 마디 크게
import { engine } from './audio.js';
import { lsGet, lsSet } from './util.js';
import { THEME, BARS, themeBar, cadence, levelsOf, newParts, PARTS, fanfare, FANFARE_BPM, STAR_NOTES, goodNotes } from '../../engine/theme.js';

const LOOPS = 3, LEAD = 0.35, VOL = 0.38;            // 배경 음악은 작게(다섯 다 함께일 때 RMS 약 −20dBFS · tools/render_sound.cjs로 잼)
let gate = () => true;                 // main.js가 줌(방에 있는 아이 기기면 false)
let want = false, st = null, kickT = 0, done = false, resumeAt = 0;

const listeners = new Set(), freshers = new Set();
const emit = () => { for (const f of listeners) try { f(info()); } catch { /* */ } };

export const enabled = () => lsGet('bgm', true) !== false && gate();
export function setEnabled(on) { lsSet('bgm', !!on); if (!on) stop(true); else if (want) kick(); }
export function setGate(fn) { gate = fn; }
export const onChange = f => { listeners.add(f); return () => listeners.delete(f); };
// 새 줄이 처음 울릴 때(처음 화면이든 지도든) — main.js가 머리띠 아래 한 줄을 띄움
export const onFresh = f => { freshers.add(f); return () => freshers.delete(f); };
export const levels = () => levelsOf(lsGet('prog', {}));
// 지금 상태(처음 화면 친구 끄덕임 · 시험)
export function info() {
  if (!st) return { playing: false, bpm: THEME.bpm, lv: levels() };
  return { playing: true, bpm: THEME.bpm, lv: st.lv, bar: st.bar, startAt: st.t0, ac: engine.ctx, spot: st.spot };
}

// 화면이 바뀔 때마다 main.js가 부름 — on = 이 화면에서 배경 음악을 원함
export function wantMusic(on) {
  want = !!on;
  if (!want) { clearTimeout(kickT); done = false; stop(true); return; }
  if (st) return;                      // 처음 ↔ 지도: 이어 틂
  kick();
}
// 사람이 누른 뒤(소리 길이 열린 뒤) 시작 — 같은 두드림이 다른 화면으로 가는 단추면 시작하지 않게 조금 기다림
export function kick(delay = 260) {
  clearTimeout(kickT);
  if (!want || st || done || !enabled() || !engine.ctx) return;
  kickT = setTimeout(() => {
    if (!want || st || done || !enabled()) return;
    const ac = engine.ctx;
    if (!ac) return;
    if (ac.state !== 'running') { if (ac.resume) ac.resume().then(() => kick(0)).catch(() => {}); return; }
    start();
  }, delay);
}

function start(fromBar = 0) {
  const ac = engine.ensure();
  const lv = levels();
  const heard = lsGet('bgm.heard', null);
  const fresh = heard ? newParts(heard, lv).map(p => p.key) : [];
  lsSet('bgm.heard', lv);
  const master = engine.bus();
  master.gain.value = 0;
  master.gain.linearRampToValueAtTime(VOL, ac.currentTime + 0.4);
  const gains = {};
  for (const p of PARTS) { const g = ac.createGain(); g.gain.value = 1; g.connect(master); gains[p.key] = g; }
  const beat = 60 / THEME.bpm, barSec = beat * 4;
  st = { ac, lv, master, gains, beat, barSec, t0: ac.currentTime + 0.15, bar: fromBar, next: fromBar, endBar: LOOPS * BARS, timer: 0, spot: null, fresh };
  st.t0 -= fromBar * barSec;
  window.__music = { playing: true, fresh, bar: fromBar, events: 0 };
  if (fresh.length) spotlight(fresh, 4, true);
  pump();
  st.timer = setInterval(pump, 50);
  emit();
  if (fresh.length) { const np = newParts(heard, lv); for (const f of freshers) try { f(np); } catch { /* */ } }
}
// 마디 하나씩 예약(0.35초 앞만 — 노드가 쌓이지 않게)
function pump() {
  if (!st) return;
  const { ac, t0, barSec, beat } = st;
  while (st.next <= st.endBar && t0 + st.next * barSec < ac.currentTime + LEAD) {
    const i = st.next++, tb = t0 + i * barSec;
    const ev = i === st.endBar ? cadence(st.lv) : themeBar(i % BARS, st.lv);
    for (const e of ev) play(e, tb, beat, st.gains[e.part] || st.master);
    st.bar = i;
    window.__music = { ...(window.__music || {}), bar: i, events: (window.__music && window.__music.events || 0) + ev.length };
  }
  if (st.next > st.endBar && ac.currentTime > t0 + (st.endBar + 1) * barSec + 1.5) { done = true; stop(false); }
}
function play(e, tb, beat, out) {
  const t = tb + e.b * beat;
  if (e.kind === 'note') engine.note(e.inst, e.p, t, e.d * beat, e.vel, out);
  else engine.drum(e.drum, t, e.vel, out, e.span);
}
// 줄 크게 — keys 줄만 1.25 · 나머지 0.3, bars마디 뒤 다시 모두 1
export function spotlight(keys, bars = 2, atStart = false) {
  if (!st) return false;
  keys = [].concat(keys);
  const { ac, gains, barSec } = st, now = ac.currentTime;
  for (const [k, g] of Object.entries(gains)) { g.gain.cancelScheduledValues(now); g.gain.setTargetAtTime(keys.includes(k) ? 1.25 : 0.3, now, 0.06); }
  const back = (atStart ? st.t0 : now) + bars * barSec;
  for (const g of Object.values(gains)) g.gain.setTargetAtTime(1, back, 0.25);
  st.spot = { keys, until: back };
  window.__music = { ...(window.__music || {}), spot: keys };
  emit();
  return true;
}
export function stop(fade = true) {
  if (!st) return;
  const s = st;
  st = null;
  clearInterval(s.timer);
  const now = s.ac.currentTime, g = s.master.gain;
  try { g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0, now + (fade ? 0.35 : 0.05)); } catch { /* */ }
  setTimeout(() => { try { s.master.disconnect(); } catch { /* */ } }, 900);
  window.__music = { playing: false };
  emit();
}
// 탭이 숨으면 멈췄다가 다시 보이면 다음 마디부터
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { if (st) { resumeAt = (st.bar + 1) % (LOOPS * BARS); stop(false); } }
  else if (want && resumeAt && !st && enabled() && engine.ctx && engine.ctx.state === 'running') { const b = resumeAt; resumeAt = 0; start(b); }
});

// ── 결과 · 손맛 ──
// 별 하나씩(0.45초 간격 · 도 미 솔) → 셋이면 팡파르 · 하나둘이면 가벼운 화음 · 0이면 낮은 도 하나
//  돌려주는 값 = 켜지는 별마다 지금부터 몇 ms 뒤(별 그림 움직임을 소리에 맞춤)
//  화면을 떠나거나 '한 번 더'를 누르면 stopFx로 바로 멈춤(다음 화면 소리와 겹치지 않게 · 소리 장치도 그때 놓음)
let fx = null;
export function stopFx() {
  if (!fx) return;
  const f = fx, now = engine.now;
  fx = null;
  for (const hd of f.handles) try { hd && hd.stop && hd.stop(now); } catch { /* */ }
  try { f.bus.gain.setTargetAtTime(0, now, 0.04); } catch { /* */ }
  setTimeout(() => { try { f.bus.disconnect(); } catch { /* */ } }, 600);
}
export function starSounds(n, starOn = null) {
  const lit = starOn ? starOn.map((on, k) => (on ? k : -1)).filter(k => k >= 0) : Array.from({ length: n }, (_, k) => k);
  let ac;
  try { ac = engine.ensure(); } catch { return lit.map((_, j) => 350 + j * 450); }
  stopFx();
  const bus = engine.bus(), t0 = ac.currentTime + 0.35, gap = 0.45, delays = [], handles = [];
  bus.gain.value = 0.9;
  const note = (...a) => handles.push(engine.note(...a));
  lit.forEach((k, j) => {
    const t = t0 + j * gap;
    note('glock', STAR_NOTES[j], t, 0.5, 0.6, bus);
    delays.push(Math.round((t - ac.currentTime) * 1000));
  });
  const after = t0 + lit.length * gap + 0.1;
  if (lit.length >= 3) {
    const beat = 60 / FANFARE_BPM;
    for (const e of fanfare()) { if (e.kind === 'note') note(e.inst, e.p, after + e.b * beat, e.d * beat, e.vel, bus); else engine.drum(e.drum, after + e.b * beat, e.vel, bus, e.span); }
  } else if (lit.length >= 1) {
    [60, 64, 67, 72].forEach((p, k) => note('keys', p, after + k * 0.07, 1.4 - k * 0.1, 0.36, bus));
  } else {
    note('marimba', 60, ac.currentTime + 0.3, 0.6, 0.38, bus);
  }
  const me = fx = { bus, handles };
  setTimeout(() => { if (fx === me) fx = null; try { bus.disconnect(); } catch { /* */ } }, 6000);
  window.__starSounds = { lit: lit.length, delays };
  return delays;
}
// 이어 맞힘 사다리(cellkit.sfx.good이 부름) — k = 이어서 맞힌 수
export function goodSound(k) {
  const ac = engine.ensure(), t = ac.currentTime + 0.01, g = goodNotes(k);
  if (g.pair) { engine.note('marimba', g.pair[0], t, 0.12, 0.45); engine.note('marimba', g.pair[1], t + 0.09, 0.2, 0.45); }
  else { g.chord.forEach(p => engine.note('marimba', p, t, 0.25, 0.32)); engine.note('glock', g.top, t + 0.08, 0.4, 0.3); }
}
// 이동 단추 누름 — 아주 작은 나무 소리
export function uiTick() { try { const ac = engine.ctx; if (!ac || ac.state !== 'running') return; engine.drum('gi', ac.currentTime, 0.16); } catch { /* */ } }
