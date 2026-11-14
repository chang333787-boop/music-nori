// 리8 리듬 카드 찾기 ① — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 판마다 다른 카드 · 장부 frame: 'pick')
//  리9도 이 파일의 cardRight · cardBots · cardExtra를 그대로 씀(같은 카드 틀 · app/js/cells/_rcard.js)
import { eventsOf, soundKey, wordsOf, marksOf, wordDist, beatsOf, totalOf, RB } from '../../app/js/cells/_rcard.js';

// 답 = 둘째 도막 실로폰 음의 시작(박 단위) · 길이가 답 카드를 펼친 것과 같음 · 다른 두 카드와는 다름 · 준비 = 하이햇 두 박 · 박 하이햇 넷
export function cardRight(row, ns) {
  if (ns.length !== 2) return false;
  const [pre, main] = ns;
  if (pre.length !== 2 || pre.some((n, k) => n.drum !== 'hat' || Math.abs(n.t - k * RB) > 1e-3)) return false;
  const hat = main.filter(n => n.drum), mel = main.filter(n => !n.drum);
  if (hat.length !== 4 || hat.some((n, k) => n.drum !== 'hat' || Math.abs(n.t - k * RB) > 1e-3)) return false;
  if (mel.some(n => n.inst !== 'xylo' || n.p !== 72)) return false;
  const on = mel.map(n => +(n.t / RB).toFixed(3)), want = eventsOf(row.set[row.ans]);
  if (on.length !== want.length || on.some((t, k) => Math.abs(t - want[k].t) > 1e-3)) return false;
  // 붙임줄로 이은 음 = 이은 길이만큼 길게(d ≥ 길이 × 0.8 × 박 − 0.01) · 음끼리 겹치지 않음
  if (mel.some((n, k) => n.d < Math.min(want[k].len * 0.8 * RB, (k + 1 < want.length ? want[k + 1].t : 4) * RB - n.t) - 0.01)) return false;
  if (mel.some((n, k) => k + 1 < mel.length && n.t + n.d > mel[k + 1].t + 1e-6)) return false;
  const mine = soundKey(row.set[row.ans]);
  return row.set.every((t, k) => k === row.ans || soundKey(t) !== mine);
}
export const right = (row, ns) => cardRight(row, ns);
export const opts = () => ['a', 'b', 'c'];
export const norm = p => p.set.join('|');

// 카드 꼴 봇(설계서 §0) — 그림만 보고 고름: 새 꼴이 든 카드(그 판 새 꼴이 든 카드 중 첫째) · 기호가 가장 많은 카드 · 나머지 둘과 가장 다른 카드
const K3 = ['a', 'b', 'c'];
const argmax = xs => xs.indexOf(Math.max(...xs));
export const cardBots = ({ mod, rr }) => [
  ['새 꼴 카드', p => { const nw = mod.NEW[p.kind] || [], k = p.set.findIndex(t => wordsOf(t).some(w => nw.includes(w))); return k < 0 ? K3[Math.floor(rr() * 3)] : K3[k]; }],
  ['기호 많은 카드', p => K3[argmax(p.set.map(marksOf))]],
  ['홀로 다른 카드', p => K3[argmax(p.set.map((t, k) => p.set.reduce((s, u, j) => s + (j === k ? 0 : wordDist(t, u)), 0)))]],
];
export const bots = ctx => cardBots(ctx).map(([n, f]) => [n, (k, p) => f(p)]);

// 카드 셋: 뒤집어도 같음 · 키 = a b c · 판마다 소리가 모두 다름 · 모두 네 박 · 그림 박 합 = 네 박 · 답 a · b · c 고르게
export function cardExtra({ id, mod, spec, assert }) {
  const { PLAN, SHUF, cards } = mod;
  assert.deepEqual(spec.items.map(it => it.key), K3, id + ' 단추 키');
  for (const p of PLAN) {
    assert.equal(new Set(p.set.map(soundKey)).size, 3, `${id} 한 판 카드 셋의 소리가 모두 다름: ${p.set.join(' / ')}`);
    for (const t of p.set) {
      assert.equal(totalOf(t), 4, `${id} 카드 네 박: ${t}`);
      const svg = glyphOf(cards(p), t, p);
      assert.ok(svg && Number(svg.match(/data-beats="([^"]+)"/)[1]) === 4, `${id} 그림 박 합 4: ${t}`);
    }
    const q = SHUF.flip(p);
    assert.deepEqual(cards(q), cards(p), `${id} 카드는 뒤집어도 같음: ${p.set.join(' / ')}`);
    assert.deepEqual(q.set, p.set, `${id} 뒤집으면 답만 바뀜`);
    assert.notEqual(q.ans, p.ans);
  }
  for (const v of [0, 1, 2]) assert.equal(PLAN.filter(p => p.ans === v).length, 4, `${id} 답 ${K3[v]} 4판`);
  assert.ok(beatsOf('q~q q q').some(b => typeof b === 'object' && b.tie), id + ' 붙임줄은 그림에 tie');
}
const glyphOf = (cs, t, p) => cs[p.set.indexOf(t)].chip;
export const extra = ctx => cardExtra(ctx);
