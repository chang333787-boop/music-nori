// 반1 · 반2(마디 상자 카드 고르기)가 같이 쓰는 칸별 검사 — tests/pick/ban1.mjs · ban2.mjs가 부름(이 파일은 tests/pick/ 밖에 둔다: 그 폴더의 파일은 모두 칸 검사로 읽힘)
//  답 = 소리: 들리는 음을 두 박 창으로 잘라 동기(ROAD_MOT)를 알아내고, 그 차례가 답 카드 길을 펼친 것과 같고 다른 두 카드와는 다름
//  카드 꼴 봇(설계서 batchC §0): 새 꼴이 든 카드 · 기호가 가장 많은 카드 · 나머지 둘과 가장 다른 카드
import { ROAD_BEAT, ROAD_MOT, ROAD_CARDS, ROAD_KEYS, roadOrder, roadSymbols, roadTokens, roadSVG } from '../app/js/cells/_road.js';

const WIN = 2 * ROAD_BEAT;
const motOf = ns => {
  const key = ns.map(n => n.p).join(' ');
  const hit = Object.entries(ROAD_MOT).find(([, m]) => m.map(([p]) => p).join(' ') === key);
  return hit ? Number(hit[0]) : null;
};
// 들린 음 → 동기 차례(창마다 하나 · 창 안 음의 시작 자리도 동기 박과 같아야 함)
export function heardOrder(ns) {
  const wins = [];
  for (const n of ns) { const w = Math.floor(n.t / WIN + 1e-6); (wins[w] ||= []).push(n); }
  return [...wins].map((ws, w) => {
    if (!ws) return null;
    const m = motOf(ws);
    if (m == null) return null;
    let t = 0;
    const ok = ROAD_MOT[m].every(([, b], k) => { const good = Math.abs(ws[k].t - (w * WIN + t * ROAD_BEAT)) < 1e-3; t += b; return good; });
    return ok ? m : null;
  });
}
const lev = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};
const firstMax = vals => vals.indexOf(Math.max(...vals));

export function roadCheck(name) {
  const right = (row, ns) => {
    if (ns.length !== 1) return false;
    const got = heardOrder(ns[0]).join(' '), want = roadOrder(row.set[row.ans]).join(' ');
    return got === want && row.set.every((c, k) => k === row.ans || roadOrder(c).join(' ') !== got);
  };
  const opts = () => ROAD_KEYS;
  const norm = p => p.set.join(',');
  const bots = ({ mod }) => {
    // 단계마다 새로 나온 기호(앞 단계 카드에 없던 낱말)
    const seen = new Set(), fresh = {};
    for (const st of ['intro', 'grow', 'twist', 'end']) {
      const syms = new Set(mod.PLAN.filter(p => p.stage === st).flatMap(p => p.set.flatMap(c => roadSymbols(ROAD_CARDS[c]))));
      fresh[st] = new Set([...syms].filter(s => !seen.has(s)));
      for (const s of syms) seen.add(s);
    }
    return [
      ['새 꼴 카드', (k, p) => { const i = p.set.findIndex(c => roadSymbols(ROAD_CARDS[c]).some(s => fresh[p.stage].has(s))); return ROAD_KEYS[Math.max(0, i)]; }],
      ['기호 많은 카드', (k, p) => ROAD_KEYS[firstMax(p.set.map(c => roadSymbols(ROAD_CARDS[c]).length))]],
      ['홀로 다른 카드', (k, p) => { const t = p.set.map(c => roadTokens(ROAD_CARDS[c])); return ROAD_KEYS[firstMax(t.map((a, i) => t.reduce((s, b, j) => s + (i === j ? 0 : lev(a, b)), 0)))]; }],
      ['상자 많은 카드', (k, p) => ROAD_KEYS[firstMax(p.set.map(c => roadTokens(ROAD_CARDS[c]).filter(x => /^\d+$/.test(x)).length))]],
    ];
  };
  const extra = ({ mod, spec, notesOf, assert, kitOf }) => {
    const { PLAN, SHUF } = mod;
    for (const p of PLAN) {
      // 한 판의 카드 셋은 소리가 서로 다름 · 연주 차례는 늘 여섯 마디
      const orders = p.set.map(c => roadOrder(c).join(' '));
      assert.equal(new Set(orders).size, 3, `${name} 카드 셋 소리가 다름: ${p.set} → ${orders.join(' | ')}`);
      for (const o of orders) assert.equal(o.split(' ').length, 6, `${name} 여섯 마디: ${o}`);
      // 카드는 문제만 보고 정함 — 뒤집은 판도 같은 카드(카드로 답이 새지 않음)
      const q = SHUF.flip(p);
      assert.deepEqual(mod.tvsSpec({ tell() {}, say() {} }, kitOf('mid')).items.map(it => it.key), ROAD_KEYS, `${name} 단추 키`);
      assert.deepEqual(p.set, q.set, `${name} 뒤집어도 카드 그대로`);
      // 거꾸로 적힌 답은 잡힘
      assert.ok(!right(q, notesOf(p)), `${name} 다른 카드를 답으로 적으면 검사가 잡음: ${p.set}`);
      // 그림이 연주 차례를 품음(시험이 읽는 data-order = 펼친 차례)
      for (const c of p.set) assert.ok(roadSVG(ROAD_CARDS[c]).includes(`data-order="${roadOrder(c).join(' ')}"`), `${name} 카드 그림 ${c}`);
    }
    // 모든 판(뒤집은 판도) 소리 길이가 같다 — 3.6초 + 앞뒤
    assert.equal(new Set(PLAN.flatMap(p => [spec.OPEN(p), spec.OPEN(SHUF.flip(p))])).size, 1, `${name} 모든 판 길이 같음`);
    // 원판 답 자리 a · b · c 고르게(4 · 4 · 4)
    for (const k of [0, 1, 2]) assert.equal(PLAN.filter(p => p.ans === k).length, 4, `${name} 답 자리 ${ROAD_KEYS[k]} 넷`);
    // TV 막대 이름 · 1~2학년 단추 글
    const low = mod.tvsSpec({ tell() {}, say() {} }, kitOf('low'));
    assert.deepEqual(low.items.map(it => it.label), ['첫째', '둘째', '셋째'], `${name} 단추 글`);
    assert.equal(mod.TIPS_TV.length, 3, `${name} 틀린 갈래 셋`);
  };
  return { right, opts, norm, bots, extra };
}
