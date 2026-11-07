// 이 기기 설정 — 두드림 지연(ms) · 판정 학년군 · 스피커 점검 결과. 이름 같은 개인 정보는 없다(기기에만 저장).
import { lsGet, lsSet } from './util.js';
import { engine } from './audio.js';

export const device = {
  get latency() { return lsGet('latency', null); },            // { ms, spread, n, at } 또는 null
  set latency(v) { lsSet('latency', v); },
  get latencyMs() { const l = lsGet('latency', null); return l && Number.isFinite(l.ms) ? l.ms : 0; },
  get band() { return lsGet('band', 'mid'); },                  // low 1~2 · mid 3~4 · high 5~6 — 아이 화면에는 학년을 쓰지 않는다
  set band(v) { lsSet('band', v); },
  get speaker() { return lsGet('speaker', null); },             // 스피커 점검 결과(음높이별 크기 보정)
  set speaker(v) { lsSet('speaker', v); },
};

// 기기 정보(기록 한 줄용) — 브라우저 · 화면 · 오디오 지연값. 사람을 알아볼 수 있는 값은 넣지 않는다
export function deviceInfo() {
  const ua = navigator.userAgent;
  const os = /CrOS/.test(ua) ? '크롬북' : /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? '안드로이드' : /Mac/.test(ua) ? '맥' : /Windows/.test(ua) ? '윈도' : '기타';
  const ctx = engine.ctx;
  return {
    os,
    screen: `${screen.width}×${screen.height}`,
    sampleRate: ctx ? ctx.sampleRate : null,
    baseLatency: ctx && ctx.baseLatency != null ? Math.round(ctx.baseLatency * 1000) : null,
    outputLatency: ctx && ctx.outputLatency != null ? Math.round(ctx.outputLatency * 1000) : null,
  };
}
