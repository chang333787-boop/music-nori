// 악7 들은 가락 악보 찾기 — 세~다섯 음 가락을 듣고 악보 카드 셋 가운데 같은 것을 고르는 칸(11-14 묶음 D6 · 흐름 s1 · s2 · 듣고 고르기 틀 '판마다 다른 카드')
//  보고 읽기(악1 그림 악보 · 악2 오선의 줄과 칸)를 소리와 잇는다 — 소리를 먼저 듣고, 그 소리를 적은 악보를 찾는다.
//  소리: 리코더(이어지는 소리 — 긴 음이 길게 들림) · 박 0.5초 · 음마다 끝에 0.07초 틈 · 소개 · 발전 · 비틀기 네 박(2초) · 마무리 여섯 박(3초)
//  카드: 판마다 셋 — 소개 · 발전 = 그림 악보(막대 높이 = 음 높이 · 막대 길이 = 소리 길이 · 높이는 그 판 세 카드에 같은 자로)
//   → 비틀기 · 마무리 = 오선(높은음자리표 · 첫째 줄 미 ~ 다섯째 줄 파 · 가온 도와 덧줄은 악3 몫이라 쓰지 않음)
//   비틀기 · 마무리의 세 카드는 첫 음 · 길이가 같고 둘째 음부터 달라진다 — 처음 음 높이를 몰라도 '올라가나 · 내려가나 · 바로 옆인가 · 건너뛰나'로 가림
//   한 판의 세 카드는 음 사이 움직임(올라감 · 내려감 · 그대로 / 차례가기 · 뛰어가기)이 자리마다 모두 달라, 어느 둘이 더 닮지 않는다(가운데 꼴로 못 고름)
//   그 가운데 하나가 들리고(ans) 섞을 때 다른 하나(alt)로 바뀐다 — 카드는 그대로 · 들리는 것만 바뀜(카드로 답이 새지 않음) · 같은 카드는 열두 판에 두 번 나오지 않음
//   남은 하나(늘 비켜 있는 카드)는 단계마다 첫째 · 둘째 · 셋째 자리에 한 번씩 · 모양은 카드 모양 봇(가장 높은 음 · 긴 음 자리 · 가운데 꼴 …)의 맞힘 몫이 가장 고르게 되도록 전수로 고름(tests/pick/ak7.mjs)
//  1~2학년 판은 모든 판을 그림 악보로(오선 · 계이름 X).
//  ⚠ 귀로 확인하지 못한 것: ① 미 → 파 · 시 → 도(반음 차례가기)가 아이 귀에 '바로 옆'으로 들리는지 ② 리코더 2초 가락을 한 번 듣고 네 음 차례를 기억하는지
//   ③ 1~2학년이 다섯 층 그림 악보(마무리)의 높이 차를 눈으로 가리는지
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js)
import { pickCell, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';
import { staffPos } from '../notation.js';

export const BEAT = 0.5, ART = 0.07;
export const KEYS = ['a', 'b', 'c'];
export const ORD = ['첫째', '둘째', '셋째'];
export const NAME = { 64: '미', 65: '파', 67: '솔', 69: '라', 71: '시', 72: '도', 74: '레', 76: '미', 77: '파' };
// 가락 글 '67 64 67:2'(음 높이:박 · 박이 없으면 1) → [[67, 1], [64, 1], [67, 2]]
export const melOf = s => s.split(' ').map(t => { const [p, b] = t.split(':'); return [Number(p), b ? Number(b) : 1]; });
export const namesOf = s => melOf(s).map(([p]) => NAME[p]).join(' ');
const VEL = 0.6, INST = 'recorder';

// 판 — set = 카드 셋(차례 = 단추 차례) · ans = 들리는 카드 · alt = 섞을 때 들리는 카드
//  view: pic(그림 악보) | staff(오선 — 1~2학년 판은 그림 · 틀린 갈래도 이 둘) · kind: shape 높낮이 모양이 다른 카드 · len 막대 길이가 다른 카드 · step 차례가기 · 뛰어가기가 다른 카드
const R = (stage, kind, view, set, ans, alt) => ({ stage, kind, view, set, ans, alt });
export const PLAN = [
  R('intro', 'shape', 'pic', ['69 67 64:2', '67 67 67:2', '64 67 69:2'], 0, 1),
  R('intro', 'shape', 'pic', ['64 67 67:2', '67 64 67:2', '67 67 64:2'], 1, 2),
  R('intro', 'shape', 'pic', ['64 64 67:2', '67 64 64:2', '64 67 64:2'], 2, 0),
  R('grow', 'len', 'pic', ['69 67 67:2', '69:2 67 67', '69 67:2 67'], 2, 0),
  R('grow', 'shape', 'pic', ['64 67 69 67', '69 67 67 69', '67 67 64 64'], 0, 1),
  R('grow', 'len', 'pic', ['69 69 67:2', '69:2 64 67', '64 69:2 69'], 1, 2),
  R('twist', 'step', 'staff', ['67 71 69 72', '67 69 71 72', '67 65 69 67'], 1, 2),
  R('twist', 'step', 'staff', ['64 65 64 67', '64 69 65 67', '64 67 71 69'], 2, 0),
  R('twist', 'step', 'staff', ['69 71 72 69', '69 72 71 69', '69 67 71 72'], 0, 1),
  R('end', 'step', 'staff', ['72 74 71 74 69:2', '72 69 72 74 71:2', '72 71 69 67 65:2'], 0, 1),
  R('end', 'step', 'staff', ['64 67 71 74 77:2', '64 65 67 69 71:2', '64 69 67 67 65:2'], 1, 2),
  R('end', 'step', 'staff', ['67 65 71 69 65:2', '67 69 71 67 72:2', '67 71 69 72 71:2'], 2, 0),
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: p => ({ ...p, ans: p.alt, alt: p.ans }), answerOf: p => KEYS[p.ans] };
export const heard = row => row.set[row.ans];

// 판 → 도막 하나(들은 가락)
const tune = s => melOf(s).map(([p, b]) => ({ p, d: b * BEAT - ART, gap: ART, vel: VEL, inst: INST }));
function build(row, lo) {
  return [{ lines: [tune(heard(row))], cap: lo ? '' : namesOf(heard(row)) }];
}

// ── 카드 그림(svg 글 · 화면 없이 만듦 — node 시험이 부름) ──
const INK = '#3B2A1E', TURTLE = '#2F6F4E', TINT = '#E0EDE5';
const f1 = v => +v.toFixed(1);
// 그림 악보 — 가로 = 박 · 세로 = 오선 자리(staffPos)를 그 판 카드들에 같은 자로(lo · hi) · 막대 = 음
export function picChip(s, lo, hi) {
  const mel = melOf(s), total = mel.reduce((a, [, b]) => a + b, 0), W = 196, sx = 180 / total;
  const y = p => (hi === lo ? 26 : 6 + ((hi - staffPos(p)) / (hi - lo)) * 40);
  const out = [`<rect x="1.5" y="1.5" width="${W - 3}" height="61" rx="10" fill="${TINT}"/>`];
  let t = 0;
  for (const [p, b] of mel) {
    out.push(`<rect class="pc-n" x="${f1(8 + t * sx + 2)}" y="${f1(y(p))}" width="${f1(b * sx - 4)}" height="12" rx="6" fill="${TURTLE}" stroke="${INK}" stroke-width="2.5"/>`);
    t += b;
  }
  return `<svg class="picchip" viewBox="0 0 ${W} 64" width="${W}" height="64" aria-hidden="true" data-pos="${mel.map(([p]) => staffPos(p)).join(' ')}">${out.join('')}</svg>`;
}
// 오선 카드 — 줄 다섯(줄 사이 10 · 첫째 줄 미 = 자리 0 · 다섯째 줄 파 = 8) · 높은음자리표(Noto Music 글자) · 4분음표(채운 머리) · 2분음표(빈 머리)
//  기둥은 셋째 줄(자리 4) 아래 음은 위로 · 그 위 음은 아래로 · 끝에 겹세로줄 · 덧줄 없음(자리 0 ~ 8만 — 벗어나면 오류)
export function staffChip(s) {
  const mel = melOf(s), total = mel.reduce((a, [, b]) => a + b, 0), W = 196, TOP = 14, LG = 10, bottom = TOP + 4 * LG;
  const yOf = q => bottom - q * (LG / 2), x0 = 48, step = (W - 14 - x0) / total;   /* 음 자리 = 박 칸 가운데 앞쪽(길이에 맞춰 고르게 벌림) */
  const out = [];
  for (let j = 0; j < 5; j++) out.push(`<line x1="2" x2="${W - 2}" y1="${TOP + j * LG}" y2="${TOP + j * LG}" stroke="${INK}" stroke-width="1.3"/>`);
  out.push(`<text x="3" y="${TOP + 33}" style="font-family:'Noto Music',serif;font-size:44px" fill="${INK}">\u{1D11E}</text>`);
  out.push(`<line x1="${W - 7}" x2="${W - 7}" y1="${TOP}" y2="${bottom}" stroke="${INK}" stroke-width="1.4"/>`, `<line x1="${W - 3}" x2="${W - 3}" y1="${TOP}" y2="${bottom}" stroke="${INK}" stroke-width="3"/>`);
  let t = 0;
  const pos = [];
  for (const [p, b] of mel) {
    const q = staffPos(p);
    if (q < 0 || q > 8) throw new Error(`악7 오선 카드: 덧줄 음 ${p}`);
    pos.push(q);
    const cx = f1(x0 + (t + 0.5) * step), cy = yOf(q), up = q < 4, hollow = b >= 2;
    out.push(`<ellipse class="sc-n" cx="${cx}" cy="${cy}" rx="6.6" ry="4.8" transform="rotate(-20 ${cx} ${cy})" fill="${hollow ? '#FFFFFF' : INK}" stroke="${INK}" stroke-width="${hollow ? 2.2 : 1.2}"/>`);
    const sx = f1(up ? cx + 5.6 : cx - 5.6);
    out.push(`<line x1="${sx}" x2="${sx}" y1="${cy}" y2="${up ? cy - 28 : cy + 28}" stroke="${INK}" stroke-width="1.6"/>`);
    t += b;
  }
  return `<svg class="staffchip" viewBox="0 0 ${W} 68" width="${Math.round(W * 64 / 68)}" height="64" aria-hidden="true" data-pos="${pos.join(' ')}">${out.join('')}</svg>`;
}
// 그 판 세 카드의 높이 자(그림 악보) — 가장 낮은 · 높은 오선 자리
const rangeOf = set => { const ps = set.flatMap(s => melOf(s).map(([p]) => staffPos(p))); return [Math.min(...ps), Math.max(...ps)]; };
const chipOf = (row, s, lo) => (row.view === 'staff' && !lo ? staffChip(s) : picChip(s, ...rangeOf(row.set)));
// 판의 카드 셋 — 답과 상관없이 그 판의 set으로만(뒤집어도 같음)
export const cards = (row, lo) => row.set.map((s, k) => ({ key: KEYS[k], label: ORD[k], chip: chipOf(row, s, lo), tv: ORD[k] }));

const wrong = (row, lo) => (lo ? `들은 노래는 ${ORD[row.ans]} 그림이에요` : `들은 가락은 ${ORD[row.ans]} 카드예요 — ${namesOf(heard(row))}`);

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례(그림 악보 판 여섯 · 오선 판 여섯 — 갈래마다 판이 셋 넘어야 갈래 말이 나오므로 높낮이 · 길이를 한 갈래로)
export const TIPS_TV = ['그림 악보 높이 · 길이', '차례가기 · 뛰어가기'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => p.view === 'pic'), text: '그림 악보의 막대 높이 · 길이를 소리와 맞출 때 헷갈린 적이 있어요. 소리가 올라가면 막대도 위로, 길게 이어지면 막대도 길어요.' },
    { n: miss(p => p.view === 'staff'), text: '바로 옆 소리로 가는지(차례가기), 건너뛰어 가는지(뛰어가기) 헷갈린 적이 있어요. 첫 소리는 같으니 둘째 소리부터 견줘요.' },
  ], '막대 높이 · 길이도, 차례가기와 뛰어가기도 듣고 같은 카드를 골랐어요.');
}
// 헷갈리는 두 소리 — 비틀기 첫 판의 두 카드(첫 음 · 끝 음이 같고 가운데 두 음 차례만 다름)
const one = s => build({ set: [s], ans: 0 }, false);
export const NEAR = [
  { label: '솔 라 시 도', low: '한 칸씩 올라가요', play: nearSegs(one('67 69 71 72')) },
  { label: '솔 시 라 도', low: '건너뛰고 내려와요', play: nearSegs(one('67 71 69 72')) },
];

const ASK = lo => (lo ? '들어요 — 들은 노래와 같은 그림은?' : '들어요 — 들은 가락과 같은 악보 카드는?');
const exPic = (title, sub, s) => ({ title, sub, chip: picChip(s, ...rangeOf([s])), row: { set: [s], ans: 0 } });
const exStaff = (title, sub, s) => ({ title, sub, chip: staffChip(s), row: { set: [s], ans: 0 } });
const cell = pickCell({
  friend: 'turtle',
  keys: KEYS,
  label: k => ORD[KEYS.indexOf(k)],
  cards,
  rightOf: row => KEYS[row.ans],
  build,
  names: (row, lo) => [lo ? '들은 노래' : '들은 가락'],
  say: {
    show: lo => (lo ? '노래를 듣고 같은 막대 그림을 찾아요. 눌러서 들어 봐요.' : '가락을 듣고 같은 악보 카드를 찾아요. 눌러서 들어 봐요.'),
    follow: ASK,
    game: ASK,
    kid: lo => (lo ? 'TV 소리를 듣고 — 같은 막대 그림 카드를 골라요' : 'TV 소리를 듣고 — 들은 가락과 같은 악보 카드를 골라요'),
  },
  wrong,
  EX: lo => (lo ? [
    exPic('올라가는 노래', '막대가 위로 가요', '64 67 69:2'),
    exPic('내려가는 노래', '막대가 아래로 가요', '69 67 64:2'),
    exPic('길고 짧게', '긴 막대는 긴 소리', '69:2 67 67'),
    exPic('같은 높이', '막대가 나란해요', '67 67 67:2'),
  ] : [
    exPic('올라가는 가락', '그림 악보 — 막대가 위로', '64 67 69:2'),
    exPic('길고 짧게', '긴 막대는 긴 소리', '69:2 67 67'),
    exStaff('차례가기', '오선 — 줄 · 칸 · 줄', '67 69 71 72'),
    exStaff('뛰어가기', '오선 — 줄에서 줄로', '64 67 71 74 77:2'),
  ]),
  note: lo => (lo ? '막대가 높으면 높은 소리예요' : '막대가 높으면 높은 소리, 길면 긴 소리예요'),
  pool: [
    R(null, 'shape', 'pic', ['67 69 67:2', '69 67 69:2', '67 64 69:2'], 0, 1),
    R(null, 'len', 'pic', ['64:2 67 67', '64 67:2 67', '64 67 67:2'], 1, 2),
    R(null, 'shape', 'pic', ['69 69 64:2', '64 69 69:2', '69 64 69:2'], 2, 0),
    R(null, 'step', 'staff', ['65 67 69 71', '65 69 67 71', '65 64 67 65'], 0, 2),
    R(null, 'step', 'staff', ['71 69 67 65', '71 72 69 67', '71 67 69 72'], 1, 0),
    R(null, 'step', 'staff', ['69 71 69 67 65:2', '69 67 71 72 74:2', '69 72 74 71 69:2'], 2, 1),
  ],
  passText: '세 번 이어서 들은 가락의 악보 카드를 찾았어요',
  game: {
    title: lo => (lo ? '들은 노래 그림 찾기' : '들은 가락 악보 찾기'),
    sub: lo => (lo ? '노래를 한 번 들려줘요. 들은 노래와 같은 막대 그림을 골라요. 판마다 그림이 바뀌어요.' : `가락을 한 번 들려줘요. 같은 악보 카드를 골라요. ${CUTS[1] + 1}번째 판부터는 오선 악보예요.`),
  },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
