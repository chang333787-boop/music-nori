// 오디오 시계 ↔ 화면 시계 — 박 판정과 지연 맞추기가 같은 방법으로 '소리가 들린 때'를 계산하게 한 곳에 둔다.
//  두드림 = pointerdown의 event.timeStamp(performance.now 기준 ms). 예약한 소리 = 오디오 시계(초).
//  getOutputTimestamp가 있으면 '지금 스피커로 나가는 오디오 시각'과 그 화면 시각의 짝으로 바꾼다(출력 지연이 들어감).
//  없으면 currentTime + outputLatency(또는 baseLatency)로 어림한다. 남는 차이(손·입력·기기 지연)는 지연 맞추기 값이 뺀다.

export function clockMethod(ctx) {
  try {
    if (ctx && ctx.getOutputTimestamp) {
      const ts = ctx.getOutputTimestamp();
      if (ts && ts.performanceTime > 0 && ts.contextTime > 0) return 'outputTimestamp';
    }
  } catch { /* 옛 브라우저 */ }
  return 'latencyGuess';
}

// 오디오 시각 t(초)의 소리가 들리는 화면 시각(ms)
export function audioToPerf(ctx, t) {
  try {
    if (ctx.getOutputTimestamp) {
      const ts = ctx.getOutputTimestamp();
      if (ts && ts.performanceTime > 0 && ts.contextTime > 0) return ts.performanceTime + (t - ts.contextTime) * 1000;
    }
  } catch { /* 아래로 */ }
  const lat = ctx.outputLatency || ctx.baseLatency || 0;
  return performance.now() + (t - ctx.currentTime + lat) * 1000;
}

// 화면 시각(ms) → 그때 들리던 오디오 시각(초) — 두드린 순간 소리를 바로 낼 때는 쓰지 않고(바로 낸다), 그림 맞추기에만
export function perfToAudio(ctx, ms) {
  return (ms - audioToPerf(ctx, 0)) / 1000;
}
