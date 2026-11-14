// 리듬 카드 글 → 박 목록 · 소리 줄(11-14 · 묶음 C · 리8 · 리9가 같이 씀) — 화면 · 소리 없음(node 시험 tests/rcard.test.mjs)
//  카드 글 = 낱말을 빈칸으로 이음 · 낱말 사이 '~' = 붙임줄(앞 낱말의 끝 음과 뒤 낱말의 첫 음을 하나로 · 뒤 음은 소리 없음)
//   q ♩ · h 2분 · dh 점2분 · e2 ♫ · s4 16분 넷 · s2e ♬♪(16-16-8) · es2 ♪♬(8-16-16) · er ♪+8분쉼표 · re 8분쉼표+♪
//   trip 셋잇단(한 박에 셋) · dqe ♩.♪(두 박) · syn ♪♩♪(두 박 · 당김음)
//  beatsOf(글)  → _glyph.js glyph()가 받는 박 목록(쉼표는 음수 · 붙임줄은 { d, tie: true })
//  eventsOf(글) → 소리 나는 음 [{ t, len }](박 단위 · 붙임줄은 이은 길이 하나로)
//  rhythmLine(글, { beat, inst, p, vel }) → 음 줄(음마다 d = 길이 × 박 × 0.8 · 가장 짧아도 0.06 · 나머지는 gap · 쉼은 p: null)
//  soundKey(글) → 소리가 같으면 같은 열쇠(음 시작 + 길이) — 붙임줄 ♩‿♩와 2분음표는 같은 열쇠

export const TOKENS = {
  q: [1], h: [2], dh: [3], e2: [0.5, 0.5], s4: [0.25, 0.25, 0.25, 0.25], s2e: [0.25, 0.25, 0.5], es2: [0.5, 0.25, 0.25],
  er: [0.5, -0.5], re: [-0.5, 0.5], trip: [1 / 3, 1 / 3, 1 / 3], dqe: [1.5, 0.5], syn: [0.5, 1, 0.5],
};
const EPS = 1e-6;

// 글 → 낱 [{ d, rest, tie }] (붙임줄은 앞 낱의 끝 음에 tie)
function parse(text) {
  const out = [];
  for (const word of String(text).trim().split(/\s+/)) {
    const parts = word.split('~');
    parts.forEach((tok, k) => {
      const b = TOKENS[tok];
      if (!b) throw new Error(`리듬 카드: 모르는 낱말 ${tok}(${text})`);
      if (k > 0) {                                  // 붙임줄 — 앞 음과 이 낱말의 첫 음이 모두 소리 나는 음이어야 함
        const prev = out[out.length - 1];
        if (!prev || prev.rest || b[0] < 0) throw new Error(`리듬 카드: 붙임줄 앞뒤가 음이 아님(${text})`);
        prev.tie = true;
      }
      for (const v of b) out.push({ d: Math.abs(v), rest: v < 0, tie: false });
    });
  }
  return out;
}

export const beatsOf = text => parse(text).map(it => (it.rest ? -it.d : it.tie ? { d: it.d, tie: true } : it.d));
export const totalOf = text => +parse(text).reduce((s, it) => s + it.d, 0).toFixed(6);

export function eventsOf(text) {
  const ev = [];
  let t = 0, tied = false;
  for (const it of parse(text)) {
    if (!it.rest) {
      if (tied) ev[ev.length - 1].len += it.d;
      else ev.push({ t: +t.toFixed(6), len: it.d });
      tied = it.tie;
    } else tied = false;
    t += it.d;
  }
  return ev.map(e => ({ t: e.t, len: +e.len.toFixed(6) }));
}

export const soundKey = text => eventsOf(text).map(e => `${e.t.toFixed(3)}:${e.len.toFixed(3)}`).join(' ');

// 소리 줄 — 붙임줄로 이은 음은 한 음(d = 이은 길이 × 박 × 0.8). 줄 길이 = 박 합 × 박(정확히)
export function rhythmLine(text, { beat = 0.5, inst = 'xylo', p = 72, vel = 0.7 } = {}) {
  const out = [], ev = eventsOf(text), total = totalOf(text);
  let t = 0;
  for (const [k, e] of ev.entries()) {
    if (e.t > t + EPS) out.push({ p: null, d: (e.t - t) * beat, gap: 0 });
    const next = k + 1 < ev.length ? ev[k + 1].t : total;
    const slot = (next - e.t) * beat, d = Math.max(0.06, Math.min(slot, e.len * beat * 0.8));
    out.push({ p, d, gap: slot - d, vel, inst });
    t = next;
  }
  if (!ev.length) out.push({ p: null, d: total * beat, gap: 0 });
  return out;
}

// 카드 글에 든 낱말(붙임줄은 '~'로 셈) — 봇 · 덧검사용
export const wordsOf = text => String(text).trim().split(/\s+/).flatMap(w => [...w.split('~'), ...(w.includes('~') ? ['~'] : [])]);
// 그림에 그려지는 기호 수(음표 + 쉼표)
export const marksOf = text => parse(text).length;
// 두 카드 글이 다른 정도 — 낱말 줄의 편집 거리
export function wordDist(a, b) {
  const x = wordsOf(a), y = wordsOf(b), D = Array.from({ length: x.length + 1 }, (_, i) => [i, ...Array(y.length).fill(0)]);
  for (let j = 1; j <= y.length; j++) D[0][j] = j;
  for (let i = 1; i <= x.length; i++) for (let j = 1; j <= y.length; j++) D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
  return D[x.length][y.length];
}

// ── 리듬 카드 칸 틀(리8 · 리9) — 위치 단추 셋(첫째 · 둘째 · 셋째) · 판마다 그 판 카드 셋(_glyph.js 그림) ──
//  줄 = { stage, kind, set: [카드 글 셋], ans: 0|1|2 } · 뒤집기 = 답을 다음 카드로(소리만 바뀌고 카드 셋 · 자리는 그대로)
//  한 판 = 도막 둘: '준비'(하이햇 두 번 · 한 박씩 · 도막 뒤 쉼 0 — 박이 이어짐) → 네 박 리듬(실로폰 72) + 박 자리 작은 하이햇 넷
export const RB = 0.5, KEYS = ['a', 'b', 'c'], NTH = ['첫째', '둘째', '셋째'];
const hats = (n, vel) => Array.from({ length: n }, () => ({ drum: 'hat', d: 0.06, gap: RB - 0.06, vel }));
export function buildCard(row) {
  return [
    { lines: [hats(2, 0.35)], cap: '하나 둘', gap: 0 },
    { lines: [rhythmLine(row.set[row.ans], { beat: RB, inst: 'xylo', p: 72, vel: 0.7 }), hats(4, 0.22)], cap: '' },
  ];
}
export const flipCard = p => ({ ...p, ans: (p.ans + 1) % 3 });
export const ansKey = p => KEYS[p.ans];
