// 박 판정 — 학년군 판정 창 · 기기 지연 빼기 · '이어 지킨 박' 점수 · 지연 재기(화면 · 소리 없음 · node로 시험)
//  숫자는 계획서 '미니 확인 게임' 표(4분음표 판 기준). 연구값에서 유도한 추정이라 2027년 3월 시범 기록으로 다시 맞춘다.

export const BANDS = {
  low:  { name: '1~2학년', ok: 150, okLate: 180, great: 70, bpm: [100, 120] },
  mid:  { name: '3~4학년', ok: 115, okLate: 115, great: 55, bpm: [80, 130] },
  high: { name: '5~6학년', ok: 100, okLate: 100, great: 45, bpm: [60, 150] },
};

// 판정 창(ms). 가장 짧은 음 간격(minIOI)의 35%를 넘지 않게 줄인다 — 옆 음과 창이 겹치지 않게
export function windows(band = 'mid', minIOI = Infinity) {
  const b = BANDS[band] || BANDS.mid, cap = minIOI * 0.35;
  return { early: Math.min(b.ok, cap), late: Math.min(b.okLate, cap), great: Math.min(b.great, cap) };
}

// expected = 맞춰야 할 시각들(ms) · taps = 두드린 시각들(ms, 같은 시계) · latency = 기기 지연(ms, 두드림에서 뺀다)
//  skip = 앞에서 채점하지 않을 박 수(준비 박 네 개 뒤 첫 두 박)
//  → beats[i] = 'great' | 'ok' | 'miss' | 'skip' · extra = 어느 박에도 안 맞은 두드림 수
export function judgeTaps(expected, taps, { band = 'mid', latency = 0, skip = 2, minIOI } = {}) {
  if (minIOI == null) {
    minIOI = Infinity;
    for (let i = 1; i < expected.length; i++) minIOI = Math.min(minIOI, expected[i] - expected[i - 1]);
  }
  const w = windows(band, minIOI);
  const adj = taps.map(t => t - latency).sort((a, z) => a - z);
  const used = new Array(adj.length).fill(false);
  const beats = [], offs = [];
  for (let i = 0; i < expected.length; i++) {
    const e = expected[i];
    let best = -1, bestAbs = Infinity;
    for (let k = 0; k < adj.length; k++) {
      if (used[k]) continue;
      const d = adj[k] - e;
      if (d < -w.early || d > w.late) continue;
      if (Math.abs(d) < bestAbs) { best = k; bestAbs = Math.abs(d); }
    }
    let g = 'miss', off = null;
    if (best >= 0) { used[best] = true; off = adj[best] - e; g = Math.abs(off) <= w.great ? 'great' : 'ok'; }
    beats.push(i < skip ? 'skip' : g);
    offs.push(off);
  }
  return { beats, offs, extra: used.filter(u => !u).length, win: w, ...score(beats) };
}

// 점수 — 한 번 놓쳤다고 끝내지 않는다. 가장 길게 이어 지킨 박 · 지킨 박 수 · 별
//  별 셋은 기준이 서로 다르고 화면에 기준 글을 함께 쓴다(받은 별만 채움 · 11-07 처음 보는 눈 평가):
//   ① 절반 넘게 맞힘 ② 8번 이어서 맞힘(채점 박이 8개보다 적으면 모두) ③ 모두 맞힘
export const STAR_RULES = ['절반 넘게 맞혔어요', '8번 이어서 맞혔어요', '모두 맞혔어요'];
export function score(beats) {
  const scored = beats.filter(b => b !== 'skip');
  let run = 0, best = 0, kept = 0, great = 0;
  for (const b of scored) {
    if (b === 'miss') { run = 0; continue; }
    run++; kept++; if (b === 'great') great++;
    best = Math.max(best, run);
  }
  const total = scored.length;
  const starOn = [total > 0 && kept * 2 > total, total > 0 && best >= Math.min(8, total), total > 0 && kept === total];
  return { kept, great, total, streak: best, rate: kept / (total || 1), starOn, stars: starOn.filter(Boolean).length };
}

// 두드림 어긋남 한 판 요약(11-08 토론 X4) — 기기 기록 hist의 t. 3월 판정 창을 다시 맞출 자료(아이 화면 · 서버 X)
//  offs = 판정 창 안에 들어 박(음)에 붙은 두드림의 어긋남(ms · 기기 지연을 뺀 뒤 · 앞당김은 음수) · miss = 놓친 박 수
//  → { o: 가운데 값, sp: 사분위 범위(Q3 − Q1 = 가운데 절반이 퍼진 폭 · 선형 보간), m, lat: 그때 뺀 기기 지연, band: 판정 창 이름, bpm }
//  맞힌 두드림이 없으면 o · sp = null. 숫자는 모두 반올림 정수(기록 크기를 늘리지 않게)
export function tapStats(offs, miss = 0, { lat = 0, band = 'mid', bpm = 0 } = {}) {
  const s = (offs || []).filter(Number.isFinite).sort((a, z) => a - z);
  const q = p => { const x = (s.length - 1) * p, i = Math.floor(x), j = Math.min(i + 1, s.length - 1); return s[i] + (s[j] - s[i]) * (x - i); };
  const r = v => Math.round(v) + 0;                // + 0 = -0을 0으로
  return { o: s.length ? r(q(0.5)) : null, sp: s.length ? r(q(0.75) - q(0.25)) : null, m: r(miss || 0), lat: r(lat || 0), band, bpm: r(bpm || 0) };
}

// 지연 재기 — '딸깍 소리에 맞춰 8번 두드리기'. clicks·taps = 같은 시계(ms)
//  두드림마다 가장 가까운 딸깍과의 차이 → 가운데 값. 가운데에서 120ms 넘게 벗어난 두드림은 버리고 다시 계산.
//  6개 미만이 남거나(여덟 번 중 둘까지만 버림) 흔들림(가운데 절대 편차)이 40ms를 넘으면 ok:false(다시 재기)
export function estimateLatency(clicks, taps) {
  const diffs = taps.map(t => {
    let best = Infinity;
    for (const c of clicks) if (Math.abs(t - c) < Math.abs(best)) best = t - c;
    return best;
  }).filter(Number.isFinite);
  const med = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  if (diffs.length < 6) return { ok: false, ms: 0, spread: null, n: diffs.length };
  const m0 = med(diffs);
  const keep = diffs.filter(d => Math.abs(d - m0) <= 120);
  if (keep.length < 6) return { ok: false, ms: Math.round(m0), spread: null, n: keep.length };
  const m1 = med(keep), spread = med(keep.map(d => Math.abs(d - m1)));
  return { ok: spread <= 40, ms: Math.round(m1), spread: Math.round(spread), n: keep.length };
}
