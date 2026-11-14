// 선생님 '찾아 쓰기' — #/find(선생님 칸) · #/find/<찾는 말>
//  '박자'처럼 찾으면 그 요소를 배우는 차례대로 앱에서 쓸 것(칸 · 악보 판 · 곡 바꾸기)이 나온다. 필요한 것만 [담기] → 주소와 함께 복사.
//  차례 자료와 근거는 engine/flow.js · docs/flow.md. 아이 화면에는 쓰지 않는다 — 아무것도 잠그지 않는다.
//  찾는 말은 주소(#/find/박자)와 이 탭에만 남고(탭을 닫으면 처음부터), 담은 것은 이 기기에만 남는다. 서버로 가는 것은 없다.
//  결과 상자 안의 단추는 click으로 듣는다 — 손가락으로 상자를 밀어 올릴 때 pointerdown에 눌리지 않게.
//  난이도(11-14) — 단계마다 '난이도 n · 낱말', 어려운 점 둘, 먼저 하면 좋은 단계(누르면 그 단계로) · 찾는 말이 없을 때는 난이도 사다리.
//   engine/load.js가 스스로 따져 본 것 — 연구나 아이들 자료로 확인한 것이 아니라고 화면에 적는다.
import { h, onPress, lsGet, lsSet, copyText } from '../util.js';
import { friendImg } from '../band.js';
import { stdEl } from '../cellkit.js';
import { STD_NOTE } from '../../../engine/cells.js';
import { ELEMENTS, EV, WALK, CLUSTERS, SAMPLES, actInfo, elementById, parseQuery, search, stepById } from '../../../engine/flow.js';
import { FACTORS, loadOf, needNames, ladder, gradeGaps } from '../../../engine/load.js';

// 담은 것을 늘어놓는 차례 = 공부 흐름에 처음 나오는 차례
const ACT_ORDER = [...new Set(ELEMENTS.flatMap(el => el.steps.flatMap(s => s.acts)))];
const short = name => name.split(' — ')[0];                // '일정박 — 고르게 이어지는 박' → '일정박'
const ssGet = () => { try { return sessionStorage.getItem('mn.find.q') || ''; } catch { return ''; } };
const FULL = Object.fromEntries(FACTORS.map(f => [f.id, f.full]));
const GAPS = gradeGaps();
const LOAD_NOTE = '난이도는 앱이 스스로 따져 본 것이에요. 연구나 아이들 자료로 확인한 것은 아니에요.';
const ssSet = v => { try { sessionStorage.setItem('mn.find.q', v); } catch { /* 저장이 막혀도 찾기는 된다 */ } };

export default function mount(root, ctx) {
  let q = '';
  if (ctx.args && ctx.args.length) { try { q = decodeURIComponent(ctx.args.join('/')); } catch { q = ctx.args.join('/'); } }
  else q = ssGet();
  const okAct = a => { const i = actInfo(a); return !!(i && i.built); };
  let picks = (lsGet('find.pick', []) || []).filter(okAct);
  let aim = null;                                           // '먼저 하면 좋은 것' · 사다리에서 누른 단계 — 다음에 그릴 때 그 자리로

  // ── 위: 찾는 칸 · 예 · 요소 열 가지 ──
  const input = h('input', { type: 'search', class: 'fd-in', placeholder: '찾을 말을 적어요', 'aria-label': '찾을 말', autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'search' });
  input.value = q;
  const clear = h('button', { type: 'button', class: 'fd-clear' }, '지우기');
  const sampleBtns = SAMPLES.map(s => { const b = h('button', { type: 'button', class: 'fd-sample' }, s); onPress(b, () => setQ(s)); return b; });
  const elBtns = ELEMENTS.map(el => { const b = h('button', { type: 'button', class: 'fd-el', 'data-el': el.id, 'aria-pressed': 'false' }, el.name); onPress(b, () => setQ(el.name)); return b; });
  input.addEventListener('input', () => { q = input.value; apply(); });
  onPress(clear, () => { setQ(''); input.focus(); });

  // ── 가운데: 결과(안에서만 밀어 올림) · 오른쪽: 고른 것 ──
  const box = h('div', { class: 'fd-box', tabindex: '0', role: 'region', 'aria-label': '찾은 공부 흐름' });
  const pickTitle = h('h2', { class: 'fd-ptitle' });
  const pickList = h('ol', { class: 'fd-plist' });
  const pickEmpty = h('p', { class: 'fd-pempty' }, '쓸 것 옆의 [담기]를 누르면 여기에 모여요. 모은 목록은 주소와 함께 복사해 학급 게시판에 붙일 수 있어요.');
  const copyBtn = h('button', { type: 'button', class: 'go fd-copy' }, '목록 복사');
  const dropBtn = h('button', { type: 'button', class: 'fd-drop' }, '모두 빼기');
  onPress(copyBtn, () => { if (picks.length) copyText(pickText(), { title: '고른 활동' }); });
  onPress(dropBtn, () => { if (picks.length) { picks = []; savePicks(); } });

  root.append(h('div', { class: 'findp' },
    h('div', { class: 'fd-top' },
      input, clear,
      h('span', { class: 'fd-samples' }, h('span', { class: 'fd-eg' }, '예'), ...sampleBtns)),
    h('div', { class: 'fd-els', role: 'group', 'aria-label': '음악 요소' }, ...elBtns),
    box,
    h('aside', { class: 'fd-pick', 'aria-label': '고른 것' },
      pickTitle, pickList, pickEmpty,
      h('div', { class: 'fd-pbtns' }, copyBtn, dropBtn))));

  function setQ(v) { q = v; input.value = v; apply(); }
  // 단계 하나로 가기 — 그 요소의 공부 차례를 열고 그 단계가 보이게
  function goStep(id) { const r = stepById(id); if (!r) return; aim = id; setQ(r.el.name); }
  function stepBtn(id, long) {
    const r = stepById(id), b = h('button', { type: 'button', class: 'fd-need', 'data-go': id, style: { '--f': `var(--${r.el.friend})` } }, long ? `${r.el.name} — ${short(r.step.name)}` : short(r.step.name));
    b.addEventListener('click', () => goStep(id));
    return b;
  }
  function apply() {
    ssSet(q);
    try { history.replaceState(null, '', '#/find' + (q.trim() ? '/' + encodeURIComponent(q.trim()) : '')); } catch { /* 주소를 못 바꿔도 찾기는 된다 */ }
    // 요소 단추 — 찾는 말이 그 요소를 통째로 가리킬 때 눌린 모양('박자' → 박·박자)
    const whole = parseQuery(q).words.length ? search(q).filter(r => r.level === 'element').map(r => r.el.id) : [];
    for (const b of elBtns) b.setAttribute('aria-pressed', String(whole.includes(b.dataset.el)));
    clear.disabled = !q;
    drawResults();
  }

  // ── 결과 그리기 ──
  function drawResults() {
    const { words, grade } = parseQuery(q);
    if (!words.length && !grade) { aim = null; box.replaceChildren(intro()); box.scrollTop = 0; return; }
    const res = search(q);
    if (!res.length) {
      box.replaceChildren(h('div', { class: 'fd-none' },
        h('h2', {}, `「${q.trim()}」 — 찾지 못했어요`),
        h('p', {}, '요소 이름(박자 · 셈여림), 기호 이름(쉼표 · 도돌이표), 학년(4학년 리듬)으로 찾아보세요. 위의 요소 단추를 눌러도 돼요.')));
      box.scrollTop = 0; return;
    }
    box.replaceChildren(
      h('p', { class: 'fd-cave' }, `학년 자리는 2015 개정 교과서 8종 분석과 2022 개정 교육과정 표를 따랐어요. 2022 개정 교과서와는 대조하지 못했어요. 성취기준 ${STD_NOTE}`),
      h('p', { class: 'fd-cave' }, LOAD_NOTE),
      ...res.map(block));
    box.scrollTop = 0;
    const want = aim; aim = null;
    const first = (want && box.querySelector(`.fd-step[data-step="${want}"]`)) || box.querySelector('.fd-step.hit');
    if (first) {
      if (want && first.dataset.step === want) first.classList.add('aim');
      box.scrollTop = Math.max(0, first.getBoundingClientRect().top - box.getBoundingClientRect().top - 70);
    }
  }

  function block(r) {
    const el = r.el, nHit = r.steps.filter(s => s.hit).length;
    const no = s => el.steps.indexOf(s) + 1;                // 학년으로 걸러도 본래 차례 번호 그대로
    return h('section', { class: 'fd-sec', 'data-el': el.id, style: { '--f': `var(--${el.friend})`, '--ft': `var(--${el.friend}-t)` } },
      h('header', { class: 'fd-sech' },
        friendImg(el.friend, 'face', { label: false, cls: 'fd-face' }),
        h('h2', {}, `${el.name} — 공부 차례`),
        r.level === 'step' ? h('span', { class: 'fd-found' }, `찾은 곳 ${nHit}단계`) : null,
        h('span', { class: 'fd-curr' }, `교육과정 ${el.curr}`)),
      h('p', { class: 'fd-strip' }, ...r.steps.flatMap(({ step, hit }, i) => [
        i ? h('span', { class: 'fd-arrow', 'aria-hidden': 'true' }, '›') : null,
        h('span', { class: 'fd-sname' + (hit ? ' hit' : '') }, `${no(step)} ${short(step.name)}`)])),
      h('ol', { class: 'fd-steps' }, ...r.steps.map(({ step, hit }) => stepRow(step, hit, no(step)))),
      el.mix.length ? h('details', { class: 'fd-mix' },
        h('summary', {}, `헷갈리기 쉬운 곳 ${el.mix.length}가지`),
        h('ul', {}, ...el.mix.map(m => h('li', {}, m.t, h('span', { class: 'fd-src' }, ` ${m.src} · ${EV[m.ev]}`))))) : null);
  }

  function stepRow(step, hit, n) {
    const acts = step.acts.map(actInfo).filter(Boolean), ld = loadOf(step.id), needs = needNames(step.id), myEl = stepById(step.id).el;
    return h('li', { class: 'fd-step' + (hit ? ' hit' : ''), 'data-step': step.id },
      h('div', { class: 'fd-sh' },
        h('span', { class: 'fd-no' }, String(n)),
        h('b', {}, step.name),
        h('span', { class: 'fd-g' }, step.g),
        h('span', { class: 'fd-lv', 'data-lv': String(ld.lv) }, `난이도 ${ld.lv} · ${ld.word}`),
        hit ? h('span', { class: 'fd-tag' }, '찾은 곳') : null),
      h('p', { class: 'fd-why' }, step.why, h('span', { class: 'fd-ev' }, ` 근거 — ${step.ev.map(e => EV[e]).join(' · ')}`)),
      ld.heavy.length ? h('p', { class: 'fd-load' }, h('span', { class: 'fd-lt' }, '어려운 점'), ...ld.heavy.map(x => h('span', { class: 'fd-hv' }, h('b', {}, FULL[x.id]), ` ${x.text}`))) : null,
      needs.length ? h('p', { class: 'fd-load' }, h('span', { class: 'fd-lt' }, '먼저 하면 좋은 것'), ...needs.map(x => stepBtn(x.id, x.el !== myEl))) : null,
      acts.length
        ? h('ul', { class: 'fd-acts' }, ...acts.map(actRow))
        : h('p', { class: 'fd-noact' }, '이 단계에 쓸 것은 앱에 아직 없어요.'));
  }

  function actRow(i) {
    if (!i.built) return h('li', { class: 'fd-act off' },
      h('span', { class: 'fd-kind' }, i.kindName), h('span', { class: 'fd-lab' }, i.label), h('span', { class: 'fd-soon' }, '아직 없어요'));
    const add = h('button', { type: 'button', class: 'fd-b fd-add', 'data-act': i.act, 'aria-pressed': String(picks.includes(i.act)) }, picks.includes(i.act) ? '담음' : '담기');
    add.addEventListener('click', () => togglePick(i.act));
    return h('li', { class: 'fd-act' },
      h('span', { class: 'fd-kind' }, i.kindName),
      h('span', { class: 'fd-lab' }, i.label, i.std && i.std.length ? stdEl(i.std, 'fd-std') : null),
      h('span', { class: 'fd-btns' },
        h('a', { class: 'btn fd-b', href: i.href }, '열기'),
        i.tv ? h('a', { class: 'btn fd-b', href: i.tv }, 'TV로') : null,
        add));
  }

  // 찾는 말이 없을 때 — 흐름을 어떻게 정리했는지
  function intro() {
    const elBtn = id => { const el = elementById(id), b = h('button', { type: 'button', class: 'fd-b' }, el.name); b.addEventListener('click', () => setQ(el.name)); return b; };
    return h('div', { class: 'fd-intro' },
      h('h2', {}, '요소마다 공부 차례를 정리했어요'),
      h('p', {}, '위에서 요소를 누르거나 낱말로 찾으면, 그 요소를 배우는 차례대로 앱에서 쓸 것이 나와요. 필요한 것만 담아 쓰세요. 아이 화면은 그대로이고, 잠기는 것도 없어요.'),
      h('h3', {}, '한 요소를 익히는 걸음'),
      h('ol', { class: 'fd-walk' }, ...WALK.map((w, i) => h('li', {}, h('span', { class: 'fd-no' }, String(i + 1)), h('b', {}, w.name), h('span', {}, w.where)))),
      h('p', { class: 'fd-note' }, '교과서 지도 흐름과 여러 교수법 문서가 겹치는 틀이에요. 실험으로 밝힌 차례는 아니에요.'),
      h('h3', {}, '요소 사이의 차례'),
      h('ul', { class: 'fd-clu' }, ...CLUSTERS.map(c => h('li', {},
        h('b', {}, c.name),
        h('span', { class: 'fd-cbtns' }, ...c.els.map(elBtn)),
        h('span', {}, c.why),
        h('span', { class: 'fd-src' }, `근거 — ${EV[c.ev]}`)))),
      h('p', { class: 'fd-note' }, '장단과 악보 읽기는 어느 덩어리에 넣을지 근거를 찾지 못해 따로 두었어요.'),
      h('h3', {}, '쉬운 것부터 — 난이도 사다리'),
      h('p', {}, `단계마다 아이가 한꺼번에 해내야 하는 일 여섯 가지(${FACTORS.map(f => f.full).join(' · ')})를 따져 다섯 층으로 나눴어요. 누르면 그 단계로 가요.`),
      h('p', { class: 'fd-note' }, LOAD_NOTE + ' 층의 경계에 걸린 단계는 한 점 차이로 갈려요.'),
      h('ol', { class: 'fd-lad' }, ...ladder().map(r => h('li', { 'data-lv': String(r.lv) },
        h('div', { class: 'fd-lh' }, h('b', {}, `난이도 ${r.lv} · ${r.word}`), h('span', {}, `${r.els.reduce((a, x) => a + x.steps.length, 0)}단계`)),
        ...r.els.map(x => h('div', { class: 'fd-lrow' }, h('span', { class: 'fd-lel' }, x.el.name), h('span', { class: 'fd-cbtns' }, ...x.steps.map(st => stepBtn(st.id)))))))),
      h('h3', {}, '교과서 자리와 난이도가 다른 곳'),
      h('ul', { class: 'fd-gap' },
        h('li', {}, h('b', {}, '뒤 학년에 나오지만 가벼운 단계'), h('span', {}, '4학년이나 그 뒤에 처음 나오는데 난이도 2 이하 — 필요하면 앞 학년에서도 쓸 수 있어요.'), h('span', { class: 'fd-cbtns' }, ...GAPS.soon.map(x => stepBtn(x.id, true)))),
        h('li', {}, h('b', {}, '일찍 나오지만 무거운 단계'), h('span', {}, '3학년이나 그 앞에 처음 나오는데 난이도 4 이상 — 천천히, 먼저 하면 좋은 것부터.'), h('span', { class: 'fd-cbtns' }, ...GAPS.slow.map(x => stepBtn(x.id, true))))));
  }

  // ── 고른 것 ──
  function togglePick(act) {
    picks = picks.includes(act) ? picks.filter(a => a !== act) : [...picks, act];
    savePicks();
  }
  function savePicks() {
    picks.sort((a, b) => ACT_ORDER.indexOf(a) - ACT_ORDER.indexOf(b));
    lsSet('find.pick', picks);
    for (const b of box.querySelectorAll('.fd-add')) {
      const on = picks.includes(b.dataset.act);
      b.setAttribute('aria-pressed', String(on)); b.textContent = on ? '담음' : '담기';
    }
    drawPicks();
  }
  function drawPicks() {
    pickTitle.textContent = `고른 것 ${picks.length}개`;
    pickList.replaceChildren(...picks.map(a => {
      const i = actInfo(a), out = h('button', { type: 'button', class: 'fd-b fd-out', 'aria-label': `${i.label} 빼기` }, '빼기');
      out.addEventListener('click', () => togglePick(a));
      return h('li', {}, h('span', { class: 'fd-pl' }, h('span', { class: 'fd-pk' }, i.kindName), h('a', { class: 'fd-plab', href: i.href }, i.label)), out);
    }));
    pickList.hidden = !picks.length; pickEmpty.hidden = !!picks.length;
    copyBtn.disabled = !picks.length; dropBtn.disabled = !picks.length;
  }
  function pickText() {
    const base = location.origin + location.pathname;
    return ['음악 놀이터 — 고른 활동', ...picks.map((a, k) => { const i = actInfo(a); return `${k + 1}. ${i.label} (${i.kindName}) ${base}${i.href}`; })].join('\n');
  }

  window.__findState = () => ({ q, picks: [...picks], text: pickText() });
  drawPicks();
  apply();
  if (!q) requestAnimationFrame(() => input.focus());
  return () => { delete window.__findState; };
}
