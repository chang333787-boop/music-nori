// 앞 판 기억 봇(F5) — 고르기 칸 시험이 같이 씀(tests/pick.test.mjs · tests/cells.test.mjs)
//  판마다 맞음 · 틀림을 알려 주므로 소리를 듣지 않아도 앞 판까지의 답은 안다. 듣지 않고 그것만으로 누르는 봇 셋(첫 판은 셋 다 찍기):
//   앞 판 답 또 — 앞 판 답을 또 누름 · 앞 판 답 피하기 — 앞 판 답만 빼고 찍기
//   둘씩 — 앞 판 답이 한 번이면 또 · 두 번 이어졌으면 그것만 빼고 찍기('같은 답 세 번 X'를 아는 봇)
//  봇 = (k 판 차례, p 문항, o 지금 누를 수 있는 답, plan 판 전체) → 누를 답. ansOf = 문항 → 답 · rp = 봇이 찍을 때 쓰는 무작위
//  (따로 무작위 — 시험의 다른 봇이 찍는 차례를 흔들지 않게) · 틀은 cellkit memoryOdds · stageShuffle chance
export function memoBots(ansOf, rp) {
  const pick = o => o[Math.floor(rp() * o.length)];
  const prev = (k, plan) => (k ? ansOf(plan[k - 1]) : null);
  const runOf = (k, plan) => { let L = 1; while (L < k && ansOf(plan[k - 1 - L]) === ansOf(plan[k - 1])) L++; return L; };
  const avoid = (o, v) => { const rest = o.filter(x => x !== v); return pick(rest.length ? rest : o); };
  const again = (o, v) => (o.includes(v) ? v : pick(o));
  return [
    ['앞 판 답 또', (k, p, o, plan) => (k ? again(o, prev(k, plan)) : pick(o))],
    ['앞 판 답 피하기', (k, p, o, plan) => (k ? avoid(o, prev(k, plan)) : pick(o))],
    ['둘씩', (k, p, o, plan) => (!k ? pick(o) : runOf(k, plan) >= 2 ? avoid(o, prev(k, plan)) : again(o, prev(k, plan)))],
  ];
}
