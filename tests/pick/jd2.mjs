// 장2 굿거리일까 중중모리일까 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick')

// 답 = 실제로 나는 장구 소리: 굴림(roll)이 있으면 굿거리 · 없고 덕이 셋 이상이면 중중모리
//  + 열두 칸이 그 판의 빠르기(♩. = bpm · 칸 = 60 / bpm / 3)대로 놓였는지 · 센 곳(1 · 9번 칸)은 강세 없는 판에만 없음 · 가락 판만 가야금
export function right(row, ns) {
  if (ns.length !== 1) return false;
  const all = ns[0], dr = all.filter(n => n.drum), tune = all.filter(n => n.inst === 'gayageum');
  const ans = dr.some(n => n.drum === 'roll') ? 'gg' : dr.filter(n => n.drum === 'deok').length >= 3 ? 'jjm' : null;
  if (ans !== row.ans) return false;
  if ((row.kind === 'tune') !== (tune.length > 0) || all.length !== dr.length + tune.length) return false;
  // 덩(첫 칸)과 9번 칸 덕의 세기 — 센 곳이 있는 판은 다른 덕보다 셈
  const s = 60 / row.bpm / 3, at = k => dr.filter(n => Math.abs(n.t - k * s) < 1e-3 && n.drum !== 'gi');
  const d9 = at(8)[0], d3 = at(2)[0] || at(5)[0];
  if (!d9 || d9.drum !== 'deok' || !d3) return false;
  if ((row.kind === 'flat') !== (d9.vel === d3.vel)) return false;
  // 기는 덕보다 0.05초 앞(칸을 하나 더 쓰지 않음)
  for (const g of dr.filter(n => n.drum === 'gi')) if (!dr.some(n => n.drum === 'deok' && Math.abs(n.t - g.t - 0.05) < 1e-3)) return false;
  return true;
}
export const opts = () => ['gg', 'jjm'];
export const norm = p => `${p.kind}:${p.bpm}`;

// 빠르기를 보고 고르는 봇(빠르면 중중모리 · 느리면 굿거리 — 쓰면 안 되는 말 '중중모리가 더 빨라요'를 믿는 아이) · 가락이 들리면 굿거리
export const bots = ({ rr }) => [
  ['빠르면 중중모리', (k, p) => (p.bpm > 85 ? 'jjm' : p.bpm < 85 ? 'gg' : rr() < 0.5 ? 'gg' : 'jjm')],
  ['느리면 중중모리', (k, p) => (p.bpm < 85 ? 'jjm' : p.bpm > 85 ? 'gg' : rr() < 0.5 ? 'gg' : 'jjm')],
  ['가락 들리면 굿거리', (k, p) => (p.kind === 'tune' ? 'gg' : rr() < 0.5 ? 'gg' : 'jjm')],
];

export function extra({ mod, spec: S, notesOf, assert }) {
  const { PLAN, SHUF } = mod;
  // 빠르기마다 두 답이 다 있다(원판) · bpm은 80 · 85 · 90만
  for (const b of [80, 85, 90]) for (const a of ['gg', 'jjm']) assert.ok(PLAN.some(p => p.bpm === b && p.ans === a), `장2 원판에 ${b} ${a}`);
  assert.ok(PLAN.every(p => [80, 85, 90].includes(p.bpm)), '장2 bpm 80~90');
  // 꼴마다 두 답이 다 있다(강세 없음 · 가락 · 다는 꼴은 중중모리 쪽만 뜻이 있음)
  for (const k of ['plain', 'flat', 'tune']) for (const a of ['gg', 'jjm']) assert.ok(PLAN.some(p => p.kind === k && p.ans === a), `장2 원판에 ${k} ${a}`);
  // 한 장단 = 열두 칸 × 칸 길이(빠르기에서) — 뒤집어도
  for (const p of PLAN) for (const q of [p, SHUF.flip(p)]) {
    const len = S.segs(q)[0].lines.map(ln => ln.reduce((t, n) => t + n.d + n.gap, 0));
    for (const l of len) assert.ok(Math.abs(l - 12 * 60 / q.bpm / 3) < 1e-6, `장2 한 장단 길이 ${l}: ${JSON.stringify(q)}`);
  }
  // 소개 판은 모두 같은 빠르기(85) · 거꾸로 적힌 답을 검사가 잡음
  assert.ok(PLAN.slice(0, mod.CUTS[0]).every(p => p.bpm === 85 && p.kind === 'plain'), '장2 소개 = 85 · 그대로');
  for (const p of PLAN) assert.ok(!right(SHUF.flip(p), notesOf(p)), '장2 거꾸로 적힌 답: ' + JSON.stringify(p));
  // 다르게 골랐을 때 말 = 안전한 문장 3
  for (const p of PLAN) for (const q of [p, SHUF.flip(p)]) assert.ok(/더러러러가 있어요|덕이 많아요/.test(S.wrongText(q)), '장2 말: ' + S.wrongText(q));
  // 화면 글에 쓰지 않는 말(사실 장부 금지 목록)
  const words = [mod.TIPS_TV.join(' '), mod.tipOf(PLAN, PLAN.map(() => false)), ...PLAN.map(S.wrongText), S.say.kid];
  for (const w of words) assert.ok(!/12\/8|빨라요|느려요|궁채|열채|학년/.test(w), '장2 쓰지 않는 말: ' + w);
}
