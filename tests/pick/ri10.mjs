// 리10 센박부터·여린박부터 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick')

// 도막 하나 · 큰북 셋(마디 첫 박마다 · m박 간격) · 그 밖의 박은 하이햇(nohat 판은 없음)
//  센박부터 = 가락의 첫 음이 둘째 큰북과 같은 때 · 여린박부터 = 첫 큰북과 둘째 큰북 사이 · 끝 음은 셋째 큰북과 같은 때
const E = 1e-3;
export function right(row, ns, { mod }) {
  if (ns.length !== 1) return false;
  const a = ns[0], kicks = a.filter(n => n.drum === 'kick').map(n => n.t), hats = a.filter(n => n.drum === 'hat'), mel = a.filter(n => n.p != null);
  if (kicks.length !== 3 || a.some(n => n.drum && !['kick', 'hat'].includes(n.drum)) || !mel.length) return false;
  const bar = row.m * mod.BEAT;
  if (Math.abs(kicks[0]) > E || Math.abs(kicks[1] - bar) > E || Math.abs(kicks[2] - 2 * bar) > E) return false;
  if (hats.length !== (row.kind === 'nohat' ? 0 : 2 * (row.m - 1))) return false;
  const first = mel[0].t, last = mel[mel.length - 1].t;
  if (Math.abs(last - kicks[2]) > E) return false;
  const full = Math.abs(first - kicks[1]) < E, pickup = first > kicks[0] + E && first < kicks[1] - E;
  if (!(full || pickup) || full !== (row.right === 'full')) return false;
  const vs = mel.map(n => n.vel), ps = mel.map(n => n.p);
  if (row.kind === 'loud') { if (vs[0] !== 0.9 || vs.slice(1).some(v => v !== 0.5)) return false; } else if (vs.some(v => v !== 0.6)) return false;
  if ((row.kind === 'high') !== (ps[0] === 72 && ps.slice(1).every(p => p < 72))) return false;
  if ((row.kind === 'two') !== (mel[0].d < mod.BEAT * 0.6)) return false;
  return true;
}
export const opts = () => ['full', 'pickup'];
export const norm = p => `${p.kind}:${p.m}`;

// 첫 음 크기 · 첫 음 높이만 듣는 봇(크거나 높으면 센박부터 · 그 밖에는 아무거나)
export const bots = ({ rr, notesOf }) => {
  const firstOf = p => notesOf(p)[0].find(n => n.p != null), any = o => o[Math.floor(rr() * o.length)];
  return [
    ['큰 첫 음', (k, p, o) => (firstOf(p).vel > 0.6 ? 'full' : any(o))],
    ['높은 첫 음', (k, p, o) => (firstOf(p).p >= 72 ? 'full' : any(o))],
    ['큰 첫 음 = 여린박', (k, p, o) => (firstOf(p).vel > 0.6 ? 'pickup' : any(o))],
  ];
};
// 두 꼴의 음 수 · 길이가 같음(음 수 · 길이로는 못 맞힘) · 거꾸로 적힌 답을 잡음 · 비틀기는 한 판에 하나 · 두 답이 모두 비틀기에 있음
export function extra({ mod, spec: S, notesOf, assert }) {
  const { PLAN, SHUF } = mod, mel = q => notesOf(q)[0].filter(n => n.p != null);
  for (const p of PLAN) {
    const q = SHUF.flip(p);
    assert.equal(mel(p).length, mel(q).length, '리10 두 꼴 음 수 같음: ' + JSON.stringify(p));
    assert.equal(S.OPEN(p), S.OPEN(q), '리10 두 꼴 길이 같음');
    assert.ok(!right(q, notesOf(p), { mod }), '리10 거꾸로 적힌 답: ' + JSON.stringify(p));
  }
  const kinds = PLAN.map(p => `${p.kind}:${p.right}`);
  for (const k of ['loud:full', 'loud:pickup', 'plain:full', 'plain:pickup']) assert.ok(kinds.includes(k), '리10 원판에 ' + k);
  assert.ok(PLAN.filter(p => p.stage === 'intro').every(p => p.kind === 'plain' && p.m === 4), '리10 소개 = 4박 마디 기본');
  assert.ok(PLAN.filter(p => p.stage === 'twist').every(p => ['loud', 'nohat', 'high'].includes(p.kind)), '리10 비틀기는 한 가지씩');
  assert.ok(PLAN.some(p => p.m === 3) && PLAN.some(p => p.kind === 'two'), '리10 세 박 마디 · 여린박 둘');
  for (const t of S.items.map(it => it.label)) assert.ok(/센박부터|여린박부터/.test(t), '리10 단추 글: ' + t);
}
