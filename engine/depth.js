// 활동 깊이 장부 — 단계마다 어떤 갈래의 활동이 실제로 열리는지(11-14 · 기준표 docs/bar.md '활동 깊이')
//  갈래 넷: L 듣고 가려내기 · D 직접 내기 · E 넣고 빼기 · M 만들기
//  세는 법 — 실제로 열리는 활동만 센다(만든 칸 · 악보 판 · 곡 바꾸기 카드). 아직 안 만든 칸은 0.
//   · 칸: 장부 줄의 kinds(engine/cells.js · 있으면 이것이 먼저) 또는 아래 CELL_KIND(11-14에 코드를 읽어 확인한 21칸)
//     ⚠ 새 칸은 CELL_KIND를 고치지 않는다 — 장부 줄에 kinds: 'L'처럼 적는다(여러 팀이 이 표를 함께 고치다 부딪히지 않게)
//   · 악보 판(lab:*) = E — 기호를 넣었다 빼면 그 자리의 소리가 달라져 들린다
//   · 곡 바꾸기(play:*) = E · 가락 짓기(play:make)만 M
//  단계의 갈래 = 그 단계 활동들의 갈래를 모은 것. 활동이 바뀌면 저절로 따라 바뀐다.
import { ELEMENTS } from './flow.js';
import { cellById } from './cells.js';

// 만든 칸의 갈래 — 2026-11-14 코드 조사(그때 칸 21 · 이 뒤로 더하는 칸은 장부 줄의 kinds)
//  L: 들려주고 답 단추를 고름 · D: 아이가 누른 때 · 높이로 소리가 남(때 판정 또는 따라 내기) · E: 블록을 넣고 빼면 바뀐 소리가 들림
//  ak2는 소리 없이 보고 고르는 칸이라 어느 갈래에도 넣지 않았다.
export const CELL_KIND = {
  so3: 'L', so4: 'L', so5: 'L', so6: 'L', sem1: 'L', ppa1: 'L', ga2: 'L', ga3: 'L', ga4: 'L', jd1: 'L', hy1: 'L', hwa1: 'L',
  ri1: 'D', ri2: 'D', ri3: 'D', ri4: 'D', ak1: 'D',
  ga1: 'LD', ri5: 'LD',
  ri6: 'E',
  ak2: '',
};
// 나머지 곡 바꾸기 카드는 E · 묶음 D의 따로 서는 카드(flow.js PLAY_SOLO)는 넣고 빼며 듣고(E) 정답 없이 제 것을 지음(M)
//  흐름에 그 키가 들어가야(= 만든 팀이 PLAY_SOLO 주석을 풀고 단계 acts에 적어야) 세어진다 — 미리 적어 둔 이 표만으로는 0
//  장단 판(jang · D4)은 DEM — 칸에 구음을 넣고 빼며 듣고(E) · 내 장단을 정답 없이 짓고(M) · 되풀이되는 장단에 맞춰 손뼉 단추를 누르면 그때 소리가 남(D · 때 판정 없음)
//  보고 놓기(staff · name · D8)는 보기와 같은 자리에 놓는 정답 있는 놓기라 E만(M 아님)
export const PLAY_KIND = { make: 'M', rmake: 'EM', dress: 'EM', chord: 'EM', jang: 'DEM', form: 'EM', staff: 'E', name: 'E' };

export function actKinds(act) {
  const [kind, a] = String(act).split(':');
  if (kind === 'cell') { const c = cellById(a); return c && c.first ? (c.kinds ?? CELL_KIND[a] ?? '') : ''; }
  if (kind === 'lab') return 'E';
  if (kind === 'play') return PLAY_KIND[a] ?? 'E';
  return '';
}
export const stepKinds = step => ['L', 'D', 'E', 'M'].filter(k => step.acts.some(a => actKinds(a).includes(k))).join('');
// { b1: 'DE', b2: 'LDE', … }
export const DEPTH = Object.fromEntries(ELEMENTS.flatMap(el => el.steps.map(s => [s.id, stepKinds(s)])));
