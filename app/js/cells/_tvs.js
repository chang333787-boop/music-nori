// 소리는 TV 하나 · 답은 각자(11-08 토론 T1 → X2에서 소4 밖으로) — 방이 열린 TV에서 TVS 칸(모듈이 `export const TVS = true`)의 확인 게임을 열면
//  TV: 판 시간표대로 소리를 틀고(아이 기기는 소리 X) · 판이 끝나면 '반이 고른 쪽' 비율 막대(수 X · 누가 골랐는지 X)와 맞는 자리
//  아이: 소리 없이 답 단추만 · 고르면 '답했어요'(고른 쪽을 가림 — 옆 친구가 따라 하지 않게) · 판이 끝나면 다 같이 맞는 자리
//  시간표 = 첫 판 시작(tvs.ready.start) + 앞 판들의 P 합 · 판 안에서 OPEN(답 열림) ~ CLOSE(닫힘) ms · 아무도 기다리지 않음 · 늦게 받은 판은 '시간 지남'
//  같은 씨앗(sd) → 같은 문항 표 차례(칸의 plan(sd)) → TV와 아이 기기가 같은 판. 판 답 글자 = res.ans(판마다 한 글자 · 'x' = 못 고름)
//
//  칸이 넘기는 것(S) — 문항 표 + '이 판 들려주기' + 답 단추 정의:
//   plan(sd) → 판 줄 배열(같은 sd면 같은 차례)
//   P · OPEN · CLOSE — ms(수 또는 줄 → 수). OPEN이 답에 따라 달라지면 화면으로 답이 샘 — 칸의 가장 긴 소리에 맞춰 고정하거나 화면에 이미 보이는 것(음 수 · ? 자리)에만 따르게
//   items — 답 단추 [{ key, label, chip, tv(TV 막대 이름), code(답 글자 · 없으면 A B C D), locked }] · answersOpt — kit.answers 셋째 인자
//   rightOf(줄) → 답 key(seq면 key 배열) · seq — 여러 번 누르는 답(가1 메아리): { code(keys) → 한 글자, text(keys) → '솔-미' }
//   setup(줄, A, k)? — 판마다 단추 이름 · 잠금 바꾸기(TV도 A를 가짐 — 막대 칸이 A의 잠금을 따름) · side(줄, key)? → { label, chip } TV 막대 칸 이름
//   view({ kidSide, V, T, side }) → { el(무대 전체 · side를 넣어 둠), item(줄, k), play(줄, at초)(TV만 · 소리 + TV 그림), tap?(i, key)(seq), close(줄, r, picked), done() }
//   intro?(V) — TV만 · 첫 판 2.6초 전 기준 소리 · say { kid, tv } · tip(plan, results, picks) · chance(plan) · wrongText?(줄)
import { voice } from './_snd.js';

(() => {
  if (typeof document === 'undefined' || document.querySelector('link[data-tvs]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = 'app/css/cells/_tvs.css'; l.dataset.tvs = '1';
  document.head.append(l);
})();

const num = (x, row) => (typeof x === 'function' ? x(row) : x);
// 판 시작 시각(ms · 첫 판 = 0) — 판마다 P가 달라도 같은 차례면 같은 시간표
export const tvsTimes = (plan, P) => { let t = 0; return plan.map(row => { const at = t; t += num(P, row); return at; }).concat(t); };

export function tvsGame(ui, kit, tvs, S) {
  const { h, engine } = kit;
  const T = kit.timers(), V = voice(engine), kidSide = tvs.role === 'kid', id = kit.cell.id;
  const results = [], ans = [], picks = [], openAt = [];   // openAt[k] = k번째 판에 열려 있던 단추(TV 막대는 지난 판을 그리므로 지금 잠금이 아니라 그 판 것을 씀)
  let plan = null, sd = null, cur = null, open = false, picked = null, taps = [], gone = false, offRes = null, lastBar = -1, tvsFinal = false, rowsNow = [];
  ui.say(kidSide ? S.say.kid : S.say.tv);
  const items = S.items;
  const A = kit.answers(items, k => pick(k), S.answersOpt);
  const codeOf = k => { const j = items.findIndex(it => it.key === k), it = items[j]; return (it && it.code) || 'ABCD'[j] || 'x'; };
  const rightCode = row => (S.seq ? S.seq.code(S.rightOf(row)) : codeOf(S.rightOf(row)));
  const nameOf = (row, k) => { const it = items.find(x => x.key === k); return (S.side && S.side(row, k).label) || (it && (it.tv || it.label)) || ''; };
  // TV — 답 자리에 비율 막대(판이 끝난 뒤 · 수 X) / 아이 — 답 단추
  const ratio = h('div', { class: 'tvs-ratio', hidden: true, 'aria-label': '반 전체가 고른 쪽' });
  const cap = h('small', { class: 'tvs-cap' }, '');
  const side = kidSide ? A.el : h('div', { class: 'tvs-side' }, ratio);
  const view = S.view({ kidSide, V, T, side });
  const wait = h('div', { class: 'overlay clear' }, h('div', { class: 'panelcard startcard' },
    h('h2', {}, kidSide ? 'TV를 봐요' : '아이 기기를 맞추는 중'),
    h('p', { class: 'sub' }, kidSide ? '소리는 TV에서 나요 — 곧 시작해요' : '5초 뒤에 첫 소리가 나요')));
  ui.stage.append(view.el, wait);
  ui.setBar();
  A.busy(true);
  tvs.ready.then(r => {
    if (gone) return;
    if (!r) { wait.querySelector('h2').textContent = '연결이 끊겼어요'; return; }
    sd = r.sd; plan = S.plan(sd);
    const at = tvsTimes(plan, S.P), now = performance.now(), endAt = r.start + at[plan.length];
    if (endAt < now) { wait.querySelector('h2').textContent = '이번 판은 이미 끝났어요'; wait.querySelector('.sub').textContent = '선생님이 다음 판을 열면 같이 해요'; return; }
    T.after(Math.max(0, r.start - now - 1500), () => { wait.querySelector('.sub').textContent = '곧 시작해요'; });
    if (!kidSide && S.intro && r.start - now > 2700) T.after(r.start - now - 2600, () => { if (!gone) S.intro(V); });
    plan.forEach((_, k) => T.after(Math.max(0, r.start + at[k] - now), () => item(k, r.start + at[k])));
    T.after(Math.max(0, endAt - now + 300), end);
    window.__tvs = { role: tvs.role, sd, start: r.start, cell: id };
  });
  if (!kidSide) offRes = kit.onRes((list, g) => { rowsNow = list.filter(row => row.c === id && typeof row.ans === 'string' && (row.at || 0) >= (g || 0)); drawRatio(); });
  // 자동 시험: 아이 기기가 맞는 답(seq면 다음 음)
  kit.setAuto(() => {
    if (!kidSide || !open || picked != null || !cur) return;
    const want = S.rightOf(cur.row);
    pick(S.seq ? want[taps.length] : want);
  });

  function item(k, at) {
    if (gone) return;
    wait.remove();
    const late = performance.now() - at;                // 늦게 받으면(탭이 잠깐 숨는 등) 그만큼 당겨서
    const row = plan[k], OPEN = num(S.OPEN, row), CLOSE = num(S.CLOSE, row);
    cur = { k, row }; picked = null; taps = []; open = false;
    ui.count(k + 1, plan.length);
    A.clear(); A.el.classList.remove('answered'); A.busy(true);
    if (S.setup) S.setup(row, A, k);
    openAt[k] = items.filter(it => !A.btn(it.key).classList.contains('locked')).map(it => it.key);
    view.item(row, k);
    if (!kidSide && late < OPEN) view.play(row, Math.max(0.02, 0.3 - late / 1000));
    //  답이 열릴 때 앞 판 판정 말('맞아요' · 1.6초)이 남아 있으면 지움 — 이번 판을 판정한 것처럼 보이지 않게
    T.after(Math.max(0, OPEN - late), () => { if (gone || cur.k !== k) return; open = true; if (kidSide) { ui.tell(null); A.busy(false); A.timer((CLOSE - Math.max(late, OPEN)) / 1000); } });
    T.after(Math.max(0, CLOSE - late), () => close(k));
  }
  function pick(key) {
    if (!open || picked != null || !kidSide) return;
    const b = A.btn(key);
    if (!b || b.classList.contains('locked')) return;
    if (S.seq) {                                        // 여러 번 누르는 답 — 다 누르면 '답했어요'
      taps.push(key);
      if (view.tap) view.tap(taps.length - 1, key);
      if (taps.length < S.rightOf(cur.row).length) return;
      picked = taps.slice();
    } else picked = key;
    A.el.classList.add('answered');                     // 고른 쪽을 가림 — '답했어요'만
    ui.tell('답했어요', 'info', 1200);
  }
  function close(k) {
    if (gone || !cur || cur.k !== k) return;
    open = false; A.timer(0); A.busy(true); A.el.classList.remove('answered');
    const row = cur.row, want = S.rightOf(row);
    const r = picked == null ? null : S.seq ? picked.join() === want.join() : picked === want;
    results.push(r); picks.push(picked); ans.push(picked == null ? 'x' : S.seq ? S.seq.code(picked) : codeOf(picked));
    view.close(row, r, picked);
    if (kidSide) {
      if (!S.seq) { A.mark(want, 'right'); if (picked != null && !r) A.btn(picked).classList.add('wrong'); }
      const miss = S.wrongText ? S.wrongText(row) : '이번엔 ' + (S.seq ? S.seq.text(want) : nameOf(row, want));
      ui.tell(r ? '맞아요' : r === false ? miss : '시간이 지났어요', r ? 'good' : 'oops', 1600);
      kit.sendAns(ans.join(''));
    } else {
      lastBar = k; drawRatio();
    }
  }
  // TV 막대 칸 — seq면 '같게 · 다르게' 둘 · 아니면 그 판(k)에 열렸던 단추마다 하나
  function sidesOf(row, k) {
    if (S.seq) return [{ label: '같게', match: c => c === rightCode(row), want: true }, { label: '다르게', match: c => c !== rightCode(row), want: false }];
    const want = S.rightOf(row);
    return items.filter(it => (openAt[k] || []).includes(it.key)).map(it => {
      const sd2 = S.side ? S.side(row, it.key) : null, c = codeOf(it.key);
      const chip = sd2 ? sd2.chip : it.chip && it.chip.nodeType ? it.chip.cloneNode(true) : it.chip;
      return { label: sd2 ? sd2.label : it.tv || it.label, chip, match: x => x === c, want: it.key === want };
    });
  }
  // TV — 방금 끝난 판에서 아이들이 고른 쪽 비율(수 X) · 답이 아직 안 모였으면 막대를 비워 둠
  //  칸 둘 = 한 막대를 둘로 나눔(소4 모양) · 셋 이상 = 칸마다 막대 한 줄
  function drawRatio() {
    if (kidSide || lastBar < 0 || !plan) return;
    const row = plan[lastBar], sides = sidesOf(row, lastBar);
    const n = sides.map(s => rowsNow.reduce((a, rw) => { const c = rw.ans[lastBar]; return a + (c && c !== 'x' && s.match(c) ? 1 : 0); }, 0));
    const t = n.reduce((a, b) => a + b, 0);
    const lab = (s, j) => h('span', { class: 'tvs-lab' + (s.want ? ' want' : '') }, s.chip ? h('span', { class: 'tvs-chip', ...(s.chip.nodeType ? {} : { html: s.chip }) }, ...(s.chip.nodeType ? [s.chip] : [])) : null, s.label);
    ratio.classList.toggle('rows', sides.length > 2);
    ratio.classList.toggle('empty', !t);
    if (sides.length === 2) {
      const bar = h('span', { class: 'tvs-bar' }, ...sides.map((s, j) => h('i', { class: 'tvs-s' + j, style: { flexGrow: String(t ? n[j] : 1) } })));
      ratio.replaceChildren(lab(sides[0], 0), bar, lab(sides[1], 1), cap);
    } else {
      ratio.replaceChildren(...sides.map((s, j) => h('div', { class: 'tvs-row' }, lab(s, j), h('span', { class: 'tvs-track' }, h('i', { class: 'tvs-fill', style: { width: (t ? (n[j] / t) * 100 : 0).toFixed(1) + '%' } })))), cap);
    }
    ratio.hidden = false;
    cap.textContent = `${lastBar + 1}번째 판`;
    window.__tvsRatio = { k: lastBar, n, cell: id }; window.__tvsSeen = Math.max(window.__tvsSeen || 0, t);
  }
  function end() {
    if (gone || !plan) return;
    open = false; A.timer(0); ui.tell(null); ui.count(null); ui.setBar();
    if (view.done) view.done();
    if (kidSide) {
      const s = kit.scoreChoices(results, 5, { chance: S.chance(plan) }), tip = S.tip(plan, results, picks);
      kit.finish({ title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: results, facts: [`이어서 맞힌 최고 기록 ${s.streak}번`, '소리는 TV에서 들었어요'], starOn: s.starOn, rules: s.rules, tip, sd, ans: ans.join(''), mode: 'tvs' });
      return;
    }
    // TV — 마지막 판 답이 서버에 닿을 틈을 주고(결과를 한 번 더 읽고 2.6초) 판마다 반의 절반 넘게 맞힌 판(답이 없으면 빈 점) · '반 별'
    if (!tvsFinal) { tvsFinal = true; cap.textContent = '답을 모으는 중'; if (kit.refreshRes) kit.refreshRes(); T.after(2600, end); return; }
    const rows = rowsNow;
    const major = plan.map((row, k) => { const rc = rightCode(row); let ok = 0, n = 0; for (const rw of rows) { const c = rw.ans[k]; if (c && c !== 'x') { n++; if (c === rc) ok++; } } return n ? ok * 2 > n : null; });
    const s = kit.scoreChoices(major, 5, { chance: S.chance(plan) });
    kit.finish({ title: '반 전체 — 판마다 절반 넘게 맞힌 판', replay: major, facts: [`답을 보낸 기기 ${rows.length}대`], starOn: s.starOn, rules: s.rules, tip: '' });
  }
  // 아이 기기 키보드 — 1 2 3 4 = 위에서부터 답 단추
  const onKey = e => { if (!kidSide) return; const j = '1234'.indexOf(e.key); if (j >= 0 && items[j]) { e.preventDefault(); pick(items[j].key); } };
  window.addEventListener('keydown', onKey);
  return () => { gone = true; T.clear(); V.hush(); if (offRes) offRes(); window.removeEventListener('keydown', onKey); };
}
