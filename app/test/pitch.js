// 합성음 높이 시험 — audio.js 악기마다 여러 음을 OfflineAudioContext로 그려, 소리가 자리 잡은 구간의 기본 주파수를 잰다.
//  freq(p)와 센트 차이 |센트| ≤ 6 이면 통과(0단계 관문). 결과 = window.__result = { rows:[{ inst, p, cents, ok, … }], worst }
//  재는 법(YIN 계열 · 시간 영역):
//   1) 거친 주기 — 구간 안 세 곳에서 정규화 자기상관(NSDF)을 기대 주기의 0.45~2.2배 사이에서 구해, 가장 높은 봉우리의 97%를 넘는
//      첫 봉우리(McLeod 방식)를 고른다. 한 옥타브 틀린 소리도 잡히게 기대 주기 둘레를 넓게 본다.
//   2) 다듬기 — 15ms마다 토막을 잘라, 주기 m개(약 20ms) 떨어진 곳의 차이 함수 Σ(x[i]−x[i+τ])² 가 가장 작은 τ를 포물선으로 다듬고
//      주기 = τ/m. 주기 여러 개를 건너 재면 표본 하나의 오차가 m으로 나뉜다(높은 음에서 중요).
//   3) 토막마다 센트를 내고 평균. 떨림(비브라토)이 있는 악기는 떨림이 여러 번 들어가는 1.55초를 평균한다(떨림이 반 번 남아도 1센트 아래).
//  소리 길: 악기 → dry → master → 압축기 → 출력(울림은 뺀다 — 울림은 음 높이를 바꾸지 않고 잡음만 섞는다).
import { Engine } from '../js/audio.js';
import { freq, letter } from '../../engine/theory.js';

const LIMIT = 6, ONSET = 0.05, LAG = 0.02, HOP = 0.015;
const VIB = { dur: 2.0, seg: [0.35, 1.9], how: '떨림 평균' };
// 악기 · 음들(쓸 만한 음역에서 5~6개) · 음 길이(초) · 잴 구간(소리 시작에서 초) · 구간 설명
const PLAN = [
  { inst: 'piano', ps: [36, 48, 60, 69, 79, 91], dur: 1.0, seg: [0.08, 0.7] },
  { inst: 'xylo', ps: [65, 72, 77, 84, 91, 96], dur: 0.6, seg: [0.03, 0.4] },
  { inst: 'marimba', ps: [45, 52, 60, 67, 76, 84], dur: 0.8, seg: [0.04, 0.6] },
  { inst: 'recorder', ps: [60, 64, 67, 72, 76, 81], ...VIB },
  // 가야금 = Karplus-Strong(audio.js _ksBuffer) — 줄 길이 N = round(sr/f) 표본에 두 점 평균이 반 표본을 더 늦춰 주기가 N + 0.5 → 예상 센트를 같이 적는다
  { inst: 'gayageum', ps: [48, 55, 60, 67, 72, 79], dur: 1.2, seg: [0.04, 0.33], how: '농현(0.35초~) 앞',
    why: (p, sr) => { const f = freq(p), c = -1200 * Math.log2((Math.round(sr / f) + 0.5) * f / sr); return `KS 주기 N+0.5로 예상 ${c.toFixed(1)}`; } },
  { inst: 'bass', ps: [28, 33, 40, 45, 52, 57], dur: 1.0, seg: [0.1, 0.9] },
  { inst: 'pad', ps: [48, 55, 60, 67, 72, 79], dur: 1.5, seg: [0.2, 1.4], how: '어긋난 소리 셋 평균' },
  { inst: 'violin', ps: [55, 62, 69, 76, 81, 88], ...VIB },
  { inst: 'strings', ps: [48, 55, 62, 69, 76, 84], ...VIB, how: '떨림 · 어긋난 소리 셋 평균' },
  { inst: 'cello', ps: [36, 43, 50, 57, 64, 69], ...VIB },
  { inst: 'contrabass', ps: [28, 33, 38, 43, 48, 55], ...VIB },
  { inst: 'pizz', ps: [43, 50, 57, 64, 72, 79], dur: 0.5, seg: [0.03, 0.3] },
  { inst: 'flute', ps: [60, 67, 72, 79, 84, 91], ...VIB },
  { inst: 'clarinet', ps: [52, 57, 64, 70, 77, 84], dur: 1.2, seg: [0.1, 1.1] },
  { inst: 'oboe', ps: [58, 65, 70, 77, 84, 89], ...VIB },
  { inst: 'trumpet', ps: [55, 60, 67, 72, 77, 82], ...VIB, how: '스쿱(처음 0.05초) 뒤 · 떨림 평균' },
  { inst: 'horn', ps: [41, 48, 55, 60, 67, 72], dur: 1.5, seg: [0.2, 1.4], how: '어긋난 소리 둘 평균' },
  { inst: 'tuba', ps: [29, 34, 41, 46, 53, 58], dur: 1.5, seg: [0.15, 1.4], how: '스쿱(처음 0.04초) 뒤' },
  { inst: 'harp', ps: [36, 48, 60, 72, 84, 96], dur: 1.0, seg: [0.03, 0.6] },
  { inst: 'celesta', ps: [60, 67, 72, 79, 84, 96], dur: 0.8, seg: [0.03, 0.6] },
  { inst: 'glock', ps: [79, 84, 89, 96, 103], dur: 0.8, seg: [0.03, 0.5] },
  { inst: 'choir', ps: [48, 55, 60, 67, 72, 79], ...VIB, how: '떨림 · 어긋난 소리 둘 평균' },
  { inst: 'timpani', ps: [40, 45, 50, 55, 60], dur: 1.2, seg: [0.2, 1.0], how: '처음 미끄러짐(0.09초) 뒤' },
];

async function render(inst, p, dur, len, sr) {
  const ac = new OfflineAudioContext(1, Math.ceil(len * sr), sr);
  const e = new Engine();
  e._setup(ac);
  e.note(inst, p, ONSET, dur, 0.8, e.dry);
  const x = (await ac.startRendering()).getChannelData(0);
  // 직류(0Hz) 걸러 내기 — 뜯는 소리(KS)는 처음 잡음의 평균이 직류로 오래 남아, 음이 사라진 뒤에도 '주기 없는 큰 값'이 된다.
  //  한 극 고역 통과(극 0.999 · 약 8Hz)는 시간에 따라 바뀌지 않는 거름이라 주기(음 높이)는 그대로 둔다.
  let px = 0, py = 0;
  for (let i = 0; i < x.length; i++) { const v = x[i]; py = v - px + 0.999 * py; px = v; x[i] = py; }
  return x;
}

// 두 토막 x[s..s+W) 와 x[s+τ..s+τ+W) 의 평균을 뺀 상관 계수(피어슨) — 소리 크기 · 천천히 움직이는 치우침과 상관없이 모양만 견준다
function pearson(x, s, W, tau) {
  let su = 0, sv = 0, uv = 0, uu = 0, vv = 0;
  for (let i = s, z = s + W; i < z; i++) { const u = x[i], v = x[i + tau]; su += u; sv += v; uv += u * v; uu += u * u; vv += v * v; }
  const cu = uu - su * su / W, cv = vv - sv * sv / W;
  return cu > 0 && cv > 0 ? (uv - su * sv / W) / Math.sqrt(cu * cv) : 0;
}
// 토막의 크기(평균을 뺀 제곱합)
function power(x, s, W) {
  let su = 0, uu = 0;
  for (let i = s, z = s + W; i < z; i++) { const u = x[i]; su += u; uu += u * u; }
  return Math.max(0, uu - su * su / W);
}

// 거친 주기(표본) — 상관 계수 봉우리 가운데 가장 높은 것의 97%를 넘는 첫 봉우리(McLeod 방식 · 문턱을 높여 뜯는 소리 첫머리의 2배음에 속지 않게) · 없으면 0
function coarsePeriod(x, s0, W, lo, hi) {
  const n = new Float64Array(hi + 2);
  for (let tau = lo - 1; tau <= hi + 1; tau++) n[tau] = pearson(x, s0, W, tau);
  let max = 0;
  for (let tau = lo; tau <= hi; tau++) if (n[tau] > n[tau - 1] && n[tau] >= n[tau + 1] && n[tau] > max) max = n[tau];
  if (max <= 0.3) return 0;
  for (let tau = lo; tau <= hi; tau++) {
    if (n[tau] > n[tau - 1] && n[tau] >= n[tau + 1] && n[tau] >= 0.97 * max) {
      const a = n[tau - 1], b = n[tau], c = n[tau + 1], den = a - 2 * b + c;
      return tau + (den ? 0.5 * (a - c) / den : 0);
    }
  }
  return 0;
}

// τ 둘레 [c − half, c + half]에서 상관 계수가 가장 큰 곳 → 포물선으로 다듬은 τ · 계수(줄어드는 소리도 그대로 잰다)
const cc = new Float64Array(512);
function bestLag(x, s, W, c, half) {
  let best = -1, bv = -2;
  for (let k = 0; k <= 2 * half; k++) {
    cc[k] = pearson(x, s, W, c - half + k);
    if (cc[k] > bv) { bv = cc[k]; best = k; }
  }
  if (best <= 0 || best >= 2 * half) return null;                // 끝에 걸림 = 봉우리를 못 찾음
  const a = cc[best - 1], b = cc[best], d = cc[best + 1], den = a - 2 * b + d;
  return { tau: c - half + best + (den < 0 ? 0.5 * (a - d) / den : 0), q: b };
}

// 소리 x 의 구간 [segA, segB](소리 시작에서 초)의 기본 주파수 → { f, cents, sd, frames } 또는 null
//  다듬기는 주기 1개 → 2개 → 4개 … 로 늘려 가며 한다(앞 단계 주기로 다음 자리를 예측 → 어긋난 배음이 있는 소리도 이웃 봉우리로 튀지 않음)
export function measure(x, sr, fExp, segA, segB) {
  const a = Math.round((ONSET + segA) * sr), b = Math.min(x.length, Math.round((ONSET + segB) * sr));
  const Te = sr / fExp, lo = Math.max(2, Math.floor(Te * 0.45)), hi = Math.ceil(Te * 2.2);
  const Wc = Math.max(1024, Math.round(Te * 2.5));
  // 소리가 살아 있는 끝(5ms 토막 크기가 가장 큰 토막의 −30dB 아래로 내려가기 전) — 금방 사라지는 높은 뜯는 소리도 그 안에서만 잰다
  const blk = Math.round(0.005 * sr);
  let bMax = 0, live = a;
  const be = [];
  for (let s = a; s + blk <= b; s += blk) { const e = power(x, s, blk); be.push(e); if (e > bMax) bMax = e; }
  be.forEach((e, k) => { if (e >= bMax * 1e-3) live = a + (k + 1) * blk; });
  const room = Math.max(0, Math.min(b, live) - Wc - hi - 2 - a);
  if (a + room + Wc + hi + 2 > b) return null;
  const tcs = [0.2, 0.5, 0.8].map(k => coarsePeriod(x, a + Math.round(room * k), Wc, lo, hi)).filter(t => t > 0).sort((p, q) => p - q);
  if (!tcs.length) return null;
  const Tc = tcs[tcs.length >> 1];
  // 짧은 소리는 토막 · 건너뛰는 주기 수를 줄여, 토막이 살아 있는 구간 밖으로 나가지 않게
  const avail = live - a, W = Math.max(256, Math.min(1024, Math.floor(avail / 3)), Math.round(Tc * 2));
  const M = Math.max(1, Math.min(Math.round(LAG * sr / Tc), Math.floor((avail - W) / 2 / (Tc * 1.05))));
  const hop = Math.max(Math.round(0.004 * sr), Math.min(Math.round(HOP * sr), Math.round(avail / 12)));
  const reach = Math.ceil(M * Tc * 1.05) + 8;
  const starts = [], energy = [];
  for (let s = a; s + W + reach <= Math.min(b, live); s += hop) { starts.push(s); energy.push(power(x, s, W)); }
  const eMax = Math.max(0, ...energy), cents = [];
  let mUsed = 0;
  for (let j = 0; j < starts.length; j++) {
    if (energy[j] < eMax * 1e-4) continue;                       // −40dB 아래 토막은 뺀다(다 사라진 소리)
    const s = starts[j];
    let T = Tc, ok = false, m = 1;
    for (; m <= M; m = m === M ? M + 1 : Math.min(M, m * 2)) {
      const half = m === 1 ? Math.max(2, Math.min(Math.ceil(Tc * 0.06), 30)) : Math.max(2, Math.min(Math.ceil(T * 0.1) + 1, Math.floor(T * 0.45), 200));
      const r = bestLag(x, s, W, Math.round(m * T), half);
      if (!r || r.q < 0.5) break;                                // 이 길이에선 주기가 흐림 → 앞 단계 값을 쓴다
      T = r.tau / m; ok = true; mUsed = Math.max(mUsed, m);
    }
    if (ok) cents.push(1200 * Math.log2((sr / T) / fExp));
  }
  if (cents.length < 3) return null;
  const mean = cents.reduce((s, c) => s + c, 0) / cents.length;
  const sd = Math.sqrt(cents.reduce((s, c) => s + (c - mean) * (c - mean), 0) / cents.length);
  return { cents: mean, sd, f: fExp * Math.pow(2, mean / 1200), frames: cents.length, m: mUsed };
}

const tbody = document.getElementById('rows'), sum = document.getElementById('sum');
const cell = (t, cls) => { const td = document.createElement('td'); td.textContent = t; if (cls) td.className = cls; return td; };
function addRow(r) {
  const tr = document.createElement('tr');
  if (!r.ok) tr.className = 'bad';
  tr.append(cell(r.inst), cell(`${r.name} (${r.p})`), cell(r.sr), cell(r.fExp.toFixed(2), 'n'), cell(Number.isFinite(r.f) ? r.f.toFixed(2) : '—', 'n'),
    cell(Number.isFinite(r.cents) ? (r.cents > 0 ? '+' : '') + r.cents.toFixed(2) : '—', 'n'), cell(Number.isFinite(r.sd) ? r.sd.toFixed(1) : '—', 'n'),
    cell(r.seg), cell(r.ok ? '통과' : '넘음', r.ok ? 'ok' : 'no'));
  tbody.append(tr);
}

// 자가 점검 — 높이를 아는 소리(사인 · 톱니)를 일부러 몇 센트 어긋나게 그려, 재는 법이 그만큼을 돌려주는지 본다(시험의 시험)
async function selfCheck(sr) {
  const out = [];
  for (const [type, p, off] of [['sine', 33, 3], ['sawtooth', 45, -4.5], ['sine', 69, -2], ['sawtooth', 69, 5], ['square', 84, 2.5], ['sine', 100, -3]]) {
    const ac = new OfflineAudioContext(1, Math.ceil(0.8 * sr), sr), o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq(p) * Math.pow(2, off / 1200); g.gain.value = 0.3;
    o.connect(g).connect(ac.destination); o.start(ONSET); o.stop(0.8);
    const x = (await ac.startRendering()).getChannelData(0);
    const r = measure(x, sr, freq(p), 0.05, 0.7);
    out.push({ type, p, sr, off, got: r ? Math.round(r.cents * 100) / 100 : NaN, err: r ? Math.abs(r.cents - off) : Infinity });
  }
  return out;
}

async function main() {
  const q = new URLSearchParams(location.search);
  const srs = (q.get('sr') || '48000,44100').split(',').map(Number).filter(v => v >= 8000);
  const only = q.get('inst') ? q.get('inst').split(',') : null;
  const t0 = performance.now(), rows = [], check = [];
  for (const sr of srs) check.push(...await selfCheck(sr));
  const checkErr = Math.max(...check.map(c => c.err));
  for (const sr of srs) {
    for (const plan of PLAN) {
      if (only && !only.includes(plan.inst)) continue;
      for (const p of plan.ps) {
        const fExp = freq(p);
        const x = await render(plan.inst, p, plan.dur, ONSET + plan.seg[1] + 0.05, sr);
        const res = measure(x, sr, fExp, plan.seg[0], plan.seg[1]);
        const seg = `${plan.seg[0].toFixed(2)}–${plan.seg[1].toFixed(2)}초` + (plan.how ? ` · ${plan.how}` : '') + (res ? ` · 토막 ${res.frames}개` : ' · 잴 수 없음') + (plan.why ? ` · ${plan.why(p, sr)}` : '');
        const cents = res ? Math.round(res.cents * 100) / 100 : NaN;
        const row = { inst: plan.inst, p, name: letter(p), sr, fExp, f: res ? res.f : NaN, cents, sd: res ? res.sd : NaN, seg, ok: Number.isFinite(cents) && Math.abs(cents) <= LIMIT };
        rows.push(row); addRow(row);
      }
      sum.textContent = `재는 중… ${rows.length}개`;
      await new Promise(r => setTimeout(r, 0));
    }
  }
  let worst = null;
  for (const r of rows) if (!worst || !Number.isFinite(r.cents) || Math.abs(r.cents) > Math.abs(worst.cents)) { if (!worst || Number.isFinite(worst.cents)) worst = r; }
  const bad = rows.filter(r => !r.ok);
  sum.textContent = (bad.length ? `넘음 ${bad.length}개 / ${rows.length}개` : `모두 통과 ${rows.length}개`) +
    (worst ? ` · 가장 큰 차이: ${worst.inst} ${worst.name} ${worst.sr}Hz ${Number.isFinite(worst.cents) ? worst.cents.toFixed(2) + '센트' : '잴 수 없음'}` : '') +
    ` · 자가 점검 최대 오차 ${checkErr.toFixed(2)}센트 · ${((performance.now() - t0) / 1000).toFixed(1)}초`;
  window.__result = { rows, worst, limit: LIMIT, srs, sec: (performance.now() - t0) / 1000, check, checkErr };
}
main().catch(e => { console.error(e); sum.textContent = '시험이 멈췄어요: ' + e.message; window.__result = { error: String(e && e.stack || e), rows: [], worst: null }; });
