// 이 기기 기록 — #/records(선생님 칸) · 과정 중심 평가 자료(성취기준 점검 11-08)
//  칸마다 최근 10번: 날짜 · 별 · 맞힌 수/전체 · 늦게(고르기 전에 시간이 지난 판 · N1) · 틀린 갈래 한 줄(결과 카드의 tip) + 칸의 성취기준
//  이름은 없음(기기 기록 — 여러 아이가 돌려 쓰면 섞임). '모두 복사' = 탭으로 나눈 글(표 프로그램에 붙여 넣기 좋게)
//  기록은 cellkit.saveResult가 남긴 prog[칸].hist. 예전 모양 { stars, at }은 '별만' 한 줄로 보인다
//  접힌 '자세히'를 열면 '두드림' 열(박 칸 · X4): 맞힌 두드림 어긋남 가운데 값 · 퍼짐(사분위 범위) · 놓침 — 3월 판정 창을 다시 맞출 자료
import { h, onPress, copyText } from '../util.js';
import { ORDER, cellById, stdText, STD_NOTE, PLAY_STD } from '../../../engine/cells.js';
import { getProg, STAR_SVG, stdEl } from '../cellkit.js';

const pad = n => String(n).padStart(2, '0');
const shortDate = t => { const d = new Date(t); return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fullDate = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
// 칸 하나의 기록 줄(최근 것부터) — 예전 모양은 별 · 날짜만
// 두드림 열 — '+12ms · 퍼짐 40 · 놓침 1'(앞당김은 −) · 맞힌 두드림이 없으면 놓침만 · 박 칸이 아니거나 예전 기록이면 —
const tapText = t => (!t ? '—' : `${t.o == null ? '맞힌 두드림 없음' : `${t.o > 0 ? '+' : ''}${t.o}ms · 퍼짐 ${t.sp}`} · 놓침 ${t.m}`);
const WHERE = { solo: '혼자', room: '방', tvs: 'TV 소리' }, BAND_UI = { low: '넉넉하게', mid: '보통', high: '촘촘하게' };
const tapTitle = r => (r.t ? [WHERE[r.r], `지연 보정 ${r.t.lat}ms`, `판정 창 ${BAND_UI[r.t.band] || r.t.band}`, `${r.t.bpm} BPM`].filter(Boolean).join(' · ') : null);
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
  // 자세히(접힘) — 열면 '두드림' 열이 보임(박 칸 기록 · 기술 값이라 평소엔 숨김)
  const more = h('details', { class: 'ms-more rec-more' }, h('summary', {}, '자세히'));
  const head = h('div', { class: 'rec-head' },
    h('div', { class: 'rec-head-t' },
      h('h1', {}, '놀이마다 최근 10번'),
      h('p', {}, `이름 없이 이 기기에만 남아요 · 틀린 갈래 = 결과 카드의 한 줄 · 성취기준 ${STD_NOTE}`)),
    h('span', { class: 'rec-btns' }, more, copyBtn));
  const body = h('tbody');
  for (const id of ORDER) {
    const c = cellById(id), rows = rowsOf(prog[id]);
    const first = h('th', { scope: 'rowgroup', rowspan: String(Math.max(1, rows.length)) },
      h('b', {}, `${c.label} ${c.name}`), c.std ? stdEl(c.std, 'rec-std') : null);
    if (!rows.length) { body.append(h('tr', { class: 'rec-first' }, first, h('td', { class: 'rec-none', colspan: '6' }, '아직 기록이 없어요'))); continue; }
    rows.forEach((r, i) => body.append(h('tr', { class: i ? '' : 'rec-first' },
      i ? null : first,
      h('td', { class: 'rec-date' }, r.at ? shortDate(r.at) : '—'),
      h('td', { class: 'rec-stars', 'aria-label': `별 ${r.s}`, html: [0, 1, 2].map(j => STAR_SVG(j < r.s)).join('') }),
      h('td', { class: 'rec-kn' }, r.n != null ? `${r.k}/${r.n}` : '—'),
      h('td', { class: 'rec-late' }, r.l != null ? String(r.l) : '—'),
      h('td', { class: 'rec-tap', title: tapTitle(r) }, tapText(r.t)),
      h('td', { class: 'rec-tip', title: r.tip || '' }, r.old ? '예전 기록 — 별만 남아 있어요' : r.tip || '—'))));
  }
  // 곡 바꾸기 — 기록을 남기지 않는 놀이지만 성취기준은 함께 보이게
  body.append(h('tr', { class: 'rec-first' },
    h('th', { scope: 'row' }, h('b', {}, '곡 바꾸기'), stdEl(PLAY_STD, 'rec-std')),
    h('td', { class: 'rec-none', colspan: '6' }, '기록을 남기지 않는 놀이예요')));
  const table = h('table', { class: 'rec-table' },
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, '놀이 · 성취기준'), h('th', { scope: 'col' }, '날짜'), h('th', { scope: 'col' }, '별'), h('th', { scope: 'col' }, '맞힌 수'), h('th', { scope: 'col', title: '고르기 전에 시간이 지난 판(틀림과 따로)' }, '늦게'),
      h('th', { scope: 'col', class: 'rec-tap', title: '맞힌 두드림이 박보다 늦은(+) · 이른(−) 가운데 값 · 퍼짐 = 가운데 절반의 폭(사분위 범위) · 놓친 박 수 — 기기 지연을 뺀 뒤' }, '두드림'),
      h('th', { scope: 'col' }, '틀린 갈래'))),
    body);
  more.addEventListener('toggle', () => table.classList.toggle('more', more.open));
  root.append(h('div', { class: 'records' }, head, h('div', { class: 'rec-box' }, table)));

  // 탭으로 나눈 글 — 칸 · 이름 · 성취기준 · 날짜 · 별 · 맞힌 수 · 전체 · 늦게 · 틀린 갈래 · 어디서 · 두드림 숫자(X4 — 표 프로그램에서 셈하게 따로따로)
  function tsv() {
    const out = [['칸', '놀이', '성취기준', '날짜', '별', '맞힌 수', '전체', '늦게', '틀린 갈래', '어디서', '두드림 가운데(ms)', '퍼짐(ms)', '놓침', '지연 보정(ms)', '판정 창', 'BPM'].join('\t')];
    for (const id of ORDER) {
      const c = cellById(id);
      for (const r of rowsOf(prog[id])) {
        const t = r.t || {};
        out.push([c.label, c.name, stdText(c.std), r.at ? fullDate(r.at) : '', r.s, r.k ?? '', r.n ?? '', r.l ?? '', (r.tip || '').replace(/\s+/g, ' '),
          WHERE[r.r] || '', t.o ?? '', t.sp ?? '', t.m ?? '', t.lat ?? '', t.band ? BAND_UI[t.band] || t.band : '', t.bpm ?? ''].join('\t'));
      }
    }
    return out.join('\n');
  }
  void ctx;
}
