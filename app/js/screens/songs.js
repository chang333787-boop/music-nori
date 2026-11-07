// 곡 보기 — 곡 대장에 오른 곡만 보인다. 듣기 · 오선 악보(지금 음 표시) · 권리 근거 한 줄.
//  옮겨 온 RPG 오선 그리기(notation.js)가 새 곡 모양(틱)을 제대로 그리는지 보는 화면이기도 하다.
import { h, onPress } from '../util.js';
import { Player } from '../audio.js';
import { renderStaff } from '../notation.js';
import { makeSong, toEvents, toStaffSong } from '../../../engine/song.js';

const INSTS = [['piano', '피아노'], ['xylo', '실로폰'], ['recorder', '리코더'], ['flute', '플루트']];
const KIND_NAME = { '자작': '새로 지은 곡', '외국 전래': '여러 나라 옛 노래', '클래식': '클래식 주제', '국내 전래': '우리 전래 노래' };

export default function mount(root, ctx) {
  const { engine } = ctx;
  let SONGS = [], LEDGER = [], cur = null, player = null, raf = 0, inst = 'piano', staffEls = null, staffSong = null;
  const list = h('div', { class: 'songlist', role: 'list' });
  const view = h('div', { class: 'songview' });
  root.append(h('div', { class: 'songs' }, list, view));

  const ledgerOf = id => LEDGER.find(r => r.id === id);
  function stop() {
    if (player) player.stop();
    player = null;
    cancelAnimationFrame(raf);
    if (staffEls) for (const els of staffEls.values()) for (const el of els) el.classList.remove('now');
  }
  function show(def) {
    stop();
    cur = makeSong(def);
    list.querySelectorAll('button').forEach(b => b.setAttribute('aria-current', String(b.dataset.id === def.id)));
    const row = ledgerOf(def.id) || {};
    staffSong = toStaffSong(cur);
    // 좁게(두 마디씩) 그려 화면 폭으로 늘림 — 줄 간격 · 계이름이 약 두 배(평가 3차: 앱에서 가장 작은 글씨였음)
    const staff = renderStaff(staffSong, { width: 700, barsPerLine: 2, chords: false });
    staff.el.removeAttribute('width'); staff.el.removeAttribute('height');
    staffEls = staff.noteEls;
    const playBtn = h('button', { type: 'button', class: 'go' }, '듣기');
    const instSeg = h('div', { class: 'choice', role: 'group', 'aria-label': '악기' },
      ...INSTS.map(([k, n]) => h('button', { type: 'button', 'aria-pressed': String(k === inst), 'data-k': k, onclick: () => { inst = k; instSeg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k))); } }, n)));
    onPress(playBtn, () => { if (player && player.playing) { stop(); playBtn.textContent = '듣기'; } else { play(); playBtn.textContent = '멈추기'; } });
    const m = row.melody || {};
    const ed = row.edition;
    const meter = (def.meter || [4, 4]).join('/');
    view.replaceChildren(
      h('h2', {}, def.title),
      h('p', { class: 'meta' }, `${meter}박자 · ${def.use || ''}`),
      ...(cur.errors.length ? [h('p', { class: 'warn' }, '마디 검사: ' + cur.errors.join(' / '))] : []),
      h('div', { class: 'row' }, playBtn, instSeg),
      h('div', { class: 'staffbox' }, staff.el),
      h('details', { class: 'rights' }, h('summary', {}, '이 곡을 써도 되는 까닭'),
        h('p', {}, `가락: ${m.who || '?'} — ${m.verdict || '대장에 없음'}${m.why ? ' (' + m.why + ')' : ''} · 미국 기준: ${m.us || '?'} · 노랫말: 넣지 않음`
          + (ed ? ` · 판본 대조: ${ed.checked ? '함' : '아직(공개 전에 할 일)'}` : '') + (row.made ? ` · 새로 지은 곡: ${row.made.skeleton || ''}` : ''))));
    playBtn.dataset.role = 'play';
  }
  function play() {
    stop();
    const ac = engine.ensure();
    const { events, total, sec } = toEvents(cur, { inst });
    player = new Player(engine);
    const onEnd = () => { const b = view.querySelector('[data-role=play]'); if (b) b.textContent = '듣기'; stop(); };
    const t0 = player.start(events, { total, onEnd });
    // 지금 소리 나는 음을 노랗게 — 오선 음 번호 = 소리 나는 음 차례
    const starts = events.map(e => e.t), lens = events.map(e => e.d / 0.92);
    let last = -1;
    const tick = () => {
      const t = ac.currentTime - t0;
      let i = -1;
      for (let k = 0; k < starts.length; k++) { if (starts[k] <= t && t < starts[k] + lens[k]) { i = k; break; } }
      if (i !== last && staffEls) {
        if (last >= 0) (staffEls.get(last) || []).forEach(el => el.classList.remove('now'));
        if (i >= 0) (staffEls.get(i) || []).forEach(el => el.classList.add('now'));
        last = i;
      }
      if (player && player.playing) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    void sec;
  }

  (async () => {
    try {
      ({ SONGS } = await import('../../../engine/songs/index.js'));
      ({ LEDGER } = await import('../../../engine/songs/ledger.js'));
    } catch (e) {
      view.replaceChildren(h('h2', {}, '곡 대장을 만드는 중이에요'), h('p', { class: 'muted' }, '곡 대장(engine/songs)이 준비되면 여기에 보여요.'));
      return;
    }
    const KIND_ORDER = ['자작', '외국 전래', '클래식', '국내 전래'];
    const groups = new Map();
    for (const s of SONGS) { const k = (ledgerOf(s.id) || {}).kind || '기타'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(s); }
    for (const k of [...KIND_ORDER, ...groups.keys()].filter((x, i, a) => groups.has(x) && a.indexOf(x) === i)) {
      list.append(h('div', { class: 'grp' }, `${KIND_NAME[k] || k}`));
      for (const s of groups.get(k)) list.append(h('button', { type: 'button', role: 'listitem', 'data-id': s.id, onclick: () => show(s) }, s.title));
    }
    const want = ctx.args && ctx.args[0];
    show(SONGS.find(s => s.id === want) || SONGS[0]);
  })();

  return () => stop();
}
