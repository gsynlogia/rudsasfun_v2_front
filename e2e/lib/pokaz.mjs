// Wspólny wzorzec pokazu: ramka i opis tuż nad albo pod nią, bez bocznego pasa i bez imion.
// Ramka śledzi element co klatkę, bo strony po załadowaniu potrafią przewinąć się na górę.
export const clear = (p) => p.evaluate(() => {
  cancelAnimationFrame(window.__pkRaf);
  document.querySelectorAll('.pk-frame,.pk-caption').forEach((e) => e.remove());
  document.querySelectorAll('[data-pk]').forEach((e) => e.removeAttribute('data-pk'));
});
export function makeShow({ out, say, hold = 20000, prefix = 'pokaz' }) {
  return async function show(p, n, title, was, now, voice, targets) {
    await p.bringToFront(); await clear(p);
    let oznaczone = 0;
    for (const t of targets) { if (await t.count()) { await t.first().evaluate((e) => e.setAttribute('data-pk', '1')); oznaczone += 1; } }
    if (oznaczone < targets.length) console.log(`  UWAGA: ujęcie ${n}, oznaczono ${oznaczone} z ${targets.length}`);
    await p.evaluate(({ n, title, was, now }) => {
      const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      const els = [...document.querySelectorAll('[data-pk]')];
      const f = document.createElement('div'); f.className = 'pk-frame';
      f.style.cssText = 'position:fixed;border:4px solid #ef4444;border-radius:6px;z-index:2147483645;pointer-events:none';
      const c = document.createElement('div'); c.className = 'pk-caption';
      c.style.cssText = 'position:fixed;background:#0f172a;color:#fff;padding:9px 14px;border-radius:6px;z-index:2147483646;pointer-events:none;font:13px/1.35 system-ui;box-shadow:0 4px 14px rgba(0,0,0,.35)';
      c.innerHTML = `<div style="font-weight:700;font-size:14px;margin-bottom:3px">${n}. ${esc(title)}</div><div><span style="color:#fca5a5;font-weight:700">Było do zrobienia:</span> ${esc(was)}</div><div><span style="color:#86efac;font-weight:700">Jest teraz:</span> ${esc(now)}</div>`;
      document.body.append(f, c);
      const place = () => {
        const rects = els.map((e) => e.getBoundingClientRect());
        const x = Math.min(...rects.map((r) => r.left)) - 8, y = Math.min(...rects.map((r) => r.top)) - 8;
        const w = Math.max(...rects.map((r) => r.right)) + 8 - x; let h = Math.max(...rects.map((r) => r.bottom)) + 8 - y;
        const szer = Math.min(Math.max(w, 560), innerWidth - 32); c.style.width = `${szer}px`;
        const ch = c.offsetHeight, pod = y + h + 8, nad = y - ch - 8;
        let gdzie = 'pod', top = pod;
        if (pod + ch > innerHeight - 4) { if (nad >= 4) { gdzie = 'nad'; top = nad; } else { gdzie = 'pod, rama skrócona'; top = innerHeight - ch - 4; h = Math.max(40, top - 8 - y); } }
        Object.assign(f.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
        Object.assign(c.style, { left: `${Math.min(Math.max(16, x), innerWidth - szer - 16)}px`, top: `${top}px` });
        window.__pkGdzie = gdzie; window.__pkRaf = requestAnimationFrame(place);
      };
      place();
      [0, 700, 1500].forEach((ms) => setTimeout(() => els[0]?.scrollIntoView({ block: 'center', inline: 'nearest' }), ms));
    }, { n, title, was, now });
    await p.waitForTimeout(2200);
    const stan = await p.evaluate(() => { const r = document.querySelector('[data-pk]')?.getBoundingClientRect(); return { gdzie: window.__pkGdzie, wWidoku: !!r && r.top < innerHeight && r.bottom > 0 }; });
    console.log(`  ujęcie ${n}: opis ${stan.gdzie}, element w widoku: ${stan.wWidoku}`);
    await p.screenshot({ path: `${out}/${prefix}${n}.png` }); say(voice); await p.waitForTimeout(hold);
    await clear(p);
  };
}
