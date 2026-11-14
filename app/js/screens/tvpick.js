// TV로 다같이 — 선생님이 TV 하나로 반 전체 수업을 열 칸을 고른다(학년과 상관없이 아무 칸이나 · 계획서 '선생님과 다같이')
//  방 번호 다같이(docs/room.md): 위 '방 열기' → 머리띠 오른쪽 '방 1234'(크게) + '들어온 기기 n대' · 처음 열면 TV에 방 번호를 크게
//   방 정보는 이 기기에 저장(12시간 안이면 다시 와도 같은 방) · '방 닫기'는 이 기기에서만 잊음
import { h, onPress } from '../util.js';
import { friendImg } from '../band.js';
import { LANES, ORDER, cellById, cellName, STD_NOTE, PLAY_STD } from '../../../engine/cells.js';
import { TV_STEPS } from '../../../engine/tvscript.js';
import * as room from '../room.js';
import { stdEl } from '../cellkit.js';

export default function mount(root, ctx) {
  // 줄 넷 — 거북 줄은 갈래 둘(악보 + 형식·화음 · 11-14 형1 · 화1)을 한 줄에. 줄을 하나 더 두면 1366×768에서 넘친다
  //  ⚠ 셈여림·빠르기(곰) 두 칸은 이 화면에 아직 없다(높이가 모자람) — 찾아 쓰기의 'TV' 단추로 연다
  const rows = [['sound'], ['melody'], ['rhythm'], ['score', 'meet']];
  const band = ctx.device.band;                               // 1~2학년 판(band low)이면 칸 이름이 쉬운 말
  const ctl = h('div', { class: 'tvroomctl' });
  const big = h('div', { class: 'overlay rbigwrap', hidden: true });
  const wrap = h('div', { class: 'tvpick' },
    h('div', { class: 'tvhead' },
      h('div', { class: 'tvhead-t' },
        h('h1', {}, 'TV로 다같이 — 오늘 열 놀이를 골라요'),
        h('p', {}, `한 놀이는 ${TV_STEPS.map(s => s.name).join(' → ')} 차례예요. 아이들은 몸으로 답하고, 선생님이 대신 눌러요. 단계마다 그대로 읽어도 되는 발문이 아래에 떠요.`),
        // 칸 ↔ 성취기준(선생님 화면만 · 성취기준 점검 11-08)
        h('p', { class: 'tvstd-note' }, `놀이 아래 = 성취기준(${STD_NOTE}) · 곡 바꾸기 `, stdEl(PLAY_STD))),
      ctl),
    ...rows.map(lanes => h('div', { class: 'tvrow', style: { '--a-t': `var(--${LANES[lanes[0]].friend}-t)` } },
      h('div', { class: 'mlane' + (lanes.length > 1 ? ' two' : '') }, friendImg(LANES[lanes[0]].friend, 'face', { label: false }), h('b', {}, ...lanes.map(lane => h('span', {}, LANES[lane].name)))),
      h('div', { class: 'tvcells' + ((n => (n > 7 ? ' dense crowd' : n > 6 ? ' dense' : ''))(lanes.reduce((n, lane) => n + ORDER.filter(id => cellById(id).lane === lane).length, 0))) },   /* 여덟 칸 넘는 줄 = 옆으로 밀어 보기(11-14 · 칸이 늘어 1366×768에서 넘침 — 줄 늘리기 전 임시) */ ...lanes.flatMap((lane, li) => ORDER.filter(id => cellById(id).lane === lane).map((id, k) => {
        const c = cellById(id);
        const b = h('button', { type: 'button', class: 'tvcell' + (li && !k ? ' gap' : '') }, h('small', {}, `${LANES[lane].name} ${k + 1}`), cellName(c, band),   /* 지도와 같은 번호(평가 3차) */
          c.std ? stdEl(c.std, 'tvstd') : null);
        onPress(b, () => ctx.go('tvcell/' + id));
        return b;
      }))))),
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
    if (await room.codeChanged()) { busy = false; if (gone) return; msg = '앱이 새로 바뀌었어요 — 새로 고친 뒤 열어요'; draw(); const re = h('button', { type: 'button', class: 'go' }, '새로 고치기'); onPress(re, () => location.reload()); ctl.append(re); return; }   // TV와 아이 기기를 같은 판으로(X3)
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
