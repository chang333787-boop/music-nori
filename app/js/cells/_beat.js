// 박·리듬 칸 공용 도우미(리2 · 리4 · 리5 · 리6) — 칸 파일이 아니다(이름 앞 _ · 칸 지도에 없음)
//  · 판정(순수 계산 · DOM 없음 · node 시험 tests/beatcells.test.mjs): 메기면 받기 · 길게 누르기 · 센박에만
//  · 박 시계(오디오 시각 ↔ 화면 시각 — 징검다리 screens/tap.js와 같은 방법 · clock.js audioToPerf)
//  · 음표 그림(쉬운 SVG 글 · 1~2학년은 머리 없는 막대 음표) · 두드림/누르기 입력 · 자동 시험 두드림
//  판정 창은 engine/judge.js windows(학년군 · 가장 짧은 음 간격의 35%까지). 기기 지연(device.latencyMs)은 두드림에서 뺀다.
import { windows } from '../../../engine/judge.js';
import { audioToPerf } from '../clock.js';

// ── 빠르기(학년군마다) ──
export const TEMPO = {
  echo: { low: 92, mid: 100, high: 108 },      // 리2 메기면 받기
  hold: { low: 76, mid: 80, high: 88 },        // 리4 풍선(길게 누르기는 조금 느리게)
};
export const bpmOf = (kind, band) => (TEMPO[kind][band] || TEMPO[kind].mid);

// ── 판정 ──────────────────────────────────────────────
// 두드림 하나를 받는 박들 중 하나에 붙인다 — 가장 가까운 박.
//  · 그 박이 '따'고 판정 창 안 → great/ok   · '쉼'이고 박에서 0.35박 안 → resthit(쉼에 쳤어요)
//  · 그 밖(박과 박 사이) → null(셈하지 않음 · 너그럽게)
export function classifyTap(t, beatsMs, pat, w, beatMs) {
  if (!beatsMs.length) return null;
  if (t < beatsMs[0] - beatMs / 2 || t >= beatsMs[beatsMs.length - 1] + beatMs / 2) return null;
  let k = 0;
  for (let i = 1; i < beatsMs.length; i++) if (Math.abs(t - beatsMs[i]) < Math.abs(t - beatsMs[k])) k = i;
  const d = t - beatsMs[k];
  if (pat[k] === 'rest') return Math.abs(d) <= beatMs * 0.35 ? { k, kind: 'resthit', off: d } : null;
  if (d < -w.early || d > w.late) return null;
  return { k, kind: Math.abs(d) <= w.great ? 'great' : 'ok', off: d };
}

// 메기면 받기 판정 — pat = ['ta' | 'rest', …] · beatsMs = 받는 박 시각(ms) · taps = 두드린 시각(ms, 같은 시계)
//  → beats[k].got = 'great' | 'ok' | 'miss'(따를 놓침) | 'rest'(쉼 지킴) | 'resthit'(쉼에 쳤어요) · ok = 모두 맞음
export function judgeEcho(pat, beatsMs, taps, { band = 'mid', latency = 0, beatMs } = {}) {
  if (beatMs == null) beatMs = beatsMs.length > 1 ? beatsMs[1] - beatsMs[0] : 600;
  const w = windows(band, beatMs);
  const beats = pat.map(k => ({ kind: k, got: k === 'rest' ? 'rest' : 'miss', off: null }));
  for (const raw of [...taps].sort((a, z) => a - z)) {
    const c = classifyTap(raw - latency, beatsMs, pat, w, beatMs);
    if (!c) continue;
    const b = beats[c.k];
    if (c.kind === 'resthit') { b.got = 'resthit'; continue; }
    if (b.got !== 'miss') continue;                       // 같은 박을 두 번 — 첫 번째만
    b.got = c.kind; b.off = c.off;
  }
  const restHits = beats.filter(b => b.got === 'resthit').length, misses = beats.filter(b => b.got === 'miss').length;
  return { beats, ok: !restHits && !misses, restHits, misses, win: w };
}

// 길게 누르기 뗌 창(박에 대한 비율) — [끝보다 얼마나 일찍까지 · 얼마나 늦게까지] · 1~2학년은 더 너그럽게
export const HOLD_WIN = { low: [0.6, 0.5], mid: [0.5, 0.4], high: [0.4, 0.3] };
// 누른 시간 하나(ms) → 뗌 판정. len = 음표 박 수 · at = 음표 시작(ms) · up = 뗀 때(ms, 아직 누르는 중이면 Infinity)
export function releaseGrade(len, at, up, beatMs, band = 'mid') {
  const [early, late] = HOLD_WIN[band] || HOLD_WIN.mid;
  const end = at + len * beatMs;
  if (up > end + late * beatMs) return 'long';            // 너무 오래 눌렀어요
  if (len >= 2 && up < end - early * beatMs) return 'short';   // 일찍 뗐어요(4분음표는 짧게 떼도 됨)
  return 'ok';
}
// notes = [{ at(ms), len(박) }] · holds = [{ down, up }](ms · 아직이면 up = Infinity)
//  → notes[i] = { press: 'great'|'ok'|'miss', rel: 'ok'|'short'|'long'|null, ok }
export function judgeHolds(notes, holds, { band = 'mid', latency = 0, beatMs = 600 } = {}) {
  const w = windows(band, beatMs);
  const hs = holds.map(x => ({ down: x.down - latency, up: (x.up ?? Infinity) - latency })).sort((a, z) => a.down - z.down);
  const used = new Array(hs.length).fill(false);
  const out = notes.map(n => {
    let best = -1, bestAbs = Infinity;
    for (let k = 0; k < hs.length; k++) {
      if (used[k]) continue;
      const d = hs[k].down - n.at;
      if (d < -w.early || d > w.late) continue;
      if (Math.abs(d) < bestAbs) { best = k; bestAbs = Math.abs(d); }
    }
    if (best < 0) return { press: 'miss', rel: null, ok: false };
    used[best] = true;
    const press = bestAbs <= w.great ? 'great' : 'ok';
    const rel = releaseGrade(n.len, n.at, hs[best].up, beatMs, band);
    return { press, rel, ok: rel === 'ok' };
  });
  return { notes: out, kept: out.filter(x => x.ok).length, total: out.length, win: w };
}

// 센박에만 톡 — 마디마다 [센, 여, 여…]를 메기면 받기와 같은 틀로(센 = 따 · 여린박 = 쉼)
export function strongPattern(meter, bars) {
  const pat = [];
  for (let b = 0; b < bars; b++) for (let i = 0; i < meter; i++) pat.push(i === 0 ? 'ta' : 'rest');
  return pat;
}
// 판정 결과를 마디마다 맞음/틀림으로
export function barsOk(beats, meter) {
  const out = [];
  for (let i = 0; i < beats.length; i += meter) out.push(beats.slice(i, i + meter).every(b => b.got === 'great' || b.got === 'ok' || b.got === 'rest'));
  return out;
}

// 음표 차례 → 박 시작 자리(박 단위) · 리4 판의 음표 위치 계산
export function layoutNotes(bars) {
  const out = [];
  let beat = 0;
  for (const bar of bars) for (const k of bar) { const len = LEN[k]; if (k !== 'qr') out.push({ kind: k, beat, len }); beat += len; }
  return { notes: out, beats: beat };
}
export const LEN = { q: 1, h: 2, w: 4, qr: 1, ee: 1 };

// ── 박 시계 · 소리 ──────────────────────────────────────
// 새 버스(정리 때 꺼서 예약해 둔 소리를 한꺼번에 멈춤)
export function newBus(engine) { engine.ensure(); return engine.bus(); }
export function killBus(engine, b) {
  if (!b || !engine.ctx) return;
  const now = engine.ctx.currentTime;
  try { b.gain.cancelScheduledValues(now); b.gain.setValueAtTime(b.gain.value, now); b.gain.linearRampToValueAtTime(0, now + 0.05); } catch { /* */ }
  setTimeout(() => { try { b.disconnect(); } catch { /* */ } }, 300);
}
// 지금 '들리는' 오디오 시각(초) — 그림은 소리에 맞춘다(징검다리와 같음)
export const heardNow = ac => ac.currentTime - (ac.outputLatency || ac.baseLatency || 0);
// 오디오 시각 → 들리는 화면 시각(ms)
export const perfOf = (ac, t) => audioToPerf(ac, t);

// ── 자동 시험 두드림 — 맞는 때가 0.45초 안으로 다가온 목표를 그 시각에 맞춰 예약(0.16초마다 불려도 정확하게) ──
export function autoScheduler(T) {
  const done = new Set();
  return (targets, fire) => {
    const now = performance.now();
    for (const tg of targets) {
      if (done.has(tg.id) || tg.ms - now > 450 || tg.ms < now - 40) continue;
      done.add(tg.id);
      T.after(Math.max(0, tg.ms - now), () => fire(tg));
    }
  };
}

// ── 두드림/누르기 입력 — 아래 띠 큰 단추('시작' 자리 그대로) + 무대 아무 곳이나 + 스페이스(J · F) ──
//  onDown(e) · onUp(e) — 누르기만 쓰면 onUp은 비워 둔다. 돌려주는 off()로 모두 뗀다.
export function pressInput(ui, kit, { onDown, onUp = null, label = '톡!', aria = '톡 — 두드리기', keyText = ' 키도 돼요' }) {
  const { h } = kit;
  let held = false;
  const down = e => { if (onUp) { if (held) return; held = true; } onDown(e); };
  const up = e => { if (!held) return; held = false; onUp && onUp(e); };
  const btn = h('button', { type: 'button', class: 'go huge', 'aria-label': aria }, label);
  const bp = e => { if (e.button > 0) return; e.preventDefault(); btn.classList.add('press'); down(e); };
  const bu = () => btn.classList.remove('press');
  btn.addEventListener('pointerdown', bp);
  btn.addEventListener('pointerleave', bu); btn.addEventListener('pointercancel', bu);
  const sp = e => { if (e.button > 0 || e.target.closest('button,a,.overlay')) return; e.preventDefault(); down(e); };
  ui.stage.addEventListener('pointerdown', sp);
  const wu = e => { bu(); up(e); };
  window.addEventListener('pointerup', wu); window.addEventListener('pointercancel', wu);
  const noMenu = e => e.preventDefault();                 // 길게 누를 때 뜨는 메뉴 막기(터치)
  btn.addEventListener('contextmenu', noMenu); ui.stage.addEventListener('contextmenu', noMenu);
  const isKey = e => e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyF';
  const kd = e => { if (!isKey(e)) return; e.preventDefault(); if (e.repeat) return; btn.classList.add('press'); down(e); };
  const ku = e => { if (!isKey(e)) return; e.preventDefault(); bu(); up(e); };
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
  const key = h('span', { class: 'key' }, h('span', { class: 'kbd' }, '스페이스'), keyText);
  return {
    btn, key, nodes: [btn, key],
    isHeld: () => held,
    off() {
      btn.removeEventListener('pointerdown', bp);
      ui.stage.removeEventListener('pointerdown', sp); ui.stage.removeEventListener('contextmenu', noMenu);
      window.removeEventListener('pointerup', wu); window.removeEventListener('pointercancel', wu);
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      held = false;
    },
  };
}
// 자동 시험이 누르기/떼기를 보내는 길(진짜 손과 같은 길로 — 단추에 pointerdown · 창에 pointerup)
export const fireDown = el => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
export const fireUp = () => window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0 }));

// ── 시작 카드(가운데 카드 + 아래 '시작' 하나 · 징검다리와 같은 모양) ──
export function startCard(ui, kit, { title, sub = [], onStart }) {
  const { h, onPress } = kit;
  const card = h('div', { class: 'overlay clear' }, h('div', { class: 'panelcard startcard' },
    h('h2', {}, title), ...sub.map(s => (typeof s === 'string' ? h('p', { class: 'sub' }, s) : s))));
  ui.stage.append(card);
  const go = h('button', { type: 'button', class: 'go huge' }, '시작');
  onPress(go, () => { card.remove(); onStart(); });
  ui.setBar(go);
  return { card, go, open: () => card.isConnected, press: () => fireDown(go) };
}

// ── 그림(SVG 글) — 굵은 잉크 외곽선 · 납작한 단색 ──────────────
const INK = '#3B2A1E';
// kind: q 4분음표 · h 2분음표 · w 온음표 · qr 4분쉼표 · ee 8분음표 둘 · stick = 머리 없는 막대 음표(1~2학년 · 4분 · 8분만)
export function noteSVG(kind, { stick = false, size = 80, color = INK } = {}) {
  const S = `stroke="${color}" stroke-linecap="round" stroke-linejoin="round"`;
  const head = (cx, hollow) => `<ellipse cx="${cx}" cy="64" rx="11.5" ry="8.2" transform="rotate(-22 ${cx} 64)" fill="${hollow ? '#FFFFFF' : color}" ${S} stroke-width="${hollow ? 4 : 2}"/>`;
  const stem = x => `<line x1="${x}" y1="61" x2="${x}" y2="9" ${S} stroke-width="4"/>`;
  let vb = '0 0 40 80', body = '';
  if (kind === 'q') body = stick ? `<line x1="20" y1="10" x2="20" y2="70" ${S} stroke-width="6"/>` : head(16, false) + stem(26.5);
  else if (kind === 'h') body = head(16, true) + stem(26.5);
  else if (kind === 'w') { vb = '0 0 48 80'; body = `<ellipse cx="24" cy="62" rx="16" ry="10.5" fill="${color}"/><ellipse cx="24" cy="62" rx="5.2" ry="8.4" transform="rotate(38 24 62)" fill="#FFFFFF"/>`; }
  else if (kind === 'qr') body = `<path d="M13 6 L28 23 C22 29 20 33 21 37 C22 41 26 46 30 50 L28 52 C22 48 14 49 16 58 C17 62 19 66 22 69 L20 71 C12 66 7 60 8 53 C9 46 16 44 22 46 L12 34 C17 29 19 25 19 21 C19 17 16 12 11 8 Z" fill="${color}" ${S} stroke-width="2"/>`;
  else if (kind === 'ee') {
    vb = '0 0 64 80';
    body = stick
      ? `<path d="M14 72 V12 H50 V72" fill="none" ${S} stroke-width="6"/>`
      : head(12, false) + stem(22.5) + head(44, false) + stem(54.5) + `<path d="M22.5 9 H54.5" ${S} stroke-width="9" stroke-linecap="butt"/>`;
  }
  const [, , vw, vh] = vb.split(' ').map(Number);
  return `<svg viewBox="${vb}" width="${(size * vw / vh).toFixed(0)}" height="${size}" aria-hidden="true">${body}</svg>`;
}
// 손바닥 펴기(쉼) — 박은 흐르는데 소리는 쉰다
export function palmSVG(size = 64) {
  const S = `fill="#FFFFFF" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"`;
  return `<svg viewBox="0 0 64 72" width="${size * 64 / 72}" height="${size}" aria-hidden="true">
<rect x="17" y="6" width="9" height="34" rx="4.5" ${S}/><rect x="27" y="2" width="9" height="38" rx="4.5" ${S}/><rect x="37" y="5" width="9" height="35" rx="4.5" ${S}/><rect x="47" y="12" width="8" height="29" rx="4" ${S}/>
<path d="M6 36 Q4 30 9 29 Q13 29 16 36 L17 30 H55 V48 Q55 68 36 68 Q20 68 13 54 Z" ${S}/></svg>`;
}
// 박자표(위 숫자 = 한 마디의 박 수 · 아래 4 = 4분음표가 한 박)
export const meterSVG = (top, size = 96) => `<svg viewBox="0 0 40 80" width="${size / 2}" height="${size}" aria-hidden="true"><text x="20" y="35" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="40" fill="${INK}">${top}</text><text x="20" y="74" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="40" fill="${INK}">4</text></svg>`;

// 리듬 음절(2분할 · Colley 1987) — 4분 따 · 8분 둘 띠띠 · 2분 따아 · 온 따아아아 · 쉼 쉼
export const SYL = { q: '따', ee: '띠띠', h: '따아', w: '따아아아', qr: '쉼', ta: '따', rest: '쉼' };
export const NAME = { q: '4분음표', h: '2분음표', w: '온음표', qr: '4분쉼표', ee: '8분음표 둘' };
