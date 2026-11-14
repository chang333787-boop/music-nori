// 계열 · 난이도 — 공부 흐름(engine/flow.js)의 단계마다 '아이가 한꺼번에 해내야 하는 일'을 여섯 가지로 따져 매긴 것.
//  화면 · 소리 없음(node로 시험). 선생님 '찾아 쓰기' 화면과 docs/flow.md 표만 읽는다 — 아이 화면에는 쓰지 않고, 아무것도 잠그지 않는다.
//
//  ⚠ 앱이 스스로 따져 본 것이다. 연구나 아이들 자료로 확인한 것이 아니다.
//   · 연구가 있는 곳(flow.js의 CLUSTERS · 단계의 근거)은 연구를 따른다. 이 표는 연구가 말해 주지 않는 곳 — 덩어리 안의 앞뒤, 요소가 다른 단계끼리의 앞뒤 — 을 채운다.
//   · 점수는 '교실에서 그 단계를 처음 배울 때 하는 일'에 매겼다(앱의 칸 하나가 아니라 단계).
//   · 합계가 경계(3·4, 6·7, 9·10, 12·13)에 걸린 단계는 한 점 차이로 난이도가 갈린다. 난이도는 어림이다.
//  까닭과 고친 내력은 docs/flow.md 「계열 · 난이도」.
import { ELEMENTS, stepById } from './flow.js';

// 여섯 가지 — 점수마다 '이 정도면 이 점수'를 적어 둔다(매길 때 기준 · 화면에도 보인다)
export const FACTORS = [
  { id: 'hear', name: '귀', full: '듣고 가리기',
    at: ['듣고 가릴 것이 없음', '크게 다른 두 소리', '한 가지 성질만 다른 소리, 또는 셋 넘는 가운데 고르기', '작은 차이, 또는 다른 것이 함께 바뀌는 가운데서 가리기'] },
  { id: 'mem', name: '기억', full: '기억해 둘 것',
    at: ['지금 나는 소리만', '소리 한둘을 견줌', '한 도막(서너 음 ~ 한 마디)을 기억', '여러 도막 · 곡의 짜임을 기억'] },
  { id: 'sign', name: '기호', full: '읽을 기호',
    at: ['기호 없음', '그림이나 글자 한 가지', '오선의 자리, 또는 기호 두세 가지', '여러 기호를 함께 읽고 규칙을 따짐'] },
  { id: 'body', name: '몸', full: '몸으로 맞추기',
    at: ['고르기만', '박에 맞춰 한 가지', '리듬꼴을 따라 침', '엇박 · 바뀌는 박 · 두 손 가운데 하나'] },
  { id: 'word', name: '낱말', full: '새 낱말',
    at: ['평소에 쓰는 말', '우리말 음악 낱말', '외국어 낱말 · 글자, 또는 낱말 넷 넘게'] },
  { id: 'multi', name: '한꺼번에', full: '한꺼번에 볼 것',
    at: ['한 가지만', '두 가지를 함께', '셋 넘게 함께, 또는 섞인 데서 하나를 떼어 냄'] },
];
export const MAX_SUM = FACTORS.reduce((n, f) => n + f.at.length - 1, 0);

// 합계 → 난이도 1~5
export const levelOfSum = sum => (sum <= 3 ? 1 : sum <= 6 ? 2 : sum <= 9 ? 3 : sum <= 12 ? 4 : 5);
export const LEVEL_WORD = ['', '가장 쉬움', '쉬움', '보통', '어려움', '가장 어려움'];

// L(귀, 기억, 기호, 몸, 낱말, 한꺼번에, [먼저 하면 좋은 단계])
const L = (hear, mem, sign, body, word, multi, needs = []) => ({ f: [hear, mem, sign, body, word, multi], needs });

export const LOAD = {
  // 박·박자
  b1: L(1, 0, 0, 1, 0, 0),
  b2: L(3, 2, 0, 1, 1, 1, ['b1', 'd1']),            // 센박은 '조금 더 센 소리' — 크게·작게를 먼저. 묶음은 여러 박을 들어야 보인다
  b3: L(2, 1, 2, 1, 2, 1, ['b2']),
  b4: L(1, 2, 3, 0, 1, 2, ['b3', 'r2', 'r3', 'r4']),
  b5: L(2, 2, 2, 2, 1, 2, ['b3', 'r3', 'j1']),      // 한 박을 셋으로 — 자진모리에서 먼저 겪는다
  b6: L(2, 2, 3, 1, 1, 2, ['b4']),
  b7: L(3, 2, 3, 3, 1, 2, ['b4']),
  // 리듬·음의 길이
  r1: L(1, 1, 0, 0, 0, 0),
  r2: L(1, 1, 1, 2, 1, 0, ['b1', 'r1']),
  r3: L(2, 1, 1, 2, 1, 1, ['r2']),
  r4: L(1, 2, 1, 2, 1, 0, ['r2']),
  r5: L(2, 2, 2, 2, 0, 2, ['r3', 'r4']),
  r6: L(2, 2, 2, 2, 1, 2, ['r3', 'r4']),
  r7: L(2, 2, 2, 2, 1, 1, ['r4', 'b3']),
  r8: L(3, 2, 2, 3, 1, 2, ['r6', 'r7', 'b2']),
  r9: L(3, 2, 2, 3, 2, 1, ['r3']),
  r10: L(1, 1, 1, 1, 2, 0, ['r2']),
  // 장단
  j1: L(2, 2, 1, 2, 1, 1, ['b1']),
  j2: L(2, 2, 1, 2, 1, 1, ['b1']),
  j3: L(3, 2, 1, 3, 2, 1, ['j1']),
  j4: L(3, 2, 1, 3, 2, 1, ['j1']),
  // 가락·음높이
  m1: L(1, 1, 0, 0, 1, 0),                          // '높다 · 낮다'는 소리에 붙이는 약속된 말이라 낱말 1
  m2: L(2, 1, 0, 0, 1, 2, ['m1', 'd1', 'r1']),      // 높이 · 길이 · 크기 가운데 무엇이 바뀌었는지 — 셋을 다 알아야 한다
  m3: L(2, 2, 1, 0, 1, 0, ['m1']),
  m4: L(2, 2, 1, 0, 1, 1, ['m3']),
  m5: L(3, 2, 1, 0, 1, 1, ['m4']),
  m6: L(3, 3, 1, 0, 1, 1, ['m5']),
  m7: L(3, 3, 2, 0, 2, 1, ['m6']),
  m8: L(1, 2, 3, 0, 2, 2, ['s3', 'm6']),
  m9: L(3, 3, 3, 0, 2, 2, ['m7', 's6']),
  // 셈여림
  d1: L(1, 1, 0, 0, 0, 0),
  d2: L(1, 1, 1, 0, 2, 0, ['d1']),
  d3: L(3, 1, 1, 0, 2, 0, ['d2']),                  // 가운데 세기는 작은 차이를 귀로 가려야 한다
  d4: L(2, 2, 1, 0, 1, 0, ['d2']),
  d5: L(2, 1, 1, 0, 2, 0, ['d2']),
  d6: L(2, 1, 1, 0, 1, 1, ['d2']),
  // 빠르기
  t1: L(1, 1, 0, 0, 0, 0),
  t2: L(2, 1, 0, 0, 1, 2, ['t1', 'd1', 'r1']),
  t3: L(3, 1, 1, 0, 2, 0, ['t1']),                  // 사이 빠르기 여럿을 가리는 일 — 가운데 세기와 같은 꼴
  t4: L(2, 2, 1, 0, 2, 0, ['t1']),
  t5: L(1, 1, 1, 0, 1, 0, ['b1', 'r1']),
  // 음색
  e1: L(1, 1, 0, 0, 0, 0),
  e2: L(2, 1, 0, 0, 1, 0, ['e1']),
  e3: L(2, 2, 0, 0, 1, 1, ['e1']),
  e4: L(3, 1, 0, 0, 2, 0, ['e2']),
  // 형식·되풀이
  f1: L(2, 2, 0, 0, 0, 0, ['m1', 'r1']),
  f2: L(2, 2, 0, 1, 1, 1, ['f1', 'b1']),
  f3: L(2, 3, 1, 0, 1, 1, ['f1']),
  f4: L(1, 2, 2, 0, 1, 1, ['f1', 'b3']),
  f5: L(1, 2, 3, 0, 1, 1, ['f4']),
  f6: L(3, 3, 1, 0, 1, 2, ['f3']),                  // 사이에 다른 도막이 끼어도 처음 도막이 돌아온 것을 알아채야 한다
  f7: L(3, 3, 1, 0, 2, 2, ['f2', 'f3']),
  f8: L(1, 3, 3, 0, 2, 2, ['f5']),
  // 화음·어울림
  h1: L(2, 1, 0, 0, 1, 2, ['e1', 'm1']),            // 함께 나는 소리를 둘로 듣기 — 음색과 높낮이를 가릴 수 있어야 한다
  h2: L(3, 2, 2, 0, 2, 2, ['h1', 'm7']),
  h3: L(3, 2, 3, 0, 2, 2, ['h2', 'm9']),
  // 악보 읽기
  s1: L(1, 1, 1, 0, 0, 1, ['r1', 'm1']),
  s2: L(1, 1, 2, 0, 1, 0, ['m1']),
  s3: L(0, 2, 3, 0, 2, 1, ['s2', 'm4']),
  s4: L(2, 2, 2, 0, 1, 1, ['d1', 't1', 's2']),
  s5: L(1, 2, 3, 0, 2, 2, ['s3']),
  s6: L(2, 2, 3, 0, 2, 2, ['s5', 'm7']),
};

const sumOf = id => LOAD[id].f.reduce((a, b) => a + b, 0);
const memo = new Map();
function lvOf(id, trail = []) {
  if (memo.has(id)) return memo.get(id);
  if (trail.includes(id)) throw new Error('먼저 할 것이 돌고 돈다: ' + [...trail, id].join(' → '));
  const lv = Math.max(levelOfSum(sumOf(id)), ...LOAD[id].needs.map(n => lvOf(n, [...trail, id])));
  memo.set(id, lv);
  return lv;
}

// 단계 하나의 난이도 — own = 그 단계만 본 것 · lv = 먼저 할 것까지 본 것(먼저 할 것보다 쉬울 수는 없다)
export function loadOf(id) {
  const d = LOAD[id];
  if (!d) return null;
  const sum = sumOf(id), own = levelOfSum(sum), lv = lvOf(id);
  const heavy = FACTORS.map((f, i) => ({ id: f.id, name: f.name, v: d.f[i], top: f.at.length - 1, text: f.at[d.f[i]] }))
    .filter(x => x.v >= 2).sort((a, b) => b.v / b.top - a.v / a.top || b.v - a.v).slice(0, 2);
  return { id, f: d.f, sum, own, lv, word: LEVEL_WORD[lv], needs: d.needs, heavy };
}

const ALL = ELEMENTS.flatMap((el, ei) => el.steps.map((step, si) => ({ id: step.id, el, step, ei, si })));
const key = x => { const l = loadOf(x.id); return [l.lv, l.sum, x.step.gr[0], x.ei, x.si]; };
const cmp = (a, b) => { const ka = key(a), kb = key(b); for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i]; return 0; };

// 온 단계를 한 줄로 — 먼저 할 것이 늘 앞에 오고, 그 안에서는 난이도 · 합계 · 학년 · 요소 차례
export function order() {
  const done = new Set(), out = [], left = [...ALL].sort(cmp);
  while (left.length) {
    const i = left.findIndex(x => LOAD[x.id].needs.every(n => done.has(n)));
    const [x] = left.splice(i, 1);
    done.add(x.id); out.push(x.id);
  }
  return out;
}

// 난이도 사다리 — 난이도마다 요소별 단계
export function ladder() {
  return [1, 2, 3, 4, 5].map(lv => ({
    lv, word: LEVEL_WORD[lv],
    els: ELEMENTS.map(el => ({ el, steps: el.steps.filter(s => loadOf(s.id).lv === lv) })).filter(x => x.steps.length),
  }));
}

// 요소 안 차례는 뒤인데 난이도는 앞 단계보다 낮은 단계 — '일찍 해도 되는 단계'
export function earlyOk() {
  const out = [];
  for (const el of ELEMENTS) {
    let top = 0, topStep = null;
    for (const s of el.steps) {
      const lv = loadOf(s.id).lv;
      if (lv < top) out.push({ el, step: s, lv, after: topStep, afterLv: top });
      if (lv > top) { top = lv; topStep = s; }
    }
  }
  return out;
}

// 교과서 · 교육과정의 학년 자리와 난이도가 어긋나는 곳
//  slow = 3학년이나 그 앞에 나오는데 난이도 4 이상(천천히) · soon = 4학년 뒤에 나오는데 난이도 2 이하(당겨 써도 됨)
export function gradeGaps() {
  const slow = [], soon = [];
  for (const x of ALL) {
    const lv = loadOf(x.id).lv, g0 = x.step.gr[0];
    if (g0 <= 3 && lv >= 4) slow.push(x);
    if (g0 >= 4 && lv <= 2) soon.push(x);
  }
  return { slow, soon };
}

// 칸 하나의 난이도 = 그 칸이 들어 있는 단계 가운데 가장 낮은 것(처음 만나는 자리)
export function cellLevel(cellId) {
  const lvs = ALL.filter(x => x.step.acts.includes('cell:' + cellId)).map(x => loadOf(x.id).lv);
  return lvs.length ? Math.min(...lvs) : null;
}

export const needNames = id => LOAD[id].needs.map(n => { const r = stepById(n); return { id: n, el: r.el, step: r.step }; });
