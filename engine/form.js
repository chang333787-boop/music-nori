// 도막 짜기 판(#/form) 규칙 — 화면 · 소리 없음(node로 시험 · tests/form.test.mjs · 11-14 묶음 D5)
//  도막 카드 셋(가 · 나 · 다)을 칸 여섯에 놓아 짜임을 만들고, 놓은 차례대로 듣는다.
//   칸마다 '혼자 · 여럿'(메기고 받기)과 '느리게 · 빠르게'(긴자진)를 고른다. 빈 칸은 건너뛴다.
//  도막 = 이 앱에서 지은 두 마디 가락(2/4 · 네 박 · 도 레 미 솔 라 · 있는 노래 X) — 유명 곡 해시와 닮음 검사(tools/simcheck.mjs)를 시험에서 함.
//  쓰는 국악 · 형식 사실은 이것뿐(docs/plan100_batchD.md §1 D5 · 형2 칸 · 국악 사실 장부의 '칸에서 써도 안전한 문장'):
//   · 메기고 받기 — 한 사람이 메기면 여럿이 받는다. 받는 소리는 같은 가락이 되풀이되고, 메기는 소리는 그때그때 바뀐다.
//   · 긴자진 형식 — 느린 노래를 부르고, 이어서 빠른 노래를 부르는 짜임. 우리 음악에서 '긴'은 느리게, '자진'은 빠르게라는 뜻.
//   짜임 설명 글은 놓은 칸에서 셀 수 있는 사실만 적는다(같은 도막이 다시 나옴 · 처음 도막이 끝에 나옴 · 모두 다름).
//   아이가 놓은 판을 '메기고 받는 형식이다 · 긴자진 형식이다'라고 단정하지 않고 '…처럼'으로 적는다(교과서 예는 다른 두 곡을 잇는 꼴이라).
//  1~2학년 판(lo)은 '도막' 대신 '조각' · '가락' 대신 '노래'(형1 · 형2 칸과 같음) · '메기다' · '긴자진' 낱말은 쓰지 않음.
import { parseMel } from './song.js';
import { TPQ } from './theory.js';

export const METER = [2, 4];
export const BEATS = 4;                       // 도막 하나 = 두 마디(2/4) = 네 박
export const SLOTS = 6;
// 도막 — 미 솔 | 미레 도(도에서 끝남) · 라라 높은 도 | 레레 라(높은 자리) · 높은 도. 라 | 솔―(점음표 · 긴 음)
export const PIECES = [
  { id: 'ga', name: '가', mel: 'E4q G4q | E4e D4e C4q' },
  { id: 'na', name: '나', mel: 'A4e A4e C5q | D5e D5e A4q' },
  { id: 'da', name: '다', mel: 'C5q. A4e | G4h' },
].map(p => ({ ...p, notes: parseMel(p.mel, METER).ev.map(e => [e.p, e.d / TPQ]) }));
export const PIECE_IDS = PIECES.map(p => p.id);
export const pieceById = id => PIECES.find(p => p.id === id) || null;
// 한 박(초) — 느리게 109 · 빠르게 176(빠르기 차이가 또렷하게 · 1.6배)
export const SPEED = { slow: 0.55, fast: 0.34 };
// 혼자 = 악기 하나 · 여럿 = 같은 가락을 악기 셋이 함께(낮게 · 가운데 · 높게 — 형2 칸과 같은 짝) [악기, 옥타브 옮김, 세기]
export const VOICES = {
  one: [['piano', 0, 0.62]],
  many: [['cello', -12, 0.42], ['horn', 0, 0.45], ['recorder', 12, 0.4]],
};
const GATE = 0.92;                            // 음 길이 = 박의 92%(다른 칸과 같은 틈)

export const W = lo => (lo ? '조각' : '도막');
export const ORD = ['첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째'];
const NUM = ['', '한', '두', '세', '네', '다섯', '여섯'];

// ── 판 ── 칸 = { piece: 'ga'|'na'|'da'|null, voice: 'one'|'many', speed: 'slow'|'fast' } × 6 · 모두 새 판을 돌려줌(고치지 않음)
export const emptySlot = () => ({ piece: null, voice: 'one', speed: 'slow' });
export const emptyBoard = () => Array.from({ length: SLOTS }, emptySlot);
const copy = b => b.map(s => ({ ...s }));
// 칸 k에 도막 id — 같은 도막이 있으면 뺌(빈 칸은 기본값으로) · 다른 도막이면 바꿈(혼자 · 빠르기는 그대로)
export function place(b, k, id) {
  if (!b[k] || !pieceById(id)) return b;
  const n = copy(b);
  n[k] = b[k].piece === id ? emptySlot() : { ...b[k], piece: id };
  return n;
}
export const clearSlot = (b, k) => (b[k] && b[k].piece ? Object.assign(copy(b), { [k]: emptySlot() }) : b);
export function toggleVoice(b, k) {
  if (!b[k] || !b[k].piece) return b;
  const n = copy(b); n[k].voice = b[k].voice === 'one' ? 'many' : 'one'; return n;
}
export function toggleSpeed(b, k) {
  if (!b[k] || !b[k].piece) return b;
  const n = copy(b); n[k].speed = b[k].speed === 'slow' ? 'fast' : 'slow'; return n;
}
export const filled = b => b.map((s, k) => ({ ...s, k })).filter(s => s.piece);
export const nameOf = b => filled(b).map(s => pieceById(s.piece).name).join('');
export const sigOf = b => b.map(s => (s.piece ? `${s.piece}.${s.voice}.${s.speed}` : '-')).join(' ');
// 기기에 저장한 판 읽기 — 모양이 어긋나면 null
export function fromSaved(x) {
  if (!Array.isArray(x) || x.length !== SLOTS) return null;
  const ok = s => s && (s.piece === null || PIECE_IDS.includes(s.piece)) && VOICES[s.voice] && SPEED[s.speed];
  return x.every(ok) ? x.map(s => (s.piece ? { piece: s.piece, voice: s.voice, speed: s.speed } : emptySlot())) : null;
}

// ── 소리 사건 ── 놓은 칸을 왼쪽부터 차례로(빈 칸은 건너뜀 · 도막 사이 쉼 없이 박이 이어짐)
//  → { events: [{ t, kind: 'note', inst, p, d, vel, slot }](시각 차례) · total(초) · segs: [{ k, t0, t1 }] }
export function eventsOf(list) {
  const events = [], segs = [];
  let t = 0;
  for (const s of list) {
    const piece = pieceById(s.piece), beat = SPEED[s.speed], t0 = t;
    for (const [inst, shift, vel] of VOICES[s.voice]) {
      let u = t0;
      for (const [p, b] of piece.notes) {
        if (p != null) events.push({ t: u, kind: 'note', inst, p: p + shift, d: b * beat * GATE, vel, slot: s.k });
        u += b * beat;
      }
    }
    t = t0 + piece.notes.reduce((a, [, b]) => a + b, 0) * beat;
    segs.push({ k: s.k, t0, t1: t });
  }
  events.sort((a, b) => a.t - b.t);
  return { events, total: t, segs };
}
export const events = b => eventsOf(filled(b));
export const slotEvents = (b, k) => eventsOf(b[k] && b[k].piece ? [{ ...b[k], k }] : []);
export const pieceEvents = id => eventsOf([{ piece: id, voice: 'one', speed: 'slow', k: -1 }]);

// ── 메기고 받기 ── 놓은 칸이 혼자 · 여럿 번갈아(혼자로 시작 · 여럿으로 끝) · 여럿 칸은 모두 같은 도막 · 혼자 칸은 받는 도막과 다른 도막 · 적어도 네 칸
//  → { ok } 또는 { ok: false, why, at }(at = 손볼 칸 번호)
export function callResponse(b) {
  const F = filled(b);
  for (let i = 0; i < F.length; i++) {
    const want = i % 2 ? 'many' : 'one';
    if (F[i].voice !== want) return { ok: false, why: 'voice', at: F[i].k, want };
  }
  const resp = F.filter((_, i) => i % 2), call = F.filter((_, i) => !(i % 2));
  const odd = resp.find(s => s.piece !== resp[0].piece);
  if (odd) return { ok: false, why: 'resp', at: odd.k };
  const same = resp.length ? call.find(s => s.piece === resp[0].piece) : null;
  if (same) return { ok: false, why: 'same', at: same.k };
  if (F.length < 4) return { ok: false, why: 'few', at: nextEmpty(b) };
  if (F.length % 2) return { ok: false, why: 'odd', at: nextEmpty(b) };
  return { ok: true };
}
// ── 느리게 다음 빠르게 ── 느리게 칸이 먼저, 빠르게 칸이 뒤(섞이지 않음) · 둘 다 적어도 하나
export function slowFast(b) {
  const F = filled(b);
  if (F.length < 2) return { ok: false, why: 'few', at: nextEmpty(b) };
  if (F[0].speed === 'fast') return { ok: false, why: 'noslow', at: F[0].k };
  const i = F.findIndex(s => s.speed === 'fast');
  if (i < 0) return { ok: false, why: 'nofast', at: F[F.length - 1].k };
  const back = F.slice(i).find(s => s.speed === 'slow');
  if (back) return { ok: false, why: 'back', at: back.k };
  return { ok: true };
}
function nextEmpty(b) {
  const last = filled(b).pop();
  for (let k = last ? last.k + 1 : 0; k < b.length; k++) if (!b[k].piece) return k;
  const k = b.findIndex(s => !s.piece);
  return k < 0 ? null : k;
}

// ── 짜임 글(사실만) ── 놓은 칸에서 셀 수 있는 것 한 줄 + 메기고 받기 · 느리게 다음 빠르게가 맞으면 한 줄씩
export function shapeText(b, lo) {
  const N = filled(b).map(s => s.piece), n = N.length, w = W(lo);
  if (!n) return '';
  if (n === 1) return `${w} 하나예요`;
  if (new Set(N).size === 1) return `같은 ${w}이 ${NUM[n]} 번 이어져요`;
  if (new Set(N).size === n) return `${w}이 모두 달라요`;
  if (n >= 3 && N[0] === N[n - 1]) return `처음 ${w}이 끝에 다시 나와요`;
  const again = PIECES.filter(p => N.filter(x => x === p.id).length > 1).map(p => p.name);
  return `${again.join(' · ')} ${w}이 다시 나와요`;
}
export function facts(b, lo) {
  const out = [];
  const s = shapeText(b, lo);
  if (s) out.push(s);
  if (callResponse(b).ok) out.push(lo ? '혼자 부르고 여럿이 같은 노래로 받아요' : '메기고 받는 형식처럼 혼자 메기고 여럿이 받아요');
  if (slowFast(b).ok) out.push(lo ? '느리게 부르다 빠르게 이어 불러요' : '긴자진 형식처럼 느리게 부르다 빠르게 이어 불러요');
  const F = filled(b);
  if (F.length && F[F.length - 1].k - F[0].k + 1 > F.length) out.push('빈 칸은 건너뛰어요');
  return out;
}

// ── 부탁 카드 넷 ── kind: E 넣고 빼기 · M 만들기(정답 없음)
//  check(b, lo) → { st: 'idle' | 'ready', msg, at?, part? }(at = 손볼 칸 · part = 그 칸의 piece 도막 | voice 혼자·여럿 | speed 빠르기) — ready가 된 판을 '듣기'로 끝까지 들으면 끝(화면이 셈)
//  target = 자동 시험이 맞추는 판(window.__formAuto · tests/form.test.mjs)
const T = (piece, voice = 'one', speed = 'slow') => ({ piece, voice, speed });
const pick = (lo, id) => `${pieceById(id).name} ${W(lo)}을 고르고`;
export const TASKS = [
  { key: 'aba', kind: 'E',
    text: lo => `가 · 나 · 가 차례로 놓아 짜임 「가나가」를 만들어 봐요`,
    word: lo => `노래는 ${W(lo)}으로 나눌 수 있어요. 같은 ${W(lo)}에는 같은 이름을 붙여요.`,
    target: [T('ga'), T('na'), T('ga')],
    check(b, lo) {
      const F = filled(b), want = ['ga', 'na', 'ga'];
      for (let i = 0; i < Math.min(F.length, 3); i++) {
        if (F[i].piece !== want[i]) return { st: 'idle', at: F[i].k, part: 'piece', msg: `${ORD[F[i].k]} 칸은 ${pieceById(want[i]).name} ${W(lo)} 자리예요 — ${pick(lo, want[i])} 그 칸을 눌러요` };
      }
      if (F.length < 3) {
        const k = nextEmpty(b);
        return { st: 'idle', at: k, part: 'piece', msg: `${F.length ? '다음은' : '먼저'} ${pick(lo, want[F.length])} ${ORD[k]} 칸을 눌러요` };
      }
      if (F.length > 3) return { st: 'idle', at: F[3].k, part: 'piece', msg: `세 칸이면 돼요 — ${ORD[F[3].k]} 칸을 한 번 더 누르면 ${W(lo)}이 빠져요` };
      return { st: 'ready' };
    },
    done: lo => `「가나가」 — 처음 ${W(lo)}이 끝에 다시 나와요` },

  { key: 'call', kind: 'E',
    text: lo => (lo ? '혼자 부르고 여럿이 받게 적어도 네 칸에 놓아 봐요' : '혼자 메기고 여럿이 받게 적어도 네 칸에 놓아 봐요'),
    word: lo => (lo ? '한 사람이 부르면 여럿이 받아요. 받는 소리는 늘 같은 노래예요.'
      : '메기고 받기 — 한 사람이 메기면 여럿이 받아요. 받는 소리는 같은 가락이 되풀이되고, 메기는 소리는 그때그때 바뀌어요.'),
    note: '컴퓨터로 만든 악기 소리예요',
    target: [T('na'), T('ga', 'many'), T('da'), T('ga', 'many')],
    check(b, lo) {
      const r = callResponse(b), w = W(lo), call = lo ? '부르는' : '메기는';
      if (r.ok) return { st: 'ready' };
      const F = filled(b), at = r.at, o = at == null ? '' : ORD[at];
      const resp = F[1] ? `${pieceById(F[1].piece).name} ${w}` : `받는 ${w}`;
      // 다음 칸 안내 — 다음이 받는 칸이면 받는 도막 + '여럿' · 메기는 칸이면 받는 도막과 다른 도막
      const next = !F.length ? `먼저 ${w}을 고르고 첫째 칸을 눌러요`
        : F.length % 2 ? `${o} 칸에 ${resp}을 놓고 '여럿'으로 골라요 — 받는 소리예요`
          : `${o} 칸에 ${call} ${w}을 놓아요 — ${resp}과 다른 것으로`;
      const msg = {
        voice: r.want === 'one' ? `${o} 칸은 '혼자'로 골라요 — ${call} 소리예요` : `${o} 칸은 '여럿'으로 골라요 — 받는 소리예요`,
        resp: `여럿이 받는 칸에는 같은 ${w}을 놓아요 — 받는 소리는 ${lo ? '같은 노래가' : '같은 가락이'} 되풀이돼요`,
        same: `혼자 ${call} 칸에는 받는 ${w}과 다른 ${w}을 놓아요`,
        few: next,
        odd: `받는 소리로 끝나게 — ${next}`,
      }[r.why];
      return { st: 'idle', at, msg, part: r.why === 'voice' ? 'voice' : 'piece' };
    },
    done: lo => (lo ? '혼자 부르고 여럿이 같은 노래로 받았어요' : '혼자 메기고 여럿이 같은 가락으로 받았어요 — 메기고 받는 형식처럼요') },

  { key: 'slowfast', kind: 'E',
    text: () => '느리게 다음 빠르게로 놓아 봐요',
    word: lo => (lo ? '느린 노래를 부르고, 이어서 빠른 노래를 불러요.'
      : "긴자진 형식 — 느린 노래를 부르고, 이어서 빠른 노래를 부르는 짜임이에요. 우리 음악에서 '긴'은 느리게, '자진'은 빠르게라는 뜻이에요."),
    target: [T('na'), T('ga'), T('na', 'one', 'fast'), T('ga', 'one', 'fast')],
    check(b, lo) {
      const r = slowFast(b), w = W(lo);
      if (r.ok) return { st: 'ready' };
      const at = r.at, o = at == null ? '' : ORD[at];
      const msg = {
        few: filled(b).length ? `${o} 칸에 ${w}을 하나 더 놓아요` : `먼저 ${w}을 고르고 첫째 칸을 눌러요`,
        noslow: `${o} 칸은 '느리게'로 — 느린 노래가 먼저예요`,
        nofast: `뒤쪽 칸을 '빠르게'로 바꿔요 — ${o} 칸 아래 단추를 눌러요`,
        back: `${o} 칸은 빠르게 뒤에 있어요 — '빠르게'로 바꿔요`,
      }[r.why];
      return { st: 'idle', at, msg, part: r.why === 'few' ? 'piece' : 'speed' };
    },
    done: lo => (lo ? '느리게 부르다 빠르게 이어 불렀어요' : '느리게 부르다 빠르게 이어 불렀어요 — 긴자진 형식처럼요') },

  { key: 'mine', kind: 'M',
    text: lo => `내 짜임 짓기 — 네 칸에서 여섯 칸까지 마음대로 놓아 봐요`,
    word: () => '정답은 없어요. 놓은 차례대로 들려요. 혼자 · 여럿, 느리게 · 빠르게도 마음대로 골라요.',
    target: [T('ga'), T('na', 'many'), T('da'), T('ga', 'many', 'fast')],
    check(b, lo) {
      const n = filled(b).length;
      if (n < 4) { const k = nextEmpty(b); return { st: 'idle', at: k, part: 'piece', msg: `적어도 네 칸에 놓아요 — 지금 ${n}칸` }; }
      return { st: 'ready' };
    },
    done: (lo, b) => `내 짜임 「${nameOf(b)}」 — ${facts(b, lo).join(' · ')}` },
];
export const taskByKey = k => TASKS.find(t => t.key === k) || null;

// 자동 시험 — 지금 판을 부탁의 target 판으로 한 걸음 옮기는 행동(이미 ready면 null)
//  { op: 'place', k, id }(같은 도막을 놓으면 빠짐) · { op: 'voice', k } · { op: 'speed', k }
export function autoStep(task, b, lo = false) {
  if (task.check(b, lo).st === 'ready') return null;
  for (let k = 0; k < b.length; k++) {
    const want = task.target[k] || null, s = b[k];
    if (!want) { if (s.piece) return { op: 'place', k, id: s.piece }; continue; }
    if (s.piece !== want.piece) return { op: 'place', k, id: want.piece };
    if (s.voice !== want.voice) return { op: 'voice', k };
    if (s.speed !== want.speed) return { op: 'speed', k };
  }
  return null;
}
export function apply(b, a) {
  if (!a) return b;
  if (a.op === 'place') return place(b, a.k, a.id);
  if (a.op === 'voice') return toggleVoice(b, a.k);
  if (a.op === 'speed') return toggleSpeed(b, a.k);
  return b;
}
