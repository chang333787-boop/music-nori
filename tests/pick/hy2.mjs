// 형2 메기고 받기 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick')

// 도막 넷 · 받는 도막 둘은 가락(음 이름 · 때 · 길이)이 같고, 메기는 도막 둘은 서로도 받는 가락과도 다름
//  마지막 도막 = 답(받는 소리면 메·받·메·받, 메기는 소리면 받·메·받·메)
//  악기 하나 판은 네 도막 모두 같은 악기 하나 · 그 밖은 메기는 도막 = 악기 하나, 받는 도막 = 그 악기가 아닌 악기 둘(둘이 받는 판) · 셋이 같은 가락을 함께
//  받는 소리가 작은 판만 받는 음 둘을 더해도 메기는 음 하나보다 작음
export function right(row, ns) {
  if (ns.length !== 4) return false;
  const tuneOf = (seg, inst) => seg.filter(n => n.inst === inst).map(n => `${n.p % 12}:${n.t}:${n.d}`).join(' ');
  const info = ns.map(seg => {
    const insts = [...new Set(seg.map(n => n.inst))], tunes = [...new Set(insts.map(i => tuneOf(seg, i)))];
    return { insts: insts.slice().sort().join('+'), n: insts.length, tune: tunes.length === 1 ? tunes[0] : null, vel: Math.max(...seg.map(n => n.vel)) };
  });
  const [r1, r2] = (row.ans === 'resp' ? [1, 3] : [0, 2]).map(k => info[k]), [c1, c2] = (row.ans === 'resp' ? [0, 2] : [1, 3]).map(k => info[k]);
  if (info.some(x => x.tune == null)) return false;
  if (r1.tune !== r2.tune || r1.insts !== r2.insts || c1.tune === c2.tune || c1.tune === r1.tune || c2.tune === r1.tune) return false;
  if (c1.n !== 1 || c2.n !== 1 || c1.insts !== c2.insts) return false;
  const mono = r1.insts === c1.insts && r1.vel === c1.vel;
  const team = r1.n === (row.kind === 'two' ? 2 : 3) && !r1.insts.split('+').includes(c1.insts);
  return (row.kind === 'mono' ? mono : team) && (row.kind === 'soft') === (r1.vel * 2 < c1.vel);
}
export const opts = () => ['call', 'resp'];
export const norm = p => `${p.kind}:${p.m}`;

// 자리 · 길이 · 크기 · 악기 수로는 답을 못 맞힘 · 1~2학년 판은 '가락' 대신 '노래'
export function extra({ mod, spec: S, kitOf, notesOf, assert }) {
  const { PLAN, SHUF } = mod;
  // 모든 판(뒤집은 판도)의 소리 길이가 같다 → 열리는 때로는 못 맞힘
  assert.equal(new Set(PLAN.flatMap(p => [S.OPEN(p), S.OPEN(SHUF.flip(p))])).size, 1, '형2 모든 판 길이 같음');
  // 모든 도막 · 모든 줄의 길이가 같다(세 박) → 도막 길이로도 못 맞힘
  const lens = new Set(PLAN.flatMap(p => [p, SHUF.flip(p)]).flatMap(q => S.segs(q).flatMap(sg => sg.lines.map(ln => ln.reduce((t, n) => t + n.d + n.gap, 0).toFixed(4)))));
  assert.equal(lens.size, 1, '형2 도막 길이 같음: ' + [...lens]);
  // 악기 하나 판 · 받는 소리가 작은 판에 두 답이 모두 있다(그 꼴이라는 것만으로는 못 맞힘)
  const kinds = PLAN.map(p => `${p.kind}:${p.ans}`);
  for (const k of ['mono:call', 'mono:resp', 'soft:call', 'soft:resp', 'many:call', 'many:resp', 'two:call', 'two:resp']) assert.ok(kinds.includes(k), '형2 원판에 ' + k);
  // 비틀기는 한 판에 하나씩 — 악기 하나 판 · 받는 소리가 작은 판은 처음 여섯 판에 없음
  assert.ok(PLAN.slice(0, 6).every(p => p.kind === 'many' || p.kind === 'two') && PLAN.slice(0, 3).every(p => p.kind === 'many'), '형2 차례: 혼자 ↔ 셋이 → 둘이 → 비틀기');
  // 도막 아래 이름은 자리만(마지막을 묻는다는 것이 보임) · 틀렸을 때 말에 답이 들어 있음
  for (const p of PLAN) for (const q of [p, SHUF.flip(p)]) assert.ok(S.wrongText(q).endsWith(q.ans === 'call' ? '메기는 소리' : '받는 소리'), '형2 다르게 골랐을 때 말: ' + S.wrongText(q));
  // 검사(right)가 거꾸로 적힌 답을 잡는다
  for (const p of PLAN) assert.ok(!right(SHUF.flip(p), notesOf(p)), '형2 거꾸로 적힌 답: ' + JSON.stringify(p));
  const low = mod.tvsSpec({ tell() {}, say() {} }, kitOf('low'));
  assert.deepEqual(low.items.map(it => it.label), ['메기는 소리', '받는 소리'], '형2 단추 글');
  for (const p of PLAN.filter(q => q.kind === 'mono')) {
    assert.ok(/노래/.test(low.wrongText(p)) && !/가락/.test(low.wrongText(p)), "형2 1~2학년 '노래': " + low.wrongText(p));
    assert.ok(/가락/.test(S.wrongText(p)), "형2 3학년부터 '가락'");
    assert.ok(low.segs(p).every(sg => /노래$/.test(sg.cap)) && S.segs(p).every(sg => /가락$/.test(sg.cap)), '형2 도막 아래 말');
  }
}
