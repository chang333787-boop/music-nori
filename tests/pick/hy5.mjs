// 형5 느리게 다음 빠르게(긴자진) — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick')

// 기본박 = 쿵(장단 반주 판은 박 첫 칸의 덩 · 쿵) 시작 다섯 → 간격 넷
//  긴자진 = 앞 두 간격이 같고 · 뒤 두 간격이 같고 · 마지막 ÷ 첫 ≤ 0.8 / 그대로 = 넷이 모두 같음
//  + 비틀기가 그 판에만: 크게(뒤 셋 박 가락이 앞보다 셈) · 촘촘(뒤 셋 박 음이 박마다 셋) · 가락(뒤 셋 박 음 높이가 앞 동기와 다름) · 장단(기)
export function right(row, ns) {
  if (ns.length !== 1) return false;
  const all = ns[0], dr = all.filter(n => n.drum), mel = all.filter(n => n.inst === 'gayageum');
  const on = dr.filter(n => n.drum === 'kung' || n.drum === 'deong').map(n => n.t);
  if (on.length !== 5) return false;
  const iv = on.slice(1).map((t, k) => t - on[k]), eq = (a, b) => Math.abs(a - b) < 1e-3;
  const ans = iv.every(x => eq(x, iv[0])) ? 'same' : eq(iv[0], iv[1]) && eq(iv[2], iv[3]) && iv[3] / iv[0] <= 0.8 ? 'gin' : null;
  if (ans !== row.ans) return false;
  if ((row.kind === 'jang') !== dr.some(n => n.drum === 'roll')) return false;
  // 박마다 가락 음(뒤 셋 박 = 박 셋째 시작부터)
  const back = mel.filter(n => n.t >= on[2] - 1e-6), front = mel.filter(n => n.t < on[2] - 1e-6);
  const loud = Math.max(...back.map(n => n.vel)) > Math.max(...front.map(n => n.vel));
  const dense = back.length === 9 && front.length === 4;
  const newTune = back.some(n => ![67, 69, 72].includes(n.p));
  return loud === (row.kind === 'loud') && dense === (row.kind === 'dense') && newTune === (row.kind === 'tune' || row.kind === 'dense');
}
export const opts = () => ['gin', 'same'];
export const norm = p => `${p.kind}:${p.w}`;

// 뒤쪽이 달라진 판(커짐 · 촘촘 · 다른 가락)이면 긴자진을 누르는 봇 · 장단 반주가 들리면 긴자진
export const bots = ({ rr }) => [
  ['뒤가 달라지면 긴자진', (k, p) => (['loud', 'dense', 'tune'].includes(p.kind) ? 'gin' : rr() < 0.5 ? 'gin' : 'same')],
  ['장단이면 긴자진', (k, p) => (p.kind === 'jang' ? 'gin' : rr() < 0.5 ? 'gin' : 'same')],
];

export function extra({ mod, spec: S, notesOf, assert }) {
  const { PLAN, SHUF } = mod;
  // 긴자진 판과 그대로 판의 길이가 같다(폭마다) — 뒤집어도 · 가락 줄과 박 줄도 같은 길이
  for (const p of PLAN) for (const q of [p, SHUF.flip(p)]) {
    const lens = S.segs(q)[0].lines.map(ln => ln.reduce((t, n) => t + n.d + n.gap, 0));
    assert.ok(Math.abs(lens[0] - lens[1]) < 1e-6, '형5 박 줄 = 가락 줄 길이: ' + JSON.stringify(q));
  }
  // 폭마다 · 비틀기마다 두 답이 다 있다(원판)
  for (const w of ['big', 'small']) for (const a of ['gin', 'same']) assert.ok(PLAN.some(p => p.w === w && p.ans === a), `형5 원판에 ${w} ${a}`);
  for (const k of ['beat', 'jang', 'loud', 'dense']) for (const a of ['gin', 'same']) assert.ok(PLAN.some(p => p.kind === k && p.ans === a), `형5 원판에 ${k} ${a}`);
  // 소개는 기본박만(김유진 2018 — 반주가 단순할 때 빨라짐을 더 잘 알아챔)
  assert.ok(PLAN.slice(0, mod.CUTS[0]).every(p => p.kind === 'beat'), '형5 소개 = 기본박만');
  for (const p of PLAN) assert.ok(!right(SHUF.flip(p), notesOf(p)), '형5 거꾸로 적힌 답: ' + JSON.stringify(p));
  // 시조는 보기 카드로만 — 게임 판 · 연습 판에 없음
  assert.ok(PLAN.every(p => !p.sijo), '형5 시조는 게임 판에 없음');
  // 쓰지 않는 말(사실 장부 금지 목록) · 곡 이름
  const words = [mod.TIPS_TV.join(' '), mod.tipOf(PLAN, PLAN.map(() => false)), ...PLAN.map(S.wrongText), S.say.kid];
  for (const w of words) assert.ok(!/아리랑|칭칭이|학년|〈/.test(w), '형5 쓰지 않는 말: ' + w);
}
