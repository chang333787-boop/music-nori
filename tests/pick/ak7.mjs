// 악7 들은 가락 악보 찾기 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 판마다 다른 카드 · 장부 frame: 'pick')
import { staffPos } from '../../app/js/notation.js';

const melOf = s => s.split(' ').map(t => { const [p, b] = t.split(':'); return [Number(p), b ? Number(b) : 1]; });
// 음 사이 움직임(오선 자리 차) · 길이 줄
const moves = s => { const m = melOf(s); return m.slice(1).map(([p], k) => staffPos(p) - staffPos(m[k][0])); };
const lens = s => melOf(s).map(([, b]) => b).join();
const sgn = x => Math.sign(x);

// 도막 하나 · 리코더 · 쉼 없이 이어짐. 답 = 음 시각 · 길이에서 다시 적은 가락이 그 카드와 같음
//  세 카드: 박 수가 같음 · 귀로 모두 갈림(움직임 줄 또는 길이 줄이 다름 — 첫 음 높이를 몰라도) · 오선 판은 첫 음 · 길이가 같고 자리 0 ~ 8(덧줄 X)
export function right(row, ns, { mod }) {
  if (ns.length !== 1) return false;
  const B = mod.BEAT, a = ns[0];
  if (!a.every(n => n.inst === 'recorder' && !n.drum)) return false;
  let t = 0;
  const got = [];
  for (const n of a) {
    if (Math.abs(n.t - t) > 1e-3) return false;                       // 쉼 없이 이어짐
    const b = Math.round((n.d + mod.ART) / B * 2) / 2;
    if (Math.abs(b * B - n.d - mod.ART) > 1e-3) return false;
    got.push(`${n.p}${b === 1 ? '' : ':' + b}`);
    t += b * B;
  }
  if (got.join(' ') !== row.set[row.ans]) return false;
  const total = s => melOf(s).reduce((x, [, b]) => x + b, 0);
  if (new Set(row.set.map(total)).size !== 1) return false;
  if (new Set(row.set.map(s => moves(s).join() + '|' + lens(s))).size !== 3) return false;
  if (row.view === 'staff') {
    if (new Set(row.set.map(s => melOf(s)[0][0])).size !== 1 || new Set(row.set.map(lens)).size !== 1) return false;
    if (!row.set.every(s => melOf(s).every(([p]) => staffPos(p) >= 0 && staffPos(p) <= 8))) return false;
  } else if (!row.set.every(s => melOf(s).every(([p]) => [64, 67, 69].includes(p)))) return false;
  return true;
}
export const opts = () => ['a', 'b', 'c'];
export const norm = p => p.set.join('|');

// 듣지 않는 봇('지난 판과 다른 자리'는 넣지 않음 — 같은 답 세 번 X 규칙이 모든 셋 고르기 칸에 주는 치우침이라 칸 설계로 못 고침 · 보고에 따로) — 카드 모양(가장 높은 · 낮은 음 · 올라가는 · 내려가는 꼴 · 긴 음 자리 · 줄 음 · 움직임 크기 · 가운데 꼴 · 외톨이 꼴 · 닮은 둘) · 앞 판 기억
export const bots = ({ mod, rr }) => {
  const K = mod.KEYS, any = o => o[Math.floor(rr() * o.length)], among = (o, js) => (js.length ? K[js[Math.floor(rr() * js.length)]] : any(o));
  const most = f => (k, p, o) => { const v = p.set.map(f), m = Math.max(...v); return among(o, v.map((x, j) => (x === m ? j : -1)).filter(j => j >= 0)); };
  const least = f => most(s => -f(s));
  const pos = s => melOf(s).map(([p]) => staffPos(p));
  const longAt = s => melOf(s).findIndex(([, b]) => b >= 2);
  // 견줌 거리 — 움직임 방향 · 크기 · 길이 줄이 자리마다 다른 수
  const dist = (x, y) => { const a = moves(x), b = moves(y), la = melOf(x).map(m => m[1]), lb = melOf(y).map(m => m[1]); return a.filter((v, i) => v !== b[i]).length + la.filter((v, i) => v !== lb[i]).length; };
  const dsum = (p, j) => p.set.reduce((acc, s, i) => acc + (i === j ? 0 : dist(p.set[j], s)), 0);
  return [
    ['가장 높은 음', most(s => Math.max(...pos(s)))],
    ['가장 낮은 음', least(s => Math.min(...pos(s)))],
    ['올라가는 꼴', most(s => { const q = pos(s); return q[q.length - 1] - q[0]; })],
    ['내려가는 꼴', least(s => { const q = pos(s); return q[q.length - 1] - q[0]; })],
    ['위로 많이', most(s => moves(s).filter(x => x > 0).length)],
    ['그대로 많이', most(s => moves(s).filter(x => x === 0).length)],
    ['움직임 큰', most(s => moves(s).reduce((a, x) => a + Math.abs(x), 0))],
    ['움직임 작은', least(s => moves(s).reduce((a, x) => a + Math.abs(x), 0))],
    ['뛰어가기 많이', most(s => moves(s).filter(x => Math.abs(x) >= 2).length)],
    ['줄 음 많이', most(s => pos(s).filter(q => q % 2 === 0).length)],
    ['긴 음 앞', least(s => (longAt(s) < 0 ? 9 : longAt(s)))],
    ['긴 음 뒤', most(longAt)],
    ['첫 방향 위', most(s => sgn(moves(s)[0]))],
    ['가운데 꼴', (k, p, o) => { const v = [0, 1, 2].map(j => dsum(p, j)), m = Math.min(...v); return among(o, [0, 1, 2].filter(j => v[j] === m)); }],
    ['외톨이 꼴', (k, p, o) => { const v = [0, 1, 2].map(j => dsum(p, j)), m = Math.max(...v); return among(o, [0, 1, 2].filter(j => v[j] === m)); }],
    ['닮은 둘', (k, p, o) => {
      const pairs = [[0, 1], [0, 2], [1, 2]].map(([a, b]) => [a, b, dist(p.set[a], p.set[b])]), m = Math.min(...pairs.map(x => x[2]));
      return among(o, [...new Set(pairs.filter(x => x[2] === m).flatMap(x => [x[0], x[1]]))]);
    }],
    ['처음 보는 카드', (k, p, o, plan) => { const seen = new Set(plan.slice(0, k).flatMap(q => q.set)); return among(o, [0, 1, 2].filter(j => !seen.has(p.set[j]))); }],
    ['지난 판 답 꼴', (k, p, o, plan) => { const j = k ? p.set.indexOf(mod.heard(plan[k - 1])) : -1; return j >= 0 ? K[j] : any(o); }],
    ['지난 판 답 자리', (k, p, o, plan) => (k ? K[plan[k - 1].ans] : any(o))],
  ];
};

// 카드는 답과 상관없이 같다(뒤집어도) · 소개 · 발전 = 그림 악보 · 비틀기 · 마무리 = 오선(1~2학년 판은 그림) · 오선 카드는 덧줄 X · 카드는 판마다 새것
export function extra({ mod, spec, assert, kitOf }) {
  const { PLAN, SHUF, cards, KEYS, ORD } = mod;
  assert.deepEqual(spec.items.map(it => it.key), KEYS, '악7 단추 키');
  assert.deepEqual(spec.items.map(it => it.label), ORD, '악7 단추 글 = 첫째 · 둘째 · 셋째');
  const all = PLAN.flatMap(p => p.set);
  assert.equal(new Set(all).size, all.length, '악7 같은 카드가 두 판에 나오지 않음');
  for (const p of PLAN) {
    assert.equal(p.view, p.stage === 'intro' || p.stage === 'grow' ? 'pic' : 'staff', '악7 소개 · 발전 = 그림 악보 · 비틀기 · 마무리 = 오선');
    const n = melOf(p.set[0]).length;
    assert.ok(n >= 3 && n <= 5 && p.set.every(s => melOf(s).length === n), '악7 세~다섯 음 · 한 판 세 카드의 음 수가 같음: ' + p.set);
    // 한 판 세 카드의 움직임 방향이 자리마다 모두 다르거나(높낮이 판) · 길이 줄이 모두 다름(길이 판) — 어느 둘이 더 닮지 않게
    if (p.kind === 'shape') { const d = p.set.map(s => moves(s).map(sgn)); for (let i = 0; i < d[0].length; i++) assert.equal(new Set(d.map(x => x[i])).size, 3, '악7 높낮이 판 — 자리마다 방향이 셋 다 다름: ' + p.set); }
    if (p.kind === 'len') assert.equal(new Set(p.set.map(lens)).size, 3, '악7 길이 판 — 길이 줄 셋이 다름: ' + p.set);
    if (p.kind === 'step') { const d = p.set.map(moves); for (let i = 0; i < d[0].length; i++) assert.equal(new Set(d.map(x => x[i])).size, 3, '악7 오선 판 — 자리마다 움직임이 셋 다 다름: ' + p.set); }
    for (const q of [p, SHUF.flip(p)]) for (const lo of [false, true]) {
      const cs = cards(q, lo);
      assert.deepEqual(cs.map(c => c.key), KEYS, '악7 카드 키');
      assert.deepEqual(cs, cards(p, lo), '악7 카드는 뒤집어도 같음: ' + JSON.stringify(p));
      assert.equal(new Set(cs.map(c => c.chip)).size, 3, '악7 카드 그림 셋이 서로 다름');
      const staff = p.view === 'staff' && !lo;
      for (const [j, c] of cs.entries()) {
        assert.ok(staff ? /class="staffchip"/.test(c.chip) : /class="picchip"/.test(c.chip), `악7 카드 갈래(${lo ? '1~2학년' : '3학년~'} · ${p.view})`);
        assert.equal(c.chip.match(/data-pos="([^"]*)"/)[1], melOf(p.set[j]).map(([x]) => staffPos(x)).join(' '), '악7 카드 그림 자리 = 그 카드 가락');
        if (staff) assert.equal((c.chip.match(/class="sc-n"/g) || []).length, melOf(p.set[j]).length, '악7 오선 카드 음 머리 수');
      }
    }
  }
  assert.throws(() => mod.staffChip('60 64 67'), /덧줄/, '악7 오선 카드에 가온 도(덧줄) X');
  const low = mod.tvsSpec({ tell() {}, say() {} }, kitOf('low'));
  assert.ok(/막대 그림/.test(low.say.kid) && !/가락|악보/.test(low.say.kid), '악7 1~2학년 한 줄 말');
  const r1 = PLAN.map(p => p.view !== 'staff');
  assert.ok(/차례가기/.test(mod.tipOf(PLAN, r1)), '악7 차례가기 갈래');
  const r2 = PLAN.map(p => p.view !== 'pic');
  assert.ok(/막대 높이/.test(mod.tipOf(PLAN, r2)), '악7 그림 악보 갈래');
}
