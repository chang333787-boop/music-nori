// 음악 마을 지도 — 위 띠 = 갈래 여섯(친구 얼굴 · 갈래 이름 · 별 받은 칸 수) · 아래 판 = 고른 갈래의 칸. 잠그지 않음 · '다음' 칸만 주황
//  판 위 큰 칸 = 학년 띠(device.band)에 맞는 칸 + 별 받은 칸 + '다음' 칸 · 판 아래 '다른 놀이' 줄 = 나머지(작게 · 한 번 눌러 바로 열림)
//   학년 띠에 맞는 칸이 없는 갈래(1~2학년 판의 곰 갈래 · 3~4학년 판의 소리 갈래 …)는 모두 큰 칸. 큰 칸 + 작은 줄이 판에 안 들어가면 모두 큰 칸(6칸씩 세 줄 = 18칸까지)
//  처음 열면 '다음' 칸이 있는 갈래 · 아이가 띠를 눌러 고른 갈래는 새로고침 전까지 기억(칸에 갔다 와도 그 갈래)
//   고른 갈래에 '다음' 칸이 없으면 그 갈래 띠에 작은 주황 '다음' — 주황은 늘 하나(지금 누를 것)
//  번호 = 그 갈래 안 추천 차례(TV 고르기와 같은 번호 · 작은 줄에 간 칸도 번호는 그대로)
//  칸이 늘어도(장부 ORDER_ALL 52칸) 1366×768 한 화면 · 스크롤 0 — 시험은 주소 꼬리 ?allcells=1(아직 안 만든 칸도 만든 것처럼 · 아이 화면엔 단추 없음)
import { h, onPress, lsGet, lsSet } from '../util.js';
import { friendImg } from '../band.js';
import { LANES, ORDER, ORDER_ALL, cellById, nextCell, cellName, passed } from '../../../engine/cells.js';
import { getProg, STAR_SVG } from '../cellkit.js';

// 갈래 차례(지도 · TV 고르기 같이) — meet = 형식·화음(거북) · any = 곰 갈래(셈여림·빠르기)
export const LANE_ORDER = ['sound', 'melody', 'rhythm', 'score', 'meet', 'any'];
// 시험용 — ?allcells=1이면 장부의 끝 모습(ORDER_ALL)을 모두 만든 칸처럼 그림(칸 수가 늘어도 한 화면인지 보려고)
export const cellList = () => (new URLSearchParams(location.search).get('allcells') === '1' ? ORDER_ALL : ORDER);
export const laneIds = (lane, list = cellList()) => list.filter(id => cellById(id)?.lane === lane);
// 좁은 칸에서 가운뎃점 뒤에서도 줄이 바뀌게(낱말 가운데서 끊지 않음 · word-break:keep-all) — <wbr>이라 글(textContent)은 그대로
export const wrapName = s => s.split('·').flatMap((p, i) => (i ? ['·', h('wbr'), p] : [p]));

// 학년 띠 — 장부 학년 글 '1~2학년' · '3학년' · '1학년~'(그 학년과 다음 학년) → [처음, 끝] · 학년 글이 없으면('악보에 나올 때') 3~6학년
const BAND_GRADES = { low: [1, 2], mid: [3, 4], high: [5, 6] };
export function gradeSpan(g) {
  const m = /(\d)(?:~(\d))?학년(~)?/.exec(g || '');
  if (!m) return [3, 6];
  const a = +m[1];
  return [a, m[2] ? +m[2] : m[3] ? Math.min(6, a + 1) : a];
}
export const inBand = (cell, band) => { const [a, b] = gradeSpan(cell.grade), [lo, hi] = BAND_GRADES[band] || BAND_GRADES.mid; return a <= hi && b >= lo; };

// 큰 칸 · 작은 줄 나누기 — 판 높이(1366×768)에 맞춘 줄 수: 큰 칸 6칸씩 · 작은 칸 6칸씩
//  큰 한 줄 + 작은 세 줄까지 · 큰 두 줄 + 작은 두 줄까지 · 큰 세 줄이면 작은 줄 없음 → 안 들어가면 모두 큰 칸
const COLS = 6;
export function splitLane(ids, { band, prog, next }) {
  if (!ids.some(id => inBand(cellById(id), band))) return { big: ids, small: [] };
  let big = ids.filter(id => id === next || passed(prog, id) || inBand(cellById(id), band));
  let small = ids.filter(id => !big.includes(id));
  const br = Math.ceil(big.length / COLS), sr = Math.ceil(small.length / COLS);
  if (sr && !((br <= 1 && sr <= 3) || (br === 2 && sr <= 2))) { big = ids; small = []; }
  return { big, small };
}

// 아이가 고른 갈래(이 화면을 떠났다 와도 · 새로고침하면 처음처럼)
let picked = null;

export default function mount(root, ctx) {
  const prog = getProg();
  const list = cellList();
  const nx = nextCell(prog, lsGet('startCell', undefined));
  const band = ctx.device.band;                               // 1~2학년 판(band low)이면 칸 이름이 쉬운 말
  // 새로 별을 받은 칸 — 한 번 반짝(지난번 지도에서 본 칸과 견줌 · 처음 열면 반짝 없음)
  const doneIds = list.filter(id => passed(prog, id)), seen = lsGet('map.seen', null);
  const fresh = new Set(seen ? doneIds.filter(id => !seen.includes(id)) : []);
  lsSet('map.seen', doneIds);
  const shown = new Set();                                    // 반짝은 그 갈래 판을 처음 그릴 때 한 번(띠를 오가도 다시 반짝이지 않음)
  const lanes = LANE_ORDER.filter(lane => laneIds(lane, list).length);
  const nxLane = nx ? cellById(nx).lane : null;
  let lane = lanes.includes(picked) ? picked : lanes.includes(nxLane) ? nxLane : lanes[0];

  const tabs = h('div', { class: 'mtabs', role: 'tablist', 'aria-label': '갈래' });
  const panel = h('div', { class: 'mpanel', role: 'tabpanel' });
  const wrap = h('div', { class: 'map' }, tabs, panel);

  function node(id, k) {
    const c = cellById(id), st = prog[id] ? prog[id].stars : 0, name = cellName(c, band);
    const btn = h('button', { type: 'button', class: 'mnode' + (st >= 1 ? ' done' : '') + (id === nx ? ' next' : '') + (fresh.has(id) && !shown.has(c.lane) ? ' fresh' : ''), 'data-cell': id, 'aria-label': `${LANES[c.lane].name} ${k} · ${name}${st ? ` · 별 ${st}` : ''}${id === nx ? ' · 다음 놀이' : ''}` },
      id === nx ? h('span', { class: 'mtag' }, '다음') : null,
      h('span', { class: 'mdot' }, String(k)),
      h('span', { class: 'mstars', html: [0, 1, 2].map(i => STAR_SVG(i < st)).join('') }),
      h('span', { class: 'mname' }, wrapName(name)));
    onPress(btn, () => ctx.go(c.route || 'cell/' + id));
    return btn;
  }
  function chip(id, k) {
    const c = cellById(id), name = cellName(c, band);
    const btn = h('button', { type: 'button', class: 'mnode mchip', 'data-cell': id, 'aria-label': `${LANES[c.lane].name} ${k} · ${name}` },
      h('span', { class: 'mdot' }, String(k)),
      h('span', { class: 'mname' }, wrapName(name)));
    onPress(btn, () => ctx.go(c.route || 'cell/' + id));
    return btn;
  }
  function draw() {
    tabs.replaceChildren(...lanes.map(key => {
      const L = LANES[key], ids = laneIds(key, list), got = ids.filter(id => passed(prog, id)).length;
      const on = key === lane;
      const t = h('button', { type: 'button', role: 'tab', class: 'mtab' + (on ? ' on' : '') + (!shown.size && ids.some(id => fresh.has(id)) ? ' fresh' : ''), 'aria-selected': on ? 'true' : 'false', 'data-lane': key, style: { '--a': `var(--${L.friend})`, '--a-t': `var(--${L.friend}-t)` }, 'aria-label': `${L.name} · 별 받은 놀이 ${got} / ${ids.length}${!on && key === nxLane ? ' · 다음 놀이가 있어요' : ''}` },
        friendImg(L.friend, 'face', { label: false }),
        h('span', { class: 'mtab-t' }, h('b', {}, L.name), h('span', { class: 'mtab-n', html: STAR_SVG(got > 0) + `<span>${got} / ${ids.length}</span>` })),
        !on && key === nxLane ? h('span', { class: 'mtag' }, '다음') : null);
      onPress(t, e => { if (lane === key) return; lane = picked = key; draw(); if (e.type === 'keydown') tabs.querySelector('.mtab.on')?.focus(); });
      return t;
    }));
    const L = LANES[lane], ids = laneIds(lane, list);
    const { big, small } = splitLane(ids, { band, prog, next: nx });
    const num = id => ids.indexOf(id) + 1;
    panel.style.setProperty('--a', `var(--${L.friend})`);
    panel.style.setProperty('--a-t', `var(--${L.friend}-t)`);
    panel.setAttribute('aria-label', L.name);
    // 칸이 적어 판 아래가 비면 그 갈래 친구가 오른쪽 아래에 서 있음(꾸밈 · 누르지 않음) — 큰 줄 172 · 작은 줄 74 · '다른 놀이' 머리 60(px 어림)
    const br = Math.ceil(big.length / COLS), sr = Math.ceil(small.length / COLS);
    const roomy = br * 172 + (sr ? 60 + sr * 74 : 0) <= 330;
    panel.replaceChildren(...[
      h('div', { class: 'mbig' + (br > 3 ? ' dense' : '') }, ...big.map(id => node(id, num(id)))),
      small.length ? h('div', { class: 'mmore' }, h('p', { class: 'mmore-t' }, '다른 놀이'), h('div', { class: 'mchips' }, ...small.map(id => chip(id, num(id))))) : null,
      roomy ? h('div', { class: 'mfriend', 'aria-hidden': 'true' }, friendImg(L.friend, 'idle', { label: false })) : null,
    ].filter(Boolean));
    shown.add(lane);
  }
  draw();
  root.append(wrap);
}
