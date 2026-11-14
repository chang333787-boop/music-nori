// 기계 귀(1단계 — 재고 적기만 · docs/ear.md) — tests/ear.browser.cjs가 빈 쪽(app/test/blank.html)에서 불러 run()을 부른다.
//  소리는 모두 OfflineAudioContext(48000Hz)로 그려 숫자로 잰다. audio.js · 칸 파일은 고치지 않고 불러 쓰기만 한다.
//  소리 길 세 가지:
//   app = 칸이 쓰는 길(engine.bus() → 마른 소리 + 울림 → master 0.85 → 압축기) — 아이가 듣는 크기
//   dry = 울림만 뺀 길(음 높이 재기 · pitch.js와 같음)
//   raw = 압축기 · 울림을 거치지 않은 날 소리(음색 · 딸깍 재기)
//  같은 결과가 나오게 Math.random을 씨앗 있는 수로 바꿔 둔다(울림 · 잡음 버퍼가 매번 같게).
import { Engine } from '../app/js/audio.js';
import { freq, letter } from '../engine/theory.js';
import { PLAN as PITCH_PLAN, measure, dcBlock, ONSET } from '../app/test/pitchmeasure.js';
import { seq } from '../app/js/cells/_snd.js';
import { line, GAP } from '../app/js/cells/_pick.js';
import * as TH from '../engine/theme.js';
import * as SO6 from '../app/js/cells/so6.js';
import * as HY1 from '../app/js/cells/hy1.js';
import * as HWA1 from '../app/js/cells/hwa1.js';
import * as SO3 from '../app/js/cells/so3.js';
import * as SO5 from '../app/js/cells/so5.js';
import * as PPA1 from '../app/js/cells/ppa1.js';
import { stageShuffle, rng } from '../app/js/cellkit.js';

const SR = 48000;
// 악기 = audio.js note()가 받는 이름 전부(pitch.js PLAN 23 + 가벼운 반주 소리 둘)
const SEG = Object.fromEntries(PITCH_PLAN.map(p => [p.inst, { dur: p.dur, seg: p.seg }]));
SEG.keys = { dur: 0.9, seg: [0.05, 0.6] };
SEG.lead = { dur: 1.0, seg: [0.1, 0.9] };
export const INSTS = Object.keys(SEG);
// 칸 · 주제곡이 실제로 쓰는 음 높이(grep으로 모음 · 칸에 안 나오는 악기는 가운데 음 몇 개)
const USE = {
  piano: [48, 55, 60, 64, 67, 72, 74, 79], xylo: [60, 64, 67, 72, 74, 79, 84], marimba: [48, 55, 60, 67, 72, 79, 86],
  recorder: [60, 64, 67, 72, 74], flute: [60, 62, 67, 72, 74, 76, 79], violin: [60, 64, 67, 69, 72, 79, 81],
  trumpet: [60, 64, 67, 71, 74], harp: [55, 60, 67, 72, 79], cello: [55, 60, 64], clarinet: [59, 64, 67, 72],
  choir: [60, 64, 67], strings: [60, 64, 67], horn: [62, 67], keys: [55, 60, 64, 67], lead: [72, 74, 76],
  bass: [43, 48, 53, 55, 65], celesta: [74, 79, 86], glock: [79, 84, 88, 91],
  gayageum: [55, 60, 67], pad: [60, 67], contrabass: [36, 43], pizz: [55, 67], oboe: [67, 72], tuba: [41, 48], timpani: [45, 50, 55],
};
const CELL_INSTS = ['piano', 'xylo', 'marimba', 'recorder', 'flute', 'violin', 'trumpet', 'harp', 'cello', 'clarinet', 'choir', 'strings',
  'horn', 'keys', 'lead', 'bass', 'celesta', 'glock', 'pizz'];
// 칸들이 쓰는 세기(vel) 값 — grep으로 모음(so6 0.35 · 0.6 · 0.9 · hy1 0.4 · 0.85 · hwa1 0.52 · 0.45 · sem1 0.2 · 0.9 · so5 0.16 · 0.8 · ppa1 0.18 · 0.55 · ri5 0.26 · 0.42 · 0.75 …)
const VELS = [0.16, 0.18, 0.2, 0.26, 0.35, 0.4, 0.42, 0.45, 0.5, 0.52, 0.55, 0.6, 0.75, 0.8, 0.85, 0.9];
const DRUMS = ['kick', 'snare', 'hat', 'kung', 'deok', 'gi', 'deong', 'roll', 'cymbal', 'bassdrum', 'triangle', 'swell'];
const REF_P = 67, REF_VEL = 0.6, REF_DUR = 0.8;            // 견줄 때 같은 음(솔4) · 같은 세기 · 같은 길이(line 두 박 ≈ 0.77초)

// ── 씨앗 있는 수 ──
function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ── 그리기 ──
async function render(sec, build, ch = 2) {
  const oc = new OfflineAudioContext(ch, Math.ceil(sec * SR), SR);
  oc.resume = undefined;                                    // engine.ensure()가 아직 시작 안 한 오프라인 판을 깨우지 않게(seq가 부름)
  const e = new Engine(); e._setup(oc);
  const raw = oc.createGain(); raw.connect(oc.destination);
  const out = { app: () => e.bus(), dry: () => e.dry, raw: () => raw };
  build(e, out, oc);
  return oc.startRendering();
}
const ch0 = buf => buf.getChannelData(0);
const db = v => (v > 0 ? 20 * Math.log10(v) : -120);
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100, r3 = v => Math.round(v * 1000) / 1000;
function rms(x, a, b) { a = Math.max(0, a | 0); b = Math.min(x.length, b | 0); let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, b - a)); }
function peakOf(buf) { let p = 0; for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const v = d[i] < 0 ? -d[i] : d[i]; if (v > p) p = v; } } return p; }
const S = t => Math.round(t * SR);

// ── 스펙트럼(4096점 · 한 창 · 반씩 겹침) ──
const N = 4096, BIN = SR / N, HANN = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
const RE = new Float64Array(N), IM = new Float64Array(N);
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), h = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < h; k++) {
        const a = i + k, b = a + h, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}
function spectrum(x, a, b) {
  a = Math.max(0, a | 0); b = Math.min(x.length, b | 0);
  const P = new Float64Array(N / 2 + 1), starts = [];
  for (let s = a; s + N <= b; s += N / 2) starts.push(s);
  if (!starts.length) starts.push(a);
  for (const s of starts) {
    RE.fill(0); IM.fill(0);
    for (let i = 0; i < N && s + i < b; i++) RE[i] = x[s + i] * HANN[i];
    fft(RE, IM);
    for (let k = 0; k <= N / 2; k++) P[k] += RE[k] * RE[k] + IM[k] * IM[k];
  }
  return P;
}
// A 가중(IEC 61672-1의 A 곡선 식 · 1kHz = 0dB) — 사람 귀가 낮은 · 아주 높은 소리를 덜 크게 듣는 만큼을 깎는 표준 곡선
function aW2(f) {
  const f2 = f * f, ra = (12194 ** 2 * f2 * f2) / ((f2 + 20.6 ** 2) * Math.sqrt((f2 + 107.7 ** 2) * (f2 + 737.9 ** 2)) * (f2 + 12194 ** 2));
  return ra * ra;
}
const A1K = aW2(1000);
function specStats(P) {
  let tot = 0, hi = 0, cen = 0, aw = 0;
  for (let k = 1; k < P.length; k++) {
    const f = k * BIN;
    if (f < 20) continue;
    tot += P[k]; cen += f * P[k]; aw += P[k] * aW2(f) / A1K;
    if (f > 250) hi += P[k];
  }
  return { above250: tot ? hi / tot : 0, centroid: tot ? cen / tot : 0, aGainDb: tot ? 10 * Math.log10(aw / tot) : -120 };
}
// 소리 크기 한 묶음: RMS(dBFS) · A 가중 RMS(dBFS 기준에서 A 곡선만큼 더하고 뺌) · 250Hz 위 비율 · 무게중심
function loud(x, a, b) {
  const r = rms(x, a, b), st = specStats(spectrum(x, a, b));
  return { rms: r1(db(r)), arms: r1(db(r) + st.aGainDb), above250: r3(st.above250), centroid: Math.round(st.centroid) };
}
// 크기 띠(창 5ms · 1ms마다) → { t0(초), v[] }
function envelope(x, a, b, win = 0.005, hop = 0.001) {
  const w = S(win), hp = S(hop), v = [];
  for (let s = Math.max(0, a); s + w <= Math.min(x.length, b); s += hp) v.push(rms(x, s, s + w));
  return { t0: a / SR, hop, w: win, v };
}
// 소리가 난 길이 — 크기 띠가 가장 큰 값의 −30dB 위에 처음 · 마지막으로 있던 때 사이(초)
function soundLen(x, a, b) {
  const e = envelope(x, a, b, 0.01, 0.002), mx = Math.max(...e.v), th = mx * 10 ** (-30 / 20);
  let i0 = -1, i1 = -1;
  e.v.forEach((v, i) => { if (v >= th) { if (i0 < 0) i0 = i; i1 = i; } });
  return i0 < 0 ? 0 : (i1 - i0) * e.hop + e.w;
}
// 가장 큰 100ms 창의 A 가중 RMS — 길이가 다른 두 소리의 크기를 견줄 때(길이가 크기로 섞이지 않게)
function peakLoud(x, a, b) {
  const w = S(0.1), hp = S(0.01);
  let best = 0, at = a;
  for (let s = a; s + w <= b; s += hp) { const r = rms(x, s, s + w); if (r > best) { best = r; at = s; } }
  return r1(db(best) + specStats(spectrum(x, at, at + w)).aGainDb);
}
// 소리 시작 찾기(빠르기) — 크기 띠(5ms)의 봉우리 가운데 앞뒤 0.1초 안에서 가장 크고 가장 큰 값의 −12dB 위인 곳
//  (오르기만 보던 첫 판은 피아노 꼬리의 출렁임을 새 음으로 셌다 — 두드리는 소리는 시작 바로 뒤가 봉우리)
function onsets(x, a, b) {
  const e = envelope(x, a, b, 0.005, 0.002), mx = Math.max(...e.v), th = mx * 0.25, R = Math.round(0.1 / e.hop), out = [];
  for (let i = 0; i < e.v.length; i++) {
    const v = e.v[i];
    if (v < th) continue;
    let top = true;
    for (let j = Math.max(0, i - R); j <= Math.min(e.v.length - 1, i + R) && top; j++) if (e.v[j] > v || (e.v[j] === v && j < i)) top = false;
    if (top) out.push(e.t0 + i * e.hop);
  }
  return out;
}
const median = a => { const s = [...a].sort((p, q) => p - q); return s.length ? s[s.length >> 1] : NaN; };

// 줄(line) 틀기 — 칸과 같은 seq(app/js/cells/_snd.js) · 칸처럼 연주법 없음(art: null) · at초에 시작
function playLine(e, ln, at, out, art = null) { return seq(e, ln, { at, out, art }); }
function playSegs(e, segs, out, at0 = 0.05) {
  let at = at0;
  const lens = [];
  segs.forEach((sg, k) => {
    const len = Math.max(...sg.lines.map(ln => ln.reduce((s, n) => s + n.d + (n.gap ?? 0.12), 0)));
    for (const ln of sg.lines) playLine(e, ln, at, out);
    lens.push([at, at + len]);
    at += len + (k === segs.length - 1 ? 0 : GAP);
  });
  return { lens, end: at };
}
const kit = { band: 'mid', stageShuffle, rng };
const segsOf = mod => mod.tvsSpec({ tell() {}, say() {} }, kit).segs;

// ─────────────────────────────────────────────────────────────
export async function run(log = () => {}) {
  const realRandom = Math.random;
  Math.random = mulberry(20261114);
  const t0 = performance.now(), R = { meta: { sr: SR, insts: INSTS.length, refP: REF_P, refVel: REF_VEL, refDur: REF_DUR }, fails: [], warns: [] };
  const fail = (k, m) => R.fails.push({ k, m }), warn = (k, m) => R.warns.push({ k, m });
  try {
    // 1. 음 높이 — 악기 × 칸이 쓰는 음 · dry 길 · vel 0.8 · pitch.js와 같은 잴 구간
    log('1 음 높이');
    R.pitch = [];
    for (const inst of INSTS) for (const p of USE[inst]) {
      const { dur, seg } = SEG[inst];
      const buf = await render(ONSET + seg[1] + 0.06, (e, o) => e.note(inst, p, ONSET, dur, 0.8, o.dry()), 1);
      const x = dcBlock(Float32Array.from(ch0(buf)));
      const m = measure(x, SR, freq(p), seg[0], seg[1]);
      const cents = m ? r2(m.cents) : null;
      R.pitch.push({ inst, p, name: letter(p), cents, used: CELL_INSTS.includes(inst) });
      if (cents == null) warn('pitch', `${inst} ${letter(p)}(${p}) 높이를 잴 수 없음`);
      else if (Math.abs(cents) > 10) fail('pitch', `${inst} ${letter(p)}(${p}) ${cents > 0 ? '+' : ''}${cents}센트 (±10 밖)`);
    }

    // 2·3·4·5. 악기마다 같은 음(솔4) · 세기 여러 개 — app 길(크기 · 세기 단계) / raw 길(음색 · 딸깍)
    log('2 악기 사이 크기 · 3 세기 단계');
    R.level = []; R.vel = {}; R.velRaw = {};
    const peaksVel = [];
    for (const inst of INSTS) {
      R.vel[inst] = {};
      for (const v of VELS) {
        const buf = await render(REF_DUR + 1.0, (e, o) => e.note(inst, REF_P, 0.05, REF_DUR, v, o.app()));
        const L = loud(ch0(buf), S(0.05), S(0.05 + REF_DUR + 0.2));
        R.vel[inst][v] = L.arms;
        peaksVel.push({ inst, vel: v, peak: peakOf(buf) });
        if (v === REF_VEL) {
          R.level.push({ inst, ...L });
          if (L.rms < -60) fail('silent', `${inst} 솔4 vel ${v}: RMS ${L.rms}dBFS — 소리가 거의 안 남`);
        }
      }
      R.velRaw[inst] = {};
      for (const v of [0.2, 0.9]) {
        const buf = await render(REF_DUR + 1.0, (e, o) => e.note(inst, REF_P, 0.05, REF_DUR, v, o.raw()));
        R.velRaw[inst][v] = loud(ch0(buf), S(0.05), S(0.05 + REF_DUR + 0.2)).arms;
      }
    }
    const lv = [...R.level].sort((a, b) => b.arms - a.arms);
    const pairs6 = [];
    for (let i = 0; i < lv.length; i++) for (let j = i + 1; j < lv.length; j++) {
      const d = r1(lv[i].arms - lv[j].arms);
      if (d > 6) pairs6.push({ loud: lv[i].inst, soft: lv[j].inst, dB: d, bothInCells: CELL_INSTS.includes(lv[i].inst) && CELL_INSTS.includes(lv[j].inst) });
    }
    R.levelSpread = { loudest: lv[0].inst, softest: lv[lv.length - 1].inst, dB: r1(lv[0].arms - lv[lv.length - 1].arms),
      cellsLoudest: lv.find(x => CELL_INSTS.includes(x.inst)).inst, cellsSoftest: [...lv].reverse().find(x => CELL_INSTS.includes(x.inst)).inst,
      cellsDB: r1(lv.find(x => CELL_INSTS.includes(x.inst)).arms - [...lv].reverse().find(x => CELL_INSTS.includes(x.inst)).arms), pairs6 };
    if (R.levelSpread.cellsDB > 6) warn('level', `칸이 쓰는 악기 사이 크기 차 ${R.levelSpread.cellsDB}dB(A) — ${R.levelSpread.cellsLoudest} ↔ ${R.levelSpread.cellsSoftest} · 6dB 넘는 짝 ${pairs6.filter(p => p.bothInCells).length}개`);
    // 세기 짝 — 칸이 '작게 ↔ 크게'를 묻는 두 값
    const VP = [
      { cell: 'sem1', lo: 0.2, hi: 0.9, insts: ['piano', 'marimba', 'flute', 'strings'] },
      { cell: 'so6 loud', lo: 0.35, hi: 0.9, insts: ['recorder', 'violin', 'trumpet', 'piano'] },
      { cell: 'hy1 loud', lo: 0.4, hi: 0.85, insts: ['piano'] },
      { cell: 'so5 vol', lo: 0.16, hi: 0.8, insts: ['flute', 'violin', 'recorder'] },
      { cell: 'ppa1 dyn', lo: 0.18, hi: 0.9, insts: ['xylo'] },
    ];
    R.velPairs = [];
    for (const g of VP) for (const inst of g.insts) {
      const d = r1(R.vel[inst][g.hi] - R.vel[inst][g.lo]), dRaw = R.velRaw[inst] ? r1(20 * Math.log10(g.hi / g.lo)) : null;
      R.velPairs.push({ cell: g.cell, inst, lo: g.lo, hi: g.hi, dB: d, dBnoComp: dRaw });
    }
    // 압축기가 줄인 만큼(raw 0.2 ↔ 0.9 차 대비 app 차)
    R.compSquash = INSTS.map(inst => ({ inst, raw: r1(R.velRaw[inst][0.9] - R.velRaw[inst][0.2]), app: r1(R.vel[inst][0.9] - R.vel[inst][0.2]) }));

    // 4. 작은 스피커 — 악기 × 칸이 쓰는 음 · 250Hz 위 비율(app 길 · vel 0.6)
    log('4 작은 스피커');
    R.speaker = [];
    for (const inst of INSTS) for (const p of USE[inst]) {
      const buf = await render(REF_DUR + 0.8, (e, o) => e.note(inst, p, 0.05, REF_DUR, REF_VEL, o.raw()), 1);
      const st = specStats(spectrum(ch0(buf), S(0.05), S(0.05 + REF_DUR + 0.2)));
      R.speaker.push({ inst, p, name: letter(p), above250: r3(st.above250), used: CELL_INSTS.includes(inst) });
    }

    // 5. 음색 — raw 길 · 솔4 · vel 0.6 · 0.8초
    log('5 음색 · 6 딸깍');
    R.timbre = []; R.click = [];
    const f0 = freq(REF_P);
    for (const inst of INSTS) {
      const buf = await render(REF_DUR + 1.2, (e, o) => e.note(inst, REF_P, 0.05, REF_DUR, REF_VEL, o.raw()), 1);
      const x = ch0(buf), on = S(0.05);
      const env = envelope(x, on, S(0.05 + REF_DUR + 0.6));
      const mx = Math.max(...env.v), i90 = env.v.findIndex(v => v >= 0.9 * mx);
      const at05 = rms(x, S(0.05 + 0.48), S(0.05 + 0.52));
      const P = spectrum(x, S(0.05 + 0.03), S(0.05 + 0.6));
      const hk = k => { let s = 0; const c = k * f0, half = Math.max(1.5 * BIN, c * 0.03); for (let b = Math.floor((c - half) / BIN); b <= Math.ceil((c + half) / BIN); b++) if (b > 0 && b < P.length) s += P[b]; return s; };
      const odd = hk(3) + hk(5) + hk(7) + hk(9), even = hk(2) + hk(4) + hk(6) + hk(8) + hk(10);
      R.timbre.push({ inst, centroid: Math.round(specStats(P).centroid), attackMs: r1((i90 * env.hop + env.w / 2) * 1000),
        decay05: r1(db(at05) - db(mx)), oddEven: r1(10 * Math.log10((odd + 1e-20) / (even + 1e-20))) });
      // 6. 딸깍 — 이웃 표본 사이 둘째 차이 |x[i] − 2x[i−1] + x[i−2]|(매끄러운 소리는 작고, 끊긴 자리는 튐) · 피크 대비
      let pk = 0; for (let i = 0; i < x.length; i++) pk = Math.max(pk, Math.abs(x[i]));
      const d2 = (a, b) => { let m = 0, at = a; for (let i = Math.max(2, a); i < Math.min(x.length, b); i++) { const v = Math.abs(x[i] - 2 * x[i - 1] + x[i - 2]); if (v > m) { m = v; at = i; } } return [m, at]; };
      const [mOn] = d2(on - S(0.001), on + S(0.012)), [mBody] = d2(on + S(0.1), on + S(REF_DUR - 0.05)), [mEnd, atEnd] = d2(on + S(REF_DUR), x.length);
      R.click.push({ inst, onset: r3(mOn / pk), body: r3(mBody / pk), end: r3(mEnd / pk), endAtMs: Math.round((atEnd - on) / SR * 1000 - REF_DUR * 1000) });
    }
    // 북 · 타악기 — 크기 · 피크만(소리가 나는지)
    R.drums = [];
    for (const d of DRUMS) {
      const buf = await render(3, (e, o) => e.drum(d, 0.05, 0.9, o.app(), 1));
      const x = ch0(buf);
      const L = loud(x, S(0.05), S(1.6));                    // 부풂(swell)은 1초 동안 커지므로 창을 넉넉히
      R.drums.push({ drum: d, rms: L.rms, arms: L.arms, peak: r3(peakOf(buf)) });
      if (L.rms < -60) fail('silent', `북 ${d}: RMS ${L.rms}dBFS — 소리가 거의 안 남`);
    }
    // 음색 거리 — 넷(무게중심 log · 차오름 log · 0.5초 뒤 · 홀짝)을 악기 사이에서 표준화한 뒤 유클리드 거리
    //  홀짝 비는 ±30dB로 자름 — 배음이 거의 없는 소리(마림바 · 첼레스타 · keys)는 −80dB대가 나와 거리를 혼자 좌우하므로
    const F = R.timbre.map(t => [Math.log2(t.centroid), Math.log10(t.attackMs + 1), t.decay05, Math.max(-30, Math.min(30, t.oddEven))]);
    const mu = [0, 1, 2, 3].map(k => F.reduce((s, f) => s + f[k], 0) / F.length), sd = [0, 1, 2, 3].map(k => Math.sqrt(F.reduce((s, f) => s + (f[k] - mu[k]) ** 2, 0) / F.length) || 1);
    const Z = F.map(f => f.map((v, k) => (v - mu[k]) / sd[k])), idx = Object.fromEntries(R.timbre.map((t, i) => [t.inst, i]));
    const dist = (a, b) => Math.sqrt(Z[idx[a]].reduce((s, v, k) => s + (v - Z[idx[b]][k]) ** 2, 0));
    const all = [];
    for (let i = 0; i < INSTS.length; i++) for (let j = i + 1; j < INSTS.length; j++) all.push({ a: INSTS[i], b: INSTS[j], d: r2(dist(INSTS[i], INSTS[j])) });
    all.sort((p, q) => p.d - q.d);
    const rankOf = (a, b) => all.findIndex(x => (x.a === a && x.b === b) || (x.a === b && x.b === a)) + 1;
    const so6pairs = []; const seen = new Set();
    for (const r of SO6.PLAN) { const k = [r.a, r.b].sort().join('|'); if (seen.has(k)) continue; seen.add(k); so6pairs.push({ a: r.a, b: r.b, close: !!r.close, d: r2(dist(r.a, r.b)), rank: rankOf(r.a, r.b) }); }
    const avg = a => r2(a.reduce((s, x) => s + x.d, 0) / Math.max(1, a.length));
    R.dist = { of: all.length, closest: all.slice(0, 8), farthest: all.slice(-5).reverse(), so6: so6pairs, so6CloseAvg: avg(so6pairs.filter(p => p.close)), so6ClearAvg: avg(so6pairs.filter(p => !p.close)) };
    const clearMin = Math.min(...so6pairs.filter(p => !p.close).map(p => p.d));
    for (const p of so6pairs.filter(p => p.close)) if (p.d > clearMin) warn('timbre', `so6 '가까운 짝' ${p.a}–${p.b} 거리 ${p.d}가 뚜렷한 짝 가운데 가장 가까운 것(${clearMin})보다 멂`);
    for (const p of so6pairs.filter(p => !p.close)) if (p.d < R.dist.so6CloseAvg) warn('timbre', `so6 '뚜렷한 짝' ${p.a}–${p.b} 거리 ${p.d}가 가까운 짝 평균(${R.dist.so6CloseAvg})보다 가까움`);
    // 딸깍 경고 — 시작 · 끝의 둘째 차이가 몸통의 4배 넘고 피크의 1% 넘음(우리가 정한 값)
    for (const c of R.click) {
      if (c.onset > 4 * c.body && c.onset > 0.01) warn('click', `${c.inst} 시작에서 튐 ${c.onset}(몸통 ${c.body}) · 피크 대비`);
      if (c.end > 4 * c.body && c.end > 0.01) warn('click', `${c.inst} 끝(음 끝 뒤 ${c.endAtMs}ms)에서 튐 ${c.end}(몸통 ${c.body}) · 피크 대비`);
    }

    // 6. 깨짐 — 가장 많이 겹치는 곳(app 길)
    log('6 깨짐');
    R.clip = [];
    const addClip = (name, buf) => { const p = peakOf(buf); R.clip.push({ name, peak: r3(p), peakDb: r1(db(p)) }); if (p > 0.99) fail('clip', `${name} 피크 ${r3(p)} (> 0.99)`); };
    const hw = segsOf(HWA1);
    for (const row of HWA1.PLAN) for (const ans of ['one', 'many']) {
      const r = { ...row, ans };
      addClip(`hwa1 ${row.kind}${row.m} ${ans === 'many' ? '함께' : '하나씩'}`, await render(8, (e, o) => playSegs(e, hw(r), o.app())));
    }
    const MAXLV = Object.fromEntries(TH.PARTS.map(p => [p.key, p.max]));
    const beat = 60 / TH.THEME.bpm;
    const themeBuf = await render(16 * 4 * beat * 1.2 + 4, (e, o) => {
      const m = e.bus(); m.gain.value = 0.38;                // music.js VOL
      let tb = 0.1;
      for (let i = 0; i < 16; i++) { for (const ev of TH.themeBar(i, MAXLV)) { const t = tb + ev.b * beat; if (ev.kind === 'note') e.note(ev.inst, ev.p, t, ev.d * beat, ev.vel, m); else e.drum(ev.drum, t, ev.vel, m, ev.span); } tb += TH.barLen(i, MAXLV) * beat; }
      for (const ev of TH.cadence(MAXLV)) { const t = tb + ev.b * beat; if (ev.kind === 'note') e.note(ev.inst, ev.p, t, ev.d * beat, ev.vel, m); else e.drum(ev.drum, t, ev.vel, m, ev.span); }
    });
    addClip('주제곡 다섯 줄 다 열림(16마디 + 마침 · 배경 음악 크기 0.38)', themeBuf);
    R.themeRms = r1(db(rms(ch0(themeBuf), S(0.1), S(16 * 4 * beat))));
    const themeLoud = await render(16 * 4 * beat * 1.2 + 4, (e, o) => {
      const m = e.bus(); m.gain.value = 1;
      let tb = 0.1;
      for (let i = 0; i < 16; i++) { for (const ev of TH.themeBar(i, MAXLV)) { const t = tb + ev.b * beat; if (ev.kind === 'note') e.note(ev.inst, ev.p, t, ev.d * beat, ev.vel, m); else e.drum(ev.drum, t, ev.vel, m, ev.span); } tb += TH.barLen(i, MAXLV) * beat; }
    });
    addClip('주제곡 다섯 줄 다 열림(소리 길 크기 1 — 배경 음악 크기를 빼면)', themeLoud);
    const b2 = 0.6;
    addClip('따라 치기 반주 + 고슴도치 북(덩 0.85)', await render(6 * 4 * b2 + 2, (e, o) => {
      const m = e.bus();
      for (let i = 0; i < 6; i++) { const tb = 0.1 + i * 4 * b2; for (const ev of TH.accompBar(i, { sal: 'pulse' })) { const t = tb + ev.b * b2; if (ev.kind === 'note') e.note(ev.inst, ev.p, t, ev.d * b2, ev.vel, m); else e.drum(ev.drum, t, ev.vel, m, ev.span); } if (i >= 2) [0, 1, 2].forEach(j => e.drum('deong', tb + j * b2, 0.85, m)); }
    }));
    addClip('별 셋 + 팡파르(크기 0.9)', await render(6, (e, o) => {
      const m = e.bus(); m.gain.value = 0.9;
      TH.STAR_NOTES.forEach((p, j) => e.note('glock', p, 0.3 + j * 0.45, 0.5, 0.6, m));
      for (const ev of TH.fanfare()) { const t = 0.3 + 3 * 0.45 + 0.1 + ev.b * 60 / TH.FANFARE_BPM; if (ev.kind === 'note') e.note(ev.inst, ev.p, t, ev.d * 60 / TH.FANFARE_BPM, ev.vel, m); else e.drum(ev.drum, t, ev.vel, m, ev.span); }
    }));
    const pv = peaksVel.sort((a, b) => b.peak - a.peak)[0];
    R.clip.push({ name: `악기 하나 가장 큰 피크(${pv.inst} vel ${pv.vel} 솔4)`, peak: r3(pv.peak), peakDb: r1(db(pv.peak)) });
    if (pv.peak > 0.99) fail('clip', `${pv.inst} vel ${pv.vel} 피크 ${r3(pv.peak)}`);
    const pd = [...R.drums].sort((a, b) => b.peak - a.peak)[0];
    R.clip.push({ name: `북 하나 가장 큰 피크(${pd.drum} vel 0.9)`, peak: pd.peak, peakDb: r1(db(pd.peak)) });
    if (pd.peak > 0.99) fail('clip', `북 ${pd.drum} 피크 ${pd.peak}`);

    // 7. 때 — line() → seq() 재생 · 음마다 따로 그려(다른 음은 쉼으로 바꿔 때는 그대로) 예정한 때와 실제 시작을 견줌
    log('7 때');
    R.timing = [];
    const MOTIF = [[67, 1], [64, 1], [67, 2]];
    for (const inst of ['piano', 'xylo', 'marimba', 'recorder', 'flute', 'violin', 'trumpet', 'clarinet', 'harp', 'cello', 'choir', 'strings', 'keys', 'lead', 'glock', 'celesta']) {
      const ln = line(MOTIF, { inst });
      const firsts = [], reach = [];
      for (let j = 0; j < ln.length; j++) {
        let starts;
        const buf = await render(2.4, (e, o) => { starts = playLine(e, ln.map((n, k) => (k === j ? n : { ...n, p: null })), 0.05, o.raw()).starts; }, 1);
        const x = ch0(buf), sched = starts[j], a = S(sched - 0.02);
        let pk = 0; for (let i = a; i < x.length; i++) pk = Math.max(pk, Math.abs(x[i]));
        let iFirst = -1, iReach = -1;
        for (let i = Math.max(0, a); i < x.length; i++) { const v = Math.abs(x[i]); if (iFirst < 0 && v > 1e-4) iFirst = i; if (v >= 0.5 * pk) { iReach = i; break; } }
        firsts.push((iFirst / SR - sched) * 1000); reach.push((iReach / SR - sched) * 1000);
      }
      R.timing.push({ inst, firstMs: r2(Math.max(...firsts.map(Math.abs))), reachMs: r1(Math.max(...reach)), reachMinMs: r1(Math.min(...reach)) });
    }
    for (const t of R.timing) { if (t.firstMs > 1) warn('timing', `${t.inst} 첫 소리가 예정보다 ${t.firstMs}ms 어긋남`); if (t.reachMs > 50) warn('timing', `${t.inst} 피크 절반에 닿기까지 ${t.reachMs}ms(차오름이 느려 박보다 늦게 들릴 수 있음)`); }

    // 8. 칸이 묻는 차이가 실제로 나는가
    log('8 칸');
    R.cells = {};
    // sem1 — 칸 파일의 상수를 옮겨 적음(sem1.js BEAT 0.42 · P 0.2 · F 0.9 · M1) — 칸에서 바꾸면 여기도
    {
      const BEAT = 0.42, P = 0.2, F = 0.9, M1 = [[67, 1], [64, 1], [67, 1], [64, 1]];
      const notes = (vel, inst, shift = 0) => M1.map(([p, b]) => ({ p: p + shift, d: b * BEAT * 0.92, gap: b * BEAT * 0.08, vel, inst }));
      const one = async ns => { const buf = await render(3, (e, o) => playLine(e, ns, 0.05, o.app())); return loud(ch0(buf), S(0.05), S(0.05 + 4 * BEAT)); };
      const rows = [];
      for (const inst of ['piano', 'marimba', 'flute', 'strings']) { const lo = await one(notes(P, inst)), hi = await one(notes(F, inst)); rows.push({ kind: 'pair', inst, dB: r1(hi.arms - lo.arms) }); }
      for (const inst of ['piano', 'flute']) { const hiSoft = await one(notes(P, inst, 12)), loStrong = await one(notes(F, inst)); rows.push({ kind: 'pitch(낮고 센 − 높고 여린)', inst, dB: r1(loStrong.arms - hiSoft.arms), dBrms: r1(loStrong.rms - hiSoft.rms) }); }
      R.cells.sem1 = rows;
      for (const r of rows) if (r.dB < 6) warn('cell', `sem1 ${r.kind} ${r.inst}: 큰 쪽이 ${r.dB}dB(A)만 큼`);
    }
    // so3 — 판마다 소리가 난 길이(−30dB 위) · '긴 소리' 문턱 0.6초
    {
      const rows = [];
      for (const r of SO3.PLAN) {
        const buf = await render(r.d + 1.2, (e, o) => playLine(e, [{ p: r.p, d: r.d }], 0.05, o.app(), 'stacc'), 1);
        const x = ch0(buf);
        rows.push({ inst: r.inst, p: r.p, d: r.d, right: r.right, heard: r2(soundLen(x, S(0.05), x.length)), peak: peakLoud(x, S(0.05), x.length) });
      }
      R.cells.so3 = rows;
      for (const r of rows) if ((r.right === 'long') !== (r.heard > 0.6)) warn('cell', `so3 ${r.inst} ${r.p} 예정 ${r.d}초(${r.right}) · 실제로 난 길이 ${r.heard}초 — 0.6초 문턱 반대쪽`);
      const byKey = {}; for (const r of rows) (byKey[r.inst + r.p] = byKey[r.inst + r.p] || []).push(r);
      R.cells.so3Peak = Object.values(byKey).filter(g => g.length > 1).map(g => ({ inst: g[0].inst, p: g[0].p, peakSpread: r1(Math.max(...g.map(x => x.peak)) - Math.min(...g.map(x => x.peak))) }));
    }
    // so5 — 판마다 두 소리의 높이(센트) · 길이(실제) · 크기(가장 큰 100ms) 차 — 답이 아닌 둘은 거의 같아야
    {
      const rows = [];
      const meas = async (inst, s) => {
        const buf = await render(s.d + 1.2, (e, o) => playLine(e, [{ p: s.p, d: s.d, vel: s.v }], ONSET, o.app(), 'stacc'), 1);
        const x = dcBlock(Float32Array.from(ch0(buf)));
        const m = measure(x, SR, freq(s.p), 0.03, Math.max(0.15, Math.min(s.d - 0.02, 0.9)));
        return { cents: m ? m.cents : null, len: soundLen(ch0(buf), S(ONSET), ch0(buf).length), loud: peakLoud(ch0(buf), S(ONSET), ch0(buf).length) };
      };
      for (const r of SO5.PLAN) {
        const A = await meas(r.inst, r.a), B = await meas(r.inst, r.b);
        const dPitch = A.cents == null || B.cents == null ? null : r1(1200 * Math.log2(freq(r.b.p) / freq(r.a.p)) + B.cents - A.cents);
        rows.push({ k: r.k, inst: r.inst, a: r.a, b: r.b, dPitchCents: dPitch, dLenSec: r2(B.len - A.len), dLoudDb: r1(B.loud - A.loud) });
      }
      R.cells.so5 = rows;
      for (const r of rows) {
        if (r.k !== 'pitch' && r.dPitchCents != null && Math.abs(r.dPitchCents) > 10) warn('cell', `so5 ${r.k} ${r.inst}: 높이도 ${r.dPitchCents}센트 바뀜`);
        if (r.k !== 'len' && Math.abs(r.dLenSec) > 0.1) warn('cell', `so5 ${r.k} ${r.inst}: 길이도 ${r.dLenSec}초 바뀜`);
        if (r.k !== 'vol' && Math.abs(r.dLoudDb) > 3) warn('cell', `so5 ${r.k} ${r.inst}: 크기도 ${r.dLoudDb}dB(A) 바뀜(답은 ${r.k})`);
        if (r.k === 'vol' && Math.abs(r.dLoudDb) < 6) warn('cell', `so5 vol ${r.inst}: 크기 차가 ${r.dLoudDb}dB(A)뿐`);
      }
    }
    // ppa1 — 빠르기마다 소리 시작 사이 간격(중앙값) · 빠르기 비
    {
      const rows = {};
      for (const t of ['slow', 'mid', 'fast']) {
        const c = PPA1.clip(t, 'plain', { inst: 'piano' });
        const buf = await render(c.win + 1.5, (e, o) => { const out = o.app(); for (const n of c.notes) e.note(c.inst, n.p, 0.1 + n.at, n.d, n.vel, out); }, 1);
        const on = onsets(ch0(buf), 0, ch0(buf).length), ioi = on.slice(1).map((v, i) => v - on[i]);
        rows[t] = { planned: PPA1.BEAT[t], heard: r3(median(ioi)), found: on.length, notes: c.notes.length };
      }
      R.cells.ppa1 = { ...rows, slowOverMid: r2(rows.slow.heard / rows.mid.heard), midOverFast: r2(rows.mid.heard / rows.fast.heard) };
      for (const t of ['slow', 'mid', 'fast']) if (rows[t].found !== rows[t].notes) warn('cell', `ppa1 ${t}: 음 ${rows[t].notes}개 중 기계 귀가 시작을 ${rows[t].found}개 찾음`);
      const dynLo = R.vel.xylo[0.18], dynHi = R.vel.xylo[0.9];
      R.cells.ppa1.dynXyloDb = r1(dynHi - dynLo);
    }
    // hwa1 soft — 아래 낮은 소리(첼로)가 위 가락보다 몇 dB 작은지 · 첼로의 250Hz 위 비율
    {
      const rows = [];
      for (const m of [0, 1]) {
        const segs = segsOf(HWA1)({ kind: 'soft', m, ans: 'many' })[0].lines;
        const top = await render(3, (e, o) => playLine(e, segs[0], 0.05, o.app()), 1), low = await render(3, (e, o) => playLine(e, segs[1], 0.05, o.app()), 1);
        const len = S(0.05 + 4 * 0.42);
        const T = loud(ch0(top), S(0.05), len), L = loud(ch0(low), S(0.05), len);
        rows.push({ m, top: segs[0][0].inst, low: segs[1][0].inst, lowP: segs[1][0].p, belowDbA: r1(T.arms - L.arms), belowDb: r1(T.rms - L.rms), lowAbove250: L.above250 });
      }
      R.cells.hwa1soft = rows;
      for (const r of rows) if (r.lowAbove250 < 0.5) warn('speaker', `hwa1 soft ${r.low} ${letter(r.lowP)}(${r.lowP}): 250Hz 위 에너지 ${Math.round(r.lowAbove250 * 100)}% · 위 가락보다 ${r.belowDbA}dB(A) 작음`);
    }
    // so6 · hy1 — 두 도막의 크기 차(loud) · 높이 차(pitch)
    {
      const rows = [];
      const segLoud = async (mod, row) => {
        const segs = segsOf(mod)(row); let lens;
        const buf = await render(6, (e, o) => { lens = playSegs(e, segs, o.app()).lens; }, 1);
        return lens.map(([a, b]) => loud(ch0(buf), S(a), S(b)));
      };
      for (const r of SO6.PLAN.filter(r => r.kind !== 'plain')) for (const ans of ['same', 'diff']) {
        const [A, B] = await segLoud(SO6, { ...r, ans });
        rows.push({ cell: 'so6', kind: r.kind, a: r.a, second: ans === 'same' ? r.a : r.b, dDbA: r1(B.arms - A.arms), dCentroid: B.centroid - A.centroid });
      }
      const [A, B] = await segLoud(HY1, { kind: 'loud', a: 'b', b: 'd', right: 'same' });
      rows.push({ cell: 'hy1', kind: 'loud', a: 'piano', second: 'piano', dDbA: r1(B.arms - A.arms), dCentroid: B.centroid - A.centroid });
      R.cells.so6hy1 = rows;
      for (const r of rows) if (r.kind === 'loud' && r.dDbA < 6) warn('cell', `${r.cell} loud ${r.a}→${r.second}: 크게 쪽이 ${r.dDbA}dB(A)만 큼`);
    }
  } finally {
    Math.random = realRandom;
  }
  R.meta.sec = r1((performance.now() - t0) / 1000);
  return R;
}
