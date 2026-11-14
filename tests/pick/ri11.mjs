// 리11 들은 리듬 찾기 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 판마다 다른 카드 · 장부 frame: 'pick')

// 리듬꼴 글 → 8분 칸 여덟(A 소리 시작 · S 이어짐 · R 쉼) — 칸 파일의 표를 믿지 않고 여기서 따로 셈
const SLOT = { q: 'AS', r: 'RR', e: 'AA', h: 'ASSS' };
const gridOf = s => s.split(' ').map(t => SLOT[t]).join('');
const onsets = g => [...g].map((c, i) => (c === 'A' ? i : -1)).filter(i => i >= 0).join();
const ham = (a, b) => [...a].filter((c, i) => c !== b[i]).length;

// 도막 둘: 준비(하이햇 COUNT번 · 박마다) + 한 마디(하이햇 넷 · 박마다 + 리듬 줄). 답 = 리듬 줄을 8분 칸으로 다시 적은 것이 그 카드와 같음
//  북 판(drum)은 작은북만 · 2분음표 X(북은 길이가 안 들림) / 리코더 판(rec)은 솔 한 높이 · 세 카드가 귀로 모두 갈려야 함(북 = 소리 시작 자리 · 리코더 = 시작 + 이어짐)
export function right(row, ns, { mod }) {
  if (ns.length !== 2) return false;
  const B = mod.BEAT, H = B / 2, [cnt, bar] = ns;
  if (cnt.length !== mod.COUNT || cnt.some((n, k) => n.drum !== 'hat' || Math.abs(n.t - k * B) > 1e-3)) return false;
  const hats = bar.filter(n => n.drum === 'hat'), rh = bar.filter(n => n.drum !== 'hat');
  if (hats.length !== 4 || hats.some((n, k) => Math.abs(n.t - k * B) > 1e-3)) return false;
  const g = Array(8).fill('R');
  for (const n of rh) {
    const at = Math.round(n.t / H), len = Math.round((n.d + mod.ART) / H);
    if (Math.abs(at * H - n.t) > 1e-3 || Math.abs(len * H - n.d - mod.ART) > 1e-3 || at + len > 8) return false;
    g[at] = 'A';
    for (let j = 1; j < len; j++) g[at + j] = 'S';
  }
  if (g.join('') !== gridOf(row.set[row.ans])) return false;
  if (row.snd === 'drum') { if (!rh.every(n => n.drum === 'snare') || row.set.some(s => s.includes('h'))) return false; }
  else if (row.snd !== 'rec' || !rh.every(n => n.inst === 'recorder' && n.p === 67)) return false;
  const key = s => (row.snd === 'drum' ? onsets(gridOf(s)) : gridOf(s));
  return new Set(row.set.map(key)).size === 3;
}
export const opts = () => ['a', 'b', 'c'];
export const norm = p => p.set.join('|');

// 듣지 않는 봇('지난 판과 다른 자리'는 넣지 않음 — 같은 답 세 번 X 규칙이 모든 셋 고르기 칸에 주는 치우침이라 칸 설계로 못 고침 · 보고에 따로) — 카드 모양(음 수 · 쉼 · 길이 · 자리 · 가운데 꼴 · 외톨이 꼴 · 닮은 둘) · 앞 판 기억(처음 보는 카드 · 지난 판 답 꼴 · 자리)
export const bots = ({ mod, rr }) => {
  const K = mod.KEYS, any = o => o[Math.floor(rr() * o.length)], among = (o, js) => (js.length ? K[js[Math.floor(rr() * js.length)]] : any(o));
  const most = f => (k, p, o) => { const v = p.set.map(f), m = Math.max(...v); return among(o, v.map((x, j) => (x === m ? j : -1)).filter(j => j >= 0)); };
  const least = f => most(s => -f(s));
  const cnt = (s, c) => [...gridOf(s)].filter(x => x === c).length;
  const firstOdd = s => { const i = s.split(' ').findIndex(t => t !== 'q'); return i < 0 ? 9 : i; };
  const dsum = (p, j) => p.set.reduce((a, s, i) => a + (i === j ? 0 : ham(gridOf(p.set[j]), gridOf(s))), 0);
  return [
    ['음 많은 카드', most(s => cnt(s, 'A'))],
    ['음 적은 카드', least(s => cnt(s, 'A'))],
    ['쉼 많은 카드', most(s => cnt(s, 'R'))],
    ['2분음표 카드', most(s => (s.includes('h') ? 1 : 0))],
    ['8분음표 카드', most(s => (s.includes('e') ? 1 : 0))],
    ['첫 박이 소리', most(s => (s[0] !== 'r' ? 1 : 0))],
    ['끝 박이 소리', most(s => (s.slice(-1) !== 'r' ? 1 : 0))],
    ['앞쪽이 다른 꼴', least(firstOdd)],
    ['뒤쪽이 다른 꼴', most(firstOdd)],
    ['가운데 꼴', (k, p, o) => { const v = [0, 1, 2].map(j => dsum(p, j)), m = Math.min(...v); return among(o, [0, 1, 2].filter(j => v[j] === m)); }],
    ['외톨이 꼴', (k, p, o) => { const v = [0, 1, 2].map(j => dsum(p, j)), m = Math.max(...v); return among(o, [0, 1, 2].filter(j => v[j] === m)); }],
    ['닮은 둘', (k, p, o) => {
      const pairs = [[0, 1], [0, 2], [1, 2]].map(([a, b]) => [a, b, ham(gridOf(p.set[a]), gridOf(p.set[b]))]), m = Math.min(...pairs.map(x => x[2]));
      return among(o, [...new Set(pairs.filter(x => x[2] === m).flatMap(x => [x[0], x[1]]))]);
    }],
    ['처음 보는 카드', (k, p, o, plan) => { const seen = new Set(plan.slice(0, k).flatMap(q => q.set)); return among(o, [0, 1, 2].filter(j => !seen.has(p.set[j]))); }],
    ['지난 판 답 꼴', (k, p, o, plan) => { const j = k ? p.set.indexOf(mod.heard(plan[k - 1])) : -1; return j >= 0 ? K[j] : any(o); }],
    ['지난 판 답 자리', (k, p, o, plan) => (k ? K[plan[k - 1].ans] : any(o))],
  ];
};

// 카드는 답과 상관없이 같다(뒤집어도) · 단계마다 쓰는 음표 · 한 판의 세 카드는 같은 음표를 자리만 바꾼 꼴(비틀기는 같은 네 박 다른 꼴) · 카드는 판마다 새것
export function extra({ mod, spec, assert, kitOf, notesOf }) {
  const { PLAN, SHUF, cards, KEYS, ORD } = mod;
  assert.deepEqual(spec.items.map(it => it.key), KEYS, '리11 단추 키');
  assert.deepEqual(spec.items.map(it => it.label), ORD, '리11 단추 글 = 첫째 · 둘째 · 셋째');
  const all = PLAN.flatMap(p => p.set);
  assert.equal(new Set(all).size, all.length, '리11 같은 카드가 두 판에 나오지 않음');
  const uses = st => new Set(PLAN.filter(p => p.stage === st).flatMap(p => p.set.join(' ').split(' ')));
  assert.deepEqual([...uses('intro')].sort(), ['q', 'r'], '리11 소개 = 4분음표 · 4분쉼표만');
  assert.ok(uses('grow').has('e') && !uses('grow').has('h'), '리11 발전 = 8분음표 둘(2분음표 X)');
  assert.ok(PLAN.filter(p => p.stage === 'twist').every(p => p.set.some(s => s.includes('h'))), '리11 비틀기 판마다 2분음표');
  assert.ok(PLAN.filter(p => p.stage === 'end').every(p => new Set(p.set.join(' ').split(' ')).size >= 3), '리11 마무리 = 섞인 리듬꼴(음표 셋 갈래 이상)');
  for (const p of PLAN) {
    assert.ok(p.set.every(s => gridOf(s).length === 8), '리11 카드마다 네 박: ' + p.set);
    assert.ok(p.ans !== p.alt && [p.ans, p.alt].every(j => j >= 0 && j < 3), '리11 ans · alt');
    assert.equal(p.snd, p.stage === 'intro' || p.stage === 'grow' ? 'drum' : 'rec', '리11 소개 · 발전 = 작은북 · 비틀기 · 마무리 = 리코더');
    // 같은 판 세 카드 — 소리 낸 음 수가 같음(음 많은 카드로 못 고름) · 소개 · 발전 · 마무리는 같은 음표를 자리만 바꿈
    const n = p.set.map(s => [...gridOf(s)].filter(c => c === 'A').length);
    if (p.stage !== 'twist') {
      assert.ok(n.every(x => x === n[0]), '리11 한 판 세 카드의 소리 수가 같음: ' + p.set);
      assert.ok(p.set.every(s => s.split(' ').sort().join() === p.set[0].split(' ').sort().join()), '리11 같은 음표를 자리만 바꿈: ' + p.set);
    }
    for (const q of [p, SHUF.flip(p)]) {
      for (const lo of [false, true]) {
        const cs = cards(q, lo);
        assert.deepEqual(cs.map(c => c.key), KEYS, '리11 카드 키');
        assert.deepEqual(cs, cards(p, lo), '리11 카드는 뒤집어도 같음(카드로 답이 안 샘): ' + JSON.stringify(p));
        assert.equal(new Set(cs.map(c => c.chip)).size, 3, '리11 카드 그림 셋이 서로 다름');
        if (lo) assert.ok(cs.every(c => /class="barchip"/.test(c.chip) && !/g-head|g-rest/.test(c.chip)), '리11 1~2학년 = 막대 그림(음표 그림 X)');
        else assert.ok(cs.every(c => /class="glyph"/.test(c.chip) && Number(c.chip.match(/data-beats="([^"]+)"/)[1]) === 4), '리11 3학년부터 = 리듬 악보(네 박)');
      }
    }
  }
  // 비틀기 — 같은 네 박에서 2분음표 · 4분음표 + 쉼 · 4분음표 둘처럼 소리 시작이 같은 두 카드가 있는 판(이어짐을 들어야 갈림)이 둘 이상
  const sameOnset = p => { const o = p.set.map(s => onsets(gridOf(s))); return new Set(o).size < 3; };
  assert.ok(PLAN.filter(p => p.stage === 'twist' && sameOnset(p)).length >= 2, '리11 비틀기 — 소리 시작이 같고 길이만 다른 카드');
  // 1~2학년 글
  const low = mod.tvsSpec({ tell() {}, say() {} }, kitOf('low'));
  assert.ok(/막대 그림/.test(low.say.kid) && !/리듬|음표/.test(low.say.kid), '리11 1~2학년 한 줄 말');
  // 틀린 갈래(판마다 kind)
  const r1 = PLAN.map(p => p.kind !== 'long');
  assert.ok(/2분음표/.test(mod.tipOf(PLAN, r1)), '리11 길이 갈래');
  const r2 = PLAN.map(p => p.kind !== 'rest');
  assert.ok(/4분쉼표가 몇째/.test(mod.tipOf(PLAN, r2)), '리11 쉬는 박 갈래');
  // 준비 박 + 한 마디 = 3.3초(모든 판 같음)
  for (const p of PLAN) { const [a, b] = notesOf(p); assert.equal(a.length, mod.COUNT); assert.ok(b.length >= 5); }
  assert.equal(new Set(PLAN.map(p => spec.OPEN(p))).size, 1, '리11 답 열림이 모든 판 같음');
}
