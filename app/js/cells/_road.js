// 마디 상자 줄(11-14 · 묶음 C · 반1 되풀이 길 찾기 · 반2 처음으로 · 𝄋로 · 끝) — 카드 글 → 연주 차례 · 단추 카드 svg 글(화면 · 소리 없음 · node 시험 tests/road.test.mjs)
//  카드 글 = 낱말을 빈칸으로 띄어 씀. 수 = 마디 상자(그 번호의 동기를 냄)
//    |:  다음 상자 앞 도돌이 시작        :|  앞 상자 뒤 도돌이 끝(시작이 없으면 처음으로)
//    [1  다음 상자부터 1번 괄호(:|까지)  [2  다음 상자 하나에 2번 괄호(열린 괄호)
//    S   다음 상자 앞 𝄋(세뇨)           O   다음 상자 앞 ⊕(코다 — To Coda에서 건너뛰어 오는 곳)
//    Fine · DC · DS · ToCoda · DCCoda · DSCoda  앞 상자 뒤에 붙는 표(DC = D.C. · DCCoda = D.C. al Coda …)
//   예) '|: 1 2 [1 3 :| [2 4' → 1 2 3 1 2 4 · '1 S 2 3 Fine 4 DS' → 1 2 3 4 2 3
//  읽는 차례(expandRoad): 도돌이는 한 번만 되돌아감 · 되돌아온 뒤에는 1번 괄호를 건너뛰고 2번 괄호로 ·
//   D.C. · D.S.는 한 번만(되돌아간 뒤 도돌이표는 다시 하지 않음 — 반2 카드에는 도돌이표를 넣지 않는다) · 되돌아간 뒤 Fine에서 끝 · To Coda에서 ⊕로
//  ⚠ D.C. al Fine · D.S. al Coda 읽는 차례는 일반 악전(저장소 · 사실 파일 근거 없음 — 설계서 batchC §F 7)
//
//  roadSVG(카드 글, { mot, size }) → '<svg …>' — 상자(번호 + 그 동기의 높낮이 점) · 도돌이표 · 괄호 · 𝄋 · ⊕(svg path — 기호 글꼴에 기대지 않음)
//   · Fine · D.C. · D.S. · To Coda(라틴 글자 — 보통 글꼴) · 기호 밑 우리말 작은 글(끝 · 처음으로 · 𝄋로 · ⊕로)
//   mot = { 번호: [[음 높이, 박 수], …] } (점 그림용 · 없으면 번호만) · 뿌리 svg에 data-boxes · data-order

export const INK = '#3B2A1E', GREEN = '#2F6F4E';
const MARKS = new Set(['Fine', 'DC', 'DS', 'ToCoda', 'DCCoda', 'DSCoda']);
const MARK_TXT = { Fine: ['Fine'], DC: ['D.C.'], DS: ['D.S.'], ToCoda: ['To', 'Coda'], DCCoda: ['D.C.', 'al Coda'], DSCoda: ['D.S.', 'al Coda'] };
// 기호 밑 우리말(아이 글) — 𝄋 · ⊕는 그림 + '로'
const MARK_KO = { Fine: '끝', DC: '처음으로', DCCoda: '처음으로', DS: 'S로', DSCoda: 'S로', ToCoda: 'O로' };

// 카드 글 → 상자 목록
export function parseRoad(text) {
  const toks = String(text).trim().split(/\s+/), boxes = [];
  let pend = {}, volta = 0;
  for (const t of toks) {
    if (/^\d+$/.test(t)) {
      const b = { n: Number(t), ...pend };
      if (volta) b.v = volta;
      if (volta === 2) volta = 0;               // 2번 괄호는 상자 하나
      boxes.push(b); pend = {};
      continue;
    }
    const last = boxes[boxes.length - 1];
    if (t === '|:') pend.rs = true;
    else if (t === ':|') { if (!last) throw new Error('도돌이 끝 앞에 상자가 없음: ' + text); last.re = true; if (volta === 1) volta = 0; }
    else if (t === '[1') volta = 1;
    else if (t === '[2') volta = 2;
    else if (t === 'S') pend.segno = true;
    else if (t === 'O') pend.coda = true;
    else if (MARKS.has(t)) { if (!last) throw new Error(t + ' 앞에 상자가 없음: ' + text); last.mark = t; }
    else throw new Error(`카드 글에 모르는 낱말 '${t}': ${text}`);
  }
  return boxes;
}

// 카드 글 → 연주 차례(상자 번호 목록)
export function expandRoad(text) {
  const B = typeof text === 'string' ? parseRoad(text) : text, out = [], done = new Set();
  const find = f => B.findIndex(f);
  let i = 0, pass = 1, jumped = false, guard = 0;
  while (i < B.length && guard++ < 200) {
    const b = B[i];
    if (b.v && b.v !== pass) { i++; continue; }      // 1번 괄호는 처음에만 · 2번 괄호는 되돌아온 뒤에만
    out.push(b.n);
    if (jumped && b.mark === 'Fine') break;
    if (jumped && b.mark === 'ToCoda') { const c = find(x => x.coda); if (c < 0) throw new Error('⊕가 없음'); i = c; continue; }
    if (b.re && !done.has(i)) {
      done.add(i); pass = 2;
      let s = i; while (s > 0 && !B[s].rs) s--;
      i = s; continue;
    }
    if (b.re) pass = 1;
    if (!jumped && (b.mark === 'DC' || b.mark === 'DCCoda')) { jumped = true; i = 0; continue; }
    if (!jumped && (b.mark === 'DS' || b.mark === 'DSCoda')) { jumped = true; const s = find(x => x.segno); if (s < 0) throw new Error('𝄋가 없음'); i = s; continue; }
    if (!jumped && b.coda && i > 0) break;           // 처음 지날 때 ⊕ 상자에 닿으면(쓰지 않는 꼴) 끝
    i++;
  }
  return out;
}

// 카드 낱말(시험 봇 · 카드 견주기) — 기호만 · 기호 수
export const roadTokens = text => String(text).trim().split(/\s+/);
export const roadSymbols = text => roadTokens(text).filter(t => !/^\d+$/.test(t));

// ── 그림 ──
const H = 100, TOP = 32, BH = 46, BW = 48, GAP = 8, REP = 16;
const LAT = 14, KO = 19;                            // 라틴 표 글자 · 우리말 글자(뷰박스 단위 — 높이 96px에 그리면 약 18px)
const txtW = (s, fs) => [...s].reduce((a, c) => a + (/[가-힣]/.test(c) ? fs : /[A-Z]/.test(c) ? fs * 0.66 : c === ' ' || c === '.' ? fs * 0.3 : fs * 0.55), 0);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const line = (x1, y1, x2, y2, w = 2.4) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${INK}" stroke-width="${w}" stroke-linecap="round"/>`;
const text = (x, y, s, fs, anchor = 'start', extra = '') => `<text x="${x}" y="${y}" font-size="${fs}" text-anchor="${anchor}" fill="${INK}" font-family="var(--body, sans-serif)" font-weight="700"${extra}>${esc(s)}</text>`;
// 𝄋 — 16 × 22 상자 안(x, y = 왼쪽 위) · k = 크기
export const segnoPath = (x, y, k = 1) => {
  const X = v => (x + v * k).toFixed(1), Y = v => (y + v * k).toFixed(1);
  return `<path d="M${X(12.5)} ${Y(5)} C${X(10)} ${Y(1)} ${X(3)} ${Y(2)} ${X(4)} ${Y(7)} C${X(5)} ${Y(11)} ${X(12)} ${Y(11)} ${X(12)} ${Y(15.5)} C${X(12)} ${Y(20.5)} ${X(5)} ${Y(21)} ${X(3.5)} ${Y(17)}" fill="none" stroke="${INK}" stroke-width="${(2.4 * k).toFixed(2)}" stroke-linecap="round"/>`
    + `<line x1="${X(2)}" y1="${Y(20)}" x2="${X(14)}" y2="${Y(2)}" stroke="${INK}" stroke-width="${(1.8 * k).toFixed(2)}" stroke-linecap="round"/>`
    + `<circle cx="${X(2.6)}" cy="${Y(10.5)}" r="${(1.9 * k).toFixed(2)}" fill="${INK}"/><circle cx="${X(13.4)}" cy="${Y(11.5)}" r="${(1.9 * k).toFixed(2)}" fill="${INK}"/>`;
};
// ⊕ — 16 × 22 상자 안
export const codaPath = (x, y, k = 1) => {
  const X = v => (x + v * k).toFixed(1), Y = v => (y + v * k).toFixed(1);
  return `<ellipse cx="${X(8)}" cy="${Y(11)}" rx="${(5.6 * k).toFixed(1)}" ry="${(7 * k).toFixed(1)}" fill="none" stroke="${INK}" stroke-width="${(2.4 * k).toFixed(2)}"/>`
    + `<line x1="${X(0)}" y1="${Y(11)}" x2="${X(16)}" y2="${Y(11)}" stroke="${INK}" stroke-width="${(2 * k).toFixed(2)}"/><line x1="${X(8)}" y1="${Y(1)}" x2="${X(8)}" y2="${Y(21)}" stroke="${INK}" stroke-width="${(2 * k).toFixed(2)}"/>`;
};
// 도돌이표 — 시작(굵은 줄 · 가는 줄 · 점 둘) · 끝(점 둘 · 가는 줄 · 굵은 줄)
const repStart = x => `<rect x="${x}" y="${TOP}" width="4" height="${BH}" fill="${INK}"/>${line(x + 8, TOP, x + 8, TOP + BH, 1.8)}<circle cx="${x + 13}" cy="${TOP + 17}" r="2.4" fill="${INK}"/><circle cx="${x + 13}" cy="${TOP + 29}" r="2.4" fill="${INK}"/>`;
const repEnd = x => `<circle cx="${x + 3}" cy="${TOP + 17}" r="2.4" fill="${INK}"/><circle cx="${x + 3}" cy="${TOP + 29}" r="2.4" fill="${INK}"/>${line(x + 8, TOP, x + 8, TOP + BH, 1.8)}<rect x="${x + 11}" y="${TOP}" width="4" height="${BH}" fill="${INK}"/>`;

export function roadSVG(textIn, { mot = null, size = 96 } = {}) {
  const B = parseRoad(textIn), parts = [];
  let x = 6, lo = 0, hi = 0;
  const grow = (a, b) => { lo = Math.min(lo, a); hi = Math.max(hi, b); };
  const pos = [];
  for (const b of B) {
    if (b.rs) { parts.push(repStart(x)); grow(x, x + REP); x += REP; }
    // 상자 너비 — 왼쪽 위 𝄋 · ⊕와 오른쪽 위 표 글이 겹치지 않게
    const mt = b.mark ? MARK_TXT[b.mark] : null, mw = mt ? Math.max(...mt.map(s => txtW(s, LAT))) : 0;
    const w = Math.max(BW, Math.ceil((b.segno || b.coda ? 20 : 0) + mw + 4));
    pos.push({ b, x, w });
    x += w;
    if (b.re) { x += 2; parts.push(repEnd(x)); grow(x, x + REP); x += REP - 2; }
    x += GAP;
  }
  for (const { b, x: bx, w } of pos) {
    parts.push(`<rect x="${bx}" y="${TOP}" width="${w}" height="${BH}" rx="7" style="fill:var(--surface, #FFFDF7)" stroke="${INK}" stroke-width="2.4"/>`);
    parts.push(text(bx + 5, TOP + 18, String(b.n), 17));
    const m = mot && mot[b.n];
    if (m) {
      const beats = m.reduce((a, [, d]) => a + d, 0);
      let t = 0;
      for (const [p, d] of m) {
        if (p != null) {
          const cx = bx + 18 + ((t + d / 2) / beats) * (w - 24), cy = TOP + BH - 9 - Math.max(0, Math.min(1, (p - 60) / 12)) * (BH - 20);
          parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4.2" fill="${GREEN}" stroke="${INK}" stroke-width="1.6"/>`);
        }
        t += d;
      }
    }
    grow(bx, bx + w);
    if (b.segno) parts.push(segnoPath(bx + 2, 4));
    if (b.coda) parts.push(codaPath(bx + 2, 4));
    if (b.mark) {
      const mt = MARK_TXT[b.mark];
      mt.forEach((s, k) => parts.push(text(bx + w - 2, mt.length === 1 ? 24 : 12 + k * 14, s, LAT, 'end', ' font-style="italic"')));
      grow(bx + w - 2 - Math.max(...mt.map(s => txtW(s, LAT))), bx + w);
      // 우리말 — 상자 가운데 아래
      const ko = MARK_KO[b.mark], cx = bx + w / 2;
      if (ko[0] === 'S' || ko[0] === 'O') {
        const tw = 16 * 0.8 + 2 + KO, x0 = cx - tw / 2;
        parts.push((ko[0] === 'S' ? segnoPath : codaPath)(x0, TOP + BH + 3, 0.8), text(x0 + 16 * 0.8 + 2, TOP + BH + 19, '로', KO));
        grow(x0, x0 + tw);
      } else { const tw = txtW(ko, KO); parts.push(text(cx, TOP + BH + 19, ko, KO, 'middle')); grow(cx - tw / 2, cx + tw / 2); }
    }
  }
  // 1 · 2번 괄호 — 같은 번호가 이어진 상자 위 한 줄
  for (let k = 0; k < pos.length; k++) {
    const v = pos[k].b.v;
    if (!v || (k && pos[k - 1].b.v === v)) continue;
    let e = k; while (e + 1 < pos.length && pos[e + 1].b.v === v) e++;
    const x0 = pos[k].x + 1, x1 = pos[e].x + pos[e].w - (v === 1 ? 1 : 10);
    parts.push(line(x0, TOP - 1, x0, 18, 2), line(x0, 18, x1, 18, 2), text(x0 + 4, 15, v + '.', 14));
    if (v === 1) parts.push(line(x1, 18, x1, TOP - 1, 2));
  }
  const vx = Math.floor(lo - 4), W = Math.ceil(hi + 4) - vx;
  const order = expandRoad(B).join(' ');
  return `<svg viewBox="${vx} 0 ${W} ${H}" width="${(W * size / H).toFixed(0)}" height="${size}" role="img" aria-label="${esc(order)}" data-boxes="${B.length}" data-order="${order}">${parts.join('')}</svg>`;
}

// ── 반1 · 반2가 같이 쓰는 것(이 칸들에서 만든 동기 · 카드) ──
//  마디 = 두 박 동기(BEAT 0.3 · 피아노 0.6) · 연주 차례는 늘 여섯 마디(3.6초)
export const ROAD_BEAT = 0.3;
export const ROAD_MOT = {
  1: [[60, 0.5], [64, 0.5], [67, 1]],            // 도 미 솔
  2: [[69, 0.5], [67, 0.5], [69, 1]],            // 라 솔 라
  3: [[72, 1], [67, 1]],                          // 높은 도 솔
  4: [[65, 0.5], [64, 0.5], [62, 1]],            // 파 미 레
  5: [[62, 0.5], [62, 0.5], [60, 1]],            // 레 레 도
  6: [[64, 1], [60, 1]],                          // 미 도
};
export const ROAD_CARDS = {
  R1: '|: 1 2 :| 3 4', R2: '1 |: 2 3 :| 4', R3: '1 2 |: 3 4 :|', R4: '|: 1 2 3 :|', R5: '|: 1 :| 2 3 |: 4 :|', P6: '1 2 3 4 5 6',
  V1: '|: 1 2 [1 3 :| [2 4', V2: '|: 1 [1 2 :| [2 3 4 5', V3: '1 |: 2 [1 3 :| [2 4 5',
  DC1: '1 2 Fine 3 4 DC', DC2: '1 Fine 2 3 4 5 DC', DS1: '1 S 2 3 Fine 4 DS', DS2: '1 2 S 3 Fine 4 5 DS',
  CO1: '1 S 2 ToCoda 3 4 DSCoda O 5', CO2: '1 ToCoda 2 3 4 DCCoda O 5',
};
export const roadOrder = name => expandRoad(ROAD_CARDS[name]);
// 위치 단추(카드 고르기) — keys a b c · 줄 { stage, kind, set: [카드 셋], ans: 0|1|2 } · 뒤집기 = 답을 다음 카드로
export const ROAD_KEYS = ['a', 'b', 'c'];
export const ROAD_ORD = ['첫째', '둘째', '셋째'];
export const roadFlip = p => ({ ...p, ans: (p.ans + 1) % 3 });
export const roadCards = row => row.set.map((c, k) => ({ key: ROAD_KEYS[k], label: ROAD_ORD[k], chip: roadSVG(ROAD_CARDS[c], { mot: ROAD_MOT }), tv: `${ROAD_ORD[k]} 카드` }));
// 판 → 가락(답 카드 길을 펼친 차례로 동기를 이어 붙임)
export const roadMelody = row => roadOrder(row.set[row.ans]).flatMap(n => ROAD_MOT[n]);
export const roadHeard = row => `${ROAD_ORD[row.ans]} 카드 — 들은 차례 ${roadOrder(row.set[row.ans]).join(' ')}`;
