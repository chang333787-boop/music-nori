// 방 들어가기 — #/join (방 번호 다같이 · docs/room.md 화면 3)
//  한 화면에 할 일 하나: 방 번호 네 자리(큰 숫자 판) → 내 번호(1~30) → 짝꿍 친구 → '들어가기' → 대기 화면
//  이름 · 얼굴 X — 번호와 동물 그림만. 방에 들어가 있으면 바로 대기 화면(선생님이 놀이를 고르면 저절로 열림)
import { h, onPress } from '../util.js';
import { BAND, friendImg, preload } from '../band.js';
import { cellById } from '../../../engine/cells.js';
import * as room from '../room.js';

const STEPS = [['room', '방 번호'], ['no', '내 번호'], ['pal', '짝꿍']];

export default function mount(root, ctx) {
  const { bar } = ctx;
  preload(BAND.map(f => [f.key, 'face']).concat(BAND.map(f => [f.key, 'play'])));
  const box = h('div', { class: 'join' });
  root.append(box);
  let step = 'room', digits = '', no = 0, pal = -1, msg = '', busy = false, gone = false;
  const offs = [];

  const steps = () => h('span', { class: 'steps labeled' }, ...STEPS.map(([k, name], i) => {
    const at = STEPS.findIndex(s => s[0] === step);
    return h('span', { class: 'st' + (i < at ? ' done' : '') + (i === at ? ' now' : '') }, h('span', { class: 'd' }), name);
  }));
  // 고른 것 칩 — 누르면 그 단계로 돌아가 고침
  const picked = () => {
    const out = [];
    if (step !== 'room' && digits.length === 4) { const b = h('button', { type: 'button', class: 'jpick' }, h('small', {}, '방'), digits); onPress(b, () => to('room')); out.push(b); }
    if (step === 'pal' && no) { const b = h('button', { type: 'button', class: 'jpick' }, h('small', {}, '내 번호'), String(no)); onPress(b, () => to('no')); out.push(b); }
    return out.length ? h('div', { class: 'jpicked' }, ...out) : null;
  };
  function to(s) { step = s; draw(); }

  function draw() {
    if (gone) return;
    const k = room.kid.get();
    if (k) return drawWait(k);
    bar.title('방 들어가기');
    bar.mid(steps());
    if (step === 'room') drawRoom();
    else if (step === 'no') drawNo();
    else drawPal();
  }

  // 1. 방 번호 — 왼쪽 네 칸 + 오른쪽 숫자 판(0~9 · 지우기 · 다음)
  function drawRoom() {
    const cells = h('div', { class: 'jdigits', 'aria-label': '방 번호 ' + (digits || '비어 있음') },
      ...[0, 1, 2, 3].map(i => h('span', { class: 'jd' + (i === digits.length ? ' now' : '') }, digits[i] || '')));
    const next = h('button', { type: 'button', class: 'jkey jnext' + (digits.length === 4 ? ' go' : ''), disabled: digits.length !== 4 }, '다음');
    onPress(next, () => { if (digits.length === 4) to('no'); });
    const key = d => { const b = h('button', { type: 'button', class: 'jkey', 'data-d': d }, d); onPress(b, () => press(d)); return b; };
    const del = h('button', { type: 'button', class: 'jkey jdel', 'aria-label': '지우기' }, '지우기');
    onPress(del, () => press('del'));
    box.replaceChildren(h('div', { class: 'jroom' },
      h('div', { class: 'jleft' },
        h('h2', {}, '방 번호를 눌러요'),
        h('p', { class: 'jsub' }, 'TV에 뜬 숫자 넷'),
        cells,
        msg ? h('p', { class: 'jmsg', role: 'alert' }, msg) : h('p', { class: 'jmsg' }, '')),
      h('div', { class: 'jpad' }, ...'123456789'.split('').map(key), del, key('0'), next)));
  }
  function press(d) {
    if (step !== 'room') return;
    msg = '';
    if (d === 'del') digits = digits.slice(0, -1);
    else if (digits.length < 4) digits += d;
    drawRoom();
  }
  const onKey = e => {
    if (gone || step !== 'room' || room.kid.get() || document.querySelector('.rmodal')) return;
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); press(e.key); }
    else if (e.key === 'Backspace') { e.preventDefault(); press('del'); }
    else if (e.key === 'Enter' && digits.length === 4) { e.preventDefault(); to('no'); }
  };
  window.addEventListener('keydown', onKey);

  // 2. 내 번호 — 1~30 큰 단추(누르면 바로 다음)
  function drawNo() {
    box.replaceChildren(h('div', { class: 'jno' },
      h('div', { class: 'jhead' }, h('h2', {}, '내 출석 번호를 눌러요'), picked()),
      h('div', { class: 'jnogrid' }, ...Array.from({ length: 30 }, (_, i) => {
        const n = i + 1, b = h('button', { type: 'button', class: 'jnum', 'aria-pressed': n === no ? 'true' : 'false' }, String(n));
        onPress(b, () => { no = n; to('pal'); });
        return b;
      }))));
  }

  // 3. 짝꿍 친구 — 다섯 중 하나 → '들어가기'
  function drawPal() {
    const enter = h('button', { type: 'button', class: 'go huge jenter', disabled: pal < 0 || busy }, busy ? '들어가는 중…' : '들어가기');
    onPress(enter, doJoin);
    box.replaceChildren(h('div', { class: 'jpal' },
      h('div', { class: 'jhead' }, h('h2', {}, '짝꿍 친구를 골라요'), picked()),
      h('div', { class: 'jpals' }, ...BAND.map((f, i) => {
        const b = h('button', { type: 'button', class: 'jfr', 'aria-pressed': i === pal ? 'true' : 'false', style: { '--a-t': `var(--${f.key}-t)` } },
          friendImg(f.key, 'face', { label: false }), h('span', {}, f.name));
        onPress(b, () => { pal = i; drawPal(); });
        return b;
      })),
      h('div', { class: 'jfoot' }, msg ? h('p', { class: 'jmsg', role: 'alert' }, msg) : null, enter)));
  }
  async function doJoin() {
    if (busy || pal < 0 || !no || digits.length !== 4) return;
    busy = true; msg = ''; drawPal();
    if (await room.codeChanged()) {                   // 앱이 새로 올라왔으면 새로 고친 뒤 들어가기(TV와 같은 판으로 · X3)
      busy = false; if (gone) return;
      msg = '앱이 새로 바뀌었어요 — 새로 고친 뒤 들어가요';
      drawPal();
      const re = h('button', { type: 'button', class: 'go big jreload' }, '새로 고치기');
      onPress(re, () => location.reload());
      box.querySelector('.jfoot').replaceChildren(h('p', { class: 'jmsg', role: 'alert' }, msg), re);
      return;
    }
    const r = await room.kid.join(digits, no, pal);
    busy = false;
    if (gone) return;
    if (r.ok) { draw(); return; }
    if (r.why === 'net') { msg = '인터넷이 안 돼요 — 다시 눌러 봐요'; drawPal(); return; }
    msg = '방 번호를 다시 봐요'; step = 'room'; draw();
  }

  // 대기 화면 — 짝꿍 그림 · 방 번호 · 내 번호 · 나가기(선생님이 놀이를 고르면 저절로 열림)
  function drawWait(k) {
    const f = BAND[k.a] || BAND[0];
    bar.title('선생님과 다같이');
    bar.mid(null);
    const p = room.kid.last;
    const live = p && p.phase in { show: 1, follow: 1, game: 1 } && cellById(p.cell);
    const out = h('button', { type: 'button', class: 'jout' }, '방에서 나가기');
    onPress(out, () => { room.kid.leave(); ctx.go(''); });
    let goBtn = null;
    if (live) {
      const c = cellById(p.cell);
      goBtn = h('button', { type: 'button', class: 'go big' }, `선생님 놀이로 가기 — ${c.name}`);
      onPress(goBtn, () => ctx.go(c.route || `cell/${p.cell}/${p.phase}`));
    }
    box.replaceChildren(h('div', { class: 'jwait' },
      h('div', { class: 'jwait-art' }, friendImg(f.key, 'play', { label: false, cls: 'jwait-pal' })),
      h('div', { class: 'jwait-t' },
        h('h2', {}, live ? '선생님 놀이가 열려 있어요' : '선생님이 놀이를 고르면 바로 열려요'),
        h('div', { class: 'jtags' },
          h('span', { class: 'jtag' }, h('small', {}, '방'), k.room),
          h('span', { class: 'jtag' }, h('small', {}, '내 번호'), String(k.no)),
          h('span', { class: 'jtag' }, friendImg(f.key, 'face', { label: false }), f.name)),
        !room.kid.online ? h('p', { class: 'jmsg', role: 'status' }, '연결이 끊겼어요 — 다시 잇는 중') : null,
        h('div', { class: 'row jwait-acts' }, goBtn, out))));
  }
  offs.push(room.kid.on(() => { if (!busy) draw(); }));

  draw();
  return () => { gone = true; window.removeEventListener('keydown', onKey); offs.forEach(f => f()); };
}
