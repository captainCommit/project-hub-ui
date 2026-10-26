// Usage: node shoot.mjs <script.json> <outDir>
// Script: [{ shot: "lesson-01/1" , steps: [actions...] }] or flat action lists.
// Actions: {go:url, after}, {wait:ms}, {click:Q}, {mark:Q}, {unmark:true}, {type:{sel,text}}, {key:'Escape'}, {eval:js}, {shot:'name'}, {scroll:{sel, y}}
// Q: {sel, index} | {text, exact?, tag?, index?}; mark/click also take up:'button' to climb to the nearest match.
import fs from 'node:fs';
import path from 'node:path';
const [,, scriptFile, outDir] = process.argv;
const actions = JSON.parse(fs.readFileSync(scriptFile, 'utf8'));
const targets = await (await fetch('http://127.0.0.1:9333/json')).json();
const page = targets.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

const HELPER = `window.__t = window.__t || (() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden'; };
  const norm = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const find = (q) => {
    let els;
    if (q.sel) els = [...document.querySelectorAll(q.sel)].filter(vis);
    else {
      const all = [...document.querySelectorAll(q.tag || '*')].filter(vis);
      els = all.filter(e => q.exact === false ? norm(e.innerText).includes(q.text) : norm(e.innerText) === q.text);
      // The deepest elements whose text matches (not every ancestor).
      els = els.filter(e => !els.some(o => o !== e && e.contains(o)));
    }
    let el = els[q.index || 0];
    if (el && q.up) el = el.closest(q.up) || el;
    return el || null;
  };
  return {
    find,
    click(q) { const el = find(q); if (!el) return 'missing ' + JSON.stringify(q); el.scrollIntoView({ block: 'nearest' });
      ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(t => el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window, button: 0 })));
      return 'clicked'; },
    mark(q) { const el = find(q); if (!el) return 'missing ' + JSON.stringify(q); el.scrollIntoView({ block: 'nearest' });
      el.setAttribute('data-tut-mark', el.getAttribute('style') || '');
      el.style.outline = '3px solid #E8590C'; el.style.outlineOffset = '3px'; el.style.borderRadius = el.style.borderRadius || '8px';
      return 'marked'; },
    unmark() { document.querySelectorAll('[data-tut-mark]').forEach(e => { e.setAttribute('style', e.getAttribute('data-tut-mark')); e.removeAttribute('data-tut-mark'); }); return 'unmarked'; },
    type(sel, text) { const el = document.querySelector(sel); if (!el) return 'missing ' + sel; el.focus();
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, text); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return 'typed'; },
  };
})(); 'ok'`;
const ev = async (expr) => {
  await send('Runtime.evaluate', { expression: HELPER });
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  return r.result?.result?.value ?? r.result?.exceptionDetails?.exception?.description ?? r.result?.exceptionDetails?.text;
};
let failures = 0;
for (const a of actions) {
  if (a.go) { await send('Page.navigate', { url: a.go }); await sleep(a.after ?? 4500); continue; }
  if (a.wait) { await sleep(a.wait); continue; }
  let out;
  if (a.click) out = await ev(`__t.click(${JSON.stringify(a.click)})`);
  else if (a.mark) out = await ev(`__t.mark(${JSON.stringify(a.mark)})`);
  else if (a.unmark) out = await ev(`__t.unmark()`);
  else if (a.type) out = await ev(`__t.type(${JSON.stringify(a.type.sel)}, ${JSON.stringify(a.type.text)})`);
  else if (a.key) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: a.key, code: a.key, windowsVirtualKeyCode: a.key === 'Escape' ? 27 : a.key === 'Enter' ? 13 : 0 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: a.key, code: a.key, windowsVirtualKeyCode: a.key === 'Escape' ? 27 : a.key === 'Enter' ? 13 : 0 });
    out = 'key';
  }
  else if (a.eval) out = await ev(a.eval);
  else if (a.shot) {
    const r = await send('Page.captureScreenshot', { format: 'webp', quality: 82 });
    const file = path.join(outDir, `${a.shot}.webp`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
    out = 'shot ' + a.shot;
  }
  if (typeof out === 'string' && out.startsWith('missing')) failures += 1;
  if (out && out !== 'clicked' && out !== 'marked' && out !== 'unmarked' && out !== 'typed' && out !== 'key') console.log(out);
  else if (typeof out === 'string' && out.startsWith('missing')) console.log(out);
  await sleep(a.after ?? 500);
}
console.log('failures:', failures);
ws.close();
