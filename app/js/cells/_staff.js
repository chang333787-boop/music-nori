// 작은 오선 카드(11-14 · 묶음 C G2 · C3 팀) — 악3 가온 도 · 악4 음이름(보기) · 악5 조표가 쓰는 한 줄 오선 그림(svg 글)
//  왜 renderScore(notation.js)를 그대로 쓰지 않나: ① 고르기 틀의 단추 카드(cards)는 svg '글'을 받고, 시험(node)이 화면 없이 cards를 부른다 —
//   renderScore는 document로 svg 요소를 만든다 ② renderScore는 음마다 ♯ · ♭을 그리고(190~191행) 조표가 없다.
//  그래서 자리 셈은 notation.js의 staffPos(아래 첫 줄 미 = 0 · 한 칸 위 = +1)를 그대로 쓰고, 붓(줄 사이 10 · 머리 6.3 × 4.6 · 덧줄 ±9 · 높은음자리표 글자 U+1D11E)도 같은 값으로 맞췄다.
//  ♯ · ♭ · ♮은 글꼴에 기대지 않고 path로 그린다(Noto Music은 필요한 글자만 받음 — index.html).
//
//  staffCard(ps, o) → '<svg …>' 글
//   ps     음 높이(MIDI) 목록 — 모두 4분음표(머리 + 기둥)
//   o.key  null | 'sharp'(♯ 하나 = 다섯째 줄 파 자리) | 'flat'(♭ 하나 = 셋째 줄 시 자리) — 조표가 있으면 그 음(파♯ · 시♭)에는 임시표를 그리지 않음
//   o.bars 마디 수(음을 고르게 나눔 · 사이에 마디선) · o.lo · o.hi 그림 높이에 넣을 가장 낮은 · 높은 자리(한 칸의 카드들이 같은 크기가 되게 고정)
//   o.width viewBox 너비(240 안팎) · o.hi 칠할 음 차례(초록) · o.words 음 밑 글(음이름 등 · 보기 카드에서만 — 단추 카드에는 글을 넣지 않음)
//  임시표는 그 마디 안에서만 — 같은 마디에서 같은 자리 음이 또 나오면 다시 그리지 않음 · 조표와 어긋나는 음(조표 ♯인데 파)은 ♮
//  뿌리 svg의 data-pos(자리) · data-acc(음마다 '#' 'b' 'n' '') · data-key · data-ledgers(덧줄 수)를 시험(tests/staff.test.mjs)이 읽는다
import { staffPos } from '../notation.js';

export const INK = '#3B2A1E', GREEN = '#2F6F4E';
const LG = 10;
const KEY_POS = { sharp: 8, flat: 4 };                // 조표 자리 — 다섯째 줄(파) · 셋째 줄(시)
const KEY_PC = { sharp: 6, flat: 10 };                // 조표가 바꾸는 음(반음 번호)
const NAT_PC = { sharp: 5, flat: 11 };                // 조표 아래에서 ♮이 붙는 음
// 음 하나의 꼴 — 'k' 조표가 바꾼 음(파♯ · 시♭ — 조표 아래) · 'n' 조표 아래 제자리 음 · '#' · 'b' 임시로 올리고 내림 · '' 제자리
export function stateOf(p, key = null) {
  const c = ((p % 12) + 12) % 12;
  if (key && c === KEY_PC[key]) return 'k';
  if (key && c === NAT_PC[key]) return 'n';
  return [1, 3, 6, 8].includes(c) ? '#' : c === 10 ? 'b' : '';
}
// 덧줄 자리 목록(아래 -2 -4 … · 위 10 12 …)
export const ledgersOf = pos => {
  const out = [];
  for (let lp = -2; lp >= pos; lp -= 2) out.push(lp);
  for (let lp = 10; lp <= pos; lp += 2) out.push(lp);
  return out;
};
const f = v => +v.toFixed(1);
// ♯ · ♭ · ♮ path(가운데 x · y = 그 음 자리)
const SHARP = (x, y) => `<path d="M${f(x - 2.4)} ${f(y - 9)}V${f(y + 10)}M${f(x + 2.4)} ${f(y - 10)}V${f(y + 9)}" stroke="${INK}" stroke-width="1.4" fill="none"/>` +
  `<path d="M${f(x - 5)} ${f(y - 2)}L${f(x + 5)} ${f(y - 5)}M${f(x - 5)} ${f(y + 5)}L${f(x + 5)} ${f(y + 2)}" stroke="${INK}" stroke-width="3" fill="none"/>`;
const FLAT = (x, y) => `<path d="M${f(x - 3)} ${f(y - 13)}V${f(y + 5)}" stroke="${INK}" stroke-width="1.5" fill="none"/>` +
  `<path d="M${f(x - 3)} ${f(y + 5)}C${f(x + 6)} ${f(y)} ${f(x + 5)} ${f(y - 6)} ${f(x - 3)} ${f(y - 1)}" stroke="${INK}" stroke-width="2.2" fill="none"/>`;
const NATURAL = (x, y) => `<path d="M${f(x - 2.5)} ${f(y - 10)}V${f(y + 5)}M${f(x + 2.5)} ${f(y - 5)}V${f(y + 10)}" stroke="${INK}" stroke-width="1.4" fill="none"/>` +
  `<path d="M${f(x - 2.5)} ${f(y - 1)}L${f(x + 2.5)} ${f(y - 3)}M${f(x - 2.5)} ${f(y + 5)}L${f(x + 2.5)} ${f(y + 3)}" stroke="${INK}" stroke-width="2.8" fill="none"/>`;
const ACC = { '#': SHARP, b: FLAT, n: NATURAL };

export function staffCard(ps, { key = null, bars = 1, lo = -5, hi = 9, width = 240, mark = [], words = null } = {}) {
  const pos = ps.map(staffPos);
  const low = Math.min(lo, ...pos), high = Math.max(hi, ...pos);
  const top = Math.max(16, 12 + (high - 8) * 5);                     // 다섯째 줄 y — 높은 덧줄 음 머리 · 기둥이 들어가게
  const bottom = top + 4 * LG, yOf = q => bottom - q * (LG / 2);
  const H = Math.round(bottom + Math.max(18, -low * 5 + 9) + (words ? 22 : 0));
  const keyW = key ? 16 : 0, x0 = 40 + keyW, x1 = width - 10, per = Math.max(1, Math.round(ps.length / bars));
  const barW = (x1 - x0) / bars, stepW = barW / per;
  const out = [];
  for (let j = 0; j < 5; j++) out.push(`<line x1="2" x2="${width - 2}" y1="${top + j * LG}" y2="${top + j * LG}" stroke="${INK}" stroke-width="1.2"/>`);
  out.push(`<text x="4" y="${top + 33}" style="font-family:'Noto Music',serif;font-size:44px" fill="${INK}">\u{1D11E}</text>`);
  if (key) out.push((key === 'sharp' ? SHARP : FLAT)(40 + 6, yOf(KEY_POS[key])));
  for (let b = 1; b < bars; b++) out.push(`<line x1="${f(x0 + b * barW)}" x2="${f(x0 + b * barW)}" y1="${top}" y2="${bottom}" stroke="${INK}" stroke-width="1.4"/>`);
  out.push(`<line x1="${width - 6}" x2="${width - 6}" y1="${top}" y2="${bottom}" stroke="${INK}" stroke-width="1.4"/>`, `<line x1="${width - 2.5}" x2="${width - 2.5}" y1="${top}" y2="${bottom}" stroke="${INK}" stroke-width="3"/>`);
  const accs = [], led = [];
  let cur = new Map();                                                // 그 마디에서 자리마다 지금 붙어 있는 꼴
  ps.forEach((p, i) => {
    if (i % per === 0) cur = new Map();                               // 마디가 바뀌면 임시표를 새로
    const q = pos[i], cx = x0 + (i % per) * stepW + stepW / 2 + Math.floor(i / per) * barW + 4, cy = yOf(q), col = mark.includes(i) ? GREEN : INK;
    const st = stateOf(p, key), base = key && (q - KEY_POS[key]) % 7 === 0 ? 'k' : '';
    const prev = cur.has(q) ? cur.get(q) : base;
    let a = '';
    if (st !== prev) a = st === 'k' ? (key === 'sharp' ? '#' : 'b') : st === '' ? 'n' : st;
    cur.set(q, st);
    accs.push(a);
    const ls = ledgersOf(q);
    led.push(ls.length);
    for (const lp of ls) out.push(`<line x1="${f(cx - 9)}" x2="${f(cx + 9)}" y1="${yOf(lp)}" y2="${yOf(lp)}" stroke="${INK}" stroke-width="1.4"/>`);
    if (a) out.push(ACC[a](cx - 14, cy));
    out.push(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="6.3" ry="4.6" transform="rotate(-20 ${f(cx)} ${f(cy)})" fill="${col}"/>`);
    const up = q < 4, sx = up ? cx + 5.8 : cx - 5.8;
    out.push(`<line x1="${f(sx)}" x2="${f(sx)}" y1="${f(cy)}" y2="${f(up ? cy - 30 : cy + 30)}" stroke="${col}" stroke-width="1.5"/>`);
    if (words && words[i]) out.push(`<text x="${f(cx)}" y="${H - 4}" text-anchor="middle" style="font:700 16px var(--body,sans-serif)" fill="${col}">${words[i]}</text>`);
  });
  return `<svg viewBox="0 0 ${width} ${H}" aria-hidden="true" data-pos="${pos.join(',')}" data-acc="${accs.join(',')}" data-key="${key || ''}" data-ledgers="${led.join(',')}">${out.join('')}</svg>`;
}
