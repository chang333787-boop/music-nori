// 작은 도구 — h(그릇 만들기) · svg · 알림 · 기기 저장(실패해도 앱은 돈다)
//  h · toast 모양은 우리반RPG common/util.js(같은 저자)와 같다.
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// h('div', { class: 'a', onclick: fn }, '글', 자식…)
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv; }
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : String(k));
  return el;
}
export function svg(tag, attrs = {}, ...kids) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v != null && v !== false) el.setAttribute(k, v);
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : String(k));
  return el;
}
export function toast(msg, ms = 2200) {
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}
// 기기 저장 — 개인 창 · 막힌 저장소에서도 앱이 멈추지 않게 늘 try
const NS = 'mn.';
export function lsGet(k, d = null) { try { const v = localStorage.getItem(NS + k); return v == null ? d : JSON.parse(v); } catch { return d; } }
export function lsSet(k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); return true; } catch { return false; } }

// 누르는 손맛 — pointerdown에서 바로 반응(click은 손을 뗄 때라 늦다). 키보드 Enter/Space도 같은 길
export function onPress(el, fn) {
  el.addEventListener('pointerdown', e => { if (e.button > 0) return; el.classList.add('press'); fn(e); });
  const up = () => el.classList.remove('press');
  el.addEventListener('pointerup', up); el.addEventListener('pointerleave', up); el.addEventListener('pointercancel', up);
  el.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); fn(e); } });
  return el;
}

// 조사 고르기 — josa('높게·낮게', '을/를') → '높게·낮게를' · 괄호 뒤는 괄호 앞 글자로 판단
export function josa(word, pair) {
  const [a, b] = pair.split('/');
  const w = String(word).replace(/\([^)]*\)\s*$/, '').trim();
  const c = w.charCodeAt(w.length - 1);
  if (c < 0xAC00 || c > 0xD7A3) return word + b;
  const jong = (c - 0xAC00) % 28;
  if (pair === '으로/로') return word + (jong === 0 || jong === 8 ? b : a);
  return word + (jong ? a : b);
}
