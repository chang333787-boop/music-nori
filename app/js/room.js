// 방 번호 다같이 v1 — '오늘만' 방(기록 남기지 않음). 정본 명세 docs/room.md
//  서버 = Firebase Realtime Database REST만(로그인 X · 스트림 X → 짧게 다시 묻기). 실패해도 앱은 멈추지 않는다(늘 try · 조용히 다시).
//  선생님 방 상태 = lsGet('troom') { room, tok, at } · 아이 방 상태 = lsGet('kroom') { room, dev, no, a, t }
//  아이 기기는 선생님이 고른 놀이 · 단계를 2초 안에 따라간다(startKid · 화면이 숨겨지면 쉼).
//  시험 고리: localStorage 'mn.testroom' = 1 이거나 주소에 ?testroom=1 이면 방 번호를 0000~0999에서 고른다(아이 방 1000~9999와 안 섞이게).
import { lsGet, lsSet } from './util.js';
import { cellById } from '../../engine/cells.js';

export const DB = 'https://music-nori-class-default-rtdb.asia-southeast1.firebasedatabase.app';
const TS = { '.sv': 'timestamp' };
export const HOLD = 12 * 3600 * 1000;          // 방은 12시간
export const KID_TICK = 1700;                  // 아이 기기 확인 간격 — 묻는 시간(약 0.2초)을 더해도 2초 안에 바뀌게
export const TV_TICK = 2000;                   // TV 결과 확인 간격
export const PH = { wait: -1, show: 0, follow: 1, game: 2, done: 3 };

// ── REST 한 번 — { ok, status, data, net(서버까지 닿았나) } · 6초 넘으면 끊음 ──
async function call(method, path, body, ms = 6000) {
  const ac = typeof AbortController === 'function' ? new AbortController() : null;
  const t = ac ? setTimeout(() => ac.abort(), ms) : 0;
  try {
    const r = await fetch(`${DB}/${path}.json`, { method, cache: 'no-store', signal: ac ? ac.signal : undefined, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await r.json().catch(() => null);
    return { ok: r.ok, status: r.status, data, net: true };
  } catch { return { ok: false, status: 0, data: null, net: false }; }
  finally { clearTimeout(t); }
}

const isTest = () => { try { return lsGet('testroom') === 1 || /[?&]testroom=1\b/.test(location.search); } catch { return false; } };
const pickRoom = () => String(isTest() ? Math.floor(Math.random() * 1000) : 1000 + Math.floor(Math.random() * 9000)).padStart(4, '0');
const rand = n => { let s = ''; const a = 'abcdefghijklmnopqrstuvwxyz0123456789'; const b = new Uint8Array(n); (globalThis.crypto || { getRandomValues: x => x.map(() => Math.random() * 256) }).getRandomValues(b); for (const v of b) s += a[v % 36]; return s; };
const okRoom = r => typeof r === 'string' && /^[0-9]{4}$/.test(r);
const okCell = c => typeof c === 'string' && /^[a-z]{2,4}[0-9]{1,2}$/.test(c);

// 확인 고리 — fn을 ms마다(시작 시각 기준 · 겹치지 않게). 화면이 숨겨지면 쉬고, 다시 보이면 바로 한 번
export function loop(fn, ms) {
  let on = true, busy = false, timer = 0;
  const hidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';
  async function tick() {
    if (!on || busy) return;
    clearTimeout(timer);
    if (hidden()) return;
    busy = true;
    const t0 = performance.now();
    try { await fn(); } catch (e) { console.warn('방 확인 실패', e); }
    busy = false;
    if (on && !hidden()) timer = setTimeout(tick, Math.max(250, ms - (performance.now() - t0)));
  }
  const vis = () => { if (!hidden()) tick(); else clearTimeout(timer); };
  document.addEventListener('visibilitychange', vis);
  tick();
  return { stop() { on = false; clearTimeout(timer); document.removeEventListener('visibilitychange', vis); }, now: tick };
}

// ── 선생님 ──
let chain = Promise.resolve();                  // 단계 쓰기는 차례대로(빨리 넘겨도 순서가 뒤집히지 않게)
export const teacher = {
  get() {
    const t = lsGet('troom');
    return t && okRoom(t.room) && typeof t.tok === 'string' && Date.now() - (t.at || 0) < HOLD ? t : null;
  },
  // 방 열기 — 12시간 안에 연 방이 이 기기에 있으면 그 방 그대로. 아니면 1000~9999 무작위로 잡기(8번까지)
  async open() {
    const old = this.get();
    if (old) {
      const r = await this.pub('so3', 'wait', old);
      if (r.ok) return { ok: true, room: old.room };
      if (!r.net) return { ok: false, why: 'net' };
      lsSet('troom', null);                     // 서버가 이 열쇠를 더 받지 않음(12시간 지남) → 새 방
    }
    for (let i = 0; i < 8; i++) {
      const room = pickRoom(), tok = rand(24);
      const r = await call('PUT', `rooms/${room}/own`, { tok, at: TS });
      if (!r.net) return { ok: false, why: 'net' };
      if (!r.ok) continue;                      // 누가 쓰는 번호 → 다른 번호
      const t = { room, tok, at: Date.now() };
      lsSet('troom', t);
      if (kid.get()) kid.leave();               // 선생님 기기는 아이 방에서 나옴(화면이 끌려가지 않게)
      await this.pub('so3', 'wait', t);
      return { ok: true, room };
    }
    return { ok: false, why: 'busy' };
  },
  // 방 닫기 — 이 기기에서만 잊음(서버 방은 12시간 뒤 저절로 풀림). 아이들은 대기 화면으로
  close() { const t = this.get(); if (t) this.pub('so3', 'wait', t); lsSet('troom', null); },
  // 지금 놀이 · 단계 알리기 → { ok, net, at(서버 시각) }
  pub(cell, phase, t = this.get()) {
    if (!t || !okCell(cell) || !(phase in PH)) return Promise.resolve({ ok: false, net: true });
    const job = chain.then(async () => {
      const r = await call('PUT', `rooms/${t.room}/t`, { tok: t.tok, pub: { cell, phase, at: TS } });
      if (r.ok) window.__roomPub = { cell, phase, at: r.data && r.data.pub && r.data.pub.at, t: Date.now() };   // 시험용
      return { ok: r.ok, net: r.net, at: r.ok && r.data && r.data.pub ? r.data.pub.at : 0 };
    });
    chain = job.catch(() => null);
    return job;
  },
  // 모인 결과 — { ok, list: [{ dev, a, no, c, s, k, n, at }] }
  async res(t = this.get()) {
    if (!t) return { ok: false, list: [] };
    const r = await call('GET', `rooms/${t.room}/res`);
    const list = r.ok && r.data && typeof r.data === 'object' ? Object.entries(r.data).map(([dev, v]) => ({ dev, ...v })) : [];
    return { ok: r.ok, net: r.net, list };
  },
};

// ── 아이 ──
const subs = new Set();
const emit = () => { for (const f of subs) { try { f(); } catch (e) { console.error(e); } } };
export const kid = {
  online: true,
  last: null,                                   // 마지막으로 읽은 선생님 놀이 { cell, phase, at }
  get() {
    const k = lsGet('kroom');
    if (!k || !okRoom(k.room) || !k.dev) return null;
    if (k.t && Date.now() - k.t > HOLD) { lsSet('kroom', null); return null; }
    return k;
  },
  on(fn) { subs.add(fn); return () => subs.delete(fn); },
  // 방이 열려 있는지 — 선생님 놀이(pub)가 있으면 열린 방
  async peek(room) {
    const r = await call('GET', `rooms/${room}/t/pub`);
    return { net: r.net, pub: r.ok && r.data && okCell(r.data.cell) ? r.data : null };
  },
  // 들어가기 — 결과 칸에 s = k = n = 0으로 한 번 써서 '들어왔음'을 알림. 방이 없거나 12시간 지났으면 서버가 거절
  async join(room, no, a) {
    if (!okRoom(room)) return { ok: false, why: 'room' };
    const p = await this.peek(room);
    if (!p.net) return { ok: false, why: 'net' };
    if (!p.pub || (p.pub.at && Date.now() - p.pub.at > HOLD)) return { ok: false, why: 'room' };
    const old = lsGet('kroom');
    const dev = (old && old.dev) || lsGet('kdev') || rand(12);
    lsSet('kdev', dev);
    const r = await call('PUT', `rooms/${room}/res/${dev}`, { a, no, c: p.pub.cell, s: 0, k: 0, n: 0, at: TS });
    if (!r.net) return { ok: false, why: 'net' };
    if (!r.ok) return { ok: false, why: 'room' };
    lsSet('kroom', { room, dev, no, a, t: Date.now() });
    this.last = null; this.online = true;
    startKid();
    emit();
    return { ok: true, pub: p.pub };
  },
  // 나가기 — 결과 칸을 지우고(실패해도 그만) 이 기기에서 잊음
  leave() {
    const k = this.get();
    if (k) call('DELETE', `rooms/${k.room}/res/${k.dev}`);
    lsSet('kroom', null);
    this.last = null;
    stopKid();
    emit();
  },
  // 확인 게임 결과 보내기(덮어씀)
  async send(cell, s, k, n) {
    const me = this.get();
    if (!me || !okCell(cell)) return false;
    const c = v => Math.max(0, Math.min(99, Math.round(Number(v) || 0)));
    const body = { a: me.a, no: me.no, c: cell, s: Math.max(0, Math.min(3, s | 0)), k: c(k), n: c(n), at: TS };
    let r = null;
    for (let i = 0; i < 3; i++) {                           // 인터넷이 잠깐 끊겼으면 조용히 다시(서버가 거절하면 그만)
      r = await call('PUT', `rooms/${me.room}/res/${me.dev}`, body);
      if (r.ok || r.net) break;
      await new Promise(z => setTimeout(z, 1500));
    }
    window.__roomSent = { cell, s, k, n, ok: r.ok };        // 시험용
    return r.ok;
  },
  // 이 칸이 지금 선생님 칸인가
  isTeacherCell(id) { return !!(this.get() && this.last && this.last.cell === id && this.last.phase !== 'wait'); },
};

// 칸 화면이 자기를 알림 — { cell, idx() (0 보기 · 1 연습 · 2 확인 게임 · 3 결과), go(i) } (칸이 바뀌면 null)
export const here = { cur: null };

// ── 아이 기기 따라가기 ──
let kidLoop = null, goFn = null, prev = null, misses = 0;
const hashNow = () => location.hash.replace(/^#\/?/, '');
function follow(p) {
  if (!goFn) return;
  const last = prev; prev = p;
  if (p.phase === 'wait') { if (!hashNow().startsWith('join')) goFn('join'); return; }
  if (p.phase === 'done') return;               // 결과 단계 — 아이는 하던 것을 그대로(끝낸 아이는 결과 · 하는 아이는 게임)
  const c = cellById(p.cell);
  if (!c) return;
  if (c.route) { if (hashNow().split('/')[0] !== c.route) goFn(c.route); return; }
  const ti = PH[p.phase], h = here.cur;
  if (h && h.cell === p.cell) {
    const ki = h.idx();
    const back = last && last.cell === p.cell && PH[last.phase] > ti;      // 선생님이 되돌아감(다시 보기 · 한 번 더)
    if (ti > ki || (back && ti !== ki)) {
      h.go(ti);
      try { history.replaceState(null, '', `#/cell/${p.cell}/${p.phase}`); } catch { /* */ }
    }
    return;
  }
  goFn(`cell/${p.cell}/${p.phase}`);
}
async function kidTick() {
  const k = kid.get();
  if (!k) { stopKid(); emit(); return; }
  const r = await call('GET', `rooms/${k.room}/t/pub`);
  const was = kid.online;
  kid.online = r.net && r.ok;
  if (was !== kid.online) emit();
  if (!r.ok) return;
  const p = r.data;
  if (!p || !okCell(p.cell) || (p.at && Date.now() - p.at > HOLD)) {      // 방이 사라졌거나 끝남(몇 번 이어서면 나옴)
    if (++misses >= 3) { kid.leave(); window.dispatchEvent(new CustomEvent('room-gone')); }
    return;
  }
  misses = 0;
  const changed = !kid.last || kid.last.cell !== p.cell || kid.last.phase !== p.phase || kid.last.at !== p.at;
  kid.last = p;
  if (changed) { follow(p); emit(); }
}
export function startKid(go) {
  if (go) goFn = go;
  stopKid();
  if (!kid.get()) return;
  prev = null; misses = 0;
  kidLoop = loop(kidTick, KID_TICK);
}
export function stopKid() { if (kidLoop) { kidLoop.stop(); kidLoop = null; } }
// 인터넷이 돌아오면 기다리지 않고 바로 한 번 확인
if (typeof window !== 'undefined') window.addEventListener('online', () => { if (kidLoop) kidLoop.now(); });
