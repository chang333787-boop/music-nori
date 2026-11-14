// TV로 다같이 — 선생님이 TV 하나로 반 전체 수업을 열 칸을 고른다(학년과 상관없이 아무 칸이나 · 계획서 '선생님과 다같이')
//  방 번호 다같이(docs/room.md): 위 '방 열기' → 머리띠 오른쪽 '방 1234'(크게) + '들어온 기기 n대' · 처음 열면 TV에 방 번호를 크게
//   방 정보는 이 기기에 저장(12시간 안이면 다시 와도 같은 방) · '방 닫기'는 이 기기에서만 잊음
import { h, onPress, lsGet, lsSet } from '../util.js';
import { friendImg } from '../band.js';
import { LANES, cellById, cellName, STD_NOTE, PLAY_STD } from '../../../engine/cells.js';
import { TV_STEPS } from '../../../engine/tvscript.js';
import * as room from '../room.js';
import { stdEl } from '../cellkit.js';
import { LANE_ORDER, cellList, laneIds, wrapName } from './map.js';

// 갈래 띠(친구 얼굴 · 갈래 이름 · 놀이 수) → 고른 갈래의 모든 만든 칸(곰 갈래까지 · 학년 띠와 상관없이) · 칸마다 번호(지도와 같은 번호) · 이름 · 성취기준
//  칸이 늘어도 한 화면(4칸씩 네 줄 = 한 갈래 16칸까지 · 넘으면 5칸씩) — 시험은 주소 꼬리 ?allcells=1(장부 ORDER_ALL 52칸)
//  고른 갈래는 이 기기에 저장(놀이를 열었다 돌아와도 그 갈래)
export default function mount(root, ctx) {
  const band = ctx.device.band;                               // 1~2학년 판(band low)이면 칸 이름이 쉬운 말
  const list = cellList();
  const lanes = LANE_ORDER.filter(key => laneIds(key, list).length);
  let lane = lanes.includes(lsGet('tv.lane', null)) ? lsGet('tv.lane', null) : lanes[0];
  const ctl = h('div', { class: 'tvroomctl' });
  const big = h('div', { class: 'overlay rbigwrap', hidden: true });
  const tabs = h('div', { class: 'tvtabs', role: 'tablist', 'aria-label': '갈래' });
  const panel = h('div', { class: 'tvpanel', role: 'tabpanel' });
  const wrap = h('div', { class: 'tvpick' },
    h('div', { class: 'tvhead' },
      h('div', { class: 'tvhead-t' },
        h('h1', {}, '오늘 열 놀이를 골라요', h('span', {}, ` — 한 놀이는 ${TV_STEPS.map(s => s.name).join(' → ')} 차례예요.`)),
        h('p', {}, '아이들은 몸으로 답하고, 선생님이 대신 눌러요. 단계마다 그대로 읽어도 되는 발문이 아래에 떠요.'),
        // 칸 ↔ 성취기준(선생님 화면만 · 성취기준 점검 11-08)
        h('p', { class: 'tvstd-note' }, `놀이 아래 = 성취기준(${STD_NOTE}) · 곡 바꾸기 `, stdEl(PLAY_STD))),
      ctl),
    tabs, panel, big);
  root.append(wrap);

  function drawCells() {
    tabs.replaceChildren(...lanes.map(key => {
      const L = LANES[key], on = key === lane;
      const t = h('button', { type: 'button', role: 'tab', class: 'tvtab' + (on ? ' on' : ''), 'aria-selected': on ? 'true' : 'false', 'data-lane': key, style: { '--a-t': `var(--${L.friend}-t)` }, 'aria-label': `${L.name} · 놀이 ${laneIds(key, list).length}` },
        friendImg(L.friend, 'face', { label: false }), h('b', {}, L.name), h('span', { class: 'tvtab-n' }, String(laneIds(key, list).length)));
      onPress(t, e => { if (lane === key) return; lane = key; lsSet('tv.lane', key); drawCells(); if (e.type === 'keydown') tabs.querySelector('.tvtab.on')?.focus(); });
      return t;
    }));
    const L = LANES[lane], ids = laneIds(lane, list);
    panel.style.setProperty('--a-t', `var(--${L.friend}-t)`);
    panel.setAttribute('aria-label', L.name);
    panel.replaceChildren(h('div', { class: 'tvcells' + (ids.length > 16 ? ' dense' : '') }, ...ids.map((id, k) => {
      const c = cellById(id), name = cellName(c, band);
      const b = h('button', { type: 'button', class: 'tvcell', 'data-cell': id, 'aria-label': `${L.name} ${k + 1} · ${name}` },
        h('span', { class: 'tvno' }, String(k + 1)),   /* 지도와 같은 번호(평가 3차) */
        h('span', { class: 'tvname' }, wrapName(name)),
        c.std ? stdEl(c.std, 'tvstd') : null);
      onPress(b, () => ctx.go('tvcell/' + id));
      return b;
    })));
  }
  drawCells();

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
