// 반2 처음으로 · 𝄋로 · 끝 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick' · 마디 상자 카드 고르기 — 검사 몸통은 tests/roadpick.mjs)
import { roadCheck } from '../roadpick.mjs';
const C = roadCheck('반2');
export const right = C.right, opts = C.opts, norm = C.norm, bots = C.bots, extra = C.extra;
