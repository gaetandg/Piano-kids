// Test de jeu : joue réellement plusieurs missions en mode « écran » et vérifie
// les étoiles enregistrées. Lancer : npx http-server -p 8080 -c-1 &  puis  node tests/play.cjs
const { chromium } = require(process.env.PW_PATH || 'playwright');

const BASE = process.env.BASE || 'http://localhost:8080/';
const NAMES = { Do: 0, Ré: 2, Mi: 4, Fa: 5, Sol: 7, La: 9, Si: 11 };

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 880 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.stack || e.message));
  await page.goto(BASE);
  await page.fill('.name-input', 'Tom');
  await page.click('text=C’est parti');
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('pianoKids.v1'));
    d.settings.voice = false;
    d.profiles[0].inputMode = 'screen';
    localStorage.setItem('pianoKids.v1', JSON.stringify(d));
  });
  await page.reload();
  await page.click('.profile-card >> nth=0');

  const goGame = (id) =>
    page.evaluate((mid) => {
      history.pushState({ name: 'game', params: { mission: mid } }, '');
      dispatchEvent(new PopStateEvent('popstate', { state: { name: 'game', params: { mission: mid } } }));
    }, id);
  const tapMidi = async (m) => {
    const el = await page.$(`.keyboard .key[data-midi="${m}"]`);
    if (!el) throw new Error('touche absente ' + m);
    await el.tap();
  };
  const tapPc = async (pc) => {
    const midis = await page.$$eval('.keyboard .key', (ks) => ks.map((k) => +k.dataset.midi));
    const m = midis.find((x) => ((x % 12) + 12) % 12 === pc && x >= 60) ?? midis.find((x) => x % 12 === pc);
    await tapMidi(m);
  };
  const resultStars = () => page.$$eval('.modal .stars.big .star.on', (s) => s.length);
  const check = (name, ok, info = '') => {
    console.log(`${ok ? '✔' : '✘'} ${name} ${info}`);
    if (!ok) errors.push(name);
  };

  // 1. Intro de la planète 1
  await goGame('p1-intro');
  await page.waitForTimeout(500);
  for (let i = 0; i < 4; i++) await page.click('text=Suivant');
  for (let i = 0; i < 3; i++) {
    await tapMidi(60 + i * 2);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(800);
  await page.click('text=Terminer');
  await page.waitForSelector('.modal .result');
  check('intro terminée', (await page.textContent('.modal h2')).includes('Mission terminée'));

  // 2. Chanson « Mi Ré Do » sans faute
  await goGame('p3-song1');
  await page.waitForTimeout(600);
  for (let i = 0; i < 40; i++) {
    if (await page.$('.modal .result')) break;
    const t = await page.$('.keyboard .key.target');
    if (!t) {
      await page.waitForTimeout(200);
      continue;
    }
    await t.tap();
    await page.waitForTimeout(60);
  }
  await page.waitForSelector('.modal .result', { timeout: 5000 });
  await page.waitForTimeout(1500);
  check('chanson Mi Ré Do : 3 étoiles', (await resultStars()) === 3, `(${await resultStars()})`);

  // 3. La fusée Do-Ré-Mi avec 5 erreurs
  await goGame('p3-play');
  await page.waitForTimeout(900);
  let errorsMade = 0;
  for (let i = 0; i < 30; i++) {
    if (await page.$('.modal .result')) break;
    const name = (await page.textContent('.note-bubble')).trim();
    const pc = NAMES[name.charAt(0) + name.slice(1).toLowerCase()];
    if (errorsMade < 5) {
      await tapPc(pc === 0 ? 2 : 0);
      errorsMade++;
      await page.waitForTimeout(150);
    }
    await tapPc(pc);
    await page.waitForTimeout(1100);
  }
  await page.waitForSelector('.modal .result', { timeout: 5000 });
  await page.waitForTimeout(1500);
  check('fusée avec 5 erreurs : 1 étoile', (await resultStars()) === 1, `(${await resultStars()})`);

  // 4. Code des Martiens : on répète la séquence affichée
  await goGame('p3-simon');
  for (let round = 0; round < 6; round++) {
    // regarde la séquence jouée par l'ovni
    const seq = [];
    let last = null;
    const until = Date.now() + 9000;
    while (Date.now() < until) {
      const t = await page.$eval('.keyboard', (kb) => {
        const k = kb.querySelector('.key.target');
        return k ? +k.dataset.midi : null;
      });
      if (t != null && t !== last) seq.push(t);
      last = t;
      const bubble = await page.textContent('.bubble');
      if (bubble.includes('À toi') && seq.length) break;
      await page.waitForTimeout(40);
    }
    for (const m of seq) {
      await tapMidi(m);
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(400);
    if (await page.$('.modal .result')) break;
  }
  await page.waitForSelector('.modal .result', { timeout: 8000 });
  await page.waitForTimeout(1500);
  check('code des Martiens réussi', (await resultStars()) >= 2, `(${await resultStars()})`);
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/result.png' });

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pianoKids.v1')).profiles[0]);
  check(
    'progression enregistrée',
    saved.done['p1-intro'] && saved.stars['p3-song1'] === 3 && saved.stars['p3-play'] === 1,
    JSON.stringify(saved.stars),
  );
  check('autocollant gagné', saved.stickers.length >= 1, JSON.stringify(saved.stickers));
  if (process.env.SHOTS) {
    await page.evaluate(() => {
      history.pushState({ name: 'planet', params: { planet: 'p3' } }, '');
      dispatchEvent(new PopStateEvent('popstate', { state: { name: 'planet', params: { planet: 'p3' } } }));
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: process.env.SHOTS + '/planet3.png' });
  }

  await browser.close();
  if (errors.length) {
    console.log('ÉCHECS :\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('Tout est OK');
})();
