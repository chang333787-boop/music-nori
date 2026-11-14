// 리듬 악보 그림(11-14 · 듣고 고르기 틀 넓히기) — 박 목록을 받아 한 줄 리듬 악보 svg 글을 낸다(화면 · 소리 없음 · node 시험 tests/glyph.test.mjs)
//  쓰임: 들은 리듬과 같은 악보 카드 고르기(_pick.js cards의 chip) · 보기 카드 · 결과 그림
//  음표 머리 · 기둥 · 4분쉼표 모양은 리듬 칸(_beat.js noteSVG)과 같은 것을 여기서 같이 쓴다(두 벌 X — noteSVG가 이 파일의 조각을 부름)
//
//  glyph(beats, { size = 64, hi = [], color, label }) → '<svg …>'
//   beats = 박 목록(4분음표 = 1) — 수 = 음표 · 음수 = 쉼표 · { r: 박 } = 쉼표 · { d: 박, tie: true } = 다음 음과 붙임줄
//     쓸 수 있는 길이: 4 온 · 3 점2분 · 2 2분 · 1.5 점4분 · 1 4분 · 0.75 점8분 · 0.5 8분 · 0.25 16분 · 1/3 셋잇단 8분(셋이 한 박 · 위에 3)(그 밖은 오류)
//     예) [1, 0.5, 0.5, 2] = 4분 · 8분 둘(묶음) · 2분 / [1.5, 0.5, -1, 1] = 점4분 · 8분 · 4분쉼표 · 4분 / [{ d: 1, tie: true }, 1]
//   8분 · 16분은 한 박(4분음표 하나) 안에서 꼬리를 묶는다 — 혼자 남으면 깃발. 16분은 두 줄 묶음(점8분 + 16분은 짧은 둘째 줄)
//   unit = 꼬리를 묶는 박 길이(기본 1 = 4분음표 · 6/8은 1.5 = 점4분음표 한 박에 8분 셋을 한 묶음 — 11-14 묶음 C 리13이 더함)
//   hi = 강조할 음 차례(쉼표를 뺀 음표 차례 · 0부터) → 초록 · size = 높이 px(단추 카드 64px에서도 읽히게 굵게)
//   뿌리 svg에 data-beats · data-notes · data-rests · data-beams(묶음 수) · data-ties를 적어 둔다(시험이 읽음)

export const INK = '#3B2A1E', GREEN = '#2F6F4E';
// ── 리듬 칸(_beat.js noteSVG)과 같이 쓰는 조각 ──
export const strokeOf = color => `stroke="${color}" stroke-linecap="round" stroke-linejoin="round"`;
// 음표 머리(가로 23 · 기운 타원) — hollow = 2분 · 온음표처럼 속이 빈 머리
export const headSVG = (cx, hollow, color = INK, cy = 64, cls = '') => `<ellipse${cls ? ` class="${cls}"` : ''} cx="${cx}" cy="${cy}" rx="11.5" ry="8.2" transform="rotate(-22 ${cx} ${cy})" fill="${hollow ? '#FFFFFF' : color}" ${strokeOf(color)} stroke-width="${hollow ? 4 : 2}"/>`;
// 기둥 — 머리 오른쪽 끝(머리 cx + 10.5)에서 위로
export const stemSVG = (x, color = INK, y1 = 61, y2 = 9) => `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" ${strokeOf(color)} stroke-width="4"/>`;
// 4분쉼표(가로 40 상자 안 · x로 옮김)
export const qRestSVG = (color = INK, x = 0, cls = '') => `<path${cls ? ` class="${cls}"` : ''}${x ? ` transform="translate(${x} 0)"` : ''} d="M13 6 L28 23 C22 29 20 33 21 37 C22 41 26 46 30 50 L28 52 C22 48 14 49 16 58 C17 62 19 66 22 69 L20 71 C12 66 7 60 8 53 C9 46 16 44 22 46 L12 34 C17 29 19 25 19 21 C19 17 16 12 11 8 Z" fill="${color}" ${strokeOf(color)} stroke-width="2"/>`;

// 길이 → [모양, 점] · 모양 w 온 · h 2분 · q 4분 · e 8분 · s 16분
const SHAPE = { 4: ['w', 0], 3: ['h', 1], 2: ['h', 0], 1.5: ['q', 1], 1: ['q', 0], 0.75: ['e', 1], 0.5: ['e', 0], 0.25: ['s', 0] };
// 차지하는 가로(박에 곧게 비례하지 않음 — 짧은 음도 머리 · 기둥이 겹치지 않게)
const ADV = { 4: 84, 3: 80, 2: 64, 1.5: 58, 1: 44, 0.75: 42, 0.5: 34, 0.25: 30 }, ADV3 = 32;   // 머리(기운 타원 가로 약 25)가 겹치지 않는 가장 좁은 값 30
const EPS = 1e-6, Y_TRIP = 4;

// 박 목록 → 낱 하나하나 { d, rest, tie, shape, dot, t(시작 박) }
export function parseBeats(beats) {
  let t = 0;
  return beats.map((b, i) => {
    const o = typeof b === 'number' ? (b < 0 ? { d: -b, rest: true } : { d: b }) : b && b.r != null ? { d: b.r, rest: true } : { d: b && b.d, tie: !!(b && b.tie) };
    const trip = typeof o.d === 'number' && Math.abs(o.d - 1 / 3) < 1e-3;
    const sh = trip ? ['e', 0] : SHAPE[o.d];
    if (!sh) throw new Error(`리듬 그림: 쓸 수 없는 길이 ${JSON.stringify(b)}(${i}째)`);
    const it = { ...o, rest: !!o.rest, tie: !o.rest && !!o.tie, shape: sh[0], dot: sh[1], trip, t };
    t += o.d;
    return it;
  });
}

export function glyph(beats, { size = 64, hi = [], color = INK, label = '', unit = 1 } = {}) {
  const items = parseBeats(beats), hiSet = new Set(hi);
  let x = 10, ni = 0;
  for (const it of items) {                       // 자리 — 머리 cx · 기둥 x
    it.x = x; it.cx = x + 13; it.sx = it.cx + 10.5;
    if (!it.rest) it.n = ni++;
    it.col = !it.rest && hiSet.has(it.n) ? GREEN : color;
    x += (it.trip ? ADV3 : ADV[it.d]) + (it.dot ? 6 : 0);
  }
  const W = Math.round(x + 4), H = 84, Y0 = 2;
  // 묶음 — 한 박 안에서 이어지는 8분 · 16분(점8분 포함) 음표(쉼표가 끼면 끊김)
  const groups = [];
  let g = null;
  for (const it of items) {
    const short = !it.rest && (it.shape === 'e' || it.shape === 's'), beat = Math.floor(it.t / unit + EPS);
    const fits = short && Math.floor((it.t + it.d) / unit - EPS) === beat;   // 박을 넘는 8분(엇박에서 시작한 점8분 등)은 묶지 않음
    if (fits && g && g.beat === beat && g.last === it.t) { g.items.push(it); g.last = it.t + it.d; }
    else if (fits) { g = { beat, items: [it], last: it.t + it.d }; groups.push(g); }
    else g = null;
  }
  const beamed = new Set(groups.filter(q => q.items.length > 1).flatMap(q => q.items));
  const out = [];
  const beamG = groups.filter(q => q.items.length > 1);
  for (const it of items) {
    const c = it.col;
    if (it.rest) {
      const rx = it.x;
      if (it.shape === 'q') out.push(qRestSVG(c, rx + 1, 'g-rest'));
      else if (it.shape === 'e' || it.shape === 's') {
        // 8분쉼표 = 점 하나 + 비스듬한 막대 · 16분쉼표 = 점 둘
        const bx = rx + 12;
        out.push(`<g class="g-rest" ${strokeOf(c)}><path d="M${bx + 14} 30 L${bx + 4} 66" fill="none" stroke-width="4"/>` +
          `<circle cx="${bx + 3}" cy="31" r="5" fill="${c}" stroke-width="1"/><path d="M${bx + 3} 33 Q${bx + 9} 37 ${bx + 14} 30" fill="none" stroke-width="3"/>` +
          (it.shape === 's' ? `<circle cx="${bx}" cy="45" r="5" fill="${c}" stroke-width="1"/><path d="M${bx} 47 Q${bx + 6} 51 ${bx + 11} 44" fill="none" stroke-width="3"/>` : '') + '</g>');
      } else {
        // 2분쉼표 = 줄 위에 얹힌 네모 · 온쉼표 = 줄 아래 매달린 네모(짧은 줄을 같이 그림)
        const bx = rx + 6, ly = 46, wHalf = it.shape === 'h';
        out.push(`<g class="g-rest"><line x1="${bx - 4}" y1="${ly}" x2="${bx + 34}" y2="${ly}" ${strokeOf(c)} stroke-width="3"/>` +
          `<rect x="${bx + 4}" y="${wHalf ? ly - 11 : ly}" width="22" height="11" fill="${c}"/></g>`);
      }
      if (it.dot) out.push(`<circle class="g-dot" cx="${it.x + 40}" cy="50" r="3.6" fill="${c}"/>`);
      continue;
    }
    out.push(headSVG(it.cx, it.shape === 'h' || it.shape === 'w', c, 64, 'g-head'));
    if (it.shape !== 'w') out.push(stemSVG(it.sx, c));
    if (it.dot) out.push(`<circle class="g-dot" cx="${it.cx + 19}" cy="60" r="3.6" fill="${c}"/>`);
    if ((it.shape === 'e' || it.shape === 's') && !beamed.has(it)) {      // 혼자인 8분 · 16분 = 깃발(16분은 둘)
      for (let f = 0; f < (it.shape === 's' ? 2 : 1); f++) {
        const fy = 9 + f * 11;
        out.push(`<path class="g-flag" d="M${it.sx} ${fy} c0 7 11 10 10 22 c-1-7-5-10-10-12z" fill="${c}" ${strokeOf(c)} stroke-width="2"/>`);
      }
    }
  }
  // 묶음 꼬리 — 첫 줄은 묶음 처음부터 끝까지 · 16분 둘째 줄은 이웃한 16분끼리(혼자면 짧은 토막)
  for (const q of beamG) {
    const a = q.items[0], z = q.items[q.items.length - 1], c = q.items.every(it => it.col === GREEN) ? GREEN : color;
    out.push(`<path class="g-beam" d="M${a.sx - 2} 9 H${z.sx + 2}" stroke="${c}" stroke-width="8" stroke-linecap="butt"/>`);
    if (q.items.every(it => it.trip)) out.push(`<text class="g-trip" x="${((a.sx + z.sx) / 2).toFixed(1)}" y="${Y_TRIP}" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-style="italic" font-weight="700" font-size="15" fill="${c}">3</text>`);
    q.items.forEach((it, k) => {
      if (it.shape !== 's') return;
      const nx = q.items[k + 1], px = q.items[k - 1];
      if (nx && nx.shape === 's') out.push(`<path class="g-beam2" d="M${it.sx - 2} 21 H${nx.sx + 2}" stroke="${c}" stroke-width="7" stroke-linecap="butt"/>`);
      else if (!px || px.shape !== 's') out.push(`<path class="g-beam2" d="M${nx ? it.sx - 2 : it.sx - 12} 21 H${nx ? it.sx + 12 : it.sx + 2}" stroke="${c}" stroke-width="7" stroke-linecap="butt"/>`);
    });
  }
  // 붙임줄 — 머리 아래로 다음 음 머리까지 둥글게
  let ties = 0;
  items.forEach((it, k) => {
    const nx = items[k + 1];
    if (!it.tie || !nx || nx.rest) return;
    ties++;
    const a = it.cx + 4, b = nx.cx - 4, m = (a + b) / 2;
    out.push(`<path class="g-tie" d="M${a} 75 Q${m} 86 ${b} 75 Q${m} 81 ${a} 75Z" fill="${color}" ${strokeOf(color)} stroke-width="2"/>`);
  });
  const total = +items.reduce((s, it) => s + it.d, 0).toFixed(4);
  const notes = items.filter(it => !it.rest).length;
  const aria = label ? `role="img" aria-label="${label.replace(/"/g, '')}"` : 'aria-hidden="true"';
  return `<svg class="glyph" viewBox="0 ${Y0} ${W} ${H}" width="${Math.round(size * W / H)}" height="${size}" ${aria} data-beats="${total}" data-notes="${notes}" data-rests="${items.length - notes}" data-beams="${beamG.length}" data-ties="${ties}">${out.join('')}</svg>`;
}
