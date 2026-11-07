// 음악 마을 지도 — 갈래 넷(소리 · 가락 · 박·리듬 · 악보)의 첫 판 13칸. 잠그지 않음 · 추천 다음 칸만 크게
import { h, onPress, lsGet } from '../util.js';
import { friendImg } from '../band.js';
import { CELLS, LANES, ORDER, cellById, nextCell } from '../../../engine/cells.js';
import { getProg, STAR_SVG } from '../cellkit.js';

const ROWS = ['sound', 'melody', 'rhythm', 'score'];

export default function mount(root, ctx) {
  const prog = getProg();
  const nx = nextCell(prog, lsGet('startCell', undefined));
  const rows = ROWS.map(lane => {
    const ids = ORDER.filter(id => cellById(id).lane === lane);
    const L = LANES[lane];
    return h('div', { class: 'mrow', style: { '--a': `var(--${L.friend})`, '--a-t': `var(--${L.friend}-t)` } },
      h('div', { class: 'mlane' }, friendImg(L.friend, 'face', { label: false }), h('b', {}, L.name)),
      h('div', { class: 'mpath' }, ...ids.map((id, k) => {
        const c = cellById(id), st = prog[id] ? prog[id].stars : 0;
        const btn = h('button', { type: 'button', class: 'mnode' + (st >= 1 ? ' done' : '') + (id === nx ? ' next' : ''), 'aria-label': `${c.name}${st ? ` · 별 ${st}` : ''}${id === nx ? ' · 다음 칸' : ''}` },
          id === nx ? h('span', { class: 'mtag' }, '다음') : null,
          h('span', { class: 'mdot' }, String(k + 1)),
          h('span', { class: 'mname' }, c.name),
          h('span', { class: 'mstars', html: [0, 1, 2].map(i => STAR_SVG(i < st)).join('') }));
        onPress(btn, () => ctx.go(c.route || 'cell/' + id));
        return btn;
      })));
  });
  root.append(h('div', { class: 'map' }, ...rows));
  void CELLS;
}
