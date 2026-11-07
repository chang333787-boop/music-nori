// TV로 다같이 — 선생님이 TV 하나로 반 전체 수업을 열 칸을 고른다(학년과 상관없이 아무 칸이나 · 계획서 '선생님과 다같이')
import { h, onPress } from '../util.js';
import { friendImg } from '../band.js';
import { LANES, ORDER, cellById } from '../../../engine/cells.js';
import { TV_STEPS } from '../../../engine/tvscript.js';

export default function mount(root, ctx) {
  const lanes = ['sound', 'melody', 'rhythm', 'score'];
  root.append(h('div', { class: 'tvpick' },
    h('div', { class: 'tvhead' },
      h('h1', {}, 'TV로 다같이 — 오늘 열 놀이를 골라요'),
      h('p', {}, `한 놀이는 ${TV_STEPS.map(s => s.name).join(' → ')} 차례예요. 아이들은 몸으로 답하고, 선생님이 대신 눌러요. 단계마다 그대로 읽어도 되는 발문이 아래에 떠요.`)),
    ...lanes.map(lane => h('div', { class: 'tvrow', style: { '--a-t': `var(--${LANES[lane].friend}-t)` } },
      h('div', { class: 'mlane' }, friendImg(LANES[lane].friend, 'face', { label: false }), h('b', {}, LANES[lane].name)),
      h('div', { class: 'tvcells' }, ...ORDER.filter(id => cellById(id).lane === lane).map(id => {
        const c = cellById(id);
        const b = h('button', { type: 'button', class: 'tvcell' }, h('small', {}, c.label), c.name);
        onPress(b, () => ctx.go('tvcell/' + id));
        return b;
      }))))));
}
