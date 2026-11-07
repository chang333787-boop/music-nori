// 마디 채우기 — '음표 몇 개'가 아니라 '몇 박이 찼나'를 센다(계획서 '가장 어려운 곳: 4/4 마디 채우기')
//  빈 마디 = 박 칸 넷(4/4). 음표 블록은 길이만큼 칸을 차지한다. 넘치면 넘친 만큼, 모자라면 빈 박이 남는다.
import { barTicks, beatTicks, fractionOf } from './theory.js';

// durs = 넣은 블록 길이(틱) 차례대로 → 박 칸마다 얼마나 찼는지 · 넘침 · 다 찼는지
export function fillBar(durs, meter = [4, 4]) {
  const cap = barTicks(meter), bt = beatTicks(meter), n = cap / bt;
  const used = durs.reduce((a, d) => a + d, 0);
  const cells = Array.from({ length: n }, (_, i) => Math.max(0, Math.min(bt, used - i * bt)) / bt);   // 0 ~ 1
  // 블록마다 어느 칸부터 어느 칸까지 — 그림 · 넘친 블록 표시용
  let t = 0;
  const blocks = durs.map(d => { const b = { from: t, to: t + d, over: t + d > cap }; t += d; return b; });
  return { cap, used, over: Math.max(0, used - cap), left: Math.max(0, cap - used), full: used === cap, cells, blocks, beats: used / bt };
}

// 분수 보기 — 4학년(같은 분모): 4분음표 = 1/4 · 2분음표 = 2/4 · 온음표 = 4/4.
//  5학년(통분 뒤): 8분음표 = 1/8 · 2분음표 = 1/2. grade < 5면 분모 4로만 적을 수 있는 것만 보여 준다.
export function fractionText(durs, grade = 4) {
  if (grade < 5) {
    const parts = durs.map(d => fractionOf(d, 4));
    if (parts.some(p => !p)) return null;                      // 8분음표가 끼면 4학년 보기는 끔
    const sum = parts.reduce((a, p) => a + p[0], 0);
    return parts.map(p => `${p[0]}/4`).join(' + ') + ` = ${sum}/4`;
  }
  const low = d => { for (const den of [1, 2, 4, 8, 16]) { const f = fractionOf(d, den); if (f) return f; } return null; };
  const parts = durs.map(low);
  if (parts.some(p => !p)) return null;
  const sum8 = durs.reduce((a, d) => a + d, 0) * 8 / 48;
  return parts.map(([n, d]) => `${n}/${d}`).join(' + ') + ` = ${sum8}/8`;
}

// 이 블록들로 마디를 채우는 서로 다른 방법 수(순서 다르면 다른 답) — 다같이 모드에서 '서로 다른 답' 모아 보기 · 문제 고르기
export function countFills(choices, meter = [4, 4], limit = 10000) {
  const cap = barTicks(meter), memo = new Map();
  const go = left => {
    if (left === 0) return 1;
    if (memo.has(left)) return memo.get(left);
    let c = 0;
    for (const d of choices) if (d <= left) c += go(left - d);
    c = Math.min(c, limit);
    memo.set(left, c);
    return c;
  };
  return go(cap);
}
