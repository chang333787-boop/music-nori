// TV로 다같이 — 선생님이 TV 하나로 반 전체 수업을 열 칸을 고른다(학년과 상관없이 아무 칸이나 · 계획서 '선생님과 다같이')
//  방 번호 다같이(docs/room.md): 위 '방 열기' → 머리띠 오른쪽 '방 1234'(크게) + '들어온 기기 n대' · 처음 열면 TV에 방 번호를 크게
//   방 정보는 이 기기에 저장(12시간 안이면 다시 와도 같은 방) · '방 닫기'는 이 기기에서만 잊음
import { h, onPress } from '../util.js';
import { friendImg } from '../band.js';
import { LANES, ORDER, cellById } from '../../../engine/cells.js';
import { TV_STEPS } from '../../../engine/tvscript.js';
import * as room from '../room.js';

export default function mount(root, ctx) {
  const lanes = ['sound', 'melody', 'rhythm', 'score'];
  const ctl = h('div', { class: 'tvroomctl' });
  const big = h('div', { class: 'overlay rbigwrap', hidden: true });
  const wrap = h('div', { class: 'tvpick' },
    h('div', { class: 'tvhead' },
      h('div', { class: 'tvhead-t' },
        h('h1', {}, 'TV로 다같이 — 오늘 열 놀이를 골라요'),
        h('p', {}, `한 놀이는 ${TV_STEPS.map(s => s.name).join(' → ')} 차례예요. 아이들은 몸으로 답하고, 선생님이 대신 눌러요. 단계마다 그대로 읽어도 되는 발문이 아래에 떠요.`)),
      ctl),
    ...lanes.map(lane => h('div', { class: 'tvrow', style: { '--a-t': `var(--${LANES[lane].friend}-t)` } },
      h('div', { class: 'mlane' }, friendImg(LANES[lane].friend, 'face', { label: false }), h('b', {}, LANES[lane].name)),
      h('div', { class: 'tvcells' }, ...ORDER.filter(id => cellById(id).lane === lane).map(id => {
        const c = cellById(id);
        const b = h('button', { type: 'button', class: 'tvcell' }, h('small', {}, c.label), c.name);
        onPress(b, () => ctx.go('tvcell/' + id));
        return b;
      })))),
    big);
  root.append(wrap);

  let gone = false, busy = false, count = null, poll = null, msg = '', net = true;
  const countText = () => (!net ? '연결 끊김 — 다시 잇는 중' : count == null ? '들어온 기기 확인 중' : `들어온 기기 ${count}대`);

  // 방 번호를 TV에 크게 — 아이들이 자기 기기에 따라 누르게
  function showBig() {
    const t = room.teacher.get();
    if (!t) { big.hidden = true; return; }
    const ok = h('button', { type: 'button', class: 'go big' }, '놀이 고르기');
    onPress(ok, () => { big.hidden = true; });
    big.replaceChildren(h('div', { class: 'panelcard rbig' },
      h('p', { class: 'rbig-k' }, '방 번호'),
      h('div', { class: 'rbig-no' }, ...t.room.split('').map(d => h('span', {}, d))),
      h('p', { class: 'rbig-how' }, '내 기기 처음 화면 → 오른쪽 위 ', h('b', {}, '방 번호'), ' → 이 숫자 넷'),
      h('p', { class: 'rbig-cnt' }, countText()),
      ok));
    big.hidden = false;
  }
  function draw() {
    if (gone) return;
    const t = room.teacher.get();
    if (!t) {
      const b = h('button', { type: 'button', class: 'roomopen', disabled: busy }, busy ? '방 여는 중…' : '방 열기');
      onPress(b, openRoom);
      ctl.replaceChildren(h('span', { class: 'tvroom-hint' }, msg || '아이 기기와 함께하려면'), b);
      ctx.bar.right(null);
      return;
    }
    const close = h('button', { type: 'button', class: 'roomclose' }, '방 닫기');
    onPress(close, () => { room.teacher.close(); stopPoll(); count = null; big.hidden = true; draw(); });
    ctl.replaceChildren(close);
    const chip = h('button', { type: 'button', class: 'troomchip', 'aria-label': `방 ${t.room} — 크게 보기` }, h('b', {}, `방 ${t.room}`), h('small', {}, countText()));
    onPress(chip, showBig);
    ctx.bar.right(chip);
    if (!big.hidden) { const c = big.querySelector('.rbig-cnt'); if (c) c.textContent = countText(); }
  }
  async function openRoom() {
    if (busy) return;
    busy = true; msg = ''; draw();
    const r = await room.teacher.open();
    busy = false;
    if (gone) return;
    if (!r.ok) msg = r.why === 'net' ? '인터넷이 안 돼요 — 다시 눌러 봐요' : '방을 못 열었어요 — 다시 눌러 봐요';
    draw();
    if (r.ok) { startPoll(); showBig(); }
  }
  function startPoll() {
    stopPoll();
    poll = room.loop(async () => {
      const r = await room.teacher.res();
      if (gone) return;
      const was = [count, net].join();
      net = !!r.net;
      if (r.ok) count = r.list.length;
      if ([count, net].join() !== was) draw();             // 바뀐 것만 다시 그림
    }, room.TV_TICK);
  }
  function stopPoll() { if (poll) { poll.stop(); poll = null; } }

  draw();
  if (room.teacher.get()) startPoll();
  return () => { gone = true; stopPoll(); };
}
