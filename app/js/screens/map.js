// 음악 마을 지도 — 갈래 여섯(소리 · 가락 · 박·리듬 · 악보 · 형식·화음 · 셈여림·빠르기)의 첫 판 21칸(박·리듬 길 끝 = 장1 장단보 · 국악 첫걸음). 잠그지 않음 · 추천 다음 칸만 크게
import { h, onPress, lsGet, lsSet } from '../util.js';
import { friendImg } from '../band.js';
import { CELLS, LANES, ORDER, cellById, nextCell, cellName } from '../../../engine/cells.js';
import { getProg, STAR_SVG } from '../cellkit.js';

const ROWS = ['sound', 'melody', 'rhythm', 'score', 'meet', 'any'];   // meet = 형식·화음(거북 · 11-14 형1 · 화1) · any = 곰 갈래(셈여림·빠르기) — 11-08 셈1 · 11-10 빠1
// 곰 줄 끝 한 줄 — 아직 첫 판에 없는 셈여림 · 빠르기 칸 이름(지금 = 셈여림의 변화 · 빠르기의 변화 · 첫 판에 들면 저절로 빠짐)
const LATER = CELLS.filter(c => c.lane === 'any' && !c.first && /^(sem|ppa)\d/.test(c.id)).map(c => c.name);

export default function mount(root, ctx) {
  const prog = getProg();
  const nx = nextCell(prog, lsGet('startCell', undefined));
  const band = ctx.device.band;                               // 1~2학년 판(band low)이면 칸 이름이 쉬운 말
  // 새로 별을 받은 칸 — 한 번 반짝(지난번 지도에서 본 칸과 견줌 · 처음 열면 반짝 없음)
  const doneIds = ORDER.filter(id => prog[id] && prog[id].stars >= 1), seen = lsGet('map.seen', null);
  const fresh = new Set(seen ? doneIds.filter(id => !seen.includes(id)) : []);
  lsSet('map.seen', doneIds);
  const rows = ROWS.map(lane => {
    const ids = ORDER.filter(id => cellById(id).lane === lane);
    const L = LANES[lane];
    return h('div', { class: 'mrow' + (ids.length > 6 ? ' dense' : ''), style: { '--a': `var(--${L.friend})`, '--a-t': `var(--${L.friend}-t)` } },
      h('div', { class: 'mlane' }, friendImg(L.friend, 'face', { label: false }), h('b', {}, L.name)),
      h('div', { class: 'mpath' }, ...ids.map((id, k) => {
        const c = cellById(id), st = prog[id] ? prog[id].stars : 0, name = cellName(c, band);
        const btn = h('button', { type: 'button', class: 'mnode' + (st >= 1 ? ' done' : '') + (id === nx ? ' next' : '') + (fresh.has(id) ? ' fresh' : ''), 'aria-label': `${name}${st ? ` · 별 ${st}` : ''}${id === nx ? ' · 다음 칸' : ''}` },
          id === nx ? h('span', { class: 'mtag' }, '다음') : null,
          h('span', { class: 'mdot' }, String(k + 1)),
          h('span', { class: 'mname' }, ids.length > 6 ? name.replace(/·/g, '·\u200b') : name),   /* 좁은 줄은 가운뎃점 뒤에서 줄이 바뀌게 */
          h('span', { class: 'mstars', html: [0, 1, 2].map(i => STAR_SVG(i < st)).join('') }));
        onPress(btn, () => ctx.go(c.route || 'cell/' + id));
        return btn;
      }), lane === 'any' && LATER.length ? h('span', { class: 'mlater' }, `${LATER.join(' · ')}는 다음에 열려요`) : null));
  });
  root.append(h('div', { class: 'map' }, ...rows));
}
