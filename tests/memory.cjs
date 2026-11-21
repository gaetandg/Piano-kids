// Mémory : un robot à bonne mémoire joue les 8 niveaux (une erreur au début de chaque partie),
// un robot sans mémoire joue le niveau Expert. Vérifie étoiles, déblocage et taille de la grille.
// Lancer : npx http-server -p 8080 -c-1 &  puis  node tests/memory.cjs
const { chromium } = require(process.env.PW_PATH || 'playwright');
const LEVELS = ['eyes-1', 'eyes', 'eyes-3', 'eyes-4', 'ears-1', 'ears', 'ears-3', 'ears-4'];
const go = (page, name, params) =>
  page.evaluate(
    ([name, params]) => {
      history.pushState({ name, params }, '');
      dispatchEvent(new PopStateEvent('popstate', { state: { name, params } }));
    },
    [name, params],
  );
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 412, height: 880 }, hasTouch: true })).newPage();
  const errs = [];
  let fails = 0;
  const check = (ok, msg) => {
    console.log((ok ? '✔ ' : '✘ ') + msg);
    if (!ok) fails++;
  };
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:8080/');
  await page.fill('.name-input', 'Tom');
  await page.click('text=C’est parti');
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('pianoKids.v1'));
    d.settings.voice = false;
    Object.assign(d.profiles[0], { memoStars: { eyes: 3 } }); // ancien niveau « yeux » déjà gagné
    localStorage.setItem('pianoKids.v1', JSON.stringify(d));
  });
  await page.reload();
  await page.click('.profile-card >> nth=0');
  await go(page, 'album', { tab: 'memory' });
  await page.waitForTimeout(300);
  const locked = await page.$$eval('.memo-level.locked', (x) => x.map((b) => b.dataset.level).join(','));
  check(locked === 'eyes-4,ears-3,ears-4', `niveaux fermés au départ : ${locked}`);

  async function play(level, smart) {
    await go(page, 'memory', { level });
    await page.waitForTimeout(300);
    const n = await page.$$eval('.memo-card', (c) => c.length);
    const bottom = await page.$eval('.memo-grid', (g) => g.getBoundingClientRect().bottom);
    const pairs = await page.evaluate(() => {
      const by = {};
      document.querySelector('.memo-grid')._cards.forEach((c, i) => (by[c.s.id] = [...(by[c.s.id] || []), i]));
      return Object.values(by);
    });
    const card = (i) => page.click(`.memo-grid .memo-card >> nth=${i}`);
    if (smart) {
      await card(pairs[0][0]);
      await card(pairs[1][0]);
      await page.waitForTimeout(1400);
      for (const [a, b] of pairs) {
        await card(a);
        await card(b);
        await page.waitForTimeout(420);
      }
    } else {
      // sans mémoire : deux cartes au hasard parmi celles encore cachées
      for (let k = 0; k < 400 && !(await page.$('.modal .result')); k++) {
        const hidden = await page.$$eval('.memo-card', (cs) =>
          cs.map((c, i) => (c.classList.contains('found') ? -1 : i)).filter((i) => i >= 0),
        );
        if (hidden.length < 2) break;
        const a = hidden[Math.floor(Math.random() * hidden.length)];
        let b;
        do b = hidden[Math.floor(Math.random() * hidden.length)];
        while (b === a);
        await card(a);
        await card(b);
        await page.waitForTimeout(1300);
      }
    }
    await page.waitForSelector('.modal .result', { timeout: 8000 });
    await page.waitForTimeout(1700);
    const stars = await page.$$eval('.modal .stars.big .star.on', (s) => s.length);
    const tries = await page.textContent('.memo-head .chip');
    await page.keyboard.press('Escape');
    return { n, stars, tries, bottom };
  }

  for (const level of LEVELS) {
    const r = await play(level, true);
    check(
      r.stars === 3 && r.bottom <= 880,
      `${level} : ${r.n} cartes, bonne mémoire → ${r.stars}⭐ (${r.tries}), grille jusqu'à ${Math.round(r.bottom)} px`,
    );
  }
  const r = await play('eyes-4', false);
  check(r.stars === 1, `eyes-4 sans mémoire → ${r.stars}⭐ (${r.tries})`);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pianoKids.v1')).profiles[0].memoStars);
  check(Object.keys(saved).length === 8, `étoiles enregistrées : ${JSON.stringify(saved)}`);
  check(!errs.length, errs.join(' | ') || 'aucune erreur JS');
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
