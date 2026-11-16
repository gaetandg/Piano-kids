// Pluie de notes : un robot joue des chansons à chaque vitesse (au bon moment, avec un peu
// d'imprécision), et un autre tape au hasard. Vérifie les étoiles obtenues.
// Lancer : npx http-server -p 8080 -c-1 &  puis  node tests/rain.cjs
const { chromium } = require(process.env.PW_PATH || 'playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'screens', 'rain');
fs.mkdirSync(OUT, { recursive: true });
// bot : 'exact' (au bon moment ± jitter ms), 'spam' (touches au hasard sans arrêt)
const CASES = [
  ['tortue', 'pluie-do', 'exact', 0, { width: 412, height: 880 }],
  ['tortue', 'mi-re-do', 'exact', 0, { width: 880, height: 412 }],
  ['lapin', 'marie', 'exact', 80, { width: 412, height: 880 }],
  ['fusee', 'hymne', 'exact', 60, { width: 880, height: 412 }],
  ['lapin', 'frere-jacques', 'spam', 0, { width: 412, height: 880 }],
  ['fusee', 'clair-2mains', 'exact', 60, { width: 880, height: 412 }],
];
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  let failed = 0;
  for (const [speed, song, bot, jitter, vp] of CASES) {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(process.env.BASE || 'http://localhost:8080/');
    await page.fill('.name-input', 'Tom');
    await page.click('text=C’est parti');
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('pianoKids.v1'));
      d.settings.voice = false;
      d.settings.unlockAll = true;
      d.profiles[0].inputMode = 'screen';
      localStorage.setItem('pianoKids.v1', JSON.stringify(d));
    });
    await page.reload();
    await page.click('.profile-card >> nth=0');
    await page.evaluate(
      ([song, speed]) => {
        history.pushState({ name: 'game', params: { rain: song, speed } }, '');
        dispatchEvent(new PopStateEvent('popstate', { state: { name: 'game', params: { rain: song, speed } } }));
      },
      [song, speed],
    );
    await page.waitForSelector('.rain-box');
    await page.evaluate(
      ([bot, jitter]) => {
        const box = document.querySelector('.rain-box');
        const tapKey = (m) => {
          const k = document.querySelector(`.keyboard .key[data-midi="${m}"]`);
          if (!k) return;
          const r = k.getBoundingClientRect();
          const x = r.left + r.width / 2;
          const y = r.top + r.height * (k.classList.contains('black') ? 0.4 : 0.85);
          const kb = document.querySelector('.keyboard');
          kb.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, pointerId: 1 }));
          kb.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x, clientY: y, pointerId: 1 }));
        };
        if (bot === 'spam') {
          const ks = [...document.querySelectorAll('.keyboard .key.white')].map((k) => +k.dataset.midi);
          setInterval(() => tapKey(ks[Math.floor(Math.random() * ks.length)]), 120);
          return;
        }
        const planned = new Set();
        const loop = () => {
          const st = box._rain;
          if (st) {
            const clock = st.clock();
            for (const n of st.notes) {
              if (n.state !== 'wait' || planned.has(n)) continue;
              const dt = n.t - clock;
              if (dt < 0.25) {
                planned.add(n);
                const ms = Math.max(0, dt * 1000 + (Math.random() * 2 - 1) * jitter);
                setTimeout(() => tapKey(n.midi), ms);
              }
            }
          }
          requestAnimationFrame(loop);
        };
        loop();
      },
      [bot, jitter],
    );
    await page.waitForTimeout(6000);
    await page.screenshot({ path: `${OUT}/rain-${speed}-${song}.png` });
    await page.waitForSelector('.modal .result', { timeout: 180000 });
    await page.waitForTimeout(1800);
    const stars = await page.$$eval('.modal .stars.big .star.on', (s) => s.length);
    const stats = await page.textContent('.rain-stats').catch(() => '');
    if (bot !== 'spam' && speed === 'fusee') await page.screenshot({ path: `${OUT}/result-${song}.png` });
    const ok = (bot === 'spam' ? stars === 1 : stars === 3) && !errs.length;
    if (!ok) failed++;
    console.log(
      `${ok ? '✔' : '✘'} ${speed} ${song} ${bot}±${jitter} : ${stars}★ | ${stats}`,
      errs.length ? 'ERREURS ' + errs.join(' | ') : '',
    );
    await ctx.close();
  }
  await browser.close();
  console.log(failed ? `${failed} problème(s)` : 'Tout est OK');
  process.exit(failed ? 1 : 0);
})();
