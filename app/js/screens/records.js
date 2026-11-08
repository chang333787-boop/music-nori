// 이 기기 기록 — #/records(선생님 칸) · 과정 중심 평가 자료(성취기준 점검 11-08)
//  칸마다 최근 10번: 날짜 · 별 · 맞힌 수/전체 · 늦게(고르기 전에 시간이 지난 판 · N1) · 틀린 갈래 한 줄(결과 카드의 tip) + 칸의 성취기준
//  이름은 없음(기기 기록 — 여러 아이가 돌려 쓰면 섞임). '모두 복사' = 탭으로 나눈 글(표 프로그램에 붙여 넣기 좋게)
//  기록은 cellkit.saveResult가 남긴 prog[칸].hist. 예전 모양 { stars, at }은 '별만' 한 줄로 보인다
import { h, onPress, copyText } from '../util.js';
import { ORDER, cellById, stdText, STD_NOTE, PLAY_STD } from '../../../engine/cells.js';
import { getProg, STAR_SVG, stdEl } from '../cellkit.js';

const pad = n => String(n).padStart(2, '0');
const shortDate = t => { const d = new Date(t); return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fullDate = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
// 칸 하나의 기록 줄(최근 것부터) — 예전 모양은 별 · 날짜만
function rowsOf(p) {
  if (!p || typeof p !== 'object') return [];
  if (Array.isArray(p.hist) && p.hist.length) return [...p.hist].reverse();
  return p.stars != null ? [{ at: p.at || 0, s: p.stars, k: null, n: null, tip: '', old: true }] : [];
}

export default function mount(root, ctx) {
  const prog = getProg();
  const total = ORDER.reduce((n, id) => n + rowsOf(prog[id]).length, 0);
  const copyBtn = h('button', { type: 'button', class: 'go', disabled: total ? null : true }, '모두 복사');
  onPress(copyBtn, () => { if (total) copyText(tsv(), { title: '이 기기 기록' }); });
  const head = h('div', { class: 'rec-head' },
    h('div', { class: 'rec-head-t' },
      h('h1', {}, '놀이마다 최근 10번'),
      h('p', {}, `이름 없이 이 기기에만 남아요 · 틀린 갈래 = 결과 카드의 한 줄 · 성취기준 ${STD_NOTE}`)),
    copyBtn);
  const body = h('tbody');
  for (const id of ORDER) {
    const c = cellById(id), rows = rowsOf(prog[id]);
    const first = h('th', { scope: 'rowgroup', rowspan: String(Math.max(1, rows.length)) },
      h('b', {}, `${c.label} ${c.name}`), c.std ? stdEl(c.std, 'rec-std') : null);
    if (!rows.length) { body.append(h('tr', { class: 'rec-first' }, first, h('td', { class: 'rec-none', colspan: '5' }, '아직 기록이 없어요'))); continue; }
    rows.forEach((r, i) => body.append(h('tr', { class: i ? '' : 'rec-first' },
      i ? null : first,
      h('td', { class: 'rec-date' }, r.at ? shortDate(r.at) : '—'),
      h('td', { class: 'rec-stars', 'aria-label': `별 ${r.s}`, html: [0, 1, 2].map(j => STAR_SVG(j < r.s)).join('') }),
      h('td', { class: 'rec-kn' }, r.n != null ? `${r.k}/${r.n}` : '—'),
      h('td', { class: 'rec-late' }, r.l != null ? String(r.l) : '—'),
      h('td', { class: 'rec-tip', title: r.tip || '' }, r.old ? '예전 기록 — 별만 남아 있어요' : r.tip || '—'))));
  }
  // 곡 바꾸기 — 기록을 남기지 않는 놀이지만 성취기준은 함께 보이게
  body.append(h('tr', { class: 'rec-first' },
    h('th', { scope: 'row' }, h('b', {}, '곡 바꾸기'), stdEl(PLAY_STD, 'rec-std')),
    h('td', { class: 'rec-none', colspan: '5' }, '기록을 남기지 않는 놀이예요')));
  const table = h('table', { class: 'rec-table' },
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, '놀이 · 성취기준'), h('th', { scope: 'col' }, '날짜'), h('th', { scope: 'col' }, '별'), h('th', { scope: 'col' }, '맞힌 수'), h('th', { scope: 'col', title: '고르기 전에 시간이 지난 판(틀림과 따로)' }, '늦게'), h('th', { scope: 'col' }, '틀린 갈래'))),
    body);
  root.append(h('div', { class: 'records' }, head, h('div', { class: 'rec-box' }, table)));

  // 탭으로 나눈 글 — 칸 · 이름 · 성취기준 · 날짜 · 별 · 맞힌 수 · 전체 · 틀린 갈래
  function tsv() {
    const out = [['칸', '놀이', '성취기준', '날짜', '별', '맞힌 수', '전체', '늦게', '틀린 갈래'].join('\t')];
    for (const id of ORDER) {
      const c = cellById(id);
      for (const r of rowsOf(prog[id])) out.push([c.label, c.name, stdText(c.std), r.at ? fullDate(r.at) : '', r.s, r.k ?? '', r.n ?? '', r.l ?? '', (r.tip || '').replace(/\s+/g, ' ')].join('\t'));
    }
    return out.join('\n');
  }
  void ctx;
}
