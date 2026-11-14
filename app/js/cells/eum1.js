// 음1 두드리는 소리(북·나무·쇠) — 흐름 e2 '목소리 · 물체 소리 · 타악기'(11-14 · 묶음 C2)
//  같은 리듬(박 1 · 1 · 반 · 반 · 1 = 1.68초)을 두드리는 소리 하나로 들려주고, 그 소리가 북 · 나무 · 쇠 가운데 어느 갈래인지 고른다.
//   북 = 큰북 · 작은북 · 팀파니(음 높이가 있는 북) / 나무 = 마림바 / 쇠 = 트라이앵글 · 심벌즈 · 글로켄슈필.
//  줄 = { stage, kind, alt: { skin, wood, metal }, ans } — 그 판의 세 갈래 소리를 다 적어 두고, 섞을 때 답을 다음 갈래로(북 → 나무 → 쇠 → 북). 같은 리듬이라 길이가 같다.
//  비틀기(한 판에 한 가지): pitch 북도 음 높이가 있음(팀파니) · tune 세 갈래 모두 가락을 침 · fast 촘촘한 리듬(16분 여덟 + 4분 둘 · 길이 같음) · low 낮은 음.
//  목소리 · 물체 소리는 녹음이 없어 이 칸에서 다루지 않는다(컴퓨터 '아~'를 목소리로 가르치지 않음 — 설계서 C §A-2).
//  모든 소리는 컴퓨터로 만든 소리(진짜 악기 소리와 다름 — 보기 화면 알림).
//  성취기준(std)은 소6(같은 악기·다른 악기) 것을 그대로 옮김 — ⚠ 확인 못 함(원문으로 다시 판정하지 않음).
//  ⚠ 확인 못 함: '마림바 = 나무 · 트라이앵글 · 심벌즈 · 글로켄슈필 = 쇠 · 큰북 · 작은북 · 팀파니 = 북'은 일반 지식(저장소 · 사실 파일 근거 없음) — 화면 글은 갈래 이름(북 · 나무 · 쇠)만 쓰고 '가죽' 같은 재료 낱말은 쓰지 않는다.
//   장구(kung · deok)는 '북' 갈래 근거가 없어 쓰지 않는다. 귀로 확인하지 못한 것: 마림바 · 글로켄슈필 합성음이 크롬북 스피커에서 나무 · 쇠로 갈려 들리는지 · 낮은 마림바(45)가 팀파니와 갈리는지.
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js)
import { pickCell, line, drumLine, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';

export const BEAT = 0.42;
export const RHY = { plain: [1, 1, 0.5, 0.5, 1], fast: [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 1, 1] };
// 소리 이름 → 갈래 · 우리말 이름(북 · 타악기는 audio.js drum · 나머지는 음 높이가 있는 악기)
export const GROUP = { bassdrum: 'skin', snare: 'skin', timpani: 'skin', marimba: 'wood', triangle: 'metal', cymbal: 'metal', glock: 'metal' };
export const DRUMS = new Set(['bassdrum', 'snare', 'triangle', 'cymbal']);
const NAME = { bassdrum: '큰북', snare: '작은북', timpani: '팀파니', marimba: '마림바', triangle: '트라이앵글', cymbal: '심벌즈', glock: '글로켄슈필' };
const KO = { skin: '북', wood: '나무', metal: '쇠' };
const DVEL = { bassdrum: 0.8, snare: 0.7, triangle: 0.7, cymbal: 0.5 };
// 소리 글 'marimba:60' · 'timpani:43,48,50,48,55' · 'snare' → { src, ps }
export const parse = s => { const [src, ps] = s.split(':'); return { src, ps: ps ? ps.split(',').map(Number) : null }; };
const TUNE = { skin: 'timpani:43,48,50,48,55', wood: 'marimba:72,76,79,76,84', metal: 'glock:72,76,79,76,84' };
// 판 — 표의 답(ans)과 상관없이 세 갈래 소리를 다 적음 · 섞을 때 ans만 다음 갈래로
export const PLAN = [
  { stage: 'intro', kind: 'plain', alt: { skin: 'bassdrum', wood: 'marimba:60', metal: 'triangle' }, ans: 'skin' },
  { stage: 'intro', kind: 'plain', alt: { skin: 'snare', wood: 'marimba:67', metal: 'glock:76' }, ans: 'wood' },
  { stage: 'intro', kind: 'plain', alt: { skin: 'bassdrum', wood: 'marimba:72', metal: 'cymbal' }, ans: 'metal' },
  { stage: 'grow', kind: 'pitch', alt: { skin: 'timpani:48', wood: 'marimba:48', metal: 'glock:79' }, ans: 'skin' },
  { stage: 'grow', kind: 'plain', alt: { skin: 'timpani:45', wood: 'marimba:72', metal: 'triangle' }, ans: 'metal' },
  { stage: 'grow', kind: 'tune', alt: TUNE, ans: 'wood' },
  { stage: 'twist', kind: 'tune', alt: TUNE, ans: 'skin' },
  { stage: 'twist', kind: 'fast', alt: { skin: 'timpani:48', wood: 'marimba:67', metal: 'triangle' }, ans: 'metal' },
  { stage: 'twist', kind: 'low', alt: { skin: 'timpani:43', wood: 'marimba:45', metal: 'glock:72' }, ans: 'wood' },
  { stage: 'twist', kind: 'tune', alt: TUNE, ans: 'metal' },
  { stage: 'end', kind: 'fast', alt: { skin: 'bassdrum', wood: 'marimba:60', metal: 'glock:74' }, ans: 'wood' },
  { stage: 'end', kind: 'plain', alt: { skin: 'timpani:50', wood: 'marimba:84', metal: 'cymbal' }, ans: 'skin' },
];
export const CUTS = stageCuts(PLAN);
const NEXT = { skin: 'wood', wood: 'metal', metal: 'skin' };
export const SHUF = { flip: p => ({ ...p, ans: NEXT[p.ans] }), answerOf: p => p.ans };

const srcOf = row => parse(row.alt[row.ans]);
function build(row) {
  const { src, ps } = srcOf(row), rhy = RHY[row.kind === 'fast' ? 'fast' : 'plain'];
  const ln = DRUMS.has(src)
    ? drumLine(rhy.map(b => [src, b]), { vel: DVEL[src], beat: BEAT })
    : line(rhy.map((b, i) => [ps[i % ps.length], b]), { inst: src, vel: 0.7, beat: BEAT });
  return [{ lines: [ln], cap: `${NAME[src]} · ${KO[GROUP[src]]} 소리` }];
}
const wrong = row => {
  const { src } = srcOf(row);
  return `${NAME[src]} — ${KO[GROUP[src]]} 소리였어요` + (row.kind === 'tune' ? ' · 가락을 쳐도 같은 갈래예요' : '');
};

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['음이 있는 북(팀파니)', '가락을 치는 쇠(글로켄슈필)', '낮은 나무 소리'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(srcOf(p))).length;
  return factTip(results, [
    { n: miss(s => s.src === 'timpani'), text: '팀파니 소리에서 다르게 고른 적이 있어요. 팀파니는 음 높이가 있지만 북이에요.' },
    { n: miss(s => s.src === 'glock'), text: '글로켄슈필 소리에서 다르게 고른 적이 있어요. 글로켄슈필은 가락을 치지만 쇠 소리예요.' },
    { n: miss(s => s.src === 'marimba' && Math.max(...s.ps) <= 50), text: '낮은 마림바 소리에서 다르게 고른 적이 있어요. 낮게 울려도 마림바는 나무 소리예요.' },
  ], '소리가 높든 낮든, 가락을 치든 아니든 북 · 나무 · 쇠를 가려 들었어요.');
}
// 헷갈리는 두 소리 — 2번 판: 마림바 67(나무) ↔ 글로켄슈필 84(쇠)
export const NEAR = [
  { label: '마림바 — 나무 소리', play: nearSegs(build({ kind: 'plain', alt: PLAN[1].alt, ans: 'wood' })) },
  { label: '글로켄슈필 — 쇠 소리', play: nearSegs(build({ kind: 'plain', alt: PLAN[1].alt, ans: 'metal' })) },
];

// 단추 그림 — 북(원통 북) · 나무(나뭇결 막대 둘) · 쇠(트라이앵글)
const INK = 'stroke="#3B2A1E" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"';
const CHIPS = {
  skin: `<path d="M10 22V44C10 50 54 50 54 44V22" ${INK} style="fill:var(--surface)"/><ellipse cx="32" cy="22" rx="22" ry="7" ${INK} fill="#2F6F4E"/>`,
  wood: `<rect x="8" y="16" width="48" height="12" rx="3" ${INK} style="fill:var(--surface)"/><rect x="12" y="36" width="40" height="12" rx="3" ${INK} style="fill:var(--surface)"/><path d="M16 22H40M20 42H44" stroke="#2F6F4E" stroke-width="2.5" stroke-linecap="round"/>`,
  metal: `<path d="M32 10L54 50H10Z" fill="none" ${INK}/><path d="M48 12L58 20" stroke="#2F6F4E" stroke-width="3.5" stroke-linecap="round"/>`,
};
const CHIP = k => `<svg viewBox="0 0 64 64" aria-hidden="true">${CHIPS[k]}</svg>`;

const ASK = () => '들어요 — 북 소리일까요, 나무 소리일까요, 쇠 소리일까요?';
const cell = pickCell({
  friend: 'bear',
  keys: ['skin', 'wood', 'metal'],
  label: k => KO[k],
  chip: CHIP,
  rightOf: row => row.ans,
  build,
  names: () => ['소리 그림'],
  say: {
    show: () => '두드리는 소리는 무엇을 두드리는지에 따라 달라요. 북 · 나무 · 쇠 소리를 눌러서 들어 봐요.',
    follow: ASK,
    game: ASK,
    kid: () => 'TV 소리를 듣고 — 북인지 나무인지 쇠인지 골라요',
  },
  wrong,
  EX: () => [
    { title: '큰북', sub: '북 소리', row: { kind: 'plain', alt: PLAN[0].alt, ans: 'skin' } },
    { title: '마림바', sub: '나무 소리', row: { kind: 'plain', alt: PLAN[0].alt, ans: 'wood' } },
    { title: '트라이앵글', sub: '쇠 소리', row: { kind: 'plain', alt: PLAN[0].alt, ans: 'metal' } },
    { title: '팀파니', sub: '북인데 음 높이가 있어요', row: { kind: 'pitch', alt: PLAN[3].alt, ans: 'skin' } },
  ],
  note: () => '컴퓨터로 만든 소리예요 · 진짜 악기 소리와 달라요',
  pool: [
    { kind: 'plain', alt: PLAN[0].alt, ans: 'skin' },
    { kind: 'plain', alt: PLAN[1].alt, ans: 'wood' },
    { kind: 'plain', alt: PLAN[2].alt, ans: 'metal' },
    { kind: 'pitch', alt: PLAN[3].alt, ans: 'skin' },
    { kind: 'plain', alt: PLAN[4].alt, ans: 'metal' },
    { kind: 'plain', alt: PLAN[11].alt, ans: 'wood' },
  ],
  passText: '세 번 이어서 북 · 나무 · 쇠 소리를 가려냈어요',
  game: {
    title: '북일까 나무일까 쇠일까',
    sub: () => '두드리는 소리를 한 번 들려줘요. 북 소리인지, 나무 소리인지, 쇠 소리인지 골라요.',
  },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
